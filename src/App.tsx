import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { BestiaryModal } from './components/BestiaryModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseScreen } from './components/PauseScreen';
import { BiomeType, BlockType, InventorySlot, Season, WorldSettings } from './types';
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
import { saveGame, loadGame, clearSavedGame } from './game/config/saveManager';
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

  // Check if saved state exists from previous session
  const initialSave = useMemo(() => loadGame(), []);

  const [hotbar, setHotbar] = useState<InventorySlot[]>(() =>
    initialSave?.hotbar || Array.from({ length: 9 }, () => ({ item: null, count: 0 }))
  );

  // Initial Backpack Inventory (27 slots)
  const [inventory, setInventory] = useState<InventorySlot[]>(() =>
    initialSave?.inventory || createDefaultBackpack()
  );

  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(() =>
    initialSave?.selectedHotbarIndex ?? 0
  );

  // Vitals & Coordinates
  const [health, setHealth] = useState<number>(() => initialSave?.health ?? 20);
  const [maxHealth] = useState<number>(20);
  const [stamina, setStamina] = useState<number>(() => initialSave?.stamina ?? 100);
  const [maxStamina] = useState<number>(100);
  const [currentBiome, setCurrentBiome] = useState<BiomeType>(BiomeType.VERDANT_PLAINS);
  const [currentSubBiome, setCurrentSubBiome] = useState<VerdantSubBiomeDef | null>(null);
  const [biomeParams, setBiomeParams] = useState<BiomeParameters | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; z: number }>(() =>
    initialSave?.coords && initialSave.coords.y >= 50 ? initialSave.coords : { x: 8.5, y: 0, z: 8.5 }
  );
  const [yaw, setYaw] = useState<number>(() => initialSave?.yaw ?? 0);
  const [targetedBlock, setTargetedBlock] = useState<{ x: number; y: number; z: number; block: BlockType } | null>(null);

  // Modals, Pause & Menu state
  const [hasEnteredWorld, setHasEnteredWorld] = useState<boolean>(false);
  const [isPauseScreenOpen, setIsPauseScreenOpen] = useState<boolean>(false);
  const [openedSettingsFromPause, setOpenedSettingsFromPause] = useState<boolean>(false);
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
  const [settings, setSettings] = useState<WorldSettings>(() =>
    initialSave?.settings || DEFAULT_WORLD_SETTINGS
  );
  const [seasonWeatherSystem] = useState(() => {
    const sys = new SeasonWeatherSystem();
    if (initialSave?.season) {
      sys.setSeasonImmediate(initialSave.season, initialSave.dayInSeason || 1);
    }
    return sys;
  });

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

  const isModalOpen = isInventoryOpen || isBestiaryOpen || isSettingsOpen || isPauseScreenOpen;

  const resumeGameplayPointerLock = useCallback(() => {
    const canvas = (document.getElementById('voxel-canvas') as HTMLCanvasElement | null) || document.querySelector('canvas');
    if (canvas && document.pointerLockElement !== canvas) {
      try {
        canvas.focus();
        const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // Ignore if browser defers pointer lock
      }
    }
  }, []);

  const prevModalOpenRef = useRef<boolean>(isModalOpen);
  useEffect(() => {
    const wasOpen = prevModalOpenRef.current;
    prevModalOpenRef.current = isModalOpen;
    if (!wasOpen && isModalOpen && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [isModalOpen]);

  const handlePlayerVitalsUpdate = useCallback((
    hp: number,
    st: number,
    pos: { x: number; y: number; z: number },
    y: number,
    sBiome?: VerdantSubBiomeDef,
    bParams?: BiomeParameters,
    tBlock?: { x: number; y: number; z: number; block: BlockType } | null
  ) => {
    setHealth(hp);
    setStamina(st);
    setCoords(pos);
    setYaw(y);
    setCurrentBiome(explorationSystem.currentBiome);
    if (sBiome) setCurrentSubBiome(sBiome);
    if (bParams) setBiomeParams(bParams);
    if (tBlock !== undefined) setTargetedBlock(tBlock);
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
  const handleOpenSettings = useCallback(() => {
    setOpenedSettingsFromPause(false);
    setIsSettingsOpen(true);
  }, []);

  const lastPauseToggleRef = useRef<number>(0);

  const handlePause = useCallback(() => {
    const now = performance.now();
    if (now - lastPauseToggleRef.current < 350) return;
    lastPauseToggleRef.current = now;

    if (isInventoryOpen) setIsInventoryOpen(false);
    if (isBestiaryOpen) setIsBestiaryOpen(false);
    if (isSettingsOpen) setIsSettingsOpen(false);
    setIsPauseScreenOpen(true);
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [isInventoryOpen, isBestiaryOpen, isSettingsOpen]);

  const handleResume = useCallback(() => {
    lastPauseToggleRef.current = performance.now();
    setIsPauseScreenOpen(false);

    const canvas = (document.getElementById('voxel-canvas') as HTMLCanvasElement | null) || document.querySelector('canvas');
    if (canvas && document.pointerLockElement !== canvas) {
      try {
        canvas.focus();
        const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // Ignore if browser defers pointer lock
      }
    }
  }, []);

  const handleOpenSettingsFromPause = useCallback(() => {
    setOpenedSettingsFromPause(true);
    setIsPauseScreenOpen(false);
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    if (openedSettingsFromPause) {
      setOpenedSettingsFromPause(false);
      setIsPauseScreenOpen(true);
    } else {
      resumeGameplayPointerLock();
    }
  }, [openedSettingsFromPause, resumeGameplayPointerLock]);

  const handleSaveAndQuit = useCallback(() => {
    saveGame({
      hotbar,
      inventory,
      health,
      stamina,
      coords,
      yaw,
      selectedHotbarIndex,
      settings,
      season: seasonWeatherSystem.season,
      dayInSeason: seasonWeatherSystem.dayInSeason
    });
    setIsPauseScreenOpen(false);
    setHasEnteredWorld(false);
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [hotbar, inventory, health, stamina, coords, yaw, selectedHotbarIndex, settings, seasonWeatherSystem]);

  const handleNewGame = useCallback(() => {
    clearSavedGame();
    setHotbar(Array.from({ length: 9 }, () => ({ item: null, count: 0 })));
    setInventory(createDefaultBackpack());
    setHealth(20);
    setStamina(100);
    setCoords({ x: 8.5, y: 0, z: 8.5 });
    handleReseedWorld();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (isPauseScreenOpen) {
          e.preventDefault();
          handleResume();
        } else if (isSettingsOpen) {
          e.preventDefault();
          handleCloseSettings();
        } else if (isInventoryOpen) {
          e.preventDefault();
          setIsInventoryOpen(false);
          resumeGameplayPointerLock();
        } else if (isBestiaryOpen) {
          e.preventDefault();
          setIsBestiaryOpen(false);
          resumeGameplayPointerLock();
        } else if (hasEnteredWorld) {
          e.preventDefault();
          handlePause();
        }
      } else if (e.code === 'KeyO' && isPauseScreenOpen) {
        e.preventDefault();
        handleOpenSettingsFromPause();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isPauseScreenOpen,
    isSettingsOpen,
    isInventoryOpen,
    isBestiaryOpen,
    hasEnteredWorld,
    handleResume,
    handleCloseSettings,
    resumeGameplayPointerLock,
    handlePause,
    handleOpenSettingsFromPause
  ]);

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
        onPause={handlePause}
        initialPlayerPos={initialSave?.coords && initialSave.coords.y >= 50 ? initialSave.coords : null}
        hasEnteredWorld={hasEnteredWorld}
        onEnteredWorldChange={setHasEnteredWorld}
        saveData={initialSave ? { season: initialSave.season, dayInSeason: initialSave.dayInSeason } : null}
        onNewGame={handleNewGame}
      />

      {/* Modern Sci-Fi / Sandbox HUD */}
      {!isModalOpen && isWorldReady && hasEnteredWorld && (
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
          world={world}
          seasonWeatherSystem={seasonWeatherSystem}
          targetedBlock={targetedBlock}
          onAdvanceCropTick={() => world?.cropGrowthManager.fastForwardTick()}
          onOpenInventory={() => {
            setActiveStation('inventory');
            setActiveStationCoords(null);
            setIsInventoryOpen(true);
          }}
          onOpenBestiary={() => setIsBestiaryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Pause Screen Modal */}
      {isPauseScreenOpen && isWorldReady && (
        <PauseScreen
          onResume={handleResume}
          onOpenSettings={handleOpenSettingsFromPause}
          onSaveAndQuit={handleSaveAndQuit}
          biomeName={currentSubBiome?.name || 'Wilderness'}
          season={seasonWeatherSystem.season}
          dayInSeason={seasonWeatherSystem.dayInSeason}
          coords={coords}
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
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
}
