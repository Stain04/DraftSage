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

Extra metadata fields (not axes — ignored by team_profile):
    roles       — list of viable roles, e.g. ["Top", "Jungle"]
    ap          — 1 = primarily AP/magic damage, 0 = primarily AD/physical damage
                  omitted = Mixed/hybrid damage

Scores: 0 = none, 1 = some, 2 = strong source.
Unknown champions contribute 0 across the board (silent fallback).
"""

# ── Champion Trait Database ───────────────────────────────────────────────────
# Single source of truth. Each entry has trait scores PLUS roles and ap.
# Flex picks (e.g. Irelia Top/Mid) appear ONCE with both roles listed.

T: dict[str, dict] = {
    # ── Top / Top-flex ───────────────────────────────────────────────────────
    "Aatrox":      {"frontline": 2, "hard_cc": 1, "dive": 1, "sustain": 1, "splitpush": 1,
                    "roles": ["Top"], "ap": 0},
    "Ambessa":     {"dive": 2, "splitpush": 1, "frontline": 1, "engage": 1,
                    "roles": ["Top"], "ap": 0},
    "Camille":     {"engage": 2, "hard_cc": 1, "dive": 2, "splitpush": 2, "pick": 1,
                    "roles": ["Top"], "ap": 0},
    "Cho'Gath":    {"frontline": 2, "hard_cc": 2, "sustain": 1, "waveclear": 1, "engage": 1, "scaling": 1,
                    "roles": ["Top"], "ap": 1},
    "Darius":      {"frontline": 2, "sustain": 1, "splitpush": 1, "hard_cc": 1,
                    "roles": ["Top"], "ap": 0},
    "Dr. Mundo":   {"frontline": 2, "sustain": 2, "scaling": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Fiora":       {"splitpush": 2, "sustain": 1, "scaling": 1,
                    "roles": ["Top"], "ap": 0},
    "Gangplank":   {"poke": 1, "waveclear": 2, "splitpush": 2, "scaling": 2,
                    "roles": ["Top"], "ap": 0},
    "Garen":       {"frontline": 2, "splitpush": 1, "engage": 1,
                    "roles": ["Top"], "ap": 0},
    "Gnar":        {"poke": 1, "frontline": 1, "hard_cc": 2, "engage": 1,
                    "roles": ["Top"], "ap": 0},
    "Gragas":      {"engage": 2, "hard_cc": 2, "frontline": 1, "disengage": 1, "waveclear": 1,
                    "roles": ["Top", "Jungle", "Mid"], "ap": 1},
    "Gwen":        {"frontline": 1, "sustain": 2, "splitpush": 1, "scaling": 1, "dive": 1,
                    "roles": ["Top"], "ap": 1},
    "Heimerdinger":{"poke": 2, "waveclear": 2, "hard_cc": 1,
                    "roles": ["Top", "Mid", "Support"], "ap": 1},
    "Illaoi":      {"frontline": 2, "splitpush": 1, "sustain": 1, "hard_cc": 1,
                    "roles": ["Top"], "ap": 0},
    "Irelia":      {"dive": 1, "splitpush": 2, "engage": 1, "sustain": 1,
                    "roles": ["Top", "Mid"], "ap": 0},
    "Jax":         {"splitpush": 2, "scaling": 2, "dive": 1, "hard_cc": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Jayce":       {"poke": 2, "waveclear": 1, "splitpush": 1,
                    "roles": ["Top"], "ap": 0},
    "K'Sante":     {"frontline": 2, "hard_cc": 2, "engage": 1, "peel": 1, "scaling": 1,
                    "roles": ["Top"]},
    "Kayle":       {"scaling": 2, "waveclear": 1, "peel": 1, "sustain": 1,
                    "roles": ["Top"]},
    "Kennen":      {"engage": 2, "hard_cc": 2, "poke": 1, "waveclear": 1,
                    "roles": ["Top"], "ap": 1},
    "Kled":        {"engage": 2, "frontline": 1, "splitpush": 1,
                    "roles": ["Top"], "ap": 0},
    "Malphite":    {"engage": 2, "hard_cc": 2, "frontline": 2, "poke": 1,
                    "roles": ["Top"], "ap": 1},
    "Maokai":      {"engage": 1, "hard_cc": 2, "frontline": 2, "sustain": 1, "peel": 1,
                    "roles": ["Top", "Jungle", "Support"], "ap": 1},
    "Mordekaiser": {"frontline": 1, "sustain": 1, "splitpush": 1, "pick": 1, "scaling": 1,
                    "roles": ["Top"], "ap": 1},
    "Nasus":       {"frontline": 1, "splitpush": 2, "scaling": 2, "hard_cc": 1, "sustain": 1,
                    "roles": ["Top"], "ap": 0},
    "Olaf":        {"frontline": 1, "dive": 1, "sustain": 1, "splitpush": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Ornn":        {"frontline": 2, "hard_cc": 2, "engage": 2, "scaling": 2,
                    "roles": ["Top"]},
    "Pantheon":    {"engage": 1, "hard_cc": 1, "dive": 1, "poke": 1,
                    "roles": ["Top", "Mid", "Support"], "ap": 0},
    "Quinn":       {"splitpush": 2, "pick": 1, "poke": 1, "ranged": 2,
                    "roles": ["Top"], "ap": 0},
    "Renekton":    {"engage": 1, "frontline": 1, "hard_cc": 1, "sustain": 1, "splitpush": 1,
                    "roles": ["Top"], "ap": 0},
    "Rengar":      {"dive": 2, "pick": 2, "splitpush": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Riven":       {"splitpush": 1, "dive": 1, "engage": 1, "hard_cc": 1,
                    "roles": ["Top"], "ap": 0},
    "Rumble":      {"poke": 1, "waveclear": 2, "engage": 1, "frontline": 1,
                    "roles": ["Top"], "ap": 1},
    "Sett":        {"engage": 2, "frontline": 2, "peel": 1, "hard_cc": 1, "sustain": 1,
                    "roles": ["Top", "Support"], "ap": 0},
    "Shen":        {"engage": 1, "hard_cc": 1, "frontline": 2, "peel": 2, "splitpush": 1,
                    "roles": ["Top"]},
    "Singed":      {"frontline": 1, "splitpush": 2, "hard_cc": 1, "sustain": 1,
                    "roles": ["Top"], "ap": 1},
    "Sion":        {"engage": 2, "hard_cc": 2, "frontline": 2, "waveclear": 1, "splitpush": 1,
                    "roles": ["Top"]},
    "Tahm Kench":  {"frontline": 2, "peel": 2, "engage": 1, "hard_cc": 1, "sustain": 1,
                    "roles": ["Top", "Support"]},
    "Teemo":       {"poke": 2, "splitpush": 2, "waveclear": 1,
                    "roles": ["Top"], "ap": 1},
    "Trundle":     {"dive": 1, "splitpush": 1, "sustain": 1, "frontline": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Tryndamere":  {"splitpush": 2, "sustain": 1, "scaling": 1, "dive": 1,
                    "roles": ["Top"], "ap": 0},
    "Udyr":        {"frontline": 1, "dive": 1, "splitpush": 1, "sustain": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Urgot":       {"frontline": 1, "hard_cc": 1, "splitpush": 1, "pick": 1,
                    "roles": ["Top"], "ap": 0},
    "Volibear":    {"engage": 1, "frontline": 1, "dive": 1, "sustain": 1, "hard_cc": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Warwick":     {"frontline": 1, "dive": 1, "sustain": 2, "hard_cc": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Wukong":      {"engage": 2, "hard_cc": 1, "frontline": 1, "dive": 1,
                    "roles": ["Top", "Jungle"], "ap": 0},
    "Yasuo":       {"dive": 1, "splitpush": 1, "scaling": 1,
                    "roles": ["Top", "Mid"], "ap": 0},
    "Yone":        {"dive": 1, "splitpush": 1, "scaling": 1, "hard_cc": 1,
                    "roles": ["Top", "Mid"], "ap": 0},
    "Yorick":      {"splitpush": 2, "frontline": 1, "scaling": 1,
                    "roles": ["Top"], "ap": 0},

    # ── Jungle ───────────────────────────────────────────────────────────────
    "Amumu":       {"engage": 2, "hard_cc": 2, "frontline": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Bel'Veth":    {"dive": 1, "frontline": 1, "scaling": 2, "sustain": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Briar":       {"dive": 2, "sustain": 1, "frontline": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Diana":       {"engage": 2, "hard_cc": 1, "dive": 1, "sustain": 1, "waveclear": 1,
                    "roles": ["Jungle", "Mid"], "ap": 1},
    "Ekko":        {"pick": 1, "dive": 1, "sustain": 1, "disengage": 1, "scaling": 1,
                    "roles": ["Jungle", "Mid"], "ap": 1},
    "Elise":       {"pick": 2, "dive": 1, "engage": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Evelynn":     {"pick": 2, "dive": 2, "scaling": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Fiddlesticks":{"engage": 2, "hard_cc": 2, "sustain": 1, "waveclear": 1, "scaling": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Graves":      {"poke": 1, "dive": 1, "splitpush": 1, "scaling": 1, "ranged": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Hecarim":     {"engage": 2, "dive": 2, "frontline": 1, "splitpush": 1, "scaling": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Ivern":       {"peel": 2, "sustain": 2, "disengage": 1, "hard_cc": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Jarvan IV":   {"engage": 2, "hard_cc": 2, "frontline": 1, "peel": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Karthus":     {"scaling": 2, "poke": 1, "waveclear": 2, "pick": 1,
                    "roles": ["Jungle", "Mid"], "ap": 1},
    "Kayn":        {"dive": 2, "splitpush": 1, "pick": 1, "frontline": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Kha'Zix":     {"dive": 1, "pick": 2, "scaling": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Kindred":     {"poke": 1, "scaling": 1, "ranged": 2, "peel": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Lee Sin":     {"engage": 1, "pick": 1, "dive": 1, "peel": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Lillia":      {"engage": 1, "hard_cc": 2, "poke": 1, "waveclear": 1, "scaling": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Master Yi":   {"dive": 2, "splitpush": 1, "scaling": 2,
                    "roles": ["Jungle"], "ap": 0},
    "Naafiri":     {"dive": 2, "pick": 1, "splitpush": 1,
                    "roles": ["Jungle", "Mid"], "ap": 0},
    "Nidalee":     {"poke": 2, "pick": 1, "splitpush": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Nocturne":    {"engage": 2, "dive": 2, "pick": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Nunu & Willump": {"engage": 1, "hard_cc": 1, "frontline": 1, "peel": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Poppy":       {"engage": 1, "hard_cc": 2, "frontline": 2, "peel": 2, "disengage": 1,
                    "roles": ["Jungle", "Support"], "ap": 0},
    "Rammus":      {"engage": 2, "hard_cc": 2, "frontline": 2,
                    "roles": ["Jungle"]},
    "Rek'Sai":     {"engage": 2, "frontline": 1, "dive": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Sejuani":     {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 1,
                    "roles": ["Jungle"]},
    "Shaco":       {"pick": 2, "splitpush": 1, "dive": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Shyvana":     {"dive": 1, "frontline": 1, "splitpush": 1, "scaling": 2, "waveclear": 1,
                    "roles": ["Jungle"], "ap": 1},
    "Skarner":     {"engage": 2, "hard_cc": 2, "frontline": 1, "pick": 1,
                    "roles": ["Jungle"]},
    "Vi":          {"engage": 2, "hard_cc": 2, "dive": 2, "pick": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Viego":       {"dive": 1, "splitpush": 1, "sustain": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Xin Zhao":    {"engage": 2, "dive": 1, "frontline": 1, "peel": 1, "hard_cc": 1,
                    "roles": ["Jungle"], "ap": 0},
    "Zac":         {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 1, "sustain": 1,
                    "roles": ["Jungle"], "ap": 1},

    # ── Mid ──────────────────────────────────────────────────────────────────
    "Ahri":        {"pick": 2, "poke": 1, "scaling": 1, "ranged": 2, "waveclear": 1,
                    "roles": ["Mid"], "ap": 1},
    "Akali":       {"dive": 2, "pick": 1, "splitpush": 1,
                    "roles": ["Mid"], "ap": 1},
    "Anivia":      {"hard_cc": 2, "waveclear": 2, "disengage": 2, "poke": 1, "scaling": 2, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Annie":       {"engage": 1, "hard_cc": 2, "poke": 1, "waveclear": 1, "ranged": 2,
                    "roles": ["Mid", "Support"], "ap": 1},
    "Aurelion Sol":{"scaling": 2, "waveclear": 2, "poke": 1, "ranged": 2, "hard_cc": 1,
                    "roles": ["Mid"], "ap": 1},
    "Aurora":      {"poke": 1, "disengage": 2, "scaling": 1, "pick": 1,
                    "roles": ["Mid"], "ap": 1},
    "Azir":        {"poke": 1, "waveclear": 1, "disengage": 1, "scaling": 2, "ranged": 2, "engage": 1,
                    "roles": ["Mid"], "ap": 1},
    "Cassiopeia":  {"sustain": 1, "scaling": 2, "waveclear": 1, "hard_cc": 1, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Corki":       {"poke": 2, "waveclear": 1, "scaling": 1, "ranged": 2,
                    "roles": ["Mid"]},
    "Fizz":        {"dive": 2, "pick": 1, "sustain": 1,
                    "roles": ["Mid"], "ap": 1},
    "Galio":       {"engage": 2, "hard_cc": 2, "frontline": 1, "peel": 1, "disengage": 1,
                    "roles": ["Mid"], "ap": 1},
    "Hwei":        {"poke": 2, "hard_cc": 1, "waveclear": 1, "disengage": 1, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Kassadin":    {"scaling": 2, "disengage": 1, "dive": 1,
                    "roles": ["Mid"], "ap": 1},
    "Katarina":    {"dive": 2, "pick": 1, "splitpush": 1, "scaling": 1,
                    "roles": ["Mid"], "ap": 1},
    "LeBlanc":     {"pick": 2, "dive": 1,
                    "roles": ["Mid"], "ap": 1},
    "Lissandra":   {"engage": 2, "hard_cc": 2, "disengage": 1, "waveclear": 1, "ranged": 1,
                    "roles": ["Mid"], "ap": 1},
    "Malzahar":    {"hard_cc": 2, "pick": 1, "waveclear": 2, "ranged": 2, "scaling": 1,
                    "roles": ["Mid"], "ap": 1},
    "Neeko":       {"engage": 1, "hard_cc": 2, "waveclear": 1, "ranged": 1, "poke": 1,
                    "roles": ["Mid"], "ap": 1},
    "Orianna":     {"engage": 1, "hard_cc": 2, "peel": 1, "waveclear": 1, "scaling": 2, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Qiyana":      {"pick": 2, "engage": 1, "dive": 1, "hard_cc": 1,
                    "roles": ["Mid"], "ap": 0},
    "Ryze":        {"scaling": 2, "waveclear": 2, "splitpush": 1,
                    "roles": ["Mid"], "ap": 1},
    "Sylas":       {"dive": 2, "sustain": 1, "pick": 1, "splitpush": 1,
                    "roles": ["Mid"], "ap": 1},
    "Syndra":      {"poke": 1, "pick": 2, "hard_cc": 1, "ranged": 2, "scaling": 2,
                    "roles": ["Mid"], "ap": 1},
    "Taliyah":     {"engage": 1, "hard_cc": 1, "poke": 1, "waveclear": 2, "disengage": 1, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Talon":       {"pick": 2, "dive": 1, "splitpush": 1,
                    "roles": ["Mid"], "ap": 0},
    "Twisted Fate":{"pick": 2, "engage": 1, "waveclear": 1, "ranged": 2, "scaling": 1,
                    "roles": ["Mid"]},
    "Veigar":      {"hard_cc": 1, "poke": 1, "scaling": 2, "waveclear": 1, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Vex":         {"poke": 1, "pick": 1, "disengage": 1, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Viktor":      {"poke": 1, "waveclear": 2, "hard_cc": 1, "scaling": 2, "ranged": 2,
                    "roles": ["Mid"], "ap": 1},
    "Vladimir":    {"sustain": 2, "scaling": 2, "dive": 1, "poke": 1,
                    "roles": ["Mid"], "ap": 1},
    "Zed":         {"dive": 2, "pick": 1, "splitpush": 1,
                    "roles": ["Mid"], "ap": 0},
    "Zoe":         {"poke": 2, "pick": 1, "ranged": 2, "scaling": 1,
                    "roles": ["Mid"], "ap": 1},

    # ── Bot (ADC) ────────────────────────────────────────────────────────────
    "Aphelios":    {"poke": 1, "scaling": 2, "ranged": 2, "waveclear": 1,
                    "roles": ["Bot"], "ap": 0},
    "Ashe":        {"engage": 1, "hard_cc": 2, "poke": 1, "ranged": 2, "peel": 1, "scaling": 1,
                    "roles": ["Bot"], "ap": 0},
    "Caitlyn":     {"poke": 2, "waveclear": 1, "ranged": 2, "splitpush": 1,
                    "roles": ["Bot"], "ap": 0},
    "Draven":      {"ranged": 2,
                    "roles": ["Bot"], "ap": 0},
    "Ezreal":      {"poke": 2, "waveclear": 1, "ranged": 2, "disengage": 1, "scaling": 1,
                    "roles": ["Bot"]},
    "Jhin":        {"poke": 1, "pick": 1, "ranged": 2, "hard_cc": 1,
                    "roles": ["Bot"], "ap": 0},
    "Jinx":        {"waveclear": 1, "scaling": 2, "ranged": 2, "poke": 1,
                    "roles": ["Bot"], "ap": 0},
    "Kai'Sa":      {"dive": 1, "scaling": 2, "ranged": 2,
                    "roles": ["Bot"]},
    "Kalista":     {"pick": 1, "engage": 1, "ranged": 2,
                    "roles": ["Bot"], "ap": 0},
    "Kog'Maw":     {"scaling": 2, "ranged": 2, "poke": 1,
                    "roles": ["Bot"]},
    "Lucian":      {"ranged": 2, "dive": 1,
                    "roles": ["Bot"], "ap": 0},
    "Miss Fortune":{"poke": 2, "waveclear": 1, "ranged": 2, "engage": 1,
                    "roles": ["Bot"], "ap": 0},
    "Nilah":       {"sustain": 1, "scaling": 1, "dive": 1, "peel": 1,
                    "roles": ["Bot"], "ap": 0},
    "Samira":      {"dive": 2, "engage": 1, "ranged": 2, "hard_cc": 1,
                    "roles": ["Bot"], "ap": 0},
    "Senna":       {"poke": 2, "scaling": 2, "ranged": 2, "peel": 1,
                    "roles": ["Bot", "Support"], "ap": 0},
    "Sivir":       {"waveclear": 2, "ranged": 2, "engage": 1, "disengage": 1, "poke": 1,
                    "roles": ["Bot"], "ap": 0},
    "Smolder":     {"poke": 1, "scaling": 2, "ranged": 2, "waveclear": 1,
                    "roles": ["Bot"], "ap": 0},
    "Tristana":    {"dive": 1, "splitpush": 1, "scaling": 1, "ranged": 2,
                    "roles": ["Bot"], "ap": 0},
    "Twitch":      {"pick": 1, "dive": 1, "scaling": 2, "ranged": 2,
                    "roles": ["Bot"]},
    "Varus":       {"poke": 2, "hard_cc": 1, "ranged": 2, "scaling": 1,
                    "roles": ["Bot"]},
    "Vayne":       {"splitpush": 1, "dive": 1, "scaling": 2, "ranged": 2,
                    "roles": ["Bot"], "ap": 0},
    "Xayah":       {"peel": 1, "disengage": 1, "scaling": 1, "ranged": 2, "hard_cc": 1,
                    "roles": ["Bot"], "ap": 0},
    "Zeri":        {"poke": 1, "scaling": 2, "ranged": 2, "waveclear": 1,
                    "roles": ["Bot"], "ap": 0},

    # ── Support ──────────────────────────────────────────────────────────────
    "Alistar":     {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 2,
                    "roles": ["Support"]},
    "Bard":        {"pick": 2, "hard_cc": 1, "disengage": 1, "peel": 1, "engage": 1,
                    "roles": ["Support"], "ap": 1},
    "Blitzcrank":  {"pick": 2, "hard_cc": 2, "frontline": 1, "engage": 1,
                    "roles": ["Support"]},
    "Brand":       {"poke": 2, "waveclear": 1, "ranged": 2, "scaling": 1,
                    "roles": ["Support"], "ap": 1},
    "Braum":       {"peel": 2, "frontline": 2, "hard_cc": 1, "disengage": 1, "engage": 1,
                    "roles": ["Support"]},
    "Janna":       {"peel": 2, "disengage": 2, "sustain": 1, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Karma":       {"peel": 1, "poke": 1, "disengage": 1, "sustain": 1, "ranged": 2, "engage": 1,
                    "roles": ["Support"], "ap": 1},
    "Leona":       {"engage": 2, "hard_cc": 2, "frontline": 2,
                    "roles": ["Support"]},
    "Lulu":        {"peel": 2, "disengage": 1, "sustain": 1, "ranged": 1, "hard_cc": 1,
                    "roles": ["Support"], "ap": 1},
    "Lux":         {"poke": 2, "hard_cc": 2, "waveclear": 1, "ranged": 2, "pick": 1,
                    "roles": ["Support"], "ap": 1},
    "Milio":       {"peel": 2, "sustain": 2, "disengage": 1, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Morgana":     {"peel": 2, "hard_cc": 2, "waveclear": 1, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Nami":        {"peel": 1, "hard_cc": 1, "sustain": 2, "engage": 1, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Nautilus":    {"engage": 2, "hard_cc": 2, "frontline": 2, "pick": 1,
                    "roles": ["Support"]},
    "Pyke":        {"pick": 2, "engage": 1, "hard_cc": 1,
                    "roles": ["Support"], "ap": 0},
    "Rakan":       {"engage": 2, "hard_cc": 2, "peel": 1, "disengage": 1,
                    "roles": ["Support"], "ap": 1},
    "Rell":        {"engage": 2, "hard_cc": 2, "frontline": 2, "peel": 1,
                    "roles": ["Support"]},
    "Renata Glasc":{"peel": 2, "disengage": 1, "sustain": 1, "hard_cc": 1, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Seraphine":   {"peel": 1, "poke": 1, "sustain": 1, "hard_cc": 1, "ranged": 2,
                    "roles": ["Support"], "ap": 1},
    "Sona":        {"peel": 1, "sustain": 2, "poke": 1, "ranged": 2, "hard_cc": 1,
                    "roles": ["Support"], "ap": 1},
    "Soraka":      {"peel": 1, "sustain": 2, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Swain":       {"engage": 1, "hard_cc": 2, "sustain": 1, "frontline": 1, "ranged": 1,
                    "roles": ["Support"], "ap": 1},
    "Taric":       {"peel": 2, "frontline": 1, "hard_cc": 1, "sustain": 1, "engage": 1,
                    "roles": ["Support"]},
    "Thresh":      {"engage": 2, "hard_cc": 2, "frontline": 1, "peel": 2, "pick": 1,
                    "roles": ["Support"]},
    "Vel'Koz":     {"poke": 2, "ranged": 2, "waveclear": 1, "hard_cc": 1,
                    "roles": ["Support"], "ap": 1},
    "Xerath":      {"poke": 2, "ranged": 2, "waveclear": 1, "hard_cc": 1, "pick": 1,
                    "roles": ["Support"], "ap": 1},
    "Yuumi":       {"peel": 1, "sustain": 2, "scaling": 1,
                    "roles": ["Support"], "ap": 1},
    "Zilean":      {"peel": 2, "sustain": 1, "hard_cc": 1, "ranged": 1, "scaling": 1,
                    "roles": ["Support"], "ap": 1},
    "Zyra":        {"poke": 2, "waveclear": 1, "ranged": 2, "hard_cc": 1, "peel": 1,
                    "roles": ["Support"], "ap": 1},
}

AXES = [
    "engage", "hard_cc", "frontline", "peel", "poke", "waveclear",
    "sustain", "disengage", "pick", "splitpush", "dive", "scaling",
]

# Threshold rules — how much of an axis a 5-man team should have.
# Universal rules always apply. Context rules only fire when the enemy comp
# makes that axis critical (condition takes enemy_profile and returns bool).
GAP_RULES = [
    # ── Universal — every comp needs some of these ───────────────────────
    {"axis": "engage",    "target": 2, "label": "Engage / hard initiation"},
    {"axis": "hard_cc",   "target": 4, "label": "Hard CC"},
    {"axis": "frontline", "target": 3, "label": "Frontline / tankiness"},
    {"axis": "waveclear", "target": 2, "label": "Waveclear"},
    {"axis": "dive",      "target": 2, "label": "Dive / backline access"},
    {"axis": "pick",      "target": 2, "label": "Pick potential"},
    # ── Conditional — only matter in certain drafts ──────────────────────
    {
        "axis": "peel", "target": 2, "label": "Peel for the backline",
        "condition": lambda ep, ap, picks: any(
            get_traits(p).get("scaling", 0) >= 2
            for p in picks
        ),
    },
    {
        "axis": "disengage", "target": 2, "label": "Disengage",
        "condition": lambda ep, ap, picks: ep.get("engage", 0) >= 3 or ep.get("dive", 0) >= 3,
        "reason": "enemy has strong engage/dive — you need tools to break fights",
    },
    {
        "axis": "poke", "target": 2, "label": "Poke / siege",
        "condition": lambda ep, ap, picks: (
            (ep.get("engage", 0) >= 3 and ap.get("poke", 0) <= 1)
            or ep.get("disengage", 0) >= 2
        ),
        "reason": "enemy has engage but no poke, or strong disengage — poke creates pressure they can't answer",
    },
    {
        "axis": "sustain", "target": 2, "label": "Sustain",
        "condition": lambda ep, ap, picks: ep.get("poke", 0) >= 3,
        "reason": "enemy has heavy poke — sustain keeps your team healthy through sieges",
    },
]


def _normalize(name: str) -> str:
    """Strip role suffix, normalize case-insensitive lookup."""
    n = name.strip()
    if "(" in n:
        n = n[:n.index("(")].strip()
    return n


def get_traits(name: str) -> dict:
    """Get the trait scores for a single champion. Unknowns return empty."""
    norm = _normalize(name)
    # Handle legacy alias
    if norm.lower() == "nunu":
        norm = "Nunu & Willump"
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
            if axis in profile:   # naturally skips "roles" and "ap"
                profile[axis] += score
    return profile


def identify_gaps(
    ally_profile: dict,
    ally_picks: list[str],
    enemy_profile: dict | None = None,
) -> list[dict]:
    """
    Return ordered list of gap dicts: [{name, severity, why, ...}].
    Severity: 'critical' = total miss, 'soft' = below threshold.

    Supports context-aware rules: rules with a "condition" key only fire
    when the enemy comp makes that axis relevant. Rules without a condition
    are universal and always checked.
    """
    gaps: list[dict] = []
    n = len(ally_picks)
    ep = enemy_profile or {}

    # Scale threshold by team size — 5-man rules above are full-team targets
    scale = max(1, n) / 5.0

    for rule in GAP_RULES:
        axis   = rule["axis"]
        target = rule["target"]
        label  = rule["label"]

        # Context gate — skip if the condition doesn't match the enemy comp
        condition = rule.get("condition")
        if condition and not condition(ep, ally_profile, ally_picks):
            continue

        scaled_target = target * scale
        score = ally_profile.get(axis, 0)

        if score == 0:
            gap: dict = {
                "name": label,
                "axis": axis,
                "severity": "critical",
                "score": score,
                "target": target,
                "why": f"Your team has zero {label.lower()} — enemy can exploit this freely.",
            }
            # Attach context reason so intelligence block can explain WHY this
            # axis matters in this specific draft
            if rule.get("reason"):
                gap["context_reason"] = rule["reason"]
            gaps.append(gap)
        elif score < scaled_target:
            gap = {
                "name": label,
                "axis": axis,
                "severity": "soft",
                "score": score,
                "target": target,
                "why": f"Your team is light on {label.lower()} ({score} vs target {target}).",
            }
            if rule.get("reason"):
                gap["context_reason"] = rule["reason"]
            gaps.append(gap)

    # Order: critical first, then soft
    gaps.sort(key=lambda g: (0 if g["severity"] == "critical" else 1, g["axis"]))
    return gaps


def detect_archetype(profile: dict, picks: list[str]) -> str:
    """
    Detect dominant comp archetype from a team profile.
    Returns one of: engage, poke, pick, splitpush, teamfight, dive, scaling, protect, balanced.

    Thresholds scale with team size so archetypes are detected during draft
    (2-3 picks) as well as full 5-man comps.
    """
    n = max(1, len(picks))
    s = n / 5.0  # scale factor — 1.0 for 5-man, 0.4 for 2 picks

    # Hard signals first (scaled)
    if profile["dive"] >= 3 * s and profile["engage"] >= 2 * s:
        return "dive"
    if profile["splitpush"] >= 3 * s:
        return "splitpush"
    if profile["pick"] >= 3 * s:
        return "pick"
    if profile["poke"] >= 4 * s:
        return "poke"
    if profile["engage"] >= 4 * s and profile["frontline"] >= 2 * s:
        return "engage"
    if profile["scaling"] >= 5 * s:
        return "scaling"

    # Protect-the-carry: hypercarry + peel sources (scaled)
    has_hypercarry = any(
        get_traits(p).get("scaling", 0) >= 2 and get_traits(p).get("ranged", 0) >= 2
        for p in picks
    )
    if has_hypercarry and profile["peel"] >= 4 * s:
        return "protect"

    # Teamfight: high frontline AND hard CC (not just sum — avoids poke+CC
    # combos like Lux+Malphite triggering teamfight)
    if profile["frontline"] >= 2 * s and profile["hard_cc"] >= 3 * s and n >= 3:
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

    if enemy_profile["sustain"] >= 3:
        healers = [p for p in enemy_picks if get_traits(p).get("sustain", 0) >= 2]
        threats.append({
            "threat": "Heavy sustain",
            "severity": "medium",
            "why": f"Enemy has strong healing/shielding ({', '.join(healers[:3])}). Fights become wars of attrition — buy anti-heal early.",
        })

    # Protect-the-carry: enemy hypercarry + peel = must dive or burst them
    enemy_hypercarries = [
        p for p in enemy_picks
        if get_traits(p).get("scaling", 0) >= 2 and get_traits(p).get("ranged", 0) >= 2
    ]
    if enemy_hypercarries and enemy_profile["peel"] >= 3:
        threats.append({
            "threat": "Protect-the-carry",
            "severity": "high",
            "why": f"Enemy has hypercarry ({', '.join(enemy_hypercarries[:2])}) behind {enemy_profile['peel']} peel. "
                   "You must dive the backline or burst through peel before they scale.",
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

    gaps    = identify_gaps(ally_p, ally_picks, enemy_p)
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
            if g.get("context_reason"):
                lines.append(f"    ↳ Context: {g['context_reason']}")
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
