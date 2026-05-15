import React, { useState, useEffect } from "react";
import { Swords, Shield, Wand2, Crosshair, Users, Brain, RefreshCw, Lock } from "lucide-react";
import { toast } from "react-hot-toast";
import ChampionSearch from "./ChampionSearch";
import TeamSlot from "./TeamSlot";
import RecommendationCard, { RecommendationSkeleton, WhyNotSection } from "./RecommendationCard";
import { getSuggestions } from "../api/geminiApi";
import { fetchAllChampions } from "../api/riotApi";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { id: "Top",     icon: <Swords size={16} />,     label: "Top" },
  { id: "Jungle",  icon: <Shield size={16} />,      label: "Jungle" },
  { id: "Mid",     icon: <Wand2 size={16} />,       label: "Mid" },
  { id: "Bot",     icon: <Crosshair size={16} />,   label: "Bot" },
  { id: "Support", icon: <Users size={16} />,       label: "Support" },
];

const FREE_LIMIT = 3;
const USAGE_KEY = "draftsage_daily_usage";

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
  const { isPro, isAdmin } = useAuth();
  const [champions, setChampions] = useState([]);
  // Each ally slot: { champion: obj|null, role: string }
  const [allyPicks, setAllyPicks]   = useState(
    ROLES.map((r) => ({ champion: null, role: r.id }))
  );
  const [enemyPicks, setEnemyPicks] = useState(
    ROLES.map((r) => ({ champion: null, role: r.id }))
  );
  const [role, setRole] = useState("Mid");
  const [loading, setLoading] = useState(false);
  const [champLoading, setChampLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [usage, setUsage] = useState(getDailyUsage());
  // drag-and-drop state — separate for each side
  const [dragIndex,      setDragIndex]      = useState(null);
  const [dragOverIndex,  setDragOverIndex]  = useState(null);
  const [eDragIndex,     setEDragIndex]     = useState(null);
  const [eDragOverIndex, setEDragOverIndex] = useState(null);

  // Admin always has unlimited access; Pro users also bypass the limit
  const usageLeft = FREE_LIMIT - usage.count;
  const isLocked = !isPro && !isAdmin && usageLeft <= 0;

  useEffect(() => {
    fetchAllChampions()
      .then((list) => {
        setChampions(list);
      })
      .catch((err) => {
        console.error("Champion load error:", err);
        toast.error("Could not load champions. Check your internet connection.");
      })
      .finally(() => setChampLoading(false));
  }, []);

  const excludedIds = [
    ...allyPicks.filter((s) => s.champion).map((s) => s.champion.id),
    ...enemyPicks.filter((s) => s.champion).map((s) => s.champion.id),
  ];

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


  // Drag handlers
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, index) => {
    if (index !== dragIndex) setDragOverIndex(index);
  };
  const handleDrop = (e, targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setAllyPicks((prev) => {
      const n = [...prev];
      // Swap only the champions, keep roles fixed to their slots
      const dragChamp = n[dragIndex].champion;
      n[dragIndex] = { ...n[dragIndex], champion: n[targetIndex].champion };
      n[targetIndex] = { ...n[targetIndex], champion: dragChamp };
      return n;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Enemy drag handlers
  const handleEDragStart = (e, index) => {
    setEDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleEDragOver = (e, index) => {
    if (index !== eDragIndex) setEDragOverIndex(index);
  };
  const handleEDrop = (e, targetIndex) => {
    if (eDragIndex === null || eDragIndex === targetIndex) return;
    setEnemyPicks((prev) => {
      const n = [...prev];
      const dragChamp = n[eDragIndex].champion;
      n[eDragIndex] = { ...n[eDragIndex], champion: n[targetIndex].champion };
      n[targetIndex] = { ...n[targetIndex], champion: dragChamp };
      return n;
    });
    setEDragIndex(null);
    setEDragOverIndex(null);
  };
  const handleEDragEnd = () => {
    setEDragIndex(null);
    setEDragOverIndex(null);
  };

  const resetDraft = () => {
    setAllyPicks(ROLES.map((r) => ({ champion: null, role: r.id })));
    setEnemyPicks(ROLES.map((r) => ({ champion: null, role: r.id })));
    setResult(null);
  };

  const handleSuggest = async () => {
    if (isLocked) return toast.error("Daily limit reached. Upgrade to Pro for unlimited suggestions!");
    setLoading(true);
    setResult(null);
    try {
      const allyNames  = allyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`);
      const enemyNames = enemyPicks.filter((s) => s.champion).map((s) => `${s.champion.name} (${s.role})`);
      const data = await getSuggestions({ allyPicks: allyNames, enemyPicks: enemyNames, role });
      setResult(data);
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
          {!isPro && (
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
              {champLoading && (
                <span className="ml-auto text-xs text-navy-600 animate-pulse">Loading...</span>
              )}
            </div>

            <div className="mb-4">
              {champLoading ? (
                <div className="skeleton h-10 w-full rounded-lg" />
              ) : (
                <ChampionSearch
                  champions={champions}
                  onSelect={(c) => addAlly(c)}
                  excludeIds={excludedIds}
                  placeholder="Add ally champion..."
                />
              )}
            </div>

            <div className="space-y-2">
              {allyPicks.map((slot, i) => (
                <TeamSlot
                  key={i} index={i} champion={slot.champion} side="ally"
                  onRemove={removeAlly}
                  role={slot.role}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === i && dragIndex !== i}
                />
              ))}
            </div>
          </div>

          {/* === CENTER: Role + Action === */}
          <div className="flex flex-col gap-4">
            {/* Role Selector */}
            <div className="card rounded-2xl p-5">
              <h2 className="font-semibold text-white mb-3 text-center">Your Role</h2>
              <div className="grid grid-cols-5 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium
                      ${role === r.id
                        ? "border-gold bg-gold/10 text-gold shadow-gold animate-pulse-gold"
                        : "border-navy-600 text-navy-400 hover:border-navy-400 hover:text-white"
                      }`}
                  >
                    {r.icon}
                    <span>{r.label}</span>
                  </button>
                ))}
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
                  : "btn-gold shadow-gold"
                }`}
            >
              {isLocked ? (
                <><Lock size={20} /> Upgrade to Pro</>
              ) : loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  Analyzing Draft...
                </>
              ) : (
                <><Brain size={20} /> Get AI Suggestion</>
              )}
            </button>

            {/* Reset */}
            <button
              onClick={resetDraft}
              className="w-full py-2.5 rounded-xl border border-navy-600 text-navy-400 hover:border-navy-400 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw size={14} /> Reset Draft
            </button>

            {/* Loading state skeleton */}
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
                  <span className="text-xs text-gold font-semibold uppercase tracking-widest">AI Recommendations</span>
                  <div className="divider-gold flex-1" />
                </div>
                {result.recommendations?.map((rec, i) => (
                  <RecommendationCard key={rec.champion} rec={rec} rank={i} isTopPick={i === 0} />
                ))}
                <WhyNotSection
                  whyNot={result.why_not}
                  teamWinCondition={result.team_win_condition}
                  compositionType={result.composition_type}
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
                  onSelect={(c) => addEnemy(c)}
                  excludeIds={excludedIds}
                  placeholder="Add enemy champion..."
                />
              )}
            </div>

            <div className="space-y-2">
              {enemyPicks.map((slot, i) => (
                <TeamSlot
                  key={i} index={i} champion={slot.champion} side="enemy"
                  onRemove={removeEnemy}
                  role={slot.role}
                  onDragStart={handleEDragStart}
                  onDragOver={handleEDragOver}
                  onDrop={handleEDrop}
                  onDragEnd={handleEDragEnd}
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
