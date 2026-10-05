import React, { useState } from 'react';
import { Season, WeatherType, WorldSettings } from '../types';
import { X, Sliders, Sun, Eye, CloudRain, CloudLightning, Snowflake, Wind, Cloud } from 'lucide-react';
import { MAX_RENDER_DISTANCE } from '../game/config/gameDefaults';
import type { SeasonWeatherSystem } from '../game/environment/SeasonWeatherSystem';

interface SettingsModalProps {
  settings: WorldSettings;
  onUpdateSettings: (newSettings: Partial<WorldSettings>) => void;
  onReseedWorld: () => void;
  onClose: () => void;
  seasonWeatherSystem?: SeasonWeatherSystem;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onReseedWorld,
  onClose,
  seasonWeatherSystem
}) => {
  const [, setRerender] = useState(0);
  const triggerUpdate = () => setRerender((v) => v + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-white/15 bg-zinc-900 shadow-2xl text-white overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">World & Environmental Settings</h2>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Season & Weather System Controls */}
          {seasonWeatherSystem && (
            <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Season & Weather System</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {seasonWeatherSystem.season} · Day {seasonWeatherSystem.dayInSeason}/7
                </div>
              </div>

              {/* Season Progress */}
              <div className="flex items-center justify-between py-2 px-3 bg-zinc-900/60 rounded-lg border border-white/5 text-[11px]">
                <span className="text-zinc-400">Natural Season Cycle (7 in-game days per season)</span>
                <span className="text-emerald-400 font-mono font-medium">{seasonWeatherSystem.season} · Day {seasonWeatherSystem.dayInSeason}/7</span>
              </div>

              {/* Weather Selection */}
              <div>
                <div className="text-[11px] font-medium text-zinc-400 mb-1.5 flex justify-between">
                  <span>Dynamic Weather State</span>
                  <span className="text-cyan-400 font-mono">{seasonWeatherSystem.currentWeather}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    WeatherType.CLOUDY,
                    WeatherType.RAIN,
                    WeatherType.RAINSTORM,
                    WeatherType.THUNDERSTORM,
                    WeatherType.SUNNY,
                    WeatherType.DROUGHT,
                    WeatherType.SNOWY,
                    WeatherType.SNOWSTORM,
                    WeatherType.EVERSNOW
                  ].map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        seasonWeatherSystem.setWeatherImmediate(w);
                        triggerUpdate();
                      }}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold truncate transition cursor-pointer ${
                        seasonWeatherSystem.currentWeather === w
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                      title={w}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advance Day Button */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5">
                <span>Snow accumulation / melting: active in Snowstorm & Eversnow</span>
                <button
                  onClick={() => {
                    seasonWeatherSystem.advanceDay();
                    triggerUpdate();
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold transition cursor-pointer"
                >
                  +1 Day ⏩
                </button>
              </div>
            </div>
          )}

          {/* Render Distance */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
              <span>Chunk Render Distance</span>
              <span className="text-cyan-400 font-mono">{settings.renderDistance} Chunks (~{settings.renderDistance * 16}m)</span>
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
            <p className="text-[11px] text-zinc-500 mt-1">
              Atmospheric fog dynamically blends the horizon. Desktop supports up to {MAX_RENDER_DISTANCE} chunks ({MAX_RENDER_DISTANCE * 16}m). Default: 16 chunks.
            </p>
          </div>

          {/* Time of Day */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-amber-400" /> Time of Day
              </span>
              <span className="text-amber-300 font-mono">
                {settings.timeOfDay < 0.20
                  ? 'Night 🌙'
                  : settings.timeOfDay < 0.28
                  ? 'Dawn / Sunrise 🌅'
                  : settings.timeOfDay < 0.68
                  ? 'Day ☀️'
                  : settings.timeOfDay < 0.78
                  ? 'Golden Hour / Sunset 🌆'
                  : settings.timeOfDay < 0.85
                  ? 'Twilight / Dusk 🌌'
                  : 'Night 🌙'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.timeOfDay}
              onChange={(e) => onUpdateSettings({ timeOfDay: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* FOV */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-indigo-400" /> Field of View (FOV)
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

          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onUpdateSettings({ enableFlight: !settings.enableFlight })}
              className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
                settings.enableFlight
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                  : 'border-white/10 bg-zinc-950/40 text-zinc-400 hover:border-white/20'
              }`}
            >
              <span>Creative Flight</span>
              <span>{settings.enableFlight ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ enableThirdPerson: !settings.enableThirdPerson })}
              className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
                settings.enableThirdPerson
                  ? 'border-indigo-400 bg-indigo-950/40 text-indigo-300'
                  : 'border-white/10 bg-zinc-950/40 text-zinc-400 hover:border-white/20'
              }`}
            >
              <span>3rd Person View</span>
              <span>{settings.enableThirdPerson ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Reseed Generator */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Regenerate Infinite World</div>
              <div className="text-[11px] text-zinc-400">Generate brand new procedural terrain seed (Resets to Day 1 Spring)</div>
            </div>
            <button
              id="btn-reseed-world"
              onClick={onReseedWorld}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
            >
              New Seed 🎲
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
