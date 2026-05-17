"""
Avoidance Engine for DraftSage.

Produces deterministic rules about which champion archetypes/specific
champions to avoid based on the enemy comp's composition profile.

These rules complement the per-lane Lolalytics blacklist:
  - Lolalytics tells us "Vayne loses to Malphite in lane"
  - This engine tells us "Vayne is bad vs the *whole* enemy comp
    because they have 3 dive sources and a backline cleaner"

Output is consumed by the AI prompt and surfaced to the user.
"""

from .composition_analyzer import get_traits, T

# Champion categories used for "avoid these" lists
IMMOBILE_ADCS = {
    "Jinx", "Ashe", "Kog'Maw", "Twitch", "Sivir", "Caitlyn", "Aphelios",
    "Miss Fortune", "Senna", "Varus", "Smolder",
}

MELEE_CARRIES = {
    "Yasuo", "Yone", "Samira", "Tryndamere", "Master Yi", "Vayne",
    "Nilah", "Sett", "Irelia", "Riven", "Katarina", "Fiora",
}

LOW_RANGE_BRUISERS = {
    "Darius", "Garen", "Sett", "Volibear", "Olaf", "Trundle",
    "Warwick", "Renekton", "Aatrox", "Mordekaiser",
}

SQUISHY_BURST_MAGES = {
    "Veigar", "Annie", "Syndra", "Lux", "Brand", "Xerath", "Vel'Koz",
    "Zoe", "LeBlanc", "Vex", "Hwei",
}

NO_ESCAPE_MAGES = {
    "Karthus", "Annie", "Veigar", "Brand", "Xerath", "Vel'Koz",
    "Cassiopeia", "Anivia", "Aurelion Sol", "Malzahar",
}

DIVE_ASSASSINS = {
    "Zed", "Talon", "Katarina", "Akali", "Qiyana", "Kha'Zix",
    "Rengar", "Evelynn", "Naafiri", "Kayn",
}


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

    Only emits rules when a real threat exists (no noise).
    """
    rules: list[dict] = []
    ep = analysis["enemy_profile"]
    all_picks = ally_picks + enemy_picks

    # Rule 1 — enemy has heavy dive → avoid immobile ADCs
    if role == "Bot" and ep["dive"] >= 3:
        divers = [p for p in enemy_picks if get_traits(p).get("dive", 0) >= 1]
        targets = _filter_existing(all_picks, IMMOBILE_ADCS)
        if targets:
            rules.append({
                "category": "Immobile ADCs",
                "champions": targets[:5],
                "reason": (
                    f"Enemy has {ep['dive']} dive-score from {', '.join(divers[:3])}. "
                    "Immobile carries get jumped on and bursted before they can output damage."
                ),
            })

    # Rule 2 — enemy CC chain → avoid squishy no-escape mages & melee carries
    if ep["hard_cc"] >= 6:
        cc_sources = [p for p in enemy_picks if get_traits(p).get("hard_cc", 0) >= 2]
        targets = _filter_existing(all_picks, NO_ESCAPE_MAGES | MELEE_CARRIES)
        if targets:
            rules.append({
                "category": "Low-mobility squishies",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks {ep['hard_cc']} hard-CC across {', '.join(cc_sources[:3])}. "
                    "Champions without dashes/blinks get chain-CC'd and deleted in fights."
                ),
            })

    # Rule 3 — enemy heavy poke → avoid melee bruisers/carries with no engage
    if ep["poke"] >= 4 and analysis["ally_profile"]["engage"] <= 1:
        pokers = [p for p in enemy_picks if get_traits(p).get("poke", 0) >= 2]
        targets = _filter_existing(all_picks, LOW_RANGE_BRUISERS | MELEE_CARRIES)
        if targets:
            rules.append({
                "category": "Low-range / melee with no engage support",
                "champions": targets[:5],
                "reason": (
                    f"Enemy pokes hard ({ep['poke']} score from {', '.join(pokers[:3])}) "
                    "and your team has no engage. Melee picks will be poked out before fights start."
                ),
            })

    # Rule 4 — enemy heavy disengage/peel → avoid all-in melee carries
    if ep["disengage"] + ep["peel"] >= 4 and role in ("Bot", "Mid", "Top"):
        targets = _filter_existing(all_picks, MELEE_CARRIES)
        if targets:
            rules.append({
                "category": "All-in melee carries",
                "champions": targets[:5],
                "reason": (
                    f"Enemy has strong peel + disengage (score {ep['disengage'] + ep['peel']}). "
                    "All-in melee threats get kited and never reach the backline."
                ),
            })

    # Rule 5 — enemy has strong frontline/tank stacking → avoid pure burst assassins
    if ep["frontline"] >= 5 and role in ("Mid", "Jungle"):
        targets = _filter_existing(all_picks, DIVE_ASSASSINS)
        if targets:
            rules.append({
                "category": "Pure-burst assassins",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks frontline (score {ep['frontline']}). "
                    "Assassins struggle to find squishy targets and become useless past 20 min."
                ),
            })

    # Rule 6 — enemy has multiple melee dive/pick threats → avoid fragile AP carries
    enemy_ap_threats = sum(
        1 for p in enemy_picks
        if get_traits(p).get("dive", 0) + get_traits(p).get("pick", 0) >= 2
        and get_traits(p).get("ranged", 0) == 0
    )
    if enemy_ap_threats >= 2:
        threat_names = [
            p.split("(")[0].strip() for p in enemy_picks
            if get_traits(p).get("dive", 0) + get_traits(p).get("pick", 0) >= 2
            and get_traits(p).get("ranged", 0) == 0
        ]
        targets = _filter_existing(all_picks, SQUISHY_BURST_MAGES | NO_ESCAPE_MAGES)
        if targets:
            rules.append({
                "category": "Fragile AP carries vs melee dive",
                "champions": targets[:5],
                "reason": (
                    f"Enemy has {enemy_ap_threats} melee dive/pick threats "
                    f"({', '.join(threat_names[:3])}). "
                    "Immobile AP carries with no escape will be one-shot before they can cast."
                ),
            })

    # Rule 7 — enemy has armor-stacking tanks (Rammus, Malphite, Tahm) → flag pure AD
    armor_stackers = {"Rammus", "Malphite", "Tahm Kench", "K'Sante", "Ornn", "Maokai"}
    enemy_armor = [p for p in enemy_picks if p.split("(")[0].strip() in armor_stackers]
    if len(enemy_armor) >= 2:
        # Identify pure AD scalers we'd want to avoid doubling-down on
        pure_ad = {"Tryndamere", "Master Yi", "Vayne", "Yasuo", "Yone",
                   "Aatrox", "Olaf", "Garen", "Nasus"}
        targets = _filter_existing(all_picks, pure_ad)
        if targets:
            rules.append({
                "category": "Pure-AD scalers vs armor stack",
                "champions": targets[:5],
                "reason": (
                    f"Enemy stacks armor ({', '.join(enemy_armor)}). "
                    "Pure-AD scalers get hard-countered by one Thornmail. Diversify damage."
                ),
            })

    # Rule 8 — enemy has MR-stacking mages/tanks → flag pure AP scalers
    mr_stackers = {"Galio", "Kassadin", "Sion", "Sett", "Maokai"}
    enemy_mr = [p for p in enemy_picks if p.split("(")[0].strip() in mr_stackers]
    if len(enemy_mr) >= 2:
        pure_ap = {"Veigar", "Karthus", "Vladimir", "Cassiopeia", "Kassadin",
                   "Aurelion Sol", "Ryze"}
        targets = _filter_existing(all_picks, pure_ap)
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
