"""
Draft API routes — core DraftSage feature.
Handles champion suggestions and ban recommendations.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

from services.gemini_service import get_draft_suggestions
from services.usage_service   import get_pro_daily_count, PRO_DAILY_CAP
from auth_utils import (
    extract_bearer_token, verify_jwt, get_session_id_header,
    is_user_pro, is_user_admin,
)

router = APIRouter(prefix="/api/draft", tags=["draft"])

ROLES = {"Top", "Jungle", "Mid", "Bot", "Support"}


# ── Request / Response Models ──────────────────────────────────────────────────

class SuggestRequest(BaseModel):
    ally_picks: list[str] = Field(default=[], description="Ally champion names already picked")
    enemy_picks: list[str] = Field(default=[], description="Enemy champion names already picked")
    role: str = Field(..., description="Role to fill: Top, Jungle, Mid, Bot, Support")
    champion_pool: Optional[list[str]] = Field(
        default=None, description="Optional list of champions the user plays (Pro tier)"
    )
    ban_mode: bool = Field(default=False, description="If true, suggest bans instead of picks")


class Recommendation(BaseModel):
    champion: str
    reason: str
    win_condition: str
    difficulty: str
    synergies: list[str] = []
    counters: list[str] = []


class SuggestResponse(BaseModel):
    recommendations: list[Recommendation]
    why_not: str
    team_win_condition: str
    composition_type: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def validate_role(role: str) -> str:
    normalized = role.strip().capitalize()
    if normalized not in ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role}'. Must be one of: {', '.join(ROLES)}",
        )
    return normalized


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/suggest")
async def suggest_champions(body: SuggestRequest, request: Request):
    """
    Core Engine endpoint — returns top 3 pick/ban recommendations
    based on the current draft state.

    Auth / abuse protection (only enforced when a valid JWT is present —
    anonymous requests still work for the free-tier flow):

      1. Session match — X-Session-Id header must equal the user's
         current_session_id in user_metadata. Newer sign-ins invalidate
         older sessions, so account-sharing breaks (the 10th device kicks
         out the 1st).

      2. Pro daily cap — Pro accounts capped at PRO_DAILY_CAP (default
         200) successful runs per UTC day to deter 'unlimited' tier abuse.
         Admins are exempt.
    """
    role = validate_role(body.role)

    if len(body.ally_picks) > 5:
        raise HTTPException(status_code=400, detail="Ally picks cannot exceed 5 champions.")
    if len(body.enemy_picks) > 5:
        raise HTTPException(status_code=400, detail="Enemy picks cannot exceed 5 champions.")

    # ── Auth + abuse protection ────────────────────────────────────────────
    token = extract_bearer_token(request)
    user  = verify_jwt(token) if token else None

    if user:
        meta = user.user_metadata or {}

        # Concurrent-session enforcement
        current_session_id = meta.get("current_session_id")
        provided_session_id = get_session_id_header(request)
        if (
            current_session_id
            and provided_session_id
            and current_session_id != provided_session_id
        ):
            raise HTTPException(
                status_code=401,
                detail="session_invalidated",
            )

        # Pro daily cap — admins exempt
        if is_user_pro(user) and not is_user_admin(user):
            try:
                used_today = get_pro_daily_count(user.id)
            except Exception:
                used_today = 0
            if used_today >= PRO_DAILY_CAP:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        f"Daily Engine cap reached ({PRO_DAILY_CAP}/day). "
                        "Resets at 00:00 UTC — come back then."
                    ),
                )

    # ── Run the Engine ──────────────────────────────────────────────────────
    try:
        result = await get_draft_suggestions(
            ally_picks=body.ally_picks,
            enemy_picks=body.enemy_picks,
            role=role,
            champion_pool=body.champion_pool,
            ban_mode=body.ban_mode,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Engine analysis failed: {str(e)}",
        )

    return result
