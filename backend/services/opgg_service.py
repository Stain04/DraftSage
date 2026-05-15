"""
OP.GG MCP service for DraftSage.
Uses the official OP.GG MCP API (https://mcp-api.op.gg/mcp) to fetch
authoritative tier list data — more accurate than position-based guessing.

Counter data is intentionally kept in lolalytics_service.py (bulk counter
queries are not supported by the OP.GG MCP tool set — it requires specific
1v1 pairs). Only the tier list is sourced from OP.GG.
"""

import re
import asyncio
import httpx
from typing import Optional

OPGG_MCP_URL = "https://mcp-api.op.gg/mcp"

ROLE_POSITION_MAP = {
    "Top":     "top",
    "Jungle":  "jungle",
    "Mid":     "mid",
    "Bot":     "bottom",
    "Support": "support",
}

# Regex to parse each champion entry from the OP.GG MCP custom class notation.
# Format: Top("ChampionName",is_rip,play,win,kills,win_rate,pick_rate,role_rate,ban_rate,kda,tier,rank,...)
# Example: Top("Malphite",false,921682,480255,4108149,0.52,0.07,0.8,0.19,2.47,1,1,1,2)
_CHAMP_ROW = re.compile(
    r'Top\("([^"]+)"'               # group 1: champion name
    r',(?:false|true)'              # is_rip (skip)
    r',\d+'                         # play count (skip)
    r',\d+'                         # win count (skip)
    r',\d+'                         # kill count (skip)
    r',([\d.]+)'                    # group 2: win_rate  (0.52 = 52%)
    r',([\d.]+)'                    # group 3: pick_rate (0.07 = 7%)
    r',[\d.]+'                      # role_rate (skip)
    r',([\d.]+)'                    # group 4: ban_rate  (0.19 = 19%)
    r',[\d.]+'                      # kda (skip)
    r',(\d+)'                       # group 5: tier      (1=S, 2=A, 3=B)
    r',(\d+)',                      # group 6: rank      (1, 2, 3...)
)

TIER_LABEL_MAP = {
    1: "S",
    2: "A",
    3: "B",
}


async def _mcp_call(method: str, params: dict) -> Optional[dict]:
    """
    Send a JSON-RPC 2.0 request to the OP.GG MCP server.
    Returns the result dict or None on failure.
    """
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                OPGG_MCP_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            data = r.json()
            if "error" in data:
                return None
            return data.get("result")
    except Exception:
        return None


def _parse_tier_list_text(text: str) -> list[dict]:
    """
    Parse the OP.GG MCP custom class notation for lane meta champions.
    Returns a list of dicts sorted by rank (ascending), each containing:
      {champion, tier, tier_label, rank, win_rate, pick_rate, ban_rate}
    """
    champions = []
    for m in _CHAMP_ROW.finditer(text):
        name      = m.group(1).strip()
        win_rate  = float(m.group(2))   # e.g. 0.52
        pick_rate = float(m.group(3))
        ban_rate  = float(m.group(4))
        tier      = int(m.group(5))     # 1, 2, or 3
        rank      = int(m.group(6))

        champions.append({
            "champion":   name,
            "tier":       tier,
            "tier_label": TIER_LABEL_MAP.get(tier, "C"),
            "rank":       rank,
            "win_rate":   round(win_rate * 100, 1),   # convert to percent
            "pick_rate":  round(pick_rate * 100, 1),
            "ban_rate":   round(ban_rate * 100, 1),
        })

    # Sort by rank (ascending = strongest first)
    return sorted(champions, key=lambda x: x["rank"])


async def fetch_lane_tier_list(role: str) -> list[dict]:
    """
    Fetch the current patch tier list for a given role from OP.GG MCP.
    Returns an ordered list of champion dicts (rank 1 first), each with:
      {champion, tier, tier_label, rank, win_rate, pick_rate, ban_rate}

    Falls back to empty list if the API is unavailable.
    """
    position = ROLE_POSITION_MAP.get(role, "top")
    result = await _mcp_call(
        "tools/call",
        {
            "name": "lol_list_lane_meta_champions",
            "arguments": {"position": position},
        },
    )
    if not result:
        return []

    # The MCP server returns content as a list of {type, text} items
    content = result.get("content", [])
    for item in content:
        if item.get("type") == "text":
            text = item.get("text", "")
            parsed = _parse_tier_list_text(text)
            if parsed:
                return parsed

    return []


def build_tier_lookup(tier_list: list[dict]) -> dict[str, dict]:
    """
    Build a fast lookup dict: champion_name_lower → tier info.
    Used by gemini_service to attach patch_tier to each recommendation.
    """
    return {entry["champion"].lower(): entry for entry in tier_list}
