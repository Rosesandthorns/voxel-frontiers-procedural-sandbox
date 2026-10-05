/**
 * WorldUpdateManager
 *
 * Manages the Third String of Processing (WorldUpdateWorker) on the main thread.
 * Coordinates fluid simulation, Minecraft water updates, and block interactions
 * without blocking chunk generation (String 1) or geometry meshing (String 2).
 */

import { BlockType } from '../../types';
import { CHUNK_D, CHUNK_W } from './ChunkConstants';
import { Chunk } from './Chunk';
import type { VoxelWorld } from './VoxelWorld';
import { getItemForBlock } from '../systems/ItemRegistry';

export interface WorldUpdateStats {
  totalUpdates: number;
  lastBatchSize: number;
  lastTickTime: number;
  activeString: string;
}

export class WorldUpdateManager {
  private worker: Worker | null = null;
  private world: VoxelWorld;
  private isDestroyed: boolean = false;

  public stats: WorldUpdateStats = {
    totalUpdates: 0,
    lastBatchSize: 0,
    lastTickTime: 0,
    activeString: 'String 3 (Fluid & World Simulation Worker)'
  };

  public onPlantWashedAway?: (x: number, y: number, z: number, block: BlockType) => void;

  constructor(world: VoxelWorld) {
    this.world = world;
  }

  /**
   * Notify String 3 that a chunk has finished generation and loaded into the world.
   */
  public onChunkLoaded(_chunk: Chunk) {
    // Handled directly by FluidSimulation without duplicating 40KB voxel buffers
  }

  /**
   * Notify String 3 that a chunk was unloaded to free memory.
   */
  public onChunkUnloaded(_cx: number, _cz: number) {
    // No-op
  }

  /**
   * Notify String 3 that a block was placed, broken, or modified by player.
   */
  public onBlockChange(_x: number, _y: number, _z: number, _block: BlockType) {
    // Handled directly by FluidSimulation
  }

  /**
   * Proactively trigger liquid flow checks at specific coordinates.
   */
  public triggerLiquidCheck(coords: [number, number, number][]) {
    if (this.isDestroyed) return;
    this.world.fluidSimulation?.queueCoords(coords);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  // ── Private message handling ──────────────────────────────────────────────

  private _onMessage(e: MessageEvent) {
    if (this.isDestroyed || !e.data) return;

    const data = e.data;
    if (data.type === 'worldUpdates') {
      const diffs: Int32Array = data.diffs;
      const count = diffs.length / 4;

      if (count > 0) {
        this.stats.totalUpdates += count;
        this.stats.lastBatchSize = count;
        this.stats.lastTickTime = performance.now();

        const affectedChunks: Set<string> = new Set();

        for (let i = 0; i < diffs.length; i += 4) {
          const wx = diffs[i];
          const wy = diffs[i + 1];
          const wz = diffs[i + 2];
          const blockType = diffs[i + 3] as BlockType;

          const cx = Math.floor(wx / CHUNK_W);
          const cz = Math.floor(wz / CHUNK_D);
          const chunkKey = this.world.getChunkKey(cx, cz);
          const chunk = this.world.chunks.get(chunkKey);

          if (chunk) {
            const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
            const lz = ((wz % CHUNK_D) + CHUNK_D) % CHUNK_D;
            chunk.setBlock(lx, wy, lz, blockType);
            this.world.modifiedBlocks.set(this.world.getBlockCoordKey(wx, wy, wz), blockType);
            affectedChunks.add(chunkKey);

            // If on chunk border, mark neighbor chunks for remesh to avoid seam cracks
            if (lx === 0) affectedChunks.add(this.world.getChunkKey(cx - 1, cz));
            if (lx === CHUNK_W - 1) affectedChunks.add(this.world.getChunkKey(cx + 1, cz));
            if (lz === 0) affectedChunks.add(this.world.getChunkKey(cx, cz - 1));
            if (lz === CHUNK_D - 1) affectedChunks.add(this.world.getChunkKey(cx, cz + 1));
          }
        }

        // Immediately rebuild mesh for smooth fluid updates and enqueue mesh
        for (const key of affectedChunks) {
          const chunkToMesh = this.world.chunks.get(key);
          if (chunkToMesh) {
            this.world.rebuildChunkMesh(chunkToMesh);
            this.world.enqueueMesh(chunkToMesh);
          }
        }
      }

      // Handle items dropped by water washing away plants
      if (data.brokenPlants && Array.isArray(data.brokenPlants)) {
        for (const [px, py, pz, plantBlock] of data.brokenPlants) {
          if (this.onPlantWashedAway) {
            this.onPlantWashedAway(px, py, pz, plantBlock);
          }
        }
      }
    }
  }
}
