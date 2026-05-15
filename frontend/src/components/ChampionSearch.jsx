import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { getChampionIconUrl } from "../api/riotApi";

export default function ChampionSearch({ champions, onSelect, excludeIds = [], placeholder = "Search champion..." }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (query.length < 1) { setFiltered([]); setOpen(false); return; }
    const q = query.toLowerCase();
    const results = champions
      .filter((c) => !excludeIds.includes(c.id))
      .filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 12);
    setFiltered(results);
    setOpen(results.length > 0);
  }, [query, champions, excludeIds]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (champ) => {
    onSelect(champ);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 bg-navy-800 border border-navy-600 rounded-lg text-sm text-white placeholder-navy-400
                     focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 card border-gold/20 rounded-xl overflow-auto max-h-64 z-50 shadow-gold animate-fade-in">
          <div className="grid grid-cols-3 gap-1 p-2">
            {filtered.map((champ) => (
              <button
                key={champ.id}
                onClick={() => handleSelect(champ)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gold/10 transition-colors group"
              >
                <img
                  src={champ.icon || getChampionIconUrl(champ.name)}
                  alt={champ.name}
                  className="w-10 h-10 rounded-lg object-cover border border-navy-600 group-hover:border-gold/60 transition-all"
                  onError={(e) => { e.target.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${champ.id}.png`; }}
                />
                <span className="text-xs text-navy-300 group-hover:text-gold transition-colors text-center leading-tight truncate w-full">
                  {champ.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
