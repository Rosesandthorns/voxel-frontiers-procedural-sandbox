import React from 'react';

interface ClickToPlayOverlayProps {
  onEnter: () => void;
}

export const ClickToPlayOverlay: React.FC<ClickToPlayOverlayProps> = ({ onEnter }) => {
  return (
    <div
      id="click-to-play-overlay"
      onClick={onEnter}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer text-white animate-in fade-in duration-300"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/20 bg-zinc-900/90 p-8 shadow-2xl text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 text-3xl shadow-lg shadow-cyan-500/30">
          🏔️
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Voxel Frontiers
          </h1>
          <p className="text-xs text-cyan-300 mt-0.5">
            Infinite Procedural Sandbox & Exploration
          </p>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Explore 8 unique biomes, discover ruins, and interact with indigenous creatures like the{' '}
          <span className="text-amber-400 font-semibold">Glimmer Fox</span>,{' '}
          <span className="text-cyan-400 font-semibold">Puff Spore</span>, and{' '}
          <span className="text-indigo-400 font-semibold">Sky Ray</span>!
        </p>

        <button className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 active:scale-95">
          <span>Enter World</span> 🎮
        </button>
        <span className="text-[11px] text-zinc-500">
          Click anywhere to capture mouse · Esc to release
        </span>
      </div>
    </div>
  );
};
