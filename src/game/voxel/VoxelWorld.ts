import * as THREE from 'three';
import { BiomeType, BlockType } from '../../types';
import { isLogBlock, isPlantBlock } from './Blocks';
import { Chunk } from './Chunk';
import { CHUNK_D, CHUNK_H, CHUNK_W, SEA_LEVEL } from './ChunkConstants';
import { ChunkMesher } from './ChunkMesher';
import { ChunkWorkerPool } from './ChunkWorkerPool';
import { MeshWorkerPool, MeshResult } from './MeshWorkerPool';
import { TextureAtlas } from './TextureAtlas';
import { WorldGenerator } from './WorldGenerator';

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

  // Worker pools — both generation and meshing happen off the main thread
  private pool: ChunkWorkerPool;
  private meshPool: MeshWorkerPool;

  // Tracks which chunks have an in-flight worker request
  private inflightKeys: Set<string> = new Set();
  private inflightMeshKeys: Set<string> = new Set();
  
  // Mesh queue for prioritized rendering
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

  constructor(scene: THREE.Scene, seed: number = 1337) {
    this.scene = scene;
    this.atlas = new TextureAtlas();
    this.generator = new WorldGenerator(seed);
    this.mesher = new ChunkMesher(this.atlas);
    this.pool = new ChunkWorkerPool(seed);
    this.meshPool = new MeshWorkerPool(this.atlas.uvMap);
  }

  public update(delta: number) {
    this.atlas.updateWater(delta);
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
    const modKey = this.getBlockCoordKey(wx, wy, wz);
    if (this.modifiedBlocks.has(modKey)) return this.modifiedBlocks.get(modKey)!;
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return this.generator.getProceduralBlock(wx, wy, wz);
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
    return chunk.getBlock(lx, wy, lz);
  }

  public setBlock(wx: number, wy: number, wz: number, type: BlockType) {
    if (wy < 0 || wy >= CHUNK_H) return;
    if (isPlantBlock(type) && isLogBlock(this.getBlock(wx, wy, wz))) return;
    
    const modKey = this.getBlockCoordKey(wx, wy, wz);
    this.modifiedBlocks.set(modKey, type);
    
    const cx = Math.floor(wx / CHUNK_W);
    const cz = Math.floor(wz / CHUNK_D);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) {
      const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
      const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
      chunk.setBlock(lx, wy, lz, type);
      this.rebuildChunkMesh(chunk);
      if (lx === 0)          this._dirtyNeighbor(cx - 1, cz, true);
      if (lx === CHUNK_W - 1) this._dirtyNeighbor(cx + 1, cz, true);
      if (lz === 0)          this._dirtyNeighbor(cx, cz - 1, true);
      if (lz === CHUNK_D - 1) this._dirtyNeighbor(cx, cz + 1, true);
    }
  }

  // ── Mesh queue ──────────────────────────────────────────────────────────────

  public enqueueMesh(chunk: Chunk) {
    const key = this.getChunkKey(chunk.cx, chunk.cz);
    if (this.inflightMeshKeys.has(key)) {
      // Already inflight — the current worker job was dispatched with a stale
      // neighbour snapshot. Flag the chunk so _applyMeshResult re-enqueues it
      // once the current result lands, picking up the fresh neighbour data.
      chunk.needsRemesh = true;
      return;
    }
    
    chunk.isDirty = true;
    this.inflightMeshKeys.add(key);
    this.meshKeys.add(key);
    
    // Get neighbor chunks for seamless borders
    const neighborNegX = this.chunks.get(this.getChunkKey(chunk.cx - 1, chunk.cz));
    const neighborPosX = this.chunks.get(this.getChunkKey(chunk.cx + 1, chunk.cz));
    const neighborNegZ = this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz - 1));
    const neighborPosZ = this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz + 1));

    // Request meshing from worker pool
    this.meshPool.request(
      chunk.cx,
      chunk.cz,
      chunk.voxels,
      chunk.maxY,
      chunk.isSicklyWater,
      neighborNegX?.voxels,
      neighborPosX?.voxels,
      neighborNegZ?.voxels,
      neighborPosZ?.voxels
    ).then((result) => {
      if (this.isDestroyed) return;
      this.inflightMeshKeys.delete(key);
      this._applyMeshResult(chunk, result);
    });
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
      geom.computeBoundingBox();
      geom.computeBoundingSphere();

      chunk.mesh = new THREE.Mesh(geom, this.mesher.solidMaterial);
      chunk.mesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.mesh.frustumCulled = false;
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
      geom.computeBoundingBox();
      geom.computeBoundingSphere();

      chunk.waterMesh = new THREE.Mesh(geom, this.mesher.waterMaterial);
      chunk.waterMesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.waterMesh.frustumCulled = true;
      chunk.waterMesh.renderOrder = 2;
      this.scene.add(chunk.waterMesh);
    }

    chunk.isDirty = false;

    // If a neighbour arrived while this chunk was inflight, its re-enqueue was
    // dropped (inflightMeshKeys guard). Re-mesh now with the fresh neighbour data.
    if (chunk.needsRemesh) {
      chunk.needsRemesh = false;
      this.enqueueMesh(chunk);
    }

    // After the async mesh lands, re-enqueue any water-bearing neighbours
    // through the worker pool so their boundary faces are re-culled against
    // this chunk's final voxel data. Using enqueueMesh keeps all heavy mesh
    // work on background threads — never blocking the main thread / game loop.
    if (chunk.waterMesh) {
      const cx = chunk.cx;
      const cz = chunk.cz;
      for (const [ncx, ncz] of [[cx-1,cz],[cx+1,cz],[cx,cz-1],[cx,cz+1]] as [number,number][]) {
        const nb = this.chunks.get(this.getChunkKey(ncx, ncz));
        if (nb?.waterMesh) this.enqueueMesh(nb);
      }
    }
  }

  public rebuildChunkMesh(chunk: Chunk) {
    // Synchronous meshing for immediate changes (e.g., block placement)
    this.mesher.rebuildMesh(
      chunk,
      this.scene,
      (wx, wy, wz) => this.getBlock(wx, wy, wz),
      this.chunks.get(this.getChunkKey(chunk.cx - 1, chunk.cz)),
      this.chunks.get(this.getChunkKey(chunk.cx + 1, chunk.cz)),
      this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz - 1)),
      this.chunks.get(this.getChunkKey(chunk.cx, chunk.cz + 1))
    );
  }

  // ── Worker-based async chunk generation ────────────────────────────────────

  /**
   * Request generation of a chunk from the worker pool.
   * When the worker returns, the chunk is inserted into the world and queued for meshing.
   * Non-blocking — returns immediately.
   */
  private _requestChunkFromWorker(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key) || this.inflightKeys.has(key)) return;
    this.inflightKeys.add(key);

    this.pool.request(cx, cz).then((result) => {
      if (this.isDestroyed) return;
      this.inflightKeys.delete(key);

      // Chunk may have been loaded synchronously while the worker was running
      if (this.chunks.has(key)) return;

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

      // Queue for meshing — mesh all loaded chunks so they're always visible
      this.enqueueMesh(chunk);
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

      // Always sync the immediate 3×3 so walking never hits empty space
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = this.getChunkKey(cx, cz);
          if (!this.chunks.has(key)) {
            this.generateChunkSync(cx, cz);
          } else {
            const chunk = this.chunks.get(key)!;
            if (chunk.isDirty || !chunk.mesh) this.enqueueMesh(chunk);
          }
        }
      }

      this._dispatchRing(pcx, pcz, r, rPreload, velX, velZ, yaw);
      this._sortMeshQueue(pcx, pcz);

      // Unload far chunks
      for (const [key, chunk] of this.chunks.entries()) {
        const dx = chunk.cx - pcx;
        const dz = chunk.cz - pcz;
        if (dx * dx + dz * dz > rUnloadSq) {
          this._disposeChunk(chunk);
          this.chunks.delete(key);
          this.meshKeys.delete(key);
        }
      }
      
      // Enforce maximum chunk limit to prevent memory overflow
      this._enforceChunkLimit(rUnloadSq);
    }
  }

  /**
   * Dispatch all chunks in [2..rPreload] ring to the worker pool,
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

    type Task = { cx: number; cz: number; priority: number };
    const tasks: Task[] = [];
    const rPreloadSq = rPreload * rPreload;

    for (let dx = -rPreload; dx <= rPreload; dx++) {
      for (let dz = -rPreload; dz <= rPreload; dz++) {
        const distSq = dx * dx + dz * dz;
        if (distSq > rPreloadSq + 1) continue;
        // Skip immediate 3×3 — already handled synchronously
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) continue;

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
    for (const t of tasks) this._requestChunkFromWorker(t.cx, t.cz);
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

  private _sortMeshQueue(pcx: number, pcz: number) {
    if (this.meshQueue.length <= 1) return;
    this.meshQueue.sort((a, b) => {
      const da = (a.cx - pcx) ** 2 + (a.cz - pcz) ** 2;
      const db = (b.cx - pcx) ** 2 + (b.cz - pcz) ** 2;
      return da - db;
    });
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
    // Properly dispose of all chunk resources to prevent memory leaks
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      if (Array.isArray(chunk.mesh.material)) {
        chunk.mesh.material.forEach(m => m.dispose());
      } else {
        chunk.mesh.material.dispose();
      }
      chunk.mesh = null;
    }
    if (chunk.waterMesh) {
      this.scene.remove(chunk.waterMesh);
      chunk.waterMesh.geometry.dispose();
      if (Array.isArray(chunk.waterMesh.material)) {
        chunk.waterMesh.material.forEach(m => m.dispose());
      } else {
        chunk.waterMesh.material.dispose();
      }
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
    let removed = 0;
    for (const { key, distSq } of chunkDistances) {
      if (this.chunks.size <= this.maxChunks) break;
      if (distSq > maxDistSq) {
        const chunk = this.chunks.get(key);
        if (chunk) {
          this._disposeChunk(chunk);
          this.chunks.delete(key);
          this.meshKeys.delete(key);
          removed++;
        }
      }
    }
    
    if (removed > 0) {
      console.log(`Memory management: unloaded ${removed} distant chunks to stay within limit`);
    }
  }

  // ── Destroy ─────────────────────────────────────────────────────────────────

  public destroy() {
    this.isDestroyed = true;
    this.pool.destroy();
    this.meshPool.destroy();
    
    // Properly dispose of all chunk resources
    for (const chunk of this.chunks.values()) {
      this._disposeChunk(chunk);
    }
    
    this.chunks.clear();
    this.inflightKeys.clear();
    this.inflightMeshKeys.clear();
    this.meshKeys.clear();
    this.meshQueue = [];
    this.modifiedBlocks.clear();
    
    // Dispose atlas and materials
    this.atlas.dispose();
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
