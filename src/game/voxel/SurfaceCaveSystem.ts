import { BlockType } from '../../types';
import { CHUNK_D, CHUNK_H, CHUNK_W, SEA_LEVEL } from './ChunkConstants';
import { FastNoise } from './Noise';
import { VerdantSubBiomeDef } from './SubBiomeTypes';

/**
 * Surface Cave Entrance definition.
 * A natural, inclined cavernous passage that cuts from surface terrain
 * down into the deep subterranean cave network.
 */
export interface SurfaceCaveNode {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface SurfaceCaveEntrance {
  id: string;
  cellX: number;
  cellZ: number;
  originX: number;
  originY: number; // surface elevation at mouth
  originZ: number;
  yaw: number; // heading angle in radians
  length: number; // total horizontal length
  endY: number; // bottom depth
  nodes: SurfaceCaveNode[];
  // Axis-aligned bounding box including node radii + padding
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * SurfaceCaveSystem
 * Manages deterministic generation of surface cave entrances across the world.
 *
 * Entrances are spaced so that a player exploring land encounters one roughly
 * every few hundred blocks (~180 to 260 blocks apart).
 */
export class SurfaceCaveSystem {
  public static readonly CELL_SIZE = 220; // Every 220x220 world block area has one cave candidate
  private entranceCache: Map<string, SurfaceCaveEntrance | null> = new Map();
  private noiseEntranceWobble: FastNoise;

  constructor(
    private seed: number,
    private getHeightAt: (wx: number, wz: number, subBiome: VerdantSubBiomeDef) => number,
    private getSubBiomeAt: (wx: number, wz: number) => VerdantSubBiomeDef,
    private getRiverSample?: (wx: number, wz: number) => any
  ) {
    this.noiseEntranceWobble = new FastNoise(seed + 8765);
  }

  /**
   * Deterministic 2D PRNG hash
   */
  private hash2D(x: number, z: number, offset: number): number {
    let h = (this.seed + offset) ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Retrieves or constructs the surface cave entrance for a given grid cell.
   * Returns null if the cell is completely in deep water/ocean.
   */
  public getEntranceForCell(cellX: number, cellZ: number): SurfaceCaveEntrance | null {
    const key = `${cellX},${cellZ}`;
    if (this.entranceCache.has(key)) {
      return this.entranceCache.get(key)!;
    }

    const baseWorldX = cellX * SurfaceCaveSystem.CELL_SIZE;
    const baseWorldZ = cellZ * SurfaceCaveSystem.CELL_SIZE;

    // Deterministic random numbers for this cell
    const r1 = this.hash2D(cellX, cellZ, 101);
    const r2 = this.hash2D(cellX + 17, cellZ + 31, 202);
    const r3 = this.hash2D(cellX + 53, cellZ + 71, 303);
    const r4 = this.hash2D(cellX + 89, cellZ + 97, 404);

    // Test candidate positions within the cell to find land above sea level
    const candidates = [
      { ox: 30 + r1 * 160, oz: 30 + r2 * 160 },
      { ox: 50 + r2 * 120, oz: 40 + r3 * 140 },
      { ox: 40 + r3 * 140, oz: 60 + r1 * 100 }
    ];

    let chosenOrigin: { x: number; y: number; z: number } | null = null;
    let chosenSubBiome: VerdantSubBiomeDef | null = null;

    for (const cand of candidates) {
      const wx = Math.floor(baseWorldX + cand.ox);
      const wz = Math.floor(baseWorldZ + cand.oz);
      const subBiome = this.getSubBiomeAt(wx, wz);

      // Must be on land above sea level (so the mouth is above water)
      if (subBiome.category !== 'ocean' && subBiome.category !== 'trench') {
        const sy = this.getHeightAt(wx, wz, subBiome);
        if (sy >= SEA_LEVEL + 2 && sy <= 145) {
          chosenOrigin = { x: wx, y: sy, z: wz };
          chosenSubBiome = subBiome;
          break;
        }
      }
    }

    if (!chosenOrigin || !chosenSubBiome) {
      this.entranceCache.set(key, null);
      return null;
    }

    // Determine heading angle (yaw).
    // Sample terrain slightly forward: we want the cave mouth to dig into rising ground / hillside if possible.
    let yaw = r1 * Math.PI * 2;
    const testDist = 12;
    const aheadX = chosenOrigin.x + Math.cos(yaw) * testDist;
    const aheadZ = chosenOrigin.z + Math.sin(yaw) * testDist;
    const aheadBiome = this.getSubBiomeAt(aheadX, aheadZ);
    const aheadY = this.getHeightAt(aheadX, aheadZ, aheadBiome);

    // If digging towards a steep drop-off / cliff edge, turn around to dig into the slope
    if (aheadY < chosenOrigin.y - 2) {
      yaw = (yaw + Math.PI) % (Math.PI * 2);
    }

    // Tunnel length: 55 to 75 blocks horizontally
    const length = 55 + r3 * 20;
    // Target subterranean depth: Y 52 to 60 (deep enough to meet subterranean caverns)
    const endY = Math.max(48, Math.min(62, Math.round(52 + r4 * 8)));

    // Generate spline waypoints along the descending tunnel path
    const numNodes = 14;
    const nodes: SurfaceCaveNode[] = [];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < numNodes; i++) {
      const t = i / (numNodes - 1);
      const dist = t * length;

      // Natural serpentine wobble
      const wobbleX = this.noiseEntranceWobble.simplex3D(
        (chosenOrigin.x + dist) * 0.04,
        t * 3.0,
        (chosenOrigin.z + dist) * 0.04
      ) * 5.0;

      const wobbleZ = this.noiseEntranceWobble.simplex3D(
        (chosenOrigin.x + dist) * 0.04 + 100,
        t * 3.0 + 50,
        (chosenOrigin.z + dist) * 0.04 + 200
      ) * 5.0;

      const nx = chosenOrigin.x + Math.cos(yaw) * dist + wobbleX;
      const nz = chosenOrigin.z + Math.sin(yaw) * dist + wobbleZ;

      // Vertical descent:
      // Node 0 starts slightly above surface ground (+1.8) to carve an open, flared mouth arch
      // Node 1 is right at surface level
      // Descends gradually down to endY
      let ny: number;
      if (i === 0) {
        ny = chosenOrigin.y + 1.8;
      } else {
        const descentT = (i - 1) / (numNodes - 2);
        // Smooth ease-in-out descent curve
        const smoothT = descentT * descentT * (3 - 2 * descentT);
        ny = (chosenOrigin.y - 0.5) * (1 - smoothT) + endY * smoothT;
      }

      // Radius profile:
      // Node 0 (Surface Mouth): wide and dramatic (5.6 - 6.2 blocks)
      // Nodes 1-12 (Descending Tunnel): 3.6 to 4.6 blocks
      // Node 13 (Subterranean Junction Chamber): 5.5 to 6.5 blocks
      let radius: number;
      if (i === 0) {
        radius = 5.8 + r2 * 0.8;
      } else if (i === 1) {
        radius = 5.0 + r2 * 0.5;
      } else if (i === numNodes - 1) {
        radius = 5.6 + r3 * 0.8;
      } else {
        radius = 3.6 + Math.sin(t * Math.PI) * 1.0 + r4 * 0.5;
      }

      nodes.push({ x: nx, y: ny, z: nz, radius });

      // Expand bounding box
      const pad = radius + 3;
      if (nx - pad < minX) minX = nx - pad;
      if (nx + pad > maxX) maxX = nx + pad;
      if (ny - pad < minY) minY = ny - pad;
      if (ny + pad > maxY) maxY = ny + pad;
      if (nz - pad < minZ) minZ = nz - pad;
      if (nz + pad > maxZ) maxZ = nz + pad;
    }

    const entrance: SurfaceCaveEntrance = {
      id: key,
      cellX,
      cellZ,
      originX: chosenOrigin.x,
      originY: chosenOrigin.y,
      originZ: chosenOrigin.z,
      yaw,
      length,
      endY,
      nodes,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ
    };

    this.entranceCache.set(key, entrance);
    return entrance;
  }

  /**
   * Retrieves all surface cave entrances that could potentially intersect
   * a chunk at (chunkOriginX, chunkOriginZ).
   */
  public getEntrancesNearChunk(chunkOriginX: number, chunkOriginZ: number): SurfaceCaveEntrance[] {
    const chunkMinX = chunkOriginX;
    const chunkMaxX = chunkOriginX + CHUNK_W;
    const chunkMinZ = chunkOriginZ;
    const chunkMaxZ = chunkOriginZ + CHUNK_D;

    // Search cells that could touch this chunk (each cell is 220 blocks, entrance length is ~75)
    const minCellX = Math.floor((chunkMinX - 90) / SurfaceCaveSystem.CELL_SIZE);
    const maxCellX = Math.floor((chunkMaxX + 90) / SurfaceCaveSystem.CELL_SIZE);
    const minCellZ = Math.floor((chunkMinZ - 90) / SurfaceCaveSystem.CELL_SIZE);
    const maxCellZ = Math.floor((chunkMaxZ + 90) / SurfaceCaveSystem.CELL_SIZE);

    const result: SurfaceCaveEntrance[] = [];

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const entrance = this.getEntranceForCell(cx, cz);
        if (!entrance) continue;

        // Check horizontal AABB overlap with chunk
        if (
          entrance.maxX >= chunkMinX &&
          entrance.minX <= chunkMaxX &&
          entrance.maxZ >= chunkMinZ &&
          entrance.minZ <= chunkMaxZ
        ) {
          result.push(entrance);
        }
      }
    }

    return result;
  }

  /**
   * Checks whether a tree base coordinate (wx, wz) sits inside a surface cave mouth opening.
   * Prevents trees from spawning awkwardly in mid-air over a cave mouth.
   */
  public isInsideEntranceMouth(wx: number, wz: number): boolean {
    const cellX = Math.floor(wx / SurfaceCaveSystem.CELL_SIZE);
    const cellZ = Math.floor(wz / SurfaceCaveSystem.CELL_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const entrance = this.getEntranceForCell(cellX + dx, cellZ + dz);
        if (!entrance) continue;

        const mouth = entrance.nodes[0];
        const distSq = (wx - mouth.x) * (wx - mouth.x) + (wz - mouth.z) * (wz - mouth.z);
        if (distSq <= (mouth.radius + 1.5) * (mouth.radius + 1.5)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Evaluates if a 3D coordinate is carved by any surface cave entrance tunnel.
   * Returns information about whether the voxel is inside the cave air or on the cave floor.
   */
  public evaluateVoxel(
    wx: number,
    wy: number,
    wz: number
  ): { isAir: boolean; isFloor: boolean; depth: number } | null {
    const chunkOriginX = Math.floor(wx / CHUNK_W) * CHUNK_W;
    const chunkOriginZ = Math.floor(wz / CHUNK_D) * CHUNK_D;
    const entrances = this.getEntrancesNearChunk(chunkOriginX, chunkOriginZ);

    if (entrances.length === 0) return null;

    for (const entrance of entrances) {
      if (
        wx < entrance.minX || wx > entrance.maxX ||
        wy < entrance.minY || wy > entrance.maxY ||
        wz < entrance.minZ || wz > entrance.maxZ
      ) {
        continue;
      }

      // Check distance to each 3D segment of the entrance path
      const nodes = entrance.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];

        // Segment vector
        const abX = b.x - a.x;
        const abY = b.y - a.y;
        const abZ = b.z - a.z;
        const abLenSq = abX * abX + abY * abY + abZ * abZ;
        if (abLenSq <= 0.0001) continue;

        // Project point onto segment AB
        const apX = wx - a.x;
        const apY = wy - a.y;
        const apZ = wz - a.z;
        const t = Math.max(0, Math.min(1, (apX * abX + apY * abY + apZ * abZ) / abLenSq));

        const closestX = a.x + t * abX;
        const closestY = a.y + t * abY;
        const closestZ = a.z + t * abZ;

        const rad = a.radius + t * (b.radius - a.radius);

        const dx = wx - closestX;
        const dy = wy - closestY;
        const dz = wz - closestZ;

        // Vertical squash (0.85) to create a slightly wider than tall natural tunnel profile
        const distSq = dx * dx + (dy / 0.88) * (dy / 0.88) + dz * dz;
        const radSq = rad * rad;

        if (distSq < radSq) {
          // Inside the cave air
          return { isAir: true, isFloor: false, depth: wy };
        } else if (distSq < (rad + 1.2) * (rad + 1.2) && wy < closestY) {
          // Bottom floor shell immediately under the air
          return { isAir: false, isFloor: true, depth: wy };
        }
      }
    }

    return null;
  }

  /**
   * Carves all surface cave entrances intersecting the chunk voxels.
   * This is executed during chunk generation after basic column terrain is formed.
   */
  public carveChunk(
    chunkOriginX: number,
    chunkOriginZ: number,
    voxels: Uint8Array,
    getHeightAtCoord: (x: number, z: number) => number
  ) {
    const entrances = this.getEntrancesNearChunk(chunkOriginX, chunkOriginZ);
    if (entrances.length === 0) return;

    for (const entrance of entrances) {
      const nodes = entrance.nodes;

      for (let lz = 0; lz < CHUNK_D; lz++) {
        const wz = chunkOriginZ + lz;
        if (wz < entrance.minZ || wz > entrance.maxZ) continue;

        const zOffset = lz * CHUNK_W;

        for (let lx = 0; lx < CHUNK_W; lx++) {
          const wx = chunkOriginX + lx;
          if (wx < entrance.minX || wx > entrance.maxX) continue;

          const colIdx = lx + zOffset;
          const surfaceY = getHeightAtCoord(wx, wz);

          // Iterate through the vertical span of the entrance at this column
          const startY = Math.max(1, Math.floor(entrance.minY));
          const endY = Math.min(CHUNK_H - 2, Math.ceil(entrance.maxY), surfaceY + 4);

          for (let y = startY; y <= endY; y++) {
            const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);

            // Fast segment distance test
            for (let i = 0; i < nodes.length - 1; i++) {
              const a = nodes[i];
              const b = nodes[i + 1];

              const abX = b.x - a.x;
              const abY = b.y - a.y;
              const abZ = b.z - a.z;
              const abLenSq = abX * abX + abY * abY + abZ * abZ;
              if (abLenSq <= 0.0001) continue;

              const apX = wx - a.x;
              const apY = y - a.y;
              const apZ = wz - a.z;
              const t = Math.max(0, Math.min(1, (apX * abX + apY * abY + apZ * abZ) / abLenSq));

              const closestX = a.x + t * abX;
              const closestY = a.y + t * abY;
              const closestZ = a.z + t * abZ;

              const rad = a.radius + t * (b.radius - a.radius);

              const dx = wx - closestX;
              const dy = y - closestY;
              const dz = wz - closestZ;

              // Vertical squash creates a comfortable cavern cross section
              const distSq = dx * dx + (dy / 0.88) * (dy / 0.88) + dz * dz;

              if (distSq < rad * rad) {
                // Carve AIR inside the cave
                voxels[voxelIdx] = BlockType.AIR;

                // Cave Floor decoration:
                // Check if the block immediately below this carved air voxel is solid rock/ground
                if (y > 1) {
                  const floorVoxelIdx = colIdx + (y - 1) * (CHUNK_W * CHUNK_D);
                  const currentFloor = voxels[floorVoxelIdx];

                  if (
                    currentFloor !== BlockType.AIR &&
                    currentFloor !== BlockType.WATER &&
                    currentFloor !== BlockType.OBSIDIAN
                  ) {
                    const floorNoise = this.hash2D(wx, wz, y * 31);

                    if (y < 70) {
                      // Deep underground section of the entrance tunnel
                      if (floorNoise < 0.06) {
                        voxels[floorVoxelIdx] = BlockType.IRON_ORE;
                      } else if (floorNoise < 0.085) {
                        voxels[floorVoxelIdx] = BlockType.GOLD_ORE;
                      } else if (floorNoise < 0.105) {
                        voxels[floorVoxelIdx] = BlockType.GLOW_SHROOM_BLOCK; // Natural subterranean lighting
                      } else if (floorNoise < 0.12) {
                        voxels[floorVoxelIdx] = BlockType.AMETHYST_CLUSTER;
                      } else if (floorNoise < 0.35) {
                        voxels[floorVoxelIdx] = BlockType.BASALT;
                      } else {
                        voxels[floorVoxelIdx] = BlockType.COBBLESTONE;
                      }
                    } else {
                      // Upper entrance tunnel near the surface
                      if (floorNoise < 0.55) {
                        voxels[floorVoxelIdx] = BlockType.COBBLESTONE;
                      } else if (floorNoise < 0.80) {
                        voxels[floorVoxelIdx] = BlockType.STONE;
                      } else {
                        voxels[floorVoxelIdx] = BlockType.BASALT;
                      }
                    }
                  }
                }

                // If near surface mouth: decorate exposed rim blocks with rock
                if (y >= surfaceY - 1 && y <= surfaceY + 1) {
                  // Surrounding rim blocks
                  for (let rox = -1; rox <= 1; rox++) {
                    for (let roz = -1; roz <= 1; roz++) {
                      const rlx = lx + rox;
                      const rlz = lz + roz;
                      if (rlx >= 0 && rlx < CHUNK_W && rlz >= 0 && rlz < CHUNK_D) {
                        const rimColIdx = rlx + rlz * CHUNK_W;
                        const rimVIdx = rimColIdx + surfaceY * (CHUNK_W * CHUNK_D);
                        if (voxels[rimVIdx] === BlockType.GRASS || voxels[rimVIdx] === BlockType.DIRT) {
                          voxels[rimVIdx] = BlockType.COBBLESTONE;
                        }
                      }
                    }
                  }
                }

                break; // Carved this voxel, proceed to next Y
              }
            }
          }
        }
      }
    }
  }
}
