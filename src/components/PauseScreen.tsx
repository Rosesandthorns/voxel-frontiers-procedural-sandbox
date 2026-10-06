import React, { useEffect, useState } from 'react';
import { Play, Sliders, LogOut, CheckCircle2, Pause } from 'lucide-react';
import { soundManager } from '../game/audio/SoundFX';
import { Season } from '../types';

interface PauseScreenProps {
  onResume: () => void;
  onOpenSettings: () => void;
  onSaveAndQuit: () => void;
  biomeName?: string;
  season?: Season;
  dayInSeason?: number;
  coords?: { x: number; y: number; z: number };
}

export const PauseScreen: React.FC<PauseScreenProps> = ({
  onResume,
  onOpenSettings,
  onSaveAndQuit,
  biomeName = 'Wilderness',
  season = Season.SPRING,
  dayInSeason = 1,
  coords = { x: 0, y: 0, z: 0 }
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    soundManager.playChime(420);
  }, []);

  const handleSaveAndQuitClick = () => {
    if (isSaving) return;
    setIsSaving(true);
    soundManager.playChime(520);

    // Provide visual feedback before quitting to menu
    setTimeout(() => {
      setSaveSuccess(true);
      soundManager.playChime(640);
      setTimeout(() => {
        onSaveAndQuit();
      }, 350);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative flex w-full max-w-sm flex-col items-center border-4 border-t-stone-600 border-l-stone-600 border-b-black border-r-black bg-stone-950/95 p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-white">
        {/* Top Decorative Stone Icon */}
        <div className="flex h-13 w-13 items-center justify-center border-2 border-t-stone-500 border-l-stone-500 border-b-black border-r-black bg-stone-900 shadow-inner">
          <Pause className="h-6 w-6 text-amber-400 fill-amber-400/20" />
        </div>

        {/* Title */}
        <h1 className="mt-3 text-2xl font-black font-mono tracking-widest text-stone-100 uppercase drop-shadow">
          Game Paused
        </h1>

        {/* World context info */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs font-mono text-stone-400">
          <span className="text-amber-300 font-bold">{biomeName}</span>
          <span className="text-stone-600">·</span>
          <span>Day {dayInSeason} ({season})</span>
          <span className="text-stone-600">·</span>
          <span className="text-stone-500">X:{Math.floor(coords.x)} Y:{Math.floor(coords.y)} Z:{Math.floor(coords.z)}</span>
        </div>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-stone-700 to-transparent" />

        {/* Action Buttons in exact specified order:
            1. Resume (top)
            2. Settings (above save & quit)
            3. Save and Quit to Menu (at bottom) */}
        <div className="flex w-full flex-col gap-3">
          {/* 1. Resume */}
          <button
            id="btn-pause-resume"
            onClick={() => {
              soundManager.playChime(580);
              onResume();
            }}
            disabled={isSaving}
            className="group relative flex w-full items-center justify-between border-2 border-t-emerald-500 border-l-emerald-500 border-b-emerald-950 border-r-emerald-950 bg-gradient-to-b from-emerald-950/70 to-stone-950 px-5 py-3.5 text-emerald-200 shadow-lg transition-all hover:from-emerald-900/80 hover:to-stone-900 hover:text-white active:translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-emerald-400 fill-emerald-400/40 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold font-mono tracking-wider uppercase">
                Resume
              </span>
            </div>
            <kbd className="border border-emerald-700/60 bg-emerald-950/80 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-300">
              ESC
            </kbd>
          </button>

          {/* 2. Settings (above Save & Quit) */}
          <button
            id="btn-pause-settings"
            onClick={() => {
              soundManager.playChime(500);
              onOpenSettings();
            }}
            disabled={isSaving}
            className="group relative flex w-full items-center justify-between border-2 border-t-stone-600 border-l-stone-600 border-b-black border-r-black bg-stone-900/90 px-5 py-3.5 text-stone-200 shadow-lg transition-all hover:border-amber-400 hover:bg-stone-800/95 hover:text-amber-300 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Sliders className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold font-mono tracking-wider uppercase">
                Settings
              </span>
            </div>
            <kbd className="border border-stone-700 bg-stone-950 px-2 py-0.5 text-[11px] font-mono font-bold text-stone-400">
              O
            </kbd>
          </button>

          {/* 3. Save and Quit to Menu (at bottom) */}
          <button
            id="btn-pause-save-quit"
            onClick={handleSaveAndQuitClick}
            disabled={isSaving}
            className={`group relative flex w-full items-center justify-between border-2 transition-all px-5 py-3.5 shadow-lg active:translate-y-0.5 cursor-pointer ${
              saveSuccess
                ? 'border-emerald-500 bg-emerald-950/90 text-emerald-200'
                : 'border-t-rose-800/80 border-l-rose-800/80 border-b-stone-950 border-r-stone-950 bg-gradient-to-b from-rose-950/40 to-stone-950 hover:from-rose-950/70 hover:to-stone-900 text-rose-200 hover:text-rose-100'
            } disabled:cursor-wait`}
          >
            <div className="flex items-center gap-3">
              {saveSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 animate-bounce" />
              ) : (
                <LogOut className="h-5 w-5 text-rose-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-sm font-bold font-mono tracking-wider uppercase">
                {isSaving
                  ? saveSuccess
                    ? 'Saved! Exiting...'
                    : 'Saving World...'
                  : 'Save and Quit to Menu'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-stone-500">
              {isSaving ? '⏳' : '💾'}
            </span>
          </button>
        </div>

        {/* Subtle footer instruction */}
        <div className="mt-6 text-[11px] font-mono text-stone-500 tracking-wide">
          Press <span className="text-stone-300 font-bold">[Esc]</span> to return to game
        </div>
      </div>
    </div>
  );
};
