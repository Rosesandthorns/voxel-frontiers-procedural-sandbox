import * as THREE from 'three';
import { BiomeType, BlockType } from '../../types';
import {
  isLogBlock,
  isPlantBlock,
  isWaterBlock,
  isWaterSource,
  getWaterLevel,
  getWaterBlockForLevel,
  isPassableByWater
} from './Blocks';
import { Chunk } from './Chunk';
import { CHUNK_D, CHUNK_H, CHUNK_W, SEA_LEVEL } from './ChunkConstants';
import { ChunkMesher } from './ChunkMesher';
import { ChunkWorkerPool } from './ChunkWorkerPool';
import { MeshWorkerPool, MeshResult } from './MeshWorkerPool';
import { TextureAtlas, ensureTextureAtlas } from './TextureAtlas';
import { WorldGenerator } from './WorldGenerator';
import { WorldUpdateManager } from './WorldUpdateManager';
import { propagateFluid, HORIZ_DIRS, FluidSimulation } from './FluidSimulation';
import { isWaterOrWaterlogged, isWaterloggedPlant } from './WaterFlora';
import { TileMoistureSystem } from './TileMoistureSystem';
import type { SeasonWeatherSystem } from '../environment/SeasonWeatherSystem';
import { ThermalWorkstationManager } from '../environment/ThermalWorkstationManager';

export { Chunk } from './Chunk';
export { CHUNK_D, CHUNK_H, CHUNK_W, SEA_LEVEL } from './ChunkConstants';

export class VoxelWorld {
  public chunks: Map<string, Chunk> = new Map();
  public modifiedBlocks: Map<string, BlockType> = new Map();
  public atlas: TextureAtlas;
  public scene: THREE.Scene;
  /** Kept for biome/block queries from the main thread (read-only, no generateChunk). */
  public generator: WorldGenerator;
  public mesher: ChunkMesher;

  // Worker pools — generation (String 1), meshing (String 2), world updates & fluid (String 3)
  private pool: ChunkWorkerPool;
  private meshPool: MeshWorkerPool;
  public worldUpdateManager: WorldUpdateManager;
  public fluidSimulation: FluidSimulation;
  public tileMoistureSystem: TileMoistureSystem;
  public seasonWeatherSystem?: SeasonWeatherSystem;

  // Tracks which chunks have an in-flight worker request
  private inflightKeys: Set<string> = new Set();
  private inflightMeshKeys: Set<string> = new Set();

  // Coalesced set of chunk keys waiting for a free MeshWorker thread
  private pendingMeshKeys: Set<string> = new Set();
  // Completed worker mesh results waiting for budgeted main-thread GPU buffer upload
  private completedMeshMap: Map<string, { chunk: Chunk; result: MeshResult }> = new Map();

  // Legacy compatibility fields
  private meshQueue: { cx: number; cz: number }[] = [];
  private meshKeys: Set<string> = new Set();

  public currentChunkCX: number = 0;
  public currentChunkCZ: number = 0;
  public entitySpawnCallbacks: ((speciesName: string, x: number, y: number, z: number) => void)[] = [];

  public playerPosX: number = 0;
  public playerPosZ: number = 0;
  public playerVelX: number = 0;
  public playerVelZ: number = 0;
  public playerYaw: number = 0;
  public currentRenderDistance: number = 12;

  private lastLoadedCX: number | null = null;
  private lastLoadedCZ: number | null = null;
  private lastLoadedDist: number | null = null;

  private isDestroyed: boolean = false;

  // Memory management settings
  private maxChunks: number = 500; // Maximum chunks to keep in memory (safety limit)
  private buriedPlants: Map<string, BlockType> = new Map();

  public setBuriedPlant(wx: number, wy: number, wz: number, plant: BlockType) {
    this.buriedPlants.set(`${wx},${wy},${wz}`, plant);
  }

  public getBuriedPlant(wx: number, wy: number, wz: number): BlockType | undefined {
    return this.buriedPlants.get(`${wx},${wy},${wz}`);
  }

  public clearBuriedPlant(wx: number, wy: number, wz: number) {
    this.buriedPlants.delete(`${wx},${wy},${wz}`);
  }

  constructor(scene: THREE.Scene, seed: number = 1337) {
    this.scene = scene;
    this.atlas = ensureTextureAtlas();
    this.generator = new WorldGenerator(seed);
    this.mesher = new ChunkMesher(this.atlas);
    this.pool = new ChunkWorkerPool(seed);
    this.meshPool = new MeshWorkerPool(this.atlas.uvMap);
    this.worldUpdateManager = new WorldUpdateManager(this);
    this.fluidSimulation = new FluidSimulation(this);
    this.tileMoistureSystem = new TileMoistureSystem(this);
    this.thermalWorkstationManager = new ThermalWorkstationManager();
  }

  public thermalWorkstationManager: ThermalWorkstationManager;

  public update(delta: number) {
    this.atlas.updateWater(delta);
    this.fluidSimulation.update(delta);
    const isRaining = this.seasonWeatherSystem ? this.seasonWeatherSystem.isRaining() : false;
    this.tileMoistureSystem.update(delta, isRaining);
    this._pumpMeshQueue();
    this._drainCompletedMeshes(3);
  }

  // ── Key helpers ─────────────────────────────────────────────────────────────

  public getChunkKey(cx: number, cz: number): string { return `${cx},${cz}`; }
  public getBlockCoordKey(x: number, y: number, z: number): string { return `${x},${y},${z}`; }

  // ── Biome / block queries (main-thread generator, read-only) ────────────────

  public getBiomeAt(worldX: number, worldZ: number, worldY?: number): BiomeType {
    return this.generator.getBiomeAt(worldX, worldZ, worldY);
  }
  public getSubBiomeAt(worldX: number, worldZ: number, worldY?: number) {
    return this.generator.getSubBiomeAt(worldX, worldZ, worldY);
  }
  public getBiomeParameters(worldX: number, worldZ: number) {
    return this.generator.getBiomeParameters(worldX, worldZ);
  }

  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_H) return BlockType.AIR;
    if (this.modifiedBlocks.size > 0) {
      const mod = this.modifiedBlocks.get(`${wx},${wy},${wz}`);
      if (mod !== undefined) return mod;
    }
    const cx = wx >> 4;
    const cz = wz >> 4;
    const chunk = this.chunks.get(`${cx},${cz}`);
    if (!chunk || chunk.voxels.length === 0) return BlockType.AIR;
    return chunk.voxels[(wx & 15) + ((wz & 15) << 4) + (wy << 8)];
  }

  public getWaterValue(wx: number, wy: number, wz: number): number {
    const cx = wx >> 4;
    const cz = wz >> 4;
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return 0;
    return chunk.getWaterValue(wx & 15, wy, wz & 15);
  }

  public setWaterValue(wx: number, wy: number, wz: number, val: number) {
    const cx = wx >> 4;
    const cz = wz >> 4;
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return;
    chunk.setWaterValue(wx & 15, wy, wz & 15, val);
  }

  public setBlock(wx: number, wy: number, wz: number, type: BlockType) {
    if (wy < 0 || wy >= CHUNK_H) return;
    if (isPlantBlock(type) && isLogBlock(this.getBlock(wx, wy, wz))) return;

    const prevBlock = this.getBlock(wx, wy, wz);
    if (prevBlock === type) return;

    const modKey = this.getBlockCoordKey(wx, wy, wz);
    this.modifiedBlocks.set(modKey, type);

    const cx = wx >> 4;
    const cz = wz >> 4;
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) {
      const lx = wx & 15;
      const lz = wz & 15;
      chunk.setBlock(lx, wy, lz, type);
      this.rebuildChunkMesh(chunk);
      if (lx === 0)           this._dirtyNeighbor(cx - 1, cz, false);
      if (lx === CHUNK_W - 1) this._dirtyNeighbor(cx + 1, cz, false);
      if (lz === 0)           this._dirtyNeighbor(cx, cz - 1, false);
      if (lz === CHUNK_D - 1) this._dirtyNeighbor(cx, cz + 1, false);
    }
    // Notify String 3 (fluid simulation worker) of block change
    this.worldUpdateManager.onBlockChange(wx, wy, wz, type);

    // Notify TileMoistureSystem of block change
    if (type === BlockType.AIR) {
      this.tileMoistureSystem.onBlockBroken(wx, wy, wz, prevBlock);
    } else {
      this.tileMoistureSystem.onBlockPlaced(wx, wy, wz, type);
    }

    // Notify ThermalWorkstationManager if Heater or Cooler placed / broken
    if (type === BlockType.HEATER) {
      this.thermalWorkstationManager.registerStation(wx, wy, wz, 'heater', this);
    } else if (type === BlockType.COOLER) {
      this.thermalWorkstationManager.registerStation(wx, wy, wz, 'cooler', this);
    }
    if (prevBlock === BlockType.HEATER || prevBlock === BlockType.COOLER) {
      this.thermalWorkstationManager.removeStation(wx, wy, wz);
    }

    // Propagate fluid dynamics at a fast but not instant rate if water or adjacent to water
    const isWaterRelated =
      type === BlockType.AIR ||
      isWaterOrWaterlogged(type, wy) ||
      isWaterOrWaterlogged(prevBlock, wy) ||
      this.hasAdjacentWater(wx, wy, wz);

    if (isWaterRelated) {
      this.fluidSimulation.queueCoord(wx, wy, wz);
      this.tileMoistureSystem.onWaterChanged(wx, wy, wz);
    }
  }

  public hasAdjacentWater(wx: number, wy: number, wz: number): boolean {
    if (isWaterOrWaterlogged(this.getBlock(wx, wy + 1, wz), wy + 1)) return true;
    if (isWaterOrWaterlogged(this.getBlock(wx, wy - 1, wz), wy - 1)) return true;
    for (const [dx, dz] of HORIZ_DIRS) {
      if (isWaterOrWaterlogged(this.getBlock(wx + dx, wy, wz + dz), wy)) return true;
    }
    return false;
  }

  // ── Mesh queue ──────────────────────────────────────────────────────────────

  public enqueueMesh(chunk: Chunk) {
    const key = this.getChunkKey(chunk.cx, chunk.cz);
    chunk.isDirty = true;
    this.meshKeys.add(key);

    if (this.inflightMeshKeys.has(key)) {
      // Currently being meshed by a worker — mark so it re-queues with fresh neighbors on completion
      chunk.needsRemesh = true;
      return;
    }

    // Coalesce into pendingMeshKeys until a worker thread is free
    this.pendingMeshKeys.add(key);
    this._pumpMeshQueue();
  }

  private _pumpMeshQueue() {
    if (this.isDestroyed || this.pendingMeshKeys.size === 0) return;

    while (this.meshPool.hasFreeWorker() && this.pendingMeshKeys.size > 0) {
      let bestKey: string | null = null;
      let bestScore = Infinity;
      const pcx = this.currentChunkCX;
      const pcz = this.currentChunkCZ;

      for (const key of this.pendingMeshKeys) {
        const chunk = this.chunks.get(key);
        if (!chunk) {
          this.pendingMeshKeys.delete(key);
          continue;
        }
        const dx = chunk.cx - pcx;
        const dz = chunk.cz - pcz;
        const distSq = dx * dx + dz * dz;
        // Prioritize chunks without a mesh yet so terrain appears immediately;
        // chunks that already have a mesh and only need a border seam update run right after.
        const score = (chunk.mesh === null ? -10000 : 0) + distSq;
        if (score < bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }

      if (!bestKey) break;
      this.pendingMeshKeys.delete(bestKey);

      const chunk = this.chunks.get(bestKey);
      if (!chunk) continue;

      this.inflightMeshKeys.add(bestKey);
      chunk.needsRemesh = false;

      // Snapshot the latest neighbor voxels right at dispatch time
      const neighborNegX = this.chunks.get(this.getChunkKey(chunk.cx - 1, chunk.cz));
      const neighborPosX = this.chunks.get(this.getChunkKey(chunk.cx + 1, chunk.cz));
      const neighborNegZ = this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz - 1));
      const neighborPosZ = this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz + 1));

      const dispatchedKey = bestKey;
      this.meshPool.request(
        chunk.cx,
        chunk.cz,
        chunk.voxels,
        chunk.maxY,
        chunk.isSicklyWater,
        neighborNegX?.voxels,
        neighborPosX?.voxels,
        neighborNegZ?.voxels,
        neighborPosZ?.voxels,
        chunk.waterValues
      ).then((result) => {
        if (this.isDestroyed) return;
        this.inflightMeshKeys.delete(dispatchedKey);
        if (this.chunks.has(dispatchedKey)) {
          this.completedMeshMap.set(dispatchedKey, { chunk, result });
        }
        this._pumpMeshQueue();
      });
    }
  }

  private _drainCompletedMeshes(maxUploadsPerFrame: number) {
    if (this.completedMeshMap.size === 0) return;

    const pcx = this.currentChunkCX;
    const pcz = this.currentChunkCZ;
    let uploads = 0;

    while (uploads < maxUploadsPerFrame && this.completedMeshMap.size > 0) {
      let bestKey: string | null = null;
      let bestScore = Infinity;

      for (const [key, entry] of this.completedMeshMap.entries()) {
        if (!this.chunks.has(key)) {
          this.completedMeshMap.delete(key);
          continue;
        }
        const dx = entry.chunk.cx - pcx;
        const dz = entry.chunk.cz - pcz;
        const distSq = dx * dx + dz * dz;
        const score = (entry.chunk.mesh === null ? -10000 : 0) + distSq;
        if (score < bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }

      if (!bestKey) break;
      const entry = this.completedMeshMap.get(bestKey)!;
      this.completedMeshMap.delete(bestKey);

      this._applyMeshResult(entry.chunk, entry.result);
      uploads++;
    }
  }

  private static _setChunkBounds(geom: THREE.BufferGeometry, maxY: number) {
    const topY = Math.max(16, Math.min(CHUNK_H, maxY + 2));
    const halfY = topY * 0.5;
    geom.boundingBox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(CHUNK_W, topY, CHUNK_D)
    );
    geom.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(CHUNK_W * 0.5, halfY, CHUNK_D * 0.5),
      Math.sqrt(64 + 64 + halfY * halfY)
    );
  }

  private _applyMeshResult(chunk: Chunk, result: MeshResult) {
    // Dispose previous geometry
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }
    if (chunk.waterMesh) {
      this.scene.remove(chunk.waterMesh);
      chunk.waterMesh.geometry.dispose();
      chunk.waterMesh = null;
    }

    // Apply solid geometry
    if (result.solidPositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(result.solidPositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(result.solidNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(result.solidUVs, 2));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(result.solidColors, 3));
      geom.setIndex(new THREE.Uint32BufferAttribute(result.solidIndices, 1));
      VoxelWorld._setChunkBounds(geom, chunk.maxY);

      chunk.mesh = new THREE.Mesh(geom, this.mesher.solidMaterial);
      chunk.mesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.mesh.frustumCulled = true;
      this.scene.add(chunk.mesh);
    }

    // Apply water geometry
    if (result.waterPositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(result.waterPositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(result.waterNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(result.waterUVs, 2));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(result.waterColors, 3));
      geom.setIndex(new THREE.Uint32BufferAttribute(result.waterIndices, 1));
      VoxelWorld._setChunkBounds(geom, chunk.maxY);

      chunk.waterMesh = new THREE.Mesh(geom, this.mesher.waterMaterial);
      chunk.waterMesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.waterMesh.frustumCulled = true;
      chunk.waterMesh.renderOrder = 2;
      this.scene.add(chunk.waterMesh);
    }

    chunk.isDirty = false;

    // If a neighbour arrived while this chunk was inflight, re-enqueue with fresh neighbour data
    if (chunk.needsRemesh) {
      chunk.needsRemesh = false;
      this.enqueueMesh(chunk);
    }
  }

  public rebuildChunkMesh(chunk: Chunk, waterOnly: boolean = false) {
    // Synchronous meshing for immediate changes (e.g., block placement or fluid spread)
    this.mesher.rebuildMesh(
      chunk,
      this.scene,
      (wx, wy, wz) => this.getBlock(wx, wy, wz),
      this.chunks.get(this.getChunkKey(chunk.cx - 1, chunk.cz)),
      this.chunks.get(this.getChunkKey(chunk.cx + 1, chunk.cz)),
      this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz - 1)),
      this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz + 1)),
      waterOnly
    );
  }

  // ── Worker-based async chunk generation ────────────────────────────────────

  /**
   * Request generation of a chunk from the worker pool.
   * When the worker returns, the chunk is inserted into the world and queued for meshing.
   * Non-blocking — returns immediately.
   */
  private _requestChunkFromWorker(cx: number, cz: number, priority: number = 0) {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key) || this.inflightKeys.has(key)) return;
    this.inflightKeys.add(key);

    this.pool.request(cx, cz, priority).then((result) => {
      if (this.isDestroyed) return;
      this.inflightKeys.delete(key);

      // Chunk may have been loaded synchronously while the worker was running
      if (this.chunks.has(key)) return;

      // Discard if player already moved beyond unload radius while chunk was generating
      const rUnload = (this.currentRenderDistance || 9) + 5;
      const dx = cx - this.currentChunkCX;
      const dz = cz - this.currentChunkCZ;
      if (dx * dx + dz * dz > rUnload * rUnload) return;

      const chunk = new Chunk(cx, cz, result.biome, result.subBiomeName, result.subBiomeId);
      chunk.voxels = result.voxels;
      chunk.maxY = result.maxY;
      chunk.isSicklyWater = result.isSicklyWater;
      chunk.isDirty = true;

      // Apply any player-modified blocks that landed in this chunk
      this._applyModifiedBlocks(chunk);

      this.chunks.set(key, chunk);

      // Dirty neighbors so seams update
      this._dirtyNeighbor(cx - 1, cz, false);
      this._dirtyNeighbor(cx + 1, cz, false);
      this._dirtyNeighbor(cx, cz - 1, false);
      this._dirtyNeighbor(cx, cz + 1, false);

      // Initialize moisture for surface sand and farmland
      this.tileMoistureSystem.initChunkMoisture(chunk);

      // Queue for meshing — mesh all loaded chunks so they're always visible
      this.enqueueMesh(chunk);

      // Register chunk on String 3 and fluid simulator for water updates
      this.worldUpdateManager.onChunkLoaded(chunk);
      this.fluidSimulation.onChunkLoaded(chunk);
    });
  }

  /**
   * Synchronous generation — only used for the immediate 3×3 spawn area
   * so the player never spawns over empty space.
   */
  public generateChunkSync(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generator.generateChunk(cx, cz, this.modifiedBlocks);
      this.chunks.set(key, chunk);
      // Cancel any in-flight worker request for this chunk
      this.inflightKeys.delete(key);
      this.pool.cancel(cx, cz);
      this._dirtyNeighbor(cx - 1, cz, false);
      this._dirtyNeighbor(cx + 1, cz, false);
      this._dirtyNeighbor(cx, cz - 1, false);
      this._dirtyNeighbor(cx, cz + 1, false);
      this.worldUpdateManager.onChunkLoaded(chunk);
      this.fluidSimulation.onChunkLoaded(chunk);
      this.tileMoistureSystem.initChunkMoisture(chunk);
    }
    if (chunk.isDirty || !chunk.mesh) this.rebuildChunkMesh(chunk);
    return chunk;
  }

  // ── Streaming ───────────────────────────────────────────────────────────────

  public updateChunksAround(
    playerWX: number,
    playerWZ: number,
    renderDistance: number = 12,
    force: boolean = false,
    velX: number = 0,
    velZ: number = 0,
    yaw: number = 0
  ) {
    this.playerPosX = playerWX;
    this.playerPosZ = playerWZ;
    this.playerVelX = velX;
    this.playerVelZ = velZ;
    this.playerYaw = yaw;
    this.currentRenderDistance = renderDistance;

    const pcx = Math.floor(playerWX / CHUNK_W);
    const pcz = Math.floor(playerWZ / CHUNK_D);
    this.currentChunkCX = pcx;
    this.currentChunkCZ = pcz;

    const r = renderDistance;
    const rPreload = r + 2;
    const rUnload = r + 5;
    const rUnloadSq = rUnload * rUnload;

    // ── Task 4: force-sync the 3×3 around player so there is never empty ground ──
    if (force) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          this.generateChunkSync(pcx + dx, pcz + dz);
        }
      }
      this.lastLoadedCX = pcx;
      this.lastLoadedCZ = pcz;
      this.lastLoadedDist = renderDistance;
      // Dispatch remaining ring to workers
      this._dispatchRing(pcx, pcz, r, rPreload, velX, velZ, yaw);
      return;
    }

    const chunkShifted =
      this.lastLoadedCX !== pcx ||
      this.lastLoadedCZ !== pcz ||
      this.lastLoadedDist !== renderDistance;

    if (chunkShifted) {
      this.lastLoadedCX = pcx;
      this.lastLoadedCZ = pcz;
      this.lastLoadedDist = renderDistance;

      // Ensure immediate 3×3 chunks are requested asynchronously from workers without stalling the main thread
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = this.getChunkKey(cx, cz);
          if (!this.chunks.has(key)) {
            this._requestChunkFromWorker(cx, cz, -500);
          } else {
            const chunk = this.chunks.get(key)!;
            if (chunk.isDirty || !chunk.mesh) this.enqueueMesh(chunk);
          }
        }
      }

      this._dispatchRing(pcx, pcz, r, rPreload, velX, velZ, yaw);

      // Unload far chunks
      for (const [key, chunk] of this.chunks.entries()) {
        const dx = chunk.cx - pcx;
        const dz = chunk.cz - pcz;
        if (dx * dx + dz * dz > rUnloadSq) {
          this.worldUpdateManager.onChunkUnloaded(chunk.cx, chunk.cz);
          this.fluidSimulation.onChunkUnloaded(chunk.cx, chunk.cz);
          this._disposeChunk(chunk);
          this.chunks.delete(key);
          this.meshKeys.delete(key);
          this.pendingMeshKeys.delete(key);
          this.completedMeshMap.delete(key);
        }
      }

      // Enforce maximum chunk limit to prevent memory overflow
      this._enforceChunkLimit(rUnloadSq);
    }
  }

  /**
   * Dispatch all chunks in [0..rPreload] ring to the worker pool,
   * sorted by direction the player is facing/moving (closest & forward first).
   */
  private _dispatchRing(
    pcx: number, pcz: number,
    r: number, rPreload: number,
    velX: number, velZ: number, yaw: number
  ) {
    let moveDirX = velX;
    let moveDirZ = velZ;
    const speed = Math.sqrt(moveDirX * moveDirX + moveDirZ * moveDirZ);
    if (speed > 0.05) { moveDirX /= speed; moveDirZ /= speed; }
    else { moveDirX = -Math.sin(yaw); moveDirZ = -Math.cos(yaw); }

    const rUnload = r + 5;
    const prunedKeys = this.pool.reprioritizeAndPrune(pcx, pcz, r, rUnload * rUnload, moveDirX, moveDirZ);
    for (let i = 0; i < prunedKeys.length; i++) {
      this.inflightKeys.delete(prunedKeys[i]);
    }

    type Task = { cx: number; cz: number; priority: number };
    const tasks: Task[] = [];
    const rPreloadSq = rPreload * rPreload;

    for (let dx = -rPreload; dx <= rPreload; dx++) {
      for (let dz = -rPreload; dz <= rPreload; dz++) {
        const distSq = dx * dx + dz * dz;
        if (distSq > rPreloadSq + 1) continue;

        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.getChunkKey(cx, cz);
        if (this.chunks.has(key) || this.inflightKeys.has(key)) continue;

        const d = Math.sqrt(distSq) || 0.01;
        const dot = (dx * moveDirX + dz * moveDirZ) / d;
        const isVisible = distSq <= r * r + 1;
        const priority = (isVisible ? -100 : 50) + d - dot * 3.5;
        tasks.push({ cx, cz, priority });
      }
    }

    tasks.sort((a, b) => a.priority - b.priority);
    for (const t of tasks) this._requestChunkFromWorker(t.cx, t.cz, t.priority);
  }

  // ── Initial load (loading screen) ──────────────────────────────────────────

  public async loadInitialChunksAsync(
    playerWX: number,
    playerWZ: number,
    radius: number = 1,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<void> {
    const pcx = Math.floor(playerWX / CHUNK_W);
    const pcz = Math.floor(playerWZ / CHUNK_D);

    const coords: { cx: number; cz: number }[] = [];
    for (let dist = 0; dist <= radius; dist++) {
      for (let dx = -dist; dx <= dist; dx++) {
        for (let dz = -dist; dz <= dist; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== dist) continue;
          coords.push({ cx: pcx + dx, cz: pcz + dz });
        }
      }
    }

    const total = coords.length;
    let completed = 0;

    for (const { cx, cz } of coords) {
      if (this.isDestroyed) return;
      this.generateChunkSync(cx, cz);
      completed++;

      const pct = Math.min(100, Math.round((completed / total) * 100));
      let msg = 'Sculpting terrain frontiers...';
      if (pct < 30)      msg = 'Generating procedural terrain...';
      else if (pct < 65) msg = 'Carving subterranean caverns...';
      else if (pct < 90) msg = 'Seeding indigenous biomes & flora...';
      else               msg = 'Constructing environment mesh...';
      onProgress?.(pct, msg);

      await new Promise<void>(res => requestAnimationFrame(() => res()));
    }
    onProgress?.(100, 'World ready!');
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _dirtyNeighbor(cx: number, cz: number, immediate: boolean) {
    const neighbor = this.chunks.get(this.getChunkKey(cx, cz));
    if (!neighbor) return;
    neighbor.isDirty = true;
    if (immediate) this.rebuildChunkMesh(neighbor);
    else this.enqueueMesh(neighbor);
  }

  private _applyModifiedBlocks(chunk: Chunk) {
    if (this.modifiedBlocks.size === 0) return;
    const minWX = chunk.cx * CHUNK_W;
    const maxWX = minWX + CHUNK_W;
    const minWZ = chunk.cz * CHUNK_D;
    const maxWZ = minWZ + CHUNK_D;
    for (const [key, blockType] of this.modifiedBlocks.entries()) {
      const parts = key.split(',');
      const wx = Number(parts[0]);
      const wy = Number(parts[1]);
      const wz = Number(parts[2]);
      if (wx >= minWX && wx < maxWX && wz >= minWZ && wz < maxWZ && wy >= 0 && wy < CHUNK_H) {
        chunk.setBlock(wx - minWX, wy, wz - minWZ, blockType);
      }
    }
  }

  private _disposeChunk(chunk: Chunk) {
    // Only dispose chunk-owned BufferGeometries; NEVER dispose shared solidMaterial / waterMaterial!
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }
    if (chunk.waterMesh) {
      this.scene.remove(chunk.waterMesh);
      chunk.waterMesh.geometry.dispose();
      chunk.waterMesh = null;
    }
    // Clear voxel array to free memory
    chunk.voxels = new Uint8Array(0);
  }

  private _enforceChunkLimit(maxDistSq: number) {
    // Safety limit: if we have too many chunks, unload the farthest ones
    if (this.chunks.size <= this.maxChunks) return;

    const pcx = Math.floor(this.playerPosX / CHUNK_W);
    const pcz = Math.floor(this.playerPosZ / CHUNK_D);

    // Sort chunks by distance from player
    const chunkDistances: { key: string; distSq: number }[] = [];
    for (const [key, chunk] of this.chunks.entries()) {
      const dx = chunk.cx - pcx;
      const dz = chunk.cz - pcz;
      chunkDistances.push({ key, distSq: dx * dx + dz * dz });
    }

    chunkDistances.sort((a, b) => b.distSq - a.distSq); // Farthest first

    // Remove farthest chunks until we're under the limit
    for (const { key, distSq } of chunkDistances) {
      if (this.chunks.size <= this.maxChunks) break;
      if (distSq > maxDistSq) {
        const chunk = this.chunks.get(key);
        if (chunk) {
          this._disposeChunk(chunk);
          this.chunks.delete(key);
          this.meshKeys.delete(key);
          this.pendingMeshKeys.delete(key);
          this.completedMeshMap.delete(key);
        }
      }
    }
  }

  // ── Destroy ─────────────────────────────────────────────────────────────────

  public destroy() {
    this.isDestroyed = true;
    this.worldUpdateManager.destroy();
    this.pool.destroy();
    this.meshPool.destroy();

    // Properly dispose of all chunk resources
    for (const chunk of this.chunks.values()) {
      this._disposeChunk(chunk);
    }

    this.chunks.clear();
    this.inflightKeys.clear();
    this.inflightMeshKeys.clear();
    this.pendingMeshKeys.clear();
    this.completedMeshMap.clear();
    this.meshKeys.clear();
    this.meshQueue = [];
    this.modifiedBlocks.clear();

    // Dispose materials (keep shared TextureAtlas singleton intact)
    this.mesher.solidMaterial.dispose();
    this.mesher.waterMaterial.dispose();
  }

  // Memory management statistics (for debugging)
  public getMemoryStats() {
    return {
      loadedChunks: this.chunks.size,
      modifiedBlocks: this.modifiedBlocks.size,
      inflightRequests: this.inflightKeys.size,
      inflightMeshRequests: this.inflightMeshKeys.size,
      meshQueueSize: this.meshQueue.length,
      memoryEstimateMB: Math.round(
        (this.chunks.size * 40960 + // Each chunk ~40KB for voxels
         this.modifiedBlocks.size * 24 + // Each modified block ~24 bytes (permanent storage)
         this.meshQueue.length * 100) / 1024 // Mesh queue overhead
      )
    };
  }
}
