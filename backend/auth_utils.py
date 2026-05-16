"""
Shared auth helpers — JWT verification + Supabase client factories.
Used by routes that need to know who the calling user is.
"""

import os
from typing import Optional
from fastapi import Request
from supabase import create_client, Client

_anon_client:  Optional[Client] = None
_admin_client: Optional[Client] = None


def get_anon_supabase() -> Client:
    """Anon client — used for verifying user JWTs."""
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_KEY", ""),
        )
    return _anon_client


def get_admin_supabase() -> Client:
    """Service-role client — used for reading/writing user_metadata + RLS-bypass queries."""
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", ""),
        )
    return _admin_client


def extract_bearer_token(request: Request) -> Optional[str]:
    """Pull a JWT from the Authorization header (case-insensitive)."""
    header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not header:
        return None
    parts = header.strip().split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return header.strip()


def verify_jwt(token: Optional[str]):
    """
    Verify a Supabase JWT and return the user object, or None on failure.
    Soft-fails — anonymous (unauthenticated) requests are still allowed elsewhere.
    """
    if not token:
        return None
    try:
        sb = get_anon_supabase()
        result = sb.auth.get_user(token)
        return result.user
    except Exception:
        return None


def get_session_id_header(request: Request) -> Optional[str]:
    """Pull X-Session-Id from headers (case-insensitive)."""
    return (
        request.headers.get("X-Session-Id")
        or request.headers.get("x-session-id")
    )


def is_user_pro(user) -> bool:
    """Centralized Pro/Admin check — read from user_metadata."""
    if not user:
        return False
    meta = user.user_metadata or {}
    return bool(meta.get("is_pro")) or bool(meta.get("is_admin"))


def is_user_admin(user) -> bool:
    if not user:
        return False
    meta = user.user_metadata or {}
    return bool(meta.get("is_admin"))
