"""
Draft API routes — core DraftSage feature.
Handles champion suggestions and ban recommendations.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional
import os

from services.gemini_service import get_draft_suggestions
from services.riot_service import get_all_champions, get_champion_by_name

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

@router.post("/suggest", response_model=SuggestResponse)
async def suggest_champions(body: SuggestRequest):
    """
    Core AI endpoint — returns top 3 champion pick/ban recommendations
    based on the current draft state using Gemini.
    """
    role = validate_role(body.role)

    if len(body.ally_picks) > 5:
        raise HTTPException(status_code=400, detail="Ally picks cannot exceed 5 champions.")
    if len(body.enemy_picks) > 5:
        raise HTTPException(status_code=400, detail="Enemy picks cannot exceed 5 champions.")

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
            detail=f"AI analysis failed: {str(e)}",
        )

    return result
