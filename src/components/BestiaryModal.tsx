import React, { useState } from 'react';
import { BESTIARY_DATA, CreatureEntry } from '../game/systems/ExplorationSystem';
import { EntitySpecies } from '../types';
import { X, Search, Shield, Zap, Sparkles, MapPin, CheckCircle2 } from 'lucide-react';

interface BestiaryModalProps {
  discoveredEntities: Record<string, boolean>;
  onClose: () => void;
}

export const BestiaryModal: React.FC<BestiaryModalProps> = ({ discoveredEntities, onClose }) => {
  const [selectedSpecies, setSelectedSpecies] = useState<EntitySpecies>(EntitySpecies.GLIMMER_FOX);
  const [searchQuery, setSearchQuery] = useState('');

  const creatures = Object.values(BESTIARY_DATA);
  const filteredCreatures = creatures.filter(
    (c) =>
      c.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.habitat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.uniqueMechanic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCreature = BESTIARY_DATA[selectedSpecies];
  const isDiscovered = discoveredEntities[activeCreature.species] ?? true; // show info for exploration delight

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-zinc-900 shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Exploration Bestiary & Creature Codex
              </h2>
              <p className="text-xs text-zinc-400">
                Catalog of indigenous entities with unique environmental & interactive mechanics
              </p>
            </div>
          </div>
          <button
            id="btn-close-bestiary"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Creature List */}
          <div className="flex w-72 flex-col border-r border-white/10 bg-zinc-950/40">
            {/* Search */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search species or biome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredCreatures.map((c) => {
                const isSelected = c.species === selectedSpecies;
                const hasEncountered = discoveredEntities[c.species];

                return (
                  <button
                    key={c.species}
                    onClick={() => setSelectedSpecies(c.species)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                      isSelected
                        ? 'bg-cyan-950/60 border border-cyan-400/40 text-cyan-200'
                        : 'hover:bg-zinc-800/60 border border-transparent text-zinc-300'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-xl border border-white/10">
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="truncate text-xs font-bold text-white">{c.species}</div>
                        {hasEncountered && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="truncate text-[11px] text-zinc-400">{c.habitat.split('&')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Detail Pane */}
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-900/60 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Top Title & Badge */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800/80 border border-white/15 text-4xl shadow-inner">
                    {activeCreature.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-white">{activeCreature.species}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                          activeCreature.rarity === 'Legendary'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : activeCreature.rarity === 'Rare'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        }`}
                      >
                        {activeCreature.rarity}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-cyan-400">{activeCreature.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-400" />
                      <span>{activeCreature.habitat}</span>
                    </div>
                  </div>
                </div>

                {discoveredEntities[activeCreature.species] ? (
                  <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-4 w-4" /> Discovered in World
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400 border border-white/10">
                    <Sparkles className="h-4 w-4 text-amber-400" /> Undiscovered
                  </span>
                )}
              </div>

              {/* Unique Mechanic Spotlight Card */}
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-5 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 mb-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>Unique Entity Mechanic</span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {activeCreature.uniqueMechanic}
                </p>
              </div>

              {/* Traits & Interactions Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Favorite Diet & Taming Item
                  </div>
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span>🍓</span> {activeCreature.tamingFood}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Salvaged Materials & Drops
                  </div>
                  <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <span>💎</span> {activeCreature.drops}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Tip */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 text-xs text-zinc-400 mt-6">
              💡 <span className="text-zinc-200 font-semibold">Survival Tip:</span> Entities roam within their native biomes. Approach them quietly with their favorite food in your hotbar to tame them or harness their unique abilities!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
