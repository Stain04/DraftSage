import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check, X, Zap, Brain, Star, ArrowRight, Shield, Sparkles,
  Crown, Lock, Infinity as InfinityIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/geminiApi";
import { toast } from "react-hot-toast";

// ── Feature data ──────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "3 AI draft suggestions per day",
  "Basic damage-balance analysis",
  "Champion search & draft board",
  "Top-3 pick recommendations",
];

const PRO_FEATURES = [
  { label: "Unlimited AI draft suggestions", new: false },
  { label: "Team Composition Gap Analyzer", new: true },
  { label: "Avoidance Intelligence (do-not-pick list)", new: true },
  { label: "Confidence scoring + reasoning breakdown", new: true },
  { label: "Ban Mode recommendations", new: false },
  { label: "Champion Pool filtering", new: false },
  { label: "Patch tier badges (S/A/B/C)", new: false },
  { label: "Cloud-synced draft history", new: false },
  { label: "Priority AI model routing", new: true },
  { label: "Early access to new features", new: true },
];

const COMPARISON_ROWS = [
  { label: "AI draft suggestions",            free: "3 / day",     pro: <span className="flex items-center gap-1 justify-center"><InfinityIcon size={14} /> Unlimited</span> },
  { label: "Team Composition Gap Analyzer",   free: false,         pro: true },
  { label: "Avoidance Intelligence",          free: false,         pro: true },
  { label: "Per-pick confidence scoring",     free: "Limited",     pro: "Full breakdown" },
  { label: "Ban Mode",                        free: false,         pro: true },
  { label: "Champion Pool filter",            free: false,         pro: true },
  { label: "Patch tier badges",               free: false,         pro: true },
  { label: "Cloud draft history",             free: "Local only",  pro: "Unlimited cloud" },
  { label: "Priority AI model",               free: false,         pro: true },
  { label: "Early access to new features",    free: false,         pro: true },
];

const TESTIMONIALS = [
  { name: "Kaito_Rift",    rank: "Challenger", text: "Finally an AI that doesn't just say 'pick Zed' when the enemy has 3 tanks. Actually understands draft theory." },
  { name: "LanePhase_EU",  rank: "Master",     text: "Used this in my promos. The win condition explanations are spot on — it's like having a coach in queue." },
  { name: "CloudDragon9",  rank: "Diamond I",  text: "The damage balance suggestion alone won me a game. Enemy had full AP and DraftSage recommended Garen top." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function CompCell({ value }) {
  if (value === true)  return <Check size={18} className="text-emerald-400 mx-auto" strokeWidth={3} />;
  if (value === false) return <X size={16} className="text-navy-600 mx-auto" />;
  return <span className="text-sm text-white">{value}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const { user, isPro }   = useAuth();
  const navigate          = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [billing, setBilling]   = useState("yearly");   // default yearly for anchoring

  const handleUpgrade = async (period = billing) => {
    if (!user) { navigate("/login?redirect=/pricing"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/api/payments/create-checkout-session", {
        user_id: user.id,
        email:   user.email,
        billing_period: period,
      });
      window.location.href = data.url;
    } catch (err) {
      const detail = err?.response?.data?.detail || "Could not start checkout. Please try again.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const isYearly        = billing === "yearly";
  const displayPrice    = isYearly ? "6.58" : "9.99";
  const displaySub      = isYearly ? "/ month, billed yearly" : "/ month";
  const yearlySavings   = "Save $40/year";

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative overflow-hidden bg-noise">
      {/* Aurora blobs — tri-color */}
      <div className="aurora-blob bg-gold/30    w-[480px] h-[480px] top-[10%] -left-32" />
      <div className="aurora-blob bg-cyan/25    w-[400px] h-[400px] top-[40%] -right-24" style={{ animationDelay: "3s" }} />
      <div className="aurora-blob bg-magenta/15 w-[400px] h-[400px] top-[70%] left-1/3" style={{ animationDelay: "5s" }} />
      <div className="absolute inset-0 bg-hex pointer-events-none opacity-50" />
      <div className="hud-scan-line" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan/40 bg-navy-900/60 backdrop-blur mb-4 text-xs text-neon-cyan font-bold uppercase tracking-widest shadow-glow-cyan">
            <Sparkles size={12} /> {"// Choose Your Plan"}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-white">Win more games.</span>{" "}
            <span className="text-gradient-gold">Pay less than a skin.</span>
          </h1>
          <p className="text-navy-300 text-lg max-w-2xl mx-auto">
            Pro unlocks the full DraftSage brain — gap analysis, avoidance intelligence, and confidence-scored picks built for ranked.
          </p>
        </div>

        {/* ── Billing toggle ──────────────────────────────────────────── */}
        <div className="flex justify-center mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-navy-600 bg-navy-900/70 backdrop-blur">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billing === "monthly" ? "bg-navy-700 text-white" : "text-navy-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === "yearly" ? "bg-gold-gradient text-navy-900 shadow-gold" : "text-navy-400 hover:text-white"
              }`}
            >
              Yearly
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                billing === "yearly" ? "bg-navy-900 text-gold" : "bg-emerald-500/20 text-emerald-400"
              }`}>SAVE 34%</span>
            </button>
          </div>
        </div>

        {/* ── Plan cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">

          {/* Free plan */}
          <div className="card rounded-2xl p-7 flex flex-col animate-slide-up relative bg-noise">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-bold text-2xl text-white">Free</h2>
              </div>
              <p className="text-navy-400 text-sm">Try DraftSage with no commitment</p>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold text-white">$0</span>
              <span className="text-navy-400 ml-2 text-sm">/ forever</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-navy-300">
                  <Check size={16} className="text-navy-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-sm text-navy-600 line-through opacity-60">
                <Lock size={14} className="flex-shrink-0 mt-0.5" />
                Composition Gap Analyzer
              </li>
              <li className="flex items-start gap-2.5 text-sm text-navy-600 line-through opacity-60">
                <Lock size={14} className="flex-shrink-0 mt-0.5" />
                Avoidance Intelligence
              </li>
            </ul>
            <Link
              to="/draft"
              className="w-full py-3 rounded-xl border border-navy-600 text-center text-white font-semibold hover:border-navy-400 hover:bg-navy-800 transition-all"
            >
              Start Free
            </Link>
          </div>

          {/* Pro plan */}
          <div className="card-premium hud-corners p-7 flex flex-col relative animate-slide-up glow-frame bg-noise"
               style={{ animationDelay: "0.1s" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient" />

            {/* Most popular badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/20 border border-gold/40 text-xs text-gold font-bold uppercase tracking-wider">
              <Crown size={11} fill="currentColor" /> Most Popular
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-bold text-2xl text-white">Pro</h2>
                {isYearly && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                    {yearlySavings}
                  </span>
                )}
              </div>
              <p className="text-navy-300 text-sm">For ranked players who want the edge</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gradient-gold">${displayPrice}</span>
                <span className="text-navy-400 ml-2 text-sm">{displaySub}</span>
              </div>
              {isYearly && (
                <p className="text-xs text-navy-400 mt-1">
                  <span className="text-emerald-400 font-semibold">$79 / year</span> · cancel anytime
                </p>
              )}
              {!isYearly && (
                <p className="text-xs text-navy-400 mt-1">Cancel anytime · no contract</p>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-navy-100">{f.label}</span>
                  {f.new && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                      New
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {isPro ? (
              <button
                disabled
                className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gold/20 border border-gold/40 text-gold cursor-default"
              >
                <Check size={16} /> Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade(billing)}
                disabled={loading}
                className="btn-gold w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Brain size={18} />
                    {isYearly ? "Go Pro — Save 34%" : "Upgrade to Pro"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
            {!user && (
              <p className="text-center text-xs text-navy-400 mt-3">
                <Link to="/login" className="text-gold hover:underline">Sign in</Link> to upgrade
              </p>
            )}

            {/* Trust strip inside Pro card */}
            <div className="mt-5 pt-5 border-t border-navy-700 flex items-center justify-between text-xs text-navy-400">
              <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-emerald-400" />
                <span>30-day refund</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-gold" />
                <span>Instant access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <X size={12} className="text-blue-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Comparison table ────────────────────────────────────────── */}
        <div className="mb-20 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-white mb-2">Compare plans</h2>
            <p className="text-sm text-navy-400">Every feature, side by side.</p>
          </div>

          <div className="card-premium rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left text-sm font-semibold text-navy-300 px-5 py-4 w-1/2">Feature</th>
                  <th className="text-center text-sm font-semibold text-navy-300 px-5 py-4 w-1/4">Free</th>
                  <th className="text-center text-sm font-bold text-gold px-5 py-4 w-1/4">
                    <span className="inline-flex items-center gap-1.5">
                      <Crown size={14} /> Pro
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={`border-b border-navy-800 ${i % 2 === 0 ? "bg-navy-900/30" : ""}`}>
                    <td className="text-sm text-navy-100 px-5 py-3.5 font-medium">{row.label}</td>
                    <td className="text-center px-5 py-3.5"><CompCell value={row.free} /></td>
                    <td className="text-center px-5 py-3.5 bg-gold/[0.04]"><CompCell value={row.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Social Proof / Testimonials ─────────────────────────────── */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-2">Trusted by Ranked Players</p>
            <h2 className="font-display text-3xl font-bold text-white">What pros are saying</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-premium p-5 bg-noise relative">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} size={12} fill="#C8A951" className="text-gold" />)}
                </div>
                <p className="text-sm text-navy-100 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-navy-900 text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-gold">{t.rank}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Guarantee ───────────────────────────────────────────────── */}
        <div className="card-premium rounded-2xl p-8 mb-20 max-w-3xl mx-auto bg-noise text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <Shield size={26} className="text-emerald-400" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-2">30-day money-back guarantee</h3>
            <p className="text-sm text-navy-300 max-w-md mx-auto">
              Try Pro risk-free. If DraftSage doesn't help you climb,
              email us and we'll refund every cent — no questions, no friction.
            </p>
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-white mb-2">Frequently Asked</h2>
            <p className="text-sm text-navy-400">Common questions about DraftSage Pro.</p>
          </div>
          {[
            {
              q: "How is this different from a tier list site?",
              a: "Tier lists tell you what's strong in a vacuum. DraftSage analyzes your specific draft — ally gaps, enemy threats, lane matchups, damage balance — and tells you what fits this game right now.",
            },
            {
              q: "Can I cancel my Pro subscription anytime?",
              a: "Yes. Cancel from your dashboard in one click. You'll keep Pro access until the end of your billing period, then automatically drop to Free — no awkward downgrade emails.",
            },
            {
              q: "What's the difference between monthly and yearly?",
              a: "Same product, identical features. Yearly is $79/year (~$6.58/month) — a 34% discount for committing up front. Yearly subscribers also get early access to new features.",
            },
            {
              q: "Will the AI still work if Riot changes the meta?",
              a: "Yes. DraftSage pulls fresh patch data on every request (lolalytics counters + OP.GG tier lists). No stale recommendations — ever.",
            },
            {
              q: "Is DraftSage affiliated with Riot Games?",
              a: "No. DraftSage is an independent tool. Champion icons and names are used under Riot's third-party developer policy.",
            },
            {
              q: "What happens to my draft history if I downgrade?",
              a: "Your saved drafts stay on your account — you just lose write access after the free daily quota is hit. Re-upgrade anytime to restore everything.",
            },
          ].map((item, i) => (
            <div key={i} className="card rounded-xl p-5 mb-3 hover:border-gold/30 transition-all">
              <h3 className="font-semibold text-white mb-2 text-sm">{item.q}</h3>
              <p className="text-sm text-navy-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        {/* ── Final CTA ───────────────────────────────────────────────── */}
        <div className="text-center mt-16">
          <h3 className="font-display text-2xl font-bold text-white mb-3">Ready to draft like a Challenger?</h3>
          <p className="text-sm text-navy-400 mb-6">Less than a single skin per month.</p>
          {!isPro && (
            <button
              onClick={() => handleUpgrade(billing)}
              disabled={loading}
              className="btn-esports inline-flex items-center gap-2 px-8 py-4 text-base font-bold"
            >
              <Brain size={18} />
              {isYearly ? "Upgrade — Save 34%" : "Upgrade to Pro"}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
