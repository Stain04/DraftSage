import React from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Subtle persistent watermark showing the signed-in account.
 *
 * Two purposes:
 *   1. Trust — paying users see "Logged in as their@email" and know it's theirs.
 *   2. Psychological deterrent against account-sharing — the original buyer
 *      doesn't want their personal email shown to people they're sharing
 *      with, and the borrowers see "this isn't my account" on every page.
 *
 * Fixed to the bottom-left corner with low opacity. Mounts globally inside
 * App.jsx and renders nothing when no user is signed in.
 */
export default function EmailWatermark() {
  const { user } = useAuth();
  if (!user?.email) return null;

  return (
    <div
      className="fixed bottom-3 left-3 z-30 pointer-events-none select-none
                 opacity-25 hover:opacity-70 transition-opacity duration-300"
      aria-hidden="true"
    >
      <div className="font-mono text-[10px] text-navy-200 bg-navy-900/60 backdrop-blur-sm
                      px-2 py-1 rounded-md border border-navy-700/60 shadow-lg">
        <span className="text-navy-400">{"// logged in as "}</span>
        <span className="text-gold">{user.email}</span>
      </div>
    </div>
  );
}
