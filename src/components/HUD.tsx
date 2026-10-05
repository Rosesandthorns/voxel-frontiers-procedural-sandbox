import React from 'react';
import { InventorySlot, Season } from '../types';
import {
  Sparkles,
  Heart,
  Zap,
  Sprout,
  Clock,
  Droplets,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  FastForward,
  Layers,
  Sun,
  CloudRain,
  Snowflake,
  Wind
} from 'lucide-react';
import { ItemIcon } from './ItemIcon';
import { isCropBlock, getCropInfo, CROP_BLOCK_IDS } from '../game/farming/CropBlocks';
import type { VoxelWorld } from '../game/voxel/VoxelWorld';
import type { SeasonWeatherSystem } from '../game/environment/SeasonWeatherSystem';
import { BlockType } from '../types';

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
  world?: VoxelWorld | null;
  seasonWeatherSystem?: SeasonWeatherSystem;
  targetedBlock?: { x: number; y: number; z: number; block: BlockType } | null;
  onAdvanceCropTick?: () => void;
  onOpenInventory?: () => void;
  onOpenBestiary?: () => void;
  onOpenSettings?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  health = 20,
  maxHealth = 20,
  stamina = 100,
  maxStamina = 100,
  biome,
  subBiome,
  coords,
  hotbar,
  selectedHotbarIndex,
  onSelectHotbar,
  discoveryBanner,
  miningProgress = 0,
  world,
  seasonWeatherSystem,
  targetedBlock,
  onAdvanceCropTick
}) => {
  const [tickTime, setTickTime] = React.useState<number>(180);
  const [plantCount, setPlantCount] = React.useState<number>(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (world?.cropGrowthManager) {
        setTickTime(Math.max(0, Math.ceil(world.cropGrowthManager.timeUntilNextTick)));
        setPlantCount(world.cropGrowthManager.getTrackedPlantCount());
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [world]);

  const tickM = Math.floor(tickTime / 60);
  const tickS = tickTime % 60;
  const formattedTickTime = `${tickM}:${tickS < 10 ? '0' : ''}${tickS}`;

  // Evaluate targeted crop
  const isTargetingCrop = targetedBlock ? isCropBlock(targetedBlock.block) : false;
  const cropInfo = targetedBlock ? getCropInfo(targetedBlock.block) : null;
  const isWildSeaCabbage = targetedBlock?.block === CROP_BLOCK_IDS.WILD_SEA_CABBAGE;
  const env = (cropInfo && world && targetedBlock)
    ? world.cropGrowthManager.evaluateEnvironment(targetedBlock.x, targetedBlock.y, targetedBlock.z, cropInfo.crop)
    : null;

  const currentSeason = seasonWeatherSystem?.season ?? Season.SPRING;
  const dayInSeason = seasonWeatherSystem?.dayInSeason ?? 1;

  const getSeasonIcon = () => {
    switch (currentSeason) {
      case Season.SPRING:
        return <Sprout className="w-3.5 h-3.5 text-emerald-400" />;
      case Season.SUMMER:
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case Season.AUTUMN:
        return <Wind className="w-3.5 h-3.5 text-orange-400" />;
      case Season.WINTER:
        return <Snowflake className="w-3.5 h-3.5 text-cyan-300" />;
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans text-white">
      {/* 3. Discovery Celebration Banner */}
      {discoveryBanner && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 absolute top-16 left-1/2 -translate-x-1/2 transform">
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

      {/* 4. Targeted Crop / Wild Plant Status HUD Card (Removed per user request) */}

      {/* 5. Crosshair & Circular Mining Reticle */}
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

      {/* 6. Bottom Center: Player Vitals & Hotbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {/* Vitals Bar (Health & Stamina) */}
        <div className="flex items-center gap-4 border-2 border-stone-800 bg-stone-950/90 px-4 py-1.5 shadow-lg font-mono">
          {/* Health */}
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            <div className="h-2.5 w-24 overflow-hidden border border-stone-800 bg-stone-900">
              <div
                className="h-full bg-rose-600 transition-all duration-300"
                style={{ width: `${(health / maxHealth) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-rose-300">{health}/{maxHealth}</span>
          </div>

          <div className="h-3 w-px bg-stone-700" />

          {/* Stamina */}
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <div className="h-2.5 w-24 overflow-hidden border border-stone-800 bg-stone-900">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(stamina / maxStamina) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-amber-300">{Math.floor(stamina)}%</span>
          </div>
        </div>

        {/* Hotbar Slots - Sharp Voxel Bevels */}
        <div className="pointer-events-auto flex gap-1.5 border-4 border-t-stone-600 border-l-stone-600 border-b-stone-950 border-r-stone-950 bg-stone-950 p-1.5 shadow-2xl">
          {hotbar.map((slot, idx) => {
            const isSelected = idx === selectedHotbarIndex;
            return (
              <button
                id={`hotbar-slot-${idx}`}
                key={idx}
                onClick={() => onSelectHotbar(idx)}
                className={`relative flex h-14 w-14 flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'border-2 border-amber-400 bg-amber-950/80 shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-105 z-10'
                    : 'border-2 border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-400/70'
                }`}
              >
                {/* Slot index number */}
                <span className="absolute top-1 left-1.5 text-[10px] font-mono font-bold text-stone-500">
                  {idx + 1}
                </span>

                {slot.item ? (
                  <>
                    <ItemIcon item={slot.item} className="w-8 h-8" />
                    {slot.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 border border-stone-800 bg-stone-950 px-1 text-[11px] font-mono font-black text-amber-300">
                        {slot.count}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-stone-700 text-xs font-mono">·</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active item label tooltip */}
        {hotbar[selectedHotbarIndex]?.item && (
          <div className="text-xs font-mono font-bold text-amber-300 tracking-wider uppercase bg-stone-950/90 border border-stone-800 px-3 py-0.5">
            {hotbar[selectedHotbarIndex].item!.name}
          </div>
        )}
      </div>
    </div>
  );
};
