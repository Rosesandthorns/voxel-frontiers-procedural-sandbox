import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ParticleSystem } from '../game/effects/ParticleSystem';
import { EntityManager } from '../game/entities/EntityManager';
import { DroppedItemManager } from '../game/entities/DroppedItemManager';
import { EntityInspector } from '../game/entities/EntityInspector';
import { SkySystem } from '../game/environment/SkySystem';
import { InteractionHandler } from '../game/interaction/InteractionHandler';
import { PlayerController } from '../game/player/PlayerController';
import { ExplorationSystem } from '../game/systems/ExplorationSystem';
import { frameCounter } from '../game/systems/FrameCounter';
import { VoxelWorld } from '../game/voxel/VoxelWorld';
import { SpawnSystem } from '../game/world/SpawnSystem';
import { isWaterOrWaterlogged } from '../game/voxel/WaterFlora';
import { getItemForBlock } from '../game/systems/ItemRegistry';
import { isMoistureSensitiveBlock } from '../game/voxel/Blocks';
import { SeasonWeatherSystem } from '../game/environment/SeasonWeatherSystem';
import { WeatherEffects } from '../game/environment/WeatherEffects';
import { soundManager } from '../game/audio/SoundFX';
import { BlockType, InventorySlot, Season, WorldSettings } from '../types';
import { BiomeParameters, VerdantSubBiomeDef } from '../game/voxel/SubBiomeTypes';
import { ClickToPlayOverlay } from './ClickToPlayOverlay';
import { LoadingOverlay } from './LoadingOverlay';

interface GameCanvasProps {
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
    biomeParams?: BiomeParameters
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
  onWorldReady?: (ready: boolean, world?: VoxelWorld) => void;
  onMiningProgress?: (progress: number) => void;
  seasonWeatherSystem?: SeasonWeatherSystem;
}

const GameCanvasComponent: React.FC<GameCanvasProps> = ({
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
  onWorldReady,
  inventory,
  seasonWeatherSystem: seasonWeatherSystemProp,
  onUpdateInventory,
  onMiningProgress
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasEnteredWorld, setHasEnteredWorld] = useState(false);
  const hasEnteredWorldRef = useRef(false);
  const wasPausedRef = useRef<boolean>(isPaused);

  const defaultSeasonWeatherRef = useRef<SeasonWeatherSystem | null>(null);
  if (!defaultSeasonWeatherRef.current) {
    defaultSeasonWeatherRef.current = new SeasonWeatherSystem();
  }
  const seasonWeatherSystem = seasonWeatherSystemProp || defaultSeasonWeatherRef.current;

  const markEnteredWorld = () => {
    if (!hasEnteredWorldRef.current) {
      hasEnteredWorldRef.current = true;
      setHasEnteredWorld(true);
    }
  };

  // Smooth, instant asynchronous world loading state & progress bar
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
      markEnteredWorld();
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else if (wasPaused) {
      // Returning from menu or tool workbench: re-request pointer lock without showing pause overlay
      try {
        const p = rendererRef.current?.domElement?.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // Ignore if browser defers pointer lock until next click
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
    const world = new VoxelWorld(scene, Math.floor(Math.random() * 999999));
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
    const spawnPoint = SpawnSystem.findSafeSpawn(world);
    const player = new PlayerController(camera, world);
    player.pos.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    player.updateCamera();
    playerRef.current = player;

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
      });

    const entityManager = new EntityManager(scene, world);
    entityManagerRef.current = entityManager;

    const droppedItemManager = new DroppedItemManager(scene, world, world.atlas);
    droppedItemManagerRef.current = droppedItemManager;

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
      isPaused: () => isPausedRef.current
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
        world.update(delta);
      }

      if (!isPaused && isWorldReadyRef.current && player && world && entityManager) {
        frameCount++;

        // Sync settings & held items
        player.isThirdPerson = currentSettings.enableThirdPerson;
        if (currentSettings.enableFlight !== player.isFlying) {
          player.isFlying = currentSettings.enableFlight;
        }
        const activeItem = hotbarRef.current[selectedIndexRef.current]?.item;
        player.isHoldingLiquidContainer = activeItem?.id === 'empty_bucket';

        // Update player controller & physics
        player.update(delta);
        interactionHandler.update(delta);

        // Day-Night progression
        if (currentSettings.dayNightSpeed > 0) {
          timeOfDayRef.current = (timeOfDayRef.current + delta * 0.002 * currentSettings.dayNightSpeed) % 1.0;
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
          onPlayerVitalsUpdate(
            player.health,
            player.stamina,
            { x: player.pos.x, y: player.pos.y, z: player.pos.z },
            player.yaw,
            cachedSubBiome ?? undefined,
            cachedBiomeParams ?? undefined
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
      player.destroy();
      if (world) world.destroy();
      if (entityManager) entityManager.destroy();
      if (droppedItemManager) droppedItemManager.destroy();

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
          progress={loadingProgress}
          stageMessage={loadingStage}
        />
      )}

      {/* Click-to-Play Pointer Lock Overlay (only on initial entry, never when opening/closing menu or workbench) */}
      {isWorldReady && !hasEnteredWorld && !isLocked && !isPaused && (
        <ClickToPlayOverlay
          onEnter={() => {
            markEnteredWorld();
            if (rendererRef.current?.domElement) {
              try {
                const p = rendererRef.current.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
                if (p && typeof p.catch === 'function') {
                  p.catch(() => {});
                }
              } catch {
                // Ignore
              }
            }
          }}
        />
      )}
    </div>
  );
};

export const GameCanvas = React.memo(GameCanvasComponent);
