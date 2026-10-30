import {ChestPanel,type ChestSession} from './components/ChestPanel';
import {ageFood,ageFoodSlots} from './game/systems/FoodFreshness';
import {saveErrorMessage} from './game/config/saveErrors';

import {getLastSaveError} from './game/config/saveManager';

import { WorldMenu } from './components/WorldMenu';

import { setActiveWorld } from './game/config/saveManager';

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

import { saveGame, loadGame } from './game/config/saveManager';

import type { VoxelWorld } from './game/voxel/VoxelWorld';



export function GameSession({ onExit }: { onExit: () => void }) {

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

  const [workshopNotice,setWorkshopNotice]=useState('');
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const note=(e:Event)=>{setWorkshopNotice(String((e as CustomEvent).detail));clearTimeout(timer);timer=setTimeout(()=>setWorkshopNotice(''),5000);};window.addEventListener('biome-workshop-notice',note);return()=>{clearTimeout(timer);window.removeEventListener('biome-workshop-notice',note);};},[]);
  const [survival,setSurvival]=useState(()=>({hunger:initialSave?.survival?.hunger??100,oxygen:initialSave?.survival?.oxygen??20}));
  useEffect(()=>{const listener=(e:Event)=>setSurvival((e as CustomEvent).detail);window.addEventListener('biome-survival',listener);return()=>window.removeEventListener('biome-survival',listener);},[]);
  useEffect(()=>{const done=()=>{setHealth(20);setSurvival({hunger:100,oxygen:20});};window.addEventListener('biome-respawn-complete',done);return()=>window.removeEventListener('biome-respawn-complete',done);},[]);
  const [health, setHealth] = useState<number>(() => initialSave?.health ?? 20);

  const [maxHealth] = useState<number>(20);

  const [stamina, setStamina] = useState<number>(() => initialSave?.stamina ?? 100);

  const [maxStamina] = useState<number>(100);

  const [currentBiome, setCurrentBiome] = useState<BiomeType>(BiomeType.VERDANT_PLAINS);

  const [currentSubBiome, setCurrentSubBiome] = useState<VerdantSubBiomeDef | null>(null);

  const [biomeParams, setBiomeParams] = useState<BiomeParameters | null>(null);

  const [coords, setCoords] = useState<{ x: number; y: number; z: number }>(() =>

    initialSave?.coords && initialSave.coords.y >= 0 ? initialSave.coords : { x: 8.5, y: 0, z: 8.5 }

  );

  const [yaw, setYaw] = useState<number>(() => initialSave?.yaw ?? 0);

  const [targetedBlock, setTargetedBlock] = useState<{ x: number; y: number; z: number; block: BlockType } | null>(null);



  // Modals, Pause & Menu state

  const [chestSession,setChestSession]=useState<ChestSession|null>(null);
  useEffect(()=>{const open=(event:Event)=>{setChestSession((event as CustomEvent).detail);setIsPauseScreenOpen(false);};window.addEventListener('biome-chest-open',open);return()=>window.removeEventListener('biome-chest-open',open);},[]);
  const [disconnect,setDisconnect]=useState('');

  useEffect(()=>{const listener=(e:Event)=>{setDisconnect((e as CustomEvent).detail);document.exitPointerLock?.();soundManager.stopWorldAudio();};window.addEventListener('biome-disconnected',listener);return()=>window.removeEventListener('biome-disconnected',listener);},[]);

  const [hasEnteredWorld, setHasEnteredWorld] = useState<boolean>(false);

  const [isPauseScreenOpen, setIsPauseScreenOpen] = useState<boolean>(false);

  const [openedSettingsFromPause, setOpenedSettingsFromPause] = useState<boolean>(false);

  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);

  const [activeStation, setActiveStation] = useState<

    'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge' | 'heater' | 'cooler'

  >('inventory');

  const [activeStationCoords, setActiveStationCoords] = useState<{ x: number; y: number; z: number } | null>(null);

  const [world, setWorld] = useState<VoxelWorld | null>(null);
  useEffect(()=>{if(!world)return;const tick=()=>{const runtime=world.captureRuntime?.();if(!runtime)return;const age=(runtime.environment?.totalDays??1)-1+(runtime.timeOfDay??.25);setHotbar(items=>ageFoodSlots(items,age));setInventory(items=>ageFoodSlots(items,age));setFurnaceState(state=>{const input=state.inputSlot.item?ageFood(state.inputSlot.item,age):null,output=state.outputSlot.item?ageFood(state.outputSlot.item,age):null;return input===state.inputSlot.item&&output===state.outputSlot.item?state:{...state,inputSlot:{...state.inputSlot,item:input},outputSlot:{...state.outputSlot,item:output}};});};const timer=setInterval(tick,500);return()=>clearInterval(timer);},[world]);

  const [furnaceState, setFurnaceState] = useState<FurnaceState>(() => initialSave?.furnaceState ?? createDefaultFurnaceState());



  const gameRunningRef = useRef(false);



  // Background & live furnace tick (runs whether modal is open or closed, zero re-render when idle)

  useEffect(() => {

    let lastTime = performance.now();

    const timer = window.setInterval(() => {

      const now = performance.now();

      const dt = Math.min(0.5, (now - lastTime) / 1000);

      lastTime = now;



      if (!gameRunningRef.current && !world?.onlineActive) return;

      setFurnaceState((prev) => {

        const runtime=world?.captureRuntime?.();const age=runtime?(runtime.environment?.totalDays??1)-1+(runtime.timeOfDay??0):undefined;const res = tickFurnaceState(prev, dt,age);

        if (!res.changed) return prev;

        if (res.smeltedItem) {

          soundManager.playChime(580);

        }

        return res.next;

      });

    }, 100);

    return () => window.clearInterval(timer);

  }, [world]);



  const [miningProgress, setMiningProgress] = useState<number>(0);

  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [discoveryBanner, setDiscoveryBanner] = useState<{ title: string; subtitle: string } | null>(null);



  // World Settings & Season System

  const [settings, setSettings] = useState<WorldSettings>(() =>

    ({ ...DEFAULT_WORLD_SETTINGS, ...(initialSave?.settings || {}) })

  );

  const [seasonWeatherSystem] = useState(() => {

    const sys = new SeasonWeatherSystem();

    if (initialSave?.season) {

      sys.setSeasonImmediate(initialSave.season, initialSave.dayInSeason || 1);

    }

    if(initialSave?.environment)sys.restore(initialSave.environment);

    return sys;

  });



  const [worldKey, setWorldKey] = useState<number>(0);

  const [isWorldReady, setIsWorldReady] = useState<boolean>(false);



  const handleUpdateSettings = (newSettings: Partial<WorldSettings>) => {

    setSettings((prev) => ({ ...prev, ...newSettings }));

  };



  useEffect(() => {

    soundManager.applySettings(settings);

  }, [settings]);



  const handleReseedWorld = () => {

    setIsWorldReady(false);

    seasonWeatherSystem.setSeasonImmediate(Season.SPRING, 1);

    setWorldKey((k) => k + 1);

    setIsSettingsOpen(false);

  };



  const isModalOpen = !!chestSession || health<=0 || !!disconnect || isInventoryOpen || isBestiaryOpen || isSettingsOpen || isPauseScreenOpen;

  gameRunningRef.current = hasEnteredWorld && !isPauseScreenOpen && !isSettingsOpen;



  const relockTimer = useRef<number | undefined>(undefined);

  const wantsPointerLock = useRef(false);

  const resumeGameplayPointerLock = useCallback(() => {

    wantsPointerLock.current = true;

    window.clearTimeout(relockTimer.current);

    let attempts = 0;

    const request = () => {

      const canvas = document.getElementById('voxel-canvas') as HTMLCanvasElement | null;

      if (!canvas || !wantsPointerLock.current || document.pointerLockElement === canvas) return;

      canvas.focus();

      try { Promise.resolve(canvas.requestPointerLock()).catch(error => { if(attempts===1) console.warn('Mouse recapture deferred:',error.message); }); } catch { /* retry below */ }

      if (++attempts < 12) relockTimer.current = window.setTimeout(request, 200);

    };

    request();

  }, []);

  const resumeGameplayPointerLockAfterMenuCloses = resumeGameplayPointerLock;

  useEffect(() => () => { wantsPointerLock.current = false; window.clearTimeout(relockTimer.current); }, []);



  const prevModalOpenRef = useRef<boolean>(isModalOpen);

  useEffect(() => {

    const wasOpen = prevModalOpenRef.current;

    prevModalOpenRef.current = isModalOpen;

    if (isModalOpen) { wantsPointerLock.current = false; window.clearTimeout(relockTimer.current); }

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

    resumeGameplayPointerLockAfterMenuCloses();

  }, [resumeGameplayPointerLockAfterMenuCloses]);



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

      if (hasEnteredWorld) resumeGameplayPointerLock();

    }

  }, [hasEnteredWorld, openedSettingsFromPause, resumeGameplayPointerLock]);



  const persistGame = useCallback((background = false) => {

    if (!world) return false;

    const chunksSaved=background ? world.queueExploredChunks() : world.saveExploredChunks();

    void window.desktop?.online('player-save',{hotbar,inventory,health,stamina,coords,yaw,survival:world.captureRuntime?.().survival}).catch(()=>{});

    const saved = saveGame({

      ...world.captureRuntime?.(),

      id: initialSave?.id,

      name: initialSave?.name,

      createdAt: initialSave?.createdAt,

    multiplayer: initialSave?.multiplayer,

      generationVersion: 5,

      chunkVersions: world.chunkVersions,

      furnaceState,

      seed: world?.seed,

      modifiedBlocks: world ? Array.from(world.modifiedBlocks) : [],

      hotbar,

      inventory,

      health,

      stamina,

      coords,

      yaw,

      selectedHotbarIndex,

      settings,

      season: seasonWeatherSystem.season,

      dayInSeason: seasonWeatherSystem.dayInSeason,
      ...world.captureRuntime?.()

    });

    return saved && chunksSaved;

  }, [initialSave, furnaceState, world, hotbar, inventory, health, stamina, coords, yaw, selectedHotbarIndex, settings, seasonWeatherSystem]);



  const handleSaveAndQuit = useCallback(() => {

    if (!persistGame()) return false;

    wantsPointerLock.current = false;

    window.clearTimeout(relockTimer.current);

    soundManager.stopWorldAudio();

    if (document.pointerLockElement) document.exitPointerLock();

    onExit();

    return true;

  }, [persistGame,onExit]);

  const enteredWorldRef=useRef(hasEnteredWorld);

  enteredWorldRef.current=hasEnteredWorld;

  const saveRef=useRef(persistGame);

  saveRef.current=persistGame;

  const currentSaveError=()=>{const error=getLastSaveError() ?? world?.getSaveError();return error ? saveErrorMessage(error) : null;};

  useEffect(() => {

    let timer: number;

    const autosave = () => {

      const saved = !enteredWorldRef.current || saveRef.current(true);

      timer = window.setTimeout(autosave, saved ? 30000 : 5000);

    };

    timer = window.setTimeout(autosave, 30000);

    return () => window.clearTimeout(timer);

  }, []);



  useEffect(() => {

    const onClose = (event: BeforeUnloadEvent) => {

      if (hasEnteredWorld && !persistGame()) {

        event.preventDefault();

        event.returnValue = '';

      }

    };

    window.addEventListener('beforeunload', onClose);

    return () => window.removeEventListener('beforeunload', onClose);

  }, [hasEnteredWorld, persistGame]);



  useEffect(() => {

    const handleGlobalKeyDown = (e: KeyboardEvent) => {

      if (e.code === 'Escape') {
        if(chestSession){e.preventDefault();e.stopImmediatePropagation();setChestSession(null);resumeGameplayPointerLock();return;}

        e.stopImmediatePropagation();

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

    window.addEventListener('keydown', handleGlobalKeyDown, true);

    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);

  }, [

    chestSession,
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

      {workshopNotice&&<p className="workshop-notice" role="status">{workshopNotice}</p>}
      {health<=0&&!disconnect&&<div className="pause-backdrop" style={{zIndex:1000}}><section className="pause-panel"><h1>You died</h1><p>Return to world spawn.</p><button className="primary" onClick={()=>{window.dispatchEvent(new Event('biome-respawn'));if(!world?.isRemote){setHealth(20);setSurvival({hunger:100,oxygen:20});resumeGameplayPointerLockAfterMenuCloses();}}}>Respawn</button></section></div>}
      {disconnect&&<div className="pause-backdrop" style={{zIndex:1000}}><section className="pause-panel"><h1>Disconnected</h1><p>{disconnect}</p><button className="primary" onClick={onExit}>Return to menu</button></section></div>}

      <GameCanvas

        onReturnToMenu={onExit}

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

        initialPlayerPos={initialSave?.coords && initialSave.coords.y >= 0 ? initialSave.coords : null}

        hasEnteredWorld={hasEnteredWorld}

        onEnteredWorldChange={setHasEnteredWorld}

        saveData={initialSave ? { season: initialSave.season, dayInSeason: initialSave.dayInSeason } : null}

      />



      {/* Modern Sci-Fi / Sandbox HUD */}

      {!isModalOpen && isWorldReady && hasEnteredWorld && (

        <HUD

          hunger={survival.hunger} oxygen={survival.oxygen} health={health}

          maxHealth={maxHealth}

          stamina={stamina}

          maxStamina={maxStamina}

          hotbar={hotbar}

          selectedHotbarIndex={selectedHotbarIndex}

          onSelectHotbar={setSelectedHotbarIndex}



          miningProgress={miningProgress}



        />

      )}





      {/* Pause Screen Modal */}

      {isPauseScreenOpen && isWorldReady && (

        <PauseScreen

          onResume={handleResume}

          onOpenSettings={handleOpenSettingsFromPause}

          onSaveAndQuit={handleSaveAndQuit}

          getSaveError={currentSaveError}



        />

      )}



      {chestSession&&hasEnteredWorld&&<ChestPanel session={chestSession} hotbar={hotbar} inventory={inventory} onClose={()=>{setChestSession(null);resumeGameplayPointerLock();}}/>}
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



export default function App() {

  const [worldId, setWorldId] = useState<string | null>(null);

  return worldId ? <GameSession key={worldId} onExit={() => {const previous=worldId;setWorldId(null);void window.desktop?.online('leave').finally(()=>{if(previous?.startsWith('online-'))window.desktop?.store('clear',undefined,previous);}).catch(()=>{});}}/> : <WorldMenu onSelect={id => { setActiveWorld(id); setWorldId(id); }}/>;

}
