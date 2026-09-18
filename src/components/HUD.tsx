import React from 'react';
import { InventorySlot } from '../types';
import { Sparkles, Heart, Zap } from 'lucide-react';
import { ItemIcon } from './ItemIcon';

interface HUDProps {
  health?: number;
  maxHealth?: number;
  stamina?: number;
  maxStamina?: number;
  biome?: any;
  subBiome?: any;
  biomeParams?: any;
  coords?: { x: number; y: number; z: number };
  yaw?: number;
  hotbar: InventorySlot[];
  selectedHotbarIndex: number;
  onSelectHotbar: (index: number) => void;
  discoveryBanner?: { title: string; subtitle: string } | null;
  miningProgress?: number;
  isFlying?: boolean;
  isThirdPerson?: boolean;
  onOpenInventory?: () => void;
  onOpenBestiary?: () => void;
  onOpenSettings?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  health = 20,
  maxHealth = 20,
  stamina = 100,
  maxStamina = 100,
  hotbar,
  selectedHotbarIndex,
  onSelectHotbar,
  discoveryBanner,
  miningProgress = 0
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans text-white">
      {/* 1. Discovery Celebration Banner */}
      {discoveryBanner && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 absolute top-6 left-1/2 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-zinc-950/85 px-6 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                {discoveryBanner.title}
              </div>
              <div className="text-base font-bold text-white tracking-wide">
                {discoveryBanner.subtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Crosshair & Circular Mining Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex items-center justify-center">
          <div className="h-4 w-0.5 bg-white/70 shadow-sm" />
          <div className="h-0.5 w-4 absolute bg-white/70 shadow-sm" />
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 absolute opacity-80" />

          {/* Radial Mining Progress Indicator */}
          {miningProgress > 0 && (
            <div className="absolute -inset-4 flex items-center justify-center pointer-events-none">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - miningProgress)}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Center: Player Vitals & Hotbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {/* Vitals Bar (Health & Stamina) */}
        <div className="flex items-center gap-4 rounded-lg bg-zinc-950/75 px-4 py-1.5 backdrop-blur-md border border-white/10 shadow-lg">
          {/* Health */}
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${(health / maxHealth) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-rose-300">{health}/{maxHealth}</span>
          </div>

          <div className="h-3 w-px bg-white/15" />

          {/* Stamina */}
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${(stamina / maxStamina) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-300">{Math.floor(stamina)}%</span>
          </div>
        </div>

        {/* Hotbar Slots */}
        <div className="pointer-events-auto flex gap-1.5 rounded-2xl border border-white/15 bg-zinc-950/85 p-2 shadow-2xl backdrop-blur-lg">
          {hotbar.map((slot, idx) => {
            const isSelected = idx === selectedHotbarIndex;
            return (
              <button
                id={`hotbar-slot-${idx}`}
                key={idx}
                onClick={() => onSelectHotbar(idx)}
                className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-xl border transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/50 shadow-md shadow-cyan-500/20 scale-105'
                    : 'border-white/10 bg-zinc-900/60 hover:border-white/30 hover:bg-zinc-800/60'
                }`}
              >
                {/* Slot index number */}
                <span className="absolute top-1 left-1.5 text-[10px] font-bold text-zinc-500">
                  {idx + 1}
                </span>

                {slot.item ? (
                  <>
                    <ItemIcon item={slot.item} className="w-8 h-8" />
                    {slot.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 rounded-sm bg-black/60 px-1 text-[11px] font-mono font-bold text-white">
                        {slot.count}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-700 text-xs">·</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active item label tooltip */}
        {hotbar[selectedHotbarIndex]?.item && (
          <div className="text-xs font-semibold text-cyan-300 tracking-wide">
            {hotbar[selectedHotbarIndex].item!.name}
          </div>
        )}
      </div>
    </div>
  );
};
