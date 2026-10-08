import React from 'react';
import { WorldSettings } from '../types';
import { X, Sliders, Eye, Volume2, Waves, Footprints, Sparkles } from 'lucide-react';
import { MAX_RENDER_DISTANCE } from '../game/config/gameDefaults';
import type { SeasonWeatherSystem } from '../game/environment/SeasonWeatherSystem';

interface SettingsModalProps {
  settings: WorldSettings;
  onUpdateSettings: (newSettings: Partial<WorldSettings>) => void;
  onReseedWorld: () => void;
  onClose: () => void;
  seasonWeatherSystem?: SeasonWeatherSystem;
}

type SliderSetting = {
  key: keyof Pick<WorldSettings, 'soundVolume' | 'ambientVolume' | 'effectsVolume' | 'footstepsVolume'>;
  label: string;
  icon: React.ReactNode;
};

const audioSliders: SliderSetting[] = [
  { key: 'soundVolume', label: 'Master Volume', icon: <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> },
  { key: 'ambientVolume', label: 'Ambient Weather & Water', icon: <Waves className="h-3.5 w-3.5 text-blue-300" /> },
  { key: 'effectsVolume', label: 'UI & Interaction Effects', icon: <Sparkles className="h-3.5 w-3.5 text-amber-300" /> },
  { key: 'footstepsVolume', label: 'Footsteps & Movement', icon: <Footprints className="h-3.5 w-3.5 text-emerald-300" /> }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  seasonWeatherSystem
}) => {
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-white/15 bg-zinc-900 shadow-2xl text-white overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Settings</h2>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Audio</span>
              <span className="text-[11px] font-mono text-zinc-400">Per-channel levels</span>
            </div>

            {audioSliders.map(({ key, label, icon }) => (
              <div key={key}>
                <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {icon}
                    {label}
                  </span>
                  <span className="text-cyan-300 font-mono">{formatPercent(settings[key])}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings[key]}
                  onChange={(e) => onUpdateSettings({ [key]: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                  aria-label={label}
                />
              </div>
            ))}
          </section>

          <section className="space-y-4 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Display & Controls</span>
              {seasonWeatherSystem && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {seasonWeatherSystem.season} · Day {seasonWeatherSystem.dayInSeason}/7
                </span>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                <span>Chunk Render Distance</span>
                <span className="text-cyan-400 font-mono">{settings.renderDistance} Chunks</span>
              </div>
              <input
                type="range"
                min="4"
                max={MAX_RENDER_DISTANCE}
                step="1"
                value={settings.renderDistance}
                onChange={(e) => onUpdateSettings({ renderDistance: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-indigo-400" /> Field of View
                </span>
                <span className="text-indigo-300 font-mono">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min="60"
                max="120"
                step="5"
                value={settings.fov}
                onChange={(e) => onUpdateSettings({ fov: parseInt(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <button
              onClick={() => onUpdateSettings({ enableThirdPerson: !settings.enableThirdPerson })}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
                settings.enableThirdPerson
                  ? 'border-indigo-400 bg-indigo-950/40 text-indigo-300'
                  : 'border-white/10 bg-zinc-950/40 text-zinc-400 hover:border-white/20'
              }`}
            >
              <span>Third Person Camera</span>
              <span>{settings.enableThirdPerson ? 'ON' : 'OFF'}</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
