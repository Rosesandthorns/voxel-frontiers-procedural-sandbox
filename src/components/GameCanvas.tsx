import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ParticleSystem } from '../game/effects/ParticleSystem';
import { EntityManager } from '../game/entities/EntityManager';
import { EntityInspector } from '../game/entities/EntityInspector';
import { SkySystem } from '../game/environment/SkySystem';
import { InteractionHandler } from '../game/interaction/InteractionHandler';
import { PlayerController } from '../game/player/PlayerController';
import { ExplorationSystem } from '../game/systems/ExplorationSystem';
import { frameCounter } from '../game/systems/FrameCounter';
import { VoxelWorld } from '../game/voxel/VoxelWorld';
import { SpawnSystem } from '../game/world/SpawnSystem';
import { isWaterOrWaterlogged } from '../game/voxel/WaterFlora';
import { BlockType, InventorySlot, WorldSettings } from '../types';
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
  onOpenStation?: (stationId: 'inventory' | 'tool_crafter') => void;
  onOpenBestiary: () => void;
  onOpenSettings?: () => void;
  onWorldReady?: (ready: boolean) => void;
  onMiningProgress?: (progress: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
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
  onUpdateInventory,
  onMiningProgress
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);

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

  // Mutable refs for up-to-date state in animation loop and event listeners
  const timeOfDayRef = useRef<number>(settings.timeOfDay);
  const settingsRef = useRef<WorldSettings>(settings);
  const hotbarRef = useRef<InventorySlot[]>(hotbar);
  const selectedIndexRef = useRef<number>(selectedHotbarIndex);
  const inventoryRef = useRef<InventorySlot[]>(inventory || []);
  const isPausedRef = useRef<boolean>(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (playerRef.current) {
      playerRef.current.isPaused = isPaused;
      if (isPaused) {
        playerRef.current.resetKeys();
      }
    }
    if (isPaused && document.pointerLockElement) {
      document.exitPointerLock();
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
    const world = new VoxelWorld(scene, Math.floor(Math.random() * 999999));
    worldRef.current = world;

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
        if (onWorldReady) onWorldReady(true);

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
      onOpenInventory,
      onOpenStation,
      onOpenBestiary,
      onOpenSettings,
      onDiscoveryBanner,
      onPointerLockChange: setIsLocked,
      onMiningProgress,
      getPlayer: () => playerRef.current,
      getWorld: () => worldRef.current,
      getEntityManager: () => entityManagerRef.current,
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
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      
      const elapsed = time - lastTime;
      
      // Skip frame if we're running too fast (FPS cap)
      if (elapsed < frameInterval) {
        return;
      }
      
      // Clamp delta to prevent spiral of death
      const delta = Math.min(0.033, elapsed / 1000);
      lastTime = time - (elapsed % frameInterval);

      const currentSettings = settingsRef.current;
      const curDist = currentSettings.renderDistance || 9;

      // Update animated textures (such as 5-frame water caustics)
      if (world) {
        world.update(delta);
      }

      if (!isPaused && isWorldReadyRef.current && player && world && entityManager) {
        frameCount++;

        // Sync settings
        player.isThirdPerson = currentSettings.enableThirdPerson;
        if (currentSettings.enableFlight !== player.isFlying) {
          player.isFlying = currentSettings.enableFlight;
        }

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
          isWaterOrWaterlogged(camBlockSub, Math.floor(camera.position.y - 0.1)) ||
          (player.isInWater && camera.position.y <= 100.8);

        // Biome & Sub-Biome exploration tracking (throttled to preserve 60FPS)
        if (frameCount % 8 === 0 || !cachedSubBiome) {
          const currentBiome = world.getBiomeAt(player.pos.x, player.pos.z, player.pos.y);
          cachedSubBiome = world.getSubBiomeAt(player.pos.x, player.pos.z, player.pos.y);
          cachedBiomeParams = world.getBiomeParameters(player.pos.x, player.pos.z);

          explorationSystem.checkBiome(currentBiome);
          explorationSystem.checkSubBiome(cachedSubBiome.id, cachedSubBiome.name, cachedSubBiome.description);
        }

        // Sky, celestial orbits, ambient lighting, and circular horizon fog
        skySystem.update(
          timeOfDayRef.current,
          player.pos,
          curDist,
          scene,
          renderer,
          camera,
          isUnderwater,
          cachedSubBiome ?? undefined
        );

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

        // Notify parent HUD of vitals every 6 frames — avoids React re-renders 60x/sec
        if (frameCount % 6 === 0) {
          onPlayerVitalsUpdate(
            player.health,
            player.stamina,
            { x: player.pos.x, y: player.pos.y, z: player.pos.z },
            player.yaw,
            cachedSubBiome ?? undefined,
            cachedBiomeParams ?? undefined
          );
        }

        // Target inspection card for entities
        const targetedEnt = EntityInspector.findTargetedEntity(
          entityManager,
          player.pos,
          player.yaw,
          player.pitch
        );
        if (targetedEnt) {
          explorationSystem.recordEntityEncounter(targetedEnt.species);
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
          false
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
      skySystem.destroy(scene);
      particleSystem.destroy(scene);
      player.destroy();
      if (world) world.destroy();
      if (entityManager) entityManager.destroy();

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

      {/* Click-to-Play Pointer Lock Overlay */}
      {isWorldReady && !isLocked && !isPaused && (
        <ClickToPlayOverlay
          onEnter={() => {
            if (rendererRef.current?.domElement) {
              rendererRef.current.domElement.requestPointerLock();
            }
          }}
        />
      )}
    </div>
  );
};
