"""
Lolalytics scraper service for DraftSage.
Fetches real patch-current champion counter data from lolalytics.com.
Patch 16.10 (lolalytics format) = Patch 26.10 (Riot format).
"""

import re
import asyncio
import time
from typing import Optional
import httpx

# ── Cache (TTL = 2 hours) ─────────────────────────────────────────────────────
_CACHE: dict[str, tuple[object, float]] = {}
CACHE_TTL = 7200  # 2 hours

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

# Lolalytics URL slug overrides for champions with special names
SLUG_MAP: dict[str, str] = {
    "aurelion sol":  "aurelionsol",
    "bel'veth":      "belveth",
    "cho'gath":      "chogath",
    "dr. mundo":     "drmundo",
    "jarvan iv":     "jarvaniv",
    "kai'sa":        "kaisa",
    "kha'zix":       "khazix",
    "kog'maw":       "kogmaw",
    "k'sante":       "ksante",
    "lee sin":       "leesin",
    "master yi":     "masteryi",
    "miss fortune":  "missfortune",
    "nunu & willump":"nunu",
    "rek'sai":       "reksai",
    "renata glasc":  "renata",
    "tahm kench":    "tahmkench",
    "twisted fate":  "twistedfate",
    "vel'koz":       "velkoz",
    "wukong":        "monkeyking",
    "xin zhao":      "xinzhao",
    "nunu":          "nunu",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def champion_to_slug(name: str) -> str:
    """Convert a champion display name to its lolalytics URL slug."""
    # Strip role suffix e.g. "Caitlyn (Bot)" → "Caitlyn"
    if "(" in name:
        name = name[:name.index("(")].strip()
    clean = name.strip().lower()
    if clean in SLUG_MAP:
        return SLUG_MAP[clean]
    # General: remove spaces, apostrophes, dots
    return re.sub(r"['. ]", "", clean)


def _cache_get(key: str) -> Optional[object]:
    entry = _CACHE.get(key)
    if entry and (time.time() - entry[1]) < CACHE_TTL:
        return entry[0]
    return None


def _cache_set(key: str, value: object):
    _CACHE[key] = (value, time.time())


# ── HTTP fetch ────────────────────────────────────────────────────────────────

async def _fetch(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=7.0, follow_redirects=True) as client:
            r = await client.get(url, headers=HEADERS)
            return r.text if r.status_code == 200 else None
    except Exception:
        return None


# ── Parser ────────────────────────────────────────────────────────────────────

def _parse_matchups(text: str) -> dict[str, float]:
    """
    Parse all win-rate lines from a lolalytics counter page.
    Pattern: "ChampA wins against ChampB 47.5% of the time..."
    Returns {opponent_name: win_rate_for_page_champion}
    """
    pattern = re.compile(
        r"([\w'.\-& ]+?)\s+wins against\s+([\w'.\-& ]+?)\s+([\d.]+)%\s+of the time",
        re.IGNORECASE,
    )
    results: dict[str, float] = {}
    for m in pattern.finditer(text):
        opponent = m.group(2).strip()
        wr       = float(m.group(3))
        # Deduplicate: keep the first occurrence (page is sorted best → worst for the champ)
        if opponent not in results:
            results[opponent] = wr
    return results


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_champion_counters(champion: str, role: str) -> dict:
    """
    Return who BEATS and who LOSES to a champion in a given role.

    Schema:
    {
        "champion": str,
        "counters":    [{"champion": str, "wr_for_them": float, "advantage": float}],
        "easy_matchups": [{"champion": str, "wr_for_them": float}],
        "patch_note":  str,   # e.g. "Patch 16.10"
    }
    counters.wr_for_them < 50 means the page champion loses → those are the counters
    """
    slug  = champion_to_slug(champion)
    lane  = ROLE_LANES.get(role, "bottom")
    key   = f"counters_{slug}_{lane}"

    cached = _cache_get(key)
    if cached is not None:
        return cached  # type: ignore

    # Try lane-specific URL first, then generic
    url = f"https://lolalytics.com/lol/{slug}/counters/?lane={lane}&vslane={lane}"
    text = await _fetch(url)
    if not text:
        url  = f"https://lolalytics.com/lol/{slug}/counters/"
        text = await _fetch(url)

    if not text:
        result = {"champion": champion, "counters": [], "easy_matchups": [], "error": True}
        return result

    matchups = _parse_matchups(text)

    # Extract patch note from page text
    patch_match = re.search(r"Patch\s+([\d.]+)", text)
    patch_note  = patch_match.group(0) if patch_match else "current patch"

    # Counters = opponents where page champ wins LESS than 48%  (they beat the champ)
    counters = sorted(
        [
            {
                "champion":    opp,
                "wr_for_them": wr,
                "advantage":   round(50 - wr, 1),  # positive = counter advantage
            }
            for opp, wr in matchups.items()
            if wr <= 48.0
        ],
        key=lambda x: x["wr_for_them"],  # worst first = hardest counters
    )

    # Easy matchups = opponents where page champ wins MORE than 52%
    easy = sorted(
        [
            {"champion": opp, "wr_for_them": wr}
            for opp, wr in matchups.items()
            if wr >= 52.0
        ],
        key=lambda x: x["wr_for_them"],
        reverse=True,
    )

    result = {
        "champion":      champion,
        "counters":      counters[:8],
        "easy_matchups": easy[:5],
        "patch_note":    patch_note,
    }
    _cache_set(key, result)
    return result


async def fetch_all_enemy_counters(enemy_picks: list[str], role: str) -> list[dict]:
    """
    Fetch counter data for all enemy champions in parallel.
    Limits to first 5 enemies and ignores any that fail.
    """
    tasks = [fetch_champion_counters(champ, role) for champ in enemy_picks[:5]]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, dict) and not r.get("error")]


def build_lolalytics_context(enemy_data: list[dict], role: str) -> str:
    """
    Build the lolalytics data block to inject into the AI prompt.
    Tells the AI exactly which champions beat each enemy pick, with win rates.
    """
    if not enemy_data:
        return ""

    patch = enemy_data[0].get("patch_note", "current patch") if enemy_data else "current patch"
    lines = [
        f"\n{'='*55}",
        f"📊 LIVE LOLALYTICS DATA — {patch} (lolalytics.com)",
        f"{'='*55}",
        f"Role context: {role}",
        "",
        "For each ENEMY champion below, these are the picks that",
        "BEAT them most often in real high-elo games this patch:",
        "",
    ]

    for data in enemy_data:
        champ    = data["champion"]
        counters = data.get("counters", [])

        if not counters:
            lines.append(f"⚔ {champ}: No significant counter data available.")
            continue

        top_counters = counters[:5]
        counter_parts = [
            f"{c['champion']} (beats {champ} {c['advantage']:+.1f}% above 50/50)"
            for c in top_counters
        ]
        lines.append(f"⚔ {champ} is COUNTERED BY: {', '.join(counter_parts)}")

    lines += [
        "",
        "INSTRUCTION: Cross-reference the counters above with:",
        "  1. The required damage type (AP/AD balance rule)",
        "  2. Champion pool if provided",
        "  3. Synergy with ally picks",
        "Champions appearing as counters to MULTIPLE enemy picks are ideal.",
        f"{'='*55}",
    ]

    return "\n".join(lines)
