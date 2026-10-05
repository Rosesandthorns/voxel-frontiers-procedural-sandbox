import * as THREE from 'three';
import { BlockType, Season, WeatherType } from '../../types';
import { BLOCK_DEFS, isPlantBlock, isWaterBlock } from '../voxel/Blocks';
import { CHUNK_D, CHUNK_H, CHUNK_W } from '../voxel/ChunkConstants';
import type { VoxelWorld } from '../voxel/VoxelWorld';
import { CROP_CONFIGS, CropConfig, CropTemp } from './CropTypes';
import {
  BLOCK_TO_CROP_MAP,
  CROP_BLOCK_BUNDLES,
  CROP_BLOCK_IDS,
  getNextStageBlockFor,
  getWiltedBlockFor,
  isCropBlock
} from './CropBlocks';

export interface PlantEnvironmentStatus {
  isGood: boolean;
  reasons: string[];
  localTemp: CropTemp;
  waterValue: number;
  season: Season;
  isTilled: boolean;
  hasTrellis: boolean;
}

export interface TrackedPlant {
  x: number;
  y: number;
  z: number;
  block: BlockType;
  crop: CropConfig;
  stage: 'sprout' | 'growing' | 'mature' | 'wilted';
}

export class CropGrowthManager {
  public world: VoxelWorld;
  // 3 IRL minutes = 180 seconds
  public static readonly TICK_INTERVAL_SECONDS = 180;
  public timeUntilNextTick: number = CropGrowthManager.TICK_INTERVAL_SECONDS;
  public lastTickPlantCount: number = 0;

  // Tracked planted crops in active chunks: key = `${x},${y},${z}`
  private trackedPlants: Map<string, TrackedPlant> = new Map();
  private scanTimer: number = 0;

  constructor(world: VoxelWorld) {
    this.world = world;
  }

  public getKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public registerPlant(x: number, y: number, z: number, block: BlockType) {
    const info = BLOCK_TO_CROP_MAP.get(block);
    if (!info) return;
    this.trackedPlants.set(this.getKey(x, y, z), {
      x,
      y,
      z,
      block,
      crop: info.crop,
      stage: info.stage
    });
  }

  public unregisterPlant(x: number, y: number, z: number) {
    this.trackedPlants.delete(this.getKey(x, y, z));
  }

  public getPlantAt(x: number, y: number, z: number): TrackedPlant | undefined {
    return this.trackedPlants.get(this.getKey(x, y, z));
  }

  public getTrackedPlantCount(): number {
    return this.trackedPlants.size;
  }

  /**
   * Evaluates the environmental status (temperature, water, season, soil, trellis, etc.)
   * for a plant at world coordinate (x, y, z).
   */
  public evaluateEnvironment(x: number, y: number, z: number, crop: CropConfig): PlantEnvironmentStatus {
    const reasons: string[] = [];
    let isGood = true;

    // 1. Season & Shelter Check
    const currentSeason = this.world.seasonWeatherSystem?.season ?? Season.SPRING;
    const isEnclosedSheltered = !this.isExposedToSky(x, y, z) || this.isGreenhouseEnclosed(x, y, z);
    const seasonMatches = crop.seasons.includes(currentSeason);

    if (!seasonMatches && !isEnclosedSheltered) {
      isGood = false;
      reasons.push(`Wrong season (Requires ${crop.seasons.join('/')}, currently ${currentSeason})`);
    }

    // 2. Local Temperature ('C' / 'M' / 'H')
    const localTemp = this.resolveLocalTemperature(x, y, z);
    if (!crop.allowedTemps.includes(localTemp)) {
      isGood = false;
      const tempNames: Record<CropTemp, string> = { C: 'Cold', M: 'Medium/Temperate', H: 'Hot' };
      reasons.push(`Unsuitable temp (${tempNames[localTemp]} - requires ${crop.allowedTemps.map(t => tempNames[t]).join('/')})`);
    }

    // 3. Soil Moisture & Water Value (0 to 13)
    const soilBlock = this.world.getBlock(x, y - 1, z);
    let waterValue = this.world.getWaterValue(x, y - 1, z);

    // If it's raining and not covered, exposed crops receive maximum rain moisture (13)
    if (this.world.seasonWeatherSystem?.isRaining() && this.isExposedToSky(x, y, z)) {
      waterValue = 13;
    }

    // Check adjacent horizontal water for nearby irrigation
    const hasAdjacentWater = this.hasHorizontalWaterAdjacent(x, y, z);
    if (hasAdjacentWater && waterValue < 12) {
      waterValue = 12;
    }

    // Special: Sugarcane must directly touch water horizontally
    if (crop.needs.mustTouchWater && !hasAdjacentWater) {
      isGood = false;
      reasons.push('Must touch adjacent water horizontally');
    }

    // Special: Cactus fruit drowns if water > 5
    if (crop.needs.desertSandOnly && waterValue > 5) {
      isGood = false;
      reasons.push(`Overwatered desert cactus (Water ${waterValue} > 5)`);
    }

    // Water range validation
    if (waterValue < crop.minWater) {
      isGood = false;
      reasons.push(`Too dry (Water ${waterValue} < ${crop.minWater})`);
    } else if (waterValue > crop.maxWater) {
      isGood = false;
      reasons.push(`Waterlogged (Water ${waterValue} > ${crop.maxWater})`);
    }

    // 4. Soil Requirements (Farmland / Sand Farmland)
    const isTilled = soilBlock === BlockType.FARMLAND || soilBlock === BlockType.SAND_FARMLAND;
    if (crop.needs.tilled && !isTilled) {
      isGood = false;
      reasons.push('Requires tilled soil (Farmland)');
    }

    if (crop.needs.desertSandOnly) {
      const isSand = soilBlock === BlockType.SAND || soilBlock === BlockType.SAND_FARMLAND;
      if (!isSand) {
        isGood = false;
        reasons.push('Requires desert sand soil');
      }
    }

    // 5. Trellis Support Requirement
    const hasTrellis = this.hasAdjacentTrellis(x, y, z);
    if (crop.needs.trellis && !hasTrellis) {
      isGood = false;
      reasons.push('Requires adjacent Garden Trellis for support');
    }

    // 6. Open Space Requirement (Zucchini, Melons, Pumpkins)
    if (crop.needs.openSpace && !this.hasOpenSpace(x, y, z)) {
      isGood = false;
      reasons.push('Crowded! Needs open horizontal air space');
    }

    // 7. Shade / Darkness Requirement (Mushrooms)
    if (crop.needs.shadeOnly) {
      const exposed = this.isExposedToSky(x, y, z);
      if (exposed) {
        isGood = false;
        reasons.push('Needs darkness or shade (Under trees or indoors)');
      }
    }

    // 8. Acidic Conifer Soil (Blueberries)
    if (crop.needs.acidicConifer && !this.isNearConifers(x, y, z)) {
      isGood = false;
      reasons.push('Needs acidic soil near conifer/redwood trees');
    }

    return {
      isGood,
      reasons,
      localTemp,
      waterValue,
      season: currentSeason,
      isTilled,
      hasTrellis
    };
  }

  /**
   * Resolves whether coordinate has temperature 'C', 'M', or 'H',
   * accounting for active thermal stations (heaters & coolers), macro-climate, altitude, and seasons.
   */
  public resolveLocalTemperature(x: number, y: number, z: number): CropTemp {
    // 1. Check active thermal workstations (heaters & coolers)
    const thermal = this.world.thermalManager;
    if (thermal) {
      // Check for heaters nearby
      if (thermal.isSnowPreventedAt(x, z)) {
        return 'M'; // Heated zone
      }
      // Check for coolers nearby
      if (thermal.isSnowMeltPreventedAt(x, z)) {
        return 'C'; // Cooled zone
      }
    }

    // 2. High altitude mountain coolness
    if (y > 88) {
      return 'C';
    }

    // 3. Current season influence
    const season = this.world.seasonWeatherSystem?.season ?? Season.SPRING;
    if (season === Season.WINTER) {
      return 'C';
    }

    // 4. Macro-climate parameter from WorldGenerator (-1.0 to +1.0)
    const params = this.world.generator.getBiomeParameters(x, z);
    const tempNoise = params.temperature;

    if (tempNoise < -0.25) {
      return 'C';
    }
    if (tempNoise > 0.35 || season === Season.SUMMER && tempNoise > 0.15) {
      return 'H';
    }
    return 'M';
  }

  public isExposedToSky(x: number, y: number, z: number): boolean {
    for (let checkY = y + 1; checkY < CHUNK_H; checkY++) {
      const b = this.world.getBlock(x, checkY, z);
      if (b !== BlockType.AIR) {
        const def = BLOCK_DEFS[b];
        if (def && def.solid) return false;
      }
    }
    return true;
  }

  public isGreenhouseEnclosed(x: number, y: number, z: number): boolean {
    const thermal = this.world.thermalManager;
    if (!thermal) return false;
    // An enclosed room with insulated everfrost doors or heated by workstation
    return thermal.isSnowPreventedAt(x, z);
  }

  public hasHorizontalWaterAdjacent(x: number, y: number, z: number): boolean {
    const offsets: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of offsets) {
      const b = this.world.getBlock(x + dx, y, z + dz);
      const bBelow = this.world.getBlock(x + dx, y - 1, z + dz);
      if (isWaterBlock(b) || isWaterBlock(bBelow)) return true;
    }
    return false;
  }

  public hasAdjacentTrellis(x: number, y: number, z: number): boolean {
    const offsets: [number, number, number][] = [
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
      [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1]
    ];
    for (const [dx, dy, dz] of offsets) {
      const b = this.world.getBlock(x + dx, y + dy, z + dz);
      if (b === CROP_BLOCK_IDS.TRELLIS) return true;
    }
    return false;
  }

  public hasOpenSpace(x: number, y: number, z: number): boolean {
    let airNeighbors = 0;
    const offsets: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of offsets) {
      const b = this.world.getBlock(x + dx, y, z + dz);
      if (b === BlockType.AIR || isCropBlock(b) || isPlantBlock(b)) airNeighbors++;
    }
    return airNeighbors >= 2;
  }

  public isNearConifers(x: number, y: number, z: number): boolean {
    // Check for nearby redwood/everfrost logs or leaves within 6 blocks
    for (let dx = -6; dx <= 6; dx += 2) {
      for (let dz = -6; dz <= 6; dz += 2) {
        for (let dy = -1; dy <= 6; dy += 2) {
          const b = this.world.getBlock(x + dx, y + dy, z + dz);
          if (
            b === BlockType.REDWOOD_LOG ||
            b === BlockType.REDWOOD_LEAVES ||
            b === BlockType.EVERFROST_LOG ||
            b === BlockType.EVERFROST_LEAVES
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Periodic game loop update:
   * Scans loaded chunks periodically, updates the 3-minute IRL timer,
   * and fires plant growth ticks!
   */
  public update(delta: number) {
    // Advance 3-minute growth countdown timer
    this.timeUntilNextTick -= delta;
    if (this.timeUntilNextTick <= 0) {
      this.timeUntilNextTick = CropGrowthManager.TICK_INTERVAL_SECONDS;
      this.tickAllPlants();
    }
  }

  /**
   * Rescans active chunks around player to discover any planted crops.
   * Disabled to prevent huge lag spikes; crops are registered upon placement.
   */
  public rescanLoadedChunks() {
    // Disabled to prevent lag spikes
  }

  /**
   * Manually fast-forward or fire a growth tick (used for testing or UI trigger).
   */
  public fastForwardTick() {
    this.timeUntilNextTick = CropGrowthManager.TICK_INTERVAL_SECONDS;
    this.tickAllPlants();
  }

  /**
   * The core 3-IRL-minute plant tick:
   * "every 3 irl minutes the game ticks every loaded plant by 1,
   *  if the plant ticks and the envirement is bad, it wilts, otherwise it grows by 1 stage"
   */
  public tickAllPlants() {
    // Sync active plants with world blocks
    const plantEntries = Array.from(this.trackedPlants.entries());
    let updatedCount = 0;

    for (const [key, plant] of plantEntries) {
      const currentBlock = this.world.getBlock(plant.x, plant.y, plant.z);

      // Verify the block at this position is still this crop
      if (!isCropBlock(currentBlock)) {
        this.trackedPlants.delete(key);
        continue;
      }

      const env = this.evaluateEnvironment(plant.x, plant.y, plant.z, plant.crop);

      if (!env.isGood) {
        // Bad environment -> Plant wilts!
        const wiltedBlock = getWiltedBlockFor(currentBlock);
        if (wiltedBlock && currentBlock !== wiltedBlock) {
          this.world.setBlock(plant.x, plant.y, plant.z, wiltedBlock);
          plant.block = wiltedBlock;
          plant.stage = 'wilted';
          updatedCount++;
        }
      } else {
        // Good environment -> Grows by 1 stage!
        const nextBlock = getNextStageBlockFor(currentBlock);
        if (nextBlock && nextBlock !== currentBlock) {
          this.world.setBlock(plant.x, plant.y, plant.z, nextBlock);
          plant.block = nextBlock;
          const info = BLOCK_TO_CROP_MAP.get(nextBlock);
          if (info) plant.stage = info.stage;
          updatedCount++;

          // For 2-blocks tall crops (Corn, Sunflowers, Sugarcane) reaching mature stage:
          // Grow the top segment into the air block above
          if (plant.stage === 'mature' && plant.crop.needs.twoBlocksTall) {
            const aboveY = plant.y + 1;
            if (aboveY < CHUNK_H && this.world.getBlock(plant.x, aboveY, plant.z) === BlockType.AIR) {
              let topBlock = CROP_BLOCK_IDS.CORN_TOP;
              if (plant.crop.id === 'sugarcane') topBlock = CROP_BLOCK_IDS.SUGARCANE_TOP;
              if (plant.crop.id === 'sunflowers') topBlock = CROP_BLOCK_IDS.SUNFLOWER_TOP;
              this.world.setBlock(plant.x, aboveY, plant.z, topBlock);
            }
          }
        }
      }
    }

    this.lastTickPlantCount = plantEntries.length;
  }
}
