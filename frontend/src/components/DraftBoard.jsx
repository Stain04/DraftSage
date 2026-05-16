import React, { useState, useEffect } from "react";
import {
  Swords, Shield, Wand2, Crosshair, Users, Brain, RefreshCw,
  Lock, Ban, ChevronDown, ChevronUp, X, Bookmark, Sparkles, Play,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ChampionSearch from "./ChampionSearch";
import TeamSlot from "./TeamSlot";
import RecommendationCard, {
  RecommendationSkeleton, WhyNotSection,
  TeamAnalysisPanel, AvoidChampionsSection,
} from "./RecommendationCard";
import { getSuggestions, describeApiError } from "../api/geminiApi";
import { fetchAllChampions } from "../api/riotApi";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../context/AuthContext";

const ROLES = [
  { id: "Top",     icon: <Swords    size={14} />, label: "Top"     },
  { id: "Jungle",  icon: <Shield    size={14} />, label: "Jungle"  },
  { id: "Mid",     icon: <Wand2     size={14} />, label: "Mid"     },
  { id: "Bot",     icon: <Crosshair size={14} />, label: "Bot"     },
  { id: "Support", icon: <Users     size={14} />, label: "Support" },
];

const FREE_LIMIT = 3;
const USAGE_KEY  = "draftsage_daily_usage";
const POOL_KEY   = "draftsage_champion_pool";

function getDailyUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { count: 0, date: new Date().toDateString() };
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toDateString()) return { count: 0, date: new Date().toDateString() };
    return parsed;
  } catch { return { count: 0, date: new Date().toDateString() }; }
}
function incrementUsage() {
  const usage = getDailyUsage();
  const updated = { ...usage, count: usage.count + 1 };
  localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
  return updated.count;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DraftBoard() {
  const { isPro, isAdmin, user } = useAuth();
  const [champions, setChampions] = useState([]);
  const [allyPicks,  setAllyPicks]  = useState(ROLES.map((r) => ({ champion: null, role: r.id })));
  const [enemyPicks, setEnemyPicks] = useState(ROLES.map((r) => ({ champion: null, role: r.id })));
  const [role, setRole]         = useState("Mid");
  const [banMode, setBanMode]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [champLoading, setChampLoading] = useState(true);
  const [result, setResult]     = useState(null);
  const [usage, setUsage]       = useState(getDailyUsage());

  // Champion pool (Pro)
  const [championPool, setChampionPool] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POOL_KEY) || "[]"); } catch { return []; }
  });
  const [poolOpen, setPoolOpen] = useState(false);

  // drag state
  const [dragIndex,      setDragIndex]      = useState(null);
  const [dragOverIndex,  setDragOverIndex]  = useState(null);
  const [eDragIndex,     setEDragIndex]     = useState(null);
  const [eDragOverIndex, setEDragOverIndex] = useState(null);

  const takenAllyRoles = new Set(allyPicks.filter((s) => s.champion).map((s) => s.role));

  useEffect(() => {
    if (takenAllyRoles.has(role)) {
      const next = ROLES.find((r) => !takenAllyRoles.has(r.id));
      if (next) setRole(next.id);
    }
  }, [allyPicks]); // eslint-disable-line

  const isLocked  = !isPro && !isAdmin && getDailyUsage().count >= FREE_LIMIT;
  const usageLeft = FREE_LIMIT - usage.count;

  useEffect(() => {
    fetchAllChampions()
      .then(setChampions)
      .catch(() => toast.error("Could not load champions."))
      .finally(() => setChampLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(POOL_KEY, JSON.stringify(championPool));
  }, [championPool]);

  const excludedIds = [
    ...allyPicks.filter((s) => s.champion).map((s) => s.champion.id),
    ...enemyPicks.filter((s) => s.champion).map((s) => s.champion.id),
  ];
  const poolExcludeIds = championPool.map((c) => c.id);

  const addAlly = (champ) => {
    const slot = allyPicks.findIndex((s) => !s.champion);
    if (slot === -1) return toast.error("Ally team is full!");
    setAllyPicks((prev) => { const n = [...prev]; n[slot] = { ...n[slot], champion: champ }; return n; });
  };
  const addEnemy = (champ) => {
    const slot = enemyPicks.findIndex((s) => !s.champion);
    if (slot === -1) return toast.error("Enemy team is full!");
    setEnemyPicks((prev) => { const n = [...prev]; n[slot] = { ...n[slot], champion: champ }; return n; });
  };
  const removeAlly  = (i) => setAllyPicks ((prev) => { const n = [...prev]; n[i] = { ...n[i], champion: null }; return n; });
  const removeEnemy = (i) => setEnemyPicks((prev) => { const n = [...prev]; n[i] = { ...n[i], champion: null }; return n; });

  const addToPool      = (champ) => { if (!championPool.find((c) => c.id === champ.id)) setChampionPool((prev) => [...prev, champ]); };
  const removeFromPool = (id)    => setChampionPool((prev) => prev.filter((c) => c.id !== id));

  // Drag handlers — ally
  const handleDragStart = (e, i) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver  = (e, i) => { if (i !== dragIndex) setDragOverIndex(i); };
  const handleDrop      = (e, t) => {
    if (dragIndex === null || dragIndex === t) return;
    setAllyPicks((prev) => {
      const n = [...prev];
      const dc = n[dragIndex].champion;
      n[dragIndex] = { ...n[dragIndex], champion: n[t].champion };
      n[t]         = { ...n[t],         champion: dc };
      return n;
    });
    setDragIndex(null); setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  // Drag handlers — enemy
  const handleEDragStart = (e, i) => { setEDragIndex(i); e.dataTransfer.effectAllowed = "move"; };
  const handleEDragOver  = (e, i) => { if (i !== eDragIndex) setEDragOverIndex(i); };
  const handleEDrop      = (e, t) => {
    if (eDragIndex === null || eDragIndex === t) return;
    setEnemyPicks((prev) => {
      const n = [...prev];
      const dc = n[eDragIndex].champion;
      n[eDragIndex] = { ...n[eDragIndex], champion: n[t].champion };
      n[t]          = { ...n[t],          champion: dc };
      return n;
    });
    setEDragIndex(null); setEDragOverIndex(null);
  };
  const handleEDragEnd = () => { setEDragIndex(null); setEDragOverIndex(null); };

  const resetDraft = () => {
    setAllyPicks(ROLES.map((r)  => ({ champion: null, role: r.id })));
    setEnemyPicks(ROLES.map((r) => ({ champion: null, role: r.id })));
    setResult(null);
  };

  const saveDraftHistory = async (draftResult) => {
    if (!user || !isPro) return;
    try {
      await supabase.from("draft_history").insert({
        user_id:     user.id,
        role,
        ban_mode:    banMode,
        ally_picks:  allyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`),
        enemy_picks: enemyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`),
        result:      draftResult,
      });
    } catch { /* silent */ }
  };

  const handleSuggest = async () => {
    if (isLocked) return toast.error("Daily limit reached. Upgrade to Pro for unlimited suggestions!");
    setLoading(true);
    setResult(null);
    try {
      const allyNames  = allyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`);
      const enemyNames = enemyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`);
      const pool       = (isPro || isAdmin) && championPool.length > 0 ? championPool.map((c) => c.name) : null;

      const data = await getSuggestions({
        allyPicks: allyNames,
        enemyPicks: enemyNames,
        role,
        championPool: pool,
        banMode,
      });

      setResult(data);
      saveDraftHistory(data);

      if (!isPro && !isAdmin) {
        const newCount = incrementUsage();
        setUsage({ count: newCount, date: new Date().toDateString() });
      }

      // Scroll to results
      setTimeout(() => {
        document.getElementById("engine-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } catch (err) {
      toast.error(describeApiError(err, "Engine analysis failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderTeamPanel = (side) => {
    const picks   = side === "ally" ? allyPicks  : enemyPicks;
    const isAlly  = side === "ally";
    const onAdd   = isAlly ? addAlly  : addEnemy;
    const onRem   = isAlly ? removeAlly : removeEnemy;
    const dStart  = isAlly ? handleDragStart : handleEDragStart;
    const dOver   = isAlly ? handleDragOver  : handleEDragOver;
    const dDrop   = isAlly ? handleDrop      : handleEDrop;
    const dEnd    = isAlly ? handleDragEnd   : handleEDragEnd;
    const overIdx = isAlly ? dragOverIndex   : eDragOverIndex;
    const dragIdx = isAlly ? dragIndex       : eDragIndex;

    return (
      <div className={`card-premium rounded-2xl p-4 sm:p-5 relative`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isAlly ? "bg-blue-400 shadow-glow-blue" : "bg-red-400"}`} />
            <h2 className={`font-display text-sm font-bold uppercase tracking-widest ${isAlly ? "text-blue-300" : "text-red-300"}`}>
              {isAlly ? "Your Team" : "Enemy Team"}
            </h2>
          </div>
          <span className={`text-[10px] font-mono uppercase tracking-wider ${isAlly ? "text-blue-400/60" : "text-red-400/60"}`}>
            {picks.filter((p) => p.champion).length} / 5
          </span>
        </div>

        {/* Search */}
        <div className="mb-3">
          {champLoading ? (
            <div className="skeleton h-9 w-full rounded-lg" />
          ) : (
            <ChampionSearch
              champions={champions}
              onSelect={onAdd}
              excludeIds={excludedIds}
              placeholder={isAlly ? "Add ally champion…" : "Add enemy champion…"}
            />
          )}
        </div>

        {/* 5 horizontal slot cards */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {picks.map((slot, i) => (
            <TeamSlot
              key={i}
              index={i}
              champion={slot.champion}
              side={side}
              onRemove={onRem}
              role={slot.role}
              onDragStart={dStart}
              onDragOver={dOver}
              onDrop={dDrop}
              onDragEnd={dEnd}
              isDragOver={overIdx === i && dragIdx !== i}
            />
          ))}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 relative overflow-hidden">

      {/* Backdrop */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="aurora-blob bg-gold/15 w-[500px] h-[500px] -top-20 left-1/4" />
      <div className="aurora-blob bg-cyan/15 w-[450px] h-[450px] top-1/3 right-0" style={{ animationDelay: "3s" }} />

      <div className="max-w-[1400px] mx-auto relative z-10">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6 animate-fade-in">
          <div>
            <p className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-neon-cyan mb-1">
              {"// DraftSage Engine v2"}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Draft Board</h1>
          </div>
          {!isPro && !isAdmin && (
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium font-mono uppercase tracking-wider
              ${usageLeft <= 1
                ? "border-magenta/50 bg-magenta/10 text-magenta"
                : "border-navy-600 bg-navy-900/60 text-navy-300"}`}>
              {usageLeft > 0
                ? `${usageLeft} / ${FREE_LIMIT} Engine runs left today`
                : "Daily limit reached — Upgrade to Pro"}
            </div>
          )}
          {(isPro || isAdmin) && (
            <div className="px-3 py-1.5 rounded-lg border border-gold/40 bg-gold/10 text-xs font-medium font-mono uppercase tracking-wider text-gold flex items-center gap-1.5">
              <Sparkles size={12} /> Unlimited Engine
            </div>
          )}
        </div>

        {/* ── Action bar ──────────────────────────────────────────── */}
        <div className="card-premium rounded-2xl p-3 sm:p-4 mb-5 relative animate-slide-up">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            {/* Mode toggle (Pick / Ban) */}
            <div className="inline-flex items-center p-1 rounded-xl border border-navy-700 bg-navy-900/70">
              <button
                onClick={() => setBanMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5
                  ${!banMode
                    ? "bg-gold-gradient text-navy-900 shadow-gold"
                    : "text-navy-400 hover:text-white"}`}
              >
                <Brain size={13} /> Pick
              </button>
              <button
                onClick={() => (isPro || isAdmin) ? setBanMode(true) : toast.error("Ban mode requires Pro!")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 relative
                  ${banMode
                    ? "bg-magenta text-white shadow-glow-mag"
                    : "text-navy-400 hover:text-white"}`}
              >
                <Ban size={13} /> Ban
                {!isPro && !isAdmin && (
                  <Lock size={9} className="text-gold ml-0.5" />
                )}
              </button>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block h-7 w-px bg-navy-700" />

            {/* Role pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-navy-400 mr-1 hidden sm:inline">
                Role:
              </span>
              {ROLES.map((r) => {
                const isTaken    = takenAllyRoles.has(r.id);
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => !isTaken && setRole(r.id)}
                    disabled={isTaken}
                    title={isTaken ? `${r.label} is already picked` : r.label}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 relative
                      ${isTaken
                        ? "border-navy-800 bg-navy-900/30 text-navy-700 cursor-not-allowed"
                        : isSelected
                        ? "border-cyan/60 bg-cyan/10 text-cyan shadow-glow-cyan"
                        : "border-navy-700 text-navy-300 hover:border-navy-500 hover:text-white"}`}
                  >
                    {isTaken ? <Lock size={11} /> : r.icon}
                    <span className="hidden sm:inline">{r.label}</span>
                    <span className="sm:hidden">{r.label.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>

            {/* Spacer to push right cluster to the end */}
            <div className="flex-1 min-w-0" />

            {/* Champion pool button (Pro) */}
            <button
              onClick={() => (isPro || isAdmin) ? setPoolOpen(!poolOpen) : toast.error("Champion pool is a Pro feature!")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5
                ${poolOpen
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-navy-700 bg-navy-900/60 text-navy-300 hover:border-navy-500 hover:text-white"}`}
            >
              <Bookmark size={13} />
              <span>Pool</span>
              {!isPro && !isAdmin
                ? <Lock size={10} className="text-gold ml-0.5" />
                : championPool.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold font-bold">
                      {championPool.length}
                    </span>
                  )}
              {(isPro || isAdmin) && (poolOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
            </button>

            {/* Run Engine — primary CTA */}
            <button
              onClick={handleSuggest}
              disabled={loading || isLocked}
              className={`px-5 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                ${isLocked
                  ? "bg-navy-700 border border-navy-600 text-navy-500 cursor-not-allowed"
                  : loading
                  ? "bg-navy-700 border border-cyan/30 text-cyan cursor-wait"
                  : "btn-esports shadow-glow-cyan"}`}
            >
              {isLocked ? (
                <><Lock size={14} /> Upgrade</>
              ) : loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  Analyzing
                </>
              ) : (
                <><Play size={14} fill="currentColor" /> Run Engine</>
              )}
            </button>

            {/* Reset (icon-only) */}
            <button
              onClick={resetDraft}
              aria-label="Reset draft"
              title="Reset draft"
              className="w-9 h-9 rounded-lg border border-navy-700 bg-navy-900/60 text-navy-400 hover:border-navy-500 hover:text-white transition-all flex items-center justify-center"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Champion pool — collapsible panel inside action bar */}
          {poolOpen && (isPro || isAdmin) && (
            <div className="mt-3 pt-3 border-t border-navy-700 animate-fade-in">
              <ChampionSearch
                champions={champions}
                onSelect={addToPool}
                excludeIds={poolExcludeIds}
                placeholder="Add a champion to your pool…"
              />
              {championPool.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {championPool.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-1.5 bg-navy-800 border border-navy-700 rounded-md px-1.5 py-1 text-xs text-white"
                    >
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${c.id}.png`}
                        alt={c.name}
                        className="w-5 h-5 rounded"
                      />
                      {c.name}
                      <button
                        onClick={() => removeFromPool(c.id)}
                        className="text-navy-500 hover:text-magenta transition-colors"
                        aria-label={`Remove ${c.name} from pool`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-500 text-center py-3 italic">
                  No pool set — Engine will suggest from all champions.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Two-team layout ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
          <div className="animate-slide-up" style={{ animationDelay: "0.05s" }}>
            {renderTeamPanel("ally")}
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {renderTeamPanel("enemy")}
          </div>
        </div>

        {/* ── Engine output ──────────────────────────────────────── */}
        <div id="engine-output">
          {loading && (
            <div className="card-premium rounded-2xl p-5 sm:p-6 animate-slide-up">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-mono font-bold uppercase tracking-widest text-neon-cyan">
                  {"// Engine analyzing draft…"}
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <RecommendationSkeleton />
                <RecommendationSkeleton />
                <RecommendationSkeleton />
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5 animate-slide-up">

              {/* Output header strip */}
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />
                <span className="text-[11px] sm:text-xs text-neon-cyan font-bold uppercase tracking-widest font-mono whitespace-nowrap">
                  {banMode ? "// Ban Recommendations" : "// Engine Recommendations"}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />
              </div>

              {/* Team analysis (full-width) */}
              <TeamAnalysisPanel teamAnalysis={result.team_analysis} />

              {/* Recommendations — 3-column grid on desktop, 1-col on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {result.recommendations?.map((rec, i) => (
                  <RecommendationCard
                    key={rec.champion}
                    rec={rec}
                    rank={i}
                    isTopPick={i === 0}
                    banMode={banMode}
                  />
                ))}
              </div>

              {/* Avoid + Why Not — 2-column on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AvoidChampionsSection avoidChampions={result.avoid_champions} />
                <WhyNotSection
                  whyNot={result.why_not}
                  teamWinCondition={result.team_win_condition}
                  compositionType={result.composition_type}
                  powerCurve={result.power_curve}
                  keyThreats={result.key_threats}
                  draftGrade={result.draft_grade}
                  draftGradeReason={result.draft_grade_reason}
                />
              </div>
            </div>
          )}

          {/* Empty state — only show when no result and not loading */}
          {!result && !loading && (
            <div className="card rounded-2xl p-8 text-center border-dashed border-navy-700">
              <Brain size={36} className="text-navy-600 mx-auto mb-3" />
              <p className="text-sm text-navy-400 mb-1">
                Add picks to both sides, choose your role, then run the Engine.
              </p>
              <p className="text-xs text-navy-600 font-mono uppercase tracking-wider">
                {"// awaiting input"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
