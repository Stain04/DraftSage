"""
Paddle Billing payments routes — freemium model for DraftSage.
Free: 3 suggestions/day | Pro: $9.99/month or $79/year, unlimited
"""

import hashlib
import hmac
import json
import os

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from supabase import create_client

router = APIRouter(prefix="/api/payments", tags=["payments"])

# ── Paddle config (set these in Railway env vars) ──────────────────────────────
PADDLE_API_KEY          = os.getenv("PADDLE_API_KEY", "")
PADDLE_WEBHOOK_SECRET   = os.getenv("PADDLE_WEBHOOK_SECRET", "")
PADDLE_PRICE_ID_MONTHLY = os.getenv("PADDLE_PRICE_ID_MONTHLY", "")   # pri_xxxxx
PADDLE_PRICE_ID_YEARLY  = os.getenv("PADDLE_PRICE_ID_YEARLY", "")    # pri_xxxxx

# Paddle API base — use sandbox for testing, live for prod
PADDLE_IS_SANDBOX = os.getenv("PADDLE_SANDBOX", "false").lower() == "true"
PADDLE_API_BASE   = (
    "https://sandbox-api.paddle.com" if PADDLE_IS_SANDBOX
    else "https://api.paddle.com"
)


def _paddle_headers() -> dict:
    return {
        "Authorization": f"Bearer {PADDLE_API_KEY}",
        "Content-Type": "application/json",
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
    billing_period: str = "monthly"   # "monthly" | "yearly"


# ── Create Checkout (Paddle hosted checkout) ───────────────────────────────────

@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutRequest):
    """
    Create a Paddle transaction (checkout) and return the hosted payment URL.
    Paddle's checkout page handles the full payment flow — no card data touches our server.
    """
    if not PADDLE_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Paddle not configured. Add PADDLE_API_KEY to Railway environment variables.",
        )

    period_normalized = (body.billing_period or "monthly").lower()

    if period_normalized == "yearly":
        price_id = PADDLE_PRICE_ID_YEARLY
        if not price_id:
            raise HTTPException(
                status_code=503,
                detail="Yearly plan not configured. Set PADDLE_PRICE_ID_YEARLY in Railway.",
            )
    else:
        price_id = PADDLE_PRICE_ID_MONTHLY
        if not price_id:
            raise HTTPException(
                status_code=503,
                detail="Monthly plan not configured. Set PADDLE_PRICE_ID_MONTHLY in Railway.",
            )

    frontend_url = os.getenv("FRONTEND_URL", "https://www.draftsage.pro")

    # Paddle transaction create — passes custom_data so the webhook can resolve user_id
    payload = {
        "items": [
            {"price_id": price_id, "quantity": 1}
        ],
        "customer": {
            "email": body.email,
        },
        "custom_data": {
            "user_id": body.user_id,
            "email":   body.email,
            "billing_period": period_normalized,
        },
        "checkout": {
            "url": f"{frontend_url}/dashboard?upgraded=true",
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PADDLE_API_BASE}/transactions",
            json=payload,
            headers=_paddle_headers(),
            timeout=15,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Paddle error: {resp.text}")

    data = resp.json().get("data", {})
    checkout_url = data.get("checkout", {}).get("url")

    if not checkout_url:
        raise HTTPException(status_code=502, detail="Paddle did not return a checkout URL.")

    return {"url": checkout_url}


# ── Webhook verification ───────────────────────────────────────────────────────

def _verify_paddle_signature(request_headers: dict, payload_bytes: bytes) -> bool:
    """
    Paddle webhook signature verification.
    Paddle sends: Paddle-Signature: ts=<timestamp>;h1=<hmac_sha256>
    We reconstruct: HMAC-SHA256(secret_key, ts:body)
    """
    if not PADDLE_WEBHOOK_SECRET:
        print("[Paddle] WARNING: PADDLE_WEBHOOK_SECRET not set — skipping verification")
        return True  # don't block if unconfigured (fail-open in dev)

    sig_header = request_headers.get("paddle-signature", "")
    if not sig_header:
        return False

    # Parse ts and h1 from the header
    parts = dict(part.split("=", 1) for part in sig_header.split(";") if "=" in part)
    ts  = parts.get("ts", "")
    h1  = parts.get("h1", "")

    if not ts or not h1:
        return False

    # Build the signed payload: "<timestamp>:<raw_body>"
    signed_payload = f"{ts}:{payload_bytes.decode('utf-8')}"

    computed = hmac.new(
        PADDLE_WEBHOOK_SECRET.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed, h1)


# ── Supabase helpers ───────────────────────────────────────────────────────────

def _set_user_pro(user_id: str, is_pro: bool):
    """Flip is_pro in Supabase user_metadata via the admin API."""
    try:
        sb = _get_supabase_admin()
        sb.auth.admin.update_user_by_id(
            user_id,
            {"user_metadata": {"is_pro": is_pro}},
        )
        status = "Pro" if is_pro else "Free"
        print(f"[Paddle] User {user_id} → {status}")
    except Exception as e:
        print(f"[Paddle] ERROR updating user {user_id}: {e}")


def _resolve_user_id(custom_data: dict) -> str | None:
    """
    Resolve Supabase user_id from Paddle webhook custom_data.
    Primary:  custom_data.user_id  (attached at checkout creation)
    Fallback: lookup by email in Supabase
    """
    user_id = custom_data.get("user_id")
    if user_id:
        return user_id

    email = custom_data.get("email")
    if not email:
        return None

    try:
        sb = _get_supabase_admin()
        result = sb.auth.admin.list_users()
        for u in result:
            if hasattr(u, "email") and u.email == email:
                print(f"[Paddle] Resolved user_id by email: {email} → {u.id}")
                return u.id
    except Exception as e:
        print(f"[Paddle] Email lookup failed: {e}")

    return None


# ── Webhook handler ────────────────────────────────────────────────────────────

@router.post("/webhook")
async def paddle_webhook(request: Request):
    """
    Handles all Paddle subscription events.
    Paddle retries failed webhooks for up to 72 hours — always return 200.
    """
    payload_bytes = await request.body()

    if not _verify_paddle_signature(dict(request.headers), payload_bytes):
        raise HTTPException(status_code=400, detail="Invalid Paddle webhook signature.")

    try:
        event = json.loads(payload_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event_type  = event.get("event_type", "")
    event_data  = event.get("data", {})
    custom_data = event_data.get("custom_data") or {}
    user_id     = _resolve_user_id(custom_data)

    print(f"[Paddle] Event: {event_type} | user_id: {user_id} | custom_data: {custom_data}")

    # ── Subscription created / activated → grant Pro ───────────────────────────
    if event_type in ("subscription.created", "subscription.activated"):
        if user_id:
            _set_user_pro(user_id, True)

    # ── Subscription updated → check status and sync ───────────────────────────
    elif event_type == "subscription.updated":
        status = event_data.get("status", "")
        if status == "active" and user_id:
            _set_user_pro(user_id, True)
        elif status in ("canceled", "past_due", "paused") and user_id:
            _set_user_pro(user_id, False)

    # ── Subscription cancelled / paused → revoke Pro ──────────────────────────
    elif event_type in ("subscription.canceled", "subscription.paused"):
        if user_id:
            _set_user_pro(user_id, False)

    # ── Subscription resumed → re-grant Pro ───────────────────────────────────
    elif event_type == "subscription.resumed":
        if user_id:
            _set_user_pro(user_id, True)

    # ── Payment succeeded (one-off confirmation) ───────────────────────────────
    elif event_type == "transaction.completed":
        # Subscriptions handle their own lifecycle events above.
        # This fires for the initial transaction — set Pro here as a safety net.
        if user_id:
            _set_user_pro(user_id, True)

    else:
        print(f"[Paddle] Unhandled event: {event_type}")

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
                "id": "pro_monthly",
                "name": "Pro",
                "price": 9.99,
                "billing_period": "monthly",
                "features": [
                    "Unlimited AI suggestions",
                    "Team Composition Gap Analyzer",
                    "Avoidance Intelligence (do-not-pick list)",
                    "Confidence scoring + reasoning breakdown",
                    "Ban recommendations",
                    "Champion pool filtering",
                    "Patch tier indicators",
                    "Cloud-synced draft history",
                    "Priority AI model routing",
                    "Priority support",
                ],
                "cta": "Upgrade to Pro",
                "highlighted": True,
            },
            {
                "id": "pro_yearly",
                "name": "Pro Yearly",
                "price": 79,
                "billing_period": "yearly",
                "effective_monthly": 6.58,
                "savings_pct": 34,
                "features": [
                    "Everything in Pro Monthly",
                    "Save 34% vs monthly",
                    "Early access to new features",
                ],
                "cta": "Go Yearly · Save 34%",
                "best_value": True,
            },
        ]
    }
