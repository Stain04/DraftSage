"""
Auth routes — Supabase-backed user registration and login.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os
from supabase import create_client, Client

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
