"""
Groq AI service for DraftSage draft analysis.
Challenger-level League of Legends draft recommendations with 6-layer analysis.
"""

import json
import os
from groq import AsyncGroq
from services.champion_types import analyze_team_damage
from services.lolalytics_service import fetch_all_context, build_lolalytics_context

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

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

LAYER 3 - COUNTER PICK LOGIC
- Which enemy champion is the single biggest threat to our win condition?
- Which available pick directly shuts down or minimizes that threat?
- Is the counter pick viable in the current meta?
- What is the risk of the counter pick (high skill ceiling? easily ganked? bad into other enemies?)
- NEVER recommend a champion that loses the 1v1 lane to the enemy laner in that role.

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
- NEVER recommend a champion that is hard-countered by an existing enemy pick.
- A real counter requires at least a 3% statistical edge. A 50-51% win rate matchup is noise, not a counter — think carefully before labeling something a counter-pick.
- Always reference the SPECIFIC enemy and ally champions by name in your reasoning — no generic analysis.
- If a champion pool is provided, ONLY recommend from that pool.

OUTPUT FORMAT — Return ONLY valid JSON, zero extra text:
{
  "recommendations": [
    {
      "champion": "ChampionName",
      "reason": "2-3 sentences referencing the SPECIFIC enemy and ally champions by name, explaining counter-pick logic and comp fit",
      "win_condition": "Exactly how this champion wins this specific game — reference the team composition",
      "difficulty": "Easy" | "Medium" | "Hard",
      "damage_type": "AD" | "AP" | "Mixed" | "True",
      "fills_gap": "Short label: e.g. AP carry, Engage tank, Peel support, Splitpusher",
      "power_spike": "When this champion becomes strong, e.g. Level 6, First item (Kraken Slayer), Level 11",
      "synergies": ["AllyChamp1", "AllyChamp2"],
      "counters": ["EnemyChamp1"],
      "summoner_spells": ["Flash", "Ignite"],
      "early_game_plan": "Concise 1-2 sentence laning phase plan for this specific matchup",
      "team_fighting_role": "Exactly what this champion does in teamfights in this comp"
    }
  ],
  "team_analysis": {
    "ally_damage_type": "e.g. Full-AD, Mostly-AD, Balanced, Full-AP",
    "enemy_damage_type": "e.g. Mixed, Full-AD, Mostly-AP",
    "missing_from_ally": ["gap1", "gap2"],
    "enemy_win_condition": "What the enemy team is trying to do in 1 sentence"
  },
  "team_win_condition": "Full ally team win condition in 1-2 sentences assuming best pick is taken",
  "composition_type": "engage" | "poke" | "teamfight" | "splitpush" | "pick" | "protect" | "scaling",
  "power_curve": "early" | "mid" | "late" | "scaling",
  "key_threats": ["Biggest enemy threats to respect, listed by champion name"],
  "why_not": "1-2 sentences on which archetypes or damage types are UNSAFE to pick here and exactly why",
  "draft_grade": "A" | "B" | "C",
  "draft_grade_reason": "1 sentence explaining the grade based on the overall draft quality"
}"""


def _format_team(picks: list[str]) -> str:
    if not picks:
        return "None yet"
    lines = []
    for p in picks:
        lines.append(f"  - {p}")
    return "\n".join(lines)


async def get_draft_suggestions(
    ally_picks: list[str],
    enemy_picks: list[str],
    role: str,
    champion_pool: list[str] | None = None,
    ban_mode: bool = False,
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

    # ── Fetch live lolalytics data: counter matchups + role tier list (parallel, no cache) ────
    lolalytics_block = ""
    if not ban_mode and enemy_picks:
        try:
            enemy_data, tier_list = await fetch_all_context(enemy_picks, role)
            lolalytics_block = build_lolalytics_context(enemy_data, tier_list, role)
        except Exception:
            lolalytics_block = ""  # Graceful fallback

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
        user_message = f"""{dmg['hard_rule']}
{lolalytics_block}

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
- The MANDATORY DAMAGE RULE and CANNOT SUGGEST list override everything else.
- Do NOT suggest a champion that is the same archetype as the enemy {role} laner.
- Reference enemy and ally champions BY NAME in your reasoning.

Think through all 6 layers IN ORDER:
1. Identify both teams' win conditions.
2. Damage balance is {dmg['label']}. Required: {dmg['required_type']}. DO NOT suggest {dmg['forbidden_type']}.
3. Identify the enemy {role} laner's archetype — suggest a DIFFERENT archetype that beats it.
4. Find synergies with existing ally picks.
5. Confirm the pick is on the tier list and meta-viable.
6. Assess difficulty, power spike timing, and summoner spells.

Return ONLY valid JSON, no extra text."""

    # Model fallback chain — if primary hits rate limit, auto-switch to next
    MODELS = [
        "llama-3.3-70b-versatile",  # Best quality
        "llama-3.1-70b-versatile",  # Fallback 1 (separate quota)
        "llama-3.1-8b-instant",     # Fallback 2 (very high limit)
    ]

    raw_text = None
    last_error = None

    for model in MODELS:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                temperature=0.72,
                max_tokens=1400,  # Reduced from 2500 — saves ~43% tokens per request
            )
            raw_text = response.choices[0].message.content.strip()
            break  # Success — stop trying fallbacks
        except Exception as e:
            last_error = e
            if "rate_limit_exceeded" in str(e) or "429" in str(e):
                continue  # Try next model
            raise  # Non-rate-limit error — surface immediately

    if raw_text is None:
        raise last_error  # All models exhausted

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    return json.loads(raw_text)

