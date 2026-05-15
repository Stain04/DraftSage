"""
Champion damage-type classification for DraftSage.
Used to enforce AP/AD balance rules before calling the AI.
"""

# Champions that deal primarily MAGIC (AP) damage.
# Hybrid/flex champions that are commonly built AP are included.
AP_CHAMPIONS: set[str] = {
    # Mages
    "Ahri", "Annie", "Aurelion Sol", "Azir", "Brand", "Cassiopeia",
    "Heimerdinger", "Karthus", "Lissandra", "Lux", "Malzahar", "Morgana",
    "Neeko", "Orianna", "Ryze", "Seraphine", "Swain", "Syndra", "Taliyah",
    "Twisted Fate", "Veigar", "Viktor", "Xerath", "Zyra", "Zoe",
    "Vel'Koz", "Hwei",
    # AP Assassins
    "Akali", "Diana", "Ekko", "Fizz", "Katarina", "LeBlanc",
    "Sylas", "Vex", "Naafiri",
    # AP Bruisers / Fighters
    "Cho'Gath", "Gragas", "Kennen", "Lillia", "Mordekaiser",
    "Rumble", "Singed", "Vladimir",
    # AP Supports
    "Karma", "Lulu", "Nami", "Sona", "Soraka", "Vel'Koz",
    "Zyra", "Zilean", "Seraphine", "Brand", "Heimerdinger",
    "Lux",  # support Lux
    # AP Junglers
    "Amumu", "Elise", "Evelynn", "Fiddlesticks", "Ivern", "Nidalee", "Shyvana",
    # AP Top
    "Malphite", "Teemo",
}

# Champions that deal primarily PHYSICAL (AD) damage.
AD_CHAMPIONS: set[str] = {
    # Marksmen / ADC
    "Ashe", "Caitlyn", "Draven", "Ezreal", "Jhin", "Jinx", "Kai'Sa",
    "Kalista", "Kog'Maw", "Lucian", "Miss Fortune", "Sivir", "Tristana",
    "Twitch", "Vayne", "Xayah", "Zeri", "Samira", "Nilah", "Aphelios",
    # AD Assassins
    "Kha'Zix", "Naafiri", "Nocturne", "Qiyana", "Rengar", "Talon", "Zed",
    # AD Fighters / Bruisers (top)
    "Aatrox", "Ambessa", "Camille", "Darius", "Fiora", "Garen", "Gnar",
    "Illaoi", "Irelia", "Jayce", "Nasus", "Olaf", "Pantheon", "Renekton",
    "Riven", "Sett", "Tryndamere", "Urgot", "Volibear", "Warwick", "Yorick",
    # AD Junglers
    "Briar", "Hecarim", "Jarvan IV", "Kayn", "Khazix", "Lee Sin", "Master Yi",
    "Rengar", "Vi", "Warwick", "Xin Zhao", "Nocturne",
    # AD Supports
    "Blitzcrank", "Leona", "Nautilus", "Pyke", "Thresh",
    # AD Top / flex
    "Gangplank", "Garen", "Jax", "Nasus", "Trundle",
}


def classify_champion(name: str) -> str:
    """
    Classify a champion as 'AP', 'AD', or 'Mixed'.
    Name matching is case-insensitive.
    """
    normalized = name.strip()
    # Strip role suffix if present, e.g. "Orianna (Mid)" → "Orianna"
    if "(" in normalized:
        normalized = normalized[:normalized.index("(")].strip()

    for champ in AP_CHAMPIONS:
        if champ.lower() == normalized.lower():
            return "AP"
    for champ in AD_CHAMPIONS:
        if champ.lower() == normalized.lower():
            return "AD"
    return "Mixed"  # Unknown → treat as mixed/hybrid


def analyze_team_damage(picks: list[str]) -> dict:
    """
    Analyze a team's damage type composition.

    Returns:
        {
            "ap_count": int,
            "ad_count": int,
            "mixed_count": int,
            "total": int,
            "label": str,          # e.g. "Full-AP", "Mostly-AD", "Balanced"
            "required_type": str,  # "AD", "AP", or "Any"
            "forbidden_type": str, # "AP", "AD", or "None"
            "hard_rule": str,      # Explicit instruction string for the AI prompt
        }
    """
    ap_count = ad_count = mixed_count = 0

    for pick in picks:
        t = classify_champion(pick)
        if t == "AP":
            ap_count += 1
        elif t == "AD":
            ad_count += 1
        else:
            mixed_count += 1

    total = len(picks)

    if total == 0:
        return {
            "ap_count": 0, "ad_count": 0, "mixed_count": 0, "total": 0,
            "label": "No picks yet", "required_type": "Any",
            "forbidden_type": "None", "hard_rule": "",
        }

    ap_ratio = ap_count / total
    ad_ratio = ad_count / total

    # Determine label
    if ap_count >= 3 and ad_count == 0:
        label = "Full-AP"
    elif ad_count >= 3 and ap_count == 0:
        label = "Full-AD"
    elif ap_ratio >= 0.6:
        label = "Mostly-AP"
    elif ad_ratio >= 0.6:
        label = "Mostly-AD"
    else:
        label = "Balanced"

    # Determine what damage type is REQUIRED for the next pick
    if ap_count >= 2 and ad_count == 0:
        required_type = "AD"
        forbidden_type = "AP"
        hard_rule = (
            f"⛔ MANDATORY DAMAGE RULE: Your ally team has {ap_count} AP champions "
            f"and {ad_count} AD champions. This is dangerously AP-heavy. "
            f"The enemy will buy ONE item (e.g. Null-Magic Mantle → Spectre's Cowl → Spirit Visage) "
            f"and nullify your entire team's damage. "
            f"You are ABSOLUTELY FORBIDDEN from recommending ANY AP champion. "
            f"You MUST recommend AD or physical-damage champions ONLY. "
            f"This is non-negotiable. Ignore all other criteria if they conflict with this rule."
        )
    elif ad_count >= 2 and ap_count == 0:
        required_type = "AP"
        forbidden_type = "AD"
        hard_rule = (
            f"⛔ MANDATORY DAMAGE RULE: Your ally team has {ad_count} AD champions "
            f"and {ap_count} AP champions. This is dangerously AD-heavy. "
            f"The enemy will buy armor (e.g. Thornmail, Randuin's) and shut down your entire team. "
            f"You are ABSOLUTELY FORBIDDEN from recommending ANY AD or physical-damage champion. "
            f"You MUST recommend AP or magic-damage champions ONLY. "
            f"This is non-negotiable. Ignore all other criteria if they conflict with this rule."
        )
    elif ap_ratio >= 0.6:
        required_type = "AD"
        forbidden_type = "AP"
        hard_rule = (
            f"⛔ DAMAGE BALANCE WARNING: Your ally team is {ap_count} AP / {ad_count} AD. "
            f"You are FORBIDDEN from recommending AP champions. "
            f"Recommend AD or physical-damage champions ONLY to balance the comp."
        )
    elif ad_ratio >= 0.6:
        required_type = "AP"
        forbidden_type = "AD"
        hard_rule = (
            f"⛔ DAMAGE BALANCE WARNING: Your ally team is {ad_count} AD / {ap_count} AP. "
            f"You are FORBIDDEN from recommending AD champions. "
            f"Recommend AP or magic-damage champions ONLY to balance the comp."
        )
    else:
        required_type = "Any"
        forbidden_type = "None"
        hard_rule = (
            f"ℹ️ Damage balance looks healthy ({ap_count} AP / {ad_count} AD). "
            f"Focus on win condition and counter-pick logic."
        )

    return {
        "ap_count": ap_count,
        "ad_count": ad_count,
        "mixed_count": mixed_count,
        "total": total,
        "label": label,
        "required_type": required_type,
        "forbidden_type": forbidden_type,
        "hard_rule": hard_rule,
    }
