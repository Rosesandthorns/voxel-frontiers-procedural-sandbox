import { BlockType } from '../../types';
import { BLOCK_DEFS, getWaterLevel, isWaterBlock } from './Blocks';
import { CHUNK_D, CHUNK_H, CHUNK_W } from './ChunkConstants';
import type { Chunk, SurfaceMoistureTile } from './Chunk';
import type { VoxelWorld } from './VoxelWorld';

/**
 * Checks whether a block type reacts to moisture and has saturation levels (0 to 13).
 */
export function isMoistureSensitiveBlock(type: BlockType): boolean {
  return (
    type === BlockType.FARMLAND ||
    type === BlockType.SAND ||
    type === BlockType.SAND_FARMLAND
  );
}

/**
 * Returns the moisture potential of a water block:
 * - Water source (source block or falling water): potential = 13
 *   Distance 1 from source: 13 - 1 = 12 (right next to a water source)
 * - Flowing water levels 7 down to 1:
 *   Level 1 is the end of flowing water: potential = 5
 *   Distance 4 from end: 5 - 4 = 1 (1 is 4 blocks away from end of flowing water)
 *   Distance 1 from end: 5 - 1 = 4
 *   Levels 2..7: potential = 4 + level
 */
export function getWaterPotential(type: BlockType): number {
  const level = getWaterLevel(type);
  if (level === 8) {
    return 13;
  }
  if (level >= 1 && level <= 7) {
    return 4 + level;
  }
  return 0;
}

/**
 * Returns color multipliers [r, g, b] to modulate vertex color (_col),
 * producing distinct, smooth saturation and value differences for each water value (0 to 13).
 */
export function getMoistureColorMultiplier(
  block: BlockType,
  waterValue: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(13, Math.round(waterValue)));
  const t = clamped / 13; // 0.0 to 1.0 across 14 distinct states

  if (block === BlockType.FARMLAND) {
    // Tilled Soil (Farmland)
    // Level 0: Pale, dusty desaturated loam
    // Level 1-12: Progressively richer, deeper, more saturated dark soil
    // Level 13: Maximum rich saturation
    const rMult = 1.04 - 0.28 * t;
    const gMult = 1.02 - 0.30 * t;
    const bMult = 1.10 - 0.58 * t;
    return [rMult, gMult, bMult];
  }

  if (block === BlockType.SAND) {
    // Desert Sand
    // Level 0: Pale, sun-bleached dry sand
    // Level 1-12: Progressively warmer, richer amber/golden wet sand
    // Level 13: Deep saturated wet sand
    const rMult = 1.02 - 0.16 * t;
    const gMult = 1.01 - 0.19 * t;
    const bMult = 1.06 - 0.44 * t;
    return [rMult, gMult, bMult];
  }

  if (block === BlockType.SAND_FARMLAND) {
    // Tilled Sand (Sand Farmland)
    const rMult = 1.03 - 0.19 * t;
    const gMult = 1.01 - 0.22 * t;
    const bMult = 1.07 - 0.48 * t;
    return [rMult, gMult, bMult];
  }

  return [1.0, 1.0, 1.0];
}

/**
 * Checks if a tile is protected from rain by any solid or opaque overhead block.
 */
export function isProtectedFromRain(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number
): boolean {
  for (let y = wy + 1; y < CHUNK_H; y++) {
    const block = world.getBlock(wx, y, wz);
    if (block !== BlockType.AIR) {
      const def = BLOCK_DEFS[block];
      if (def?.solid || (def && !def.transparent)) {
        return true;
      }
    }
  }
  return false;
}

interface PendingTransition {
  wx: number;
  wy: number;
  wz: number;
  targetVal: number;
  timer: number;
}

/**
 * TileMoistureSystem manages moisture and saturation transitions.
 * Follows Minecraft's optimization model:
 * 1. Water-source driven: Chunks maintain compact lists of surface water sources.
 * 2. Instant zero-cost skips: Chunks with no water in or adjacent to them skip all proximity calculations.
 * 3. Coalesced delayed transitions: Tiles take 2 to 4 seconds to transform without spamming chunk remeshing.
 * 4. Purely event-driven: Recomputes ONLY when water changes, weather changes, or player interacts.
 */
export class TileMoistureSystem {
  public world: VoxelWorld;
  private pendingTransitions: Map<string, PendingTransition> = new Map();
  private lastRainState: boolean = false;

  constructor(world: VoxelWorld) {
    this.world = world;
  }

  private _tileKey(wx: number, wy: number, wz: number): string {
    return `${wx},${wy},${wz}`;
  }

  /**
   * Scans a chunk for surface/near-surface water blocks and caches them in chunk.waterSources.
   * Runs once on chunk load or when water blocks are placed/broken.
   */
  public rebuildChunkWaterSources(chunk: Chunk) {
    chunk.waterSources.length = 0;
    chunk.hasWater = false;

    // Check only surface/near-surface layers (y >= 40) where sand and farmland can exist
    const minY = 40;
    const maxY = Math.min(CHUNK_H - 1, chunk.maxY + 1);

    for (let lz = 0; lz < CHUNK_D; lz++) {
      for (let lx = 0; lx < CHUNK_W; lx++) {
        for (let ly = maxY; ly >= minY; ly--) {
          const block = chunk.getBlock(lx, ly, lz);
          if (isWaterBlock(block)) {
            const pot = getWaterPotential(block);
            if (pot > 0) {
              chunk.waterSources.push(lx, ly, lz, pot);
              chunk.hasWater = true;
            }
          }
        }
      }
    }
  }

  /**
   * Fast Minecraft-style check: Does this chunk or any of its 8 neighbor chunks have water?
   * If false, any sand/farmland in this chunk is guaranteed to have water distance > 16.
   * Returns immediately with 0 block queries.
   */
  public hasWaterInChunkOrNeighbors(cx: number, cz: number): boolean {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const nb = this.world.chunks.get(this.world.getChunkKey(cx + dx, cz + dz));
        if (nb && nb.hasWater) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculates proximity water value (0 to 12) using only cached waterSources from the 3x3 chunks.
   * Completely avoids getBlock, string creation, or Map lookups in inner loops.
   */
  public calculateBaseWaterValue(
    wx: number,
    wy: number,
    wz: number
  ): number {
    const cx = wx >> 4;
    const cz = wz >> 4;

    // Direct submerged check
    const blockAbove = this.world.getBlock(wx, wy + 1, wz);
    if (isWaterBlock(blockAbove)) {
      const pot = getWaterPotential(blockAbove);
      if (pot > 0) return Math.min(12, pot - 1);
    }

    let bestVal = 0;

    // Check water sources only from the current chunk and direct neighbors
    for (let dcx = -1; dcx <= 1; dcx++) {
      for (let dcz = -1; dcz <= 1; dcz++) {
        const nbChunk = this.world.chunks.get(this.world.getChunkKey(cx + dcx, cz + dcz));
        if (!nbChunk || !nbChunk.hasWater || nbChunk.waterSources.length === 0) continue;

        const ws = nbChunk.waterSources;
        const chunkBaseWX = nbChunk.cx * CHUNK_W;
        const chunkBaseWZ = nbChunk.cz * CHUNK_D;

        for (let i = 0; i < ws.length; i += 4) {
          const wWX = chunkBaseWX + ws[i];
          const wWY = ws[i + 1];
          const wWZ = chunkBaseWZ + ws[i + 2];
          const pot = ws[i + 3];

          const dx = Math.abs(wWX - wx);
          if (dx > 12) continue;
          const dz = Math.abs(wWZ - wz);
          if (dz > 12) continue;
          const dy = Math.abs(wWY - wy);
          if (dy > 2) continue;

          const dist = Math.max(dx, dz);
          const val = pot - dist;
          if (val > bestVal) {
            bestVal = val;
            if (bestVal >= 12) return 12; // 12 is max possible proximity to water
          }
        }
      }
    }

    return Math.max(0, bestVal);
  }

  /**
   * Initializes moisture for a newly generated or loaded chunk.
   * 1. Rebuilds surface water cache for this chunk.
   * 2. If no water nearby, all surface tiles instantly get 0.
   */
  public initChunkMoisture(chunk: Chunk) {
    this.rebuildChunkWaterSources(chunk);

    const isRaining = this.world.seasonWeatherSystem
      ? this.world.seasonWeatherSystem.isRaining()
      : false;

    const baseWX = chunk.cx * CHUNK_W;
    const baseWZ = chunk.cz * CHUNK_D;

    chunk.surfaceMoistureTiles.clear();

    const waterNearby = this.hasWaterInChunkOrNeighbors(chunk.cx, chunk.cz);

    // Scan only top surface block of each column
    for (let lz = 0; lz < CHUNK_D; lz++) {
      for (let lx = 0; lx < CHUNK_W; lx++) {
        const colKey = lx + (lz << 4);

        for (let ly = Math.min(CHUNK_H - 1, chunk.maxY + 1); ly >= 1; ly--) {
          const block = chunk.getBlock(lx, ly, lz);
          if (block === BlockType.AIR) continue;

          // Found topmost solid block
          if (isMoistureSensitiveBlock(block)) {
            const wx = baseWX + lx;
            const wy = ly;
            const wz = baseWZ + lz;

            const isExposed = !isProtectedFromRain(this.world, wx, wy, wz);
            const baseVal = waterNearby ? this.calculateBaseWaterValue(wx, wy, wz) : 0;
            chunk.setWaterValue(lx, ly, lz, baseVal);

            const tile: SurfaceMoistureTile = {
              lx, ly, lz,
              wx, wy, wz,
              baseVal,
              isExposed
            };
            chunk.surfaceMoistureTiles.set(colKey, tile);

            const targetVal = isRaining && isExposed ? Math.min(13, baseVal + 5) : baseVal;
            if (targetVal !== baseVal) {
              this.queueTileTransition(wx, wy, wz, targetVal);
            }
          }
          break;
        }
      }
    }

    // If this newly loaded chunk contains water, notify neighbor chunks to update their border tiles
    if (chunk.hasWater) {
      this._notifyNeighborsOfWater(chunk);
    }
  }

  private _notifyNeighborsOfWater(chunk: Chunk) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const nb = this.world.chunks.get(this.world.getChunkKey(chunk.cx + dx, chunk.cz + dz));
        if (nb && nb.surfaceMoistureTiles.size > 0) {
          this._recalculateChunkMoisture(nb);
        }
      }
    }
  }

  private _recalculateChunkMoisture(chunk: Chunk) {
    const isRaining = this.world.seasonWeatherSystem
      ? this.world.seasonWeatherSystem.isRaining()
      : false;

    for (const tile of chunk.surfaceMoistureTiles.values()) {
      const newBase = this.calculateBaseWaterValue(tile.wx, tile.wy, tile.wz);
      if (newBase !== tile.baseVal) {
        tile.baseVal = newBase;
        const isDesert = Boolean(this.world.generator?.isDesertAt(tile.wx, tile.wz));
        const targetVal = isRaining && tile.isExposed && !isDesert ? Math.min(13, tile.baseVal + 5) : tile.baseVal;
        const currentVal = chunk.getWaterValue(tile.lx, tile.ly, tile.lz);
        if (currentVal !== targetVal) {
          this.queueTileTransition(tile.wx, tile.wy, tile.wz, targetVal);
        }
      }
    }
  }

  /**
   * Queues a tile to transition after a realistic Minecraft-style delay (2 to 4s).
   * Coalesces updates so chunks only rebuild mesh once when transitioning.
   */
  public queueTileTransition(
    wx: number,
    wy: number,
    wz: number,
    targetVal: number
  ) {
    const key = this._tileKey(wx, wy, wz);
    const existing = this.pendingTransitions.get(key);

    if (existing) {
      existing.targetVal = targetVal;
      return;
    }

    this.pendingTransitions.set(key, {
      wx,
      wy,
      wz,
      targetVal,
      timer: 2.0 + Math.random() * 2.0 // Stochastic 2.0 - 4.0s delay
    });
  }

  /**
   * Frame tick: advances pending transitions and applies mesh updates once per chunk.
   * Purely idle when nothing is changing.
   */
  public update(delta: number, isRaining: boolean) {
    // 1. Detect weather rain state change
    if (isRaining !== this.lastRainState) {
      this.lastRainState = isRaining;
      this.onWeatherChanged(isRaining);
    }

    if (this.pendingTransitions.size === 0) return;

    const dirtyChunks: Set<string> = new Set();
    const completedKeys: string[] = [];

    for (const [key, pending] of this.pendingTransitions.entries()) {
      pending.timer -= delta;
      if (pending.timer <= 0) {
        completedKeys.push(key);

        const cx = pending.wx >> 4;
        const cz = pending.wz >> 4;
        const chunk = this.world.chunks.get(this.world.getChunkKey(cx, cz));
        if (chunk) {
          chunk.setWaterValue(pending.wx & 15, pending.wy, pending.wz & 15, pending.targetVal);
          dirtyChunks.add(this.world.getChunkKey(cx, cz));
        }
      }
    }

    for (const k of completedKeys) {
      this.pendingTransitions.delete(k);
    }

    // Coalesced remesh: each dirty chunk enqueues AT MOST ONCE
    for (const chunkKey of dirtyChunks) {
      const chunk = this.world.chunks.get(chunkKey);
      if (chunk) {
        this.world.enqueueMesh(chunk);
      }
    }
  }

  /**
   * Called ONLY when weather changes between rain and clear.
   * Uses cached baseVal with ZERO distance searches.
   */
  public onWeatherChanged(isRaining: boolean) {
    for (const chunk of this.world.chunks.values()) {
      if (chunk.surfaceMoistureTiles.size === 0) continue;

      for (const tile of chunk.surfaceMoistureTiles.values()) {
        const isDesert = Boolean(this.world.generator?.isDesertAt(tile.wx, tile.wz));
        const targetVal = isRaining && tile.isExposed && !isDesert
          ? Math.min(13, tile.baseVal + 5)
          : tile.baseVal;

        const currentVal = chunk.getWaterValue(tile.lx, tile.ly, tile.lz);
        if (currentVal !== targetVal) {
          this.queueTileTransition(tile.wx, tile.wy, tile.wz, targetVal);
        }
      }
    }
  }

  /**
   * Called ONLY when a block is placed.
   */
  public onBlockPlaced(wx: number, wy: number, wz: number, block: BlockType) {
    const cx = wx >> 4;
    const cz = wz >> 4;
    const chunk = this.world.chunks.get(this.world.getChunkKey(cx, cz));
    if (!chunk) return;

    // If water was placed, rebuild water cache and notify surrounding tiles
    if (isWaterBlock(block)) {
      this.rebuildChunkWaterSources(chunk);
      this.onWaterChanged(wx, wy, wz);
      return;
    }

    const lx = wx & 15;
    const lz = wz & 15;
    const colKey = lx + (lz << 4);

    const isRaining = this.world.seasonWeatherSystem
      ? this.world.seasonWeatherSystem.isRaining()
      : false;

    // 1. If player tilled soil or placed sand
    if (isMoistureSensitiveBlock(block)) {
      const isExposed = !isProtectedFromRain(this.world, wx, wy, wz);
      const isDesert = Boolean(this.world.generator?.isDesertAt(wx, wz));
      const baseVal = this.calculateBaseWaterValue(wx, wy, wz);
      const targetVal = isRaining && isExposed && !isDesert ? Math.min(13, baseVal + 5) : baseVal;

      const tile: SurfaceMoistureTile = {
        lx, ly: wy, lz,
        wx, wy, wz,
        baseVal,
        isExposed
      };
      chunk.surfaceMoistureTiles.set(colKey, tile);
      chunk.setWaterValue(lx, wy, lz, baseVal);

      if (targetVal !== baseVal) {
        this.queueTileTransition(wx, wy, wz, targetVal);
      }
    }

    // 2. If block placed is overhead, it covers the surface moisture tile below
    const existing = chunk.surfaceMoistureTiles.get(colKey);
    if (existing && wy > existing.wy) {
      const def = BLOCK_DEFS[block];
      if (def?.solid || (def && !def.transparent)) {
        existing.isExposed = false;
        const currentVal = chunk.getWaterValue(lx, existing.ly, lz);
        if (currentVal !== existing.baseVal) {
          this.queueTileTransition(wx, existing.wy, wz, existing.baseVal);
        }
      }
    }
  }

  /**
   * Called ONLY when a block is broken.
   */
  public onBlockBroken(wx: number, wy: number, wz: number, prevBlock: BlockType) {
    const cx = wx >> 4;
    const cz = wz >> 4;
    const chunk = this.world.chunks.get(this.world.getChunkKey(cx, cz));
    if (!chunk) return;

    // If water was scooped or broken, rebuild water cache and notify surrounding tiles
    if (isWaterBlock(prevBlock)) {
      this.rebuildChunkWaterSources(chunk);
      this.onWaterChanged(wx, wy, wz);
      return;
    }

    const lx = wx & 15;
    const lz = wz & 15;
    const colKey = lx + (lz << 4);

    // 1. If broken block was the surface moisture tile itself
    const existing = chunk.surfaceMoistureTiles.get(colKey);
    if (existing && existing.wy === wy) {
      chunk.surfaceMoistureTiles.delete(colKey);
      chunk.setWaterValue(lx, wy, lz, 0);
      this.pendingTransitions.delete(this._tileKey(wx, wy, wz));
      return;
    }

    // 2. If broken block was overhead, re-check exposure for tile below
    if (existing && wy > existing.wy) {
      const isRaining = this.world.seasonWeatherSystem
        ? this.world.seasonWeatherSystem.isRaining()
        : false;

      const nowExposed = !isProtectedFromRain(this.world, wx, existing.wy, wz);
      existing.isExposed = nowExposed;
      const targetVal = isRaining && nowExposed ? Math.min(13, existing.baseVal + 5) : existing.baseVal;
      const currentVal = chunk.getWaterValue(lx, existing.ly, lz);
      if (currentVal !== targetVal) {
        this.queueTileTransition(wx, existing.wy, wz, targetVal);
      }
    }
  }

  /**
   * Called ONLY when water is placed, moves, or is removed.
   * Updates only nearby cached surface moisture tiles within distance 12.
   */
  public onWaterChanged(waterX: number, waterY: number, waterZ: number) {
    const isRaining = this.world.seasonWeatherSystem
      ? this.world.seasonWeatherSystem.isRaining()
      : false;

    const minCX = (waterX - 12) >> 4;
    const maxCX = (waterX + 12) >> 4;
    const minCZ = (waterZ - 12) >> 4;
    const maxCZ = (waterZ + 12) >> 4;

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const chunk = this.world.chunks.get(this.world.getChunkKey(cx, cz));
        if (!chunk || chunk.surfaceMoistureTiles.size === 0) continue;

        for (const tile of chunk.surfaceMoistureTiles.values()) {
          const dx = Math.abs(tile.wx - waterX);
          const dz = Math.abs(tile.wz - waterZ);
          if (Math.max(dx, dz) <= 12 && Math.abs(tile.wy - waterY) <= 2) {
            const newBase = this.calculateBaseWaterValue(tile.wx, tile.wy, tile.wz);
            if (newBase !== tile.baseVal) {
              tile.baseVal = newBase;
              const targetVal = isRaining && tile.isExposed
                ? Math.min(13, tile.baseVal + 5)
                : tile.baseVal;
              const currentVal = chunk.getWaterValue(tile.lx, tile.ly, tile.lz);
              if (currentVal !== targetVal) {
                this.queueTileTransition(tile.wx, tile.wy, tile.wz, targetVal);
              }
            }
          }
        }
      }
    }
  }
}
