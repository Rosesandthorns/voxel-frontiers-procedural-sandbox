import { BlockType, ItemDef } from '../../types';
import {
  BLOCK_DEFS,
  isDoorBlock,
  isDoorOpen,
  isInsulatedDoor,
  isPlantBlock,
  isTopsnow,
  getTopsnowStage,
  getTopsnowForStage
} from '../voxel/Blocks';
import { CHUNK_H } from '../voxel/ChunkConstants';
import type { VoxelWorld } from '../voxel/VoxelWorld';

export type ThermalStationType = 'heater' | 'cooler';
export type TargetTemp = 'H' | 'M' | 'C';

export interface EnclosureResult {
  isEnclosed: boolean;
  volume: number;
  reason: string;
  sealedByEverfrostDoor: boolean;
  roomAirCoords: string[];
}

export interface ThermalStationData {
  x: number;
  y: number;
  z: number;
  type: ThermalStationType;
  fuelItem: ItemDef | null;
  fuelCount: number; // 0 to 64
  dayFuelProgress: number; // 0.0 to 1.0 (fraction of 1 unit per day consumed)
  targetTemp: TargetTemp; // 'H' (Hot), 'M' (Medium), 'C' (Cold)
  isEnclosed: boolean;
  enclosedAirVolume: number;
  enclosureStatus: string;
  hasInsulatedEverfrostDoors: boolean;
  roomAirCoords: Set<string>;
}

export class ThermalWorkstationManager {
  private stations: Map<string, ThermalStationData> = new Map();
  private scanTimer: number = 0;
  private enclosureCheckTimer: number = 0;

  public getStationKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public getStation(x: number, y: number, z: number): ThermalStationData | undefined {
    return this.stations.get(this.getStationKey(x, y, z));
  }

  public getOrCreateStation(
    x: number,
    y: number,
    z: number,
    type: ThermalStationType,
    world?: VoxelWorld
  ): ThermalStationData {
    const key = this.getStationKey(x, y, z);
    let station = this.stations.get(key);
    if (!station) {
      station = {
        x,
        y,
        z,
        type,
        fuelItem: null,
        fuelCount: 0,
        dayFuelProgress: 0,
        targetTemp: 'M',
        isEnclosed: false,
        enclosedAirVolume: 0,
        enclosureStatus: 'Checking enclosure status...',
        hasInsulatedEverfrostDoors: false,
        roomAirCoords: new Set()
      };
      this.stations.set(key, station);
      if (world) {
        this.evaluateStationEnclosure(station, world);
      }
    }
    return station;
  }

  public registerStation(
    x: number,
    y: number,
    z: number,
    type: ThermalStationType,
    world?: VoxelWorld
  ): ThermalStationData {
    return this.getOrCreateStation(x, y, z, type, world);
  }

  public removeStation(x: number, y: number, z: number): ThermalStationData | undefined {
    const key = this.getStationKey(x, y, z);
    const existing = this.stations.get(key);
    this.stations.delete(key);
    return existing;
  }

  public setStationFuel(
    x: number,
    y: number,
    z: number,
    item: ItemDef | null,
    count: number
  ) {
    const station = this.stations.get(this.getStationKey(x, y, z));
    if (station) {
      station.fuelItem = count > 0 ? item : null;
      station.fuelCount = Math.max(0, Math.min(64, count));
      if (station.fuelCount === 0) {
        station.dayFuelProgress = 0;
      }
    }
  }

  public setStationTargetTemp(
    x: number,
    y: number,
    z: number,
    temp: TargetTemp
  ) {
    const station = this.stations.get(this.getStationKey(x, y, z));
    if (station) {
      station.targetTemp = temp;
    }
  }

  /**
   * 3D Breadth-First Search flood-fill to evaluate whether the workstation is inside
   * an enclosed insulated environment of at most 1000 air blocks.
   * Sealed by solid blocks and closed Insulated Everfrost Doors.
   */
  public checkEnclosure(world: VoxelWorld, sx: number, sy: number, sz: number): EnclosureResult {
    // 1. Identify starting air points adjacent to the workstation
    const startPoints: [number, number, number][] = [];
    const adjOffsets: [number, number, number][] = [
      [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
    ];

    for (const [ox, oy, oz] of adjOffsets) {
      const ax = sx + ox;
      const ay = sy + oy;
      const az = sz + oz;
      if (ay >= 1 && ay < CHUNK_H - 1) {
        const b = world.getBlock(ax, ay, az);
        if (b === BlockType.AIR || isPlantBlock(b) || isTopsnow(b)) {
          startPoints.push([ax, ay, az]);
        }
      }
    }

    if (startPoints.length === 0) {
      return {
        isEnclosed: true,
        volume: 0,
        reason: 'Enclosed (encased completely in solid structure)',
        sealedByEverfrostDoor: false,
        roomAirCoords: []
      };
    }

    const visited = new Set<string>();
    const queue: [number, number, number][] = [];
    const roomAirCoords: string[] = [];
    let sealedByInsulatedEverfrost = false;

    for (const pt of startPoints) {
      const key = `${pt[0]},${pt[1]},${pt[2]}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(pt);
        roomAirCoords.push(key);
      }
    }

    const MAX_AIR_VOLUME = 1000;

    while (queue.length > 0) {
      const [cx, cy, cz] = queue.shift()!;

      // World boundary / sky leak check
      if (cy >= CHUNK_H - 3 || cy <= 1) {
        return {
          isEnclosed: false,
          volume: visited.size,
          reason: 'Unsealed: Leaked into open sky or world boundary (missing roof/floor)',
          sealedByEverfrostDoor: false,
          roomAirCoords: []
        };
      }

      if (visited.size > MAX_AIR_VOLUME) {
        return {
          isEnclosed: false,
          volume: visited.size,
          reason: `Unsealed: Space exceeds maximum limit of ${MAX_AIR_VOLUME} air blocks`,
          sealedByEverfrostDoor: false,
          roomAirCoords: []
        };
      }

      for (const [ox, oy, oz] of adjOffsets) {
        const nx = cx + ox;
        const ny = cy + oy;
        const nz = cz + oz;
        const nkey = `${nx},${ny},${nz}`;

        if (visited.has(nkey)) continue;

        // Skip the workstation block itself
        if (nx === sx && ny === sy && nz === sz) continue;

        const nb = world.getBlock(nx, ny, nz);

        // Check door types
        if (isDoorBlock(nb)) {
          if (isDoorOpen(nb)) {
            return {
              isEnclosed: false,
              volume: visited.size,
              reason: 'Unsealed: A door is currently open (must be closed to insulate)',
              sealedByEverfrostDoor: false,
              roomAirCoords: []
            };
          }

          if (isInsulatedDoor(nb)) {
            // Insulated Everfrost Door seals the space!
            sealedByInsulatedEverfrost = true;
            // Does not leak; act as solid barrier
            continue;
          } else {
            // Ordinary wooden door: NOT insulated!
            return {
              isEnclosed: false,
              volume: visited.size,
              reason: 'Unsealed: Non-insulated door detected (only Insulated Everfrost Doors seal an enclosed space)',
              sealedByEverfrostDoor: false,
              roomAirCoords: []
            };
          }
        }

        // Solid structural blocks seal the boundary
        if (BLOCK_DEFS[nb]?.solid) {
          continue;
        }

        // Passable block (AIR, plant, topsnow) -> traverse
        visited.add(nkey);
        roomAirCoords.push(nkey);
        queue.push([nx, ny, nz]);

        if (visited.size > MAX_AIR_VOLUME) {
          return {
            isEnclosed: false,
            volume: visited.size,
            reason: `Unsealed: Space exceeds maximum limit of ${MAX_AIR_VOLUME} air blocks`,
            sealedByEverfrostDoor: false,
            roomAirCoords: []
          };
        }
      }
    }

    return {
      isEnclosed: true,
      volume: visited.size,
      reason: `Enclosed space confirmed (${visited.size} / ${MAX_AIR_VOLUME} air blocks)`,
      sealedByEverfrostDoor: sealedByInsulatedEverfrost,
      roomAirCoords
    };
  }

  public evaluateStationEnclosure(station: ThermalStationData, world: VoxelWorld) {
    const res = this.checkEnclosure(world, station.x, station.y, station.z);
    station.isEnclosed = res.isEnclosed;
    station.enclosedAirVolume = res.volume;
    station.enclosureStatus = res.reason;
    station.hasInsulatedEverfrostDoors = res.sealedByEverfrostDoor;
    station.roomAirCoords = new Set(res.roomAirCoords);
  }

  /**
   * Main game loop update.
   * Handles fuel consumption (1 unit per day), 5x5 thermal fields, and enclosed room effects.
   */
  public update(delta: number, dayFractionDelta: number, world: VoxelWorld) {
    // 1. Fuel consumption across active stations
    if (dayFractionDelta > 0) {
      for (const station of this.stations.values()) {
        if (station.fuelCount > 0) {
          station.dayFuelProgress += dayFractionDelta;
          if (station.dayFuelProgress >= 1.0) {
            station.fuelCount -= 1;
            station.dayFuelProgress -= 1.0;
            if (station.fuelCount <= 0) {
              station.fuelCount = 0;
              station.fuelItem = null;
              station.dayFuelProgress = 0;
            }
          }
        }
      }
    }

    // 2. Periodic Enclosure re-evaluation (~every 4s)
    this.enclosureCheckTimer += delta;
    if (this.enclosureCheckTimer >= 4.0) {
      this.enclosureCheckTimer = 0;
      for (const station of this.stations.values()) {
        this.evaluateStationEnclosure(station, world);
      }
    }

    // 3. 5x5 Radius & Enclosed Room Thermal Processing (~every 0.8s)
    this.scanTimer += delta;
    if (this.scanTimer >= 0.8) {
      this.scanTimer = 0;
      this.processThermalEffects(world);
    }
  }

  private processThermalEffects(world: VoxelWorld) {
    for (const station of this.stations.values()) {
      if (station.fuelCount <= 0) continue; // Inactive if no fuel

      if (station.type === 'heater') {
        // HEATER: Melts ice into water, removes snow in 5x5 radius
        const sx = station.x;
        const sy = station.y;
        const sz = station.z;

        // Radius: 5x5 centered at heater (dx in -2..2, dz in -2..2)
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const wx = sx + dx;
            const wz = sz + dz;

            // Scan column near the heater (sy - 4 to sy + 5)
            for (let wy = Math.max(1, sy - 4); wy <= Math.min(CHUNK_H - 2, sy + 5); wy++) {
              const b = world.getBlock(wx, wy, wz);

              // Melt packed ice into water
              if (b === BlockType.PACKED_ICE) {
                world.setBlock(wx, wy, wz, BlockType.WATER);
              }
              // Melt topsnow layers
              else if (isTopsnow(b)) {
                const buried = world.getBuriedPlant(wx, wy, wz);
                if (buried) {
                  world.setBlock(wx, wy, wz, buried);
                  world.clearBuriedPlant(wx, wy, wz);
                } else {
                  world.setBlock(wx, wy, wz, BlockType.AIR);
                }
              }
              // Melt solid snow block
              else if (b === BlockType.SNOW) {
                world.setBlock(wx, wy, wz, BlockType.WATER);
              }
            }
          }
        }

        // If in enclosed room, also melt ice and snow across the entire room
        if (station.isEnclosed && station.roomAirCoords.size > 0) {
          for (const key of station.roomAirCoords) {
            const [rx, ry, rz] = key.split(',').map(Number);
            const b = world.getBlock(rx, ry, rz);
            if (b === BlockType.PACKED_ICE) {
              world.setBlock(rx, ry, rz, BlockType.WATER);
            } else if (isTopsnow(b)) {
              world.setBlock(rx, ry, rz, BlockType.AIR);
            }
          }
        }
      } else if (station.type === 'cooler') {
        // COOLER: Freezes water into packed ice in 5x5 radius
        const sx = station.x;
        const sy = station.y;
        const sz = station.z;

        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const wx = sx + dx;
            const wz = sz + dz;

            for (let wy = Math.max(1, sy - 4); wy <= Math.min(CHUNK_H - 2, sy + 5); wy++) {
              const b = world.getBlock(wx, wy, wz);
              // Freeze water into packed ice
              if (
                b === BlockType.WATER ||
                (b >= BlockType.WATER_FLOWING_7 && b <= BlockType.WATER_FALLING)
              ) {
                world.setBlock(wx, wy, wz, BlockType.PACKED_ICE);
              }
            }
          }
        }

        // If in enclosed room, also freeze water across the entire room
        if (station.isEnclosed && station.roomAirCoords.size > 0) {
          for (const key of station.roomAirCoords) {
            const [rx, ry, rz] = key.split(',').map(Number);
            const b = world.getBlock(rx, ry, rz);
            if (
              b === BlockType.WATER ||
              (b >= BlockType.WATER_FLOWING_7 && b <= BlockType.WATER_FALLING)
            ) {
              world.setBlock(rx, ry, rz, BlockType.PACKED_ICE);
            }
          }
        }
      }
    }
  }

  /**
   * Returns true if snow is prevented from gathering at (wx, wz)
   * (within 5x5 radius of an active fueled heater or in an enclosed heated room).
   */
  public isSnowPreventedAt(wx: number, wz: number): boolean {
    for (const station of this.stations.values()) {
      if (station.type !== 'heater' || station.fuelCount <= 0) continue;

      // 5x5 radius check: dx in [-2, 2], dz in [-2, 2]
      if (Math.abs(wx - station.x) <= 2 && Math.abs(wz - station.z) <= 2) {
        return true;
      }

      // Enclosed room check
      if (station.isEnclosed) {
        for (const coord of station.roomAirCoords) {
          const [rx, , rz] = coord.split(',').map(Number);
          if (rx === wx && rz === wz) return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns true if snow melting is prevented at (wx, wz)
   * (within 5x5 radius of an active fueled cooler or in an enclosed cooled room).
   */
  public isSnowMeltPreventedAt(wx: number, wz: number): boolean {
    for (const station of this.stations.values()) {
      if (station.type !== 'cooler' || station.fuelCount <= 0) continue;

      // 5x5 radius check: dx in [-2, 2], dz in [-2, 2]
      if (Math.abs(wx - station.x) <= 2 && Math.abs(wz - station.z) <= 2) {
        return true;
      }

      // Enclosed room check
      if (station.isEnclosed) {
        for (const coord of station.roomAirCoords) {
          const [rx, , rz] = coord.split(',').map(Number);
          if (rx === wx && rz === wz) return true;
        }
      }
    }
    return false;
  }
}
