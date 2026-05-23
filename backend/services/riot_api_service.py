"""
Riot Games API service for DraftSage.

Fetches match history, ranked stats, and champion mastery data.
Uses the Riot API with proper regional routing.

Endpoints used:
  - account-v1: Riot ID → PUUID
  - match-v5: Recent match history
  - league-v4: Ranked stats
  - champion-mastery-v4: Top champions + mastery
"""

import os
import httpx

RIOT_API_KEY = os.environ.get("RIOT_API_KEY", "")

# Platform routing (for league-v4, champion-mastery-v4, summoner-v4)
PLATFORM_BASE = {
    "na1":   "https://na1.api.riotgames.com",
    "br1":   "https://br1.api.riotgames.com",
    "la1":   "https://la1.api.riotgames.com",
    "la2":   "https://la2.api.riotgames.com",
    "euw1":  "https://euw1.api.riotgames.com",
    "eun1":  "https://eun1.api.riotgames.com",
    "tr1":   "https://tr1.api.riotgames.com",
    "ru":    "https://ru.api.riotgames.com",
    "me1":   "https://me1.api.riotgames.com",
    "kr":    "https://kr.api.riotgames.com",
    "jp1":   "https://jp1.api.riotgames.com",
    "oc1":   "https://oc1.api.riotgames.com",
    "ph2":   "https://ph2.api.riotgames.com",
    "sg2":   "https://sg2.api.riotgames.com",
    "th2":   "https://th2.api.riotgames.com",
    "tw2":   "https://tw2.api.riotgames.com",
    "vn2":   "https://vn2.api.riotgames.com",
}

# Account/Match regional routing — maps game region to the correct
# regional shard for account-v1 and match-v5 lookups.
ACCOUNT_REGION = {
    "na1": "americas", "br1": "americas", "la1": "americas", "la2": "americas",
    "euw1": "europe", "eun1": "europe", "tr1": "europe", "ru": "europe", "me1": "europe",
    "kr": "asia", "jp1": "asia",
    "oc1": "sea", "ph2": "sea", "sg2": "sea", "th2": "sea", "tw2": "sea", "vn2": "sea",
}

REGIONS = list(PLATFORM_BASE.keys())


def _headers() -> dict:
    return {"X-Riot-Token": RIOT_API_KEY}


async def _get(url: str, params: dict | None = None) -> dict:
    """Make a GET request to the Riot API with error handling."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers=_headers(), params=params)
        if resp.status_code == 404:
            return {}
        if resp.status_code == 403:
            print(f"[RiotAPI] 403 Forbidden — check RIOT_API_KEY is valid: {url}", flush=True)
            return {}
        if resp.status_code == 401:
            print(f"[RiotAPI] 401 Unauthorized — RIOT_API_KEY may be expired: {url}", flush=True)
            return {}
        resp.raise_for_status()
        return resp.json()


# ── Account lookup ───────────────────────────────────────────────────────────

async def get_puuid(game_name: str, tag_line: str, region: str = "na1") -> dict | None:
    """
    Resolve a Riot ID (gameName#tagLine) to a PUUID.
    Uses the correct regional shard for the account lookup.
    Returns {"puuid": "...", "gameName": "...", "tagLine": "..."} or None.
    """
    shard = ACCOUNT_REGION.get(region, "americas")
    url = f"https://{shard}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    data = await _get(url)
    if not data or "puuid" not in data:
        return None
    return {
        "puuid": data["puuid"],
        "gameName": data.get("gameName", game_name),
        "tagLine": data.get("tagLine", tag_line),
    }


# ── Match history ────────────────────────────────────────────────────────────

async def get_match_ids(puuid: str, region: str = "na1", count: int = 20) -> list[str]:
    """Get recent ranked match IDs for a PUUID."""
    shard = ACCOUNT_REGION.get(region, "americas")
    url = f"https://{shard}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
    data = await _get(url, params={"count": count, "type": "ranked"})
    return data if isinstance(data, list) else []


async def get_match_details(match_id: str, region: str = "na1") -> dict | None:
    """Get full match details by match ID."""
    shard = ACCOUNT_REGION.get(region, "americas")
    url = f"https://{shard}.api.riotgames.com/lol/match/v5/matches/{match_id}"
    return await _get(url) or None


async def get_match_history(puuid: str, region: str = "na1", count: int = 20) -> list[dict]:
    """
    Fetch recent match history and extract per-match stats for the player.
    Returns list of: {champion, kills, deaths, assists, win, role, lane, gameDuration, cs}
    """
    match_ids = await get_match_ids(puuid, region, count)
    if not match_ids:
        return []

    matches = []
    for mid in match_ids[:count]:
        data = await get_match_details(mid, region)
        if not data or "info" not in data:
            continue

        info = data["info"]
        participant = None
        for p in info.get("participants", []):
            if p.get("puuid") == puuid:
                participant = p
                break

        if not participant:
            continue

        matches.append({
            "champion": participant.get("championName", ""),
            "kills": participant.get("kills", 0),
            "deaths": participant.get("deaths", 0),
            "assists": participant.get("assists", 0),
            "win": participant.get("win", False),
            "role": participant.get("role", ""),
            "lane": participant.get("lane", ""),
            "gameDuration": info.get("gameDuration", 0),
            "cs": participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0),
            "gameMode": info.get("gameMode", ""),
        })

    return matches


# ── Ranked stats ─────────────────────────────────────────────────────────────

async def get_ranked_stats(puuid: str, region: str = "na1") -> dict | None:
    """
    Get ranked league entries for a PUUID.
    Returns solo queue data: {tier, rank, leaguePoints, wins, losses, winRate}
    """
    base = PLATFORM_BASE.get(region, PLATFORM_BASE["na1"])
    url = f"{base}/lol/league/v4/entries/by-puuid/{puuid}"
    data = await _get(url)

    if not isinstance(data, list):
        return None

    for entry in data:
        if entry.get("queueType") == "RANKED_SOLO_5x5":
            wins = entry.get("wins", 0)
            losses = entry.get("losses", 0)
            total = wins + losses
            return {
                "tier": entry.get("tier", "UNRANKED"),
                "rank": entry.get("rank", ""),
                "leaguePoints": entry.get("leaguePoints", 0),
                "wins": wins,
                "losses": losses,
                "winRate": round(wins / total * 100, 1) if total > 0 else 0,
            }

    return {"tier": "UNRANKED", "rank": "", "leaguePoints": 0, "wins": 0, "losses": 0, "winRate": 0}


# ── Champion mastery ─────────────────────────────────────────────────────────

async def get_top_mastery(puuid: str, region: str = "na1", count: int = 10) -> list[dict]:
    """
    Get top champion masteries for a PUUID.
    Returns list of: {championId, championLevel, championPoints}
    """
    base = PLATFORM_BASE.get(region, PLATFORM_BASE["na1"])
    url = f"{base}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top"
    data = await _get(url, params={"count": count})

    if not isinstance(data, list):
        return []

    return [
        {
            "championId": entry.get("championId", 0),
            "championLevel": entry.get("championLevel", 0),
            "championPoints": entry.get("championPoints", 0),
        }
        for entry in data
    ]


# ── Aggregate: full summoner profile ─────────────────────────────────────────

async def get_summoner_profile(game_name: str, tag_line: str, region: str = "na1") -> dict | None:
    """
    Fetch complete summoner profile: account info + ranked + mastery + recent stats.
    Returns dict with all data or None if account not found.
    """
    if not RIOT_API_KEY:
        raise RuntimeError("RIOT_API_KEY not configured.")

    account = await get_puuid(game_name, tag_line, region)
    if not account:
        return None

    puuid = account["puuid"]

    # Fetch all data in parallel would be ideal but httpx async makes
    # sequential calls straightforward. For now, sequential.
    ranked = await get_ranked_stats(puuid, region)
    mastery = await get_top_mastery(puuid, region, count=10)
    recent = await get_match_history(puuid, region, count=20)

    # Build per-champion stats from recent matches
    champ_stats: dict[str, dict] = {}
    for m in recent:
        c = m["champion"]
        if c not in champ_stats:
            champ_stats[c] = {"wins": 0, "losses": 0, "kills": 0, "deaths": 0, "assists": 0, "games": 0}
        s = champ_stats[c]
        s["games"] += 1
        s["kills"] += m["kills"]
        s["deaths"] += m["deaths"]
        s["assists"] += m["assists"]
        if m["win"]:
            s["wins"] += 1
        else:
            s["losses"] += 1

    # Calculate WR and KDA per champion
    champion_performance = []
    for champ, s in sorted(champ_stats.items(), key=lambda x: x[1]["games"], reverse=True):
        games = s["games"]
        avg_kda = f"{s['kills']/games:.1f}/{s['deaths']/games:.1f}/{s['assists']/games:.1f}"
        champion_performance.append({
            "champion": champ,
            "games": games,
            "wins": s["wins"],
            "losses": s["losses"],
            "winRate": round(s["wins"] / games * 100, 1) if games > 0 else 0,
            "kda": avg_kda,
        })

    return {
        "gameName": account["gameName"],
        "tagLine": account["tagLine"],
        "puuid": puuid,
        "region": region,
        "ranked": ranked,
        "mastery": mastery,
        "championPerformance": champion_performance,
        "recentMatches": recent[:10],  # last 10 for display
    }
