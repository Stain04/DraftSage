"""
Daily-usage tracking for Pro accounts.

Pro is advertised as 'unlimited' but we cap at PRO_DAILY_CAP per UTC day
to prevent account-sharing abuse. A real solo user is nowhere near this
cap; 10 friends sharing one account WILL hit it.

We count from the draft_history table — every successful Pro suggestion
inserts a row, so counting today's rows for the user gives us the day's
usage with no extra table needed.
"""

from datetime import datetime, timezone
from auth_utils import get_admin_supabase

# Generous enough that no real human hits it, low enough that account-sharers do.
# Tune via env var if needed.
import os
try:
    PRO_DAILY_CAP = int(os.getenv("PRO_DAILY_CAP", "200"))
except (ValueError, TypeError):
    PRO_DAILY_CAP = 200


def _today_start_iso() -> str:
    """ISO timestamp at the start of the current UTC day."""
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def get_pro_daily_count(user_id: str) -> int:
    """
    Count today's draft_history rows for a user. Used to enforce PRO_DAILY_CAP.
    Returns 0 on any error (fail-open — we don't want a Supabase blip to
    block all Pro users from working).
    """
    if not user_id:
        return 0
    try:
        sb = get_admin_supabase()
        response = (
            sb.table("draft_history")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", _today_start_iso())
            .execute()
        )
        return int(response.count or 0)
    except Exception as e:
        # Fail-open: log + allow the request through.
        print(f"[usage_service] daily count lookup failed for {user_id}: {e}")
        return 0
