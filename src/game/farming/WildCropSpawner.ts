import { BlockType } from '../../types';
import { SubBiomeDef } from '../voxel/SubBiomeTypes';
import { CROP_BLOCK_BUNDLES, CROP_BLOCK_IDS } from './CropBlocks';

function hash2(x: number, z: number, seed: number = 0): number {
  const val = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return val - Math.floor(val);
}

/**
 * Procedurally determines if a wild crop plant should spawn on a surface block at (wx, surfaceY, wz).
 * Returns the mature crop block type or CROP_BLOCK_IDS.WILD_SEA_CABBAGE, or null if no wild crop spawns.
 * Enforces: "should not be super common".
 */
export function getWildCropAt(
  wx: number,
  surfaceY: number,
  wz: number,
  subBiome: SubBiomeDef,
  params: {
    continentalness: number;
    temperature: number;
    flatness: number;
    humidity: number;
    weirdness: number;
    vegetation: number;
  },
  surfaceBlock: BlockType
): BlockType | null {
  // Never spawn wild crops on ice, deep ocean, clouds, or solid stone
  if (
    surfaceBlock === BlockType.PACKED_ICE ||
    surfaceBlock === BlockType.OBSIDIAN ||
    surfaceBlock === BlockType.MAGMA_ROCK ||
    surfaceBlock === BlockType.VOID_STONE
  ) {
    return null;
  }

  const spawnChance = hash2(wx, wz, 9101);
  const selector = hash2(wx, wz, 9102);

  // ── 1. COAST & CLIFFS ──
  // The cabbage family (cabbage, kale, broccoli, cauliflower, Brussels sprouts) all come from
  // one wild sea cabbage that really grows on chalk and limestone sea cliffs.
  // Wild beets grow on shorelines, and asparagus on dunes.
  const isCoastOrCliff =
    subBiome.category === 'ocean' ||
    Boolean(subBiome.shoreType) ||
    surfaceBlock === BlockType.CHALK ||
    surfaceBlock === BlockType.LIMESTONE ||
    surfaceBlock === BlockType.BEACH_GRAVEL;

  if (isCoastOrCliff) {
    // Sea cliff wild cabbage on chalk or limestone (rare spawn)
    if ((surfaceBlock === BlockType.CHALK || surfaceBlock === BlockType.LIMESTONE) && spawnChance < 0.003) {
      return CROP_BLOCK_IDS.WILD_SEA_CABBAGE;
    }
    // Shorelines: Wild beets on beach gravel or shoreline sand (rare spawn)
    if (surfaceBlock === BlockType.BEACH_GRAVEL && spawnChance < 0.003) {
      return CROP_BLOCK_BUNDLES.get('beets')?.mature || null;
    }
    // Dunes: Wild asparagus on sandy dunes (rare spawn)
    if (surfaceBlock === BlockType.SAND && spawnChance < 0.0025) {
      return CROP_BLOCK_BUNDLES.get('asparagus')?.mature || null;
    }
  }

  // ── 2. WETLANDS, SWAMPS, RIVERBANKS ──
  // Rice, cranberries (bogs), celery, Sugarcane (warm riverbanks)
  const isWetland =
    subBiome.id === 'verdant_marsh' ||
    subBiome.id === 'phosphor_fen' ||
    subBiome.id === 'sunken_wetlands' ||
    subBiome.category === 'river';

  if (isWetland) {
    if (spawnChance < 0.0035) {
      if (selector < 0.28) return CROP_BLOCK_BUNDLES.get('rice')?.mature || null;
      if (selector < 0.55) return CROP_BLOCK_BUNDLES.get('cranberries')?.mature || null;
      if (selector < 0.80) return CROP_BLOCK_BUNDLES.get('celery')?.mature || null;
      // Warm riverbanks sugarcane
      if (params.temperature > 0.05) return CROP_BLOCK_BUNDLES.get('sugarcane')?.mature || null;
      return CROP_BLOCK_BUNDLES.get('rice')?.mature || null;
    }
  }

  // ── 3. COLD AND MOUNTAIN ──
  // Potatoes (high, cool slopes), rhubarb, horseradish
  // Parsnips, rutabaga and other winter crops
  const isColdOrMountain =
    params.temperature < -0.25 ||
    surfaceY > 85 ||
    Boolean(subBiome.isArctic) ||
    subBiome.category === 'arctic';

  if (isColdOrMountain) {
    if (spawnChance < 0.0035) {
      if (selector < 0.20) return CROP_BLOCK_BUNDLES.get('potatoes')?.mature || null;
      if (selector < 0.36) return CROP_BLOCK_BUNDLES.get('rhubarb')?.mature || null;
      if (selector < 0.50) return CROP_BLOCK_BUNDLES.get('horseradish')?.mature || null;
      if (selector < 0.65) return CROP_BLOCK_BUNDLES.get('parsnips')?.mature || null;
      if (selector < 0.80) return CROP_BLOCK_BUNDLES.get('rutabaga')?.mature || null;
      if (selector < 0.90) return CROP_BLOCK_BUNDLES.get('winter_leeks')?.mature || null;
      return CROP_BLOCK_BUNDLES.get('kale')?.mature || null;
    }
  }

  // ── 4. WARM AND DRY ──
  // Tomatoes, peppers, corn, eggplant, sweet potatoes
  // Melons, cucumbers, zucchini, pumpkins
  // Sorghum, millet, chickpeas, lentils, cactus fruit (desert only)
  const isWarmAndDry =
    params.temperature > 0.35 ||
    subBiome.category === 'desert' ||
    subBiome.id === 'golden_dunes' ||
    surfaceBlock === BlockType.SAND;

  if (isWarmAndDry) {
    if (spawnChance < 0.003) {
      // Desert sand exclusive cactus fruit
      if (surfaceBlock === BlockType.SAND && selector < 0.22) {
        return CROP_BLOCK_BUNDLES.get('cactus_fruit')?.mature || null;
      }
      if (selector < 0.30) return CROP_BLOCK_BUNDLES.get('tomatoes')?.mature || null;
      if (selector < 0.40) return CROP_BLOCK_BUNDLES.get('peppers')?.mature || null;
      if (selector < 0.48) return CROP_BLOCK_BUNDLES.get('corn')?.mature || null;
      if (selector < 0.56) return CROP_BLOCK_BUNDLES.get('eggplant')?.mature || null;
      if (selector < 0.64) return CROP_BLOCK_BUNDLES.get('sweet_potatoes')?.mature || null;
      if (selector < 0.72) return CROP_BLOCK_BUNDLES.get('melons')?.mature || null;
      if (selector < 0.80) return CROP_BLOCK_BUNDLES.get('cucumbers')?.mature || null;
      if (selector < 0.88) return CROP_BLOCK_BUNDLES.get('zucchini')?.mature || null;
      if (selector < 0.94) return CROP_BLOCK_BUNDLES.get('pumpkins')?.mature || null;
      if (selector < 0.97) return CROP_BLOCK_BUNDLES.get('sorghum')?.mature || null;
      return CROP_BLOCK_BUNDLES.get('chickpeas')?.mature || null;
    }
  }

  // ── 5. FORESTS AND EDGES ──
  // Mushrooms (under trees, caves)
  // Blueberries (conifer forests, which fits the acidic soil)
  // Strawberries, wild apple/plum/pear trees
  // Grapes and hops (vines along forest edges and riverbanks)
  // Herbs
  const isForest =
    subBiome.treeFrequency > 0.03 ||
    subBiome.category === 'rainforest' ||
    subBiome.id === 'redwood_giants' ||
    subBiome.id === 'willow_bayou';

  if (isForest) {
    if (spawnChance < 0.003) {
      // Conifer forest acidic soil blueberries
      const isConifer = subBiome.id === 'redwood_giants' || params.temperature < 0;
      if (isConifer && selector < 0.35) {
        return CROP_BLOCK_BUNDLES.get('blueberries')?.mature || null;
      }
      if (selector < 0.20) return CROP_BLOCK_BUNDLES.get('strawberries')?.mature || null;
      if (selector < 0.40) return CROP_BLOCK_BUNDLES.get('fruit_trees')?.mature || null;
      if (selector < 0.60) return CROP_BLOCK_BUNDLES.get('grapes')?.mature || null;
      if (selector < 0.75) return CROP_BLOCK_BUNDLES.get('hops')?.mature || null;
      if (selector < 0.90) return CROP_BLOCK_BUNDLES.get('herbs')?.mature || null;
      return CROP_BLOCK_BUNDLES.get('mushrooms')?.mature || null;
    }
  }

  // ── 6. MEADOWS AND PLAINS ──
  // Wheat, barley, oats, rye, flax, sunflowers
  // Wild carrots, turnips, radishes, peas, lettuce
  // Wild onions, garlic, leeks (grow in clumps on grassy slopes)
  if (subBiome.category === 'verdant' || surfaceBlock === BlockType.GRASS) {
    // Clumps of wild onions, garlic, and leeks on grassy slopes (much rarer)
    const slopeNoise = hash2(Math.floor(wx / 4), Math.floor(wz / 4), 5432);
    if (slopeNoise > 0.96 && spawnChance < 0.015) {
      const clumpSel = hash2(wx, wz, 777);
      if (clumpSel < 0.35) return CROP_BLOCK_BUNDLES.get('onions')?.mature || null;
      if (clumpSel < 0.70) return CROP_BLOCK_BUNDLES.get('garlic')?.mature || null;
      return CROP_BLOCK_BUNDLES.get('leeks')?.mature || null;
    }

    if (spawnChance < 0.003) {
      if (selector < 0.12) return CROP_BLOCK_BUNDLES.get('wheat')?.mature || null;
      if (selector < 0.22) return CROP_BLOCK_BUNDLES.get('barley')?.mature || null;
      if (selector < 0.32) return CROP_BLOCK_BUNDLES.get('oats')?.mature || null;
      if (selector < 0.42) return CROP_BLOCK_BUNDLES.get('rye')?.mature || null;
      if (selector < 0.52) return CROP_BLOCK_BUNDLES.get('flax')?.mature || null;
      if (selector < 0.62) return CROP_BLOCK_BUNDLES.get('sunflowers')?.mature || null;
      if (selector < 0.70) return CROP_BLOCK_BUNDLES.get('carrots')?.mature || null;
      if (selector < 0.78) return CROP_BLOCK_BUNDLES.get('turnips')?.mature || null;
      if (selector < 0.85) return CROP_BLOCK_BUNDLES.get('radishes')?.mature || null;
      if (selector < 0.92) return CROP_BLOCK_BUNDLES.get('peas')?.mature || null;
      return CROP_BLOCK_BUNDLES.get('lettuce')?.mature || null;
    }
  }

  return null;
}
