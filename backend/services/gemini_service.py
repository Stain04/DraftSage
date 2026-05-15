import json
import os
import asyncio
import re
from typing import Optional

from groq import AsyncGroq

from .lolalytics_service import fetch_all_context, build_lolalytics_context
from .champion_types import analyze_team_damage

# ── API Keys (pool for rotation) ─────────────────────────────────────────────
API_KEYS: list[str] = []
for i in range(1, 11):
    suffix = "" if i == 1 else f"_{i}"
    key = os.environ.get(f"GROQ_API_KEY{suffix}", "").strip()
    if key:
        API_KEYS.append(key)

# ── Model fallback chain ──────────────────────────────────────────────────────
MODELS = [
    "llama-3.3-70b-versatile",  # Best quality
    "llama3-70b-8192",          # Fallback (stable, high quality)
    "llama-3.1-8b-instant",     # Last resort — very high rate limits
]

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a Challenger-level League of Legends draft analyst with deep knowledge of high-elo gameplay, meta trends, and competitive drafting.

When analyzing a draft, think through these layers IN ORDER before producing output:

LAYER 1 - IDENTIFY WIN CONDITIONS
- What is the enemy team trying to do to win? (hard engage, poke to death, splitpush pressure, teamfight, pick comp, protect-the-carry)
- What win condition does our team currently have based on picks so far?
- What win condition does the role we're filling need to provide or reinforce?

LAYER 2 - COMPOSITION ANALYSIS
- AP/AD balance: Never go full AD or full AP. If ally team is full AD, ONLY suggest AP picks. If full AP, ONLY suggest AD picks.
- Frontline vs backline: Do we have engage? Do we have peel for our carries?
- Early/mid/late game power curve: Are we strong enough early to survive until our win condition kicks in?
- Objective control: Baron, Dragon, Herald priority based on comp strengths.
- Wave management: Do we have enough push/freeze options?

LAYER 3 - COUNTER PICK LOGIC (DATA-FIRST APPROACH)
The LIVE LOLALYTICS DATA block in the user message contains real win-rate verified counters and a blacklist.
You MUST follow this priority order:

STEP 1 — Start from the lolalytics ✅ GOOD INTO list for the lane opponent.
  These are champions that statistically WIN the 1v1 matchup on the current patch.
  This is your primary candidate pool. Do NOT ignore it.

STEP 2 — Cross-reference with the ⛔ DO NOT PICK list.
  Any champion listed there LOSES the 1v1. They are forbidden regardless of any other reason.
  Your "knowledge" about kits or synergies does NOT override a verified losing matchup.

STEP 3 — Apply filters: AP/AD balance, synergy, already picked.
  From the verified counter pool, pick those that also fit the comp.
  Only if the counter pool is empty after filtering may you suggest outside it, with explicit justification.

STEP 4 — Confirm meta viability via the tier list.
  Champions not on the current patch tier list need a strong justification.

LAYER 4 - SYNERGY ANALYSIS
- Which pick amplifies existing ally win conditions?
- Specific combos to consider: knock-up synergies (Yasuo/Yone), engage chains (follow-up CC), healing amplification, peel combinations.
- Does this pick enable a combo play with existing allies that the enemy cannot easily stop?

LAYER 5 - META RELEVANCE
- Is this champion strong in the current patch?
- Is this champion a flex pick creating draft pressure?
- Does it have a good matchup spread or is it highly situational?

LAYER 6 - PRACTICAL CONSIDERATIONS
- Difficulty vs payoff: Is the skill ceiling worth the reward in this specific game state?
- Optimal summoner spells for this matchup.
- First item power spike timing relative to the game state.
- When exactly should this team be fighting/winning?

STRICT RULES:
- The 3 recommendations MUST be from different champion archetypes/playstyles. Never suggest 3 of the same class.
- NEVER recommend a champion that is already picked by either team — they are locked out of the draft.
- NEVER recommend a champion from the ⛔ DO NOT PICK list — those champions LOSE the lane matchup on real patch data.
- NEVER use your internal training "knowledge" to override the lolalytics win-rate data. Real data beats intuition.
- A real counter requires at least a 3% statistical edge. A 50-51% win rate is noise, not a counter.
- Always reference the SPECIFIC enemy and ally champions by name in your reasoning — no generic analysis.
- If a champion pool is provided, ONLY recommend from that pool.

OUTPUT FORMAT — Return ONLY valid JSON, zero extra text:
{
  "recommendations": [
    {
      "champion": "ChampionName",
      "difficulty": "Easy|Medium|Hard",
      "damage_type": "AD|AP|Mixed|True",
      "archetype": "Mage|Assassin|Tank|Fighter|Marksman|Support|etc",
      "analysis": "2-3 sentences: why this champion is the best pick for this specific draft",
      "win_condition": "1-2 sentences: exactly how this champion wins the game given the current state",
      "synergizes_with": ["AllyName1", "AllyName2"],
      "counters": ["EnemyName1"],
      "summoner_spells": ["Flash", "Ignite"],
      "first_item": "ItemName",
      "power_spike": "early|mid|late"
    }
  ],
  "team_analysis": {
    "composition_type": "engage|poke|teamfight|splitpush|pick|protect",
    "damage_split": "AP-heavy|AD-heavy|balanced",
    "win_window": "early|mid|late|scaling",
    "key_synergies": ["Synergy1", "Synergy2"],
    "weaknesses": ["Weakness1"]
  },
  "why_not": "Brief explanation of what archetypes or picks to avoid and why",
  "team_win_condition": "The specific sequence of events that leads to victory",
  "composition_type": "teamfight|poke|engage|splitpush|pick|protect-the-carry",
  "power_curve": "early|mid|late|scaling",
  "key_threats": ["Threat1", "Threat2"],
  "draft_grade": "A|B|C",
  "draft_grade_reason": "Brief reason for the grade"
}"""


def _format_team(picks: list[str]) -> str:
    if not picks:
        return "  (none yet)"
    return "\n".join(f"  - {p}" for p in picks)


async def get_draft_suggestions(
    ally_picks:    list[str],
    enemy_picks:   list[str],
    role:          str,
    champion_pool: list[str] | None = None,
    ban_mode:      bool = False,
) -> dict:
    """
    Call Groq to get Challenger-level draft recommendations.

    Args:
        ally_picks: List of ally champion names (with roles if available)
        enemy_picks: List of enemy champion names (with roles if available)
        role: The role the user needs a pick for
        champion_pool: Optional list of champions the user plays
        ban_mode: If True, return ban recommendations instead

    Returns:
        Parsed JSON dict with recommendations
    """
    ally_str  = _format_team(ally_picks)
    enemy_str = _format_team(enemy_picks)

    pool_section = ""
    if champion_pool:
        pool_section = f"""
MY CHAMPION POOL (ONLY recommend champions from this list):
{chr(10).join(f"  - {c}" for c in champion_pool)}
IMPORTANT: Do NOT recommend any champion not in the pool above."""

    # ── Pre-compute damage balance (deterministic, not AI-guessed) ────────────
    dmg = analyze_team_damage(ally_picks)

    # ── Fetch live lolalytics data (single call — reused for prompt + pool + tiers) ──
    lolalytics_block:  str       = ""
    verified_counters: list[str] = []
    blacklist_names:   set[str]  = set()
    tier_list_ref:     list[str] = []

    if not ban_mode and enemy_picks:
        try:
            enemy_data, tier_list_ref = await fetch_all_context(enemy_picks, role)

            # Identify the direct lane opponent
            enemy_laner = None
            for pick in enemy_picks:
                if f"({role})" in pick:
                    enemy_laner = pick.split("(")[0].strip()
                    break

            # Build lolalytics context block for the AI prompt
            lolalytics_block = build_lolalytics_context(enemy_data, tier_list_ref, role, enemy_laner)

            # Build counter pool (verified wins) + blacklist (verified losses)
            for data in enemy_data:
                for c in data.get("easy_matchups", []):
                    blacklist_names.add(c["champion"].lower())
                if enemy_laner and data["champion"].lower() == enemy_laner.lower():
                    verified_counters = [c["champion"] for c in data.get("counters", [])]
        except Exception:
            pass  # Graceful fallback

    # Build list of all champions already in the draft (cannot be suggested)
    all_draft_picks = [
        p.split("(")[0].strip() for p in ally_picks + enemy_picks if p
    ]
    excluded_str = ", ".join(all_draft_picks) if all_draft_picks else "None"

    if ban_mode:
        user_message = f"""Current draft state — recommend the 3 best BANS.

ALLY TEAM:
{ally_str}

ENEMY TEAM:
{enemy_str}

WHAT I NEED: Ban phase recommendations
This is a high-elo game, assume optimal play from both sides.

Prioritize banning:
1. Champions that complete or hard-enable the enemy team composition.
2. Champions that hard-counter our ally picks.
3. Overpowered flex picks in the current meta.

Think through all 6 layers then return ONLY valid JSON."""
    else:
        counter_pool_section = ""
        if verified_counters:
            counter_pool_section = f"""

🎯 MANDATORY CANDIDATE POOL — verified by lolalytics real win-rate data:
   These champions WIN the 1v1 matchup against the enemy {role} laner:
   {', '.join(verified_counters)}
   ⚠ Your 3 picks MUST come from this pool (filtered by AP/AD rule and synergy).
   ⚠ Suggesting a champion NOT in this pool is only allowed if the AP/AD rule
     forces you to AND you explain exactly why no pool champion fits."""

        user_message = f"""{dmg['hard_rule']}
{lolalytics_block}{counter_pool_section}

{'='*55}
Current draft state — recommend the top 3 picks for {role}.

⛔ CANNOT SUGGEST THESE CHAMPIONS (already in draft — ally or enemy):
   {excluded_str}
   These are locked in. Suggesting any of them is an error.

ALLY TEAM (damage type: {dmg['label']} — {dmg['ap_count']} AP / {dmg['ad_count']} AD):
{ally_str}

ENEMY TEAM:
{enemy_str}

WHAT I NEED:
- Role to fill: {role}
- Ally damage profile: {dmg['label']} ({dmg['ap_count']} AP / {dmg['ad_count']} AD)
- Required damage type for next pick: {dmg['required_type']}
- FORBIDDEN damage type: {dmg['forbidden_type']}{pool_section}

IMPORTANT:
- The MANDATORY CANDIDATE POOL above is your PRIMARY source. Use it.
- The MANDATORY DAMAGE RULE and CANNOT SUGGEST list override everything else.
- Reference enemy and ally champions BY NAME in your reasoning.

Think through all 6 layers IN ORDER:
1. Identify both teams' win conditions.
2. Damage balance is {dmg['label']}. Required: {dmg['required_type']}. DO NOT suggest {dmg['forbidden_type']}.
3. From the CANDIDATE POOL, pick the best fits for this specific draft.
4. Find synergies with existing ally picks.
5. Confirm the pick is on the tier list and meta-viable.
6. Assess difficulty, power spike timing, and summoner spells.

Return ONLY valid JSON, no extra text."""

    # Try every combination of API key × model until one succeeds
    if not API_KEYS:
        raise RuntimeError("No GROQ_API_KEY found. Set at least one API key in environment variables.")

    raw_text   = None
    last_error = None

    for api_key in API_KEYS:
        for model in MODELS:
            try:
                client = AsyncGroq(api_key=api_key)
                response = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": user_message},
                    ],
                    temperature=0.72,
                    max_tokens=1400,
                )
                raw_text = response.choices[0].message.content.strip()
                break
            except Exception as e:
                last_error = e
                err = str(e)
                if any(x in err for x in ("rate_limit_exceeded", "429", "model_decommissioned", "model_not_found")):
                    continue
                raise
        if raw_text is not None:
            break

    if raw_text is None:
        raise last_error

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    result = json.loads(raw_text)

    # ── Python-level safety filter — remove blacklisted picks ─────────────────
    if blacklist_names and result.get("recommendations"):
        filtered = [
            rec for rec in result["recommendations"]
            if rec.get("champion", "").lower() not in blacklist_names
        ]
        if filtered:
            result["recommendations"] = filtered

    # ── Patch tier badges — computed from tier list position ──────────────────
    # S = top 3, A = 4-8, B = 9-14, C = 15+, not listed = B
    if tier_list_ref and result.get("recommendations"):
        tier_map = {name.lower(): i for i, name in enumerate(tier_list_ref)}
        for rec in result["recommendations"]:
            pos = tier_map.get(rec.get("champion", "").lower())
            if pos is None:
                rec["patch_tier"] = "B"
            elif pos < 3:
                rec["patch_tier"] = "S"
            elif pos < 8:
                rec["patch_tier"] = "A"
            elif pos < 14:
                rec["patch_tier"] = "B"
            else:
                rec["patch_tier"] = "C"

    return result
