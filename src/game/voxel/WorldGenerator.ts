import { BiomeType, BlockType } from '../../types';
import { isLeavesBlock, isLogBlock, isPlantBlock } from './Blocks';
import { Chunk } from './Chunk';
import { CHUNK_D, CHUNK_H, CHUNK_W, SEA_LEVEL } from './ChunkConstants';
import { isWaterOrWaterlogged } from './WaterFlora';
import { FastNoise } from './Noise';
import { resolveVerdantSubBiome, SUB_BIOME_REGISTRY } from './SubBiomeRegistry';
import { BiomeParameters, VerdantSubBiomeDef } from './SubBiomeTypes';
import { SurfaceCaveSystem } from './SurfaceCaveSystem';
import { RiverSystem } from '../world/RiverSystem';

function hash2(x: number, z: number, seed: number): number {
  let h = Math.imul(x ^ 0x45d9f3b, 0x119de1f3) ^ Math.imul(z ^ 0x3b246a1, 0x27d4eb2d) ^ Math.imul(seed, 0x1b56c4e9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class WorldGenerator {
  public surfaceCaveSystem: SurfaceCaveSystem;
  public riverSystem: RiverSystem;
  private noiseContinental: FastNoise;
  private noiseTemperature: FastNoise;
  private noiseFlatness: FastNoise;
  private noiseHumidity: FastNoise;
  private noiseWeirdness: FastNoise;
  private noiseVegetation: FastNoise;
  private noiseElevation: FastNoise;
  private noiseDetail: FastNoise;
  private noiseGlacier: FastNoise;
  private noiseFlora: FastNoise;
  private noiseCoastType: FastNoise;
  private noiseCaveA: FastNoise;
  private noiseCaveB: FastNoise;
  private noiseCaveRoom: FastNoise;

  constructor(public seed: number = 1337) {
    this.noiseContinental = new FastNoise(seed + 99);
    this.noiseTemperature = new FastNoise(seed + 155);
    this.noiseFlatness = new FastNoise(seed + 101);
    this.noiseHumidity = new FastNoise(seed + 202);
    this.noiseWeirdness = new FastNoise(seed + 303);
    this.noiseVegetation = new FastNoise(seed + 404);
    this.noiseElevation = new FastNoise(seed + 505);
    this.noiseDetail = new FastNoise(seed + 606);
    this.noiseGlacier = new FastNoise(seed + 707);
    this.noiseFlora = new FastNoise(seed + 808);
    this.noiseCoastType = new FastNoise(seed + 444);
    this.noiseCaveA = new FastNoise(seed + 919);
    this.noiseCaveB = new FastNoise(seed + 929);
    this.noiseCaveRoom = new FastNoise(seed + 939);

    this.riverSystem = new RiverSystem(
      seed + 777,
      (wx, wz) => this.isDesertAt(wx, wz),
      (wx, wz) => this.getBiomeParameters(wx, wz).continentalness
    );

    this.surfaceCaveSystem = new SurfaceCaveSystem(
      seed,
      (wx, wz, subBiome) => this.getHeightAt(wx, wz, subBiome),
      (wx, wz) => this.getSubBiomeAt(wx, wz),
      (wx, wz) => this.riverSystem.getRiverSample(wx, wz)
    );
  }

  public isDesertAt(wx: number, wz: number): boolean {
    const params = this.getBiomeParameters(wx, wz);
    return params.continentalness >= -0.15 && params.temperature > 0.38;
  }

  /**
   * Samples the Perlin noise parameters for a world position:
   * - continentalness: defines ~30% vast deep oceans, shorelines, and landmass. Spawn (0,0) is protected.
   * - temperature: solid, unmoving macro-climate band (~1600 blocks).
   * - flatness, humidity, weirdness, vegetation: regional parameters.
   * - coastType: macro-scale coastal provinces (~1200 blocks) separating rocky cliffs from sandy shores.
   */
  public getBiomeParameters(worldX: number, worldZ: number): BiomeParameters {
    // 1. Continentalness (~2125 blocks wavelength — 150% larger biomes)
    const contScale = 0.00115 / 2.5;
    let rawCont = this.noiseContinental.fbm2D(worldX * contScale, worldZ * contScale, 2, 2.0, 0.4);

    // Guaranteed spawn protection: within 110 blocks of spawn is guaranteed inland landmass
    const distFromSpawn = Math.hypot(worldX, worldZ);
    if (distFromSpawn < 140) {
      const spawnBlend = Math.max(0, 1 - distFromSpawn / 140);
      rawCont += spawnBlend * 1.5; // Pushes continentalness well above 0.3 near spawn
    }

    // 2. Temperature: "very solid and unmoving", huge scale (~4000 blocks — 150% larger biomes)
    const tempScale = 0.00062 / 2.5;
    const rawTemp = this.noiseTemperature.fbm2D(worldX * tempScale + 3141, worldZ * tempScale + 2718, 2, 2.0, 0.35);

    // 3. Regional parameters for sub-biomes (~570 blocks — 50% larger sub-biomes)
    const regScale = 0.0026 / 1.5;
    const medScale = 0.0065 / 1.5;

    const rawFlat = this.noiseFlatness.fbm2D(worldX * regScale, worldZ * regScale, 3, 2.0, 0.45);
    const rawHum = this.noiseHumidity.fbm2D(worldX * regScale + 500, worldZ * regScale + 500, 3, 2.0, 0.45);
    const rawWeird = this.noiseWeirdness.fbm2D(worldX * regScale + 1200, worldZ * medScale + 1200, 3, 2.0, 0.45);
    const rawVeg = this.noiseVegetation.fbm2D(worldX * regScale + 2500, worldZ * regScale + 2500, 3, 2.0, 0.45);

    // 4. Macro-scale coastal province noise (~3000 blocks — 150% larger biomes)
    const coastScale = 0.00085 / 2.5;
    const rawCoast = this.noiseCoastType.fbm2D(worldX * coastScale + 4321, worldZ * coastScale + 8765, 2, 2.0, 0.4);

    return {
      continentalness: Math.max(-1, Math.min(1, rawCont)),
      temperature: Math.max(-1, Math.min(1, rawTemp)),
      flatness: Math.max(-1, Math.min(1, rawFlat)),
      humidity: Math.max(-1, Math.min(1, rawHum)),
      weirdness: Math.max(-1, Math.min(1, rawWeird)),
      vegetation: Math.max(-1, Math.min(1, rawVeg)),
      coastType: Math.max(-1, Math.min(1, rawCoast))
    };
  }

  /**
   * Checks if a world position is inside a cave (surface entrance passage, subterranean cavern, or deep cavity).
   */
  public isInCave(worldX: number, worldY: number, worldZ: number, surfaceY?: number): boolean {
    const params = this.getBiomeParameters(worldX, worldZ);
    const surfY = surfaceY ?? this.getHeightAt(worldX, worldZ, resolveVerdantSubBiome(params));

    // If clearly above the terrain surface, definitely not in a cave
    if (worldY >= surfY + 1.5) return false;

    // 1. Check Surface Cave Entrance passage
    const river = this.riverSystem.getRiverSample(worldX, worldZ);
    const inRiverZone = (river.inRiver || river.inShore) && worldY >= SEA_LEVEL - 6 && worldY <= SEA_LEVEL + 2;
    if (!inRiverZone) {
      const evalCenter = this.surfaceCaveSystem.evaluateVoxel(worldX, worldY, worldZ);
      if (evalCenter && (evalCenter.isAir || evalCenter.isFloor)) return true;

      const evalHead = this.surfaceCaveSystem.evaluateVoxel(worldX, worldY + 1.5, worldZ);
      if (evalHead && (evalHead.isAir || evalHead.isFloor)) return true;

      const evalFeet = this.surfaceCaveSystem.evaluateVoxel(worldX, worldY - 0.5, worldZ);
      if (evalFeet && (evalFeet.isAir || evalFeet.isFloor)) return true;

      if (this.surfaceCaveSystem.isInsideEntranceMouth(worldX, worldZ) && worldY <= surfY + 0.5) {
        return true;
      }
    }

    // 2. Check subterranean cave worm tunnels & rooms
    const yInt = Math.floor(worldY);
    if (
      this.isCave(worldX, yInt, worldZ) ||
      this.isCave(worldX, yInt + 1, worldZ) ||
      this.isCave(worldX, yInt + 2, worldZ) ||
      this.isCave(worldX, yInt - 1, worldZ)
    ) {
      return true;
    }

    // 3. Deep underground hollow/stratum beneath surface terrain
    if (worldY <= 76 && worldY <= surfY - 4) {
      return true;
    }

    return false;
  }

  /**
   * Returns the cave sub-biome based on climate/weirdness parameters and depth.
   */
  public getCaveSubBiome(params: BiomeParameters, worldY: number): VerdantSubBiomeDef {
    const isOceanic = params.continentalness < -0.26;
    const isFrozen = params.temperature < -0.15;

    if (isOceanic) {
      if (isFrozen) {
        return SUB_BIOME_REGISTRY.FROZEN_CAVERNS;
      }
      return SUB_BIOME_REGISTRY.ABYSSAL_CAVERN;
    }

    // Land caves:
    if (params.temperature < -0.35) {
      return SUB_BIOME_REGISTRY.FROZEN_CAVERNS;
    }
    if (params.weirdness > 0.15 || worldY < 52) {
      return SUB_BIOME_REGISTRY.CRYSTALLINE_CHASM;
    }
    return SUB_BIOME_REGISTRY.SUBTERRANEAN_CAVERNS;
  }

  public getSubBiomeAt(worldX: number, worldZ: number, worldY?: number): VerdantSubBiomeDef {
    const params = this.getBiomeParameters(worldX, worldZ);
    const surfaceSubBiome = resolveVerdantSubBiome(params) || SUB_BIOME_REGISTRY.VERDANT_PLAINS_MEADOW;
    const isArcticClimate = Boolean(surfaceSubBiome?.isArctic || surfaceSubBiome?.category === 'arctic' || surfaceSubBiome?.surfaceBlock === BlockType.SNOW);

    // 1. Check River & Rivermouth
    const river = this.riverSystem.getRiverSample(worldX, worldZ);
    if (river.inRiver || river.inShore) {
      if (river.isRivermouth) {
        if (isArcticClimate) {
          return {
            ...SUB_BIOME_REGISTRY.RIVERMOUTH,
            category: 'arctic',
            isArctic: true,
            mainBiome: BiomeType.ARCTIC,
            name: 'Frozen Rivermouth',
            description: 'Where the frozen river empties into the icy ocean waters.'
          };
        }
        return SUB_BIOME_REGISTRY.RIVERMOUTH;
      }
      if (isArcticClimate) {
        return {
          ...SUB_BIOME_REGISTRY.RIVER,
          category: 'arctic',
          isArctic: true,
          mainBiome: BiomeType.ARCTIC,
          name: 'Frozen River',
          description: 'A winding river traversing the sub-zero arctic wastes, its surface frozen into thick ice.'
        };
      }
      return SUB_BIOME_REGISTRY.RIVER;
    }

    if (worldY !== undefined) {
      const surfaceY = this.getHeightAt(worldX, worldZ, surfaceSubBiome);
      if (this.isInCave(worldX, worldY, worldZ, surfaceY)) {
        return this.getCaveSubBiome(params, worldY);
      }
    }

    return surfaceSubBiome;
  }

  public getBiomeAt(worldX: number, worldZ: number, worldY?: number): BiomeType {
    const subBiome = this.getSubBiomeAt(worldX, worldZ, worldY);
    return subBiome.mainBiome;
  }

  /**
   * Evaluates if a 3D coordinate is carved by the subterranean cave system.
   * Caverns and winding tunnels span depths from Y 10 to Y 76 across land and ocean.
   */
  public isCave(wx: number, wy: number, wz: number): boolean {
    if (wy < 8 || wy > 76) return false;

    const params = this.getBiomeParameters(wx, wz);
    const isOceanic = params.continentalness < -0.26;
    const isTrenchZone = params.continentalness < -0.36 && params.weirdness > 0.30;

    // 3D Worm cave noise (carves wide subterranean winding tunnels)
    const scale = 0.024;
    const vScale = 0.034;
    const c1 = this.noiseCaveA.simplex3D(wx * scale, wy * vScale, wz * scale);
    const c2 = this.noiseCaveB.simplex3D(wx * scale + 142.3, wy * vScale + 87.1, wz * scale + 312.4);
    const distSq = c1 * c1 + c2 * c2;

    // Large cavernous rooms / chamber noise
    const room = this.noiseCaveRoom.simplex3D(wx * 0.015, wy * 0.022, wz * 0.015);

    // Trench zones have wider cave mouths and larger subterranean cathedral chambers
    const tunnelThreshold = isTrenchZone ? 0.046 : (isOceanic ? 0.030 : 0.026);
    const roomThreshold = isTrenchZone ? 0.40 : 0.48;

    if (distSq < tunnelThreshold) return true;
    if (room > roomThreshold && wy < 65) return true;

    return false;
  }

  /**
   * Evaluates if a 3D coordinate is carved by the subterranean underwater cave system.
   * Under oceans, subterranean caves are flooded with water.
   */
  public isUnderwaterCave(wx: number, wy: number, wz: number): boolean {
    const params = this.getBiomeParameters(wx, wz);
    const isOceanic = params.continentalness < -0.26;
    return isOceanic && this.isCave(wx, wy, wz);
  }

  /**
   * Computes the surface/seabed terrain height for given world coordinates.
   * World sea level is at Y 100.
   */
  public getHeightAt(worldX: number, worldZ: number, subBiome: VerdantSubBiomeDef): number {
    const river = this.riverSystem.getRiverSample(worldX, worldZ);
    const naturalH = this.getNaturalTerrainHeight(worldX, worldZ, subBiome);

    if (river.inRiver) {
      // River channel: water surface is at Y100 (SEA_LEVEL), riverbed carved beneath (Y96 - Y98)
      const bedTarget = Math.round(SEA_LEVEL - river.depthOffset);
      return Math.min(naturalH, bedTarget);
    }

    if (river.inShore) {
      // Shoreline bank sits right at the water's edge at Y101
      const shoreEdgeH = SEA_LEVEL + 1;
      if (naturalH > shoreEdgeH) {
        return shoreEdgeH;
      }
      return naturalH;
    }

    // River Valley: terrain smoothly bends downwards towards the river
    // User request: "make the terraign bend downwards towards the river when a river spawns"
    if (river.valleyBlend < 1.0 && naturalH > SEA_LEVEL + 1) {
      const bankH = SEA_LEVEL + 1;
      const t = river.valleyBlend;
      // Hermite S-curve (smoothstep): t * t * (3 - 2 * t)
      // Guarantees zero derivative at t=0 (river bank) and t=1 (valley rim),
      // seamlessly blending down from surrounding mountains/hills into the river valley
      const smoothCurve = t * t * (3 - 2 * t);
      const valleyH = bankH + smoothCurve * (naturalH - bankH);
      return Math.round(valleyH);
    }

    return naturalH;
  }

  public getNaturalTerrainHeight(worldX: number, worldZ: number, subBiome: VerdantSubBiomeDef): number {
    const BASE_LAND_ELEVATION = 102;

    if (subBiome.category === 'trench') {
      // Abyssal Trench: deep fracture plunging down to Y 16-24 (creating a prominent trench entrance)
      const trenchFloorNoise = this.noiseElevation.fbm2D(worldX * 0.02, worldZ * 0.02, 2, 2.0, 0.5);
      return Math.max(14, Math.min(26, Math.round(18 + trenchFloorNoise * 6)));
    }

    if (subBiome.category === 'ocean') {
      // Ocean sea floor depends on ocean sub-biome
      const oceanFloorBase = SEA_LEVEL + subBiome.baseHeightOffset;
      const seabedNoise = this.noiseElevation.fbm2D(worldX * 0.009, worldZ * 0.009, 2, 2.0, 0.5);
      const detail = this.noiseDetail.fbm2D(worldX * 0.04, worldZ * 0.04, 2, 2.0, 0.5);

      if (subBiome.shoreType === 'cliff_stone') {
        // High stone bluffs overlooking ocean (Y 108-114) — intentionally abrupt, no blending
        return Math.max(SEA_LEVEL + 4, Math.min(120, Math.round(BASE_LAND_ELEVATION + subBiome.baseHeightOffset + seabedNoise * 5 + detail * 2)));
      }

      if (subBiome.shoreType === 'sand' || subBiome.shoreType === 'snow') {
        // "Sandy shorelines should be like a ramp, connecting the height difference between the land and ocean"
        // Continuous smooth grade connecting inland continent (~104) down to shallow ocean bed (~84)
        // Crossing SEA_LEVEL (100) right in the middle as natural sand beach surf
        const params = this.getBiomeParameters(worldX, worldZ);
        const shoreLandEdge = -0.15;
        const shoreOceanEdge = -0.34;
        const rawT = (params.continentalness - shoreOceanEdge) / (shoreLandEdge - shoreOceanEdge);
        const t = Math.max(0, Math.min(1, rawT));
        const smoothRamp = t * t * (3 - 2 * t);

        const inlandElevation = 104.5;
        const oceanElevation = 83.5;
        const rampHeight = oceanElevation + smoothRamp * (inlandElevation - oceanElevation);

        return Math.max(82, Math.min(106, Math.round(rampHeight + detail * 0.8)));
      }

      // Deep, cold, open, or frozen seabed
      const height = oceanFloorBase + seabedNoise * (subBiome.heightVariation * 7) + detail * 2;
      return Math.max(22, Math.min(SEA_LEVEL - 3, Math.round(height)));
    }

    // Inland continent height — blended across biome boundaries to avoid abrupt cliffs
    return Math.round(this.getBlendedLandHeight(worldX, worldZ, subBiome));
  }

  /**
   * Whether a sub-biome should be excluded from height blending as a target.
   * Biomes with intentional abrupt transitions (cliffs, basins, deep marshes) keep their sharp edges.
   */
  private isAbruptBiome(sb: VerdantSubBiomeDef): boolean {
    return (
      sb.category === 'trench' ||
      sb.category === 'ocean' ||
      sb.category === 'river' ||
      sb.shoreType === 'cliff_stone' ||
      sb.id === 'verdant_spires' ||       // dramatic spires — keep sharp
      sb.id === 'crag_ridge' ||           // sharp ridgeline — keep sharp
      sb.id === 'stone_cliff_shoreline' ||
      sb.id === 'abyssal_trench' ||
      sb.id === 'fractured_terraces' ||   // stepped terraces are intentional
      sb.id === 'verdant_marsh' ||        // intentional basin dip
      sb.id === 'phosphor_fen'            // intentional basin dip
    );
  }

  /**
   * Raw inland land height for a position, ignoring blending.
   */
  private computeLandHeight(worldX: number, worldZ: number, subBiome: VerdantSubBiomeDef): number {
    const BASE_LAND_ELEVATION = 102;
    const macro = this.noiseElevation.fbm2D(worldX * 0.008, worldZ * 0.008, 3, 2.0, 0.5);
    const micro = this.noiseDetail.fbm2D(worldX * 0.035, worldZ * 0.035, 2, 2.0, 0.5);

    const varScale = subBiome.heightVariation;
    const heightOffset = subBiome.baseHeightOffset;

    let height = BASE_LAND_ELEVATION + heightOffset;
    height += macro * (6.5 * varScale);
    height += micro * (1.8 * Math.min(1.2, varScale));

    // Smooth elevation modulation for weirdness
    if (subBiome.weirdnessScale > 0.4) {
      const ridge = this.noiseWeirdness.fbm2D(worldX * 0.015, worldZ * 0.015, 2, 2.0, 0.5);
      height += ridge * 4.0 * subBiome.weirdnessScale;
    }

    // Oasis: use noise to split between exposed sand (Y=100) and water-filled (Y=99→water at 100)
    if (subBiome.id === 'desert_oasis') {
      const oasisNoise = this.noiseDetail.fbm2D(worldX * 0.04, worldZ * 0.04, 2, 2.0, 0.5);
      if (oasisNoise > 0.4) {
        height = Math.min(height, SEA_LEVEL);     // Y=100 — exposed sand
      } else {
        height = Math.min(height, SEA_LEVEL - 1); // Y=99 — water fills to Y=100
      }
    }

    // Force wet biomes (oasis, flood plains, swamps) to stay at or below sea level
    // These biomes have hasReedsOrLilypads, hasMudPuddles, or are specifically water-based
    const isWetBiome = subBiome.hasReedsOrLilypads || subBiome.hasMudPuddles || 
                       subBiome.id === 'desert_oasis' || subBiome.id === 'rainforest_flood_plain' ||
                       subBiome.id === 'rainforest_mangrove_swamp' || subBiome.id === 'rainforest_river_delta';
    
    if (isWetBiome && subBiome.id !== 'desert_oasis') {
      const maxHeight = SEA_LEVEL + 2;
      height = Math.min(height, maxHeight); 
    }

    return Math.max(SEA_LEVEL - 2, Math.min(CHUNK_H - 12, height));
  }

  /**
   * Blended inland terrain height.
   * Samples neighbours at a ~40-block radius and smoothly averages their heights,
   * softening abrupt biome-boundary cliffs. Biomes that are intentionally
   * abrupt (cliffs, basins, terraces) are never used as blend sources so they
   * keep their sharp character, but they DO receive blending from their smoother
   * neighbours so the approach is still gradual from the flat side.
   * 
   * Modified to preserve sub-biome preferred heights by using weighted blending
   * based on each biome's heightVariation parameter. Biomes with higher height
   * variation maintain more of their own height, while smoother biomes blend more.
   */
  private getBlendedLandHeight(worldX: number, worldZ: number, subBiome: VerdantSubBiomeDef): number {
    const ownHeight = this.computeLandHeight(worldX, worldZ, subBiome);

    // Force wet biomes to stay at or below sea level, bypassing most blending
    const isWetBiome = subBiome.hasReedsOrLilypads || subBiome.hasMudPuddles || 
                       subBiome.id === 'desert_oasis' || subBiome.id === 'rainforest_flood_plain' ||
                       subBiome.id === 'rainforest_mangrove_swamp' || subBiome.id === 'rainforest_river_delta';
    
    if (isWetBiome) {
      // Wet biomes get minimal blending to ensure they stay at water level
      const R = 20;
      const offsets: [number, number][] = [
        [R, 0], [-R, 0], [0, R], [0, -R]
      ];
      let sum = ownHeight;
      let count = 1;
      for (const [dx, dz] of offsets) {
        const nb = this.resolveSubBiomeForBlend(worldX + dx, worldZ + dz);
        const nbH = this.computeLandHeight(worldX + dx, worldZ + dz, nb);
        sum += nbH;
        count++;
      }
      const blended = Math.round(sum / count);
      
      // Oasis uses same noise pattern as computeLandHeight for consistency
      if (subBiome.id === 'desert_oasis') {
        const oasisNoise = this.noiseDetail.fbm2D(worldX * 0.04, worldZ * 0.04, 2, 2.0, 0.5);
        if (oasisNoise > 0.4) {
          return Math.min(blended, SEA_LEVEL);     // Y=100 — exposed sand
        } else {
          return Math.min(blended, SEA_LEVEL - 1); // Y=99 — water fills to Y=100
        }
      } else {
        const maxHeight = SEA_LEVEL + 2;
        return Math.min(blended, maxHeight);
      }
    }

    // Abrupt biomes: still blend inward from their smoother neighbours,
    // but reduce the blend radius so the abrupt character is mostly preserved.
    const isAbrupt = this.isAbruptBiome(subBiome);
    if (isAbrupt) {
      // Only a very gentle neighbourhood average (radius 20) to knock off the
      // sharpest single-voxel spikes right at the boundary, nothing more.
      const R = 20;
      const offsets: [number, number][] = [
        [R, 0], [-R, 0], [0, R], [0, -R]
      ];
      let sum = ownHeight;
      let count = 1;
      for (const [dx, dz] of offsets) {
        const nb = this.resolveSubBiomeForBlend(worldX + dx, worldZ + dz);
        if (!this.isAbruptBiome(nb)) {
          sum += this.computeLandHeight(worldX + dx, worldZ + dz, nb);
          count++;
        }
      }
      return Math.round(sum / count);
    }

    // Smooth biomes: wider blend (radius 40) using 8 cardinal + diagonal neighbours.
    // Neighbours that are abrupt biomes still contribute their raw height so the
    // smooth side tapers toward the abrupt edge naturally.
    const R = 40;
    const offsets: [number, number][] = [
      [R,  0], [-R,  0], [ 0,  R], [ 0, -R],
      [R,  R], [-R,  R], [ R, -R], [-R, -R]
    ];

    // Calculate own weight based on height variation - higher variation = more independence
    // Base weight of 2.0, modified by height variation (0.25 to 2.5 typical range)
    const ownWeight = 2.0 + subBiome.heightVariation * 1.5;
    
    let weightedSum = ownHeight * ownWeight;
    let totalWeight = ownWeight;
    
    for (const [dx, dz] of offsets) {
      const nb = this.resolveSubBiomeForBlend(worldX + dx, worldZ + dz);
      // Skip ocean/trench/river neighbours — they would drag inland heights toward sea level
      if (nb.category === 'ocean' || nb.category === 'trench' || nb.category === 'river') continue;
      
      const nbH = this.computeLandHeight(worldX + dx, worldZ + dz, nb);
      // Neighbors get lower weight based on their height variation
      // Higher variation neighbors influence less, lower variation neighbors influence more
      const nbWeight = 1.0 + (1.0 - nb.heightVariation) * 0.5;
      
      weightedSum += nbH * nbWeight;
      totalWeight += nbWeight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Resolves the surface sub-biome at a position without the river/cave override,
   * used only for height blending neighbour sampling (avoids expensive cave checks).
   */
  private resolveSubBiomeForBlend(wx: number, wz: number): VerdantSubBiomeDef {
    const params = this.getBiomeParameters(wx, wz);
    return resolveVerdantSubBiome(params) || SUB_BIOME_REGISTRY.VERDANT_PLAINS_MEADOW;
  }

  private getTreeInCell(cellX: number, cellZ: number): {
    wx: number;
    wz: number;
    groundY: number;
    type: 'redwood' | 'limeleaf' | 'oak' | 'ghost' | 'palm' | 'everfrost' | 'rainforest_oak' | 'kapok' | 'banyan' | 'strangler' | 'mahogany' | 'ceiba';
    trunkHeight: number;
  } | null {
    const rx = Math.floor(hash2(cellX, cellZ, 101) * 6);
    const rz = Math.floor(hash2(cellX, cellZ, 202) * 6);
    const treeWX = cellX * 6 + rx;
    const treeWZ = cellZ * 6 + rz;

    // Do not spawn trees inside surface cave mouths
    if (this.surfaceCaveSystem.isInsideEntranceMouth(treeWX, treeWZ)) {
      return null;
    }

    const subBiome = this.getSubBiomeAt(treeWX, treeWZ);
    if (subBiome.treeFrequency <= 0) return null;

    const chance = hash2(cellX, cellZ, 303);
    if (chance > subBiome.treeFrequency * 36) return null;

    const groundY = this.getHeightAt(treeWX, treeWZ, subBiome);
    if (groundY < SEA_LEVEL || groundY >= CHUNK_H - 24) return null;

    const params = this.getBiomeParameters(treeWX, treeWZ);

    let type: 'redwood' | 'limeleaf' | 'oak' | 'ghost' | 'palm' | 'everfrost' | 'rainforest_oak' | 'kapok' | 'banyan' | 'strangler' | 'mahogany' | 'ceiba' = 'oak';
    let trunkHeight = 6;

    // Rainforest trees
    if (subBiome.isRainforest) {
      let rfType: 'rainforest_oak' | 'kapok' | 'banyan' | 'strangler' | 'mahogany' | 'ceiba' = 'rainforest_oak';
      let rfTrunk = 9;
      if (subBiome.treeTypeOverride === 'kapok' || subBiome.treeTypeOverride === 'banyan' ||
          subBiome.treeTypeOverride === 'strangler' || subBiome.treeTypeOverride === 'mahogany' ||
          subBiome.treeTypeOverride === 'ceiba' || subBiome.treeTypeOverride === 'rainforest_oak') {
        rfType = subBiome.treeTypeOverride as typeof rfType;
      } else {
        const rfPick = hash2(cellX, cellZ, 701);
        if (rfPick < 0.125) { rfType = 'kapok'; }
        else if (rfPick < 0.25) { rfType = 'ceiba'; }
        else if (rfPick < 0.45) { rfType = 'banyan'; }
        else if (rfPick < 0.62) { rfType = 'mahogany'; }
        else if (rfPick < 0.80) { rfType = 'strangler'; }
        else { rfType = 'rainforest_oak'; }
      }
      switch (rfType) {
        case 'rainforest_oak': rfTrunk = 8 + Math.floor(hash2(cellX, cellZ, 702) * 7); break;
        case 'kapok':          rfTrunk = 20 + Math.floor(hash2(cellX, cellZ, 703) * 9); break;
        case 'banyan':         rfTrunk = 10 + Math.floor(hash2(cellX, cellZ, 704) * 7); break;
        case 'mahogany':       rfTrunk = 12 + Math.floor(hash2(cellX, cellZ, 705) * 7); break;
        case 'strangler':      rfTrunk = 10 + Math.floor(hash2(cellX, cellZ, 706) * 7); break;
        case 'ceiba':          rfTrunk = 24 + Math.floor(hash2(cellX, cellZ, 707) * 9); break;
      }
      return { wx: treeWX, wz: treeWZ, groundY, type: rfType, trunkHeight: rfTrunk };
    }

    if (subBiome.treeTypeOverride === 'everfrost' || subBiome.hasEverfrostTrees || subBiome.isArctic || subBiome.category === 'arctic') {
      type = 'everfrost';
      trunkHeight = 10 + Math.floor(hash2(cellX, cellZ, 505) * 6); // 10-15 blocks tall like redwood
    } else if (subBiome.treeTypeOverride === 'ghost') {
      type = 'ghost';
      trunkHeight = 6 + Math.floor(hash2(cellX, cellZ, 505) * 4); // 6-9 blocks tall
    } else if (subBiome.treeTypeOverride === 'palm') {
      type = 'palm';
      trunkHeight = 7 + Math.floor(hash2(cellX, cellZ, 505) * 5); // 7-11 blocks tall
    } else if (subBiome.id === 'verdant_plains_meadow') {
      // User request: Red Wood Trees spawn in the colder half of meadows
      if (params.temperature < 0) {
        type = 'redwood';
        trunkHeight = 10 + Math.floor(hash2(cellX, cellZ, 505) * 6); // 10-15 blocks tall
      } else {
        if (params.humidity > 0.15) {
          type = 'limeleaf';
          trunkHeight = 6 + Math.floor(hash2(cellX, cellZ, 505) * 3);
        } else {
          type = 'oak';
          trunkHeight = 5 + Math.floor(hash2(cellX, cellZ, 505) * 2);
        }
      }
    } else if (subBiome.id === 'redwood_forest' || subBiome.isRedwoodForest || subBiome.treeTypeOverride === 'redwood' || subBiome.id === 'mist_highlands' || subBiome.id === 'crag_ridge') {
      type = 'redwood';
      trunkHeight = 12 + Math.floor(hash2(cellX, cellZ, 505) * 7);
    } else if (subBiome.id === 'verdant_marsh' || subBiome.id === 'phosphor_fen') {
      // Limeleaf willows love wetlands and fens
      type = 'limeleaf';
      trunkHeight = 6 + Math.floor(hash2(cellX, cellZ, 505) * 3);
    } else if (subBiome.id === 'emerald_knolls' || subBiome.id === 'clover_prairie') {
      const pick = hash2(cellX, cellZ, 404);
      if (pick > 0.4) {
        type = 'limeleaf';
        trunkHeight = 6 + Math.floor(hash2(cellX, cellZ, 505) * 3);
      } else {
        type = 'oak';
        trunkHeight = 5 + Math.floor(hash2(cellX, cellZ, 505) * 2);
      }
    } else if (subBiome.id === 'verdant_spires') {
      type = params.temperature < 0 ? 'redwood' : 'limeleaf';
      trunkHeight = type === 'redwood' ? 12 : 7;
    } else {
      type = params.temperature < -0.1 ? 'redwood' : (params.humidity > 0 ? 'limeleaf' : 'oak');
      trunkHeight = type === 'redwood' ? 10 : 5;
    }

    return {
      wx: treeWX,
      wz: treeWZ,
      groundY,
      type,
      trunkHeight
    };
  }

  private stampTree(
    tree: { wx: number; wz: number; groundY: number; type: 'redwood' | 'limeleaf' | 'oak' | 'ghost' | 'palm' | 'everfrost' | 'rainforest_oak' | 'kapok' | 'banyan' | 'strangler' | 'mahogany' | 'ceiba'; trunkHeight: number },
    setVoxel: (wx: number, wy: number, wz: number, block: BlockType) => void
  ) {
    const { wx, wz, groundY, type, trunkHeight } = tree;

    if (type === 'redwood') {
      // Redwood Log Trunk
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.REDWOOD_LOG);
      }

      // Redwood Foliage - Conical Evergreen
      const topY = groundY + trunkHeight + 2;
      setVoxel(wx, topY, wz, BlockType.REDWOOD_LEAVES);

      // Level below top: cross radius 1
      for (const [dx, dz] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
        setVoxel(wx + dx, topY - 1, wz + dz, BlockType.REDWOOD_LEAVES);
      }

      // Tiers stepping downward
      for (let y = topY - 2; y >= groundY + 3; y--) {
        const distFromTop = topY - y;
        const tier = Math.floor(distFromTop / 2);
        const isSkirt = distFromTop % 2 === 1;
        const r = isSkirt ? Math.min(3, tier + 1) : Math.min(3, tier);

        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const dSq = dx * dx + dz * dz;
            if (dSq <= r * r + (isSkirt ? 0.6 : -0.2)) {
              if (dx === 0 && dz === 0 && y <= groundY + trunkHeight) continue;
              setVoxel(wx + dx, y, wz + dz, BlockType.REDWOOD_LEAVES);
            }
          }
        }
      }
    } else if (type === 'limeleaf') {
      // Limeleaf Log Trunk (Willow)
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.LIMELEAF_LOG);
      }

      // Branching limbs near crown
      const branchY = groundY + trunkHeight;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        setVoxel(wx + dx, branchY, wz + dz, BlockType.LIMELEAF_LOG);
      }

      // Bushy Willow Canopy Dome
      const crownY = groundY + trunkHeight;
      const canopyLayers = [
        { dy: 2, r: 1.8 },
        { dy: 1, r: 3.4 },
        { dy: 0, r: 3.8 },
        { dy: -1, r: 3.2 }
      ];

      for (const layer of canopyLayers) {
        const y = crownY + layer.dy;
        const r = layer.r;
        const rInt = Math.ceil(r);
        for (let dx = -rInt; dx <= rInt; dx++) {
          for (let dz = -rInt; dz <= rInt; dz++) {
            const dist = Math.hypot(dx, dz);
            if (dist <= r) {
              if (layer.dy <= 0 && dx === 0 && dz === 0) continue;
              setVoxel(wx + dx, y, wz + dz, BlockType.LIMELEAF_LEAVES);

              // Weeping foliage tendrils hanging down around perimeter
              if (layer.dy === -1 && dist >= 2.4 && dist <= 3.4) {
                const vineLen = Math.floor(hash2(wx + dx, wz + dz, 909) * 3) + 1;
                for (let v = 1; v <= vineLen; v++) {
                  setVoxel(wx + dx, y - v, wz + dz, BlockType.LIMELEAF_LEAVES);
                }
              }
            }
          }
        }
      }
    } else if (type === 'ghost') {
      // Ghost Tree: Pale logs and white leaves
      let curX = wx;
      let curZ = wz;
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(curX, y, curZ, BlockType.GHOST_LOG);
        // Slightly gnarled crooked trunk
        if (y === groundY + 3 && hash2(wx, wz, y) > 0.55) curX += 1;
        if (y === groundY + 5 && hash2(wx, wz, y * 3) > 0.55) curZ += 1;
      }

      // Gnarled limbs
      const crownY = groundY + trunkHeight;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        setVoxel(curX + dx, crownY, curZ + dz, BlockType.GHOST_LOG);
      }

      // Spectral white leaves
      for (let dy = -1; dy <= 2; dy++) {
        const y = crownY + dy;
        const layerR = dy === 2 ? 1.5 : (dy === -1 ? 2.2 : 2.8);
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            if (Math.hypot(dx, dz) <= layerR) {
              if (dy <= 0 && dx === 0 && dz === 0) continue;
              setVoxel(curX + dx, y, curZ + dz, BlockType.WHITE_LEAVES);
            }
          }
        }
      }

      // Weeping pale tendrils
      for (const [dx, dz] of [[2, 1], [-2, -1], [1, -2], [-1, 2], [2, -1], [-2, 1]]) {
        setVoxel(curX + dx, crownY - 2, curZ + dz, BlockType.WHITE_LEAVES);
        if (hash2(curX + dx, curZ + dz, 911) > 0.4) {
          setVoxel(curX + dx, crownY - 3, curZ + dz, BlockType.WHITE_LEAVES);
        }
      }
    } else if (type === 'palm') {
      // Tropical Palm Tree: tall curved trunk and radiating palm fronds
      const curveDir = hash2(wx, wz, 123) * Math.PI * 2;
      let curX = wx;
      let curZ = wz;
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        const t = (y - groundY) / trunkHeight;
        const offset = Math.sin(t * Math.PI * 0.5) * 1.6;
        curX = Math.round(wx + Math.cos(curveDir) * offset);
        curZ = Math.round(wz + Math.sin(curveDir) * offset);
        setVoxel(curX, y, curZ, BlockType.PALM_LOG);
      }

      const topY = groundY + trunkHeight;
      setVoxel(curX, topY + 1, curZ, BlockType.PALM_LEAVES);

      // Lush crown cluster around the top of the trunk to give full, substantial canopy base
      for (const [cdx, cdz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        setVoxel(curX + cdx, topY, curZ + cdz, BlockType.PALM_LEAVES);
      }

      const frondDirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, -1], [1, -1], [-1, 1]
      ];

      for (const [fdx, fdz] of frondDirs) {
        setVoxel(curX + fdx, topY + 1, curZ + fdz, BlockType.PALM_LEAVES);
        setVoxel(curX + fdx * 2, topY, curZ + fdz * 2, BlockType.PALM_LEAVES);
        setVoxel(curX + fdx * 3, topY - 1, curZ + fdz * 3, BlockType.PALM_LEAVES);
        if (Math.abs(fdx) + Math.abs(fdz) === 1) {
          setVoxel(curX + fdx * 4, topY - 2, curZ + fdz * 4, BlockType.PALM_LEAVES);
        }
      }
    } else if (type === 'everfrost') {
      // Everfrost Tree: cold-toned redwood-like conifer with icicles hanging off leaves
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.EVERFROST_LOG);
      }

      const topY = groundY + trunkHeight + 2;
      setVoxel(wx, topY, wz, BlockType.EVERFROST_LEAVES);

      // Top cross
      for (const [dx, dz] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
        setVoxel(wx + dx, topY - 1, wz + dz, BlockType.EVERFROST_LEAVES);
      }

      // Tiers down
      for (let y = topY - 2; y >= groundY + 3; y--) {
        const distFromTop = topY - y;
        const tier = Math.floor(distFromTop / 2);
        const isSkirt = distFromTop % 2 === 1;
        const r = isSkirt ? Math.min(3, tier + 1) : Math.min(3, tier);

        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const dSq = dx * dx + dz * dz;
            if (dSq <= r * r + (isSkirt ? 0.6 : -0.2)) {
              if (dx === 0 && dz === 0 && y <= groundY + trunkHeight) continue;
              setVoxel(wx + dx, y, wz + dz, BlockType.EVERFROST_LEAVES);

              // Icicles hanging off of some leaves
              if (dSq >= (r - 1) * (r - 1) && y > groundY + 2) {
                const icicleChance = hash2(wx + dx, wz + dz, y * 23 + 717);
                if (icicleChance < 0.32) {
                  setVoxel(wx + dx, y - 1, wz + dz, BlockType.ICICLE);
                }
              }
            }
          }
        }
      }
    } else if (type === 'rainforest_oak') {
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.RAINFOREST_OAK_LOG);
      }
      const rocrownY = groundY + trunkHeight;
      const rocrownR = 3 + Math.floor(hash2(wx, wz, 811) * 3);
      for (let dy = -1; dy <= 2; dy++) {
        const ror = dy === 2 ? rocrownR - 2 : (dy === 1 ? rocrownR : rocrownR - 0.5);
        for (let dx = -rocrownR; dx <= rocrownR; dx++) {
          for (let dz = -rocrownR; dz <= rocrownR; dz++) {
            if (Math.hypot(dx, dz) <= ror) {
              setVoxel(wx + dx, rocrownY + dy, wz + dz, BlockType.RAINFOREST_OAK_LEAVES);
            }
          }
        }
      }
    } else if (type === 'kapok') {
      const kapokCrownR = 5 + Math.floor(hash2(wx, wz, 812) * 3); // capped: was 6-9, now 5-7
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.KAPOK_LOG);
      }
      const kapokRoots: [number, number][] = [[2,0],[-2,0],[0,2],[0,-2],[1,1],[-1,1],[1,-1],[-1,-1]];
      for (const [rdx, rdz] of kapokRoots) {
        for (let ry = 0; ry <= 3; ry++) {
          const shrink = Math.floor(ry / 1.5);
          const fx = rdx - Math.sign(rdx) * Math.min(shrink, Math.abs(rdx) - 1);
          const fz = rdz - Math.sign(rdz) * Math.min(shrink, Math.abs(rdz) - 1);
          setVoxel(wx + fx, groundY + 1 + ry, wz + fz, BlockType.KAPOK_LOG);
        }
      }
      const kapokTop = groundY + trunkHeight;
      for (let dy = -3; dy <= 3; dy++) {
        const frac = dy / (kapokCrownR * 0.6);
        const lr = kapokCrownR * Math.sqrt(Math.max(0, 1 - frac * frac));
        for (let dx = -kapokCrownR; dx <= kapokCrownR; dx++) {
          for (let dz = -kapokCrownR; dz <= kapokCrownR; dz++) {
            if (Math.hypot(dx, dz) <= lr) {
              setVoxel(wx + dx, kapokTop + dy, wz + dz, BlockType.KAPOK_LEAVES);
            }
          }
        }
      }
    } else if (type === 'banyan') {
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.BANYAN_LOG);
      }
      const banyanCrownR = 4 + Math.floor(hash2(wx, wz, 813) * 2);
      const banyanTop = groundY + trunkHeight;
      for (let dy = -1; dy <= 2; dy++) {
        const br = dy === 2 ? banyanCrownR - 2 : banyanCrownR;
        for (let dx = -banyanCrownR; dx <= banyanCrownR; dx++) {
          for (let dz = -banyanCrownR; dz <= banyanCrownR; dz++) {
            if (Math.hypot(dx, dz) <= br) {
              setVoxel(wx + dx, banyanTop + dy, wz + dz, BlockType.BANYAN_LEAVES);
            }
          }
        }
      }
      for (let dx = -(banyanCrownR - 1); dx <= banyanCrownR - 1; dx++) {
        for (let dz = -(banyanCrownR - 1); dz <= banyanCrownR - 1; dz++) {
          const bdist = Math.hypot(dx, dz);
          if (bdist >= 2 && bdist <= banyanCrownR - 1 && hash2(wx + dx, wz + dz, 814) > 0.62) {
            const rootLen = 2 + Math.floor(hash2(wx + dx, wz + dz, 815) * 4);
            for (let rl = 1; rl <= rootLen; rl++) {
              setVoxel(wx + dx, banyanTop - rl, wz + dz, BlockType.BANYAN_LOG);
            }
          }
        }
      }
    } else if (type === 'mahogany') {
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.MAHOGANY_LOG);
      }
      const mahogTop = groundY + trunkHeight;
      const mahogTiers = [{dy:2,r:2.5},{dy:0,r:4.0},{dy:-2,r:3.2}];
      for (const {dy, r} of mahogTiers) {
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
            if (Math.hypot(dx, dz) <= r) {
              setVoxel(wx + dx, mahogTop + dy, wz + dz, BlockType.MAHOGANY_LEAVES);
            }
          }
        }
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.hypot(dx, dz) <= 1.8) {
              setVoxel(wx + dx, mahogTop + dy + 1, wz + dz, BlockType.MAHOGANY_LEAVES);
            }
          }
        }
      }
    } else if (type === 'strangler') {
      let scx = wx;
      let scz = wz;
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(scx, y, scz, BlockType.STRANGLER_LOG);
        if (y === groundY + 4 && hash2(wx, wz, y) > 0.5) scx += 1;
        if (y === groundY + 7 && hash2(wx, wz, y * 2) > 0.5) scz += 1;
      }
      const numClusters = 4 + Math.floor(hash2(wx, wz, 820) * 2);
      for (let ci = 0; ci < numClusters; ci++) {
        const angle = (ci / numClusters) * Math.PI * 2 + hash2(wx + ci, wz, 821) * 0.8;
        const cdist = 1 + Math.floor(hash2(wx, wz + ci, 822) * 3);
        const clx = scx + Math.round(Math.cos(angle) * cdist);
        const clz = scz + Math.round(Math.sin(angle) * cdist);
        const cly = groundY + trunkHeight + Math.floor(hash2(wx + ci, wz + ci, 823) * 2);
        const cr = 1.8 + hash2(wx + ci, wz, 824) * 1.2;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (Math.hypot(dx, dz) <= cr - Math.abs(dy) * 0.5) {
                setVoxel(clx + dx, cly + dy, clz + dz, BlockType.STRANGLER_LEAVES);
              }
            }
          }
        }
      }
    } else if (type === 'ceiba') {
      const ceibaCrownR = 6 + Math.floor(hash2(wx, wz, 830) * 3); // capped: was 7-10, now 6-8
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.CEIBA_LOG);
      }
      const ceibaRoots: [number, number][] = [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,2],[2,-2],[-2,-2]];
      for (const [rdx, rdz] of ceibaRoots) {
        for (let ry = 0; ry <= 5; ry++) {
          const shrink = Math.floor(ry / 1.2);
          const fx = rdx - Math.sign(rdx) * Math.min(shrink, Math.abs(rdx) - 1);
          const fz = rdz - Math.sign(rdz) * Math.min(shrink, Math.abs(rdz) - 1);
          setVoxel(wx + fx, groundY + 1 + ry, wz + fz, BlockType.CEIBA_LOG);
        }
      }
      const ceibaTop = groundY + trunkHeight;
      const ceibaLayers = [{dy:0,r:ceibaCrownR},{dy:1,r:ceibaCrownR-1},{dy:2,r:ceibaCrownR-3}];
      for (const {dy, r} of ceibaLayers) {
        for (let dx = -ceibaCrownR; dx <= ceibaCrownR; dx++) {
          for (let dz = -ceibaCrownR; dz <= ceibaCrownR; dz++) {
            if (Math.hypot(dx, dz) <= r) {
              setVoxel(wx + dx, ceibaTop + dy, wz + dz, BlockType.CEIBA_LEAVES);
            }
          }
        }
      }
      setVoxel(wx, ceibaTop + 3, wz, BlockType.CEIBA_LEAVES);
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
        setVoxel(wx + dx, ceibaTop + 3, wz + dz, BlockType.CEIBA_LEAVES);
      }
    } else {
      // Oak Tree
      for (let y = groundY + 1; y <= groundY + trunkHeight; y++) {
        setVoxel(wx, y, wz, BlockType.OAK_WOOD);
      }
      const crownY = groundY + trunkHeight;
      for (let dy = -1; dy <= 2; dy++) {
        const r = dy === 2 ? 1.5 : (dy === 1 ? 2.5 : 2.8);
        const rInt = Math.ceil(r);
        for (let dx = -rInt; dx <= rInt; dx++) {
          for (let dz = -rInt; dz <= rInt; dz++) {
            if (Math.hypot(dx, dz) <= r) {
              if (dy <= 0 && dx === 0 && dz === 0) continue;
              setVoxel(wx + dx, crownY + dy, wz + dz, BlockType.OAK_LEAVES);
            }
          }
        }
      }
    }
  }

  private isRainforestLeavesBlock(type: BlockType): boolean {
    return (
      type === BlockType.RAINFOREST_OAK_LEAVES ||
      type === BlockType.KAPOK_LEAVES ||
      type === BlockType.BANYAN_LEAVES ||
      type === BlockType.STRANGLER_LEAVES ||
      type === BlockType.MAHOGANY_LEAVES ||
      type === BlockType.CEIBA_LEAVES
    );
  }

  public getTreeBlockAt(wx: number, wy: number, wz: number): BlockType {
    // Max canopy radius varies by tree type: ceiba/kapok reach out ~8 horizontally, others ~5-6
    // Use 8 as safe upper bound for cell search range
    const SEARCH_R = 8;
    const minCellX = Math.floor((wx - SEARCH_R) / 6);
    const maxCellX = Math.floor((wx + SEARCH_R) / 6);
    const minCellZ = Math.floor((wz - SEARCH_R) / 6);
    const maxCellZ = Math.floor((wz + SEARCH_R) / 6);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const tree = this.getTreeInCell(cx, cz);
        if (!tree) continue;

        // Per-tree-type max horizontal reach and vertical crown height for early rejection
        let maxHReach: number;
        let maxCrownAbove: number;
        switch (tree.type) {
          case 'ceiba':    maxHReach = 8;  maxCrownAbove = 3; break;
          case 'kapok':    maxHReach = 7;  maxCrownAbove = 3; break;
          case 'banyan':   maxHReach = 6;  maxCrownAbove = 2; break;
          case 'limeleaf': maxHReach = 4;  maxCrownAbove = 2; break;
          case 'redwood':  maxHReach = 3;  maxCrownAbove = 2; break;
          case 'everfrost': maxHReach = 3; maxCrownAbove = 2; break;
          case 'mahogany': maxHReach = 5;  maxCrownAbove = 2; break;
          case 'strangler': maxHReach = 5; maxCrownAbove = 2; break;
          case 'rainforest_oak': maxHReach = 5; maxCrownAbove = 2; break;
          default:         maxHReach = 5;  maxCrownAbove = 2; break;
        }

        // Horizontal distance check
        if (Math.abs(wx - tree.wx) > maxHReach || Math.abs(wz - tree.wz) > maxHReach) continue;
        // Vertical range check
        if (wy < tree.groundY || wy > tree.groundY + tree.trunkHeight + maxCrownAbove) continue;

        let foundBlock: BlockType = BlockType.AIR;
        this.stampTree(tree, (bx, by, bz, bType) => {
          if (bx === wx && by === wy && bz === wz) {
            if (foundBlock === BlockType.AIR || isLogBlock(bType)) {
              foundBlock = bType;
            }
          }
        });
        if (foundBlock !== BlockType.AIR) return foundBlock;
      }
    }
    return BlockType.AIR;
  }

  public getSurfaceFloraAt(wx: number, surfaceY: number, wz: number, subBiome: VerdantSubBiomeDef): BlockType {
    // Avoid a full getBiomeParameters (7 noise calls) — the subBiome flags cover all known arctic types.
    // The temperature fallback is only needed for edge cases not covered by flags.
    const isArcticZone = subBiome.isArctic || subBiome.category === 'arctic' || subBiome.surfaceBlock === BlockType.SNOW;

    if (surfaceY <= SEA_LEVEL) {
      if (isArcticZone) {
        // "their top level of water (as well as all other water exposed to air) is turned into ice and no vegitation grows in the river"
        return BlockType.AIR;
      }
      // In river or shallow water shorelines
      if (subBiome.isRiver || subBiome.isRivermouth) {
        const rFloraHash = hash2(wx, wz, 717);
        if (rFloraHash < 0.18) return BlockType.WATER_REED;
        if (rFloraHash < 0.32) return BlockType.LILYPAD;
        if (rFloraHash < 0.44) return BlockType.WATER_ALGAE;
        return BlockType.AIR;
      }
      return BlockType.AIR;
    }

    // 1. Decayed Biomes (Decayed Forest, Decayed Fields)
    // "withered and dead plants (make 5 new plants exclusive to these biomes) sit sparsely along the ground, there is no grass but rather just dirt"
    if (subBiome.isDecayed) {
      const dHash = hash2(wx, wz, 555);
      if (dHash > subBiome.flowerFrequency) return BlockType.AIR;
      const selector = hash2(wx, wz, 666);
      if (selector < 0.22) return BlockType.WITHERED_SHRUB;
      if (selector < 0.44) return BlockType.PALE_GHOST_FLOWER;
      if (selector < 0.64) return BlockType.DEATH_CAP_MUSHROOM;
      if (selector < 0.82) return BlockType.ASHEN_BRUSH;
      return BlockType.SICKLY_BRIAR;
    }

    // 2. Desert Biomes (houses 4 Cacti types, Oasis)
    if (subBiome.isDesert) {
      if (subBiome.id === 'desert_oasis') {
        const oHash = hash2(wx, wz, 777);
        if (oHash < 0.25) return BlockType.WATER_REED;
        if (oHash < 0.40) return BlockType.VERDANT_SHRUB;
        if (oHash < 0.52) return BlockType.BARREL_CACTUS;
        if (oHash < 0.60) return BlockType.PRICKLY_PEAR;
        return BlockType.AIR;
      }

      // Desert cactus flora (single-block cacti: barrel cactus, prickly pear, flowering torch)
      const cHash = hash2(wx, wz, 888);
      const density = subBiome.cactusDensity ?? 0.2;
      if (cHash > density * 0.18) return BlockType.AIR;

      const cTypeSel = hash2(wx, wz, 999);
      if (cTypeSel < 0.42) return BlockType.BARREL_CACTUS;
      if (cTypeSel < 0.76) return BlockType.PRICKLY_PEAR;
      return BlockType.FLOWERING_TORCH_CACTUS;
    }

    // 3. Riverbanks
    if (subBiome.isRiver || subBiome.isRivermouth) {
      if (isArcticZone) {
        return BlockType.AIR;
      }
      const rbHash = hash2(wx, wz, 333);
      if (rbHash < 0.22) return BlockType.WATER_REED;
      if (rbHash < 0.35) return BlockType.VERDANT_SHRUB;
      return BlockType.AIR;
    }

    // 4. Arctic Biomes (Ferns, Snowdrops, Arctic Fruit, Frost Fern, Wintercrest, Frost Lichen)
    if (subBiome.isArctic || subBiome.category === 'arctic') {
      if (subBiome.isEversnow) {
        // "very cold and very little vegetitation, called the Eversnow biome"
        const eHash = hash2(wx, wz, 707);
        if (eHash < 0.003) return BlockType.WINTERCREST;
        return BlockType.AIR;
      }

      if (subBiome.flowerFrequency <= 0) return BlockType.AIR;
      const aHash = hash2(wx, wz, 707);
      if (aHash > subBiome.flowerFrequency) return BlockType.AIR;

      const selector = hash2(wx, wz, 808);

      if (subBiome.id === 'everfrost_forest') {
        if (selector < 0.26) return BlockType.SNOWDROP;
        if (selector < 0.50) return BlockType.FROST_FERN;
        if (selector < 0.72) return BlockType.ARCTIC_FRUIT;
        if (selector < 0.88) return BlockType.JADELEAF_FERN;
        return BlockType.WINTERCREST;
      }

      if (subBiome.id === 'glacial_taiga') {
        if (selector < 0.30) return BlockType.SNOWDROP;
        if (selector < 0.55) return BlockType.FROST_FERN;
        if (selector < 0.78) return BlockType.ARCTIC_FRUIT;
        return BlockType.JADELEAF_FERN;
      }

      if (subBiome.id === 'frost_hollow') {
        if (selector < 0.38) return BlockType.ARCTIC_FRUIT;
        if (selector < 0.68) return BlockType.SNOWDROP;
        if (selector < 0.88) return BlockType.FROST_FERN;
        return BlockType.WINTERCREST;
      }

      if (subBiome.id === 'boreal_drift') {
        if (selector < 0.40) return BlockType.SNOWDROP;
        if (selector < 0.70) return BlockType.FROST_FERN;
        if (selector < 0.88) return BlockType.WINTERCREST;
        return BlockType.ARCTIC_FRUIT;
      }

      if (subBiome.id === 'frozen_tundra') {
        if (selector < 0.42) return BlockType.FROST_LICHEN;
        if (selector < 0.72) return BlockType.ARCTIC_FRUIT;
        return BlockType.WINTERCREST;
      }

      if (subBiome.id === 'frozen_wetland') {
        if (selector < 0.35) return BlockType.FROST_FERN;
        if (selector < 0.65) return BlockType.JADELEAF_FERN;
        if (selector < 0.85) return BlockType.SNOWDROP;
        return BlockType.ARCTIC_FRUIT;
      }

      if (subBiome.id === 'frostbite_peaks' || subBiome.id === 'rime_crag') {
        if (selector < 0.55) return BlockType.WINTERCREST;
        return BlockType.FROST_LICHEN;
      }

      if (subBiome.id === 'snowy_shoreline') {
        // Sparse winter plants: Snowdrop, Frost Fern, Wintercrest, Arctic Fruit, Frost Lichen
        if (selector < 0.28) return BlockType.SNOWDROP;
        if (selector < 0.52) return BlockType.FROST_FERN;
        if (selector < 0.74) return BlockType.WINTERCREST;
        if (selector < 0.88) return BlockType.ARCTIC_FRUIT;
        return BlockType.FROST_LICHEN;
      }

      if (selector < 0.35) return BlockType.SNOWDROP;
      if (selector < 0.65) return BlockType.FROST_FERN;
      if (selector < 0.85) return BlockType.ARCTIC_FRUIT;
      return BlockType.WINTERCREST;
    }

    // Rainforest exclusive flora
    if (subBiome.isRainforest) {
      const rfHash = hash2(wx, wz, 555);
      if (rfHash > subBiome.flowerFrequency) return BlockType.AIR;
      const rfSel = hash2(wx, wz, 556);
      if (subBiome.id === 'rainforest_bamboo_grove') {
        if (rfSel < 0.32) return BlockType.GIANT_FERN;
        if (rfSel < 0.60) return BlockType.LIANA_BUSH;
        if (rfSel < 0.72) return BlockType.ORCHID;
        if (rfSel < 0.84) return BlockType.HELICONIA;
        return BlockType.PITCHER_PLANT;
      }
      if (subBiome.id === 'rainforest_canopy' || subBiome.id === 'rainforest_ancient_grove') {
        if (rfSel < 0.25) return BlockType.GIANT_FERN;
        if (rfSel < 0.45) return BlockType.LIANA_BUSH;
        if (rfSel < 0.62) return BlockType.HELICONIA;
        if (rfSel < 0.76) return BlockType.ORCHID;
        if (rfSel < 0.88) return BlockType.PITCHER_PLANT;
        return BlockType.JUNGLE_MUSHROOM;
      }
      if (subBiome.id === 'rainforest_flood_plain' || subBiome.id === 'rainforest_river_delta' || subBiome.id === 'rainforest_mangrove_swamp') {
        if (rfSel < 0.35) return BlockType.GIANT_FERN;
        if (rfSel < 0.60) return BlockType.JUNGLE_MUSHROOM;
        if (rfSel < 0.78) return BlockType.LIANA_BUSH;
        return BlockType.PITCHER_PLANT;
      }
      if (rfSel < 0.20) return BlockType.HELICONIA;
      if (rfSel < 0.40) return BlockType.GIANT_FERN;
      if (rfSel < 0.58) return BlockType.ORCHID;
      if (rfSel < 0.74) return BlockType.PITCHER_PLANT;
      if (rfSel < 0.88) return BlockType.JUNGLE_MUSHROOM;
      return BlockType.LIANA_BUSH;
    }

    if (subBiome.category !== 'verdant') return BlockType.AIR;
    if (subBiome.flowerFrequency <= 0) return BlockType.AIR;

    const fHash = hash2(wx, wz, 707);
    if (fHash > subBiome.flowerFrequency) return BlockType.AIR;

    const selector = hash2(wx, wz, 808);

    if (subBiome.id === 'clover_prairie') {
      if (selector < 0.38) return BlockType.SUNFLOWER;
      if (selector < 0.62) return BlockType.ORO_FLOWER;
      if (selector < 0.82) return BlockType.GOLDEN_BLOOM_BUSH;
      return BlockType.ROSEBUSH;
    }

    if (subBiome.id === 'verdant_plains_meadow') {
      if (selector < 0.25) return BlockType.SUNFLOWER;
      if (selector < 0.45) return BlockType.ROSEBUSH;
      if (selector < 0.65) return BlockType.BELL_LILY;
      if (selector < 0.82) return BlockType.VERDANT_SHRUB;
      return BlockType.BERRY_BUSH;
    }

    if (subBiome.id === 'mist_highlands') {
      if (selector < 0.30) return BlockType.BELL_LILY;
      if (selector < 0.55) return BlockType.JADELEAF_FERN;
      if (selector < 0.80) return BlockType.BERRY_BUSH;
      return BlockType.VERDANT_SHRUB;
    }

    if (subBiome.id === 'emerald_knolls') {
      if (selector < 0.25) return BlockType.JADELEAF_FERN;
      if (selector < 0.48) return BlockType.ORO_FLOWER;
      if (selector < 0.70) return BlockType.ROSEBUSH;
      if (selector < 0.85) return BlockType.VERDANT_SHRUB;
      return BlockType.GOLDEN_BLOOM_BUSH;
    }

    if (subBiome.id === 'crag_ridge') {
      if (selector < 0.40) return BlockType.THORN_BUSH;
      if (selector < 0.70) return BlockType.BELL_LILY;
      return BlockType.BERRY_BUSH;
    }

    if (subBiome.id === 'verdant_steppe') {
      if (selector < 0.40) return BlockType.THORN_BUSH;
      if (selector < 0.70) return BlockType.SUNFLOWER;
      return BlockType.GOLDEN_BLOOM_BUSH;
    }

    if (subBiome.id === 'fractured_terraces') {
      if (selector < 0.30) return BlockType.ROSEBUSH;
      if (selector < 0.55) return BlockType.BERRY_BUSH;
      if (selector < 0.75) return BlockType.THORN_BUSH;
      return BlockType.JADELEAF_FERN;
    }

    if (subBiome.id === 'verdant_spires') {
      if (selector < 0.35) return BlockType.ORO_FLOWER;
      if (selector < 0.70) return BlockType.JADELEAF_FERN;
      return BlockType.BELL_LILY;
    }

    if (subBiome.id === 'verdant_marsh' || subBiome.id === 'phosphor_fen') {
      if (selector < 0.40) return BlockType.JADELEAF_FERN;
      if (selector < 0.70) return BlockType.MARSHROOT;
      return BlockType.VERDANT_SHRUB;
    }

    if (selector < 0.25) return BlockType.JADELEAF_FERN;
    if (selector < 0.50) return BlockType.SUNFLOWER;
    if (selector < 0.75) return BlockType.ROSEBUSH;
    return BlockType.VERDANT_SHRUB;
  }

  /**
   * Pure procedural block evaluator for any world coordinate.
   * Ensures 100% boundary consistency across loaded/unloaded chunks.
   */
  public getProceduralBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_H) return BlockType.AIR;
    if (wy === 0) return BlockType.OBSIDIAN;

    const subBiome = this.getSubBiomeAt(wx, wz);
    const surfaceY = this.getHeightAt(wx, wz, subBiome);

    // Glaciers in Frozen Ocean
    if (subBiome.hasGlaciers) {
      const gNoise = this.noiseGlacier.fbm2D(wx * 0.035, wz * 0.035, 2, 2.0, 0.5);
      if (gNoise > 0.32) {
        const peakHeight = Math.round(SEA_LEVEL + 6 + (gNoise - 0.32) * 38);
        if (wy >= surfaceY && wy <= peakHeight) {
          if (wy >= peakHeight - 1 && wy > SEA_LEVEL) {
            return BlockType.SNOW;
          }
          return BlockType.PACKED_ICE;
        }
      }
    }

    // Coral Reefs in Coral Cove
    if (subBiome.hasCoralReef && wy > surfaceY && wy <= surfaceY + 4 && wy < SEA_LEVEL - 1) {
      const coralNoise = this.noiseFlora.fbm2D(wx * 0.08, wz * 0.08, 2, 2.0, 0.5);
      if (coralNoise > 0.3) {
        return BlockType.CORAL_BLOCK;
      }
    }

    // Glowing red flora in Abyssal Trenches
    if (subBiome.hasTrenchFissure && wy > surfaceY && wy <= surfaceY + 6 && wy < SEA_LEVEL - 15) {
      const floraNoise = this.noiseFlora.fbm2D(wx * 0.12, wz * 0.12, 2, 2.0, 0.5);
      if (wy === surfaceY + 1) {
        if (floraNoise > 0.55) return BlockType.ABYSSAL_CRIMSON_VENT;
        if (floraNoise > 0.28) return BlockType.CRIMSON_TENDRIL;
      } else if (floraNoise > 0.42 && wy <= surfaceY + 5) {
        return BlockType.BLOOD_KELP;
      }
    }

    // 1. Surface cave entrances
    const river = this.riverSystem.getRiverSample(wx, wz);
    const inRiverZone = (river.inRiver || river.inShore) && wy >= SEA_LEVEL - 6 && wy <= SEA_LEVEL + 2;
    if (!inRiverZone) {
      const entranceVoxel = this.surfaceCaveSystem.evaluateVoxel(wx, wy, wz);
      if (entranceVoxel) {
        if (entranceVoxel.isAir) return BlockType.AIR;
        if (entranceVoxel.isFloor) return BlockType.COBBLESTONE;
      }
    }

    // 2. Subterranean Underground Cave Systems (Air on land, Water in oceans, Cryo in frozen zones)
    if (wy <= surfaceY && wy > 0) {
      if (this.isCave(wx, wy, wz)) {
        const params = this.getBiomeParameters(wx, wz);
        const isOceanic = params.continentalness < -0.26;
        const isFrozenCave = params.temperature < -0.15;
        const isFloorBelow = !this.isCave(wx, wy - 1, wz);

        if (isFloorBelow && wy <= 65) {
          if (isOceanic) {
            if (isFrozenCave) {
              const cyroNoise = this.noiseFlora.fbm2D(wx * 0.15, wz * 0.15, 2, 2.0, 0.5);
              if (cyroNoise > 0.18) return BlockType.CYRO_LILY;
              return BlockType.AIR;
            }

            const floraNoise = this.noiseFlora.fbm2D(wx * 0.12, wz * 0.12, 2, 2.0, 0.5);
            if (floraNoise > 0.60) return BlockType.ABYSSAL_CRIMSON_VENT;
            if (floraNoise > 0.30) return BlockType.CRIMSON_TENDRIL;
          } else {
            return BlockType.COBBLESTONE;
          }
        }

        if (isOceanic) {
          return isFrozenCave ? BlockType.AIR : BlockType.WATER;
        }
        return BlockType.AIR;
      }
    }

    // Solid ground layers
    if (wy <= surfaceY) {
      if (wy === surfaceY) {
        // Ice puddles in sub-biomes with hasIcePuddles
        const waterLevel = SEA_LEVEL;
        if (subBiome.hasIcePuddles && surfaceY > waterLevel) {
          const puddleNoise = this.noiseFlora.fbm2D(wx * 0.08, wz * 0.08, 2, 2.0, 0.5);
          if (puddleNoise > 0.26 && puddleNoise < 0.58) {
            return BlockType.PACKED_ICE;
          }
        }

        const river = this.riverSystem.getRiverSample(wx, wz);
        if (river.inShore) {
          if (subBiome.isArctic || subBiome.category === 'arctic') return BlockType.SNOW;
          if (river.shoreType === 'sand') return BlockType.SAND;
          if (river.shoreType === 'dirt') return BlockType.DIRT;
          return BlockType.STONE;
        }
        if (subBiome.category === 'ocean' && surfaceY < SEA_LEVEL) {
          return subBiome.surfaceBlock;
        }
        return surfaceY < SEA_LEVEL ? BlockType.DIRT : subBiome.surfaceBlock;
      }
      // Eversnow snow stack depth
      const snowDepth = subBiome.snowStackHeight ?? (subBiome.isEversnow ? 6 : 1);
      if (snowDepth > 1 && wy >= surfaceY - (snowDepth - 1)) {
        return BlockType.SNOW;
      }
      if (wy >= surfaceY - 3) {
        return subBiome.subSurfaceBlock;
      }
      return BlockType.STONE;
    }

    // Tree blocks above ground
    if (wy > surfaceY) {
      const treeBlock = this.getTreeBlockAt(wx, wy, wz);
      if (treeBlock !== BlockType.AIR) return treeBlock;
    }

    // Rainforest vines are now stamped during generateChunk (post-tree pass).
    // getProceduralBlock only needs to return them for unloaded neighbor chunks.
    if (subBiome.isRainforest && wy > surfaceY && wy < surfaceY + 40) {
      const blockAbove = this.getTreeBlockAt(wx, wy + 1, wz);
      if (this.isRainforestLeavesBlock(blockAbove)) {
        const vineNoise = this.noiseFlora.fbm2D(wx * 0.35, wz * 0.35, 2, 2.0, 0.5);
        if (vineNoise > 0.18) return BlockType.VINE;
      }
    }

    // Water level for flora placement
    const waterLevel = SEA_LEVEL;
    
    // Surface flora & bushes (plants must NEVER replace logs, tree blocks, or ice puddles)
    if (wy === surfaceY + 1 && surfaceY > waterLevel) {
      if (subBiome.hasIcePuddles) {
        const puddleNoise = this.noiseFlora.fbm2D(wx * 0.08, wz * 0.08, 2, 2.0, 0.5);
        if (puddleNoise > 0.26 && puddleNoise < 0.58) {
          return BlockType.AIR;
        }
      }
      if (this.getTreeBlockAt(wx, wy, wz) !== BlockType.AIR) {
        return this.getTreeBlockAt(wx, wy, wz);
      }
      const flora = this.getSurfaceFloraAt(wx, surfaceY, wz, subBiome);
      if (flora !== BlockType.AIR) return flora;
    }

    // Tall Sunflowers
    if (wy === surfaceY + 2 && surfaceY > waterLevel) {
      if (this.getTreeBlockAt(wx, wy, wz) !== BlockType.AIR) {
        return this.getTreeBlockAt(wx, wy, wz);
      }
      const flora = this.getSurfaceFloraAt(wx, surfaceY, wz, subBiome);
      if (flora === BlockType.SUNFLOWER && hash2(wx, wz, 999) > 0.45) {
        return BlockType.SUNFLOWER;
      }
    }

    // Water reeds & lilypads (never replace tree blocks or logs, never in arctic biomes)
    const isArcticZone = subBiome.isArctic || subBiome.category === 'arctic' || subBiome.surfaceBlock === BlockType.SNOW;
    if (!isArcticZone && (subBiome.hasReedsOrLilypads || subBiome.hasMudPuddles)) {
      if (this.getTreeBlockAt(wx, wy, wz) !== BlockType.AIR) {
        return this.getTreeBlockAt(wx, wy, wz);
      }
      // Oasis water plants use same standard water level as all other wet biomes
      if (surfaceY < waterLevel && wy === waterLevel + 1) {
          const padNoise = this.noiseFlora.fbm2D(wx * 0.18, wz * 0.18, 2, 2.0, 0.5);
          if (padNoise > 0.42 && padNoise < 0.68) return BlockType.LILYPAD;
        } else if ((surfaceY === waterLevel - 1 || surfaceY === waterLevel || surfaceY === waterLevel + 1) && (wy === surfaceY + 1 || wy === surfaceY + 2)) {
          const reedNoise = this.noiseFlora.fbm2D(wx * 0.22, wz * 0.22, 2, 2.0, 0.5);
          if (reedNoise > 0.32 && reedNoise < 0.60) {
            if (wy === surfaceY + 1) return BlockType.WATER_REED;
            if (reedNoise > 0.48) return BlockType.WATER_REED;
          }
        }
    }

    // Tall Kelp in Oceans (User request: "and add tall kelp to Oceans")
    if (
      !isArcticZone &&
      subBiome.category === 'ocean' &&
      !subBiome.hasTrenchFissure &&
      !subBiome.hasGlaciers &&
      surfaceY <= SEA_LEVEL - 6
    ) {
      const kelpNoise = this.noiseFlora.fbm2D(wx * 0.07, wz * 0.07, 2, 2.0, 0.5);
      if (kelpNoise > 0.12) {
        const heightVar = Math.round((kelpNoise - 0.12) * 18);
        const targetHeight = Math.min(SEA_LEVEL - 2, surfaceY + 5 + heightVar);
        if (wy > surfaceY && wy <= targetHeight) {
          return BlockType.TALL_KELP;
        }
      }
    }

    // Shoreline Water Flora (User request: "small kelp and seagrass and algae to the water part of shorelines")
    if (!isArcticZone && surfaceY < SEA_LEVEL && surfaceY >= SEA_LEVEL - 7) {
      const aquaticNoise = this.noiseFlora.fbm2D(wx * 0.16, wz * 0.16, 2, 2.0, 0.5);
      if (wy === surfaceY + 1) {
        if (aquaticNoise > 0.16 && aquaticNoise < 0.44) return BlockType.SEAGRASS;
        if (aquaticNoise > -0.15 && aquaticNoise < 0.12) return BlockType.SMALL_KELP;
        if (aquaticNoise < -0.22 && aquaticNoise > -0.52) return BlockType.WATER_ALGAE;
      } else if (wy === surfaceY + 2 && aquaticNoise > 0.35 && surfaceY + 2 <= SEA_LEVEL - 1) {
        return BlockType.SEAGRASS;
      }
    }

    // Dried Up Seaweed (User request: "Add dried up seaweed, lays flat rarely on shorelines")
    const isShoreline =
      !isArcticZone &&
      (subBiome.shoreType !== undefined ||
      subBiome.id === 'sandy_shoreline' ||
      subBiome.id === 'stone_cliff_shoreline' ||
      (surfaceY >= SEA_LEVEL && surfaceY <= SEA_LEVEL + 4 && subBiome.surfaceBlock === BlockType.SAND));
    if (isShoreline && surfaceY >= SEA_LEVEL && surfaceY <= SEA_LEVEL + 4 && wy === surfaceY + 1) {
      const driedNoise = this.noiseFlora.fbm2D(wx * 0.32, wz * 0.32, 2, 2.0, 0.5);
      if (driedNoise > 0.56 && driedNoise < 0.61) {
        return BlockType.DRIED_SEAWEED;
      }
    }

    // Water level filling
    if (wy <= SEA_LEVEL) {
      if (isArcticZone && wy === SEA_LEVEL && surfaceY < SEA_LEVEL) {
        // "their top level of water (as well as all other water exposed to air) is turned into ice"
        return BlockType.PACKED_ICE;
      }
      return BlockType.WATER;
    }

    return BlockType.AIR;
  }

  public generateChunk(
    cx: number,
    cz: number,
    modifiedBlocks: Map<string, BlockType>
  ): Chunk {
    const chunkOriginX = cx * CHUNK_W;
    const chunkOriginZ = cz * CHUNK_D;

    // Sample sub-biome at chunk center for primary chunk identity
    const centerSubBiome = this.getSubBiomeAt(chunkOriginX + CHUNK_W / 2, chunkOriginZ + CHUNK_D / 2);
    const chunk = new Chunk(
      cx,
      cz,
      centerSubBiome.mainBiome,
      centerSubBiome.name,
      centerSubBiome.id
    );
    chunk.isSicklyWater = !!centerSubBiome.isSicklyWater;
    const voxels = chunk.voxels;

    let maxChunkY = SEA_LEVEL;

    // Per-column cache: avoids recomputing subBiome/surfaceY/isArcticZone/params in the flora pass
    const colSubBiomeCache: VerdantSubBiomeDef[] = new Array(CHUNK_W * CHUNK_D);
    const colSurfaceYCache: number[] = new Array(CHUNK_W * CHUNK_D);
    const colIsArcticCache: boolean[] = new Array(CHUNK_W * CHUNK_D);

    // 1. Column Terrain Generation
    for (let lz = 0; lz < CHUNK_D; lz++) {
      const wz = chunkOriginZ + lz;
      const zOffset = lz * CHUNK_W;

      for (let lx = 0; lx < CHUNK_W; lx++) {
        const wx = chunkOriginX + lx;
        const colIdx = lx + zOffset;

        // Compute biome parameters ONCE per column — used for subBiome, surface height,
        // isArcticZone, and the underground cave loop. Eliminates 7+ redundant fbm2D calls.
        const colBiomeParams = this.getBiomeParameters(wx, wz);
        const subBiome = this.getSubBiomeAt(wx, wz);
        const surfaceY = this.getHeightAt(wx, wz, subBiome);

        if (surfaceY > maxChunkY) {
          maxChunkY = surfaceY;
        }

        // Y = 0: Indestructible Obsidian Bedrock
        voxels[colIdx] = BlockType.OBSIDIAN;

        // Fill underground & surface layers
        const isArcticZone = Boolean(subBiome.isArctic || subBiome.category === 'arctic' || subBiome.surfaceBlock === BlockType.SNOW || subBiome.isEversnow);

        // Store in per-column cache for reuse in the flora pass below
        const colCacheIdx = lx + lz * CHUNK_W;
        colSubBiomeCache[colCacheIdx] = subBiome;
        colSurfaceYCache[colCacheIdx] = surfaceY;
        colIsArcticCache[colCacheIdx] = isArcticZone;
        const snowDepth = subBiome.snowStackHeight ?? (subBiome.isEversnow ? 6 : 1);

        for (let y = 1; y <= surfaceY; y++) {
          const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);

          if (y === surfaceY) {
            let placedSurface = false;
            // Ice puddles in sub-biomes with hasIcePuddles
            const waterLevel = SEA_LEVEL;
            if (subBiome.hasIcePuddles && surfaceY > waterLevel) {
              const puddleNoise = this.noiseFlora.fbm2D(wx * 0.08, wz * 0.08, 2, 2.0, 0.5);
              if (puddleNoise > 0.26 && puddleNoise < 0.58) {
                voxels[voxelIdx] = BlockType.PACKED_ICE;
                placedSurface = true;
              }
            }

            if (!placedSurface) {
              const river = this.riverSystem.getRiverSample(wx, wz);
              if (river.inShore) {
                if (isArcticZone) voxels[voxelIdx] = BlockType.SNOW;
                else if (river.shoreType === 'sand') voxels[voxelIdx] = BlockType.SAND;
                else if (river.shoreType === 'dirt') voxels[voxelIdx] = BlockType.DIRT;
                else voxels[voxelIdx] = BlockType.STONE;
              } else if (subBiome.category === 'ocean' && surfaceY < SEA_LEVEL) {
                voxels[voxelIdx] = subBiome.surfaceBlock;
              } else if (surfaceY < SEA_LEVEL) {
                // When below sea level, use the biome's surface block for proper water/terrain interaction
                // This allows oasis, floodplains, swamps, etc to have proper surface terrain below water
                voxels[voxelIdx] = subBiome.surfaceBlock;
              } else {
                voxels[voxelIdx] = subBiome.surfaceBlock;
              }
            }
          } else if (snowDepth > 1 && y >= surfaceY - (snowDepth - 1)) {
            // Eversnow and arctic sub-biomes with deep snow stacks
            voxels[voxelIdx] = BlockType.SNOW;
          } else if (y >= surfaceY - 3) {
            voxels[voxelIdx] = subBiome.subSurfaceBlock;
          } else {
            voxels[voxelIdx] = BlockType.STONE;
          }
        }

        // Water filling
        if (surfaceY < SEA_LEVEL) {
          for (let y = surfaceY + 1; y <= SEA_LEVEL; y++) {
            const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);
            if (isArcticZone && y === SEA_LEVEL) {
              voxels[voxelIdx] = BlockType.PACKED_ICE;
            } else {
              voxels[voxelIdx] = BlockType.WATER;
            }
          }
        }

        // Feature: Glaciers in Frozen Ocean
        if (subBiome.hasGlaciers) {
          const gNoise = this.noiseGlacier.fbm2D(wx * 0.035, wz * 0.035, 2, 2.0, 0.5);
          if (gNoise > 0.32) {
            const peakHeight = Math.min(CHUNK_H - 10, Math.round(SEA_LEVEL + 6 + (gNoise - 0.32) * 38));
            if (peakHeight > maxChunkY) maxChunkY = peakHeight;

            for (let y = surfaceY; y <= peakHeight; y++) {
              const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);
              if (y >= peakHeight - 1 && y > SEA_LEVEL) {
                voxels[voxelIdx] = BlockType.SNOW;
              } else {
                voxels[voxelIdx] = BlockType.PACKED_ICE;
              }
            }
          }
        }

        // Feature: Coral Reefs in Coral Cove
        if (subBiome.hasCoralReef) {
          const coralNoise = this.noiseFlora.fbm2D(wx * 0.08, wz * 0.08, 2, 2.0, 0.5);
          if (coralNoise > 0.3) {
            const reefTop = Math.min(SEA_LEVEL - 2, surfaceY + Math.round((coralNoise - 0.3) * 10) + 1);
            for (let y = surfaceY + 1; y <= reefTop; y++) {
              const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);
              voxels[voxelIdx] = BlockType.CORAL_BLOCK;
            }
          }
        }

        // Feature: Glowing red flora in Trenches
        if (subBiome.hasTrenchFissure) {
          const floraNoise = this.noiseFlora.fbm2D(wx * 0.12, wz * 0.12, 2, 2.0, 0.5);
          if (floraNoise > 0.55) {
            // Hydrothermal red vent
            const voxelIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);
            voxels[voxelIdx] = BlockType.ABYSSAL_CRIMSON_VENT;
          } else if (floraNoise > 0.28) {
            // Crimson tendril plant on seabed
            const voxelIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);
            voxels[voxelIdx] = BlockType.CRIMSON_TENDRIL;
          } else if (floraNoise > 0.18) {
            // Tall blood kelp stalk rising in water
            const kelpHeight = Math.min(SEA_LEVEL - 15, surfaceY + 4 + Math.round((floraNoise - 0.18) * 15));
            for (let y = surfaceY + 1; y <= kelpHeight; y++) {
              const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);
              voxels[voxelIdx] = BlockType.BLOOD_KELP;
            }
          }
        }

        // Feature: Tall Kelp Forests in Oceans
        // User request: "and add tall kelp to Oceans"
        if (
          !isArcticZone &&
          subBiome.category === 'ocean' &&
          !subBiome.hasTrenchFissure &&
          !subBiome.hasGlaciers &&
          surfaceY <= SEA_LEVEL - 6
        ) {
          const oceanKelpNoise = this.noiseFlora.fbm2D(wx * 0.07, wz * 0.07, 2, 2.0, 0.5);
          if (oceanKelpNoise > 0.12) {
            const heightVar = Math.round((oceanKelpNoise - 0.12) * 18);
            const targetHeight = Math.min(SEA_LEVEL - 2, surfaceY + 5 + heightVar);
            for (let y = surfaceY + 1; y <= targetHeight; y++) {
              const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);
              if (voxels[voxelIdx] !== BlockType.PACKED_ICE) {
                voxels[voxelIdx] = BlockType.TALL_KELP;
              }
            }
            if (targetHeight > maxChunkY) maxChunkY = targetHeight;
          }
        }

        // Feature: Shoreline Water Flora (Small Kelp, Seagrass, Algae)
        // User request: "also add small kelp and seagrass and algae to the water part of shorelines"
        if (!isArcticZone && surfaceY < SEA_LEVEL && surfaceY >= SEA_LEVEL - 7) {
          const aquaticNoise = this.noiseFlora.fbm2D(wx * 0.16, wz * 0.16, 2, 2.0, 0.5);
          const voxelIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);

          if (aquaticNoise > 0.16 && aquaticNoise < 0.44) {
            // Seagrass meadow
            if (voxels[voxelIdx] !== BlockType.PACKED_ICE) {
              voxels[voxelIdx] = BlockType.SEAGRASS;
              if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;
            }

            if (aquaticNoise > 0.35 && surfaceY + 2 <= SEA_LEVEL - 1) {
              const topIdx = colIdx + (surfaceY + 2) * (CHUNK_W * CHUNK_D);
              if (voxels[topIdx] !== BlockType.PACKED_ICE) {
                voxels[topIdx] = BlockType.SEAGRASS;
                if (surfaceY + 2 > maxChunkY) maxChunkY = surfaceY + 2;
              }
            }
          } else if (aquaticNoise > -0.15 && aquaticNoise < 0.12) {
            // Small Kelp
            if (voxels[voxelIdx] !== BlockType.PACKED_ICE) {
              voxels[voxelIdx] = BlockType.SMALL_KELP;
              if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;
            }
          } else if (aquaticNoise < -0.22 && aquaticNoise > -0.52) {
            // Shoreline Algae
            if (voxels[voxelIdx] !== BlockType.PACKED_ICE) {
              voxels[voxelIdx] = BlockType.WATER_ALGAE;
              if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;
            }
          }
        }

        // Feature: Large Subterranean Cave Systems & Underwater/Frozen Caves
        // Continuous cavern systems extending from trenches, deep oceanic crust, and land crust
        for (let y = 1; y <= Math.min(surfaceY, 76); y++) {
          if (this.isCave(wx, y, wz)) {
            const voxelIdx = colIdx + y * (CHUNK_W * CHUNK_D);
            const isFloorBelow = y > 1 && !this.isCave(wx, y - 1, wz);
            // Reuse column-cached params — avoids 7 fbm2D calls per cave-y iteration
            const params = colBiomeParams;
            const isOceanic = params.continentalness < -0.26;
            const isFrozenCave = params.temperature < -0.15;

            if (isFloorBelow) {
              const floorIdx = colIdx + (y - 1) * (CHUNK_W * CHUNK_D);

              if (isOceanic) {
                if (isFrozenCave) {
                  // Frozen cave: packed ice floor with glowing Cyro Lilies
                  voxels[floorIdx] = BlockType.PACKED_ICE;
                  const cyroNoise = this.noiseFlora.fbm2D(wx * 0.15, wz * 0.15, 2, 2.0, 0.5);
                  if (cyroNoise > 0.18) {
                    voxels[voxelIdx] = BlockType.CYRO_LILY;
                  } else {
                    voxels[voxelIdx] = BlockType.AIR;
                  }
                } else {
                  // Ocean cave: line floor with basalt rock and hydrothermal vents
                  voxels[floorIdx] = BlockType.BASALT;

                  const floraNoise = this.noiseFlora.fbm2D(wx * 0.12, wz * 0.12, 2, 2.0, 0.5);
                  if (floraNoise > 0.60) {
                    voxels[voxelIdx] = BlockType.ABYSSAL_CRIMSON_VENT;
                  } else if (floraNoise > 0.30) {
                    voxels[voxelIdx] = BlockType.CRIMSON_TENDRIL;
                  } else if (floraNoise > 0.18 && y + 3 < surfaceY && y < 55) {
                    voxels[voxelIdx] = BlockType.BLOOD_KELP;
                    voxels[colIdx + (y + 1) * (CHUNK_W * CHUNK_D)] = BlockType.BLOOD_KELP;
                    voxels[colIdx + (y + 2) * (CHUNK_W * CHUNK_D)] = BlockType.BLOOD_KELP;
                  } else {
                    voxels[voxelIdx] = BlockType.WATER;
                  }
                }
              } else {
                // Land subterranean cave: cobblestone, basalt, ore veins, glowing crystals
                const floorHash = hash2(wx, wz, y * 37);
                if (floorHash < 0.065) {
                  voxels[floorIdx] = BlockType.IRON_ORE;
                } else if (floorHash < 0.09) {
                  voxels[floorIdx] = BlockType.GOLD_ORE;
                } else if (floorHash < 0.11) {
                  voxels[floorIdx] = BlockType.GLOW_SHROOM_BLOCK;
                } else if (floorHash < 0.13) {
                  voxels[floorIdx] = BlockType.AMETHYST_CLUSTER;
                } else if (floorHash < 0.38) {
                  voxels[floorIdx] = BlockType.BASALT;
                } else {
                  voxels[floorIdx] = BlockType.COBBLESTONE;
                }
                voxels[voxelIdx] = BlockType.AIR;
              }
            } else {
              if (isOceanic) {
                voxels[voxelIdx] = isFrozenCave ? BlockType.AIR : BlockType.WATER;
              } else {
                voxels[voxelIdx] = BlockType.AIR;
              }
            }
          }
        }
      }
    }

    // 2. Feature: Surface Cave Entrances
    // Carves natural walk-in cavernous mouths on land connecting surface to subterranean caves
    this.surfaceCaveSystem.carveChunk(
      chunkOriginX,
      chunkOriginZ,
      voxels,
      (tx, tz) => this.getHeightAt(tx, tz, this.getSubBiomeAt(tx, tz))
    );

    // 3. Procedural Trees (Red Wood Trees, Limeleaf Trees, Oaks)
    // Trees are placed before surface flora so trunk logs are always placed solidly.
    const minCellX = Math.floor((chunkOriginX - 5) / 6);
    const maxCellX = Math.floor((chunkOriginX + CHUNK_W + 4) / 6);
    const minCellZ = Math.floor((chunkOriginZ - 5) / 6);
    const maxCellZ = Math.floor((chunkOriginZ + CHUNK_D + 4) / 6);

    for (let cxCell = minCellX; cxCell <= maxCellX; cxCell++) {
      for (let czCell = minCellZ; czCell <= maxCellZ; czCell++) {
        const tree = this.getTreeInCell(cxCell, czCell);
        if (!tree) continue;

        this.stampTree(tree, (twx, twy, twz, bType) => {
          if (
            twx >= chunkOriginX && twx < chunkOriginX + CHUNK_W &&
            twz >= chunkOriginZ && twz < chunkOriginZ + CHUNK_D &&
            twy >= 0 && twy < CHUNK_H
          ) {
            const lx = twx - chunkOriginX;
            const lz = twz - chunkOriginZ;
            const vIdx = lx + lz * CHUNK_W + twy * (CHUNK_W * CHUNK_D);
            const currentBlock = voxels[vIdx];

            // If current block is already a log, never overwrite it
            if (isLogBlock(currentBlock)) {
              return;
            }

            if (isLogBlock(bType)) {
              // Logs take precedence: logs must NEVER be blocked or replaced by plants or leaves
              if (
                currentBlock === BlockType.AIR ||
                currentBlock === BlockType.WATER ||
                isPlantBlock(currentBlock) ||
                isLeavesBlock(currentBlock)
              ) {
                voxels[vIdx] = bType;
                if (twy > maxChunkY) maxChunkY = twy;
              }
            } else if (isLeavesBlock(bType)) {
              // Leaves replace air, water, and plants, but NEVER logs
              if (
                currentBlock === BlockType.AIR ||
                currentBlock === BlockType.WATER ||
                isPlantBlock(currentBlock)
              ) {
                voxels[vIdx] = bType;
                if (twy > maxChunkY) maxChunkY = twy;
              }
            } else {
              if (currentBlock === BlockType.AIR || currentBlock === BlockType.WATER || isPlantBlock(currentBlock)) {
                voxels[vIdx] = bType;
                if (twy > maxChunkY) maxChunkY = twy;
              }
            }
          }
        });
      }
    }

    // 2b. Rainforest Vine Pass — runs AFTER tree stamps so vines can read the voxel array directly.
    // Scans every above-surface air column inside the chunk; wherever there's a rainforest
    // leaves block above, hang vines downward up to 8 blocks. No getTreeBlockAt needed.
    if (centerSubBiome.isRainforest || centerSubBiome.category === 'rainforest') {
      for (let lz = 0; lz < CHUNK_D; lz++) {
        const wz = chunkOriginZ + lz;
        const zOff = lz * CHUNK_W;
        for (let lx = 0; lx < CHUNK_W; lx++) {
          const wx = chunkOriginX + lx;
          const colIdx2 = lx + zOff;
          const cacheIdx = lx + lz * CHUNK_W;
          const surfY = colSurfaceYCache[cacheIdx];
          if (!colSubBiomeCache[cacheIdx]?.isRainforest) continue;

          // Quick noise gate — only ~40% of columns get vines
          const vineNoise = this.noiseFlora.fbm2D(wx * 0.35, wz * 0.35, 2, 2.0, 0.5);
          if (vineNoise <= 0.18) continue;

          // Walk downward from top of chunk scanning for leaf blocks
          const scanTop = Math.min(maxChunkY, surfY + 38);
          for (let y = scanTop; y > surfY; y--) {
            const idx = colIdx2 + y * (CHUNK_W * CHUNK_D);
            if (!this.isRainforestLeavesBlock(voxels[idx])) continue;
            // Hang vines below this leaf block
            let vineLen = 0;
            for (let vy = y - 1; vy > surfY && vineLen < 8; vy--) {
              const vIdx = colIdx2 + vy * (CHUNK_W * CHUNK_D);
              if (voxels[vIdx] !== BlockType.AIR) break;
              voxels[vIdx] = BlockType.VINE;
              if (vy > maxChunkY) maxChunkY = vy;
              vineLen++;
            }
          }
        }
      }
    }

    // 3. Surface Flora, Plants, Bushes, Water Reeds, and Lilypads
    // Rules:
    // - Plants should NEVER replace logs or tree foliage
    // - Flora only spawns on valid soil/grass in open AIR
    // - If a tree trunk or branch occupies the voxel, flora is strictly skipped
    for (let lz = 0; lz < CHUNK_D; lz++) {
      const wz = chunkOriginZ + lz;
      const zOffset = lz * CHUNK_W;

      for (let lx = 0; lx < CHUNK_W; lx++) {
        const wx = chunkOriginX + lx;
        const colIdx = lx + zOffset;

        // Reuse cached values from the terrain pass — avoids redundant getSubBiomeAt/getHeightAt/getBiomeParameters calls
        const cIdx2 = lx + lz * CHUNK_W;
        const subBiome = colSubBiomeCache[cIdx2];
        const surfaceY = colSurfaceYCache[cIdx2];
        const isArcticZone = colIsArcticCache[cIdx2];
        const surfaceBlock = voxels[colIdx + surfaceY * (CHUNK_W * CHUNK_D)];
        const isValidSubstrate =
          surfaceBlock === BlockType.GRASS ||
          surfaceBlock === BlockType.DIRT ||
          surfaceBlock === BlockType.SAND ||
          surfaceBlock === BlockType.SNOW ||
          (subBiome.isRiver && surfaceBlock === BlockType.STONE);

        // Oasis has water at Y=101, so flora placement checks against that level
        const waterLevel = SEA_LEVEL;
        if (surfaceY > waterLevel && isValidSubstrate) {
          const floraIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);
          const currentAtFlora = voxels[floraIdx];

          // Plants must NEVER replace logs, leaves, or non-air blocks.
          // Tree stamps ran before this pass, so direct voxel reads are sufficient.
          if (currentAtFlora === BlockType.AIR) {
            // Check for tall multi-block Saguaro Cactus in Desert biomes
            if (subBiome.isDesert && surfaceBlock === BlockType.SAND) {
              const saguaroChance = hash2(wx, wz, 1212);
              const density = subBiome.cactusDensity ?? 0.2;
              if (saguaroChance < density * 0.05) {
                const cactusHeight = 3 + Math.floor(hash2(wx, wz, 1313) * 3); // 3 to 5 blocks
                for (let ch = 1; ch <= cactusHeight; ch++) {
                  if (surfaceY + ch < CHUNK_H) {
                    const cIdx = colIdx + (surfaceY + ch) * (CHUNK_W * CHUNK_D);
                    voxels[cIdx] = BlockType.SAGUARO_CACTUS;
                    if (surfaceY + ch > maxChunkY) maxChunkY = surfaceY + ch;
                  }
                }
                // In dense cactus badlands, add iconic side arm
                if (subBiome.id === 'cactus_badlands' && hash2(wx, wz, 1414) > 0.45 && surfaceY + 4 < CHUNK_H) {
                  const armDir = hash2(wx, wz, 1515) > 0.5 ? [1, 0] : [0, 1];
                  const armWX = wx + armDir[0];
                  const armWZ = wz + armDir[1];
                  if (
                    armWX >= chunkOriginX && armWX < chunkOriginX + CHUNK_W &&
                    armWZ >= chunkOriginZ && armWZ < chunkOriginZ + CHUNK_D
                  ) {
                    const armCol = (armWX - chunkOriginX) + (armWZ - chunkOriginZ) * CHUNK_W;
                    const armBaseY = surfaceY + 2;
                    voxels[armCol + armBaseY * (CHUNK_W * CHUNK_D)] = BlockType.SAGUARO_CACTUS;
                    voxels[armCol + (armBaseY + 1) * (CHUNK_W * CHUNK_D)] = BlockType.SAGUARO_CACTUS;
                  }
                }
              } else {
                const flora = this.getSurfaceFloraAt(wx, surfaceY, wz, subBiome);
                if (flora !== BlockType.AIR && !isLogBlock(flora)) {
                  voxels[floraIdx] = flora;
                  if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;

                  // Flowering Torch Cactus is a single-block specimen with its crown flower on top
                }
              }
            } else {
              const flora = this.getSurfaceFloraAt(wx, surfaceY, wz, subBiome);
              if (flora !== BlockType.AIR && !isLogBlock(flora)) {
                voxels[floraIdx] = flora;
                if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;

                // Extra height for tall Sunflowers
                if (flora === BlockType.SUNFLOWER && hash2(wx, wz, 999) > 0.45 && surfaceY + 2 < CHUNK_H) {
                  const tallIdx = colIdx + (surfaceY + 2) * (CHUNK_W * CHUNK_D);
                  const tallSlot = voxels[tallIdx];
                  if (tallSlot === BlockType.AIR) {
                    voxels[tallIdx] = BlockType.SUNFLOWER;
                    if (surfaceY + 2 > maxChunkY) maxChunkY = surfaceY + 2;
                  }
                }
              }
            }
          }
        }

        // Feature: Water Reeds, Lilypads, and Marshroots (suppressed in arctic biomes)
        if (!isArcticZone && (subBiome.hasReedsOrLilypads || subBiome.hasMudPuddles)) {
          if (surfaceY < SEA_LEVEL) {
            // Floating Lilypads on water
            const padNoise = this.noiseFlora.fbm2D(wx * 0.18, wz * 0.18, 2, 2.0, 0.5);
            if (padNoise > 0.42 && padNoise < 0.68) {
              const padIdx = colIdx + (SEA_LEVEL + 1) * (CHUNK_W * CHUNK_D);
              if (
                voxels[padIdx] === BlockType.AIR &&
                isWaterOrWaterlogged(voxels[colIdx + SEA_LEVEL * (CHUNK_W * CHUNK_D)], SEA_LEVEL) &&
                voxels[colIdx + SEA_LEVEL * (CHUNK_W * CHUNK_D)] !== BlockType.PACKED_ICE &&
                !isLogBlock(voxels[padIdx])
              ) {
                voxels[padIdx] = BlockType.LILYPAD;
                if (SEA_LEVEL + 1 > maxChunkY) maxChunkY = SEA_LEVEL + 1;
              }
            }
          } else if (surfaceY === SEA_LEVEL - 1 || surfaceY === SEA_LEVEL || surfaceY === SEA_LEVEL + 1) {
            // Water reeds along shores and marsh waterlines
            const reedNoise = this.noiseFlora.fbm2D(wx * 0.22, wz * 0.22, 2, 2.0, 0.5);
            if (reedNoise > 0.32 && reedNoise < 0.60) {
              const reedIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);
              if (
                voxels[reedIdx] === BlockType.AIR &&
                voxels[colIdx + surfaceY * (CHUNK_W * CHUNK_D)] !== BlockType.PACKED_ICE &&
                !isLogBlock(voxels[reedIdx])
              ) {
                voxels[reedIdx] = BlockType.WATER_REED;
                if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;

                if (reedNoise > 0.48 && surfaceY + 2 < CHUNK_H) {
                  const reedTopIdx = colIdx + (surfaceY + 2) * (CHUNK_W * CHUNK_D);
                  if (voxels[reedTopIdx] === BlockType.AIR && !isLogBlock(voxels[reedTopIdx])) {
                    voxels[reedTopIdx] = BlockType.WATER_REED;
                    if (surfaceY + 2 > maxChunkY) maxChunkY = surfaceY + 2;
                  }
                }
              }
            } else if (reedNoise < -0.35 && reedNoise > -0.55 && (subBiome.id === 'verdant_marsh' || subBiome.id === 'phosphor_fen')) {
              // Marshroot in damp marsh basins
              const rootIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);
              if (
                voxels[rootIdx] === BlockType.AIR &&
                voxels[colIdx + surfaceY * (CHUNK_W * CHUNK_D)] !== BlockType.PACKED_ICE
              ) {
                voxels[rootIdx] = BlockType.MARSHROOT;
                if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;
              }
            }
          }
        }

        // Feature: Dried Up Seaweed (lays flat rarely on shorelines)
        // User request: "Add dried up seaweed, lays flat rarely on shorelines"
        const isShoreline =
          !isArcticZone &&
          (subBiome.shoreType !== undefined ||
          subBiome.id === 'sandy_shoreline' ||
          subBiome.id === 'stone_cliff_shoreline' ||
          (surfaceY >= SEA_LEVEL && surfaceY <= SEA_LEVEL + 4 && voxels[colIdx + surfaceY * (CHUNK_W * CHUNK_D)] === BlockType.SAND));

        if (isShoreline && surfaceY >= SEA_LEVEL && surfaceY <= SEA_LEVEL + 4) {
          const driedNoise = this.noiseFlora.fbm2D(wx * 0.32, wz * 0.32, 2, 2.0, 0.5);
          // Rare spawn along beach shorelines (~2.5% of shoreline surface positions)
          if (driedNoise > 0.56 && driedNoise < 0.61) {
            const driedIdx = colIdx + (surfaceY + 1) * (CHUNK_W * CHUNK_D);
            if (voxels[driedIdx] === BlockType.AIR) {
              voxels[driedIdx] = BlockType.DRIED_SEAWEED;
              if (surfaceY + 1 > maxChunkY) maxChunkY = surfaceY + 1;
            }
          }
        }

        // Guarantee Arctic ice integrity: Rivers and water exposed to air in arctic/snow biomes must have their surface frozen as ice with NO vegetation
        if (isArcticZone && surfaceY < SEA_LEVEL) {
          const topIceIdx = colIdx + SEA_LEVEL * (CHUNK_W * CHUNK_D);
          voxels[topIceIdx] = BlockType.PACKED_ICE;
          // Ensure no aquatic or surface plant sits on or above the ice
          const aboveIceIdx = colIdx + (SEA_LEVEL + 1) * (CHUNK_W * CHUNK_D);
          if (isPlantBlock(voxels[aboveIceIdx])) {
            voxels[aboveIceIdx] = BlockType.AIR;
          }
        }
      }
    }

    // 4. Feature: Weird Boulders in Decayed Biomes
    // User request: "weird boulders sit randomly along the biomes"
    for (let lz = 0; lz < CHUNK_D; lz += 4) {
      for (let lx = 0; lx < CHUNK_W; lx += 4) {
        const wx = chunkOriginX + lx;
        const wz = chunkOriginZ + lz;
        const subBiome = this.getSubBiomeAt(wx, wz);
        if (subBiome.hasWeirdBoulders) {
          const bHash = hash2(wx, wz, 999);
          if (bHash < 0.045) {
            const groundY = this.getHeightAt(wx, wz, subBiome);
            if (groundY > SEA_LEVEL && groundY < CHUNK_H - 8) {
              const bRadius = 1.4 + hash2(wx, wz, 77) * 1.2;
              const bHeight = 2 + Math.floor(hash2(wx, wz, 88) * 3);
              const bType = hash2(wx, wz, 99) > 0.4 ? BlockType.BASALT : BlockType.COBBLESTONE;

              for (let by = 0; by <= bHeight; by++) {
                const layerR = bRadius * (1 - (by / (bHeight + 1)) * 0.35);
                for (let bdx = -3; bdx <= 3; bdx++) {
                  for (let bdz = -3; bdz <= 3; bdz++) {
                    const dist = Math.hypot(bdx, bdz);
                    if (dist <= layerR) {
                      const twx = wx + bdx;
                      const twy = groundY + by;
                      const twz = wz + bdz;
                      if (
                        twx >= chunkOriginX && twx < chunkOriginX + CHUNK_W &&
                        twz >= chunkOriginZ && twz < chunkOriginZ + CHUNK_D &&
                        twy >= 0 && twy < CHUNK_H
                      ) {
                        const localIdx = (twx - chunkOriginX) + (twz - chunkOriginZ) * CHUNK_W + twy * (CHUNK_W * CHUNK_D);
                        if (!isLogBlock(voxels[localIdx])) {
                          voxels[localIdx] = bType;
                          if (twy > maxChunkY) maxChunkY = twy;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    chunk.maxY = maxChunkY;

    // Apply any user-modified blocks in this chunk region
    if (modifiedBlocks.size > 0) {
      const minWX = cx * CHUNK_W;
      const maxWX = minWX + CHUNK_W;
      const minWZ = cz * CHUNK_D;
      const maxWZ = minWZ + CHUNK_D;

      for (const [key, blockType] of modifiedBlocks.entries()) {
        const parts = key.split(',');
        const wx = Number(parts[0]);
        const wy = Number(parts[1]);
        const wz = Number(parts[2]);
        if (wx >= minWX && wx < maxWX && wz >= minWZ && wz < maxWZ && wy >= 0 && wy < CHUNK_H) {
          const current = chunk.getBlock(wx - minWX, wy, wz - minWZ);
          if (isPlantBlock(blockType) && isLogBlock(current)) {
            // Plants should never replace logs
            continue;
          }
          chunk.setBlock(wx - minWX, wy, wz - minWZ, blockType);
        }
      }
    }

    return chunk;
  }
}
