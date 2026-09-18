import { BlockType, ItemDef } from '../../types';
import { BLOCK_DEFS } from '../voxel/Blocks';
import { getBlockSideTexture } from '../voxel/TextureAtlas';

export interface CraftingIngredient {
  itemId: string; // Specific item id or 'any_plank' / 'any_wood'
  count: number;
}

export interface CraftingRecipe {
  id: string;
  result: ItemDef;
  resultCount: number;
  ingredients: CraftingIngredient[];
  station: 'inventory' | 'tool_crafter';
  category: string;
}

export interface CraftingCategory {
  id: string;
  name: string;
  icon: string; // Side texture data url, sprite url, or emoji
  recipes: CraftingRecipe[];
}

export interface CraftingStationDef {
  id: 'inventory' | 'tool_crafter';
  name: string;
  description: string;
  categories: CraftingCategory[];
}

export const PLANK_ITEM_IDS = [
  'redwood_plank',
  'willow_plank',
  'oak_plank',
  'everfrost_plank',
  'palm_plank',
  'ghost_plank',
  'rainforest_oak_plank',
  'kapok_plank',
  'banyan_plank',
  'strangler_plank',
  'mahogany_plank',
  'ceiba_plank'
];

export const LOG_ITEM_IDS = [
  'redwood_log',
  'willow_log',
  'oak_wood',
  'everfrost_log',
  'palm_log',
  'ghost_log',
  'rainforest_oak_log',
  'kapok_log',
  'banyan_log',
  'strangler_log',
  'mahogany_log',
  'ceiba_log'
];

export function isPlankItemId(id: string): boolean {
  return PLANK_ITEM_IDS.includes(id);
}

export function isLogItemId(id: string): boolean {
  return LOG_ITEM_IDS.includes(id);
}

// -------------------------------------------------------------
// Core Item Registry: All Blocks, Planks, Stations, and Tools
// -------------------------------------------------------------
export const ITEM_REGISTRY: Record<string, ItemDef> = {
  // --- Starter Natural Blocks ---
  grass: {
    id: 'grass',
    name: 'Grass Block',
    type: 'block',
    blockId: BlockType.GRASS,
    icon: '',
    description: 'Fresh surface soil covered in fertile turf.',
    maxStack: 64
  },
  dirt: {
    id: 'dirt',
    name: 'Dirt',
    type: 'block',
    blockId: BlockType.DIRT,
    icon: '',
    description: 'Rich fertile earth.',
    maxStack: 64
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    type: 'block',
    blockId: BlockType.STONE,
    icon: '',
    description: 'Sturdy natural bedrock layer. Requires pickaxe to harvest.',
    maxStack: 64
  },
  cobblestone: {
    id: 'cobblestone',
    name: 'Cobblestone',
    type: 'block',
    blockId: BlockType.COBBLESTONE,
    icon: '',
    description: 'Chipped construction stone. Requires pickaxe to harvest.',
    maxStack: 64
  },
  sand: {
    id: 'sand',
    name: 'Sand',
    type: 'block',
    blockId: BlockType.SAND,
    icon: '',
    description: 'Fine coastal and desert sediments.',
    maxStack: 64
  },
  sandstone: {
    id: 'sandstone',
    name: 'Sandstone',
    type: 'block',
    blockId: BlockType.SANDSTONE,
    icon: '',
    description: 'Compacted arid mineral stone.',
    maxStack: 64
  },
  glass: {
    id: 'glass',
    name: 'Glass',
    type: 'block',
    blockId: BlockType.GLASS,
    icon: '',
    description: 'Translucent tempered pane.',
    maxStack: 64
  },
  packed_ice: {
    id: 'packed_ice',
    name: 'Packed Ice',
    type: 'block',
    blockId: BlockType.PACKED_ICE,
    icon: '',
    description: 'Dense glacial ice block.',
    maxStack: 64
  },
  snow: {
    id: 'snow',
    name: 'Snow Block',
    type: 'block',
    blockId: BlockType.SNOW,
    icon: '',
    description: 'Firmly packed powdery snow.',
    maxStack: 64
  },
  mycelium: {
    id: 'mycelium',
    name: 'Mycelium',
    type: 'block',
    blockId: BlockType.MYCELIUM,
    icon: '',
    description: 'Bioluminescent fungal earth.',
    maxStack: 64
  },
  aether_grass: {
    id: 'aether_grass',
    name: 'Aether Grass',
    type: 'block',
    blockId: BlockType.AETHER_GRASS,
    icon: '',
    description: 'Celestial turf floating in sky isles.',
    maxStack: 64
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    type: 'block',
    blockId: BlockType.OBSIDIAN,
    icon: '',
    description: 'Deep volcanic glass formed by rapid magma cooling.',
    maxStack: 64
  },
  magma_rock: {
    id: 'magma_rock',
    name: 'Magma Rock',
    type: 'block',
    blockId: BlockType.MAGMA_ROCK,
    icon: '',
    description: 'Glowing molten stone with high thermal energy.',
    maxStack: 64
  },
  basalt: {
    id: 'basalt',
    name: 'Basalt',
    type: 'block',
    blockId: BlockType.BASALT,
    icon: '',
    description: 'Columnar igneous rock from deep subterranean fissures.',
    maxStack: 64
  },
  void_stone: {
    id: 'void_stone',
    name: 'Void Stone',
    type: 'block',
    blockId: BlockType.VOID_STONE,
    icon: '',
    description: 'Dense dark stone vibrating with abyss resonance.',
    maxStack: 64
  },
  crystal_block: {
    id: 'crystal_block',
    name: 'Crystal Block',
    type: 'block',
    blockId: BlockType.CRYSTAL_BLOCK,
    icon: '',
    description: 'Radiant crystal formation.',
    maxStack: 64
  },
  coral_block: {
    id: 'coral_block',
    name: 'Coral Block',
    type: 'block',
    blockId: BlockType.CORAL_BLOCK,
    icon: '',
    description: 'Calcified oceanic reef colony.',
    maxStack: 64
  },
  abyssal_crimson_vent: {
    id: 'abyssal_crimson_vent',
    name: 'Abyssal Crimson Vent',
    type: 'block',
    blockId: BlockType.ABYSSAL_CRIMSON_VENT,
    icon: '',
    description: 'Hydrothermal chimney from ocean abysses.',
    maxStack: 64
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    type: 'block',
    blockId: BlockType.IRON_ORE,
    icon: '',
    description: 'Raw vein of dense iron deposit embedded in stone.',
    maxStack: 64
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Gold Ore',
    type: 'block',
    blockId: BlockType.GOLD_ORE,
    icon: '',
    description: 'Precious gold crystals embedded in bedrock.',
    maxStack: 64
  },
  tin_ore: {
    id: 'tin_ore',
    name: 'Tin Ore',
    type: 'block',
    blockId: BlockType.TIN_ORE,
    icon: '',
    description: 'Silvery metallic ore veins used for lightweight alloys and tools.',
    maxStack: 64
  },

  // --- Specific Logs ---
  oak_wood: {
    id: 'oak_wood',
    name: 'Oak Log',
    type: 'block',
    blockId: BlockType.OAK_WOOD,
    icon: '',
    description: 'Solid lumber from wild oak trees.',
    maxStack: 64
  },
  redwood_log: {
    id: 'redwood_log',
    name: 'Redwood Log',
    type: 'block',
    blockId: BlockType.REDWOOD_LOG,
    icon: '',
    description: 'Towering redwood timber with rich red grain.',
    maxStack: 64
  },
  willow_log: {
    id: 'willow_log',
    name: 'Willow Log',
    type: 'block',
    blockId: BlockType.LIMELEAF_LOG,
    icon: '',
    description: 'Flexible limeleaf willow trunk from swamp rivers.',
    maxStack: 64
  },
  everfrost_log: {
    id: 'everfrost_log',
    name: 'Everfrost Log',
    type: 'block',
    blockId: BlockType.EVERFROST_LOG,
    icon: '',
    description: 'Glacial pine trunk reinforced by subzero blizzards.',
    maxStack: 64
  },
  palm_log: {
    id: 'palm_log',
    name: 'Palm Log',
    type: 'block',
    blockId: BlockType.PALM_LOG,
    icon: '',
    description: 'Fibrous trunk from oasis and tropical coasts.',
    maxStack: 64
  },
  ghost_log: {
    id: 'ghost_log',
    name: 'Ghost Log',
    type: 'block',
    blockId: BlockType.GHOST_LOG,
    icon: '',
    description: 'Pale, spectral white wood from decayed lands.',
    maxStack: 64
  },
  rainforest_oak_log: {
    id: 'rainforest_oak_log',
    name: 'Rainforest Oak Log',
    type: 'block',
    blockId: BlockType.RAINFOREST_OAK_LOG,
    icon: '',
    description: 'Dense rainforest hardwood rich in mossy bark.',
    maxStack: 64
  },
  kapok_log: {
    id: 'kapok_log',
    name: 'Kapok Log',
    type: 'block',
    blockId: BlockType.KAPOK_LOG,
    icon: '',
    description: 'Immense jungle canopy trunk from rainforest heights.',
    maxStack: 64
  },
  banyan_log: {
    id: 'banyan_log',
    name: 'Banyan Log',
    type: 'block',
    blockId: BlockType.BANYAN_LOG,
    icon: '',
    description: 'Interwoven aerial rootwood with dense grain.',
    maxStack: 64
  },
  strangler_log: {
    id: 'strangler_log',
    name: 'Strangler Log',
    type: 'block',
    blockId: BlockType.STRANGLER_LOG,
    icon: '',
    description: 'Heavy twisting timber from ancient forest heartlands.',
    maxStack: 64
  },
  mahogany_log: {
    id: 'mahogany_log',
    name: 'Mahogany Log',
    type: 'block',
    blockId: BlockType.MAHOGANY_LOG,
    icon: '',
    description: 'Deep reddish-brown luxury timber.',
    maxStack: 64
  },
  ceiba_log: {
    id: 'ceiba_log',
    name: 'Ceiba Log',
    type: 'block',
    blockId: BlockType.CEIBA_LOG,
    icon: '',
    description: 'Broad buttressed rainforest giant tree trunk.',
    maxStack: 64
  },

  // --- Planks ---
  redwood_plank: {
    id: 'redwood_plank',
    name: 'Redwood Plank',
    type: 'block',
    blockId: BlockType.REDWOOD_PLANK,
    icon: '',
    description: 'Milled timber plank with vibrant crimson hues.',
    maxStack: 64
  },
  willow_plank: {
    id: 'willow_plank',
    name: 'Willow Plank',
    type: 'block',
    blockId: BlockType.WILLOW_PLANK,
    icon: '',
    description: 'Smooth, resilient lime-tinted willow lumber.',
    maxStack: 64
  },
  oak_plank: {
    id: 'oak_plank',
    name: 'Oak Plank',
    type: 'block',
    blockId: BlockType.OAK_PLANK,
    icon: '',
    description: 'Classic durable building plank.',
    maxStack: 64
  },
  everfrost_plank: {
    id: 'everfrost_plank',
    name: 'Everfrost Plank',
    type: 'block',
    blockId: BlockType.EVERFROST_PLANK,
    icon: '',
    description: 'Frost-infused plank with pale icy patina.',
    maxStack: 64
  },
  palm_plank: {
    id: 'palm_plank',
    name: 'Palm Plank',
    type: 'block',
    blockId: BlockType.PALM_PLANK,
    icon: '',
    description: 'Sun-bleached tropical wood plank.',
    maxStack: 64
  },
  ghost_plank: {
    id: 'ghost_plank',
    name: 'Ghost Plank',
    type: 'block',
    blockId: BlockType.GHOST_PLANK,
    icon: '',
    description: 'Eerie, pale bleached architectural plank.',
    maxStack: 64
  },
  rainforest_oak_plank: {
    id: 'rainforest_oak_plank',
    name: 'Rainforest Oak Plank',
    type: 'block',
    blockId: BlockType.RAINFOREST_OAK_PLANK,
    icon: '',
    description: 'Heavy moisture-resistant jungle oak plank.',
    maxStack: 64
  },
  kapok_plank: {
    id: 'kapok_plank',
    name: 'Kapok Plank',
    type: 'block',
    blockId: BlockType.KAPOK_PLANK,
    icon: '',
    description: 'Lightweight, sturdy canopy timber plank.',
    maxStack: 64
  },
  banyan_plank: {
    id: 'banyan_plank',
    name: 'Banyan Plank',
    type: 'block',
    blockId: BlockType.BANYAN_PLANK,
    icon: '',
    description: 'Deeply grained interlocking banyan plank.',
    maxStack: 64
  },
  strangler_plank: {
    id: 'strangler_plank',
    name: 'Strangler Plank',
    type: 'block',
    blockId: BlockType.STRANGLER_PLANK,
    icon: '',
    description: 'Tough, fibrous dark wooden plank.',
    maxStack: 64
  },
  mahogany_plank: {
    id: 'mahogany_plank',
    name: 'Mahogany Plank',
    type: 'block',
    blockId: BlockType.MAHOGANY_PLANK,
    icon: '',
    description: 'Premium rich mahogany finish plank.',
    maxStack: 64
  },
  ceiba_plank: {
    id: 'ceiba_plank',
    name: 'Ceiba Plank',
    type: 'block',
    blockId: BlockType.CEIBA_PLANK,
    icon: '',
    description: 'Warm sandy-toned rainforest ceiba plank.',
    maxStack: 64
  },

  // --- Workstations ---
  tool_crafter: {
    id: 'tool_crafter',
    name: 'Tool Crafter',
    type: 'block',
    blockId: BlockType.TOOL_CRAFTER,
    icon: '',
    description: 'A heavy workshop bench used for forging shovels, pickaxes, and axes.',
    maxStack: 64
  },

  // --- Tools: Shovels ---
  wooden_shovel: {
    id: 'wooden_shovel',
    name: 'Wooden Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 1,
    speed: 2.0,
    icon: '/ItemSprites/WoodenShovel.png',
    description: 'Handmade wooden shovel. Quickly digs soil, dirt, and sand.',
    maxStack: 1,
    durability: 120
  },
  stone_shovel: {
    id: 'stone_shovel',
    name: 'Stone Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 2,
    speed: 3.5,
    icon: '/ItemSprites/StoneShovel.png',
    description: 'Sturdy chipped stone shovel.',
    maxStack: 1,
    durability: 250
  },
  tin_shovel: {
    id: 'tin_shovel',
    name: 'Tin Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 3,
    speed: 4.8,
    icon: '/ItemSprites/TinShovel.png',
    description: 'Lightweight tin spade for rapid excavation.',
    maxStack: 1,
    durability: 350
  },
  iron_shovel: {
    id: 'iron_shovel',
    name: 'Iron Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 4,
    speed: 6.5,
    icon: '/ItemSprites/IronShovel.png',
    description: 'Durable forged iron spade.',
    maxStack: 1,
    durability: 600
  },
  gold_shovel: {
    id: 'gold_shovel',
    name: 'Gold Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 5,
    speed: 8.5,
    icon: '/ItemSprites/GoldShovel.png',
    description: 'Heavy, ultra-fast gilded shovel.',
    maxStack: 1,
    durability: 500
  },
  crystalized_coral_shovel: {
    id: 'crystalized_coral_shovel',
    name: 'Crystalized Coral Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 6,
    speed: 11.0,
    icon: '/ItemSprites/CrystalizedCoralShovel.png',
    description: 'Gleaming oceanic shovel forged from living crystal and coral.',
    maxStack: 1,
    durability: 1200
  },
  abbysal_shovel: {
    id: 'abbysal_shovel',
    name: 'Abyssal Shovel',
    type: 'tool',
    toolType: 'shovel',
    tier: 7,
    speed: 15.0,
    icon: '/ItemSprites/AbbysalShovel.png',
    description: 'Dark obsidian trench shovel that obliterates sediment instantaneously.',
    maxStack: 1,
    durability: 2500
  },

  // --- Tools: Pickaxes ---
  wooden_pickaxe: {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 1,
    speed: 2.0,
    icon: '/ItemSprites/WoodenPickaxe.png',
    description: 'Basic pickaxe. Essential for breaking and harvesting stone blocks.',
    maxStack: 1,
    durability: 120
  },
  stone_pickaxe: {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 2,
    speed: 3.5,
    icon: '/ItemSprites/StonePickaxe.png',
    description: 'Reliable stone pickaxe. Mines stone and basic ores.',
    maxStack: 1,
    durability: 250
  },
  tin_pickaxe: {
    id: 'tin_pickaxe',
    name: 'Tin Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 3,
    speed: 4.8,
    icon: '/ItemSprites/TinPickaxe.png',
    description: 'Lightweight tin pickaxe with nimble swinging balance.',
    maxStack: 1,
    durability: 350
  },
  iron_pickaxe: {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 4,
    speed: 6.5,
    icon: '/ItemSprites/IronPickaxe.png',
    description: 'Heavy forged iron pickaxe. Quickly mines all subterranean minerals.',
    maxStack: 1,
    durability: 700
  },
  gold_pickaxe: {
    id: 'gold_pickaxe',
    name: 'Gold Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 5,
    speed: 8.5,
    icon: '/ItemSprites/GoldPickaxe.png',
    description: 'Gleaming pickaxe capable of lightning-fast stone extraction.',
    maxStack: 1,
    durability: 550
  },
  ice_pickaxe: {
    id: 'ice_pickaxe',
    name: 'Ice Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 5,
    speed: 7.5,
    icon: '/ItemSprites/IcePickaxe.png',
    description: 'Glacial pickaxe honed from packed mountain ice.',
    maxStack: 1,
    durability: 650
  },
  crystalized_coral_pickaxe: {
    id: 'crystalized_coral_pickaxe',
    name: 'Crystalized Coral Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 6,
    speed: 11.0,
    icon: '/ItemSprites/CrystalizedCoralPickaxe.png',
    description: 'Luminous pickaxe forged with deep crystal and coral.',
    maxStack: 1,
    durability: 1400
  },
  abbysal_pickaxe: {
    id: 'abbysal_pickaxe',
    name: 'Abyssal Pickaxe',
    type: 'tool',
    toolType: 'pickaxe',
    tier: 7,
    speed: 15.0,
    icon: '/ItemSprites/AbbysalPickaxe.png',
    description: 'Peerless volcanic obsidian pickaxe that effortlessly cleaves the deepest bedrock.',
    maxStack: 1,
    durability: 2800
  },

  // --- Tools: Axes ---
  wooden_axe: {
    id: 'wooden_axe',
    name: 'Wooden Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 1,
    speed: 2.0,
    icon: '/ItemSprites/WoodenAxe.png',
    description: 'Rudimentary wood-chopping axe.',
    maxStack: 1,
    durability: 120
  },
  stone_axe: {
    id: 'stone_axe',
    name: 'Stone Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 2,
    speed: 3.5,
    icon: '/ItemSprites/StoneAxe.png',
    description: 'Sturdy stone-headed felling axe.',
    maxStack: 1,
    durability: 250
  },
  tin_axe: {
    id: 'tin_axe',
    name: 'Tin Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 3,
    speed: 4.8,
    icon: '/ItemSprites/TinAxe.png',
    description: 'Agile tin hatchet for rapid log felling.',
    maxStack: 1,
    durability: 350
  },
  re_enforced_axe: {
    id: 're_enforced_axe',
    name: 'Re-Enforced Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 4,
    speed: 6.5,
    icon: '/ItemSprites/Re-EnforcedAxe.png',
    description: 'Heavy steel-reinforced woodcutter axe.',
    maxStack: 1,
    durability: 700
  },
  golden_axe: {
    id: 'golden_axe',
    name: 'Golden Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 5,
    speed: 8.5,
    icon: '/ItemSprites/GoldenAxe.png',
    description: 'Gilded woodcutter axe with exceptional speed.',
    maxStack: 1,
    durability: 550
  },
  crystalized_coral_axe: {
    id: 'crystalized_coral_axe',
    name: 'Crystalized Coral Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 6,
    speed: 11.0,
    icon: '/ItemSprites/CrystalizedCoralAxe.png',
    description: 'Crystalline oceanic axe that slices through old-growth logs with ease.',
    maxStack: 1,
    durability: 1400
  },
  abbysal_axe: {
    id: 'abbysal_axe',
    name: 'Abyssal Axe',
    type: 'tool',
    toolType: 'axe',
    tier: 7,
    speed: 15.0,
    icon: '/ItemSprites/AbbysalAxe.png',
    description: 'Obsidian greataxe that instantly chops through ancient timbers.',
    maxStack: 1,
    durability: 2800
  }
};

/**
 * Returns the active icon for an item.
 * For blocks, dynamically resolves the side texture DataURL generated by TextureAtlas.
 */
export function getItemIcon(item: ItemDef | null | undefined): string {
  if (!item) return '';
  if (item.blockId !== undefined) {
    const sideTex = getBlockSideTexture(item.blockId);
    if (sideTex) return sideTex;
  }
  return item.icon || '';
}

/**
 * Helper to get or dynamically construct an ItemDef for any BlockType in the world.
 */
export function getItemForBlock(block: BlockType): ItemDef {
  // Find registered item with matching blockId
  for (const item of Object.values(ITEM_REGISTRY)) {
    if (item.blockId === block) return item;
  }
  const def = BLOCK_DEFS[block];
  return {
    id: `block_${block}`,
    name: def ? def.name : `Block #${block}`,
    type: 'block',
    blockId: block,
    icon: getBlockSideTexture(block) || '',
    description: `${def?.name || 'Voxel block'} from the frontier world.`,
    maxStack: 64
  };
}

// -------------------------------------------------------------
// Crafting Recipes
// -------------------------------------------------------------

// 1. Inventory Crafter Recipes (1 Log = 1 Plank, 4 Planks = Tool Crafter)
export const INVENTORY_CRAFTING_RECIPES: CraftingRecipe[] = [
  // Planks from individual logs (1 log = 1 plank)
  {
    id: 'craft_redwood_plank',
    result: ITEM_REGISTRY['redwood_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'redwood_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_willow_plank',
    result: ITEM_REGISTRY['willow_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'willow_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_oak_plank',
    result: ITEM_REGISTRY['oak_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'oak_wood', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_everfrost_plank',
    result: ITEM_REGISTRY['everfrost_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'everfrost_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_palm_plank',
    result: ITEM_REGISTRY['palm_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'palm_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_ghost_plank',
    result: ITEM_REGISTRY['ghost_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'ghost_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_rainforest_oak_plank',
    result: ITEM_REGISTRY['rainforest_oak_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'rainforest_oak_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_kapok_plank',
    result: ITEM_REGISTRY['kapok_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'kapok_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_banyan_plank',
    result: ITEM_REGISTRY['banyan_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'banyan_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_strangler_plank',
    result: ITEM_REGISTRY['strangler_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'strangler_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_mahogany_plank',
    result: ITEM_REGISTRY['mahogany_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'mahogany_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  {
    id: 'craft_ceiba_plank',
    result: ITEM_REGISTRY['ceiba_plank'],
    resultCount: 1,
    ingredients: [{ itemId: 'ceiba_log', count: 1 }],
    station: 'inventory',
    category: 'planks'
  },
  // Work Stations: Tool Crafter (costs 4 planks to make)
  {
    id: 'craft_tool_crafter',
    result: ITEM_REGISTRY['tool_crafter'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_plank', count: 4 }],
    station: 'inventory',
    category: 'workstations'
  }
];

// 2. Tool Crafter Recipes (1 plank + 2 of resource X; 2 crystal 2 coral for crystal coral series)
export const TOOL_CRAFTER_RECIPES: CraftingRecipe[] = [
  // --- Shovels ---
  {
    id: 'craft_wooden_shovel',
    result: ITEM_REGISTRY['wooden_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 3 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_stone_shovel',
    result: ITEM_REGISTRY['stone_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'cobblestone', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_tin_shovel',
    result: ITEM_REGISTRY['tin_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'tin_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_iron_shovel',
    result: ITEM_REGISTRY['iron_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'iron_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_gold_shovel',
    result: ITEM_REGISTRY['gold_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'gold_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_crystalized_coral_shovel',
    result: ITEM_REGISTRY['crystalized_coral_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'crystal_block', count: 2 },
      { itemId: 'coral_block', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_abbysal_shovel',
    result: ITEM_REGISTRY['abbysal_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'obsidian', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },

  // --- Pickaxes ---
  {
    id: 'craft_wooden_pickaxe',
    result: ITEM_REGISTRY['wooden_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 3 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_stone_pickaxe',
    result: ITEM_REGISTRY['stone_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'cobblestone', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_tin_pickaxe',
    result: ITEM_REGISTRY['tin_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'tin_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_iron_pickaxe',
    result: ITEM_REGISTRY['iron_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'iron_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_gold_pickaxe',
    result: ITEM_REGISTRY['gold_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'gold_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_ice_pickaxe',
    result: ITEM_REGISTRY['ice_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'packed_ice', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_crystalized_coral_pickaxe',
    result: ITEM_REGISTRY['crystalized_coral_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'crystal_block', count: 2 },
      { itemId: 'coral_block', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_abbysal_pickaxe',
    result: ITEM_REGISTRY['abbysal_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'obsidian', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },

  // --- Axes ---
  {
    id: 'craft_wooden_axe',
    result: ITEM_REGISTRY['wooden_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 3 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_stone_axe',
    result: ITEM_REGISTRY['stone_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'cobblestone', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_tin_axe',
    result: ITEM_REGISTRY['tin_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'tin_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_re_enforced_axe',
    result: ITEM_REGISTRY['re_enforced_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'iron_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_golden_axe',
    result: ITEM_REGISTRY['golden_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'gold_ore', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_crystalized_coral_axe',
    result: ITEM_REGISTRY['crystalized_coral_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'crystal_block', count: 2 },
      { itemId: 'coral_block', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_abbysal_axe',
    result: ITEM_REGISTRY['abbysal_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 1 },
      { itemId: 'obsidian', count: 2 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  }
];

export const ALL_CRAFTING_RECIPES = [
  ...INVENTORY_CRAFTING_RECIPES,
  ...TOOL_CRAFTER_RECIPES
];

export const CRAFTING_RECIPES = ALL_CRAFTING_RECIPES;

// Station Definitions structuring the Horizontal and Vertical Carousels
export const CRAFTING_STATIONS: Record<string, CraftingStationDef> = {
  inventory: {
    id: 'inventory',
    name: 'Inventory Crafter',
    description: 'Personal hand crafting from harvested natural resources.',
    categories: [
      {
        id: 'planks',
        name: 'Planks',
        icon: '🪵',
        recipes: INVENTORY_CRAFTING_RECIPES.filter((r) => r.category === 'planks')
      },
      {
        id: 'workstations',
        name: 'Work Stations',
        icon: '⚒️',
        recipes: INVENTORY_CRAFTING_RECIPES.filter((r) => r.category === 'workstations')
      }
    ]
  },
  tool_crafter: {
    id: 'tool_crafter',
    name: 'Tool Crafter',
    description: 'Specialized workstation for manufacturing shovels, pickaxes, and axes.',
    categories: [
      {
        id: 'shovels',
        name: 'Shovels',
        icon: '/ItemSprites/IronShovel.png',
        recipes: TOOL_CRAFTER_RECIPES.filter((r) => r.category === 'shovels')
      },
      {
        id: 'pickaxes',
        name: 'Pickaxes',
        icon: '/ItemSprites/IronPickaxe.png',
        recipes: TOOL_CRAFTER_RECIPES.filter((r) => r.category === 'pickaxes')
      },
      {
        id: 'axes',
        name: 'Axes',
        icon: '/ItemSprites/Re-EnforcedAxe.png',
        recipes: TOOL_CRAFTER_RECIPES.filter((r) => r.category === 'axes')
      }
    ]
  }
};
