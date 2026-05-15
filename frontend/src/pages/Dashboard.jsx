import React, { useState, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Brain, History, Zap, User, LogOut, Trophy, Calendar, KeyRound, Eye, EyeOff, CheckCircle, X, ExternalLink, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../context/AuthContext";
import { toast } from "react-hot-toast";

const USAGE_KEY = "draftsage_daily_usage";

function getDailyUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { count: 0, date: new Date().toDateString() };
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toDateString()) return { count: 0, date: new Date().toDateString() };
    return parsed;
  } catch { return { count: 0, date: new Date().toDateString() }; }
}

// ── Draft History Component ───────────────────────────────────────────────────
const GRADE_COLORS = {
  A: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  B: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  C: "text-red-400 bg-red-500/15 border-red-500/30",
};

function DraftHistoryList({ userId }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("draft_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) setDrafts(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
    </div>
  );

  if (drafts.length === 0) return (
    <p className="text-sm text-navy-500 text-center py-6">
      No drafts saved yet. Start analyzing your next draft!
    </p>
  );

  return (
    <div className="space-y-3">
      {drafts.map((draft) => {
        const grade = draft.result?.draft_grade;
        const recs  = draft.result?.recommendations || [];
        const date  = new Date(draft.created_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
        return (
          <div key={draft.id} className="rounded-xl border border-navy-700 bg-navy-800/40 p-3 flex items-center gap-3">
            {/* Mode icon */}
            <div className="w-8 h-8 rounded-lg bg-navy-800 border border-navy-600 flex items-center justify-center flex-shrink-0">
              {draft.ban_mode
                ? <Shield size={14} className="text-red-400" />
                : <Brain size={14} className="text-gold" />
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{draft.role}</span>
                {recs.slice(0, 3).map((r) => (
                  <span key={r.champion} className="text-xs text-navy-300">{r.champion}</span>
                ))}
              </div>
              <p className="text-xs text-navy-500 mt-0.5">{date}</p>
            </div>

            {/* Grade */}
            {grade && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${GRADE_COLORS[grade] || GRADE_COLORS.B}`}>
                {grade}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}


export default function Dashboard() {
  const { user, signOut, loading, isPro } = useAuth();
  const [usage] = useState(getDailyUsage());
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);


  // Show upgrade success banner when ?upgraded=true
  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      setShowUpgradeBanner(true);
      toast.success("Welcome to DraftSage Pro! 🎉");
      // Clean the query param from the URL without reload
      setSearchParams({});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open Lemon Squeezy customer portal to manage / cancel subscription
  const handleManageSubscription = () => {
    // Lemon Squeezy's hosted customer portal — users can cancel/manage from here
    window.open("https://app.lemonsqueezy.com/my-orders", "_blank");
  };

  // Change password state
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [pwLoading, setPwLoading]           = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login?redirect=/dashboard" replace />;

  const suggestionsLeft = Math.max(0, 3 - usage.count);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Upgrade Success Banner */}
        {showUpgradeBanner && (
          <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 p-4 flex items-center gap-4 animate-fade-in">
            <CheckCircle size={24} className="text-gold flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-white">You're now on DraftSage Pro! 🎉</p>
              <p className="text-sm text-navy-300 mt-0.5">Unlimited AI suggestions are now unlocked. Go draft something amazing.</p>
            </div>
            <button
              onClick={() => setShowUpgradeBanner(false)}
              className="text-navy-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-navy-400 text-sm">{user.email}</p>
          </div>
          <button
            onClick={async () => { await signOut(); toast.success("Signed out."); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-navy-600 text-navy-400 hover:border-red-500/50 hover:text-red-400 transition-all text-sm"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          {/* Plan card */}
          <div className="card-gold rounded-2xl p-5 col-span-1 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-gold" />
              <span className="font-semibold text-white text-sm">Your Plan</span>
            </div>
            <p className={`text-2xl font-bold mb-1 ${isPro ? "text-gold" : "text-white"}`}>
              {isPro ? "Pro" : "Free"}
            </p>
            <p className="text-xs text-navy-400 mb-4">
              {isPro ? "Unlimited AI suggestions" : `${suggestionsLeft} / 3 suggestions left today`}
            </p>
            {!isPro && (
              <div className="w-full bg-navy-800 rounded-full h-1.5 mb-4">
                <div
                  className="bg-gold-gradient h-1.5 rounded-full transition-all"
                  style={{ width: `${(usage.count / 3) * 100}%` }}
                />
              </div>
            )}
            {!isPro && (
              <Link to="/pricing" className="btn-gold w-full py-2.5 rounded-xl text-sm font-semibold text-center block">
                Upgrade to Pro
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <Link to="/draft" className="card rounded-2xl p-5 hover:border-gold/30 transition-all group flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                <Brain size={20} className="text-gold" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Open Draft Board</p>
                <p className="text-xs text-navy-500 mt-0.5">Get AI pick suggestions</p>
              </div>
            </Link>

            {isPro ? (
              <button
                onClick={handleManageSubscription}
                className="card rounded-2xl p-5 hover:border-gold/30 transition-all group flex flex-col gap-3 text-left w-full"
              >
                <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <ExternalLink size={20} className="text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Manage Subscription</p>
                  <p className="text-xs text-navy-500 mt-0.5">Update payment or cancel anytime</p>
                </div>
              </button>
            ) : (
              <Link to="/pricing" className="card rounded-2xl p-5 hover:border-gold/30 transition-all group flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <Zap size={20} className="text-accent-blue" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Upgrade to Pro</p>
                  <p className="text-xs text-navy-500 mt-0.5">Unlimited suggestions + bans</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div className="card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-navy-400" />
            <h2 className="font-semibold text-white text-sm">Account Details</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-navy-700">
              <span className="text-sm text-navy-400">Email</span>
              <span className="text-sm text-white">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-navy-700">
              <span className="text-sm text-navy-400">Plan</span>
              <span className={`text-sm font-semibold ${isPro ? "text-gold" : "text-white"}`}>{isPro ? "Pro" : "Free"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-navy-400">Member since</span>
              <span className="text-sm text-white flex items-center gap-1">
                <Calendar size={12} />
                {new Date(user.created_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Draft History */}
        <div className="card rounded-2xl p-6 mt-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-navy-400" />
            <h2 className="font-semibold text-white text-sm">Draft History</h2>
            {!isPro && <span className="ml-auto text-xs text-gold border border-gold/30 px-2 py-0.5 rounded-full">Pro feature</span>}
          </div>
          {isPro ? (
            <DraftHistoryList userId={user?.id} />
          ) : (
            <div className="text-center py-6">
              <History size={32} className="text-navy-700 mx-auto mb-3" />
              <p className="text-sm text-navy-500 mb-3">Upgrade to Pro to save and review your draft history.</p>
              <Link to="/pricing" className="btn-gold py-2 px-6 text-sm rounded-xl inline-block">Upgrade to Pro</Link>
            </div>
          )}
        </div>


        {/* Change Password */}
        <div className="card rounded-2xl p-6 mt-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={16} className="text-navy-400" />
            <h2 className="font-semibold text-white text-sm">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {/* New Password */}
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full pl-4 pr-10 py-2.5 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                           focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-4 pr-10 py-2.5 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                           focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Strength hint */}
            {newPassword.length > 0 && (
              <p className={`text-xs ${
                newPassword.length < 6 ? "text-red-400" :
                newPassword.length < 10 ? "text-yellow-400" : "text-green-400"
              }`}>
                {newPassword.length < 6 ? "Too short (min 6 characters)" :
                 newPassword.length < 10 ? "Moderate strength" : "Strong password ✓"}
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="btn-gold py-2.5 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {pwLoading
                ? <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                : <><KeyRound size={14} /> Update Password</>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
