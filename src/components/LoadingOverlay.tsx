import React from 'react';
import { Compass, Sparkles, Mountain } from 'lucide-react';

interface LoadingOverlayProps {
  progress: number;
  stageMessage: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, stageMessage }) => {
  return (
    <div
      id="loading-overlay"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white select-none transition-opacity duration-300"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        {/* Animated Emblem */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 shadow-xl shadow-cyan-500/10">
          <Mountain className="h-10 w-10 text-cyan-400 animate-pulse" />
          <Sparkles className="absolute -top-1.5 -right-1.5 h-5 w-5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black tracking-wider uppercase text-zinc-100 mb-1">
          Voxel Frontiers
        </h1>
        <p className="text-xs text-zinc-400 font-medium tracking-wide mb-6">
          Procedural Infinite Sandbox
        </p>

        {/* Progress Bar Container */}
        <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-full p-1 shadow-inner mb-3">
          <div
            id="loading-progress-bar"
            className="h-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-sm shadow-cyan-500/50 transition-all duration-150 ease-out"
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          />
        </div>

        {/* Dynamic Progress Telemetry */}
        <div className="w-full flex items-center justify-between text-xs font-mono mb-6 px-1">
          <span className="text-zinc-400 flex items-center gap-1.5 truncate">
            <Compass className="h-3.5 w-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="truncate">{stageMessage}</span>
          </span>
          <span className="text-cyan-300 font-bold ml-2 shrink-0">{progress}%</span>
        </div>

        {/* Quick Hint */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 text-[11px] text-zinc-400 text-left w-full flex items-start gap-2">
          <span className="text-cyan-400 text-xs mt-0.5">✦</span>
          <span>Tip: The surrounding world seamlessly streams in the background as you explore.</span>
        </div>
      </div>
    </div>
  );
};
