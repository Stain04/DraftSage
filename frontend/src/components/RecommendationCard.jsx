import React from "react";
import { Zap, Target, Star, AlertTriangle } from "lucide-react";
import { getChampionIconUrl } from "../api/riotApi";

const DIFFICULTY_CONFIG = {
  Easy:   { class: "badge-easy",   label: "Easy",   icon: "⭐" },
  Medium: { class: "badge-medium", label: "Medium", icon: "⭐⭐" },
  Hard:   { class: "badge-hard",   label: "Hard",   icon: "⭐⭐⭐" },
};

const COMP_ICONS = {
  engage:    "⚔️",
  poke:      "🏹",
  teamfight: "🔥",
  splitpush: "🌊",
  pick:      "🎯",
  protect:   "🛡️",
};

export default function RecommendationCard({ rec, rank, isTopPick = false }) {
  const diff = DIFFICULTY_CONFIG[rec.difficulty] || DIFFICULTY_CONFIG.Medium;
  const iconUrl = getChampionIconUrl(rec.champion);

  return (
    <div className={`card-gold rounded-2xl p-5 animate-bounce-in transition-all hover:scale-[1.01]
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
          {isTopPick && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold-gradient flex items-center justify-center text-navy-900 text-xs font-bold shadow-gold">
              #{rank + 1}
            </div>
          )}
          {!isTopPick && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-navy-700 border border-navy-500 flex items-center justify-center text-navy-300 text-xs font-bold">
              #{rank + 1}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg text-white">{rec.champion}</h3>
            {isTopPick && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gold/20 text-gold border border-gold/30 font-semibold">
                <Star size={10} fill="currentColor" /> Best Pick
              </span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${diff.class}`}>
            {diff.label}
          </span>
        </div>
      </div>

      <div className="divider-gold mb-4" />

      {/* Reason */}
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
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full mb-2 rounded" />
      <div className="skeleton h-3 w-4/5 mb-4 rounded" />
      <div className="skeleton h-16 w-full rounded-lg" />
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
