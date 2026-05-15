import React, { useState, useEffect } from "react";
import { Swords, Shield, Wand2, Crosshair, Users, Brain, RefreshCw, Lock, Ban, ChevronDown, ChevronUp, X, Bookmark } from "lucide-react";
import { toast } from "react-hot-toast";
import ChampionSearch from "./ChampionSearch";
import TeamSlot from "./TeamSlot";
import RecommendationCard, { RecommendationSkeleton, WhyNotSection, TeamAnalysisPanel } from "./RecommendationCard";
import { getSuggestions } from "../api/geminiApi";
import { fetchAllChampions } from "../api/riotApi";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../context/AuthContext";

const ROLES = [
  { id: "Top",     icon: <Swords size={16} />,     label: "Top" },
  { id: "Jungle",  icon: <Shield size={16} />,      label: "Jungle" },
  { id: "Mid",     icon: <Wand2 size={16} />,       label: "Mid" },
  { id: "Bot",     icon: <Crosshair size={16} />,   label: "Bot" },
  { id: "Support", icon: <Users size={16} />,       label: "Support" },
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

export default function DraftBoard() {
  const { isPro, isAdmin, user } = useAuth();
  const [champions, setChampions] = useState([]);
  const [allyPicks, setAllyPicks]   = useState(ROLES.map((r) => ({ champion: null, role: r.id })));
  const [enemyPicks, setEnemyPicks] = useState(ROLES.map((r) => ({ champion: null, role: r.id })));
  const [role, setRole] = useState("Mid");
  const [banMode, setBanMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [champLoading, setChampLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [usage, setUsage] = useState(getDailyUsage());

  // Champion pool state (Pro only)
  const [championPool, setChampionPool] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POOL_KEY) || "[]"); } catch { return []; }
  });
  const [poolOpen, setPoolOpen] = useState(false);

  // drag-and-drop state
  const [dragIndex,      setDragIndex]      = useState(null);
  const [dragOverIndex,  setDragOverIndex]  = useState(null);
  const [eDragIndex,     setEDragIndex]     = useState(null);
  const [eDragOverIndex, setEDragOverIndex] = useState(null);

  // Roles that already have an ally champion — cannot be selected
  const takenAllyRoles = new Set(allyPicks.filter((s) => s.champion).map((s) => s.role));

  // Auto-switch role if current one gets taken
  useEffect(() => {
    if (takenAllyRoles.has(role)) {
      const next = ROLES.find((r) => !takenAllyRoles.has(r.id));
      if (next) setRole(next.id);
    }
  }, [allyPicks]); // eslint-disable-line

  const isLocked = !isPro && !isAdmin && getDailyUsage().count >= FREE_LIMIT;
  const usageLeft = FREE_LIMIT - usage.count;

  useEffect(() => {
    fetchAllChampions()
      .then(setChampions)
      .catch(() => toast.error("Could not load champions."))
      .finally(() => setChampLoading(false));
  }, []);

  // Persist pool to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(POOL_KEY, JSON.stringify(championPool));
  }, [championPool]);

  const excludedIds = [
    ...allyPicks.filter((s) => s.champion).map((s) => s.champion.id),
    ...enemyPicks.filter((s) => s.champion).map((s) => s.champion.id),
  ];
  const poolExcludeIds = championPool.map((c) => c.id);

  const addAlly  = (champ) => {
    const slot = allyPicks.findIndex((s) => !s.champion);
    if (slot === -1) return toast.error("Ally team is full!");
    setAllyPicks((prev) => { const n = [...prev]; n[slot] = { ...n[slot], champion: champ }; return n; });
  };
  const addEnemy = (champ) => {
    const slot = enemyPicks.findIndex((s) => !s.champion);
    if (slot === -1) return toast.error("Enemy team is full!");
    setEnemyPicks((prev) => { const n = [...prev]; n[slot] = { ...n[slot], champion: champ }; return n; });
  };
  const removeAlly  = (i) => setAllyPicks((prev)  => { const n = [...prev]; n[i] = { ...n[i], champion: null }; return n; });
  const removeEnemy = (i) => setEnemyPicks((prev) => { const n = [...prev]; n[i] = { ...n[i], champion: null }; return n; });

  const addToPool = (champ) => {
    if (championPool.find((c) => c.id === champ.id)) return;
    setChampionPool((prev) => [...prev, champ]);
  };
  const removeFromPool = (id) => setChampionPool((prev) => prev.filter((c) => c.id !== id));

  // Drag handlers — ally
  const handleDragStart = (e, i) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver  = (e, i) => { if (i !== dragIndex) setDragOverIndex(i); };
  const handleDrop      = (e, t) => {
    if (dragIndex === null || dragIndex === t) return;
    setAllyPicks((prev) => {
      const n = [...prev];
      const dc = n[dragIndex].champion;
      n[dragIndex]  = { ...n[dragIndex],  champion: n[t].champion };
      n[t]          = { ...n[t],          champion: dc };
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
    setAllyPicks(ROLES.map((r) => ({ champion: null, role: r.id })));
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
    } catch { /* silent fail */ }
  };

  const handleSuggest = async () => {
    if (isLocked) return toast.error("Daily limit reached. Upgrade to Pro for unlimited suggestions!");
    setLoading(true);
    setResult(null);
    try {
      const allyNames  = allyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`);
      const enemyNames = enemyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`);
      const pool       = (isPro || isAdmin) && championPool.length > 0
        ? championPool.map((c) => c.name)
        : null;

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
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI analysis failed. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Brain size={24} className="text-gold" />
            <h1 className="font-display text-3xl font-bold text-white">Draft Board</h1>
          </div>
          <p className="text-navy-400 text-sm">
            Add picks to both sides, select your role, and let DraftSage AI analyze the perfect pick.
          </p>
          {!isPro && !isAdmin && (
            <p className={`mt-2 text-xs font-medium ${usageLeft <= 1 ? "text-red-400" : "text-navy-400"}`}>
              {usageLeft > 0 ? `${usageLeft} free suggestions remaining today` : "Daily limit reached — upgrade to Pro"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* === ALLY TEAM === */}
          <div className="card-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <h2 className="font-semibold text-white">Ally Team</h2>
              {!champLoading && champions.length > 0 && (
                <span className="ml-auto text-xs text-navy-500">{champions.length} champs</span>
              )}
              {champLoading && <span className="ml-auto text-xs text-navy-600 animate-pulse">Loading...</span>}
            </div>

            <div className="mb-4">
              {champLoading ? (
                <div className="skeleton h-10 w-full rounded-lg" />
              ) : (
                <ChampionSearch
                  champions={champions}
                  onSelect={addAlly}
                  excludeIds={excludedIds}
                  placeholder="Add ally champion..."
                />
              )}
            </div>

            <div className="space-y-2">
              {allyPicks.map((slot, i) => (
                <TeamSlot
                  key={i} index={i} champion={slot.champion} side="ally"
                  onRemove={removeAlly} role={slot.role}
                  onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDrop={handleDrop} onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === i && dragIndex !== i}
                />
              ))}
            </div>
          </div>

          {/* === CENTER === */}
          <div className="flex flex-col gap-4">

            {/* Champion Pool (Pro only) */}
            <div className={`card rounded-2xl overflow-hidden transition-all ${!isPro && !isAdmin ? "opacity-60" : ""}`}>
              <button
                onClick={() => (isPro || isAdmin) && setPoolOpen(!poolOpen)}
                className="w-full flex items-center gap-2 p-4 text-sm font-semibold text-white hover:text-gold transition-colors"
              >
                <Bookmark size={15} className="text-gold" />
                My Champion Pool
                {!isPro && !isAdmin && (
                  <span className="ml-auto text-xs text-gold border border-gold/30 px-2 py-0.5 rounded-full">Pro</span>
                )}
                {(isPro || isAdmin) && (
                  <>
                    <span className="ml-auto text-xs text-navy-400">
                      {championPool.length > 0 ? `${championPool.length} champs` : "All champs"}
                    </span>
                    {poolOpen ? <ChevronUp size={14} className="text-navy-400" /> : <ChevronDown size={14} className="text-navy-400" />}
                  </>
                )}
              </button>

              {poolOpen && (isPro || isAdmin) && (
                <div className="px-4 pb-4 space-y-3 border-t border-navy-700 pt-3">
                  <ChampionSearch
                    champions={champions}
                    onSelect={addToPool}
                    excludeIds={poolExcludeIds}
                    placeholder="Add to your pool..."
                  />
                  {championPool.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {championPool.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1.5 bg-navy-800 border border-navy-600 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${c.id}.png`}
                            alt={c.name}
                            className="w-4 h-4 rounded"
                          />
                          {c.name}
                          <button onClick={() => removeFromPool(c.id)} className="text-navy-400 hover:text-red-400 transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-navy-500 text-center py-2">
                      No pool set — AI will suggest any champion
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mode Toggle: Pick / Ban */}
            <div className="card rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBanMode(false)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${!banMode
                      ? "border-gold bg-gold/10 text-gold border shadow-gold"
                      : "border border-navy-600 text-navy-400 hover:border-navy-400 hover:text-white"
                    }`}
                >
                  <Brain size={15} /> Pick Mode
                </button>
                <button
                  onClick={() => (isPro || isAdmin) ? setBanMode(true) : toast.error("Ban recommendations require Pro!")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all relative
                    ${banMode
                      ? "border-red-500 bg-red-500/10 text-red-400 border"
                      : "border border-navy-600 text-navy-400 hover:border-navy-400 hover:text-white"
                    }`}
                >
                  <Ban size={15} /> Ban Mode
                  {!isPro && !isAdmin && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold flex items-center justify-center">
                      <Lock size={8} className="text-navy-900" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Role Selector */}
            <div className="card rounded-2xl p-5">
              <h2 className="font-semibold text-white mb-3 text-center">
                {banMode ? "Focus Role" : "Your Role"}
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {ROLES.map((r) => {
                  const isTaken    = takenAllyRoles.has(r.id);
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => !isTaken && setRole(r.id)}
                      disabled={isTaken}
                      title={isTaken ? `${r.label} is already picked` : r.label}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium relative
                        ${isTaken
                          ? "border-navy-700 bg-navy-800/40 text-navy-600 cursor-not-allowed opacity-50"
                          : isSelected
                          ? "border-gold bg-gold/10 text-gold shadow-gold animate-pulse-gold"
                          : "border-navy-600 text-navy-400 hover:border-navy-400 hover:text-white"
                        }`}
                    >
                      {isTaken ? <Lock size={14} /> : r.icon}
                      <span>{r.label}</span>
                      {isTaken && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-navy-700 border border-navy-500 flex items-center justify-center">
                          <Lock size={8} className="text-navy-400" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Get Suggestion Button */}
            <button
              onClick={handleSuggest}
              disabled={loading || isLocked}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3
                ${isLocked
                  ? "bg-navy-700 border border-navy-600 text-navy-500 cursor-not-allowed"
                  : loading
                  ? "bg-navy-700 border border-gold/20 text-gold cursor-wait"
                  : banMode
                  ? "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                  : "btn-gold shadow-gold"
                }`}
            >
              {isLocked ? (
                <><Lock size={20} /> Upgrade to Pro</>
              ) : loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  {banMode ? "Analyzing Bans..." : "Analyzing Draft..."}
                </>
              ) : (
                <>{banMode ? <><Ban size={20} /> Get Ban Recommendations</> : <><Brain size={20} /> Get AI Suggestion</>}</>
              )}
            </button>

            {/* Reset */}
            <button
              onClick={resetDraft}
              className="w-full py-2.5 rounded-xl border border-navy-600 text-navy-400 hover:border-navy-400 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw size={14} /> Reset Draft
            </button>

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-3 mt-2">
                <RecommendationSkeleton />
                <RecommendationSkeleton />
                <RecommendationSkeleton />
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-3 animate-slide-up">
                <div className="flex items-center gap-2 py-2">
                  <div className="divider-gold flex-1" />
                  <span className="text-xs text-gold font-semibold uppercase tracking-widest">
                    {banMode ? "Ban Recommendations" : "AI Recommendations"}
                  </span>
                  <div className="divider-gold flex-1" />
                </div>
                <TeamAnalysisPanel teamAnalysis={result.team_analysis} />
                {result.recommendations?.map((rec, i) => (
                  <RecommendationCard key={rec.champion} rec={rec} rank={i} isTopPick={i === 0} banMode={banMode} />
                ))}
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
            )}
          </div>

          {/* === ENEMY TEAM === */}
          <div className="card-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <h2 className="font-semibold text-white">Enemy Team</h2>
            </div>

            <div className="mb-4">
              {champLoading ? (
                <div className="skeleton h-10 w-full rounded-lg" />
              ) : (
                <ChampionSearch
                  champions={champions}
                  onSelect={addEnemy}
                  excludeIds={excludedIds}
                  placeholder="Add enemy champion..."
                />
              )}
            </div>

            <div className="space-y-2">
              {enemyPicks.map((slot, i) => (
                <TeamSlot
                  key={i} index={i} champion={slot.champion} side="enemy"
                  onRemove={removeEnemy} role={slot.role}
                  onDragStart={handleEDragStart} onDragOver={handleEDragOver}
                  onDrop={handleEDrop} onDragEnd={handleEDragEnd}
                  isDragOver={eDragOverIndex === i && eDragIndex !== i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
