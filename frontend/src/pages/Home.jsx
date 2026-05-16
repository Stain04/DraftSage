import React from "react";
import { Link } from "react-router-dom";
import {
  Brain, Shield, ChevronRight, Star, Sword, Sparkles,
  Crosshair, AlertTriangle, Layers, CheckCircle2, ArrowRight,
  Crown, Cpu, Activity, Eye, Gauge,
} from "lucide-react";

// ── Stats strip ───────────────────────────────────────────────────────────────
const STATS = [
  { value: "12-axis",    label: "Team composition score" },
  { value: "170+",       label: "Champions analyzed" },
  { value: "Live",       label: "Patch data on every request" },
  { value: "<3s",        label: "Average AI response time" },
];

// ── New AI brain features ─────────────────────────────────────────────────────
const BRAIN_FEATURES = [
  {
    icon: <Cpu size={22} className="text-gold" />,
    badge: "Core AI",
    title: "Composition Gap Analyzer",
    desc: "Scores your team across 12 axes — engage, CC, frontline, peel, poke, waveclear, sustain, disengage, pick, splitpush, dive, scaling — and surfaces the exact gaps your next pick must fill.",
  },
  {
    icon: <Crosshair size={22} className="text-accent-blue" />,
    badge: "New",
    title: "Enemy Threat Detection",
    desc: "Detects enemy archetype (dive, poke, pick, splitpush, scaling) and the specific threats you need to answer — like 'Heavy dive' or 'CC chain' — with named champion sources.",
  },
  {
    icon: <AlertTriangle size={22} className="text-red-400" />,
    badge: "New",
    title: "Avoidance Intelligence",
    desc: "Explicit do-not-pick list with reasons. 'Immobile ADCs vs heavy dive.' 'Pure AD scalers vs armor-stack.' No more learning the hard way mid-game.",
  },
  {
    icon: <Gauge size={22} className="text-emerald-400" />,
    badge: "New",
    title: "Confidence Scoring",
    desc: "Every recommendation comes with a transparent 4-bar breakdown: lane matchup, team fit, threat answer, and meta tier — combined into a single confidence percentage you can trust.",
  },
  {
    icon: <Activity size={22} className="text-accent-purple" />,
    badge: "Live data",
    title: "Real Patch Counters",
    desc: "Pulls fresh lolalytics + OP.GG data on every request. No hardcoded matchups, no stale meta calls — recommendations adapt the moment Riot ships a patch.",
  },
  {
    icon: <Eye size={22} className="text-accent-teal" />,
    badge: "Pro",
    title: "Ban Mode + Champion Pool",
    desc: "Bans the champions that complete the enemy comp. Filters recommendations to only the champions you actually play. Pro features for ranked grind.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Build your draft",
    desc: "Pick allies, pick enemies, set your role. Drag-and-drop or search — under 10 seconds.",
    icon: <Layers size={20} className="text-gold" />,
  },
  {
    n: "02",
    title: "AI analyzes 4 layers",
    desc: "Damage balance · Composition gaps · Enemy threats · Lane counters. All in parallel, all on live patch data.",
    icon: <Brain size={20} className="text-accent-blue" />,
  },
  {
    n: "03",
    title: "Get scored picks + a do-not-pick list",
    desc: "Top 3 recommendations with confidence %, score breakdowns, and explicit reasoning. Plus champions to avoid.",
    icon: <Sparkles size={20} className="text-emerald-400" />,
  },
];

const TESTIMONIALS = [
  { name: "Kaito_Rift",   rank: "Challenger", text: "Finally an AI that doesn't just say 'pick Zed' when the enemy has 3 tanks. Actually understands draft theory." },
  { name: "LanePhase_EU", rank: "Master",     text: "Used this in my promos. The win condition explanations are spot on — it's like having a coach in queue." },
  { name: "CloudDragon9", rank: "Diamond I",  text: "The damage balance suggestion alone won me a game. Enemy had full AP and DraftSage recommended Garen top." },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-noise">

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4">
        {/* Animated grid */}
        <div className="absolute inset-0 bg-grid opacity-70" />

        {/* Aurora blobs — gold + cyan + magenta tri-color */}
        <div className="aurora-blob bg-gold/40    w-[600px] h-[600px] -top-20 left-1/2 -translate-x-1/2" />
        <div className="aurora-blob bg-cyan/30    w-[500px] h-[500px] top-[20%] -left-32" style={{ animationDelay: "2s" }} />
        <div className="aurora-blob bg-magenta/25 w-[450px] h-[450px] top-[30%] -right-24" style={{ animationDelay: "4s" }} />

        {/* HUD scanline */}
        <div className="hud-scan-line" />

        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Badge — cyan tech accent */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan/40 bg-navy-900/70 backdrop-blur mb-6 text-xs text-neon-cyan font-bold uppercase tracking-widest animate-flicker shadow-glow-cyan">
            <Sparkles size={12} className="animate-pulse" />
            <span>AI Brain v2 — Composition Intelligence Online</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up leading-[1.05]" style={{ animationDelay: "0.1s" }}>
            <span className="text-white">Win the draft.</span>
            <br />
            <span className="text-gradient-gold">Climb the ladder.</span>
          </h1>

          <p className="text-lg sm:text-xl text-navy-200 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "0.2s" }}>
            DraftSage analyzes your team's gaps, the enemy's threats, and live patch counters — then tells you exactly what to pick, what to avoid, and <span className="text-white font-semibold">why</span>.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up mb-4" style={{ animationDelay: "0.3s" }}>
            <Link to="/draft" className="btn-gold text-base px-8 py-4 flex items-center justify-center gap-2 group">
              <Brain size={20} />
              Open Draft Board
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/pricing" className="btn-ghost text-base px-8 py-4 flex items-center justify-center gap-2">
              See Pro Features <ChevronRight size={18} />
            </Link>
          </div>

          <p className="text-xs text-navy-400 mb-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            No credit card required · 3 free AI suggestions per day · 30-day refund on Pro
          </p>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.6s" }}>
            {STATS.map((s, i) => (
              <div key={i} className="p-4 rounded-xl border border-navy-700 bg-navy-900/40 backdrop-blur">
                <p className="text-lg sm:text-xl font-bold text-gold mb-0.5">{s.value}</p>
                <p className="text-[11px] text-navy-300 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Demo card (the proof) ───────────────────────────────── */}
        <div className="max-w-4xl mx-auto mt-16 animate-slide-up relative z-10" style={{ animationDelay: "0.7s" }}>
          <div className="card-premium hud-corners rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />

            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-cyan animate-pulse" />
                <span className="text-xs text-neon-cyan font-bold uppercase tracking-widest font-mono">{"// Live Draft Analysis"}</span>
              </div>
              <span className="text-[10px] text-navy-400 uppercase tracking-wider font-mono">Bot lane · Patch 26.10</span>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Ally side */}
              <div className="col-span-12 sm:col-span-3">
                <span className="text-[10px] text-blue-400 font-bold mb-2 flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> Ally
                </span>
                {["Malphite", "Vi", "Orianna"].map((name) => (
                  <div key={name} className="flex items-center gap-2 p-1.5 rounded-lg mb-1 bg-navy-800/60 border border-blue-500/20">
                    <img src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${name}.png`} alt={name}
                      className="w-8 h-8 rounded object-cover border border-blue-500/40" />
                    <span className="text-xs text-white truncate">{name}</span>
                  </div>
                ))}
                <div className="mt-1 p-1.5 rounded-lg border border-dashed border-gold/40 bg-gold/5 text-center">
                  <span className="text-[10px] text-gold font-semibold">YOU PICK</span>
                </div>
              </div>

              {/* Center: AI verdict */}
              <div className="col-span-12 sm:col-span-6 flex flex-col gap-3">

                {/* Top pick card */}
                <div className="card rounded-xl p-3 border border-gold/40 shadow-gold">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src="https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ezreal.png" alt="Ezreal"
                        className="w-12 h-12 rounded-lg object-cover border-2 border-gold/60" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-gradient flex items-center justify-center text-[10px] font-bold text-navy-900">1</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-white">Ezreal</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-bold">S</span>
                      </div>
                      <p className="text-[10px] text-emerald-400">✦ Fills Waveclear · ⚔ Counters Heavy dive</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-navy-400 uppercase tracking-wider">Conf.</p>
                      <p className="text-lg font-bold text-gold leading-none">87%</p>
                    </div>
                  </div>
                  {/* score bars */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[
                      { l: "Lane",   v: 32, m: 40, c: "bg-blue-500"    },
                      { l: "Fit",    v: 22, m: 25, c: "bg-emerald-500" },
                      { l: "Threat", v: 18, m: 20, c: "bg-red-500"     },
                      { l: "Meta",   v: 15, m: 15, c: "bg-purple-500"  },
                    ].map((b) => (
                      <div key={b.l} className="text-center">
                        <p className="text-[9px] text-navy-400">{b.l}</p>
                        <div className="h-1 w-full rounded-full bg-navy-800 mt-0.5">
                          <div className={`h-full rounded-full ${b.c}`} style={{ width: `${(b.v / b.m) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Avoid pill — magenta accent */}
                <div className="p-2.5 rounded-xl bg-magenta/10 border border-magenta/40 relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={11} className="text-magenta" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-magenta font-mono">{"// DO NOT PICK"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {["Jinx", "Kog'Maw", "Twitch"].map((c) => (
                      <span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-magenta/15 text-magenta-light border border-magenta/30 font-medium">{c}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-navy-400 leading-snug">Enemy has 4 dive-score from Vi + Zed — immobile ADCs get jumped.</p>
                </div>

                {/* Comp tags */}
                <div className="flex items-center gap-2 text-[10px] flex-wrap">
                  <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">Ally · Engage</span>
                  <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">Enemy · Dive</span>
                  <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">Gap · Waveclear</span>
                </div>
              </div>

              {/* Enemy side */}
              <div className="col-span-12 sm:col-span-3">
                <span className="text-[10px] text-red-400 font-bold mb-2 flex items-center gap-1 justify-end uppercase tracking-wider">
                  Enemy <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                </span>
                {["Darius", "Vi", "Zed", "Jinx"].map((name) => (
                  <div key={name} className="flex items-center justify-end gap-2 p-1.5 rounded-lg mb-1 bg-navy-800/60 border border-red-500/20">
                    <span className="text-xs text-white truncate">{name}</span>
                    <img src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${name === "Vi" ? "Vi" : name}.png`} alt={name}
                      className="w-8 h-8 rounded object-cover border border-red-500/40" />
                  </div>
                ))}
                <div className="mt-1 p-1.5 rounded-lg border border-dashed border-navy-700 bg-navy-900/40 text-center">
                  <span className="text-[10px] text-navy-500">Open</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-navy-500 mt-3 italic">Real recommendation from the live brain · sample game state</p>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section className="relative py-20 px-4">
        <div className="section-divider mb-20" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-3">How It Works</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">From draft state to scored picks in seconds</h2>
            <p className="text-navy-300 max-w-2xl mx-auto">Four parallel analyzers feed structured intelligence into a Challenger-level LLM. You see the result — not the wiring.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="card-premium p-6 relative bg-noise group hover:scale-[1.02] transition-transform">
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gold-gradient text-navy-900 text-xs font-bold shadow-gold">
                  STEP {step.n}
                </div>
                <div className="w-12 h-12 rounded-xl bg-navy-900 border border-gold/20 flex items-center justify-center mb-4 mt-2 group-hover:border-gold/50 transition-colors">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-lg text-white mb-2">{step.title}</h3>
                <p className="text-sm text-navy-300 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ AI BRAIN FEATURES ════════════════════ */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="aurora-blob bg-gold/20 w-[400px] h-[400px] top-[40%] left-[5%]" />
        <div className="aurora-blob bg-accent-blue/15 w-[400px] h-[400px] top-[20%] right-[5%]" style={{ animationDelay: "3s" }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-3">The AI Brain</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
              Not a tier list. <span className="text-gradient-gold">A draft coach.</span>
            </h2>
            <p className="text-navy-300 max-w-2xl mx-auto">Every other tool tells you what's strong in a vacuum. DraftSage analyzes <em>this draft</em> — your gaps, their threats, the actual patch.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BRAIN_FEATURES.map((f, i) => (
              <div key={i} className="card-premium p-6 relative bg-noise group hover:translate-y-[-2px] transition-transform">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-navy-900 border border-navy-700 flex items-center justify-center group-hover:scale-110 group-hover:border-gold/40 transition-all">
                    {f.icon}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    f.badge === "New"      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    f.badge === "Pro"      ? "bg-gold/20 text-gold border border-gold/30" :
                    f.badge === "Live data" ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30" :
                                              "bg-navy-700 text-navy-200 border border-navy-600"
                  }`}>
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-white mb-2">{f.title}</h3>
                <p className="text-sm text-navy-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ COMPARISON / VS ════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-3">DraftSage vs the rest</p>
            <h2 className="font-display text-3xl font-bold text-white mb-3">Why "vibes-based picking" loses lanes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* Without */}
            <div className="card p-6 relative opacity-90 bg-noise">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Without DraftSage</span>
              </div>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Pick what's strong on the tier list. Ignore the matchup.",
                  "Hope your damage balance is OK. Realize too late.",
                  "Get countered hard, blame the jungler.",
                  "Look up counters mid-game from a wiki tab.",
                ].map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-navy-300">
                    <span className="text-red-400 mt-1 leading-none">✕</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {/* With */}
            <div className="card-premium p-6 relative bg-noise">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">With DraftSage</span>
              </div>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Get 3 picks that fill your team gaps and counter enemy threats.",
                  "See damage balance enforced before you pick.",
                  "Get an explicit do-not-pick list with named reasons.",
                  "Confidence % shows exactly how good each pick is right now.",
                ].map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-navy-100">
                    <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ PRO UNLOCK SECTION ════════════════════ */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="aurora-blob bg-gold/30 w-[500px] h-[500px] top-[20%] left-1/2 -translate-x-1/2" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="card-premium rounded-3xl p-8 sm:p-12 bg-noise relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient" />
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
              {/* Left */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-5 text-xs text-gold font-bold uppercase tracking-widest">
                  <Crown size={12} fill="currentColor" /> Pro · $6.58 / month (yearly)
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                  <span className="text-white">The full brain.</span>
                  <br />
                  <span className="text-gradient-gold">For less than a skin.</span>
                </h2>
                <p className="text-navy-200 mb-6 leading-relaxed">
                  Unlimited suggestions. Composition analyzer. Avoidance intelligence. Confidence scoring. Champion pool filter. Ban mode. Cloud draft history. <span className="text-white font-semibold">All of it.</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Link to="/pricing" className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold">
                    <Brain size={18} /> See Pricing <ArrowRight size={16} />
                  </Link>
                  <Link to="/draft" className="btn-ghost inline-flex items-center justify-center gap-2 px-6 py-3.5">
                    Try Free First
                  </Link>
                </div>
                <p className="text-xs text-navy-400 flex items-center gap-1.5">
                  <Shield size={12} className="text-emerald-400" /> 30-day money-back guarantee · cancel anytime
                </p>
              </div>

              {/* Right - feature checklist preview */}
              <div className="card rounded-2xl p-5 border border-gold/20">
                <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-4">What you unlock</p>
                <div className="space-y-2.5">
                  {[
                    "Composition Gap Analyzer",
                    "Avoidance Intelligence",
                    "Confidence scoring breakdown",
                    "Ban Mode + Champion Pool",
                    "Cloud-synced draft history",
                    "Priority AI model routing",
                    "Patch tier badges (S/A/B/C)",
                    "Early access to new features",
                  ].map((item, i) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={12} className="text-gold" />
                      </div>
                      <span className="text-navy-100">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ TESTIMONIALS ════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-3">Trusted by ranked players</p>
            <h2 className="font-display text-3xl font-bold text-white">Built for the climb</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-premium p-6 bg-noise">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} size={12} fill="#C8A951" className="text-gold" />)}
                </div>
                <p className="text-sm text-navy-100 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center text-navy-900 text-xs font-bold">
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
      </section>

      {/* ════════════════════ FINAL CTA ════════════════════ */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="aurora-blob bg-gold/30 w-[400px] h-[400px] top-1/4 left-1/2 -translate-x-1/2" />
        <div className="aurora-blob bg-cyan/20 w-[350px] h-[350px] top-1/4 left-1/4" style={{ animationDelay: "2s" }} />
        <div className="aurora-blob bg-magenta/20 w-[350px] h-[350px] top-1/4 right-1/4" style={{ animationDelay: "4s" }} />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="card-premium hud-corners rounded-3xl p-10 relative overflow-hidden bg-noise">
            <div className="absolute top-0 left-0 right-0 h-px bg-esports-gradient" />
            <Brain size={44} className="text-cyan mx-auto mb-5 animate-float" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">Ready to win your next draft?</h2>
            <p className="text-navy-300 mb-8">Open the board. Build your draft. See what the brain says.</p>
            <Link to="/draft" className="btn-esports text-base px-10 py-4 inline-flex items-center gap-2">
              <Brain size={20} /> Open Draft Board <ArrowRight size={18} />
            </Link>
            <p className="mt-4 text-xs text-navy-400">No card required · 3 free suggestions per day</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800 py-10 px-4 text-center text-navy-500 text-sm relative">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center">
            <Sword size={14} className="text-navy-900" />
          </div>
          <span className="font-display text-lg text-gold font-bold">DraftSage</span>
        </div>
        <p className="max-w-md mx-auto leading-relaxed">DraftSage is not affiliated with Riot Games. League of Legends is a trademark of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}

