import React from "react";
import { Zap, Target, Star, AlertTriangle, Swords, FlaskConical, Layers } from "lucide-react";
import { getChampionIconUrl } from "../api/riotApi";

const DIFFICULTY_CONFIG = {
  Easy:   { class: "badge-easy",   label: "Easy" },
  Medium: { class: "badge-medium", label: "Medium" },
  Hard:   { class: "badge-hard",   label: "Hard" },
};

const COMP_ICONS = {
  engage:    "⚔️",
  poke:      "🏹",
  teamfight: "🔥",
  splitpush: "🌊",
  pick:      "🎯",
  protect:   "🛡️",
  scaling:   "📈",
};

const DAMAGE_TYPE_CONFIG = {
  AD:    { label: "AD",    bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30", icon: <Swords size={10} /> },
  AP:    { label: "AP",    bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30", icon: <FlaskConical size={10} /> },
  Mixed: { label: "Mixed", bg: "bg-teal-500/15",   text: "text-teal-300",   border: "border-teal-500/30",  icon: <Layers size={10} /> },
  True:  { label: "True",  bg: "bg-gold/15",       text: "text-gold",       border: "border-gold/30",      icon: <Zap size={10} /> },
};

export default function RecommendationCard({ rec, rank, isTopPick = false }) {
  const diff   = DIFFICULTY_CONFIG[rec.difficulty] || DIFFICULTY_CONFIG.Medium;
  const dmg    = DAMAGE_TYPE_CONFIG[rec.damage_type] || DAMAGE_TYPE_CONFIG.Mixed;
  const iconUrl = getChampionIconUrl(rec.champion);

  return (
    <div
      className={`card-gold rounded-2xl p-5 animate-bounce-in transition-all hover:scale-[1.01]
        ${isTopPick ? "ring-1 ring-gold/40 shadow-gold" : ""}`}
      style={{ animationDelay: `${rank * 100}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <img
            src={iconUrl}
            alt={rec.champion}
            className="w-16 h-16 rounded-xl object-cover border-2 border-gold/40 shadow-champ"
            onError={(e) => { e.target.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${rec.champion}.png`; }}
          />
          <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${isTopPick ? "bg-gold-gradient text-navy-900 shadow-gold" : "bg-navy-700 border border-navy-500 text-navy-300"}`}>
            #{rank + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-lg text-white">{rec.champion}</h3>
            {isTopPick && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gold/20 text-gold border border-gold/30 font-semibold">
                <Star size={10} fill="currentColor" /> Best Pick
              </span>
            )}
          </div>
          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${diff.class}`}>
              {diff.label}
            </span>
            {rec.damage_type && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${dmg.bg} ${dmg.text} ${dmg.border}`}>
                {dmg.icon} {dmg.label} Dmg
              </span>
            )}
            {rec.fills_gap && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                ✦ {rec.fills_gap}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divider-gold mb-4" />

      {/* Analysis */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={13} className="text-gold flex-shrink-0" />
          <span className="text-xs font-semibold text-gold uppercase tracking-wider">Analysis</span>
        </div>
        <p className="text-sm text-navy-200 leading-relaxed">{rec.reason}</p>
      </div>

      {/* Win Condition */}
      <div className="mb-3 p-3 rounded-lg bg-navy-900/50 border border-emerald-500/20">
        <div className="flex items-center gap-1.5 mb-1">
          <Target size={13} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Win Condition</span>
        </div>
        <p className="text-sm text-emerald-300 leading-relaxed">{rec.win_condition}</p>
      </div>

      {/* Synergies & Counters */}
      {(rec.synergies?.length > 0 || rec.counters?.length > 0) && (
        <div className="flex gap-3 text-xs">
          {rec.synergies?.length > 0 && (
            <div className="flex-1">
              <span className="text-navy-400 font-medium block mb-1">Synergizes with</span>
              <div className="flex flex-wrap gap-1">
                {rec.synergies.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">{s}</span>
                ))}
              </div>
            </div>
          )}
          {rec.counters?.length > 0 && (
            <div className="flex-1">
              <span className="text-navy-400 font-medium block mb-1">Counters</span>
              <div className="flex flex-wrap gap-1">
                {rec.counters.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/20">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RecommendationSkeleton() {
  return (
    <div className="card-gold rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton w-16 h-16 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-5 w-28 mb-2 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full mb-2 rounded" />
      <div className="skeleton h-3 w-4/5 mb-4 rounded" />
      <div className="skeleton h-16 w-full rounded-lg" />
    </div>
  );
}

export function TeamAnalysisPanel({ teamAnalysis }) {
  if (!teamAnalysis) return null;
  return (
    <div className="card rounded-2xl p-4 border border-blue-500/20 animate-fade-in">
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">🔍 Draft Analysis</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-700">
          <p className="text-xs text-navy-400 mb-1">Your team damage</p>
          <p className="text-sm font-semibold text-white">{teamAnalysis.ally_damage_type || "—"}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-700">
          <p className="text-xs text-navy-400 mb-1">Enemy damage</p>
          <p className="text-sm font-semibold text-white">{teamAnalysis.enemy_damage_type || "—"}</p>
        </div>
      </div>
      {teamAnalysis.missing_from_ally?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-navy-400 mb-1.5">Missing from your comp</p>
          <div className="flex flex-wrap gap-1">
            {teamAnalysis.missing_from_ally.map((gap) => (
              <span key={gap} className="px-2 py-0.5 text-xs rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
      {teamAnalysis.enemy_win_condition && (
        <div className="p-2.5 rounded-lg bg-red-900/20 border border-red-500/20 mt-2">
          <p className="text-xs text-red-400 mb-1">Enemy win condition</p>
          <p className="text-xs text-red-200">{teamAnalysis.enemy_win_condition}</p>
        </div>
      )}
    </div>
  );
}

export function WhyNotSection({ whyNot, teamWinCondition, compositionType }) {
  const icon = COMP_ICONS[compositionType] || "⚡";
  return (
    <div className="card rounded-2xl p-5 border border-amber-500/20 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-400" />
        <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Why Not Other Options</span>
      </div>
      <p className="text-sm text-navy-300 leading-relaxed mb-3">{whyNot}</p>

      {teamWinCondition && (
        <div className="p-3 rounded-lg bg-navy-900/50 border border-gold/20">
          <p className="text-xs text-navy-400 mb-1">
            {icon} Full team composition: <span className="text-gold capitalize">{compositionType}</span>
          </p>
          <p className="text-sm text-white font-medium">{teamWinCondition}</p>
        </div>
      )}
    </div>
  );
}
