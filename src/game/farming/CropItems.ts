import { ItemDef } from '../../types';
import type { CraftingRecipe } from '../systems/ItemRegistry';
import { CROP_CONFIGS, CropConfig } from './CropTypes';
import { CROP_BLOCK_IDS, CROP_BLOCK_BUNDLES } from './CropBlocks';
import { generateFoodIcon, generateSeedIcon } from './CropTextures';

export interface CropDropResult {
  items: { item: ItemDef; count: number }[];
}

export const CROP_SEED_ITEMS: Record<string, ItemDef> = {};
export const CROP_FOOD_ITEMS: Record<string, ItemDef> = {};
export const CROP_ITEMS_MAP: Record<string, ItemDef> = {};
export const CROP_FARMING_RECIPES: CraftingRecipe[] = [];

// Trellis Item
export const TRELLIS_ITEM: ItemDef = {
  id: 'trellis',
  name: 'Garden Trellis',
  type: 'block',
  blockId: CROP_BLOCK_IDS.TRELLIS,
  icon: '', // dynamically uses block side texture
  description: 'Crafted wooden garden trellis lattice. Essential support for climbing crops like Peas, Tomatoes, Beans, Grapes, and Hops.',
  maxStack: 64
};
CROP_ITEMS_MAP['trellis'] = TRELLIS_ITEM;

// Add crafting recipe for Trellis: 2 of any Planks = 1 Garden Trellis
CROP_FARMING_RECIPES.push({
  id: 'craft_trellis',
  result: TRELLIS_ITEM,
  resultCount: 1,
  ingredients: [{ itemId: 'any_plank', count: 2 }],
  station: 'inventory',
  category: 'farming'
});

// Register all 54 crop seed packets and food items
CROP_CONFIGS.forEach(crop => {
  const seedId = `${crop.id}_seed`;
  const foodId = crop.id;

  const bundle = CROP_BLOCK_BUNDLES.get(crop.id);
  const sproutBlock = bundle?.sprout;

  const seedItem: ItemDef = {
    id: seedId,
    name: crop.seedName,
    type: 'utility',
    blockId: sproutBlock,
    icon: '', // resolved dynamically by getItemIcon
    description: `Plant in ${crop.seasons.join('/')} on tilled ground. Water ${crop.minWater}–${crop.maxWater}, Temp ${crop.allowedTemps.join('/')}. ${crop.needs.notes || ''}`,
    maxStack: 64
  };

  const foodItem: ItemDef = {
    id: foodId,
    name: crop.foodName,
    type: 'food',
    icon: '', // resolved dynamically by getItemIcon
    description: `Freshly harvested ${crop.name}. Nourishing food that restores ${crop.foodValue} health/vitality.`,
    maxStack: 64
  };

  CROP_SEED_ITEMS[crop.id] = seedItem;
  CROP_FOOD_ITEMS[crop.id] = foodItem;

  CROP_ITEMS_MAP[seedId] = seedItem;
  CROP_ITEMS_MAP[foodId] = foodItem;

  // Crafting recipe: 1 crop food produce yields 2 seeds for propagation
  CROP_FARMING_RECIPES.push({
    id: `craft_seeds_from_${crop.id}`,
    result: seedItem,
    resultCount: 2,
    ingredients: [{ itemId: foodId, count: 1 }],
    station: 'inventory',
    category: 'farming'
  });
});

// Cache generated Data URLs for icons in browser environment
const SEED_ICONS_CACHE: Record<string, string> = {};
const FOOD_ICONS_CACHE: Record<string, string> = {};

export function getCropSeedIcon(cropId: string): string {
  if (SEED_ICONS_CACHE[cropId]) return SEED_ICONS_CACHE[cropId];
  const crop = CROP_CONFIGS.find(c => c.id === cropId);
  if (!crop) return '';
  const url = generateSeedIcon(crop);
  SEED_ICONS_CACHE[cropId] = url;
  return url;
}

export function getCropFoodIcon(cropId: string): string {
  if (FOOD_ICONS_CACHE[cropId]) return FOOD_ICONS_CACHE[cropId];
  const crop = CROP_CONFIGS.find(c => c.id === cropId);
  if (!crop) return '';
  const url = generateFoodIcon(crop);
  FOOD_ICONS_CACHE[cropId] = url;
  return url;
}

// ── Drop Calculation Helpers ──

/**
 * Returns drops when harvesting a mature crop.
 * Gives 1-2 food produce + 1-2 seeds.
 */
export function getMatureCropDrops(cropId: string): CropDropResult {
  const seed = CROP_SEED_ITEMS[cropId];
  const food = CROP_FOOD_ITEMS[cropId];
  const drops: { item: ItemDef; count: number }[] = [];

  if (food) {
    drops.push({ item: food, count: Math.floor(Math.random() * 2) + 1 });
  }
  if (seed) {
    drops.push({ item: seed, count: Math.floor(Math.random() * 2) + 1 });
  }
  return { items: drops };
}

/**
 * Returns drops when harvesting a wild plant variant.
 * "gives mainly their seeds, with minimal food"
 */
export function getWildPlantDrops(cropId: string): CropDropResult {
  const seed = CROP_SEED_ITEMS[cropId];
  const food = CROP_FOOD_ITEMS[cropId];
  const drops: { item: ItemDef; count: number }[] = [];

  if (seed) {
    drops.push({ item: seed, count: Math.floor(Math.random() * 2) + 1 });
  }
  // Minimal food chance (25%)
  if (food && Math.random() < 0.25) {
    drops.push({ item: food, count: 1 });
  }
  return { items: drops };
}

/**
 * Returns drops when harvesting Wild Sea Cabbage:
 * "The cabbage family (cabbage, kale, broccoli, cauliflower, Brussels sprouts) all come from
 *  one wild sea cabbage that really grows on chalk and limestone sea cliffs."
 */
export function getWildSeaCabbageDrops(): CropDropResult {
  const family = ['cabbage', 'kale', 'broccoli', 'cauliflower', 'brussels_sprouts'];
  const pickedCropId = family[Math.floor(Math.random() * family.length)];
  const seed = CROP_SEED_ITEMS[pickedCropId] || CROP_SEED_ITEMS['cabbage'];
  const food = CROP_FOOD_ITEMS[pickedCropId] || CROP_FOOD_ITEMS['cabbage'];

  const drops: { item: ItemDef; count: number }[] = [];
  if (seed) {
    drops.push({ item: seed, count: Math.floor(Math.random() * 2) + 1 });
  }
  if (food && Math.random() < 0.3) {
    drops.push({ item: food, count: 1 });
  }
  return { items: drops };
}

/**
 * Returns drops when breaking a wilted plant:
 * Mostly dead fiber/straw with a small chance (20%) to salvage 1 seed.
 */
export function getWiltedPlantDrops(cropId: string): CropDropResult {
  const seed = CROP_SEED_ITEMS[cropId];
  const drops: { item: ItemDef; count: number }[] = [];
  if (seed && Math.random() < 0.20) {
    drops.push({ item: seed, count: 1 });
  }
  return { items: drops };
}
