"""
Manual webhook test for Lemon Squeezy integration.
Simulates a subscription_created event to flip is_pro on a user.

Usage:
    python test_webhook.py <user_id> [grant|revoke]

Examples:
    python test_webhook.py abc123-your-user-id grant
    python test_webhook.py abc123-your-user-id revoke
"""

import sys
import json
import hmac
import hashlib
import httpx

# ── Config ─────────────────────────────────────────────────────────────────────
BACKEND_URL      = "http://localhost:8000"
WEBHOOK_SECRET   = "draftsage_webhook_2026"
# ───────────────────────────────────────────────────────────────────────────────

def make_event(user_id: str, event_name: str) -> dict:
    return {
        "meta": {
            "event_name": event_name,
            "custom_data": {
                "user_id": user_id,
            },
        },
        "data": {
            "attributes": {
                "status": "active",
            }
        },
    }

def sign(payload_bytes: bytes, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

def send_webhook(user_id: str, grant: bool):
    event_name = "subscription_created" if grant else "subscription_cancelled"
    event = make_event(user_id, event_name)
    payload = json.dumps(event).encode("utf-8")
    signature = sign(payload, WEBHOOK_SECRET)

    print(f"\n📤 Sending '{event_name}' webhook for user: {user_id}")
    print(f"   Signature: {signature[:20]}...")

    resp = httpx.post(
        f"{BACKEND_URL}/api/payments/webhook",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Signature": signature,
        },
        timeout=10,
    )

    if resp.status_code == 200:
        action = "✅ Upgraded to Pro!" if grant else "✅ Reverted to Free!"
        print(f"   {action}")
    else:
        print(f"   ❌ Failed ({resp.status_code}): {resp.text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    user_id = sys.argv[1]
    action  = sys.argv[2] if len(sys.argv) > 2 else "grant"
    grant   = action.lower() != "revoke"

    send_webhook(user_id, grant)
    print()
