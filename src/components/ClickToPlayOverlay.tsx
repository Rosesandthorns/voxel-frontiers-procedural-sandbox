import React from 'react';
import { Season } from '../types';

interface ClickToPlayOverlayProps {
  onEnter: () => void;
  onNewGame?: () => void;
  saveData?: { season?: Season; dayInSeason?: number } | null;
}

export const ClickToPlayOverlay: React.FC<ClickToPlayOverlayProps> = ({
  onEnter,
  onNewGame,
  saveData
}) => {
  return (
    <div
      id="click-to-play-overlay"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md text-white animate-in fade-in duration-300 select-none"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/20 bg-zinc-900/95 p-8 shadow-2xl text-center max-w-md w-full mx-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 text-3xl shadow-lg shadow-cyan-500/30">
          🏔️
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white font-mono uppercase">
            Voxel Frontiers
          </h1>
          <p className="text-xs text-cyan-300 mt-1 font-mono">
            Infinite Procedural Sandbox & Exploration
          </p>
        </div>

        {saveData ? (
          <div className="w-full rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-xs font-mono text-amber-200">
            <span className="font-bold text-amber-400">Saved Game Ready</span>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Day {saveData.dayInSeason || 1} · {saveData.season || 'Spring'}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-300 leading-relaxed">
            Explore 8 unique biomes, discover ruins, and interact with indigenous creatures like the{' '}
            <span className="text-amber-400 font-semibold">Glimmer Fox</span>,{' '}
            <span className="text-cyan-400 font-semibold">Puff Spore</span>, and{' '}
            <span className="text-indigo-400 font-semibold">Sky Ray</span>!
          </p>
        )}

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <button
            onClick={onEnter}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 text-sm font-bold text-zinc-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 active:scale-95 cursor-pointer font-mono uppercase"
          >
            <span>{saveData ? 'Continue World' : 'Enter World'}</span> 🎮
          </button>

          {saveData && onNewGame && (
            <button
              onClick={onNewGame}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-800/80 px-6 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-zinc-700 hover:text-white active:scale-95 cursor-pointer font-mono uppercase"
            >
              <span>Start New World</span> ↺
            </button>
          )}
        </div>

        <span className="text-[11px] text-zinc-500 font-mono mt-1">
          Capture mouse to look around · Esc to pause
        </span>
      </div>
    </div>
  );
};

