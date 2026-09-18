import React, { useState, useMemo, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { BestiaryModal } from './components/BestiaryModal';
import { SettingsModal } from './components/SettingsModal';
import { BiomeType, InventorySlot, WorldSettings } from './types';
import { BiomeParameters, VerdantSubBiomeDef } from './game/voxel/SubBiomeTypes';
import { DEFAULT_HOTBAR, DEFAULT_WORLD_SETTINGS, createDefaultBackpack } from './game/config/gameDefaults';
import { ExplorationSystem } from './game/systems/ExplorationSystem';

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

  // Initial Hotbar with starter exploration tools & items
  const [hotbar, setHotbar] = useState<InventorySlot[]>(DEFAULT_HOTBAR);

  // Initial Backpack Inventory (24 slots)
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
  const [activeStation, setActiveStation] = useState<'inventory' | 'tool_crafter'>('inventory');
  const [miningProgress, setMiningProgress] = useState<number>(0);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [discoveryBanner, setDiscoveryBanner] = useState<{ title: string; subtitle: string } | null>(null);

  // World Settings
  const [settings, setSettings] = useState<WorldSettings>(DEFAULT_WORLD_SETTINGS);

  const [worldKey, setWorldKey] = useState<number>(0);
  const [isWorldReady, setIsWorldReady] = useState<boolean>(false);

  const handleUpdateSettings = (newSettings: Partial<WorldSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleReseedWorld = () => {
    setIsWorldReady(false);
    setWorldKey((k) => k + 1);
    setIsSettingsOpen(false);
  };

  const isModalOpen = isInventoryOpen || isBestiaryOpen || isSettingsOpen;

  useEffect(() => {
    if (isModalOpen && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [isModalOpen]);

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
        onWorldReady={setIsWorldReady}
        onMiningProgress={setMiningProgress}
        onPlayerVitalsUpdate={(hp, st, pos, y, sBiome, bParams) => {
          setHealth(hp);
          setStamina(st);
          setCoords(pos);
          setYaw(y);
          setCurrentBiome(explorationSystem.currentBiome);
          if (sBiome) setCurrentSubBiome(sBiome);
          if (bParams) setBiomeParams(bParams);
        }}
        onDiscoveryBanner={setDiscoveryBanner}
        isPaused={isModalOpen}
        onOpenInventory={() => {
          setActiveStation('inventory');
          setIsInventoryOpen(true);
        }}
        onOpenStation={(st) => {
          setActiveStation(st);
          setIsInventoryOpen(true);
        }}
        onOpenBestiary={() => setIsBestiaryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
          onUpdateSlots={(newHotbar, newInv) => {
            setHotbar(newHotbar);
            setInventory(newInv);
          }}
          onClose={() => setIsInventoryOpen(false)}
        />
      )}

      {/* Interactive Exploration Bestiary Modal */}
      {isBestiaryOpen && (
        <BestiaryModal
          discoveredEntities={explorationSystem.stats.entitiesEncountered}
          onClose={() => setIsBestiaryOpen(false)}
        />
      )}

      {/* Settings & Options Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onReseedWorld={handleReseedWorld}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
