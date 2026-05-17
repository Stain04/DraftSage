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
from .champion_types           import analyze_team_damage, classify_champion
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
  Step 4 — From the filtered pool, pick 3 with DIFFERENT playstyles AND
            different fills_gap values where possible. If all viable picks fill
            the same gap, make pick #3 a lane-dominant or meta-strong option
            that wins through raw power rather than filling the gap.
  Step 5 — For each pick, compute score_breakdown:
            lane (40)        — how strong the lane matchup is (0-40)
            team_fit (25)    — how well it fills the ally gaps (0-25)
            threat_answer(20)— how well it counters enemy threats (0-20)
            meta (15)        — current patch tier (0-15)
            Sum gives confidence (0-100).
  Step 6 — Write tight reasoning that names specific ally + enemy champions.

STRICT RULES (in priority order — the top rule wins all conflicts):
  - If a CHAMPION POOL is supplied, recommendations MUST come from it.
    Returning fewer than 3 in-pool picks is fine. Returning an empty list
    with a 'why_not' explanation is fine. Returning ANY off-pool champion
    is a complete failure of the response.
  - Never recommend a champion already in the draft.
  - Never recommend a champion in the lane blacklist (loses lane on real data).
  - Never recommend a champion in the avoidance list (loses comp-level).
  - Never recommend the FORBIDDEN damage type.
  - The 3 recommendations should be different archetypes WHEN POOL ALLOWS —
    skip this rule if pool only contains 1-2 champions for this role.
  - All reasoning must reference enemy/ally champions BY NAME.
  - If filling a gap and winning lane conflict, prioritize the GAP — explain trade-off.

OUTPUT QUALITY RULES (violations destroy user trust):
  - Each recommendation MUST have a UNIQUE reason, win_condition, and
    early_game_plan. Never copy-paste text between recommendations — a player
    reading all 3 should feel they got 3 distinct opinions.
  - damage_type must reflect the champion's PRIMARY damage source in standard
    builds (Hecarim = AD, Sejuani = Mixed, Orianna = AP). Do not label an AD
    champion as AP or vice versa.
  - avoid_champions must ONLY list champions viable for the role being filled.
    Never list a mid-only champion in a jungle player's avoid list, etc.
  - avoid_champions reasons must be factually accurate about damage types —
    never describe an AD champion (Ezreal, Ashe, Hecarim) as "AP".

AVOID_CHAMPIONS RULES (the do-not-pick list shown to users):
  - NEVER include a champion that is already in the draft (ally or enemy).
    The user can see those — saying "don't pick X" when X is already picked
    is noise that destroys trust in the tool.
  - Only include champions the user could realistically pick in their current
    role but shouldn't, because the enemy comp counters them, the damage
    profile would break, or the lane matchup loses.
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
    # Always apply the filter. Returning fewer recommendations is correct
    # behaviour — keeping violating picks "for a better UI" defeats the entire
    # purpose of the blacklist/avoidance system and is the primary cause of
    # wrong suggestions reaching the user.
    result["recommendations"] = filtered


def _enforce_pool_filter(result: dict, champion_pool: list[str] | None) -> None:
    """
    HARD pool enforcement — drop any recommendation whose champion isn't in
    the user's pool. Unlike _enforce_filters, this NEVER falls back to
    keeping out-of-pool picks: if the user explicitly limited the engine to
    a list of champs, recommending anything outside that list is a contract
    violation and worse than an empty result.

    Adds a `pool_warning` field to the result when filtering removed picks
    so the UI can explain what happened.
    """
    if not champion_pool:
        return
    recs = result.get("recommendations") or []
    if not recs:
        return

    pool_lower = {c.strip().lower() for c in champion_pool if c}

    in_pool:     list[dict] = []
    out_of_pool: list[str]  = []
    for rec in recs:
        name = rec.get("champion", "").strip()
        if not name:
            continue
        if name.lower() in pool_lower:
            in_pool.append(rec)
        else:
            out_of_pool.append(name)

    result["recommendations"] = in_pool

    if out_of_pool:
        # Surface a clear note so the UI can show why fewer recs came back
        result["pool_warning"] = (
            f"The Engine tried to suggest {', '.join(out_of_pool)} but they're "
            f"not in your champion pool. Showing only pool-matching picks. "
            f"Add more champions to your pool if you want broader options."
        )

    if not in_pool:
        # Genuinely no in-pool fits — leave recommendations empty and surface
        # a clear, actionable message for the UI.
        result["pool_empty"] = True
        result["pool_warning"] = (
            "No champion in your pool fits this draft state. "
            "Try adding picks that match the role you're filling, or temporarily "
            "clear your pool to see broader suggestions."
        )


def _enforce_diversity(result: dict) -> None:
    """
    Remove exact duplicate champion names from recommendations and flag when
    all picks share the same archetype, fills_gap, or answers_threat.
    """
    recs = result.get("recommendations")
    if not recs:
        return

    seen: set[str] = set()
    unique: list[dict] = []
    for rec in recs:
        name = rec.get("champion", "").strip().lower()
        if name and name not in seen:
            seen.add(name)
            unique.append(rec)
    result["recommendations"] = unique

    if len(unique) >= 2:
        warnings: list[str] = []

        archetypes = {r.get("archetype", "") for r in unique if r.get("archetype")}
        if len(archetypes) == 1:
            warnings.append(
                f"All recommendations share the same archetype ({next(iter(archetypes))})."
            )

        gaps = [r.get("fills_gap", "") for r in unique if r.get("fills_gap")]
        if len(gaps) == len(unique) and len(set(gaps)) == 1:
            warnings.append(
                f"All recommendations fill the same gap ({gaps[0]}) — "
                "pick #3 could instead prioritise lane dominance or meta strength."
            )

        threats = [r.get("answers_threat", "") for r in unique if r.get("answers_threat")]
        if len(threats) == len(unique) and len(set(threats)) == 1:
            warnings.append(
                f"All picks counter the same threat ({threats[0]})."
            )

        if warnings:
            result["diversity_warning"] = " ".join(warnings)


def _validate_avoid_damage_types(result: dict) -> None:
    """
    Remove avoid_champion entries that contain factually wrong damage-type claims.

    The LLM frequently labels AD champions (Ezreal, Ashe, Hecarim) as "AP" in
    the avoid reasons. We cross-check each entry against our deterministic
    classify_champion() and drop entries whose reason contradicts it.
    """
    raw = result.get("avoid_champions")
    if not isinstance(raw, list):
        return

    validated: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name   = item.get("champion", "")
        reason = (item.get("reason") or "").lower()
        det    = classify_champion(name)   # "AP", "AD", or "Mixed"

        # Drop entry if reason claims AP but champion is deterministically AD
        if det == "AD" and any(kw in reason for kw in ("ap champion", "ap damage", "magic damage", "further imbalance")):
            continue
        # Drop entry if reason claims AD but champion is deterministically AP
        if det == "AP" and any(kw in reason for kw in ("ad champion", "physical damage", "ad damage")):
            continue

        validated.append(item)
    result["avoid_champions"] = validated


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

    if enemy_picks:
        try:
            enemy_data, tier_list_ref = await fetch_all_context(enemy_picks, role)

            enemy_laner = None
            for pick in enemy_picks:
                if f"({role})" in pick:
                    enemy_laner = pick.split("(")[0].strip()
                    break

            lolalytics_block = build_lolalytics_context(enemy_data, tier_list_ref, role, enemy_laner)

            for data in enemy_data:
                # Blacklist only champions that lose to the DIRECT LANE OPPONENT.
                # Applying all enemy picks' easy_matchups causes false positives for
                # flex champions (e.g. top-lane matchup data pollutes ADC suggestions).
                is_lane_opponent = (
                    enemy_laner and data["champion"].lower() == enemy_laner.lower()
                )
                if is_lane_opponent or not enemy_laner:
                    for c in data.get("easy_matchups", []):
                        blacklist_names.add(c["champion"].lower())
                if is_lane_opponent:
                    verified_counters = [c["champion"] for c in data.get("counters", [])]
        except Exception:
            pass  # Soft fail — analyzer still works

    # ── Stage 4: Avoidance engine ─────────────────────────────────────────────
    avoid_rules     = derive_avoidance(ally_picks, enemy_picks, analysis, role)
    avoidance_block = build_avoidance_block(avoid_rules)
    avoid_set       = build_avoid_set(avoid_rules)

    # ── Champion pool (Pro feature) — HARD constraint ─────────────────────────
    pool_section = ""
    if champion_pool:
        pool_list = "\n".join(f"  • {c}" for c in champion_pool)
        pool_section = (
            "\n\n" + "=" * 60 + "\n"
            "🔒 CHAMPION POOL — HARD CONSTRAINT (overrides everything else)\n"
            + "=" * 60 + "\n"
            f"The user can ONLY play these {len(champion_pool)} champions:\n"
            f"{pool_list}\n\n"
            "⛔ EVERY recommendation MUST be exactly one of the champions above.\n"
            "⛔ Suggesting ANY champion not in this list is a complete failure of\n"
            "   the response — the user cannot play those champions and your\n"
            "   recommendation is useless.\n"
            "⛔ If fewer than 3 pool champions fit the role/comp/lane, return ONLY\n"
            "   the ones that fit. It's better to return 1 good in-pool pick than\n"
            "   3 picks the user cannot play.\n"
            "⛔ If ZERO pool champions reasonably fit, return an EMPTY\n"
            "   recommendations array and put a clear note in 'why_not' explaining\n"
            "   which off-pool champions the user should add to their pool for this\n"
            "   draft state.\n"
            "⛔ Off-meta is fine if it's the only pool option. Off-pool is NEVER fine.\n"
            + "=" * 60
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
{lolalytics_block}
{avoidance_block}

WHAT I NEED: Ban phase recommendations.

Prioritize banning:
1. Champions that complete or hard-enable the enemy comp (look at enemy gaps the OTHER way).
2. Champions that exploit our ally gaps from the intel block.
3. Overpowered flex picks in the current meta tier list.

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
                    temperature=0.3,
                    max_tokens=3000,
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
    # Pool enforcement runs LAST so it has the final word — recommendations
    # that survived every other filter are still dropped if they're not in
    # the user's explicitly-set pool.
    _enforce_pool_filter(result, champion_pool)
    # Remove duplicate champion names and flag single-archetype results.
    _enforce_diversity(result)

    # ── Backfill team_analysis with deterministic values ──────────────────────
    _enrich_team_analysis(result, analysis, dmg, enemy_dmg)

    # ── Attach deterministic avoidance rules ──────────────────────────────────
    # Pass drafted set so already-picked champs are stripped from avoid_champions
    _attach_deterministic_avoidance(result, avoid_rules, drafted_names)

    # ── Strip factually wrong damage-type claims from avoid list ─────────────
    _validate_avoid_damage_types(result)

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
            # LLMs hallucinate damage types (Hecarim as "AP", Ezreal as "AP").
            # Override with deterministic classification. Only override when we
            # have a clear AD or AP result — leave "Mixed" to the LLM.
            det_type = classify_champion(rec.get("champion", ""))
            if det_type != "Mixed":
                rec["damage_type"] = det_type

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
