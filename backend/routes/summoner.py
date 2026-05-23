"""
Summoner API routes — Riot account linking, match history, ranked stats.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.riot_api_service import (
    get_summoner_profile,
    get_puuid,
    REGIONS,
)
from auth_utils import (
    extract_bearer_token, verify_jwt,
    get_admin_supabase,
)

router = APIRouter(prefix="/api/summoner", tags=["summoner"])


# ── Request / Response Models ──────────────────────────────────────────────────

class LinkRequest(BaseModel):
    game_name: str = Field(..., description="Riot ID game name (e.g. 'Fahdl')")
    tag_line: str = Field(..., description="Riot ID tag line (e.g. 'NA1')")
    region: str = Field(default="na1", description="Region code (na1, euw1, kr, etc.)")


class ProfileRequest(BaseModel):
    game_name: str
    tag_line: str
    region: str = "na1"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/regions")
async def list_regions():
    """Return available region codes for the frontend dropdown."""
    return {"regions": REGIONS}


@router.post("/link")
async def link_riot_account(req: LinkRequest, request: Request):
    """
    Link a Riot account to the authenticated user.
    Validates the Riot ID exists, fetches profile data, and stores
    puuid + region in Supabase user_metadata.
    """
    token = extract_bearer_token(request)
    user = verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    region = req.region.lower().strip()
    if region not in REGIONS:
        raise HTTPException(status_code=400, detail=f"Invalid region. Choose from: {', '.join(REGIONS)}")

    # Validate Riot ID exists
    account = await get_puuid(req.game_name, req.tag_line, region)
    if not account:
        raise HTTPException(status_code=404, detail="Riot account not found. Check your Riot ID (name#tag).")

    # Store in Supabase user_metadata
    try:
        sb = get_admin_supabase()
        existing_meta = user.user_metadata or {}
        sb.auth.admin.update_user_by_id(
            user.id,
            {"user_metadata": {
                **existing_meta,
                "riot_puuid": account["puuid"],
                "riot_game_name": account["gameName"],
                "riot_tag_line": account["tagLine"],
                "riot_region": region,
            }},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Riot account: {e}")

    return {
        "linked": True,
        "gameName": account["gameName"],
        "tagLine": account["tagLine"],
        "region": region,
    }


@router.post("/unlink")
async def unlink_riot_account(request: Request):
    """Remove Riot account link from user metadata."""
    token = extract_bearer_token(request)
    user = verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        sb = get_admin_supabase()
        existing_meta = user.user_metadata or {}
        # Remove riot fields
        for key in ("riot_puuid", "riot_game_name", "riot_tag_line", "riot_region"):
            existing_meta.pop(key, None)
        sb.auth.admin.update_user_by_id(
            user.id,
            {"user_metadata": existing_meta},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlink: {e}")

    return {"linked": False}


@router.post("/profile")
async def fetch_profile(req: ProfileRequest, request: Request):
    """
    Fetch full summoner profile: ranked stats, mastery, recent performance.
    Does NOT require authentication — anyone can look up a summoner.
    But if authenticated and linked, returns personalized data.
    """
    region = req.region.lower().strip()
    if region not in REGIONS:
        raise HTTPException(status_code=400, detail=f"Invalid region. Choose from: {', '.join(REGIONS)}")

    try:
        profile = await get_summoner_profile(req.game_name, req.tag_line, region)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Riot API error: {e}")

    if not profile:
        raise HTTPException(status_code=404, detail="Summoner not found.")

    return profile


@router.get("/me")
async def get_my_profile(request: Request):
    """
    Fetch profile for the currently linked Riot account.
    Returns 404 if no account is linked.
    """
    token = extract_bearer_token(request)
    user = verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    meta = user.user_metadata or {}
    puuid = meta.get("riot_puuid")
    game_name = meta.get("riot_game_name")
    tag_line = meta.get("riot_tag_line")
    region = meta.get("riot_region", "na1")

    if not puuid:
        raise HTTPException(status_code=404, detail="No Riot account linked. Link one on the Dashboard.")

    try:
        profile = await get_summoner_profile(game_name, tag_line, region)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Riot API error: {e}")

    if not profile:
        raise HTTPException(status_code=404, detail="Linked Riot account not found.")

    return profile
