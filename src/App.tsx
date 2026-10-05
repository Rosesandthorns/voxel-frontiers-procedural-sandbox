import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { BestiaryModal } from './components/BestiaryModal';
import { SettingsModal } from './components/SettingsModal';
import { BiomeType, InventorySlot, Season, WorldSettings } from './types';
import { BiomeParameters, VerdantSubBiomeDef } from './game/voxel/SubBiomeTypes';
import { DEFAULT_WORLD_SETTINGS, createDefaultBackpack } from './game/config/gameDefaults';
import { ExplorationSystem } from './game/systems/ExplorationSystem';
import { SeasonWeatherSystem } from './game/environment/SeasonWeatherSystem';
import {
  FurnaceState,
  createDefaultFurnaceState,
  tickFurnaceState
} from './game/systems/ItemRegistry';
import { soundManager } from './game/audio/SoundFX';
import type { VoxelWorld } from './game/voxel/VoxelWorld';

export default function App() {
  // Exploration System instance
  const explorationSystem = useMemo(() => {
    const sys = new ExplorationSystem();
    sys.onSubBiomeDiscovered = (name, desc) => {
      setDiscoveryBanner({
        title: 'New Sub-Biome Discovered',
        subtitle: `${name} — ${desc}`
      });
      setTimeout(() => {
        setDiscoveryBanner(null);
      }, 5000);
    };
    return sys;
  }, []);

  const [hotbar, setHotbar] = useState<InventorySlot[]>(() =>
    Array.from({ length: 9 }, () => ({ item: null, count: 0 }))
  );

  // Initial Backpack Inventory (27 slots)
  const [inventory, setInventory] = useState<InventorySlot[]>(createDefaultBackpack);

  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(0);

  // Vitals & Coordinates
  const [health, setHealth] = useState<number>(20);
  const [maxHealth] = useState<number>(20);
  const [stamina, setStamina] = useState<number>(100);
  const [maxStamina] = useState<number>(100);
  const [currentBiome, setCurrentBiome] = useState<BiomeType>(BiomeType.VERDANT_PLAINS);
  const [currentSubBiome, setCurrentSubBiome] = useState<VerdantSubBiomeDef | null>(null);
  const [biomeParams, setBiomeParams] = useState<BiomeParameters | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; z: number }>({ x: 8, y: 22, z: 8 });
  const [yaw, setYaw] = useState<number>(0);

  // Modals & Banners
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [activeStation, setActiveStation] = useState<
    'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge' | 'heater' | 'cooler'
  >('inventory');
  const [activeStationCoords, setActiveStationCoords] = useState<{ x: number; y: number; z: number } | null>(null);
  const [world, setWorld] = useState<VoxelWorld | null>(null);
  const [furnaceState, setFurnaceState] = useState<FurnaceState>(createDefaultFurnaceState);

  // Background & live furnace tick (runs whether modal is open or closed, zero re-render when idle)
  useEffect(() => {
    let lastTime = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, (now - lastTime) / 1000);
      lastTime = now;

      setFurnaceState((prev) => {
        const res = tickFurnaceState(prev, dt);
        if (!res.changed) return prev;
        if (res.smeltedItem) {
          soundManager.playChime(580);
        }
        return res.next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  const [miningProgress, setMiningProgress] = useState<number>(0);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [discoveryBanner, setDiscoveryBanner] = useState<{ title: string; subtitle: string } | null>(null);

  // World Settings & Season System
  const [settings, setSettings] = useState<WorldSettings>(DEFAULT_WORLD_SETTINGS);
  const [seasonWeatherSystem] = useState(() => new SeasonWeatherSystem());

  const [worldKey, setWorldKey] = useState<number>(0);
  const [isWorldReady, setIsWorldReady] = useState<boolean>(false);

  const handleUpdateSettings = (newSettings: Partial<WorldSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleReseedWorld = () => {
    setIsWorldReady(false);
    seasonWeatherSystem.setSeasonImmediate(Season.SPRING, 1);
    setWorldKey((k) => k + 1);
    setIsSettingsOpen(false);
  };

  const isModalOpen = isInventoryOpen || isBestiaryOpen || isSettingsOpen;

  const resumeGameplayPointerLock = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas && document.pointerLockElement !== canvas) {
      try {
        const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // Ignore if browser defers pointer lock
      }
    }
  }, []);

  useEffect(() => {
    if (isModalOpen && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [isModalOpen]);

  const handlePlayerVitalsUpdate = useCallback((
    hp: number,
    st: number,
    pos: { x: number; y: number; z: number },
    y: number,
    sBiome?: VerdantSubBiomeDef,
    bParams?: BiomeParameters
  ) => {
    setHealth(hp);
    setStamina(st);
    setCoords(pos);
    setYaw(y);
    setCurrentBiome(explorationSystem.currentBiome);
    if (sBiome) setCurrentSubBiome(sBiome);
    if (bParams) setBiomeParams(bParams);
  }, [explorationSystem]);

  const handleOpenInventory = useCallback(() => {
    setActiveStation('inventory');
    setActiveStationCoords(null);
    setIsInventoryOpen(true);
  }, []);

  const handleOpenStation = useCallback((
    st: 'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge' | 'heater' | 'cooler',
    coords?: { x: number; y: number; z: number }
  ) => {
    setActiveStation(st);
    setActiveStationCoords(coords || null);
    setIsInventoryOpen(true);
  }, []);

  const handleOpenBestiary = useCallback(() => setIsBestiaryOpen(true), []);
  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans">
      {/* 3D Voxel World Viewport */}
      <GameCanvas
        key={worldKey}
        settings={settings}
        hotbar={hotbar}
        selectedHotbarIndex={selectedHotbarIndex}
        onSelectHotbar={setSelectedHotbarIndex}
        onUpdateHotbar={setHotbar}
        onUpdateInventory={setInventory}
        inventory={inventory}
        explorationSystem={explorationSystem}
        seasonWeatherSystem={seasonWeatherSystem}
        onWorldReady={(ready, w) => {
          setIsWorldReady(ready);
          if (w) setWorld(w);
        }}
        onMiningProgress={setMiningProgress}
        onPlayerVitalsUpdate={handlePlayerVitalsUpdate}
        onDiscoveryBanner={setDiscoveryBanner}
        isPaused={isModalOpen}
        onOpenInventory={handleOpenInventory}
        onOpenStation={handleOpenStation}
        onOpenBestiary={handleOpenBestiary}
        onOpenSettings={handleOpenSettings}
      />

      {/* Modern Sci-Fi / Sandbox HUD */}
      {!isModalOpen && isWorldReady && (
        <HUD
          health={health}
          maxHealth={maxHealth}
          stamina={stamina}
          maxStamina={maxStamina}
          biome={currentBiome}
          subBiome={currentSubBiome}
          biomeParams={biomeParams}
          coords={coords}
          yaw={yaw}
          hotbar={hotbar}
          selectedHotbarIndex={selectedHotbarIndex}
          onSelectHotbar={setSelectedHotbarIndex}
          discoveryBanner={discoveryBanner}
          miningProgress={miningProgress}
          isFlying={settings.enableFlight}
          isThirdPerson={settings.enableThirdPerson}
          onOpenInventory={() => {
            setActiveStation('inventory');
            setActiveStationCoords(null);
            setIsInventoryOpen(true);
          }}
          onOpenBestiary={() => setIsBestiaryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Inventory & Crafting Station Modal */}
      {isInventoryOpen && (
        <InventoryModal
          hotbar={hotbar}
          inventory={inventory}
          initialStation={activeStation}
          stationCoords={activeStationCoords}
          world={world}
          furnaceState={furnaceState}
          onUpdateFurnaceState={setFurnaceState}
          onUpdateSlots={(newHotbar, newInv) => {
            setHotbar(newHotbar);
            setInventory(newInv);
          }}
          onClose={() => {
            setIsInventoryOpen(false);
            resumeGameplayPointerLock();
          }}
        />
      )}

      {/* Interactive Exploration Bestiary Modal */}
      {isBestiaryOpen && (
        <BestiaryModal
          discoveredEntities={explorationSystem.stats.entitiesEncountered}
          onClose={() => {
            setIsBestiaryOpen(false);
            resumeGameplayPointerLock();
          }}
        />
      )}

      {/* Settings & Options Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onReseedWorld={handleReseedWorld}
          seasonWeatherSystem={seasonWeatherSystem}
          onClose={() => {
            setIsSettingsOpen(false);
            resumeGameplayPointerLock();
          }}
        />
      )}
    </div>
  );
}
