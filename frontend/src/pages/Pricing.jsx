import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Zap, Brain, Star, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/geminiApi";
import { toast } from "react-hot-toast";

const FREE_FEATURES = [
  "3 AI draft suggestions per day",
  "Pick recommendations for all roles",
  "Champion search & draft board",
  "Win condition explanations",
];

const PRO_FEATURES = [
  "Unlimited AI draft suggestions",
  "Ban recommendations",
  "Champion pool filtering",
  "Patch tier indicators",
  "Full draft history",
  "Priority support",
  "All Free features included",
];

export default function Pricing() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) { navigate("/login?redirect=/pricing"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/api/payments/create-checkout-session", {
        user_id: user.id,
        email: user.email,
      });
      window.location.href = data.url;
    } catch {
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 mb-4 text-sm text-gold font-medium">
            <Zap size={14} /> Simple, transparent pricing
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-3">Level Up Your Draft Game</h1>
          <p className="text-navy-400 text-lg">Start free. Upgrade when you're ready to go unlimited.</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Free */}
          <div className="card rounded-2xl p-7 flex flex-col animate-slide-up">
            <div className="mb-6">
              <h2 className="font-bold text-xl text-white mb-1">Free</h2>
              <p className="text-navy-400 text-sm">Try DraftSage with no commitment</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-navy-400 ml-1 text-sm">/ month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-navy-300">
                  <Check size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/draft" className="w-full py-3 rounded-xl border border-navy-600 text-center text-white font-semibold hover:border-navy-400 transition-all">
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div className="card-gold rounded-2xl p-7 flex flex-col relative overflow-hidden animate-slide-up ring-1 ring-gold/30"
               style={{ animationDelay: "0.1s" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient" />

            {/* Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/20 border border-gold/30 text-xs text-gold font-semibold">
              <Star size={10} fill="currentColor" /> Most Popular
            </div>

            <div className="mb-6">
              <h2 className="font-bold text-xl text-white mb-1">Pro</h2>
              <p className="text-navy-400 text-sm">For serious ranked players</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$9.99</span>
              <span className="text-navy-400 ml-1 text-sm">/ month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-navy-200">{f}</span>
                </li>
              ))}
            </ul>
            {isPro ? (
              <button
                disabled
                className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gold/20 border border-gold/40 text-gold cursor-default"
              >
                ✓ Current Plan
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="btn-gold w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Brain size={18} /> Upgrade to Pro <ArrowRight size={16} /></>
                )}
              </button>
            )}
            {!user && (
              <p className="text-center text-xs text-navy-500 mt-3">
                <Link to="/login" className="text-gold hover:underline">Sign in</Link> to upgrade
              </p>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-8">Frequently Asked</h2>
          {[
            {
              q: "Is DraftSage affiliated with Riot Games?",
              a: "No. DraftSage is an independent tool. Champion icons and names are used under Riot's third-party developer policy.",
            },
            {
              q: "How does the AI determine its recommendations?",
              a: "DraftSage uses Gemini (Google) with a detailed Challenger-level system prompt that analyzes damage balance, composition archetypes, counter-pick opportunities, power spikes, and current meta relevance.",
            },
            {
              q: "Can I cancel my Pro subscription anytime?",
              a: "Yes. Cancel at any time from the dashboard. You'll retain Pro access until the billing period ends.",
            },
            {
              q: "What is the champion pool filter?",
              a: "Pro users can enter their champion pool, and DraftSage will only recommend picks you actually know how to play.",
            },
          ].map((item, i) => (
            <div key={i} className="card rounded-xl p-5 mb-3">
              <h3 className="font-semibold text-white mb-2 text-sm">{item.q}</h3>
              <p className="text-sm text-navy-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
