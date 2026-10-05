/**
 * FluidSimulation.ts
 *
 * Implements authentic Minecraft fluid dynamics for water and lava at a fast,
 * smooth, but distinctly non-instant flow rate (~65ms per block propagation wave):
 * - Fast sequential cascading for waterfalls and horizontal spreading
 * - Water bucket placement: flows rapidly downward and spreads up to 7 blocks
 * - Block breaking: water rushes naturally into newly opened trenches and holes
 * - Water plants / waterlogged flora: underwater vegetation (seagrass, kelp, reeds, algae)
 *   act as continuous water media and water sources so water flows naturally around them
 * - Empty bucket scooping: decay and retraction when source blocks are removed
 * - Infinite water spring creation: 2+ adjacent source blocks over solid/water
 * - Lava reactions: obsidian on lava source, cobblestone on flowing lava
 * - Plant washing: displacing and dropping items for non-solid land plants
 */

import * as THREE from 'three';
import { BlockType } from '../../types';
import {
  isWaterBlock,
  isWaterSource,
  isWaterFalling,
  getWaterLevel,
  getWaterBlockForLevel,
  isPassableByWater,
  isPlantBlock
} from './Blocks';
import { CHUNK_D, CHUNK_H, CHUNK_W, SEA_LEVEL } from './ChunkConstants';
import {
  isWaterloggedPlant,
  isWaterOrWaterlogged,
  isWaterSourceMedium,
  getFluidLevel
} from './WaterFlora';
import type { Chunk } from './Chunk';
import type { VoxelWorld } from './VoxelWorld';

export const HORIZ_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

export interface FluidUpdateResult {
  affectedChunks: Set<string>;
  brokenPlants: [number, number, number, BlockType][];
}

/**
 * Fast, stepped fluid simulator running on the main animation loop.
 * Operates wave-by-wave so water visibly rushes and cascades rather than teleporting instantly.
 */
export class FluidSimulation {
  private world: VoxelWorld;
  private activeQueue: Set<string> = new Set();
  private nextQueue: Set<string> = new Set();
  private timer: number = 0;

  // 0.25s = 250ms per wave (4 blocks a second).
  public static readonly TICK_INTERVAL: number = 0.25;
  public static readonly MAX_UPDATES_PER_TICK: number = 96;

  constructor(world: VoxelWorld) {
    this.world = world;
  }

  public queueCoord(x: number, y: number, z: number) {
    if (y < 0 || y >= CHUNK_H) return;
    this.scheduleNeighbors(x, y, z);
  }

  public queueCoords(coords: [number, number, number][]) {
    for (const [x, y, z] of coords) {
      this.queueCoord(x, y, z);
    }
  }

  public scheduleCoord(x: number, y: number, z: number) {
    if (y >= 0 && y < CHUNK_H) {
      this.activeQueue.add(`${x},${y},${z}`);
    }
  }

  public scheduleNeighbors(x: number, y: number, z: number) {
    this.scheduleCoord(x, y, z);
    this.scheduleCoord(x, y - 1, z);
    this.scheduleCoord(x, y + 1, z);
    for (const [dx, dz] of HORIZ_DIRS) {
      this.scheduleCoord(x + dx, y, z + dz);
    }
  }

  private _addNextCoord(x: number, y: number, z: number) {
    if (y >= 0 && y < CHUNK_H) {
      this.nextQueue.add(`${x},${y},${z}`);
    }
  }

  private _scheduleNextNeighbors(x: number, y: number, z: number) {
    this._addNextCoord(x, y, z);
    this._addNextCoord(x, y - 1, z);
    this._addNextCoord(x, y + 1, z);
    for (const [dx, dz] of HORIZ_DIRS) {
      this._addNextCoord(x + dx, y, z + dz);
    }
  }

  /**
   * Scan exposed surface waterfalls near the player when chunks finish generating.
   */
  public onChunkLoaded(chunk: Chunk) {
    const dx = chunk.cx - this.world.currentChunkCX;
    const dz = chunk.cz - this.world.currentChunkCZ;
    if (dx * dx + dz * dz > 25) return;

    const baseX = chunk.cx * CHUNK_W;
    const baseZ = chunk.cz * CHUNK_D;
    const minY = Math.max(1, SEA_LEVEL - 4);
    const maxY = Math.min(CHUNK_H - 1, chunk.maxY || CHUNK_H - 1);
    if (maxY < minY) return;

    for (let y = minY; y <= maxY; y++) {
      const yOffset = y * (CHUNK_W * CHUNK_D);
      const belowYOffset = (y - 1) * (CHUNK_W * CHUNK_D);
      for (let z = 0; z < CHUNK_D; z++) {
        const zOffset = z * CHUNK_W;
        for (let x = 0; x < CHUNK_W; x++) {
          const b = chunk.voxels[x + zOffset + yOffset];
          if (isWaterBlock(b)) {
            const below = chunk.voxels[x + zOffset + belowYOffset];
            if (below === BlockType.AIR) {
              this.scheduleNeighbors(baseX + x, y, baseZ + z);
            }
          }
        }
      }
    }
  }

  public onChunkUnloaded(cx: number, cz: number) {
    const minX = cx * CHUNK_W;
    const maxX = minX + CHUNK_W;
    const minZ = cz * CHUNK_D;
    const maxZ = minZ + CHUNK_D;

    for (const key of this.activeQueue) {
      const parts = key.split(',');
      const x = parseInt(parts[0], 10);
      const z = parseInt(parts[2], 10);
      if (x >= minX && x < maxX && z >= minZ && z < maxZ) {
        this.activeQueue.delete(key);
      }
    }
    for (const key of this.nextQueue) {
      const parts = key.split(',');
      const x = parseInt(parts[0], 10);
      const z = parseInt(parts[2], 10);
      if (x >= minX && x < maxX && z >= minZ && z < maxZ) {
        this.nextQueue.delete(key);
      }
    }
  }

  /**
   * Called every frame in the main animation loop.
   */
  public update(delta: number) {
    if (this.activeQueue.size === 0 && this.nextQueue.size === 0) {
      this.timer = 0;
      return;
    }

    this.timer += delta;
    let ticks = 0;
    while (this.timer >= FluidSimulation.TICK_INTERVAL && ticks < 2) {
      this.timer -= FluidSimulation.TICK_INTERVAL;
      ticks++;
      this.tick();
      if (this.activeQueue.size === 0 && this.nextQueue.size === 0) {
        this.timer = 0;
        break;
      }
    }
  }

  /**
   * Executes one wave of fluid simulation.
   */
  public tick(): FluidUpdateResult {
    if (this.activeQueue.size === 0 && this.nextQueue.size > 0) {
      for (const k of this.nextQueue) {
        this.activeQueue.add(k);
      }
      this.nextQueue.clear();
    }

    const affectedChunks: Set<string> = new Set();
    const brokenPlants: [number, number, number, BlockType][] = [];

    if (this.activeQueue.size === 0) {
      return { affectedChunks, brokenPlants };
    }

    const currentCoords = Array.from(this.activeQueue);
    this.activeQueue.clear();

    const setBlockInternal = (x: number, y: number, z: number, type: BlockType): boolean => {
      if (y < 0 || y >= CHUNK_H) return false;
      const current = this.world.getBlock(x, y, z);
      if (current === type) return false;

      // Never overwrite an existing waterlogged plant with flowing water!
      if (isWaterloggedPlant(current, y)) return false;

      if (isPlantBlock(current) && isWaterBlock(type)) {
        brokenPlants.push([x, y, z, current]);
      }

      const cx = Math.floor(x / CHUNK_W);
      const cz = Math.floor(z / CHUNK_D);
      const chunkKey = this.world.getChunkKey(cx, cz);
      const chunk = this.world.chunks.get(chunkKey);
      if (!chunk) return false;

      const lx = ((x % CHUNK_W) + CHUNK_W) % CHUNK_W;
      const lz = ((z % CHUNK_D) + CHUNK_D) % CHUNK_D;

      chunk.setBlock(lx, y, lz, type);
      this.world.modifiedBlocks.set(this.world.getBlockCoordKey(x, y, z), type);
      affectedChunks.add(chunkKey);

      if (lx === 0) affectedChunks.add(this.world.getChunkKey(cx - 1, cz));
      if (lx === CHUNK_W - 1) affectedChunks.add(this.world.getChunkKey(cx + 1, cz));
      if (lz === 0) affectedChunks.add(this.world.getChunkKey(cx, cz - 1));
      if (lz === CHUNK_D - 1) affectedChunks.add(this.world.getChunkKey(cx, cz + 1));

      // Schedule neighbors of changed block for the next wave
      this._scheduleNextNeighbors(x, y, z);

      if (this.world.tileMoistureSystem) {
        this.world.tileMoistureSystem.onWaterChanged(x, y, z);
      }

      return true;
    };

    let processedCount = 0;
    const playerX = this.world.playerPosX;
    const playerZ = this.world.playerPosZ;
    const maxActiveDistSq = 96 * 96;

    for (const key of currentCoords) {
      if (processedCount >= FluidSimulation.MAX_UPDATES_PER_TICK) {
        this.nextQueue.add(key);
        continue;
      }

      const parts = key.split(',');
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      const z = parseInt(parts[2], 10);

      if (y < 0 || y >= CHUNK_H) continue;
      const pdx = x - playerX;
      const pdz = z - playerZ;
      if (pdx * pdx + pdz * pdz > maxActiveDistSq) continue;

      processedCount++;

      const current = this.world.getBlock(x, y, z);
      const above = this.world.getBlock(x, y + 1, z);
      const below = this.world.getBlock(x, y - 1, z);

      // ── 0. Lilypad Support Check: break and drop if support below is no longer water or ice ──
      if (current === BlockType.LILYPAD) {
        if (!isWaterOrWaterlogged(below, y - 1) && below !== BlockType.PACKED_ICE) {
          setBlockInternal(x, y, z, BlockType.AIR);
          continue;
        }
      }

      // ── 1. Lava + Water Interactions ──
      if (isWaterOrWaterlogged(current, y)) {
        for (const [dx, dz] of HORIZ_DIRS) {
          const nx = x + dx;
          const nz = z + dz;
          const adj = this.world.getBlock(nx, y, nz);
          if (adj === BlockType.LAVA) {
            setBlockInternal(nx, y, nz, BlockType.OBSIDIAN);
          }
        }
        if (below === BlockType.LAVA) {
          setBlockInternal(x, y - 1, z, BlockType.COBBLESTONE);
        }
      }

      // ── 2. Determine target water state for this voxel ──
      if (!isWaterSourceMedium(current, y)) {
        let targetState: BlockType | null = null;

        // A. Fed directly from water or waterlogged plant above:
        if (isWaterOrWaterlogged(above, y + 1)) {
          targetState = BlockType.WATER_FALLING;
        } else {
          // B. Infinite water spring creation:
          const isRestingOnFloor =
            (!isPassableByWater(below) || isWaterOrWaterlogged(below, y - 1)) &&
            !isWaterFalling(below);

          let sourceCount = 0;
          if (isRestingOnFloor) {
            for (const [dx, dz] of HORIZ_DIRS) {
              if (isWaterSourceMedium(this.world.getBlock(x + dx, y, z + dz), y)) {
                sourceCount++;
              }
            }
          }

          if (sourceCount >= 2) {
            targetState = BlockType.WATER;
          } else {
            // C. Horizontal inflow from adjacent water or waterlogged plants:
            let maxIncoming = 0;
            for (const [dx, dz] of HORIZ_DIRS) {
              const nx = x + dx;
              const nz = z + dz;
              const nb = this.world.getBlock(nx, y, nz);
              if (isWaterOrWaterlogged(nb, y)) {
                const nbBelow = this.world.getBlock(nx, y - 1, nz);
                const nbIsResting =
                  (!isPassableByWater(nbBelow) || isWaterOrWaterlogged(nbBelow, y - 1)) &&
                  !isWaterFalling(nbBelow);

                if (nbIsResting) {
                  const lvl = getFluidLevel(nb, y);
                  if (lvl > 1) {
                    const incomingLvl = lvl === 8 ? 7 : lvl - 1;
                    if (incomingLvl > maxIncoming) {
                      maxIncoming = incomingLvl;
                    }
                  }
                }
              }
            }

            if (maxIncoming >= 1) {
              targetState = getWaterBlockForLevel(maxIncoming, false);
            } else {
              if (isWaterBlock(current)) {
                targetState = BlockType.AIR;
              }
            }
          }
        }

        // If state changed, update and notify neighbors for next wave
        if (targetState !== null && targetState !== current) {
          if (isPassableByWater(current) || isWaterBlock(current)) {
            setBlockInternal(x, y, z, targetState);
            if (targetState === BlockType.AIR) {
              continue;
            }
          }
        }
      }

      // ── 3. Active Water Spread (downward & horizontal) ──
      const active = this.world.getBlock(x, y, z);
      if (isWaterOrWaterlogged(active, y)) {
        const activeBelow = this.world.getBlock(x, y - 1, z);
        const activeLevel = getFluidLevel(active, y);

        // Downward flow:
        if (isPassableByWater(activeBelow)) {
          setBlockInternal(x, y - 1, z, BlockType.WATER_FALLING);
          continue; // Vertical flow dominates while falling through air
        }

        // If below is actively falling water, gravity continues downward (no horizontal spread in mid-air)
        if (isWaterFalling(activeBelow)) {
          continue;
        }

        // Horizontal flow (resting on solid, resting water, or waterlogged plant):
        if (activeLevel > 1) {
          const spreadLevel = activeLevel === 8 ? 7 : activeLevel - 1;
          const targetFlowBlock = getWaterBlockForLevel(spreadLevel, false);

          for (const [dx, dz] of HORIZ_DIRS) {
            const nx = x + dx;
            const nz = z + dz;
            const targetCurrent = this.world.getBlock(nx, y, nz);

            if (isPassableByWater(targetCurrent)) {
              setBlockInternal(nx, y, nz, targetFlowBlock);
            } else if (
              isWaterBlock(targetCurrent) &&
              !isWaterSource(targetCurrent) &&
              !isWaterFalling(targetCurrent)
            ) {
              if (getWaterLevel(targetCurrent) < spreadLevel) {
                setBlockInternal(nx, y, nz, targetFlowBlock);
              }
            }
          }
        }
      }
    }

    // Rebuild meshes for affected chunks asynchronously via the MeshWorkerPool
    // so fluid propagation never stalls the main animation frame.
    for (const chunkKey of affectedChunks) {
      const c = this.world.chunks.get(chunkKey);
      if (c) {
        this.world.enqueueMesh(c);
      }
    }

    // Handle plant washing item drops
    if (brokenPlants.length > 0 && this.world.worldUpdateManager?.onPlantWashedAway) {
      for (const [px, py, pz, plantBlock] of brokenPlants) {
        this.world.worldUpdateManager.onPlantWashedAway(px, py, pz, plantBlock);
      }
    }

    // Carry over nextQueue into activeQueue for the next tick wave
    for (const k of this.nextQueue) {
      this.activeQueue.add(k);
    }
    this.nextQueue.clear();

    return { affectedChunks, brokenPlants };
  }
}

/**
 * Backward compatibility wrapper
 */
export function propagateFluid(
  world: VoxelWorld,
  coords: [number, number, number][]
): FluidUpdateResult {
  if (world.fluidSimulation) {
    world.fluidSimulation.queueCoords(coords);
  }
  return { affectedChunks: new Set(), brokenPlants: [] };
}

/**
 * Calculates the 3D flow velocity direction vector of water at a given world position.
 * Returns a normalized Vector3 representing horizontal/vertical direction.
 * Returns Vector3(0, 0, 0) if the block is stationary water, not in water, or solid.
 */
export function getWaterFlowVector(
  world: VoxelWorld,
  worldX: number,
  worldY: number,
  worldZ: number
): THREE.Vector3 {
  const result = new THREE.Vector3(0, 0, 0);

  const bx = Math.floor(worldX);
  const by = Math.floor(worldY);
  const bz = Math.floor(worldZ);

  if (by < 0 || by >= CHUNK_H) return result;

  const currentBlock = world.getBlock(bx, by, bz);

  // If current position isn't water, check if the block directly below is water (e.g. feet touching surface)
  let waterBlock = currentBlock;
  let sampleY = by;
  if (!isWaterBlock(waterBlock) && !isWaterOrWaterlogged(waterBlock, by)) {
    const belowBlock = world.getBlock(bx, by - 1, bz);
    if (isWaterBlock(belowBlock) || isWaterOrWaterlogged(belowBlock, by - 1)) {
      waterBlock = belowBlock;
      sampleY = by - 1;
    } else {
      return result;
    }
  }

  const currentLevel = getFluidLevel(waterBlock, sampleY);

  // 1. Vertical flow (falling water column or open drop-off below)
  const blockAbove = world.getBlock(bx, sampleY + 1, bz);
  const blockBelow = world.getBlock(bx, sampleY - 1, bz);
  const isFalling =
    isWaterFalling(waterBlock) ||
    isWaterFalling(blockAbove) ||
    (isWaterBlock(blockAbove) && isPassableByWater(blockBelow));

  if (isFalling || (isWaterBlock(waterBlock) && isPassableByWater(blockBelow))) {
    result.y = -1;
  }

  // 2. Horizontal flow
  let flowX = 0;
  let flowZ = 0;

  for (const [dx, dz] of HORIZ_DIRS) {
    const nx = bx + dx;
    const nz = bz + dz;
    const nb = world.getBlock(nx, sampleY, nz);
    const nbAbove = world.getBlock(nx, sampleY + 1, nz);
    const nbBelow = world.getBlock(nx, sampleY - 1, nz);

    if (isPassableByWater(nb)) {
      // Passable air or plant: water flows outward towards it
      let dropBonus = 0;
      if (isPassableByWater(nbBelow)) {
        // Drop-off edge / waterfall creates stronger attraction
        dropBonus = 4;
      }
      flowX += dx * (currentLevel + dropBonus);
      flowZ += dz * (currentLevel + dropBonus);
    } else if (isWaterBlock(nb) || isWaterOrWaterlogged(nb, sampleY)) {
      let nbLevel = getFluidLevel(nb, sampleY);
      if (isWaterFalling(nbAbove) || isWaterBlock(nbAbove)) {
        nbLevel = 8;
      }
      const diff = currentLevel - nbLevel;
      flowX += dx * diff;
      flowZ += dz * diff;
    }
  }

  const horizLen = Math.sqrt(flowX * flowX + flowZ * flowZ);
  if (horizLen > 0.001) {
    result.x = flowX / horizLen;
    result.z = flowZ / horizLen;
  }

  return result;
}
