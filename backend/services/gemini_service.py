"""
DraftSage AI Brain v2.

Three-stage pipeline before the LLM ever sees the request:
  1. Deterministic team composition analysis  (composition_analyzer)
  2. Live lane counter data from Lolalytics    (lolalytics_service)
  3. Avoidance engine — comp-level "don't pick" (avoidance_engine)

The LLM receives all of this as structured intelligence and is required to:
  • Fill identified ally gaps
  • Counter identified enemy threats
  • Stay out of both the lane blacklist AND the comp-level avoid list
  • Return per-recommendation score breakdowns so users see *why*
"""

import json
import os
import re

from groq import AsyncGroq

from .lolalytics_service       import fetch_all_context, build_lolalytics_context
from .champion_types           import analyze_team_damage
from .composition_analyzer     import analyze_comp, build_intelligence_block
from .avoidance_engine         import derive_avoidance, build_avoidance_block, build_avoid_set
from .summoner_spells          import get_summoner_spells

# ── API Keys (pool for rotation) ─────────────────────────────────────────────
API_KEYS: list[str] = []
for i in range(1, 11):
    suffix = "" if i == 1 else f"_{i}"
    key = os.environ.get(f"GROQ_API_KEY{suffix}", "").strip()
    if key:
        API_KEYS.append(key)

# ── Model fallback chain ──────────────────────────────────────────────────────
MODELS = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama-3.1-8b-instant",
]

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are DraftSage — a Challenger-level League of Legends draft analyst.

You receive THREE layers of pre-computed intelligence in every user message:
  A. DAMAGE BALANCE RULE   — deterministic AP/AD enforcement
  B. TEAM COMPOSITION INTEL — gaps in ally comp, enemy archetype, enemy threats
  C. LOLALYTICS DATA       — verified lane-counter pool + lane blacklist
  D. AVOIDANCE INTEL       — comp-level "do not pick" rules with reasons

You MUST treat these layers as authoritative ground truth. Your job is NOT to
guess matchups from memory — it is to synthesize the structured intelligence
into a great pick that:

  1. Fills the TOP CRITICAL GAP in the ally comp (from B).
  2. Counters at least one of the HIGH-severity enemy threats (from B).
  3. Wins the lane matchup (in the LOLALYTICS counter pool from C).
  4. Is NOT in any blacklist (lane blacklist from C, avoidance list from D).
  5. Respects the AP/AD damage rule (from A).

REASONING ORDER (think through silently, then output ONLY JSON):

  Step 1 — Read the ally gaps. What axes does the next pick MUST address?
  Step 2 — Read the enemy threats. What does the next pick MUST counter?
  Step 3 — Filter the lane-counter pool by:
            (a) damage rule (forbidden_type)
            (b) avoidance rules (do not pick these)
            (c) what fills the gap from Step 1
  Step 4 — From the filtered pool, pick 3 with DIFFERENT playstyles.
  Step 5 — For each pick, compute score_breakdown:
            lane (40)        — how strong the lane matchup is (0-40)
            team_fit (25)    — how well it fills the ally gaps (0-25)
            threat_answer(20)— how well it counters enemy threats (0-20)
            meta (15)        — current patch tier (0-15)
            Sum gives confidence (0-100).
  Step 6 — Write tight reasoning that names specific ally + enemy champions.

STRICT RULES:
  - Never recommend a champion already in the draft.
  - Never recommend a champion in the lane blacklist (loses lane on real data).
  - Never recommend a champion in the avoidance list (loses comp-level).
  - Never recommend the FORBIDDEN damage type.
  - The 3 recommendations MUST be different archetypes.
  - All reasoning must reference enemy/ally champions BY NAME.
  - If filling a gap and winning lane conflict, prioritize the GAP — explain trade-off.

AVOID_CHAMPIONS RULES (the do-not-pick list shown to users):
  - NEVER include a champion that is already in the draft (ally or enemy).
    The user can see those — saying "don't pick X" when X is already picked
    is noise that destroys trust in the tool.
  - Only include champions the user could realistically pick but shouldn't,
    because the enemy comp counters them, the damage profile would break,
    or the lane matchup loses.
  - 0-4 entries. If there's nothing meaningful to warn about, return [].

OUTPUT — return ONLY valid JSON, zero extra text:
{
  "recommendations": [
    {
      "champion": "ChampionName",
      "difficulty": "Easy|Medium|Hard",
      "damage_type": "AD|AP|Mixed|True",
      "archetype": "Mage|Assassin|Tank|Fighter|Marksman|Support|Enchanter|Bruiser",
      "reason": "2-3 sentences explaining WHY this pick — reference ally + enemy champions by name",
      "win_condition": "1-2 sentences: exactly how this champion wins the game",
      "fills_gap": "The ally-comp gap this fixes (e.g. 'Engage', 'Frontline'). Empty string if none.",
      "answers_threat": "Which enemy threat this counters (e.g. 'Heavy dive'). Empty string if none.",
      "synergies": ["AllyName1", "AllyName2"],
      "counters": ["EnemyName1"],
      "summoner_spells": ["Flash", "Ignite"],
      "first_item": "ItemName",
      "power_spike": "early|mid|late",
      "early_game_plan": "1 sentence: how to play the laning phase",
      "team_fighting_role": "1 sentence: your job in teamfights",
      "score_breakdown": {
        "lane": 0-40,
        "team_fit": 0-25,
        "threat_answer": 0-20,
        "meta": 0-15,
        "confidence": 0-100
      }
    }
  ],
  "team_analysis": {
    "ally_damage_type": "AP-heavy|AD-heavy|Balanced",
    "enemy_damage_type": "AP-heavy|AD-heavy|Balanced",
    "ally_archetype": "engage|poke|pick|splitpush|teamfight|dive|scaling|protect|balanced",
    "enemy_archetype": "engage|poke|pick|splitpush|teamfight|dive|scaling|protect|balanced",
    "missing_from_ally": ["Gap1", "Gap2"],
    "enemy_win_condition": "1 sentence: how the enemy wins if you don't adapt"
  },
  "avoid_champions": [
    {"champion": "Name", "reason": "Why this specific champion is bad here"}
  ],
  "key_threats": ["EnemyName1", "EnemyName2"],
  "team_win_condition": "Your team's path to victory given the chosen pick",
  "composition_type": "engage|poke|teamfight|splitpush|pick|protect|dive|scaling|balanced",
  "power_curve": "early|mid|late|scaling",
  "draft_grade": "A|B|C",
  "draft_grade_reason": "Brief: why this grade",
  "why_not": "Brief summary of which archetypes to avoid and why (1-2 sentences)"
}"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_team(picks: list[str]) -> str:
    if not picks:
        return "  (none yet)"
    return "\n".join(f"  - {p}" for p in picks)


def _enrich_team_analysis(result: dict, analysis: dict, dmg: dict, enemy_dmg: dict) -> None:
    """
    Backfill team_analysis with deterministic values so the UI always has
    correct data even if the LLM omits or fudges fields.
    """
    ta = result.setdefault("team_analysis", {})

    # Always trust deterministic values for these
    ta["ally_damage_type"]  = dmg["label"]
    ta["enemy_damage_type"] = enemy_dmg["label"]
    ta["ally_archetype"]    = analysis["ally_archetype"]
    ta["enemy_archetype"]   = analysis["enemy_archetype"]

    # Fill missing_from_ally if AI didn't or returned junk
    if not isinstance(ta.get("missing_from_ally"), list) or not ta["missing_from_ally"]:
        ta["missing_from_ally"] = [g["name"] for g in analysis["ally_gaps"][:3]]

    # Top-level mirrors for legacy UI components
    result.setdefault("composition_type", analysis["ally_archetype"])


def _attach_deterministic_avoidance(
    result: dict,
    avoid_rules: list[dict],
    drafted: set[str],
) -> None:
    """
    Merge deterministic avoid rules into result.avoid_champions.

    Also filters out any champion that is already in the draft — telling the
    user "don't pick Aatrox" when Aatrox is on their team is just noise.
    """
    raw = result.get("avoid_champions") or []
    if not isinstance(raw, list):
        raw = []

    # Step 1 — drop any LLM-generated entries that reference drafted champions
    existing: list[dict] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = (item.get("champion") or "").strip()
        key  = name.lower()
        if not key or key in drafted or key in seen:
            continue
        existing.append(item)
        seen.add(key)

    # Step 2 — append deterministic rules, also filtering drafted champions
    added = 0
    for rule in avoid_rules:
        for champ in rule["champions"]:
            key = champ.lower()
            if key in drafted or key in seen:
                continue
            existing.append({"champion": champ, "reason": rule["reason"]})
            seen.add(key)
            added += 1
            if added >= 6:
                break
        if added >= 6:
            break

    result["avoid_champions"] = existing


def _enforce_filters(
    result: dict,
    blacklist: set[str],
    avoid_set: set[str],
    drafted: set[str],
    forbidden_type: str,
) -> None:
    """Hard Python-level filter on recommendations after the LLM responds."""
    if not result.get("recommendations"):
        return

    def keep(rec: dict) -> bool:
        name = rec.get("champion", "").strip().lower()
        if not name or name in drafted:
            return False
        if name in blacklist:
            return False
        if name in avoid_set:
            return False
        if forbidden_type != "None" and rec.get("damage_type") == forbidden_type:
            return False
        return True

    filtered = [r for r in result["recommendations"] if keep(r)]
    # If filter wiped everything, keep originals (better than empty UI)
    if filtered:
        result["recommendations"] = filtered


def _compute_confidence(rec: dict) -> int:
    """If score_breakdown is missing/partial, synthesize a confidence score."""
    sb = rec.get("score_breakdown") or {}
    if isinstance(sb, dict) and isinstance(sb.get("confidence"), (int, float)):
        return int(sb["confidence"])
    # Synthesize from sub-scores if any present
    lane     = int(sb.get("lane", 25)         or 25)
    fit      = int(sb.get("team_fit", 15)     or 15)
    threat   = int(sb.get("threat_answer", 10) or 10)
    meta     = int(sb.get("meta", 8)          or 8)
    total    = max(0, min(100, lane + fit + threat + meta))
    rec.setdefault("score_breakdown", {}).update({
        "lane": lane, "team_fit": fit, "threat_answer": threat,
        "meta": meta, "confidence": total,
    })
    return total


# ── Main entry ────────────────────────────────────────────────────────────────

async def get_draft_suggestions(
    ally_picks:    list[str],
    enemy_picks:   list[str],
    role:          str,
    champion_pool: list[str] | None = None,
    ban_mode:      bool = False,
) -> dict:
    """
    Returns a rich draft analysis with:
      - 3 recommendations (with score_breakdown + fills_gap + answers_threat)
      - team_analysis (ally/enemy archetype + gaps)
      - avoid_champions (deterministic + AI-derived)
      - key_threats, draft_grade, composition_type, etc.
    """
    ally_str  = _format_team(ally_picks)
    enemy_str = _format_team(enemy_picks)

    # ── Stage 1: Damage balance (deterministic) ───────────────────────────────
    dmg       = analyze_team_damage(ally_picks)
    enemy_dmg = analyze_team_damage(enemy_picks)

    # ── Stage 2: Composition analysis (deterministic) ─────────────────────────
    analysis  = analyze_comp(ally_picks, enemy_picks, role)

    # ── Stage 3: Live Lolalytics counter pool + tier list ─────────────────────
    lolalytics_block:  str       = ""
    verified_counters: list[str] = []
    blacklist_names:   set[str]  = set()
    tier_list_ref:     list      = []

    if not ban_mode and enemy_picks:
        try:
            enemy_data, tier_list_ref = await fetch_all_context(enemy_picks, role)

            enemy_laner = None
            for pick in enemy_picks:
                if f"({role})" in pick:
                    enemy_laner = pick.split("(")[0].strip()
                    break

            lolalytics_block = build_lolalytics_context(enemy_data, tier_list_ref, role, enemy_laner)

            for data in enemy_data:
                for c in data.get("easy_matchups", []):
                    blacklist_names.add(c["champion"].lower())
                if enemy_laner and data["champion"].lower() == enemy_laner.lower():
                    verified_counters = [c["champion"] for c in data.get("counters", [])]
        except Exception:
            pass  # Soft fail — analyzer still works

    # ── Stage 4: Avoidance engine ─────────────────────────────────────────────
    avoid_rules     = derive_avoidance(ally_picks, enemy_picks, analysis, role)
    avoidance_block = build_avoidance_block(avoid_rules)
    avoid_set       = build_avoid_set(avoid_rules)

    # ── Champion pool (Pro feature) ───────────────────────────────────────────
    pool_section = ""
    if champion_pool:
        pool_section = (
            "\n\nMY CHAMPION POOL (ONLY recommend champions from this list):\n"
            + "\n".join(f"  - {c}" for c in champion_pool)
            + "\nIMPORTANT: Do NOT recommend any champion not in the pool above."
        )

    # ── Build the intelligence-rich user message ──────────────────────────────
    intel_block = build_intelligence_block(analysis, dmg, role)
    drafted_names = {p.split("(")[0].strip().lower() for p in ally_picks + enemy_picks if p}
    excluded_str  = ", ".join(sorted(drafted_names)) if drafted_names else "None"

    if ban_mode:
        user_message = f"""Current draft state — recommend the 3 best BANS.

ALLY TEAM:
{ally_str}

ENEMY TEAM:
{enemy_str}
{intel_block}

WHAT I NEED: Ban phase recommendations.

Prioritize banning:
1. Champions that complete or hard-enable the enemy comp (look at enemy gaps the OTHER way).
2. Champions that exploit our ally gaps from the intel block.
3. Overpowered flex picks in the current meta.

Return ONLY valid JSON."""
    else:
        counter_pool_section = ""
        if verified_counters:
            counter_pool_section = (
                "\n\n🎯 LOLALYTICS LANE-COUNTER POOL — these WIN the lane on this patch:\n"
                f"   {', '.join(verified_counters)}\n"
                "   Cross-reference with the gaps + avoidance intel above before picking."
            )

        user_message = f"""{dmg['hard_rule']}
{intel_block}
{lolalytics_block}{counter_pool_section}
{avoidance_block}

{'=' * 55}
Role to fill: {role}
Ally damage profile: {dmg['label']} ({dmg['ap_count']} AP / {dmg['ad_count']} AD)
Required damage type for next pick: {dmg['required_type']}
FORBIDDEN damage type: {dmg['forbidden_type']}

⛔ CANNOT SUGGEST THESE (already in draft):
   {excluded_str}

ALLY TEAM:
{ally_str}

ENEMY TEAM:
{enemy_str}{pool_section}

Now execute the 6-step reasoning order from the system prompt.
Return ONLY valid JSON, no extra text."""

    # ── Call Groq with key + model fallback ───────────────────────────────────
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
                    temperature=0.7,
                    max_tokens=1800,
                )
                raw_text = response.choices[0].message.content
                if not raw_text or not raw_text.strip():
                    last_error = RuntimeError("Groq returned empty content.")
                    raw_text = None
                    continue
                raw_text = raw_text.strip()
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
        raise last_error or RuntimeError("All Groq API keys exhausted.")

    # ── Robust JSON extraction ────────────────────────────────────────────────
    if "```" in raw_text:
        fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw_text)
        if fenced:
            raw_text = fenced.group(1).strip()

    if not raw_text.startswith("{"):
        brace_match = re.search(r"\{[\s\S]*\}", raw_text)
        if brace_match:
            raw_text = brace_match.group(0)

    if not raw_text:
        raise RuntimeError("Groq returned an empty response. Try again.")

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"AI returned non-JSON output. Try again. (raw: {raw_text[:120]!r})"
        ) from exc

    # ── Python-level safety filters (hard guarantees) ─────────────────────────
    _enforce_filters(result, blacklist_names, avoid_set, drafted_names, dmg["forbidden_type"])

    # ── Backfill team_analysis with deterministic values ──────────────────────
    _enrich_team_analysis(result, analysis, dmg, enemy_dmg)

    # ── Attach deterministic avoidance rules ──────────────────────────────────
    # Pass drafted set so already-picked champs are stripped from avoid_champions
    _attach_deterministic_avoidance(result, avoid_rules, drafted_names)

    # ── Confidence scoring + back-compat field aliases + spell override ──────
    if result.get("recommendations"):
        for rec in result["recommendations"]:
            _compute_confidence(rec)
            # Back-compat: older UI fields
            if "analysis" not in rec and rec.get("reason"):
                rec["analysis"] = rec["reason"]
            if "synergizes_with" not in rec and rec.get("synergies"):
                rec["synergizes_with"] = rec["synergies"]
            # LLMs hallucinate summoner spells (Smite on ADCs, Ignite on every-
            # one). Always overwrite with the deterministic recommendation.
            rec["summoner_spells"] = get_summoner_spells(
                champion=rec.get("champion", ""),
                role=role,
                enemy_picks=enemy_picks,
            )

    # ── Patch tier badges (existing OP.GG integration) ────────────────────────
    if tier_list_ref and result.get("recommendations"):
        from .opgg_service import build_tier_lookup
        if isinstance(tier_list_ref[0], dict):
            tier_lookup = build_tier_lookup(tier_list_ref)
            for rec in result["recommendations"]:
                entry = tier_lookup.get(rec.get("champion", "").lower())
                rec["patch_tier"] = entry["tier_label"] if entry else "B"
        else:
            pos_map = {name.lower(): i for i, name in enumerate(tier_list_ref)}
            for rec in result["recommendations"]:
                pos = pos_map.get(rec.get("champion", "").lower())
                rec["patch_tier"] = (
                    "S" if pos is not None and pos < 3 else
                    "A" if pos is not None and pos < 8 else
                    "B" if pos is not None and pos < 14 else "C"
                )

    return result
