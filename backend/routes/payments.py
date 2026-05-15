"""
Lemon Squeezy payments routes — freemium model for DraftSage.
Free: 3 suggestions/day | Pro: $9.99/month unlimited
"""

import os
import hashlib
import hmac
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from supabase import create_client

router = APIRouter(prefix="/api/payments", tags=["payments"])

LS_API_KEY      = os.getenv("LEMONSQUEEZY_API_KEY", "")
LS_STORE_ID     = os.getenv("LEMONSQUEEZY_STORE_ID", "")
LS_VARIANT_ID   = os.getenv("LEMONSQUEEZY_VARIANT_ID", "")   # Pro plan variant
WEBHOOK_SECRET  = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "")

LS_API_BASE = "https://api.lemonsqueezy.com/v1"


def _ls_headers() -> dict:
    return {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": f"Bearer {LS_API_KEY}",
    }


def _get_supabase_admin():
    """Admin Supabase client using the service-role key (bypasses RLS)."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("Supabase not configured.")
    return create_client(url, key)


# ── Request models ─────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    user_id: str
    email: str


# ── Create Checkout ────────────────────────────────────────────────────────────

@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutRequest):
    """Create a Lemon Squeezy checkout and return the hosted checkout URL."""
    if not LS_API_KEY:
        raise HTTPException(status_code=503, detail="Lemon Squeezy not configured. Add LEMONSQUEEZY_API_KEY to backend/.env")
    if not LS_STORE_ID or not LS_VARIANT_ID:
        raise HTTPException(status_code=503, detail="Lemon Squeezy store/variant ID not configured.")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_options": {
                    "embed": False,
                },
                "checkout_data": {
                    "email": body.email,
                    "custom": {
                        "user_id": body.user_id,
                    },
                },
                "product_options": {
                    "redirect_url": f"{frontend_url}/dashboard?upgraded=true",
                },
            },
            "relationships": {
                "store": {
                    "data": {"type": "stores", "id": str(LS_STORE_ID)}
                },
                "variant": {
                    "data": {"type": "variants", "id": str(LS_VARIANT_ID)}
                },
            },
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LS_API_BASE}/checkouts",
            json=payload,
            headers=_ls_headers(),
            timeout=15,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Lemon Squeezy error: {resp.text}")

    checkout_url = resp.json()["data"]["attributes"]["url"]
    return {"url": checkout_url}


# ── Webhook ────────────────────────────────────────────────────────────────────

def _verify_signature(payload_bytes: bytes, signature: str) -> bool:
    """HMAC-SHA256 verification for Lemon Squeezy webhooks."""
    if not WEBHOOK_SECRET:
        return False
    computed = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)


def _set_user_pro(user_id: str, is_pro: bool):
    """Flip is_pro in Supabase user_metadata via the admin API."""
    try:
        sb = _get_supabase_admin()
        sb.auth.admin.update_user_by_id(
            user_id,
            {"user_metadata": {"is_pro": is_pro}},
        )
        status = "Pro" if is_pro else "Free"
        print(f"[LemonSqueezy] User {user_id} → {status}")
    except Exception as e:
        print(f"[LemonSqueezy] ERROR updating user {user_id}: {e}")


@router.post("/webhook")
async def lemonsqueezy_webhook(request: Request):
    payload_bytes = await request.body()
    signature = request.headers.get("X-Signature", "")

    if not _verify_signature(payload_bytes, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event_name = event.get("meta", {}).get("event_name", "")
    custom_data = event.get("meta", {}).get("custom_data", {})
    user_id = custom_data.get("user_id")

    print(f"[LemonSqueezy] Event: {event_name} | user_id: {user_id}")

    # ── Subscription activated → grant Pro ────────────────────────────────────
    if event_name in ("subscription_created", "order_created"):
        if user_id:
            _set_user_pro(user_id, True)

    # ── Subscription resumed / payment recovered → re-grant Pro ───────────────
    elif event_name == "subscription_updated":
        status = event.get("data", {}).get("attributes", {}).get("status", "")
        if status == "active" and user_id:
            _set_user_pro(user_id, True)

    # ── Subscription cancelled / expired / past due → revoke Pro ──────────────
    elif event_name in (
        "subscription_cancelled",
        "subscription_expired",
        "subscription_paused",
    ):
        if user_id:
            _set_user_pro(user_id, False)

    # ── Subscription resumed from pause → re-grant Pro ────────────────────────
    elif event_name == "subscription_resumed":
        if user_id:
            _set_user_pro(user_id, True)

    else:
        print(f"[LemonSqueezy] Unhandled event: {event_name}")

    # Always return 200 so LemonSqueezy doesn't retry
    return {"status": "ok"}


# ── Plans info ─────────────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    """Return plan details for the pricing page."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "features": [
                    "3 AI suggestions per day",
                    "Draft board access",
                    "Champion search",
                ],
                "cta": "Get Started",
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 9.99,
                "features": [
                    "Unlimited AI suggestions",
                    "Ban recommendations",
                    "Champion pool filtering",
                    "Patch tier indicators",
                    "Draft history",
                    "Priority support",
                ],
                "cta": "Upgrade to Pro",
                "highlighted": True,
            },
        ]
    }
