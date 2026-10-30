import { loadGame } from '../game/config/saveManager';

import React, { useEffect, useRef, useState } from 'react';

import * as THREE from 'three';

import { ParticleSystem } from '../game/effects/ParticleSystem';

import { EntityManager } from '../game/entities/EntityManager';

import { DroppedItemManager } from '../game/entities/DroppedItemManager';

import { EntityInspector } from '../game/entities/EntityInspector';

import { SkySystem } from '../game/environment/SkySystem';

import { InteractionHandler } from '../game/interaction/InteractionHandler';

import {getActiveWorld} from '../game/config/saveManager';

import {OnlineWorld} from '../game/network/OnlineWorld';

import {PlayerAvatar} from '../game/player/PlayerAvatar';

import {loadSkinTexture,savedSkin} from '../game/player/Skins';

import { PlayerController } from '../game/player/PlayerController';

import { ExplorationSystem } from '../game/systems/ExplorationSystem';

import { frameCounter } from '../game/systems/FrameCounter';

import { VoxelWorld } from '../game/voxel/VoxelWorld';

import { SpawnSystem } from '../game/world/SpawnSystem';

import { isWaterOrWaterlogged } from '../game/voxel/WaterFlora';

import { getItemForBlock } from '../game/systems/ItemRegistry';

import { isMoistureSensitiveBlock, BLOCK_DEFS, isWaterBlock } from '../game/voxel/Blocks';

import { SeasonWeatherSystem } from '../game/environment/SeasonWeatherSystem';

import { WeatherEffects } from '../game/environment/WeatherEffects';

import { soundManager } from '../game/audio/SoundFX';

import { BlockType, InventorySlot, Season, WorldSettings, WeatherType } from '../types';

import { BiomeParameters, VerdantSubBiomeDef } from '../game/voxel/SubBiomeTypes';



import { LoadingOverlay } from './LoadingOverlay';



interface GameCanvasProps {

  onReturnToMenu?: () => void;

  settings: WorldSettings;

  hotbar: InventorySlot[];

  selectedHotbarIndex: number;

  onSelectHotbar: (index: number) => void;

  onUpdateHotbar: (hotbar: InventorySlot[]) => void;

  onUpdateInventory: (inventory: InventorySlot[]) => void;

  inventory: InventorySlot[];

  explorationSystem: ExplorationSystem;

  onPlayerVitalsUpdate: (

    health: number,

    stamina: number,

    coords: { x: number; y: number; z: number },

    yaw: number,

    subBiome?: VerdantSubBiomeDef,

    biomeParams?: BiomeParameters,

    targetedBlock?: { x: number; y: number; z: number; block: BlockType } | null

  ) => void;

  onTargetedEntityUpdate?: (ent: any) => void;

  onDiscoveryBanner: (banner: { title: string; subtitle: string } | null) => void;

  isPaused: boolean;

  onOpenInventory: () => void;

  onOpenStation?: (

    stationId: 'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge' | 'heater' | 'cooler',

    coords?: { x: number; y: number; z: number }

  ) => void;

  onOpenBestiary: () => void;

  onOpenSettings?: () => void;

  onPause?: () => void;

  onWorldReady?: (ready: boolean, world?: VoxelWorld) => void;

  onMiningProgress?: (progress: number) => void;

  seasonWeatherSystem?: SeasonWeatherSystem;

  initialPlayerPos?: { x: number; y: number; z: number } | null;

  hasEnteredWorld?: boolean;

  onEnteredWorldChange?: (entered: boolean) => void;

  saveData?: { season?: Season; dayInSeason?: number } | null;

  onNewGame?: () => void | boolean;

}



const GameCanvasComponent: React.FC<GameCanvasProps> = ({

  onReturnToMenu,

  settings,

  hotbar,

  selectedHotbarIndex,

  onSelectHotbar,

  onUpdateHotbar,

  explorationSystem,

  onPlayerVitalsUpdate,

  onTargetedEntityUpdate,

  onDiscoveryBanner,

  isPaused,

  onOpenInventory,

  onOpenStation,

  onOpenBestiary,

  onOpenSettings,

  onPause,

  onWorldReady,

  inventory,

  seasonWeatherSystem: seasonWeatherSystemProp,

  onUpdateInventory,

  onMiningProgress,

  initialPlayerPos,

  hasEnteredWorld: hasEnteredWorldProp,

  onEnteredWorldChange,

  saveData,

  onNewGame

}) => {

  const containerRef = useRef<HTMLDivElement>(null);

  const [isLocked, setIsLocked] = useState(false);

  const [hasEnteredWorld, setHasEnteredWorld] = useState(hasEnteredWorldProp ?? false);

  const hasEnteredWorldRef = useRef(hasEnteredWorldProp ?? false);

  const wasPausedRef = useRef<boolean>(isPaused);



  useEffect(() => {

    if (hasEnteredWorldProp !== undefined) {

      setHasEnteredWorld(hasEnteredWorldProp);

      hasEnteredWorldRef.current = hasEnteredWorldProp;

    }

  }, [hasEnteredWorldProp]);



  const defaultSeasonWeatherRef = useRef<SeasonWeatherSystem | null>(null);

  if (!defaultSeasonWeatherRef.current) {

    defaultSeasonWeatherRef.current = new SeasonWeatherSystem();

  }

  const seasonWeatherSystem = seasonWeatherSystemProp || defaultSeasonWeatherRef.current;



  const markEnteredWorld = () => {

    if (!hasEnteredWorldRef.current) {

      hasEnteredWorldRef.current = true;

      setHasEnteredWorld(true);

      onEnteredWorldChange?.(true);

    }

  };



  // Smooth, instant asynchronous world loading state & progress bar

  const [loadingError,setLoadingError]=useState<string | null>(null);

  const [loadingProgress, setLoadingProgress] = useState(15);

  const [loadingStage, setLoadingStage] = useState('Sculpting voxel frontiers...');

  const [isWorldReady, setIsWorldReady] = useState(false);

  const isWorldReadyRef = useRef(false);



  // References for three.js objects and game systems

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const playerRef = useRef<PlayerController | null>(null);

  const worldRef = useRef<VoxelWorld | null>(null);

  const entityManagerRef = useRef<EntityManager | null>(null);

  const droppedItemManagerRef = useRef<DroppedItemManager | null>(null);



  // Mutable refs for up-to-date state in animation loop and event listeners

  const timeOfDayRef = useRef<number>(settings.timeOfDay);

  const settingsRef = useRef<WorldSettings>(settings);

  const hotbarRef = useRef<InventorySlot[]>(hotbar);

  const selectedIndexRef = useRef<number>(selectedHotbarIndex);

  const inventoryRef = useRef<InventorySlot[]>(inventory || []);

  const isPausedRef = useRef<boolean>(isPaused);



  useEffect(() => {

    const wasPaused = wasPausedRef.current;

    wasPausedRef.current = isPaused;

    isPausedRef.current = isPaused;

    if (playerRef.current) {

      playerRef.current.isPaused = isPaused;

      if (isPaused) {

        playerRef.current.resetKeys();

      }

    }

    if (isPaused) {

      soundManager.stopWorldAudio();

      if (document.pointerLockElement) {

        document.exitPointerLock();

      }

    }

  }, [isPaused]);



  useEffect(() => {

    timeOfDayRef.current = settings.timeOfDay;

  }, [settings.timeOfDay]);



  useEffect(() => {

    settingsRef.current = settings;

  }, [settings]);



  useEffect(() => {

    hotbarRef.current = hotbar;

  }, [hotbar]);



  useEffect(() => {

    selectedIndexRef.current = selectedHotbarIndex;

  }, [selectedHotbarIndex]);



  useEffect(() => {

    if (inventory) inventoryRef.current = inventory;

  }, [inventory]);



  useEffect(() => {

    if (!containerRef.current) return;



    // 1. Scene & Renderer Setup

    const scene = new THREE.Scene();

    const initialWidth = Math.max(100, containerRef.current.clientWidth || window.innerWidth);

    const initialHeight = Math.max(100, containerRef.current.clientHeight || window.innerHeight);



    const initialRenderDist = settings.renderDistance || 9;

    const initialFogFar = Math.max(48, (initialRenderDist - 0.75) * 16);

    const camera = new THREE.PerspectiveCamera(settings.fov, initialWidth / initialHeight, 0.1, Math.max(300, initialFogFar + 50));



    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });

    renderer.setSize(initialWidth, initialHeight, false);

    // Keep pixel ratio at native 1:1 — voxel games with millions of triangles

    // cannot afford supersampling on the main thread.

    renderer.setPixelRatio(1.0);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.15;

    // No shadow maps — every shadow-casting voxel mesh would need a shadow pass

    // which would more than halve the frame rate.

    renderer.shadowMap.enabled = false;

    renderer.domElement.id = 'voxel-canvas';

    renderer.domElement.tabIndex = 0;

    renderer.domElement.style.outline = 'none';

    renderer.domElement.style.display = 'block';

    renderer.domElement.style.position = 'absolute';

    renderer.domElement.style.top = '0';

    renderer.domElement.style.left = '0';

    renderer.domElement.style.width = '100%';

    renderer.domElement.style.height = '100%';

    containerRef.current.appendChild(renderer.domElement);

    rendererRef.current = renderer;



    // 2. Subsystems Initialization

    const skySystem = new SkySystem(scene, initialRenderDist);

    const particleSystem = new ParticleSystem(scene, 300);

    const weatherEffects = new WeatherEffects(scene);

    const saved = loadGame();

    if(Number.isFinite(saved?.timeOfDay))timeOfDayRef.current=saved!.timeOfDay!;

    if(saved?.environment)seasonWeatherSystem.restore(saved.environment);

    const chunkVersions={...(saved?.chunkVersions ?? {})};

    if(saved && !saved.chunkVersions && (saved.generationVersion ?? 1)<2) {

      const center=saved.coords ?? {x:8.5,z:8.5};

      const radius=Math.min(16,Math.max(3,(saved.settings?.renderDistance ?? 9)+2));

      for(let dx=-radius;dx<=radius;dx++) for(let dz=-radius;dz<=radius;dz++) chunkVersions[`${Math.floor(center.x/16)+dx},${Math.floor(center.z/16)+dz}`]=1;

      for(const [key] of saved.modifiedBlocks ?? []) {const [x,,z]=key.split(',').map(Number);chunkVersions[`${Math.floor(x/16)},${Math.floor(z/16)}`]=1;}

    }

    const world = new VoxelWorld(scene, saved?.seed ?? Math.floor(Math.random() * 999999), 6, chunkVersions);
    world.workshops=saved?.workshops??{};

    for (const [key, block] of saved?.modifiedBlocks ?? []) world.modifiedBlocks.set(key, block);

    world.isRemote=getActiveWorld().startsWith('online-');

    world.seasonWeatherSystem = seasonWeatherSystem;

    worldRef.current = world;



    seasonWeatherSystem.onLightningStrike = (strikePos) => {

      weatherEffects.triggerLightningStrike(strikePos);

    };



    // Connect fluid washing drops callback (String 3 simulation)

    world.worldUpdateManager.onPlantWashedAway = (px, py, pz, plantBlock) => {

      const item = getItemForBlock(plantBlock);

      if (item && droppedItemManagerRef.current) {

        droppedItemManagerRef.current.spawnItem(item, px + 0.5, py + 0.2, pz + 0.5);

      }

    };



    // 3. Safe Spawn Resolution & Player Placement (immediate in <1ms)

    let spawnPoint: { x: number; y: number; z: number };



    if (saved?.coords && saved.coords.y > 0) {

      // If a saved position is passed, ensure its chunk exists and verify player isn't inside solid rock

      const cx = Math.floor(saved!.coords.x / 16);

      const cz = Math.floor(saved!.coords.z / 16);

      world.generateChunkSync(cx, cz);



      const feet = world.getBlock(Math.floor(saved!.coords.x), Math.floor(saved!.coords.y), Math.floor(saved!.coords.z));

      const head = world.getBlock(Math.floor(saved!.coords.x), Math.floor(saved!.coords.y + 1), Math.floor(saved!.coords.z));

      const feetDef = BLOCK_DEFS[feet];

      const headDef = BLOCK_DEFS[head];



      if ((!feetDef || !feetDef.solid) && (!headDef || !headDef.solid) && !isWaterBlock(feet) && !isWaterBlock(head)) {

        spawnPoint = saved!.coords;

      } else {

        spawnPoint = SpawnSystem.findSafeSpawn(world, saved.coords.x, saved.coords.z);

      }

    } else {

      spawnPoint = SpawnSystem.findSafeSpawn(world);

    }



    const worldSpawn=saved?.spawn??(world.isRemote?spawnPoint:SpawnSystem.findSafeSpawn(world));

    void window.desktop?.online('world-spawn',worldSpawn).catch(()=>{});

    const player = new PlayerController(camera, world);

    player.health = saved?.health ?? 20;
    player.survival.restore(saved?.survival);

    if(!saved?.survival)player.stamina = saved?.stamina ?? 100;

    player.yaw = saved?.yaw ?? 0;

    player.pos.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);

    player.updateCamera();

    playerRef.current = player;
    const respawnListener=(e:Event)=>{const detail=(e as CustomEvent).detail;if(world.isRemote&&!detail?.confirmed){void window.desktop?.online('respawn');return;}const target=detail?.coords??worldSpawn;player.pos.set(target.x,target.y,target.z);player.vel.set(0,0,0);player.health=20;player.stamina=100;player.survival.reset();player.updateCamera();window.dispatchEvent(new Event('biome-respawn-complete'));};window.addEventListener('biome-respawn',respawnListener);

    const onlineWorld=window.desktop?new OnlineWorld(world,scene,player):null;

    let remoteTimeRate=saved?.timeRate??.002;
    const clockListener=(e:Event)=>{if(!world.isRemote)return;const data=(e as CustomEvent).detail;timeOfDayRef.current=data.time;if(Number.isFinite(data.speed))remoteTimeRate=Math.max(0,Math.min(1,data.speed));const w=data.weather;if(w)seasonWeatherSystem.restore(w);};window.addEventListener('biome-clock',clockListener);

    let clockBroadcast=0;

    let avatar:PlayerAvatar|null=null;

    savedSkin().then(loadSkinTexture).catch(()=>loadSkinTexture()).then(texture=>{

      if(isCancelled){texture.dispose();return;}

      avatar=new PlayerAvatar(texture);avatar.root.visible=false;scene.add(avatar.root);

    }).catch(()=>{});



    // 3b. Asynchronously generate & mesh initial spawn chunks frame-by-frame with progress updates

    let isCancelled = false;

    world

      .loadInitialChunksAsync(spawnPoint.x, spawnPoint.z, 1, (pct, stage) => {

        if (isCancelled) return;

        setLoadingProgress(pct);

        setLoadingStage(stage);

      })

      .then(() => {

        if (isCancelled) return;

        isWorldReadyRef.current = true;

        setIsWorldReady(true);

        if (onWorldReady) onWorldReady(true, world);



        // Seamlessly stream surrounding chunks in the background without frame drops

        world.updateChunksAround(

          spawnPoint.x,

          spawnPoint.z,

          settingsRef.current.renderDistance || 9,

          false

        );

      }).catch(error => { if(!isCancelled) setLoadingError(error.message || 'Could not load this world.'); });



    const entityManager = new EntityManager(scene, world);
    entityManager.localYaw=()=>player.yaw;
    entityManager.onDamage=(id,amount)=>{if(id)void window.desktop?.online('player-damage',{peer:id,amount});else player.damage(amount);};

    if(onlineWorld)onlineWorld.entities=entityManager;

    entityManagerRef.current = entityManager;

    if(saved?.mobs&&!world.isRemote)entityManager.restoreState(saved.mobs);

    world.captureRuntime=()=>({workshops:world.workshops,health:player.health,survival:player.survival.snapshot(),spawn:worldSpawn,timeOfDay:timeOfDayRef.current,environment:seasonWeatherSystem.snapshot(),mobs:entityManager.saveState()});



    const droppedItemManager = new DroppedItemManager(scene, world, world.atlas);

    droppedItemManagerRef.current = droppedItemManager;
    world.onWorkshopDrop=(item,count=1)=>droppedItemManager.spawnItem(item,player.pos.x,player.pos.y+.5,player.pos.z,count);



    entityManager.onEntityTamed = (species) => {

      explorationSystem.recordEntityTamed(species as any);

    };



    // 4. Discovery Banner Hooks

    explorationSystem.onBiomeDiscovered = () => {

      // Region/Biome popups removed

    };



    explorationSystem.onSubBiomeDiscovered = () => {

      // Region/Biome popups removed

    };



    explorationSystem.onEntityScanned = () => {

      // Species cataloged / found banner removed per user request

    };



    // 5. User Interaction Handler

    const interactionHandler = new InteractionHandler(renderer.domElement, {

      getHotbar: () => hotbarRef.current,

      getSelectedHotbarIndex: () => selectedIndexRef.current,

      getInventory: () => inventoryRef.current,

      onSelectHotbar,

      onUpdateHotbar: (newHotbar) => {

        hotbarRef.current = newHotbar;

        onUpdateHotbar(newHotbar);

      },

      onUpdateInventory: (newInventory) => {

        inventoryRef.current = newInventory;

        onUpdateInventory(newInventory);

      },

      onOpenInventory: () => {

        markEnteredWorld();

        onOpenInventory();

      },

      onOpenStation: (st, coords) => {

        markEnteredWorld();

        if (onOpenStation) {

          onOpenStation(st, coords);

        } else {

          onOpenInventory();

        }

      },

      onOpenBestiary: () => {

        markEnteredWorld();

        onOpenBestiary();

      },

      onOpenSettings: () => {

        markEnteredWorld();

        onOpenSettings?.();

      },

      onPause: () => {

        onPause?.();

      },

      onDiscoveryBanner,

      onPointerLockChange: (locked) => {

        if (locked) {

          markEnteredWorld();

        }

        setIsLocked(locked);

      },

      onMiningProgress,

      getPlayer: () => playerRef.current,

      getWorld: () => worldRef.current,

      getEntityManager: () => entityManagerRef.current,

      getDroppedItemManager: () => droppedItemManagerRef.current,

      getExplorationSystem: () => explorationSystem,

      isPaused: () => isPausedRef.current || !hasEnteredWorldRef.current

    });



    // 6. Chunk processing is now fully isolated in web workers

    // No main-thread scheduling needed - workers handle generation and meshing independently



    // 7. Animation Loop with 60 FPS cap

    let lastTime = performance.now();

    let animId: number;

    let frameCount = 0;

    let cachedSubBiome: VerdantSubBiomeDef | null = null;

    let cachedBiomeParams: BiomeParameters | null = null;

    let lastTargetId: string | null = null;

    let appliedThirdPersonSetting:boolean|undefined;

    const animate = (time: number) => {

      animId = requestAnimationFrame(animate);



      if (lastTime === 0) {

        lastTime = time;

      }

      const elapsed = time - lastTime;

      lastTime = time;



      // Clamp delta to prevent spiral of death on tab unfocus or major stalls

      const delta = Math.min(0.05, Math.max(0.001, elapsed / 1000));



      const currentSettings = settingsRef.current;

      const curDist = currentSettings.renderDistance || 9;



      // Update animated textures (such as 5-frame water caustics)

      if (world) {

        world.update(delta, !onlineWorld?.active && (isPausedRef.current || !hasEnteredWorldRef.current));

      }



      if ((onlineWorld?.active || (!isPausedRef.current && hasEnteredWorldRef.current)) && isWorldReadyRef.current && player && world && entityManager) {

        frameCount++;



        // Sync settings & held items

        if(appliedThirdPersonSetting!==currentSettings.enableThirdPerson){

          player.isThirdPerson=currentSettings.enableThirdPerson;

          appliedThirdPersonSetting=currentSettings.enableThirdPerson;

        }

        if (currentSettings.enableFlight !== player.isFlying) {

          player.isFlying = currentSettings.enableFlight;

        }

        const activeItem = hotbarRef.current[selectedIndexRef.current]?.item;

        if(player.boatId&&!entityManager.entities.has(player.boatId))player.boatId=null;
        player.isHoldingLiquidContainer = activeItem?.id === 'empty_bucket' || activeItem?.id === 'wooden_boat';



        // Update player controller & physics

        player.update(delta);

        if(!isPausedRef.current&&hasEnteredWorldRef.current)interactionHandler.update(delta);



        // Day-Night progression

        if (world.isRemote?remoteTimeRate>0:currentSettings.dayNightSpeed > 0) {

          timeOfDayRef.current = (timeOfDayRef.current + delta * (world.isRemote?remoteTimeRate:0.002 * currentSettings.dayNightSpeed)) % 1.0;

        }



        // Check if camera is submerged underwater

        const camX = Math.floor(camera.position.x);

        const camZ = Math.floor(camera.position.z);

        const camY = Math.floor(camera.position.y);

        const camBlock = world.getBlock(camX, camY, camZ);

        const camBlockSub = world.getBlock(camX, Math.floor(camera.position.y - 0.1), camZ);

        const isUnderwater =

          isWaterOrWaterlogged(camBlock, camY) ||

          isWaterOrWaterlogged(camBlockSub, Math.floor(camera.position.y - 0.1));



        // Biome & Sub-Biome exploration tracking (throttled to preserve 60FPS)

        if (frameCount % 15 === 0 || !cachedSubBiome) {

          cachedSubBiome = world.getSubBiomeAt(player.pos.x, player.pos.z, player.pos.y);

          cachedBiomeParams = world.getBiomeParameters(player.pos.x, player.pos.z);



          explorationSystem.checkBiome(cachedSubBiome.mainBiome);

          explorationSystem.checkSubBiome(cachedSubBiome.id, cachedSubBiome.name, cachedSubBiome.description);

        }



        // Season & dynamic weather progression

        seasonWeatherSystem.update(delta, timeOfDayRef.current, world, player.pos);
        player.updateSurvival(delta,seasonWeatherSystem.totalDays-1+timeOfDayRef.current);



        // Weather precipitation & visual particle simulation (rain stops at solid blocks, passes through leaves)

        weatherEffects.update(

          delta,

          player.pos,

          seasonWeatherSystem.currentWeather,

          seasonWeatherSystem.weatherBlend,

          seasonWeatherSystem.lightningStrikePos,

          world

        );



        // Sky, celestial orbits, ambient lighting, and circular horizon fog with weather

        skySystem.update(

          timeOfDayRef.current,

          player.pos,

          curDist,

          scene,

          renderer,

          camera,

          isUnderwater,

          cachedSubBiome ?? undefined,

          seasonWeatherSystem.currentWeather,

          seasonWeatherSystem.weatherBlend,

          seasonWeatherSystem.lightningFlash

        );



        // Ambient Soundscapes: Rainfall, Snowstorm, Ocean, and Swim

        soundManager.updateAmbientAudio({

          isUnderwater,

          weather: seasonWeatherSystem.currentWeather,

          weatherBlend: seasonWeatherSystem.weatherBlend,

          subBiome: cachedSubBiome,

          playerPos: player.pos,

          world

        });



        // Chunk streaming around player with predictive preloading

        world.updateChunksAround(

          player.pos.x,

          player.pos.z,

          curDist,

          false,

          player.vel.x,

          player.vel.z,

          player.yaw

        );

        // Chunk generation and meshing now happen in web workers - no main-thread processing



        // Update indigenous entities & physics

        const entityResults = entityManager.update(delta, player.pos);

        if (entityResults.playerBounced) {

          player.bounceUpward(16.0);

        }

        if (entityResults.playerHealed) {

          player.health = Math.min(player.maxHealth, player.health + 1);

        }



        // Render particles

        particleSystem.update(entityManager.particles);



        // Update dropped items & player pickup

        droppedItemManager.update(delta, player.pos, (item, count) => {

          interactionHandler.addItemToPlayer(item, count);

        });



        // Notify parent HUD of vitals every 12 frames (~5x/sec) — keeps HUD responsive while eliminating React re-render churn

        if (frameCount % 12 === 0) {

          window.dispatchEvent(new CustomEvent('biome-survival',{detail:player.survival.snapshot()}));
          onPlayerVitalsUpdate(

            player.health,

            player.stamina,

            { x: player.pos.x, y: player.pos.y, z: player.pos.z },

            player.yaw,

            cachedSubBiome ?? undefined,

            cachedBiomeParams ?? undefined,

            (player.targetedBlock && player.targetedBlock.hit) ? {

              x: player.targetedBlock.x,

              y: player.targetedBlock.y,

              z: player.targetedBlock.z,

              block: player.targetedBlock.block

            } : null

          );

        }



        // Target inspection card for entities (throttled to every 6 frames)

        if (frameCount % 6 === 0) {

          const targetedEnt = EntityInspector.findTargetedEntity(

            entityManager,

            player.pos,

            player.yaw,

            player.pitch

          );

          if (targetedEnt) {

            explorationSystem.recordEntityEncounter(targetedEnt.species);

          }

        }

      } else if (world) {

        // While world is initializing, keep sky and ambient lighting animated smoothly

        skySystem.update(

          timeOfDayRef.current,

          player.pos,

          curDist,

          scene,

          renderer,

          camera,

          false,

          undefined,

          seasonWeatherSystem.currentWeather,

          seasonWeatherSystem.weatherBlend,

          seasonWeatherSystem.lightningFlash

        );

      }



      onlineWorld?.update(delta);

      clockBroadcast+=delta;if(clockBroadcast>5&&!world.isRemote){clockBroadcast=0;void window.desktop?.online('clock',{time:timeOfDayRef.current,speed:.002*currentSettings.dayNightSpeed,weather:seasonWeatherSystem.snapshot()}).catch(()=>{});}

      if(avatar){

        avatar.root.visible=player.isThirdPerson && hasEnteredWorldRef.current;

        avatar.update(player.pos.x,player.pos.y,player.pos.z,player.yaw,player.pitch,isPausedRef.current?0:Math.hypot(player.vel.x,player.vel.z),delta);

      }

      renderer.render(scene, camera);

      // Tick the shared counter so PerfMonitor measures actual rendered frames

      frameCounter.count++;

      frameCounter.lastRenderTime = time;

    };



    // Immediate initial frame render

    renderer.render(scene, camera);

    // Start the animation loop

    animate(performance.now());



    // 7. Responsive Resize Observer

    const handleResize = () => {

      if (!containerRef.current || !renderer || !camera) return;

      const w = containerRef.current.clientWidth || window.innerWidth;

      const h = containerRef.current.clientHeight || window.innerHeight;

      if (w > 0 && h > 0) {

        camera.aspect = w / h;

        camera.updateProjectionMatrix();

        renderer.setSize(w, h, false);

      }

    };



    const resizeObserver = new ResizeObserver(() => {

      handleResize();

    });

    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', handleResize);



    return () => {

      isCancelled = true;

      cancelAnimationFrame(animId);

      resizeObserver.disconnect();

      window.removeEventListener('resize', handleResize);



      interactionHandler.destroy();

      weatherEffects.destroy();

      skySystem.destroy(scene);

      particleSystem.destroy(scene);

      window.removeEventListener('biome-respawn',respawnListener);onlineWorld?.close();window.removeEventListener('biome-clock',clockListener);

      avatar?.dispose();

      player.destroy();

      if (world) world.destroy();

      if (entityManager) entityManager.destroy();

      if (droppedItemManager) droppedItemManager.destroy();



      soundManager.stopWorldAudio();

      renderer.dispose();

      if (containerRef.current && renderer.domElement && renderer.domElement.parentNode === containerRef.current) {

        containerRef.current.removeChild(renderer.domElement);

      }

    };

  }, []);



  return (

    <div className="absolute inset-0 select-none overflow-hidden bg-sky-300">

      <div ref={containerRef} className="absolute inset-0 cursor-crosshair overflow-hidden" />



      {/* Real-time Loading Overlay with Progress Bar */}

      {!isWorldReady && (

        <LoadingOverlay

          error={loadingError}

          onCancel={onReturnToMenu}

          progress={loadingProgress}

          stageMessage={loadingStage}

        />

      )}



      {/* Click-to-Play Pointer Lock Overlay (only on initial entry, never when opening/closing menu or workbench) */}

      {isWorldReady && !hasEnteredWorld && !isLocked && !isPaused && (

        <div className="world-entry"><button className="primary" onClick={() => {

          markEnteredWorld();

          soundManager.init();

          rendererRef.current?.domElement.requestPointerLock()?.catch(() => {});

        }}>Enter world</button><button className="entry-back" onClick={onReturnToMenu}>Back to worlds</button></div>

      )}

    </div>

  );

};



export const GameCanvas = React.memo(GameCanvasComponent);
