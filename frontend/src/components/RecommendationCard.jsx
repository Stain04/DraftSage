import React, { useState } from "react";
import {
  Zap, Target, Star, AlertTriangle, Swords, FlaskConical,
  Layers, ChevronDown, ChevronUp, Shield, Clock, Users, TrendingUp,
} from "lucide-react";
import { getChampionIconUrl } from "../api/riotApi";

// ── Configs ───────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  Easy:   { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  Medium: { bg: "bg-yellow-500/15",  text: "text-yellow-300",  border: "border-yellow-500/30",  dot: "bg-yellow-400" },
  Hard:   { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30",     dot: "bg-red-400" },
};

const DAMAGE_TYPE_CONFIG = {
  AD:    { label: "AD Dmg",    bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30", icon: <Swords size={10} /> },
  AP:    { label: "AP Dmg",    bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30", icon: <FlaskConical size={10} /> },
  Mixed: { label: "Mixed Dmg", bg: "bg-teal-500/15",   text: "text-teal-300",   border: "border-teal-500/30",  icon: <Layers size={10} /> },
  True:  { label: "True Dmg",  bg: "bg-gold/15",       text: "text-gold",       border: "border-gold/30",      icon: <Zap size={10} /> },
};

const COMP_ICONS = {
  engage: "⚔️", poke: "🏹", teamfight: "🔥",
  splitpush: "🌊", pick: "🎯", protect: "🛡️", scaling: "📈",
};

const GRADE_CONFIG = {
  A: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", label: "A" },
  B: { bg: "bg-yellow-500/20",  text: "text-yellow-400",  border: "border-yellow-500/40",  label: "B" },
  C: { bg: "bg-red-500/20",     text: "text-red-400",     border: "border-red-500/40",     label: "C" },
};

const TIER_CONFIG = {
  S: { bg: "bg-gold/20",        text: "text-gold",        border: "border-gold/50",        label: "S Tier" },
  A: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", label: "A Tier" },
  B: { bg: "bg-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/40",    label: "B Tier" },
  C: { bg: "bg-red-500/20",     text: "text-red-400",     border: "border-red-500/40",     label: "C Tier" },
};

const CURVE_LABELS = { early: "Early game", mid: "Mid game", late: "Late game", scaling: "Scaling" };

// ── RecommendationCard ────────────────────────────────────────────────────────

export default function RecommendationCard({ rec, rank, isTopPick = false, banMode = false }) {
  const [expanded, setExpanded] = useState(false);
  const diff    = DIFFICULTY_CONFIG[rec.difficulty]    || DIFFICULTY_CONFIG.Medium;
  const dmg     = DAMAGE_TYPE_CONFIG[rec.damage_type]  || DAMAGE_TYPE_CONFIG.Mixed;
  const tier    = TIER_CONFIG[rec.patch_tier]          || TIER_CONFIG.B;
  const iconUrl = getChampionIconUrl(rec.champion);

  return (
    <div
      className={`card-gold rounded-2xl p-5 animate-bounce-in transition-all hover:scale-[1.01]
        ${isTopPick ? "ring-1 ring-gold/40 shadow-gold" : ""}`}
      style={{ animationDelay: `${rank * 100}ms` }}
    >
      {/* ── Header ── */}
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
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="font-bold text-lg text-white">{rec.champion}</h3>
            {isTopPick && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gold/20 text-gold border border-gold/30 font-semibold">
                <Star size={10} fill="currentColor" /> Best Pick
              </span>
            )}
          </div>
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {/* Difficulty */}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${diff.bg} ${diff.text} ${diff.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
              {rec.difficulty || "Medium"}
            </span>
            {/* Patch Tier */}
            {rec.patch_tier && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${tier.bg} ${tier.text} ${tier.border}`}>
                {tier.label}
              </span>
            )}
            {/* Damage type */}
            {rec.damage_type && !banMode && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${dmg.bg} ${dmg.text} ${dmg.border}`}>
                {dmg.icon} {dmg.label}
              </span>
            )}
            {/* Fills gap */}
            {rec.fills_gap && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                ✦ {rec.fills_gap}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divider-gold mb-4" />

      {/* ── Analysis ── */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={13} className="text-gold flex-shrink-0" />
          <span className="text-xs font-semibold text-gold uppercase tracking-wider">Analysis</span>
        </div>
        <p className="text-sm text-navy-200 leading-relaxed">{rec.reason}</p>
      </div>

      {/* ── Win Condition ── */}
      <div className="mb-3 p-3 rounded-lg bg-navy-900/50 border border-emerald-500/20">
        <div className="flex items-center gap-1.5 mb-1">
          <Target size={13} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Win Condition</span>
        </div>
        <p className="text-sm text-emerald-300 leading-relaxed">{rec.win_condition}</p>
      </div>

      {/* ── Power Spike + Summoner Spells row ── */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {rec.power_spike && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <Clock size={12} className="text-amber-400" />
            <span className="text-amber-300 font-medium">{rec.power_spike}</span>
          </div>
        )}
        {rec.summoner_spells?.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800/60 border border-navy-600 text-xs">
            <Zap size={12} className="text-navy-400" />
            <span className="text-navy-300">{rec.summoner_spells.join(" + ")}</span>
          </div>
        )}
      </div>

      {/* ── Synergies & Counters ── */}
      {(rec.synergies?.length > 0 || rec.counters?.length > 0) && (
        <div className="flex gap-3 text-xs mb-3">
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

      {/* ── Expandable Details ── */}
      {(rec.early_game_plan || rec.team_fighting_role) && (
        <>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-navy-400 hover:text-white transition-colors border-t border-navy-700 mt-1"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Hide" : "Show"} game plan
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {rec.early_game_plan && (
                <div className="p-3 rounded-lg bg-navy-900/50 border border-navy-600">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield size={12} className="text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Laning Phase</span>
                  </div>
                  <p className="text-xs text-navy-200 leading-relaxed">{rec.early_game_plan}</p>
                </div>
              )}
              {rec.team_fighting_role && (
                <div className="p-3 rounded-lg bg-navy-900/50 border border-navy-600">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users size={12} className="text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Teamfight Role</span>
                  </div>
                  <p className="text-xs text-navy-200 leading-relaxed">{rec.team_fighting_role}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function RecommendationSkeleton() {
  return (
    <div className="card-gold rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton w-16 h-16 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-5 w-28 mb-2 rounded" />
          <div className="skeleton h-4 w-36 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full mb-2 rounded" />
      <div className="skeleton h-3 w-4/5 mb-4 rounded" />
      <div className="skeleton h-16 w-full rounded-lg mb-3" />
      <div className="skeleton h-8 w-full rounded-lg" />
    </div>
  );
}

// ── TeamAnalysisPanel ─────────────────────────────────────────────────────────

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
              <span key={gap} className="px-2 py-0.5 text-xs rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">{gap}</span>
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

// ── WhyNotSection ─────────────────────────────────────────────────────────────

export function WhyNotSection({ whyNot, teamWinCondition, compositionType, powerCurve, keyThreats, draftGrade, draftGradeReason }) {
  const icon  = COMP_ICONS[compositionType] || "⚡";
  const grade = GRADE_CONFIG[draftGrade];
  const curveLabel = CURVE_LABELS[powerCurve] || powerCurve;

  return (
    <div className="card rounded-2xl p-5 border border-amber-500/20 animate-slide-up space-y-3">

      {/* Draft Grade */}
      {grade && (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold border ${grade.bg} ${grade.text} ${grade.border}`}>
            {grade.label}
          </div>
          <div>
            <p className="text-xs text-navy-400">Draft Grade</p>
            <p className="text-sm text-white font-medium">{draftGradeReason}</p>
          </div>
        </div>
      )}

      {/* Team Win Condition */}
      {teamWinCondition && (
        <div className="p-3 rounded-lg bg-navy-900/50 border border-gold/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-navy-400">{icon} Team comp: <span className="text-gold capitalize">{compositionType}</span></p>
            {curveLabel && (
              <span className="flex items-center gap-1 text-xs text-navy-400">
                <TrendingUp size={11} /> {curveLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-white font-medium">{teamWinCondition}</p>
        </div>
      )}

      {/* Key Threats */}
      {keyThreats?.length > 0 && (
        <div>
          <p className="text-xs text-navy-400 mb-1.5 flex items-center gap-1">
            <AlertTriangle size={11} className="text-red-400" /> Key threats to respect
          </p>
          <div className="flex flex-wrap gap-1">
            {keyThreats.map((t) => (
              <span key={t} className="px-2 py-0.5 text-xs rounded bg-red-500/15 text-red-300 border border-red-500/20">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Why Not */}
      {whyNot && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Avoid These Picks</span>
          </div>
          <p className="text-sm text-navy-300 leading-relaxed">{whyNot}</p>
        </div>
      )}
    </div>
  );
}
