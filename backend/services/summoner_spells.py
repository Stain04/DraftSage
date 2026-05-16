"""
Deterministic summoner spell recommendations for DraftSage.

LLMs cannot be trusted with this — they regularly recommend Smite on ADCs
and Ignite on champions that need Heal. The rules are simple and well-defined:

  - Jungle ALWAYS takes Smite (+ Flash usually, Ghost rarely).
  - Top usually Flash + Teleport (TP for map presence + lane recovery).
  - Mid Flash + Ignite (kill pressure) or Flash + Teleport (roamers).
  - Bot (ADC) Flash + Heal (default), Flash + Cleanse (vs heavy CC),
    Flash + Barrier (vs heavy burst).
  - Support Flash + Ignite (engage / kill pressure) or Flash + Exhaust
    (peel vs dive / assassins).

This module owns those rules so the LLM can never get them wrong.
"""

from .composition_analyzer import get_traits

# Champion-specific overrides where the standard role default is wrong.
# Most champions take the role default; this map is the exception list.
CHAMPION_SPELL_OVERRIDES: dict[str, list[str]] = {
    # ── Top — TP-only champions (split-pushers / scaling) ────────────
    "Nasus":      ["Flash", "Teleport"],
    "Teemo":      ["Flash", "Teleport"],
    "Singed":     ["Flash", "Teleport"],
    "Tryndamere": ["Flash", "Teleport"],
    "Fiora":      ["Flash", "Teleport"],
    "Yorick":     ["Flash", "Teleport"],
    "Camille":    ["Flash", "Teleport"],

    # ── Top — lane bullies that prefer Ignite ────────────────────────
    "Darius":     ["Flash", "Ignite"],
    "Garen":      ["Flash", "Ignite"],
    "Renekton":   ["Flash", "Ignite"],
    "Illaoi":     ["Flash", "Ignite"],
    "Pantheon":   ["Flash", "Teleport"],
    "Sett":       ["Flash", "Ignite"],

    # ── Mid — roamers / shovers that take TP ─────────────────────────
    "Twisted Fate": ["Flash", "Teleport"],
    "Galio":        ["Flash", "Teleport"],
    "Ryze":         ["Flash", "Teleport"],
    "Pantheon":     ["Flash", "Teleport"],

    # ── Mid — assassins always Ignite ────────────────────────────────
    "Zed":      ["Flash", "Ignite"],
    "Talon":    ["Flash", "Ignite"],
    "Katarina": ["Flash", "Ignite"],
    "Akali":    ["Flash", "Ignite"],
    "LeBlanc":  ["Flash", "Ignite"],
    "Fizz":     ["Flash", "Ignite"],
    "Qiyana":   ["Flash", "Ignite"],

    # ── Support overrides ────────────────────────────────────────────
    "Tahm Kench": ["Flash", "Ignite"],
    "Bard":       ["Flash", "Ignite"],
    "Pyke":       ["Flash", "Ignite"],
    "Senna":      ["Flash", "Ignite"],  # as a support — but if used as ADC, role override handles it
    "Soraka":     ["Flash", "Ignite"],  # actually Heal more often, but Ignite for aggressive lanes
}

# Spells that should NEVER appear for a given role (sanity guard).
ROLE_FORBIDDEN_SPELLS: dict[str, set[str]] = {
    "Top":     {"Smite"},
    "Mid":     {"Smite"},
    "Bot":     {"Smite", "Teleport"},
    "Support": {"Smite", "Teleport", "Heal"},   # ADC takes Heal, not the support
}


def _enemy_threat_signals(enemy_picks: list[str]) -> dict[str, int]:
    """
    Aggregate enemy threat signals relevant to spell choice.
    Returns scores for hard_cc, dive, and pick — used to swap ADC/support spells.
    """
    cc   = 0
    dive = 0
    pick = 0
    for p in enemy_picks:
        t = get_traits(p)
        cc   += t.get("hard_cc", 0)
        dive += t.get("dive",    0)
        pick += t.get("pick",    0)
    return {"hard_cc": cc, "dive": dive, "pick": pick}


def _normalize_role(role: str) -> str:
    return (role or "").strip().capitalize()


def _strip_role_suffix(name: str) -> str:
    if "(" in name:
        return name[:name.index("(")].strip()
    return name.strip()


def get_summoner_spells(
    champion: str,
    role: str,
    enemy_picks: list[str] | None = None,
) -> list[str]:
    """
    Return the deterministic best summoner-spell pair for this champion
    in this role given the enemy comp.

    Order: [Flash, secondary]. Flash is non-negotiable in standard SR.
    """
    champ = _strip_role_suffix(champion)
    role  = _normalize_role(role)
    enemy_picks = enemy_picks or []

    threats = _enemy_threat_signals(enemy_picks)

    # 1) Hard role rules
    if role == "Jungle":
        return ["Flash", "Smite"]

    # 2) Champion-specific override (within forbidden-set guardrail below)
    override = CHAMPION_SPELL_OVERRIDES.get(champ)
    if override:
        # Validate against role forbidden set — if the override conflicts with
        # the role (e.g. someone wrote "Smite" for a top-laner), fall through.
        forbidden = ROLE_FORBIDDEN_SPELLS.get(role, set())
        if not any(s in forbidden for s in override):
            return override

    # 3) Role-default with threat-aware swaps
    if role == "Top":
        return ["Flash", "Teleport"]

    if role == "Mid":
        # Mages with no escape want Flash + Teleport (Ryze, Vladimir style)
        traits = get_traits(champ)
        if traits.get("scaling", 0) >= 2 and traits.get("mobile", 0) == 0:
            return ["Flash", "Teleport"]
        # Default mid is Flash + Ignite for kill pressure
        return ["Flash", "Ignite"]

    if role == "Bot":
        # ADC spell logic — Heal default, Cleanse vs heavy CC, Barrier vs heavy burst/dive
        if threats["hard_cc"] >= 6:
            return ["Flash", "Cleanse"]
        if threats["dive"] >= 3:
            return ["Flash", "Barrier"]
        return ["Flash", "Heal"]

    if role == "Support":
        # Engage / dive enemy → Exhaust to peel; otherwise Ignite for kill pressure
        if threats["dive"] >= 3 or threats["pick"] >= 4:
            return ["Flash", "Exhaust"]
        return ["Flash", "Ignite"]

    # Fallback
    return ["Flash", "Ignite"]


def sanitize_spells(spells: list[str] | None, role: str) -> list[str] | None:
    """
    Return None if the supplied spells violate role rules (so caller can
    replace with the deterministic recommendation).
    """
    if not isinstance(spells, list) or len(spells) < 2:
        return None
    role = _normalize_role(role)
    forbidden = ROLE_FORBIDDEN_SPELLS.get(role, set())
    if any(s in forbidden for s in spells):
        return None
    if "Flash" not in spells:
        return None   # Flash is mandatory in standard SR
    return spells
