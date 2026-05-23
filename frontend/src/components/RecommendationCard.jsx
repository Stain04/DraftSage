import React, { useState } from "react";
import {
  Zap, Target, Star, AlertTriangle, Swords, FlaskConical,
  Layers, ChevronDown, ChevronUp, Shield, Clock, Users, TrendingUp,
} from "lucide-react";
import { getChampionIconUrl, getChampionSplashUrl } from "../api/riotApi";

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

  const splashUrl = getChampionSplashUrl(rec.champion);

  return (
    <div
      className={`card-gold rounded-2xl overflow-hidden animate-bounce-in transition-all hover:scale-[1.01]
        ${isTopPick ? "ring-1 ring-gold/40 shadow-gold" : ""}`}
      style={{ animationDelay: `${rank * 100}ms` }}
    >
      {/* ── Splash art header ── */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={splashUrl}
          alt={rec.champion}
          className="w-full h-full object-cover object-top"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        {/* gradient fade into card */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-navy-900" />
        {/* rank badge */}
        <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg
          ${isTopPick ? "bg-gold-gradient text-navy-900" : "bg-navy-800/90 border border-navy-600 text-navy-300"}`}>
          #{rank + 1}
        </div>
        {isTopPick && (
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gold/90 text-navy-900 font-bold shadow">
            <Star size={10} fill="currentColor" /> Best Pick
          </span>
        )}
        {/* champion icon + name overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end gap-3">
          <img
            src={iconUrl}
            alt={rec.champion}
            className="w-12 h-12 rounded-xl object-cover border-2 border-gold/50 shadow-champ flex-shrink-0"
            onError={(e) => { e.target.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${rec.champion}.png`; }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-white drop-shadow">{rec.champion}</h3>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-5 pt-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
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
                ✦ Fills {rec.fills_gap}
              </span>
            )}
            {/* Answers threat */}
            {rec.answers_threat && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/25">
                ⚔ Counters {rec.answers_threat}
              </span>
            )}
          </div>

      {/* ── Confidence meter ── */}
      {rec.score_breakdown?.confidence != null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-navy-400 font-medium uppercase tracking-wider">Confidence</span>
            <span className="text-gold font-bold">{rec.score_breakdown.confidence}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-navy-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-gold to-emerald-400"
              style={{ width: `${Math.min(100, Math.max(0, rec.score_breakdown.confidence))}%` }}
            />
          </div>
        </div>
      )}

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

        {/* ── Synergies & Counters with mini icons ── */}
        {(rec.synergies?.length > 0 || rec.counters?.length > 0) && (
          <div className="flex gap-3 text-xs mb-3">
            {rec.synergies?.length > 0 && (
              <div className="flex-1">
                <span className="text-navy-400 font-medium block mb-1">Synergizes with</span>
                <div className="flex flex-wrap gap-1">
                  {rec.synergies.map((s) => (
                    <span key={s} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      <img src={getChampionIconUrl(s)} alt={s}
                        className="w-4 h-4 rounded object-cover"
                        onError={(e) => { e.target.style.display="none"; }} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {rec.counters?.length > 0 && (
              <div className="flex-1">
                <span className="text-navy-400 font-medium block mb-1">Counters</span>
                <div className="flex flex-wrap gap-1">
                  {rec.counters.map((c) => (
                    <span key={c} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/20">
                      <img src={getChampionIconUrl(c)} alt={c}
                        className="w-4 h-4 rounded object-cover"
                        onError={(e) => { e.target.style.display="none"; }} />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Score Breakdown ── */}
        {rec.score_breakdown && (rec.score_breakdown.lane != null || rec.score_breakdown.team_fit != null) && (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { key: "lane",          label: "Lane",   max: 40, color: "bg-blue-500"    },
              { key: "team_fit",      label: "Fit",    max: 25, color: "bg-emerald-500" },
              { key: "threat_answer", label: "Threat", max: 20, color: "bg-red-500"     },
              { key: "meta",          label: "Meta",   max: 15, color: "bg-purple-500"  },
            ].map(({ key, label, max, color }) => {
              const val = Number(rec.score_breakdown[key] ?? 0);
              const pct = Math.min(100, (val / max) * 100);
              return (
                <div key={key} className="p-1.5 rounded-md bg-navy-900/60 border border-navy-700">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="text-[10px] text-navy-400 uppercase tracking-wider">{label}</span>
                    <span className="text-[11px] text-white font-semibold">{val}<span className="text-navy-500">/{max}</span></span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-navy-800 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
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
  const allyArch  = teamAnalysis.ally_archetype;
  const enemyArch = teamAnalysis.enemy_archetype;
  return (
    <div className="card rounded-2xl p-4 border border-blue-500/20 animate-fade-in">
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">🔍 Draft Analysis</p>
      {/* Damage + Archetype row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-700">
          <p className="text-xs text-navy-400 mb-1">Your team</p>
          <p className="text-sm font-semibold text-white">{teamAnalysis.ally_damage_type || "—"}</p>
          {allyArch && (
            <p className="text-[11px] text-blue-300 mt-0.5 capitalize">{COMP_ICONS[allyArch] || "⚡"} {allyArch}</p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-700">
          <p className="text-xs text-navy-400 mb-1">Enemy team</p>
          <p className="text-sm font-semibold text-white">{teamAnalysis.enemy_damage_type || "—"}</p>
          {enemyArch && (
            <p className="text-[11px] text-red-300 mt-0.5 capitalize">{COMP_ICONS[enemyArch] || "⚡"} {enemyArch}</p>
          )}
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

// ── AvoidChampionsSection ─────────────────────────────────────────────────────
// Renders the deterministic + AI-derived "do not pick" list with reasons.

export function AvoidChampionsSection({ avoidChampions }) {
  if (!avoidChampions?.length) return null;

  // Group by reason to avoid repetition (deterministic rules share reasons)
  const groups = new Map();
  for (const item of avoidChampions) {
    if (!item?.champion) continue;
    const key = item.reason || "Bad fit vs this comp";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item.champion);
  }

  return (
    <div className="card rounded-2xl p-5 border border-red-500/25 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-red-400" />
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Do Not Pick</span>
      </div>
      <div className="space-y-2.5">
        {Array.from(groups.entries()).map(([reason, champs], idx) => (
          <div key={idx} className="p-2.5 rounded-lg bg-red-900/10 border border-red-500/15">
            <div className="flex flex-wrap gap-1 mb-1.5">
              {champs.map((c) => (
                <span key={c} className="px-2 py-0.5 text-xs rounded bg-red-500/15 text-red-200 border border-red-500/25 font-medium">
                  {c}
                </span>
              ))}
            </div>
            <p className="text-xs text-navy-300 leading-relaxed">{reason}</p>
          </div>
        ))}
      </div>
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
