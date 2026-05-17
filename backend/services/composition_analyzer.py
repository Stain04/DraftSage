"""
Composition Analyzer for DraftSage.

Scores teams across 12 gameplay axes, identifies gaps in ally comp,
detects enemy archetype, and produces structured intelligence that
gets fed into the AI prompt. All deterministic Python — no LLM guesswork.

Axes:
    engage      — can start fights / hard initiate
    hard_cc     — reliable 1s+ disable (stun/knockup/root/suppression)
    frontline   — natural tank, soaks damage in fights
    peel        — protects ally backline from divers
    poke        — long-range chip damage / siege
    waveclear   — clears waves efficiently
    sustain     — keeps teammates alive in fights (heal/shield)
    disengage   — breaks enemy engages / creates space
    pick        — isolates and bursts single targets
    splitpush   — wins 1v1, threatens sidelanes
    dive        — gap-closer assassin/diver into backline
    scaling     — meaningful late-game power spike (15+ min)

Scores: 0 = none, 1 = some, 2 = strong source.
Unknown champions contribute 0 across the board (silent fallback).
"""

# ── Champion Trait Database ───────────────────────────────────────────────────
# Hand-curated. Values reflect high-elo competitive understanding of each kit.

T: dict[str, dict[str, int]] = {
    # ── Top laners ───────────────────────────────────────────────────────────
    "Aatrox":      {"frontline": 2, "hard_cc": 1, "dive": 1, "sustain": 1, "splitpush": 1},
    "Ambessa":     {"dive": 2, "splitpush": 1, "frontline": 1, "engage": 1},
    "Camille":     {"engage": 2, "hard_cc": 1, "dive": 2, "splitpush": 2, "pick": 1},
    "Cho'Gath":    {"frontline": 2, "hard_cc": 2, "sustain": 1, "waveclear": 1, "engage": 1, "scaling": 1},
    "Darius":      {"frontline": 2, "sustain": 1, "splitpush": 1, "hard_cc": 1},
    "Dr. Mundo":   {"frontline": 2, "sustain": 2, "scaling": 1},
    "Fiora":       {"splitpush": 2, "sustain": 1, "scaling": 1},
    "Gangplank":   {"poke": 1, "waveclear": 2, "splitpush": 2, "scaling": 2},
    "Garen":       {"frontline": 2, "splitpush": 1, "engage": 1},
    "Gnar":        {"poke": 1, "frontline": 1, "hard_cc": 2, "engage": 1},
    "Gragas":      {"engage": 2, "hard_cc": 2, "frontline": 1, "disengage": 1, "waveclear": 1},
    "Illaoi":      {"frontline": 2, "splitpush": 1, "sustain": 1, "hard_cc": 1},
    "Irelia":      {"dive": 1, "splitpush": 2, "engage": 1, "sustain": 1},
    "Jax":         {"splitpush": 2, "scaling": 2, "dive": 1, "hard_cc": 1},
    "Jayce":       {"poke": 2, "waveclear": 1, "splitpush": 1},
    "K'Sante":     {"frontline": 2, "hard_cc": 2, "engage": 1, "peel": 1, "scaling": 1},
    "Kayle":       {"scaling": 2, "waveclear": 1, "peel": 1, "sustain": 1},
    "Kennen":      {"engage": 2, "hard_cc": 2, "poke": 1, "waveclear": 1},
    "Kled":        {"engage": 2, "frontline": 1, "splitpush": 1},
    "Malphite":    {"engage": 2, "hard_cc": 2, "frontline": 2, "poke": 1},
    "Maokai":      {"engage": 1, "hard_cc": 2, "frontline": 2, "sustain": 1, "peel": 1},
    "Mordekaiser": {"frontline": 1, "sustain": 1, "splitpush": 1, "pick": 1, "scaling": 1},
    "Nasus":       {"frontline": 1, "splitpush": 2, "scaling": 2, "hard_cc": 1, "sustain": 1},
    "Olaf":        {"frontline": 1, "dive": 1, "sustain": 1, "splitpush": 1},
    "Ornn":        {"frontline": 2, "hard_cc": 2, "engage": 2, "scaling": 2},
    "Pantheon":    {"engage": 1, "hard_cc": 1, "dive": 1, "poke": 1},
    "Quinn":       {"splitpush": 2, "pick": 1, "poke": 1, "ranged": 2},
    "Renekton":    {"engage": 1, "frontline": 1, "hard_cc": 1, "sustain": 1, "early_game": 2 if False else 1, "splitpush": 1},
    "Rengar":      {"dive": 2, "pick": 2, "splitpush": 1},
    "Riven":       {"splitpush": 1, "dive": 1, "engage": 1, "hard_cc": 1},
    "Rumble":      {"poke": 1, "waveclear": 2, "engage": 1, "frontline": 1},
    "Sett":        {"engage": 2, "frontline": 2, "peel": 1, "hard_cc": 1, "sustain": 1},
    "Shen":        {"engage": 1, "hard_cc": 1, "frontline": 2, "peel": 2, "splitpush": 1},
    "Singed":      {"frontline": 1, "splitpush": 2, "hard_cc": 1, "sustain": 1},
    "Sion":        {"engage": 2, "hard_cc": 2, "frontline": 2, "waveclear": 1, "splitpush": 1},
    "Tahm Kench":  {"frontline": 2, "peel": 2, "engage": 1, "hard_cc": 1, "sustain": 1},
    "Teemo":       {"poke": 2, "splitpush": 2, "waveclear": 1},
    "Tryndamere":  {"splitpush": 2, "sustain": 1, "scaling": 1, "dive": 1},
    "Udyr":        {"frontline": 1, "dive": 1, "splitpush": 1, "sustain": 1},
    "Urgot":       {"frontline": 1, "hard_cc": 1, "splitpush": 1, "pick": 1},
    "Volibear":    {"engage": 1, "frontline": 1, "dive": 1, "sustain": 1, "hard_cc": 1},
    "Warwick":     {"frontline": 1, "dive": 1, "sustain": 2, "hard_cc": 1},
    "Yorick":      {"splitpush": 2, "frontline": 1, "scaling": 1},
    "Gwen":        {"frontline": 1, "sustain": 2, "splitpush": 1, "scaling": 1, "dive": 1},
    "Heimerdinger": {"poke": 2, "waveclear": 2, "hard_cc": 1},

    # ── Jungle ───────────────────────────────────────────────────────────────
    "Amumu":       {"engage": 2, "hard_cc": 2, "frontline": 1},
    "Bel'Veth":    {"dive": 1, "frontline": 1, "scaling": 2, "sustain": 1},
    "Briar":       {"dive": 2, "sustain": 1, "frontline": 1},
    "Diana":       {"engage": 2, "hard_cc": 1, "dive": 1, "sustain": 1, "waveclear": 1},
    "Ekko":        {"pick": 1, "dive": 1, "sustain": 1, "disengage": 1, "scaling": 1},
    "Elise":       {"pick": 2, "dive": 1, "engage": 1},
    "Evelynn":     {"pick": 2, "dive": 2, "scaling": 1},
    "Fiddlesticks":{"engage": 2, "hard_cc": 2, "sustain": 1, "waveclear": 1, "scaling": 1},
    "Graves":      {"poke": 1, "dive": 1, "splitpush": 1, "scaling": 1, "ranged": 1},
    "Hecarim":     {"engage": 2, "dive": 2, "frontline": 1, "splitpush": 1, "scaling": 1},
    "Ivern":       {"peel": 2, "sustain": 2, "disengage": 1, "hard_cc": 1},
    "Jarvan IV":   {"engage": 2, "hard_cc": 2, "frontline": 1, "peel": 1},
    "Karthus":     {"scaling": 2, "poke": 1, "waveclear": 2, "pick": 1},
    "Kayn":        {"dive": 2, "splitpush": 1, "pick": 1, "frontline": 1},
    "Kha'Zix":     {"dive": 1, "pick": 2, "scaling": 1},
    "Kindred":     {"poke": 1, "scaling": 1, "ranged": 2, "peel": 1},
    "Lee Sin":     {"engage": 1, "pick": 1, "dive": 1, "peel": 1},
    "Lillia":      {"engage": 1, "hard_cc": 2, "poke": 1, "waveclear": 1, "scaling": 1},
    "Master Yi":   {"dive": 2, "splitpush": 1, "scaling": 2},
    "Nidalee":     {"poke": 2, "pick": 1, "splitpush": 1},
    "Nocturne":    {"engage": 2, "dive": 2, "pick": 1},
    "Nunu & Willump":{"engage": 1, "hard_cc": 1, "frontline": 1, "peel": 1},
    "Nunu":        {"engage": 1, "hard_cc": 1, "frontline": 1, "peel": 1},
    "Poppy":       {"engage": 1, "hard_cc": 2, "frontline": 2, "peel": 2, "disengage": 1},
    "Rammus":      {"engage": 2, "hard_cc": 2, "frontline": 2},
    "Rek'Sai":     {"engage": 2, "frontline": 1, "dive": 1},
    "Sejuani":     {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 1},
    "Shaco":       {"pick": 2, "splitpush": 1, "dive": 1},
    "Shyvana":     {"dive": 1, "frontline": 1, "splitpush": 1, "scaling": 2, "waveclear": 1},
    "Skarner":     {"engage": 2, "hard_cc": 2, "frontline": 1, "pick": 1},
    "Trundle":     {"dive": 1, "splitpush": 1, "sustain": 1, "frontline": 1},
    "Vi":          {"engage": 2, "hard_cc": 2, "dive": 2, "pick": 1},
    "Viego":       {"dive": 1, "splitpush": 1, "sustain": 1},
    "Xin Zhao":    {"engage": 2, "dive": 1, "frontline": 1, "peel": 1, "hard_cc": 1},
    "Zac":         {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 1, "sustain": 1},
    "Wukong":      {"engage": 2, "hard_cc": 1, "frontline": 1, "dive": 1},

    # ── Mid ──────────────────────────────────────────────────────────────────
    "Ahri":        {"pick": 2, "poke": 1, "scaling": 1, "ranged": 2, "waveclear": 1},
    "Akali":       {"dive": 2, "pick": 1, "splitpush": 1},
    "Anivia":      {"hard_cc": 2, "waveclear": 2, "disengage": 2, "poke": 1, "scaling": 2, "ranged": 2},
    "Annie":       {"engage": 1, "hard_cc": 2, "poke": 1, "waveclear": 1, "ranged": 2},
    "Aurelion Sol":{"scaling": 2, "waveclear": 2, "poke": 1, "ranged": 2, "hard_cc": 1},
    "Azir":        {"poke": 1, "waveclear": 1, "disengage": 1, "scaling": 2, "ranged": 2, "engage": 1},
    "Cassiopeia":  {"sustain": 1, "scaling": 2, "waveclear": 1, "hard_cc": 1, "ranged": 2},
    "Corki":       {"poke": 2, "waveclear": 1, "scaling": 1, "ranged": 2},
    "Galio":       {"engage": 2, "hard_cc": 2, "frontline": 1, "peel": 1, "disengage": 1},
    "Hwei":        {"poke": 2, "hard_cc": 1, "waveclear": 1, "disengage": 1, "ranged": 2},
    "Fizz":        {"dive": 2, "pick": 1, "sustain": 1},
    "Kassadin":    {"scaling": 2, "disengage": 1, "dive": 1},
    "Katarina":    {"dive": 2, "pick": 1, "splitpush": 1, "scaling": 1},
    "LeBlanc":     {"pick": 2, "dive": 1},
    "Lissandra":   {"engage": 2, "hard_cc": 2, "disengage": 1, "waveclear": 1, "ranged": 1},
    "Malzahar":    {"hard_cc": 2, "pick": 1, "waveclear": 2, "ranged": 2, "scaling": 1},
    "Naafiri":     {"dive": 2, "pick": 1, "splitpush": 1},
    "Neeko":       {"engage": 1, "hard_cc": 2, "waveclear": 1, "ranged": 1, "poke": 1},
    "Orianna":     {"engage": 1, "hard_cc": 2, "peel": 1, "waveclear": 1, "scaling": 2, "ranged": 2},
    "Qiyana":      {"pick": 2, "engage": 1, "dive": 1, "hard_cc": 1},
    "Ryze":        {"scaling": 2, "waveclear": 2, "splitpush": 1},
    "Sylas":       {"dive": 2, "sustain": 1, "pick": 1, "splitpush": 1},
    "Syndra":      {"poke": 1, "pick": 2, "hard_cc": 1, "ranged": 2, "scaling": 2},
    "Taliyah":     {"engage": 1, "hard_cc": 1, "poke": 1, "waveclear": 2, "disengage": 1, "ranged": 2},
    "Talon":       {"pick": 2, "dive": 1, "splitpush": 1},
    "Twisted Fate":{"pick": 2, "engage": 1, "waveclear": 1, "ranged": 2, "scaling": 1},
    "Veigar":      {"hard_cc": 1, "poke": 1, "scaling": 2, "waveclear": 1, "ranged": 2},
    "Vex":         {"poke": 1, "pick": 1, "disengage": 1, "ranged": 2},
    "Viktor":      {"poke": 1, "waveclear": 2, "hard_cc": 1, "scaling": 2, "ranged": 2},
    "Vladimir":    {"sustain": 2, "scaling": 2, "dive": 1, "poke": 1},
    "Yasuo":       {"dive": 1, "splitpush": 1, "scaling": 1},
    "Yone":        {"dive": 1, "splitpush": 1, "scaling": 1, "hard_cc": 1},
    "Zed":         {"dive": 2, "pick": 1, "splitpush": 1},
    "Zoe":         {"poke": 2, "pick": 1, "ranged": 2, "scaling": 1},
    "Aurora":      {"poke": 1, "disengage": 2, "scaling": 1, "pick": 1},
    "Heimerdinger": {"poke": 2, "waveclear": 2, "hard_cc": 1},

    # ── Bot (ADC) ────────────────────────────────────────────────────────────
    "Aphelios":    {"poke": 1, "scaling": 2, "ranged": 2, "waveclear": 1},
    "Ashe":        {"engage": 1, "hard_cc": 2, "poke": 1, "ranged": 2, "peel": 1, "scaling": 1},
    "Caitlyn":     {"poke": 2, "waveclear": 1, "ranged": 2, "splitpush": 1},
    "Draven":      {"early_game": 2, "ranged": 2},
    "Ezreal":      {"poke": 2, "waveclear": 1, "ranged": 2, "disengage": 1, "scaling": 1},
    "Jhin":        {"poke": 1, "pick": 1, "ranged": 2, "hard_cc": 1},
    "Jinx":        {"waveclear": 1, "scaling": 2, "ranged": 2, "poke": 1},
    "Kai'Sa":      {"dive": 1, "scaling": 2, "ranged": 2},
    "Kalista":     {"pick": 1, "engage": 1, "ranged": 2, "early_game": 1},
    "Kog'Maw":     {"scaling": 2, "ranged": 2, "poke": 1},
    "Lucian":      {"early_game": 1, "ranged": 2, "dive": 1},
    "Miss Fortune":{"poke": 2, "waveclear": 1, "ranged": 2, "engage": 1},
    "Nilah":       {"sustain": 1, "scaling": 1, "dive": 1, "peel": 1},
    "Samira":      {"dive": 2, "engage": 1, "ranged": 2, "hard_cc": 1},
    "Sivir":       {"waveclear": 2, "ranged": 2, "engage": 1, "disengage": 1, "poke": 1},
    "Tristana":    {"dive": 1, "splitpush": 1, "scaling": 1, "ranged": 2},
    "Twitch":      {"pick": 1, "dive": 1, "scaling": 2, "ranged": 2},
    "Varus":       {"poke": 2, "hard_cc": 1, "ranged": 2, "scaling": 1},
    "Vayne":       {"splitpush": 1, "dive": 1, "scaling": 2, "ranged": 2},
    "Xayah":       {"peel": 1, "disengage": 1, "scaling": 1, "ranged": 2, "hard_cc": 1},
    "Zeri":        {"poke": 1, "scaling": 2, "ranged": 2, "waveclear": 1},
    "Senna":       {"poke": 2, "scaling": 2, "ranged": 2, "peel": 1},
    "Smolder":     {"poke": 1, "scaling": 2, "ranged": 2, "waveclear": 1},

    # ── Support ──────────────────────────────────────────────────────────────
    "Alistar":     {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 2},
    "Bard":        {"pick": 2, "hard_cc": 1, "disengage": 1, "peel": 1, "engage": 1},
    "Blitzcrank":  {"pick": 2, "hard_cc": 2, "frontline": 1, "engage": 1},
    "Braum":       {"peel": 2, "frontline": 2, "hard_cc": 1, "disengage": 1, "engage": 1},
    "Brand":       {"poke": 2, "waveclear": 1, "ranged": 2, "scaling": 1},
    "Janna":       {"peel": 2, "disengage": 2, "sustain": 1, "ranged": 1},
    "Karma":       {"peel": 1, "poke": 1, "disengage": 1, "sustain": 1, "ranged": 2, "engage": 1},
    "Leona":       {"engage": 2, "hard_cc": 2, "frontline": 2},
    "Lulu":        {"peel": 2, "disengage": 1, "sustain": 1, "ranged": 1, "hard_cc": 1},
    "Lux":         {"poke": 2, "hard_cc": 2, "waveclear": 1, "ranged": 2, "pick": 1},
    "Milio":       {"peel": 2, "sustain": 2, "disengage": 1, "ranged": 1},
    "Morgana":     {"peel": 2, "hard_cc": 2, "waveclear": 1, "ranged": 1},
    "Nami":        {"peel": 1, "hard_cc": 1, "sustain": 2, "engage": 1, "ranged": 1},
    "Nautilus":    {"engage": 2, "hard_cc": 2, "frontline": 2, "pick": 1},
    "Pyke":        {"pick": 2, "engage": 1, "hard_cc": 1},
    "Rakan":       {"engage": 2, "hard_cc": 2, "peel": 1, "disengage": 1},
    "Rell":        {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 1},
    "Renata Glasc":{"peel": 2, "disengage": 1, "sustain": 1, "hard_cc": 1, "ranged": 1},
    "Senna":       {"poke": 2, "scaling": 2, "ranged": 2, "peel": 1},
    "Seraphine":   {"peel": 1, "poke": 1, "sustain": 1, "hard_cc": 1, "ranged": 2},
    "Sona":        {"peel": 1, "sustain": 2, "poke": 1, "ranged": 2, "hard_cc": 1},
    "Soraka":      {"peel": 1, "sustain": 2, "ranged": 1},
    "Swain":       {"engage": 1, "hard_cc": 2, "sustain": 1, "frontline": 1, "ranged": 1},
    "Tahm Kench":  {"peel": 2, "frontline": 2, "engage": 1, "hard_cc": 1, "sustain": 1},
    "Taric":       {"peel": 2, "frontline": 1, "hard_cc": 1, "sustain": 1, "engage": 1},
    "Thresh":      {"engage": 2, "hard_cc": 2, "frontline": 1, "peel": 2, "pick": 1},
    "Vel'Koz":     {"poke": 2, "ranged": 2, "waveclear": 1, "hard_cc": 1},
    "Xerath":      {"poke": 2, "ranged": 2, "waveclear": 1, "hard_cc": 1, "pick": 1},
    "Yuumi":       {"peel": 1, "sustain": 2, "scaling": 1},
    "Zilean":      {"peel": 2, "sustain": 1, "hard_cc": 1, "ranged": 1, "scaling": 1},
    "Zyra":        {"poke": 2, "waveclear": 1, "ranged": 2, "hard_cc": 1, "peel": 1},
}

AXES = [
    "engage", "hard_cc", "frontline", "peel", "poke", "waveclear",
    "sustain", "disengage", "pick", "splitpush", "dive", "scaling",
]

# Threshold rules — how much of an axis a 5-man team should have
GAP_RULES = [
    ("engage",     2, "Engage / hard initiation"),
    ("hard_cc",    4, "Hard CC"),
    ("frontline",  3, "Frontline / tankiness"),
    ("waveclear",  2, "Waveclear"),
    ("peel",       2, "Peel for the backline"),
]


def _normalize(name: str) -> str:
    """Strip role suffix, normalize case-insensitive lookup."""
    n = name.strip()
    if "(" in n:
        n = n[:n.index("(")].strip()
    return n


def get_traits(name: str) -> dict[str, int]:
    """Get the trait scores for a single champion. Unknowns return empty."""
    norm = _normalize(name)
    # Case-insensitive lookup
    for champ, traits in T.items():
        if champ.lower() == norm.lower():
            return traits
    return {}


def team_profile(picks: list[str]) -> dict[str, int]:
    """Sum each trait across all picks. Returns a dict for every axis."""
    profile = {axis: 0 for axis in AXES}
    for pick in picks:
        traits = get_traits(pick)
        for axis, score in traits.items():
            if axis in profile:
                profile[axis] += score
    return profile


def identify_gaps(ally_profile: dict, ally_picks: list[str]) -> list[dict]:
    """
    Return ordered list of gap dicts: [{name, severity, why}].
    Severity: 'critical' = total miss, 'soft' = below threshold.

    Special peel rule: only flag peel if the team has a hypercarry/squishy
    that NEEDS peel.
    """
    gaps: list[dict] = []
    n = len(ally_picks)

    # Scale threshold by team size — 5-man rules above are full-team targets
    scale = max(1, n) / 5.0

    has_hypercarry = any(
        get_traits(p).get("scaling", 0) >= 2 and get_traits(p).get("ranged", 0) >= 2
        for p in ally_picks
    )

    for axis, target, label in GAP_RULES:
        if axis == "peel" and not has_hypercarry:
            continue
        scaled_target = target * scale
        score = ally_profile.get(axis, 0)
        if score == 0:
            gaps.append({
                "name": label,
                "axis": axis,
                "severity": "critical",
                "score": score,
                "target": target,
                "why": f"Your team has zero {label.lower()} — enemy can exploit this freely.",
            })
        elif score < scaled_target:
            gaps.append({
                "name": label,
                "axis": axis,
                "severity": "soft",
                "score": score,
                "target": target,
                "why": f"Your team is light on {label.lower()} ({score} vs target {target}).",
            })

    # Order: critical first, then soft
    gaps.sort(key=lambda g: (0 if g["severity"] == "critical" else 1, g["axis"]))
    return gaps


def detect_archetype(profile: dict, picks: list[str]) -> str:
    """
    Detect dominant comp archetype from a team profile.
    Returns one of: engage, poke, pick, splitpush, teamfight, dive, scaling, protect, balanced.
    """
    n = max(1, len(picks))

    # Hard signals first
    if profile["dive"] >= 3 and profile["engage"] >= 2:
        return "dive"
    if profile["splitpush"] >= 3:
        return "splitpush"
    if profile["pick"] >= 3:
        return "pick"
    if profile["poke"] >= 4:
        return "poke"
    if profile["engage"] >= 4 and profile["frontline"] >= 2:
        return "engage"
    if profile["scaling"] >= 5:
        return "scaling"

    # Protect-the-carry: hypercarry + 2+ peel sources
    has_hypercarry = any(
        get_traits(p).get("scaling", 0) >= 2 and get_traits(p).get("ranged", 0) >= 2
        for p in picks
    )
    if has_hypercarry and profile["peel"] >= 4:
        return "protect"

    if profile["frontline"] + profile["hard_cc"] >= 5 and n >= 4:
        return "teamfight"

    return "balanced"


def detect_enemy_threats(enemy_profile: dict, enemy_picks: list[str]) -> list[dict]:
    """
    Identify the top 3 specific threats the enemy comp poses, with reasons.
    Each: {threat, severity, why}.
    """
    threats: list[dict] = []
    n = max(1, len(enemy_picks))

    if enemy_profile["dive"] >= 3:
        divers = [p for p in enemy_picks if get_traits(p).get("dive", 0) >= 1]
        threats.append({
            "threat": "Heavy dive",
            "severity": "high",
            "why": f"Enemy has {enemy_profile['dive']} dive-score from {', '.join(divers[:3])}. Your backline will be jumped on first contact.",
        })

    if enemy_profile["hard_cc"] >= 6:
        cc_sources = [p for p in enemy_picks if get_traits(p).get("hard_cc", 0) >= 2]
        threats.append({
            "threat": "CC chain",
            "severity": "high",
            "why": f"Enemy stacks {enemy_profile['hard_cc']} hard-CC across {', '.join(cc_sources[:3])}. Immobile carries will be locked down.",
        })

    if enemy_profile["poke"] >= 4:
        pokers = [p for p in enemy_picks if get_traits(p).get("poke", 0) >= 2]
        threats.append({
            "threat": "Poke / siege",
            "severity": "medium",
            "why": f"Enemy can poke you off objectives with {', '.join(pokers[:3])}. You need engage or sustain to contest.",
        })

    if enemy_profile["pick"] >= 4:
        pickers = [p for p in enemy_picks if get_traits(p).get("pick", 0) >= 2]
        threats.append({
            "threat": "Pick potential",
            "severity": "medium",
            "why": f"Enemy picks off isolated targets with {', '.join(pickers[:3])}. Group up and ward deep.",
        })

    if enemy_profile["scaling"] >= 5:
        threats.append({
            "threat": "Late-game scaling",
            "severity": "medium",
            "why": f"Enemy scales hard (score {enemy_profile['scaling']}). You must close the game before 30 min or contest objectives early.",
        })

    if enemy_profile["splitpush"] >= 3 and enemy_profile["frontline"] >= 2:
        threats.append({
            "threat": "1-3-1 splitpush pressure",
            "severity": "medium",
            "why": f"Enemy can create map pressure with splitpushers + frontline. Match in sidelane or take fast objectives.",
        })

    if enemy_profile["engage"] >= 4 and enemy_profile["disengage"] <= 1:
        threats.append({
            "threat": "Forced engage",
            "severity": "medium",
            "why": f"Enemy will force fights on their terms (engage {enemy_profile['engage']}). You need disengage or zone control.",
        })

    # Order high severity first, cap at 4
    threats.sort(key=lambda t: 0 if t["severity"] == "high" else 1)
    return threats[:4]


def analyze_comp(ally_picks: list[str], enemy_picks: list[str], role: str) -> dict:
    """
    One-shot deep analysis. Returns:
        {
            ally_profile, enemy_profile,
            ally_archetype, enemy_archetype,
            ally_gaps: [...],
            enemy_threats: [...],
            requirements: [axis_names_to_fill],
        }
    """
    ally_p  = team_profile(ally_picks)
    enemy_p = team_profile(enemy_picks)

    gaps    = identify_gaps(ally_p, ally_picks)
    threats = detect_enemy_threats(enemy_p, enemy_picks)

    ally_arche  = detect_archetype(ally_p,  ally_picks)
    enemy_arche = detect_archetype(enemy_p, enemy_picks)

    # Requirements: top 2 critical gaps → axes the next pick should bring
    requirements = [g["axis"] for g in gaps if g["severity"] == "critical"][:2]
    if not requirements:
        requirements = [g["axis"] for g in gaps[:1]]

    return {
        "ally_profile":   ally_p,
        "enemy_profile":  enemy_p,
        "ally_archetype": ally_arche,
        "enemy_archetype": enemy_arche,
        "ally_gaps":      gaps,
        "enemy_threats":  threats,
        "requirements":   requirements,
    }


def build_intelligence_block(analysis: dict, dmg: dict, role: str) -> str:
    """
    Format the structured analysis into a prompt-ready text block.
    The AI receives this as part of the user message.
    """
    lines: list[str] = []
    lines.append("\n" + "=" * 60)
    lines.append("🧠 TEAM COMPOSITION INTELLIGENCE")
    lines.append("=" * 60)

    # Ally profile summary
    ap = analysis["ally_profile"]
    lines.append(f"\nALLY ARCHETYPE: {analysis['ally_archetype'].upper()}")
    lines.append(
        f"  Scores → engage:{ap['engage']} cc:{ap['hard_cc']} front:{ap['frontline']} "
        f"peel:{ap['peel']} poke:{ap['poke']} waveclear:{ap['waveclear']} "
        f"dive:{ap['dive']} pick:{ap['pick']} splitpush:{ap['splitpush']} scaling:{ap['scaling']}"
    )

    # Gaps
    if analysis["ally_gaps"]:
        lines.append("\n🚨 GAPS IN ALLY COMP (priority order):")
        for g in analysis["ally_gaps"]:
            tag = "❌ CRITICAL" if g["severity"] == "critical" else "⚠ Soft"
            lines.append(f"  {tag} — {g['name']}: {g['why']}")
        lines.append(
            "  → The next pick MUST address the top critical gap if possible. "
            "If it cannot, justify why explicitly."
        )
    else:
        lines.append("\n✅ Ally comp has no critical gaps so far.")

    # Enemy profile
    ep = analysis["enemy_profile"]
    lines.append(f"\nENEMY ARCHETYPE: {analysis['enemy_archetype'].upper()}")
    lines.append(
        f"  Scores → engage:{ep['engage']} cc:{ep['hard_cc']} front:{ep['frontline']} "
        f"peel:{ep['peel']} poke:{ep['poke']} dive:{ep['dive']} pick:{ep['pick']} "
        f"scaling:{ep['scaling']}"
    )

    # Threats
    if analysis["enemy_threats"]:
        lines.append("\n⚔ ENEMY THREATS TO RESPECT:")
        for t in analysis["enemy_threats"]:
            sev = "🔴 HIGH" if t["severity"] == "high" else "🟡 MED"
            lines.append(f"  {sev} — {t['threat']}: {t['why']}")

    # Requirements
    if analysis["requirements"]:
        lines.append(
            "\n🎯 NEXT-PICK REQUIREMENTS (this pick MUST bring at least one):"
        )
        for r in analysis["requirements"]:
            lines.append(f"   • {r.replace('_', ' ').title()}")

    lines.append("\n" + "=" * 60)
    return "\n".join(lines)
