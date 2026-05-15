import React from "react";
import { X, Shield, GripVertical } from "lucide-react";
import { getChampionIconUrl } from "../api/riotApi";

const ROLE_ICONS = {
  Top:     "⚔️",
  Jungle:  "🌲",
  Mid:     "🔮",
  Bot:     "🎯",
  Support: "💛",
};

export default function TeamSlot({
  index,
  champion,
  side,
  onRemove,
  role,
  // drag-and-drop
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}) {
  const isAlly = side === "ally";
  const label = role || `Slot ${index + 1}`;
  const canDrag = !!champion;

  return (
    <div
      className={`team-slot ${side} animate-fade-in transition-all duration-150
        ${isDragOver ? "border-gold/70 bg-gold/5 scale-[1.02] shadow-gold" : ""}
        ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}
      `}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => onDragStart(e, index) : undefined}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, index); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(e, index); }}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle indicator */}
      {canDrag && (
        <GripVertical size={14} className="text-navy-600 flex-shrink-0 -ml-1 mr-0.5" />
      )}

      {/* Champion Icon */}
      <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all
        ${champion
          ? (isAlly ? "border-blue-400/60" : "border-red-400/60")
          : isDragOver
            ? "border-gold/50 border-dashed"
            : "border-navy-600 border-dashed"
        }`}
      >
        {champion ? (
          <img
            src={champion.icon || getChampionIconUrl(champion.name)}
            alt={champion.name}
            className="w-full h-full object-cover pointer-events-none"
            onError={(e) => {
              e.target.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${champion.id}.png`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shield size={18} className={isDragOver ? "text-gold/50" : "text-navy-600"} />
          </div>
        )}
      </div>

      {/* Name + Role */}
      <div className="flex-1 min-w-0">
        {champion ? (
          <>
            <p className="text-sm font-semibold text-white truncate">{champion.name}</p>
            <p className="text-xs text-navy-400">
              {ROLE_ICONS[label]} {label}
            </p>
          </>
        ) : (
          <>
            <p className={`text-sm ${isDragOver ? "text-gold/70" : "text-navy-500"}`}>
              {isDragOver ? "Drop here" : "Empty Slot"}
            </p>
            <p className="text-xs text-navy-600">{ROLE_ICONS[label]} {label}</p>
          </>
        )}
      </div>

      {/* Remove */}
      {champion && (
        <button
          onClick={() => onRemove(index)}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-navy-700 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
