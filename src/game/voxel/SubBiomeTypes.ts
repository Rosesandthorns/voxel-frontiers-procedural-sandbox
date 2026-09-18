import { BiomeType, BlockType } from '../../types';

/**
 * Sub-biome definitions based on multi-parameter Perlin noise:
 * - Continentalness: Ocean vs Coast/Shoreline vs Inland Continent
 * - Temperature: Frigid vs Cold vs Temperate vs Warm (solid, unmoving continental macro-band)
 * - Elevation / Relief: Flat vs Neutral vs Hilly
 * - Moisture: Wet/Humid vs Neutral vs Dry
 * - Weirdness: Normal vs Anomalous (Trenches, fissures, terraces)
 * - Vegetation: Lush vs Neutral vs Barren
 */

export type MainBiomeCategory = 'verdant' | 'ocean' | 'trench' | 'cave' | 'desert' | 'decayed' | 'river' | 'arctic' | 'rainforest';

export interface VerdantSubBiomeDef {
  id: string;
  category: MainBiomeCategory;
  mainBiome: BiomeType;
  name: string;
  description: string;
  accentColor: string;
  baseHeightOffset: number;
  heightVariation: number; // 0 = very flat, 1 = rolling, 2 = steep hills
  weirdnessScale: number;  // 0 = natural, 1 = spires/overhangs/trenches
  surfaceBlock: BlockType;
  subSurfaceBlock: BlockType;
  waterLevel: number;
  treeFrequency: number;
  flowerFrequency: number;
  tallGrassFrequency: number;
  hasReedsOrLilypads?: boolean;
  hasMossyCobble?: boolean;
  hasSpireFormations?: boolean;
  hasMudPuddles?: boolean;
  hasGlaciers?: boolean;
  hasCoralReef?: boolean;
  hasTrenchFissure?: boolean;
  shoreType?: 'sand' | 'cliff_stone';
  isDecayed?: boolean;
  isDesert?: boolean;
  isRiver?: boolean;
  isRivermouth?: boolean;
  cactusDensity?: number; // 0 (none) to 1 (very dense)
  hasPalmTrees?: boolean;
  hasWeirdBoulders?: boolean;
  isSicklyWater?: boolean;
  riverShoreType?: 'sand' | 'dirt' | 'stone';
  isArctic?: boolean;
  isEversnow?: boolean;
  isRainforest?: boolean;
  hasEverfrostTrees?: boolean;
  hasIcePuddles?: boolean;
  snowStackHeight?: number;
  isRedwoodForest?: boolean;
  treeTypeOverride?: 'ghost' | 'palm' | 'kapok' | 'banyan' | 'strangler' | 'mahogany' | 'ceiba' | 'rainforest_oak' | 'everfrost' | 'redwood';
}

export type SubBiomeDef = VerdantSubBiomeDef;

export interface BiomeParameters {
  continentalness: number; // -1 (deep ocean) to 0 (coastline/shore) to +1 (inland continent)
  temperature: number;     // -1 (freezing) to 0 (temperate) to +1 (warm) - unmoving macro scale
  flatness: number;        // -1 (very flat) to 0 (neutral) to +1 (very hilly)
  humidity: number;        // -1 (dry/arid) to 0 (neutral) to +1 (wet/humid marsh)
  weirdness: number;       // -1 (standard) to 0 (neutral) to +1 (weird / fissures / trenches)
  vegetation: number;      // -1 (barren) to 0 (neutral) to +1 (lush)
  coastType?: number;      // Macro scale coastal province (-1 = sandy beaches, +1 = high stone cliff fjords)
}
