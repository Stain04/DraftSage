"""
Lolalytics scraper service for DraftSage.
Fetches real patch-current counter data and tier lists from lolalytics.com.
Patch 16.10 (lolalytics) = Patch 26.10 (Riot).
Caching disabled — always fetches fresh data per user request.
"""

import re
import asyncio
from typing import Optional
import httpx

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

ROLE_LANES = {
    "Top":     "top",
    "Jungle":  "jungle",
    "Mid":     "middle",
    "Bot":     "bottom",
    "Support": "support",
}

SLUG_MAP: dict[str, str] = {
    "aurelion sol":   "aurelionsol",
    "bel'veth":       "belveth",
    "cho'gath":       "chogath",
    "dr. mundo":      "drmundo",
    "jarvan iv":      "jarvaniv",
    "kai'sa":         "kaisa",
    "kha'zix":        "khazix",
    "kog'maw":        "kogmaw",
    "k'sante":        "ksante",
    "lee sin":        "leesin",
    "master yi":      "masteryi",
    "miss fortune":   "missfortune",
    "nunu & willump": "nunu",
    "nunu":           "nunu",
    "rek'sai":        "reksai",
    "renata glasc":   "renata",
    "tahm kench":     "tahmkench",
    "twisted fate":   "twistedfate",
    "vel'koz":        "velkoz",
    "wukong":         "monkeyking",
    "xin zhao":       "xinzhao",
}

# Role-specific playstyle categories to enforce recommendation diversity
ROLE_PLAYSTYLES: dict[str, list[str]] = {
    "Jungle": [
        "Engage/Tank jungler — examples: Amumu, Zac, Sejuani, Rammus, Jarvan IV, Volibear",
        "Carry/Assassin jungler — examples: Kha'Zix, Rengar, Evelynn, Nidalee, Talon, Naafiri, Nocturne",
        "Skirmisher/Duelist jungler — examples: Vi, Graves, Hecarim, Xin Zhao, Kayn, Bel'Veth, Lee Sin, Rek'Sai, Master Yi, Warwick",
    ],
    "Top": [
        "Tank/Engage toplaner — examples: Malphite, Ornn, Sion, Dr. Mundo, K'Sante, Maokai",
        "Fighter/Juggernaut toplaner — examples: Darius, Garen, Illaoi, Renekton, Sett, Aatrox, Nasus, Olaf",
        "Splitpush/Carry toplaner — examples: Fiora, Camille, Tryndamere, Yorick, Jax, Irelia, Riven",
    ],
    "Mid": [
        "Assassin midlaner — examples: Zed, Akali, Katarina, Talon, LeBlanc, Qiyana, Naafiri",
        "Control Mage midlaner — examples: Orianna, Azir, Syndra, Lissandra, Viktor, Cassiopeia, Veigar",
        "Roam/Flex midlaner — examples: Ahri, Twisted Fate, Galio, Diana, Sylas, Corki, Irelia",
    ],
    "Bot": [
        "Safe Poke/Utility ADC — examples: Caitlyn, Ezreal, Jhin, Varus, Ashe, Sivir",
        "Hypercarry ADC — examples: Jinx, Kog'Maw, Twitch, Vayne, Aphelios, Xayah",
        "All-in/Skirmisher ADC — examples: Draven, Samira, Nilah, Lucian, Tristana, Kalista, Miss Fortune",
    ],
    "Support": [
        "Engage/Tank support — examples: Leona, Nautilus, Blitzcrank, Thresh, Alistar, Rell, Rakan",
        "Enchanter/Healer support — examples: Soraka, Lulu, Nami, Janna, Milio, Sona, Karma",
        "Poke/Mage support — examples: Brand, Zyra, Vel'Koz, Lux, Xerath, Senna, Heimerdinger",
    ],
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def champion_to_slug(name: str) -> str:
    """Convert a champion display name to its lolalytics URL slug."""
    if "(" in name:
        name = name[:name.index("(")].strip()
    clean = name.strip().lower()
    return SLUG_MAP.get(clean, re.sub(r"['. ]", "", clean))


async def _fetch(url: str) -> Optional[str]:
    """Async HTTP GET with a reasonable timeout."""
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            r = await client.get(url, headers=HEADERS)
            return r.text if r.status_code == 200 else None
    except Exception:
        return None


def _parse_matchups(text: str) -> dict[str, float]:
    """
    Parse win-rate lines from a lolalytics counter page.
    e.g. "Caitlyn wins against Jinx 48.82% of the time"
    Returns {opponent: win_rate_for_page_champion}
    """
    pattern = re.compile(
        r"[\w'.\-& ]+?\s+wins against\s+([\w'.\-& ]+?)\s+([\d.]+)%\s+of the time",
        re.IGNORECASE,
    )
    results: dict[str, float] = {}
    for m in pattern.finditer(text):
        opponent = m.group(1).strip()
        wr = float(m.group(2))
        if opponent not in results:
            results[opponent] = wr
    return results


def _parse_tier_list(text: str) -> list[str]:
    """
    Parse champion names from a lolalytics tier list page.
    Returns ordered list of champion names (strongest first).
    """
    # Match clean champion name links like [Lee Sin](https://lolalytics.com/lol/leesin/build/)
    pattern = re.compile(
        r"\[([A-Z][^\]]{1,25})\]\(https://lolalytics\.com/lol/[\w]+/build/",
        re.MULTILINE,
    )
    seen: set[str] = set()
    champions: list[str] = []
    for m in pattern.finditer(text):
        name = m.group(1).strip()
        # Skip entries that contain "the" (taglines) or are too long
        if "the " in name.lower() or len(name) > 20:
            continue
        if name not in seen:
            seen.add(name)
            champions.append(name)
    return champions


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_champion_counters(champion: str, role: str) -> dict:
    """
    Fetch who beats a champion in a given role (no caching — always fresh).
    Returns {champion, counters: [{champion, wr_for_them, advantage}], easy_matchups, patch_note}
    """
    slug = champion_to_slug(champion)
    lane = ROLE_LANES.get(role, "bottom")

    url  = f"https://lolalytics.com/lol/{slug}/counters/?lane={lane}&vslane={lane}"
    text = await _fetch(url)
    if not text:
        url  = f"https://lolalytics.com/lol/{slug}/counters/"
        text = await _fetch(url)
    if not text:
        return {"champion": champion, "counters": [], "easy_matchups": [], "error": True}

    matchups   = _parse_matchups(text)
    patch_note = (re.search(r"Patch\s+[\d.]+", text) or type("", (), {"group": lambda *a: "current patch"})()).group(0)

    counters = sorted(
        [{"champion": opp, "wr_for_them": wr, "advantage": round(50 - wr, 1)}
         for opp, wr in matchups.items() if wr <= 47.0],  # must be 3%+ genuine edge
        key=lambda x: x["wr_for_them"],
    )
    easy = sorted(
        [{"champion": opp, "wr_for_them": wr}
         for opp, wr in matchups.items() if wr >= 52.0],
        key=lambda x: x["wr_for_them"], reverse=True,
    )
    return {
        "champion":      champion,
        "counters":      counters[:8],
        "easy_matchups": easy[:5],
        "patch_note":    patch_note,
    }


async def fetch_role_tier_list(role: str) -> list[str]:
    """
    Fetch the current patch tier list for a given role (no caching).
    Returns ordered list of champion names (highest-ranked first).
    """
    lane = ROLE_LANES.get(role, "bottom")
    url  = f"https://lolalytics.com/lol/tierlist/?lane={lane}"
    text = await _fetch(url)
    if not text:
        return []
    return _parse_tier_list(text)


async def fetch_all_context(enemy_picks: list[str], role: str) -> tuple[list[dict], list[str]]:
    """
    Fetch counter data for all enemy picks (each in their OWN role) + the role tier list, in parallel.
    Using each champion's actual lane gives accurate matchup stats (Darius top ≠ Darius mid).
    """
    counter_tasks = []
    for pick in enemy_picks[:5]:
        champ_name = pick.split("(")[0].strip()
        # Extract the enemy champion's own role from tag e.g. "Darius (Top)" → "Top"
        role_match = re.search(r'\((\w+)\)', pick)
        champ_role = role_match.group(1).capitalize() if role_match else role
        counter_tasks.append(fetch_champion_counters(champ_name, champ_role))

    tier_task = fetch_role_tier_list(role)  # tier list is still for the role being filled
    results   = await asyncio.gather(*counter_tasks, tier_task, return_exceptions=True)

    tier_list  = results[-1] if isinstance(results[-1], list) else []
    enemy_data = [r for r in results[:-1] if isinstance(r, dict) and not r.get("error")]
    return enemy_data, tier_list


def build_lolalytics_context(enemy_data: list[dict], tier_list: list[str], role: str, enemy_laner: str | None = None) -> str:
    """
    Build the complete live-data block to inject into the AI prompt.
    Includes: who beats each enemy, who each enemy beats (blacklist), tier list, diversity rule.
    """
    patch = enemy_data[0].get("patch_note", "current patch") if enemy_data else "current patch"
    lines = [
        f"\n{'='*60}",
        f"📊 LIVE LOLALYTICS DATA — {patch}",
        f"{'='*60}",
    ]

    # ── Direct lane opponent section ──────────────────────────────────────────
    if enemy_laner:
        lane_data = next((d for d in enemy_data if d["champion"].lower() == enemy_laner.lower()), None)
        if lane_data:
            avoid_picks = lane_data.get("easy_matchups", [])
            counter_picks = lane_data.get("counters", [])

            lines += [
                "",
                f"🎯 YOUR DIRECT LANE OPPONENT: {enemy_laner}",
                f"   Role: {role}",
            ]

            if avoid_picks:
                avoid_parts = [
                    f"{c['champion']} (loses by {round(c['wr_for_them'] - 50, 1):+.1f}%)"
                    for c in avoid_picks[:8]
                ]
                lines += [
                    f"",
                    f"⛔ DO NOT PICK THESE — {enemy_laner} BEATS THEM on this patch:",
                    f"   {', '.join(avoid_parts)}",
                    f"   These champions LOSE the 1v1 matchup. Never suggest them.",
                ]

            if counter_picks:
                good_parts = [
                    f"{c['champion']} (wins by +{c['advantage']:.1f}%)"
                    for c in counter_picks[:6]
                ]
                lines += [
                    f"",
                    f"✅ GOOD INTO {enemy_laner} — these champions WIN the matchup:",
                    f"   {', '.join(good_parts)}",
                ]

    # ── All enemy champions counter data ─────────────────────────────────────
    if enemy_data:
        lines += ["", "─── ALL ENEMY PICKS — Counter Reference ───"]
        for data in enemy_data:
            champ    = data["champion"]
            counters = data.get("counters", [])
            avoided  = data.get("easy_matchups", [])

            if counters:
                parts = [f"{c['champion']} (+{c['advantage']:.1f}%)" for c in counters[:5]]
                lines.append(f"  ⚔ {champ} loses to: {', '.join(parts)}")
            if avoided:
                avoid_str = ", ".join(c["champion"] for c in avoided[:5])
                lines.append(f"  ⚠ {champ} beats: {avoid_str} — avoid suggesting these")

    # ── Role tier list ────────────────────────────────────────────────────────
    if tier_list:
        top15 = tier_list[:15]
        lines += [
            "",
            f"CURRENT PATCH {role.upper()} TIER LIST (strongest → weakest):",
            f"  {' > '.join(top15)}",
            "",
            "Only recommend champions from this tier list unless there is a specific strong reason.",
        ]

    # ── Playstyle diversity ───────────────────────────────────────────────────
    playstyles = ROLE_PLAYSTYLES.get(role, [])
    if playstyles:
        lines += [
            "",
            f"MANDATORY DIVERSITY — 3 different playstyle categories for {role.upper()}:",
        ]
        for i, ps in enumerate(playstyles, 1):
            lines.append(f"  Category {i}: {ps}")
        lines.append("One pick per category. Never recommend 2 from the same category.")

    lines.append(f"\n{'='*60}\n")
    return "\n".join(lines)

