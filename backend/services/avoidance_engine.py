"""
Avoidance Engine for DraftSage.

Produces deterministic rules about which champion archetypes/specific
champions to avoid based on the enemy comp's composition profile.

These rules complement the per-lane Lolalytics blacklist:
  - Lolalytics tells us "Vayne loses to Malphite in lane"
  - This engine tells us "Vayne is bad vs the *whole* enemy comp
    because they have 3 dive sources and a backline cleaner"

All champion pools are derived dynamically from T (the trait database)
using predicate functions — no hardcoded champion lists to maintain.
Output is consumed by the AI prompt and surfaced to the user.
"""

from .composition_analyzer import T, get_traits


def _champs_matching(predicate, role: str | None = None) -> set[str]:
    """
    Return all champions in T where predicate(traits) is True.
    If role is given, only return champions whose 'roles' list includes it.
    Champions with empty or missing 'roles' are included when role is None.
    """
    result: set[str] = set()
    for champ, traits in T.items():
        if role is not None and role not in traits.get("roles", []):
            continue
        try:
            if predicate(traits):
                result.add(champ)
        except Exception:
            pass
    return result


def _filter_existing(picks: list[str], champions: set[str]) -> list[str]:
    """Remove champions already in the draft from a suggestion set."""
    drafted = {p.split("(")[0].strip().lower() for p in picks}
    return sorted([c for c in champions if c.lower() not in drafted])


def derive_avoidance(
    ally_picks: list[str],
    enemy_picks: list[str],
    analysis: dict,
    role: str,
) -> list[dict]:
    """
    Return a list of {category, champions, reason} dicts describing
    champion groups to avoid given the enemy comp.

    All champion pools are computed dynamically from T — no hardcoded sets.
    Only emits rules when a real threat exists (no noise).
    """
    rules: list[dict] = []
    ep = analysis["enemy_profile"]
    all_picks = ally_picks + enemy_picks

    # Rule 1 — enemy heavy dive → avoid immobile carries in bot lane
    # Immobile carry: ranged + scaling + no disengage + no self-peel
    if role == "Bot" and ep["dive"] >= 3:
        divers = [p for p in enemy_picks if get_traits(p).get("dive", 0) >= 1]
        pool = _champs_matching(
            lambda t: t.get("ranged", 0) >= 2
                      and t.get("scaling", 0) >= 1
                      and t.get("disengage", 0) == 0
                      and t.get("dive", 0) == 0
                      and t.get("peel", 0) == 0,
            role="Bot",
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Immobile ADCs",
                "champions": targets[:5],
                "reason": (
                    f"Enemy has {ep['dive']} dive-score from {', '.join(divers[:3])}. "
                    "Immobile carries get jumped on and bursted before they can output damage."
                ),
            })

    # Rule 2 — enemy CC chain → avoid low-mobility squishies
    # Low-mobility squishy: no disengage, no high dive, not a frontliner
    if ep["hard_cc"] >= 6:
        cc_sources = [p for p in enemy_picks if get_traits(p).get("hard_cc", 0) >= 2]
        pool = _champs_matching(
            lambda t: t.get("disengage", 0) == 0
                      and t.get("dive", 0) <= 1
                      and t.get("frontline", 0) == 0
                      and t.get("peel", 0) == 0,
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Low-mobility squishies",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks {ep['hard_cc']} hard-CC across {', '.join(cc_sources[:3])}. "
                    "Champions without dashes/blinks get chain-CC'd and deleted in fights."
                ),
            })

    # Rule 3 — enemy heavy poke + no ally engage → avoid short-range melee
    # Short-range melee: no ranged, no poke of own, no engage
    if ep["poke"] >= 4 and analysis["ally_profile"]["engage"] <= 1:
        pokers = [p for p in enemy_picks if get_traits(p).get("poke", 0) >= 2]
        pool = _champs_matching(
            lambda t: t.get("ranged", 0) == 0
                      and t.get("poke", 0) == 0
                      and t.get("engage", 0) <= 1,
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Low-range / melee with no engage support",
                "champions": targets[:5],
                "reason": (
                    f"Enemy pokes hard ({ep['poke']} score from {', '.join(pokers[:3])}) "
                    "and your team has no engage. Melee picks will be poked out before fights start."
                ),
            })

    # Rule 4 — enemy heavy peel/disengage → avoid all-in melee carries
    # All-in melee carry: diver or split-pusher, no ranged, no frontline
    if ep["disengage"] + ep["peel"] >= 4 and role in ("Bot", "Mid", "Top"):
        pool = _champs_matching(
            lambda t: t.get("ranged", 0) == 0
                      and (t.get("dive", 0) >= 1 or t.get("splitpush", 0) >= 1)
                      and t.get("frontline", 0) == 0,
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "All-in melee carries",
                "champions": targets[:5],
                "reason": (
                    f"Enemy has strong peel + disengage (score {ep['disengage'] + ep['peel']}). "
                    "All-in melee threats get kited and never reach the backline."
                ),
            })

    # Rule 5 — enemy heavy frontline → avoid pure-burst assassins
    # Pure burst assassin: high dive/pick, no frontline, not a poke champion
    if ep["frontline"] >= 5 and role in ("Mid", "Jungle"):
        pool = _champs_matching(
            lambda t: (t.get("dive", 0) + t.get("pick", 0)) >= 3
                      and t.get("frontline", 0) == 0
                      and t.get("poke", 0) == 0,
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Pure-burst assassins",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks frontline (score {ep['frontline']}). "
                    "Assassins struggle to find squishy targets and become useless past 20 min."
                ),
            })

    # Rule 6 — multiple melee dive/pick threats → avoid fragile immobile AP carries
    melee_dive_threats = sum(
        1 for p in enemy_picks
        if get_traits(p).get("dive", 0) + get_traits(p).get("pick", 0) >= 2
        and get_traits(p).get("ranged", 0) == 0
    )
    if melee_dive_threats >= 2:
        threat_names = [
            p.split("(")[0].strip() for p in enemy_picks
            if get_traits(p).get("dive", 0) + get_traits(p).get("pick", 0) >= 2
            and get_traits(p).get("ranged", 0) == 0
        ]
        # Fragile AP carry: AP damage, ranged, scaling, no escape (no disengage/dive/peel)
        pool = _champs_matching(
            lambda t: t.get("ap", -1) == 1
                      and t.get("ranged", 0) >= 2
                      and t.get("scaling", 0) >= 1
                      and t.get("disengage", 0) == 0
                      and t.get("dive", 0) == 0
                      and t.get("peel", 0) == 0,
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Fragile AP carries vs melee dive",
                "champions": targets[:5],
                "reason": (
                    f"Enemy has {melee_dive_threats} melee dive/pick threats "
                    f"({', '.join(threat_names[:3])}). "
                    "Immobile AP carries with no escape will be one-shot before they can cast."
                ),
            })

    # Rule 7 — enemy stacks armor tanks → flag pure AD scalers
    # Armor tank: frontline >= 2 and hard_cc >= 2 (traditional tanks that build
    # Thornmail / Randuin's / Frozen Heart). Trait-driven — no hardcoded set.
    armor_tank_pool = _champs_matching(
        lambda t: t.get("frontline", 0) >= 2 and t.get("hard_cc", 0) >= 2,
    )
    enemy_armor = [
        p.split("(")[0].strip() for p in enemy_picks
        if p.split("(")[0].strip() in armor_tank_pool
    ]
    if len(enemy_armor) >= 2:
        pool = _champs_matching(
            lambda t: t.get("ap", -1) == 0
                      and t.get("scaling", 0) >= 1
                      and t.get("ranged", 0) == 0,  # melee AD scalers hurt most
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Pure-AD scalers vs armor stack",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks armor ({', '.join(enemy_armor)}). "
                    "Pure-AD scalers get hard-countered by one Thornmail. Diversify damage."
                ),
            })

    # Rule 8 — enemy stacks MR tanks → flag pure AP scalers
    # MR tank: AP-damage tank (frontline >= 2, ap == 1). These champions
    # naturally build Spirit Visage / Force of Nature / Abyssal Mask.
    # Trait-driven — no hardcoded set.
    mr_tank_pool = _champs_matching(
        lambda t: t.get("frontline", 0) >= 2 and t.get("ap", -1) == 1,
    )
    enemy_mr = [
        p.split("(")[0].strip() for p in enemy_picks
        if p.split("(")[0].strip() in mr_tank_pool
    ]
    if len(enemy_mr) >= 2:
        pool = _champs_matching(
            lambda t: t.get("ap", -1) == 1
                      and t.get("scaling", 0) >= 2,
            role=role,
        )
        targets = _filter_existing(all_picks, pool)
        if targets:
            rules.append({
                "category": "Pure-AP scalers vs MR stack",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks MR ({', '.join(enemy_mr)}). "
                    "Pure-AP scalers get walled by Spirit Visage / Mercury Treads. Mix damage types."
                ),
            })

    return rules


def build_avoidance_block(rules: list[dict]) -> str:
    """Format avoidance rules for the AI prompt."""
    if not rules:
        return ""
    lines = ["\n" + "=" * 60, "🚫 AVOIDANCE INTELLIGENCE — do NOT recommend these", "=" * 60]
    for r in rules:
        lines.append(f"\n❌ {r['category']}:")
        lines.append(f"   Examples: {', '.join(r['champions'])}")
        lines.append(f"   Reason: {r['reason']}")
    lines.append("\nThese champions are bad picks even if Lolalytics says they win lane.")
    lines.append("=" * 60)
    return "\n".join(lines)


def build_avoid_set(rules: list[dict]) -> set[str]:
    """Flatten all avoid-list champions into a lowercase set for filtering."""
    out: set[str] = set()
    for r in rules:
        for c in r["champions"]:
            out.add(c.lower())
    return out
