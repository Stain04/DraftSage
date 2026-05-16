import React from "react";
import { X, Plus } from "lucide-react";
import { getChampionIconUrl } from "../api/riotApi";

/**
 * Vertical champion-select style slot.
 * Used in a horizontal 5-slot row per team (LoL-client draft layout).
 */
export default function TeamSlot({
  index,
  champion,
  side,        // "ally" | "enemy"
  onRemove,
  role,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}) {
  const isAlly  = side === "ally";
  const canDrag = !!champion;

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-200
        ${champion
          ? (isAlly
              ? "border border-blue-500/40 bg-navy-900/80 hover:border-blue-400 hover:shadow-glow-blue"
              : "border border-red-500/40 bg-navy-900/80 hover:border-red-400")
          : "border border-dashed border-navy-700 bg-navy-900/40 hover:border-navy-500"}
        ${isDragOver ? "ring-2 ring-gold scale-[1.04] shadow-gold" : ""}
        ${canDrag    ? "cursor-grab active:cursor-grabbing" : ""}`}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => onDragStart(e, index) : undefined}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, index); }}
      onDrop={(e)     => { e.preventDefault(); onDrop?.(e, index); }}
      onDragEnd={onDragEnd}
    >
      {/* Role label — top bar, NO EMOJI */}
      <div className={`absolute top-0 left-0 right-0 z-10 text-center py-1 px-1
        bg-gradient-to-b from-navy-900/95 via-navy-900/60 to-transparent
        pointer-events-none`}>
        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest font-mono
          ${champion ? (isAlly ? "text-blue-300" : "text-red-300") : "text-navy-500"}`}>
          {role}
        </span>
      </div>

      {/* Champion image area */}
      <div className="aspect-square w-full relative overflow-hidden">
        {champion ? (
          <>
            <img
              src={champion.icon || getChampionIconUrl(champion.name)}
              alt={champion.name}
              className="w-full h-full object-cover pointer-events-none transition-transform group-hover:scale-105"
              onError={(e) => {
                e.target.src = `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${champion.id}.png`;
              }}
            />
            {/* darkening gradient at bottom so name strip reads cleanly */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-900/95 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center
            ${isDragOver ? "bg-gold/5" : "bg-navy-900/30"}`}>
            <Plus
              size={26}
              className={`${isDragOver ? "text-gold/70" : "text-navy-700"} transition-colors`}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      {/* Bottom name strip */}
      <div className={`px-1.5 py-1.5 border-t text-center
        ${champion
          ? (isAlly ? "border-blue-500/20 bg-navy-900/90" : "border-red-500/20 bg-navy-900/90")
          : "border-navy-800 bg-navy-900/40"}`}>
        {champion ? (
          <p className="text-[11px] sm:text-xs font-semibold text-white truncate leading-tight">
            {champion.name}
          </p>
        ) : (
          <p className="text-[10px] text-navy-600 italic">
            {isDragOver ? "Drop" : "Empty"}
          </p>
        )}
      </div>

      {/* Remove button — top right, only on hover when filled */}
      {champion && (
        <button
          onClick={() => onRemove(index)}
          aria-label={`Remove ${champion.name}`}
          className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-navy-900/90 border border-navy-600
            text-navy-300 hover:bg-red-500/30 hover:border-red-400 hover:text-red-300
            opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
