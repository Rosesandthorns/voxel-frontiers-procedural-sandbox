/**
 * WorldUpdateWorker (The Third String of Processing)
 *
 * Dedicated background worker thread completely independent of:
 * 1) String 1: Chunk generation (ChunkWorkerPool)
 * 2) String 2: Geometry meshing (MeshWorkerPool)
 *
 * Runs real-time world simulation, fluid propagation, and authentic
 * Minecraft water flow mechanics:
 * - Gravity fall & vertical streams
 * - Horizontal propagation up to 7 blocks
 * - Drop-off / cliff pathfinding (flows preferentially towards drops)
 * - Infinite water spring creation (2+ adjacent source blocks over solid/water)
 * - Decay & retraction when source blocks are blocked or removed
 * - Lava reactions (creates Obsidian on lava source, Cobblestone on flowing)
 * - Displacing / washing away non-solid plants & props
 */

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
import { CHUNK_D, CHUNK_H, CHUNK_W } from './ChunkConstants';
import {
  isWaterloggedPlant,
  isWaterOrWaterlogged,
  isWaterSourceMedium,
  getFluidLevel
} from './WaterFlora';

// Cardinal directions (dx, dz)
const HORIZ_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

// In-memory chunk cache on the worker thread
const chunks: Map<string, Uint8Array> = new Map();

// Active liquid update queue (coordinates requiring simulation tick)
const activeQueue: Set<string> = new Set();
const nextQueue: Set<string> = new Set();

// Max blocks processed per tick to maintain 60+ FPS responsiveness
const MAX_UPDATES_PER_TICK = 128;
const TICK_INTERVAL_MS = 150; // Balanced liquid tick interval for high performance

let tickTimer: any = null;

function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

function getCoordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function parseCoordKey(key: string): [number, number, number] {
  const parts = key.split(',');
  return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
}

function getBlock(x: number, y: number, z: number): BlockType {
  if (y < 0 || y >= CHUNK_H) return BlockType.AIR;
  const cx = Math.floor(x / CHUNK_W);
  const cz = Math.floor(z / CHUNK_D);
  const chunk = chunks.get(getChunkKey(cx, cz));
  if (!chunk) return BlockType.AIR;

  const lx = ((x % CHUNK_W) + CHUNK_W) % CHUNK_W;
  const lz = ((z % CHUNK_D) + CHUNK_D) % CHUNK_D;
  return chunk[lx + lz * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
}

function setBlockLocal(x: number, y: number, z: number, type: BlockType): boolean {
  if (y < 0 || y >= CHUNK_H) return false;
  const cx = Math.floor(x / CHUNK_W);
  const cz = Math.floor(z / CHUNK_D);
  const chunk = chunks.get(getChunkKey(cx, cz));
  if (!chunk) return false;

  const lx = ((x % CHUNK_W) + CHUNK_W) % CHUNK_W;
  const lz = ((z % CHUNK_D) + CHUNK_D) % CHUNK_D;
  const idx = lx + lz * CHUNK_W + y * (CHUNK_W * CHUNK_D);
  if (chunk[idx] === type) return false;

  // Never overwrite an existing waterlogged plant with flowing water
  if (isWaterloggedPlant(chunk[idx], y)) return false;

  chunk[idx] = type;
  return true;
}

function scheduleUpdate(x: number, y: number, z: number) {
  if (y >= 0 && y < CHUNK_H) {
    activeQueue.add(getCoordKey(x, y, z));
  }
}

function scheduleNeighbors(x: number, y: number, z: number) {
  scheduleUpdate(x, y, z);
  scheduleUpdate(x, y - 1, z);
  scheduleUpdate(x, y + 1, z);
  scheduleUpdate(x + 1, y, z);
  scheduleUpdate(x - 1, y, z);
  scheduleUpdate(x, y, z + 1);
  scheduleUpdate(x, y, z - 1);
}

/**
 * Minecraft Slope Pathfinding:
 * Determines if there is a drop-off hole within 4 blocks.
 * If drop-offs exist, water only spreads in the direction(s) of the shortest drop.
 */
function findFlowDirections(sx: number, sy: number, sz: number): [number, number][] {
  // BFS search within Manhattan distance of 4
  const openDirections: [number, number][] = [];
  const validNeighbors: [number, number][] = [];

  for (const [dx, dz] of HORIZ_DIRS) {
    const nx = sx + dx;
    const nz = sz + dz;
    const block = getBlock(nx, sy, nz);
    if (isPassableByWater(block) || (isWaterBlock(block) && !isWaterSource(block))) {
      validNeighbors.push([dx, dz]);
    }
  }

  if (validNeighbors.length === 0) return [];

  // For each valid neighbor, find shortest distance to an edge drop-off (sy - 1 is passable)
  let minDropDistance = 999;
  const dirDistances: Map<string, number> = new Map();

  for (const [initDx, initDz] of validNeighbors) {
    const nx = sx + initDx;
    const nz = sz + initDz;
    const cx = Math.floor(nx / CHUNK_W);
    const cz = Math.floor(nz / CHUNK_D);
    if (!chunks.has(getChunkKey(cx, cz))) continue;

    // Direct drop right next to water
    const below = getBlock(nx, sy - 1, nz);
    if (isPassableByWater(below)) {
      dirDistances.set(`${initDx},${initDz}`, 1);
      if (1 < minDropDistance) minDropDistance = 1;
      continue;
    }

    // BFS up to 4 blocks from this initial step
    const queue: [number, number, number][] = [[nx, nz, 1]];
    const visited: Set<string> = new Set([getCoordKey(nx, sy, nz), getCoordKey(sx, sy, sz)]);
    let foundDrop = false;

    while (queue.length > 0) {
      const [currX, currZ, dist] = queue.shift()!;
      if (dist >= 4) continue;

      for (const [dx, dz] of HORIZ_DIRS) {
        const testX = currX + dx;
        const testZ = currZ + dz;
        const testCX = Math.floor(testX / CHUNK_W);
        const testCZ = Math.floor(testZ / CHUNK_D);
        if (!chunks.has(getChunkKey(testCX, testCZ))) continue;

        const key = getCoordKey(testX, sy, testZ);
        if (visited.has(key)) continue;
        visited.add(key);

        const b = getBlock(testX, sy, testZ);
        if (isPassableByWater(b) || (isWaterBlock(b) && !isWaterSource(b))) {
          const bBelow = getBlock(testX, sy - 1, testZ);
          if (isPassableByWater(bBelow)) {
            const totalDist = dist + 1;
            dirDistances.set(`${initDx},${initDz}`, totalDist);
            if (totalDist < minDropDistance) minDropDistance = totalDist;
            foundDrop = true;
            break;
          }
          queue.push([testX, testZ, dist + 1]);
        }
      }
      if (foundDrop) break;
    }
  }

  // If drop found within range, only flow towards the shortest drop path(s)
  if (minDropDistance <= 4) {
    for (const [dx, dz] of validNeighbors) {
      const dist = dirDistances.get(`${dx},${dz}`);
      if (dist === minDropDistance) {
        openDirections.push([dx, dz]);
      }
    }
    if (openDirections.length > 0) return openDirections;
  }

  // If no drop within range, water spreads equally in all passable horizontal directions
  return validNeighbors;
}

/**
 * Execute one world update & water simulation tick on String 3
 */
function tickSimulation() {
  if (activeQueue.size === 0) return;

  const currentCoords = Array.from(activeQueue);
  activeQueue.clear();

  const diffs: number[] = []; // [x, y, z, blockType, ...]
  const brokenPlants: [number, number, number, BlockType][] = [];

  let processedCount = 0;

  for (const key of currentCoords) {
    if (processedCount >= MAX_UPDATES_PER_TICK) {
      // Re-queue remaining for next tick to avoid frame drops
      nextQueue.add(key);
      continue;
    }
    processedCount++;

    const [x, y, z] = parseCoordKey(key);
    const currentBlock = getBlock(x, y, z);
    const belowBlock = getBlock(x, y - 1, z);
    const aboveBlock = getBlock(x, y + 1, z);

    // ── 1. Lava + Water Reactions ──
    if (isWaterOrWaterlogged(currentBlock, y)) {
      for (const [dx, dz] of HORIZ_DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        const adj = getBlock(nx, y, nz);
        if (adj === BlockType.LAVA) {
          // Water touches lava source -> creates Obsidian!
          setBlockLocal(nx, y, nz, BlockType.OBSIDIAN);
          diffs.push(nx, y, nz, BlockType.OBSIDIAN);
          scheduleNeighbors(nx, y, nz);
        }
      }

      // Check below for lava
      if (belowBlock === BlockType.LAVA) {
        setBlockLocal(x, y - 1, z, BlockType.COBBLESTONE);
        diffs.push(x, y - 1, z, BlockType.COBBLESTONE);
        scheduleNeighbors(x, y - 1, z);
      }
    }

    // ── 2. Determine target water state for this voxel ──
    if (!isWaterSourceMedium(currentBlock, y)) {
      let targetState: BlockType | null = null;

      // A. Fed directly from water or waterlogged plant above:
      if (isWaterOrWaterlogged(aboveBlock, y + 1)) {
        targetState = BlockType.WATER_FALLING;
      } else {
        // B. Infinite water spring creation:
        const isRestingOnFloor =
          (!isPassableByWater(belowBlock) || isWaterOrWaterlogged(belowBlock, y - 1)) &&
          !isWaterFalling(belowBlock);
        let sourceCount = 0;
        if (isRestingOnFloor) {
          for (const [dx, dz] of HORIZ_DIRS) {
            if (isWaterSourceMedium(getBlock(x + dx, y, z + dz), y)) {
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
            const nb = getBlock(nx, y, nz);
            if (isWaterOrWaterlogged(nb, y)) {
              const nbBelow = getBlock(nx, y - 1, nz);
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
            if (isWaterBlock(currentBlock)) {
              targetState = BlockType.AIR;
            }
          }
        }
      }

      if (targetState !== null && targetState !== currentBlock) {
        if (isPassableByWater(currentBlock) || isWaterBlock(currentBlock)) {
          if (isPlantBlock(currentBlock) && isWaterBlock(targetState)) {
            brokenPlants.push([x, y, z, currentBlock]);
          }
          setBlockLocal(x, y, z, targetState);
          diffs.push(x, y, z, targetState);
          scheduleNeighbors(x, y, z);
          if (targetState === BlockType.AIR) {
            continue;
          }
        }
      }
    }

    // ── 3. Active Water Spread (downward & horizontal) ──
    const active = getBlock(x, y, z);
    if (isWaterOrWaterlogged(active, y)) {
      const activeBelow = getBlock(x, y - 1, z);
      const activeLevel = getFluidLevel(active, y);

      // Downward flow:
      if (isPassableByWater(activeBelow)) {
        if (isPlantBlock(activeBelow)) {
          brokenPlants.push([x, y - 1, z, activeBelow]);
        }
        setBlockLocal(x, y - 1, z, BlockType.WATER_FALLING);
        diffs.push(x, y - 1, z, BlockType.WATER_FALLING);
        scheduleNeighbors(x, y - 1, z);
        continue;
      }

      // If below is actively falling water, gravity continues downward
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
          const targetCurrent = getBlock(nx, y, nz);

          if (isPassableByWater(targetCurrent)) {
            if (isPlantBlock(targetCurrent)) {
              brokenPlants.push([nx, y, nz, targetCurrent]);
            }
            setBlockLocal(nx, y, nz, targetFlowBlock);
            diffs.push(nx, y, nz, targetFlowBlock);
            scheduleNeighbors(nx, y, nz);
          } else if (
            isWaterBlock(targetCurrent) &&
            !isWaterSource(targetCurrent) &&
            !isWaterFalling(targetCurrent)
          ) {
            if (getWaterLevel(targetCurrent) < spreadLevel) {
              setBlockLocal(nx, y, nz, targetFlowBlock);
              diffs.push(nx, y, nz, targetFlowBlock);
              scheduleNeighbors(nx, y, nz);
            }
          }
        }
      }
    }
  }

  // Carry over any queued overflow items to next tick
  for (const k of nextQueue) {
    activeQueue.add(k);
  }
  nextQueue.clear();

  // Send batch diffs to main thread
  if (diffs.length > 0 || brokenPlants.length > 0) {
    const diffArray = new Int32Array(diffs);
    const msg = {
      type: 'worldUpdates',
      diffs: diffArray,
      brokenPlants
    };
    try {
      (self as any).postMessage(msg, [diffArray.buffer]);
    } catch {
      (self as any).postMessage(msg);
    }
  }
}

// ── Message Protocol for String 3 ──────────────────────────────────────────

self.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'start': {
      // Fluid simulation is driven authoritatively by FluidSimulation on the main loop
      break;
    }

    case 'stop': {
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      break;
    }

    case 'loadChunk': {
      // Store chunk voxels in worker cache
      const key = getChunkKey(msg.cx, msg.cz);
      chunks.set(key, new Uint8Array(msg.voxels));
      break;
    }

    case 'unloadChunk': {
      chunks.delete(getChunkKey(msg.cx, msg.cz));
      break;
    }

    case 'setBlock': {
      const { x, y, z, block } = msg;
      setBlockLocal(x, y, z, block);
      break;
    }

    case 'queueCoords': {
      break;
    }
  }
});

