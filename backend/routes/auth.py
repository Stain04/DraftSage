"""
Auth routes — Supabase-backed user registration, login, session-claim.
"""

import uuid
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
import os
from supabase import create_client, Client

from auth_utils import (
    extract_bearer_token, verify_jwt, get_admin_supabase,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Supabase not configured.")
    return create_client(url, key)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    summoner_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(body: RegisterRequest):
    supabase = get_supabase()
    try:
        res = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
        user = res.user
        if user and body.summoner_name:
            supabase.table("profiles").upsert(
                {"id": user.id, "summoner_name": body.summoner_name}
            ).execute()
        return {"message": "Registration successful. Check your email to confirm.", "user_id": user.id if user else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    supabase = get_supabase()
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "user_metadata": res.user.user_metadata or {},
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials.")


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully."}


# ── Session claim ─────────────────────────────────────────────────────────────
# Concurrent-session-limit enforcement: each new sign-in calls this to mint a
# fresh session_id and store it on the user's metadata. Future requests must
# present the matching X-Session-Id; older devices' sessions become invalid.

@router.post("/claim-session")
async def claim_session(request: Request):
    """
    Mint a new session_id, store it on user_metadata.current_session_id,
    and return it. Invalidates any previously-active session for this account.
    Frontend stores the returned id and sends it back via the X-Session-Id
    header on subsequent requests.
    """
    token = extract_bearer_token(request)
    user  = verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    new_session_id = str(uuid.uuid4())
    existing_meta  = user.user_metadata or {}

    try:
        sb_admin = get_admin_supabase()
        sb_admin.auth.admin.update_user_by_id(
            user.id,
            {"user_metadata": {**existing_meta, "current_session_id": new_session_id}},
        )
    except Exception as e:
        # If we can't update metadata, don't break sign-in — just don't enforce.
        print(f"[claim-session] update_user_by_id failed for {user.id}: {e}")
        return {"session_id": new_session_id, "enforced": False}

    return {"session_id": new_session_id, "enforced": True}
