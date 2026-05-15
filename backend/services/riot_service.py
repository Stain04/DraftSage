"""
Riot Data Dragon service for DraftSage.
Fetches champion data, icons, and metadata from the free Data Dragon CDN.
"""

import httpx
from functools import lru_cache

DDRAGON_BASE = "https://ddragon.leagueoflegends.com"
VERSIONS_URL = f"{DDRAGON_BASE}/api/versions.json"

# Cache champion data in memory to avoid repeated CDN calls
_champion_cache: dict | None = None
_current_patch: str | None = None


async def get_latest_patch() -> str:
    """Fetch the latest LoL patch version from Data Dragon."""
    global _current_patch
    if _current_patch:
        return _current_patch

    async with httpx.AsyncClient() as client:
        response = await client.get(VERSIONS_URL)
        response.raise_for_status()
        versions = response.json()
        _current_patch = versions[0]
        return _current_patch


async def get_all_champions() -> list[dict]:
    """
    Fetch all champions from Data Dragon.
    Returns a list of champion objects with name, key, title, and icon URL.
    """
    global _champion_cache

    if _champion_cache is not None:
        return _champion_cache

    patch = await get_latest_patch()
    url = f"{DDRAGON_BASE}/cdn/{patch}/data/en_US/champion.json"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()

    champions = []
    for champ_id, champ_data in data["data"].items():
        champions.append(
            {
                "id": champ_id,
                "name": champ_data["name"],
                "title": champ_data["title"],
                "key": champ_data["key"],
                "icon": f"{DDRAGON_BASE}/cdn/{patch}/img/champion/{champ_id}.png",
                "tags": champ_data.get("tags", []),
                "blurb": champ_data.get("blurb", ""),
            }
        )

    # Sort alphabetically
    champions.sort(key=lambda c: c["name"])
    _champion_cache = champions
    return champions


async def get_champion_by_name(name: str) -> dict | None:
    """Look up a single champion by name (case-insensitive)."""
    champions = await get_all_champions()
    name_lower = name.lower()
    for champ in champions:
        if champ["name"].lower() == name_lower or champ["id"].lower() == name_lower:
            return champ
    return None


def get_champion_icon_url(champion_name: str, patch: str = "14.10.1") -> str:
    """Build Data Dragon icon URL for a champion name."""
    # Normalize common name differences (e.g., 'Wukong' -> 'MonkeyKing')
    name_map = {
        "Wukong": "MonkeyKing",
        "Nunu & Willump": "Nunu",
        "Renata Glasc": "Renata",
        "K'Sante": "KSante",
        "Bel'Veth": "Belveth",
        "Cho'Gath": "Chogath",
        "Kog'Maw": "KogMaw",
        "Kha'Zix": "Khazix",
        "Rek'Sai": "RekSai",
        "Vel'Koz": "Velkoz",
        "Kai'Sa": "Kaisa",
        "Gnar": "Gnar",
        "LeBlanc": "Leblanc",
    }
    normalized = name_map.get(champion_name, champion_name.replace(" ", "").replace("'", ""))
    return f"{DDRAGON_BASE}/cdn/{patch}/img/champion/{normalized}.png"


def invalidate_cache():
    """Force a cache refresh on next request."""
    global _champion_cache, _current_patch
    _champion_cache = None
    _current_patch = None
