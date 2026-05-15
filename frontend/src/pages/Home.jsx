import React from "react";
import { Link } from "react-router-dom";
import { Brain, Zap, Shield, Target, TrendingUp, ChevronRight, Star, Sword } from "lucide-react";

const FEATURES = [
  {
    icon: <Brain size={24} className="text-gold" />,
    title: "Challenger-Level Analysis",
    desc: "Gemini AI reasons through drafts like a pro coach — win conditions, damage balance, power spikes, and counter-picks.",
  },
  {
    icon: <Target size={24} className="text-accent-blue" />,
    title: "Real-Time Counter-Picking",
    desc: "Instantly see which champions shut down the enemy's win condition and fit perfectly in your team's composition.",
  },
  {
    icon: <TrendingUp size={24} className="text-accent-teal" />,
    title: "Composition Archetypes",
    desc: "Identify whether you're building engage, poke, teamfight, split-push, or pick — and optimize around it.",
  },
  {
    icon: <Zap size={24} className="text-accent-purple" />,
    title: "Top 3 Recommendations",
    desc: "Get three ranked champion picks with full reasoning, win conditions, synergies, and difficulty ratings.",
  },
  {
    icon: <Shield size={24} className="text-emerald-400" />,
    title: "Ban Suggestions (Pro)",
    desc: "Pro users get intelligent ban recommendations based on what the enemy team needs and current meta strength.",
  },
  {
    icon: <Star size={24} className="text-amber-400" />,
    title: "Champion Pool Filtering (Pro)",
    desc: "Enter your champion pool and DraftSage will only recommend picks you actually play.",
  },
];

const TESTIMONIALS = [
  { name: "Kaito_Rift", rank: "Challenger", text: "Finally an AI that doesn't just say 'pick Zed' when the enemy has 3 tanks. Actually understands draft theory." },
  { name: "LanePhase_EU", rank: "Master", text: "Used this in my promos. The win condition explanations are spot on — it's like having a coach in queue." },
  { name: "CloudDragon9", rank: "Diamond I", text: "The damage balance suggestion alone won me a game. Enemy had full AP and DraftSage recommended Garen top." },
];

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 px-4">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 mb-6 text-sm text-gold font-medium animate-fade-in">
            <Sword size={14} />
            <span>AI-Powered Draft Assistant</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-white">Win Your Draft.</span>
            <br />
            <span className="bg-clip-text text-transparent bg-gold-gradient">Win Your Game.</span>
          </h1>

          <p className="text-xl text-navy-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "0.2s" }}>
            DraftSage uses <strong className="text-white">Challenger-level AI reasoning</strong> to analyze your League of Legends
            draft and recommend the perfect pick — with full win condition breakdowns.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/draft" className="btn-gold text-base px-8 py-4 flex items-center justify-center gap-2">
              <Brain size={20} />
              Try Draft Board Free
            </Link>
            <Link to="/pricing" className="btn-ghost text-base px-8 py-4 flex items-center justify-center gap-2">
              See Pro Features <ChevronRight size={18} />
            </Link>
          </div>

          <p className="mt-4 text-xs text-navy-500 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            No credit card required • 3 free AI suggestions per day
          </p>
        </div>

        {/* Mock Draft Preview */}
        <div className="max-w-3xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="card-gold rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />
            <div className="grid grid-cols-3 gap-4">
              {/* Ally side */}
              <div>
                <span className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Ally Team
                </span>
                {["Malphite", "Vi", "Orianna", null, null].map((name, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg mb-1 bg-navy-800/50 border border-navy-700">
                    {name ? (
                      <>
                        <img src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${name}.png`} alt={name}
                          className="w-8 h-8 rounded object-cover border border-blue-500/40" />
                        <span className="text-sm text-white">{name}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded border border-dashed border-navy-600" />
                        <span className="text-sm text-navy-600">Empty</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Center — AI Result preview */}
              <div className="flex flex-col items-center justify-center gap-2">
                <Brain size={32} className="text-gold animate-pulse" />
                <p className="text-xs text-gold font-semibold text-center">DraftSage Recommends</p>
                <div className="card rounded-xl p-3 w-full border border-gold/30 text-center">
                  <img src="https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Yasuo.png" alt="Yasuo"
                    className="w-12 h-12 rounded-lg object-cover border-2 border-gold/60 mx-auto mb-1 shadow-gold" />
                  <p className="text-sm font-bold text-white">Yasuo</p>
                  <p className="text-xs text-emerald-400 mt-1">Knock-up synergy</p>
                </div>
              </div>

              {/* Enemy side */}
              <div>
                <span className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1 justify-end">
                  Enemy Team <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                </span>
                {["Sett", "Jarvan IV", "Azir", "Jinx", null].map((name, i) => (
                  <div key={i} className="flex items-center justify-end gap-2 p-2 rounded-lg mb-1 bg-navy-800/50 border border-navy-700">
                    {name ? (
                      <>
                        <span className="text-sm text-white">{name}</span>
                        <img src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${name}.png`} alt={name}
                          className="w-8 h-8 rounded object-cover border border-red-500/40" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-navy-600">Empty</span>
                        <div className="w-8 h-8 rounded border border-dashed border-navy-600" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-white mb-3">Why DraftSage?</h2>
            <p className="text-navy-400">Not just win rates — true draft intelligence.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="card rounded-2xl p-5 hover:border-gold/30 transition-all hover:shadow-gold group">
                <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-navy-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-navy-700">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-white mb-3">Trusted by Ranked Players</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-gold rounded-2xl p-5">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} size={12} fill="#C8A951" className="text-gold" />)}
                </div>
                <p className="text-sm text-navy-200 leading-relaxed mb-4 italic">"{t.text}"</p>
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
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card-gold rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient" />
            <Brain size={40} className="text-gold mx-auto mb-4" />
            <h2 className="font-display text-3xl font-bold text-white mb-3">Ready to Win Your Next Draft?</h2>
            <p className="text-navy-400 mb-8">Start free. No account needed for your first 3 suggestions.</p>
            <Link to="/draft" className="btn-gold text-base px-10 py-4 inline-flex items-center gap-2">
              <Brain size={20} /> Open Draft Board
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8 px-4 text-center text-navy-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sword size={14} className="text-gold" />
          <span className="font-display text-gold font-semibold">DraftSage</span>
        </div>
        <p>DraftSage is not affiliated with Riot Games. League of Legends is a trademark of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}
