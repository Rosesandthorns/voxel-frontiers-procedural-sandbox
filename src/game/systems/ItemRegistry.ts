import { BlockType, InventorySlot, ItemDef } from '../../types';
import { BLOCK_DEFS, isFlintBlock } from '../voxel/Blocks';
import { getBlockSideTexture } from '../voxel/TextureAtlas';

export interface CraftingIngredient {
  itemId: string; // Specific item id or 'any_plank' / 'any_wood'
  count: number;
}

export type StationType = 'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge';

export interface CraftingRecipe {
  id: string;
  result: ItemDef;
  resultCount: number;
  ingredients: CraftingIngredient[];
  station: StationType;
  category: string;
}

export interface CraftingCategory {
  id: string;
  name: string;
  icon: string; // Side texture data url, sprite url, or emoji
  recipes: CraftingRecipe[];
}

export interface CraftingStationDef {
  id: StationType;
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

export const STONE_ITEM_IDS = [
  'stone',
  'cobblestone',
  'limestone',
  'sandstone',
  'basalt',
  'magma_rock',
  'void_stone',
  'obsidian'
];

export function isStoneItemId(id: string): boolean {
  return STONE_ITEM_IDS.includes(id);
}

export function isStoneTypeItem(item: ItemDef | null | undefined): boolean {
  if (!item) return false;
  if (isStoneItemId(item.id)) return true;
  if (item.blockId !== undefined) {
    return (
      item.blockId === BlockType.STONE ||
      item.blockId === BlockType.COBBLESTONE ||
      item.blockId === BlockType.LIMESTONE ||
      item.blockId === BlockType.SANDSTONE ||
      item.blockId === BlockType.BASALT ||
      item.blockId === BlockType.MAGMA_ROCK ||
      item.blockId === BlockType.VOID_STONE ||
      item.blockId === BlockType.OBSIDIAN ||
      item.blockId === BlockType.ANCIENT_BRICK
    );
  }
  return false;
}

export function isFlintTypeItem(item: ItemDef | null | undefined): boolean {
  if (!item) return false;
  return (
    item.id === 'flint' ||
    item.id === 'black_rock' ||
    (item.blockId !== undefined && isFlintBlock(item.blockId))
  );
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
  water_bucket: {
    id: 'water_bucket',
    name: 'Water Bucket',
    type: 'utility',
    blockId: BlockType.WATER,
    icon: '/ItemSprites/WaterBucket.png',
    description: 'Filled with pure spring water. Right click on any surface to place water and watch it flow like in Minecraft.',
    maxStack: 16
  },
  empty_bucket: {
    id: 'empty_bucket',
    name: 'Empty Bucket',
    type: 'utility',
    icon: '/ItemSprites/EmptyBucket.png',
    description: 'Empty iron pail. Right click on water to scoop it up into a Water Bucket.',
    maxStack: 16
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
  // --- Geological Minerals & Strata ---
  flint: {
    id: 'flint',
    name: 'Flint',
    type: 'utility',
    blockId: BlockType.BLACK_ROCK,
    icon: '/ItemSprites/Flint.png',
    description: 'Sharp, glassy dark nodule harvested from black rocks on limestone cliffs, beach gravel, or chalk veins. Essential for flint knapping and tools. Can be placed on solid cliff faces.',
    maxStack: 64
  },
  chalk: {
    id: 'chalk',
    name: 'Chalk',
    type: 'utility',
    blockId: BlockType.CHALK,
    icon: '/ItemSprites/Chalk.png',
    description: 'Soft, powdery white sedimentary mineral extracted from underground chalk veins.',
    maxStack: 64
  },
  limestone: {
    id: 'limestone',
    name: 'Limestone',
    type: 'block',
    blockId: BlockType.LIMESTONE,
    icon: '',
    description: 'Sedimentary stone forming geological strata on steep inclines and cliffs.',
    maxStack: 64
  },
  black_rock: {
    id: 'black_rock',
    name: 'Black Rock',
    type: 'block',
    blockId: BlockType.BLACK_ROCK,
    icon: '',
    description: 'Dark flint nodule found clinging to limestone cliff faces exposed to air. Right-click to break off flint.',
    maxStack: 64
  },
  beach_gravel: {
    id: 'beach_gravel',
    name: 'Beach Gravel',
    type: 'block',
    blockId: BlockType.BEACH_GRAVEL,
    icon: '',
    description: 'Underwater shoreline sediment filled with pebbles and flint. Yields flint when dug with a shovel.',
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
  stone_bench: {
    id: 'stone_bench',
    name: 'Stone Bench',
    type: 'block',
    blockId: BlockType.STONE_BENCH,
    icon: '',
    description: 'A stone-carving workbench crafted with 2 planks on top of 2 stone. Used with flint to manually carve stone tool heads.',
    maxStack: 64
  },
  furnace: {
    id: 'furnace',
    name: 'Furnace',
    type: 'block',
    blockId: BlockType.FURNACE,
    icon: '',
    description: 'Stone smelting furnace crafted with 4 of any stone. Features 5 fuel slots that determine fire temperature (1 to 5) to smelt ores (~15s per item).',
    maxStack: 64
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    type: 'block',
    blockId: BlockType.FORGE,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="3" width="12" height="11" fill="#1f2937"/><rect x="3" y="2" width="10" height="2" fill="#4b5563"/><rect x="3" y="12" width="10" height="2" fill="#374151"/><rect x="4" y="4" width="8" height="2" fill="#9ca3af"/><rect x="5" y="7" width="6" height="5" fill="#ea580c"/><rect x="6" y="8" width="4" height="4" fill="#facc15"/><rect x="7" y="9" width="2" height="2" fill="#ffffff"/><rect x="2" y="2" width="2" height="2" fill="#e5e7eb"/><rect x="12" y="2" width="2" height="2" fill="#e5e7eb"/></svg>'
    )}`,
    description: 'High-heat metallurgy forge crafted with 8 iron surrounding a furnace. Used to cast iron molds, indent tool molds using fuel, and cast molten materials into tools.',
    maxStack: 64
  },

  // --- Molds & Metallurgy ---
  mold: {
    id: 'mold',
    name: 'Mold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#374151"/><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><rect x="4" y="4" width="8" height="8" fill="#1f2937"/><rect x="5" y="5" width="6" height="6" fill="#111827"/><rect x="6" y="6" width="4" height="4" fill="#030712"/></svg>'
    )}`,
    description: 'Blank casting mold fashioned from 3 iron in the Forge. Indent in the Forge with fuel into a pickaxe, axe, or shovel mold.',
    maxStack: 16
  },
  pickaxe_mold: {
    id: 'pickaxe_mold',
    name: 'Pickaxe Mold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#374151"/><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><rect x="4" y="4" width="8" height="8" fill="#1f2937"/><rect x="4" y="5" width="8" height="2" fill="#090d16"/><rect x="7" y="6" width="2" height="6" fill="#090d16"/><rect x="5" y="4" width="6" height="1" fill="#ea580c"/><rect x="7" y="7" width="2" height="2" fill="#f97316"/></svg>'
    )}`,
    description: 'Indented tool mold shaped for casting pickaxes. Fill with molten materials in the Forge to forge pickaxes.',
    maxStack: 16
  },
  axe_mold: {
    id: 'axe_mold',
    name: 'Axe Mold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#374151"/><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><rect x="4" y="4" width="8" height="8" fill="#1f2937"/><rect x="5" y="4" width="5" height="4" fill="#090d16"/><rect x="6" y="8" width="2" height="4" fill="#090d16"/><rect x="6" y="5" width="3" height="2" fill="#ea580c"/><rect x="7" y="7" width="1" height="2" fill="#f97316"/></svg>'
    )}`,
    description: 'Indented tool mold shaped for casting axes. Fill with molten materials in the Forge to forge axes.',
    maxStack: 16
  },
  shovel_mold: {
    id: 'shovel_mold',
    name: 'Shovel Mold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#374151"/><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><rect x="4" y="4" width="8" height="8" fill="#1f2937"/><rect x="6" y="4" width="4" height="4" fill="#090d16"/><rect x="7" y="8" width="2" height="4" fill="#090d16"/><rect x="7" y="5" width="2" height="2" fill="#ea580c"/><rect x="7" y="7" width="2" height="2" fill="#f97316"/></svg>'
    )}`,
    description: 'Indented tool mold shaped for casting shovels. Fill with molten materials in the Forge to forge shovels.',
    maxStack: 16
  },
  hoe_mold: {
    id: 'hoe_mold',
    name: 'Hoe Mold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#374151"/><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><rect x="4" y="4" width="8" height="8" fill="#1f2937"/><rect x="5" y="4" width="6" height="3" fill="#090d16"/><rect x="5" y="7" width="2" height="3" fill="#090d16"/><rect x="6" y="5" width="4" height="1" fill="#ea580c"/><rect x="5" y="7" width="1" height="2" fill="#f97316"/></svg>'
    )}`,
    description: 'Indented tool mold shaped for casting hoes. Fill with molten materials in the Forge to forge hoes.',
    maxStack: 16
  },

  // --- Molten Materials (Crucibles of Molten Metal) ---
  molten_iron: {
    id: 'molten_iron',
    name: 'Molten Iron',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="4" width="10" height="9" rx="1" fill="#374151"/><rect x="4" y="5" width="8" height="7" fill="#ea580c"/><rect x="5" y="6" width="6" height="5" fill="#f97316"/><rect x="6" y="7" width="4" height="3" fill="#fef08a"/><circle cx="8" cy="8" r="1" fill="#ffffff"/></svg>'
    )}`,
    description: 'Vessel of incandescent liquefied iron. Pour into indented molds to cast durable iron tools.',
    maxStack: 16
  },
  molten_gold: {
    id: 'molten_gold',
    name: 'Molten Gold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="4" width="10" height="9" rx="1" fill="#374151"/><rect x="4" y="5" width="8" height="7" fill="#d97706"/><rect x="5" y="6" width="6" height="5" fill="#f59e0b"/><rect x="6" y="7" width="4" height="3" fill="#fef08a"/><circle cx="8" cy="8" r="1" fill="#ffffff"/></svg>'
    )}`,
    description: 'Vessel of radiant liquefied gold. Pour into indented molds to cast high-speed gilded tools.',
    maxStack: 16
  },
  molten_tin: {
    id: 'molten_tin',
    name: 'Molten Tin',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="4" width="10" height="9" rx="1" fill="#374151"/><rect x="4" y="5" width="8" height="7" fill="#64748b"/><rect x="5" y="6" width="6" height="5" fill="#94a3b8"/><rect x="6" y="7" width="4" height="3" fill="#e2e8f0"/><circle cx="8" cy="8" r="1" fill="#ffffff"/></svg>'
    )}`,
    description: 'Vessel of liquefied tin. Pour into indented molds to cast lightweight tin tools.',
    maxStack: 16
  },

  // --- Smelted Metals & Fuels ---
  iron: {
    id: 'iron',
    name: 'Iron',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="6" width="10" height="5" fill="#9ca3af"/><rect x="4" y="5" width="8" height="2" fill="#e5e7eb"/><rect x="5" y="6" width="6" height="1" fill="#ffffff"/><rect x="2" y="8" width="12" height="3" fill="#6b7280"/><rect x="3" y="10" width="10" height="2" fill="#4b5563"/></svg>'
    )}`,
    description: 'Refined iron bar smelted from Iron Ore in a Furnace (Min Temp 3).',
    maxStack: 64
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="6" width="10" height="5" fill="#f59e0b"/><rect x="4" y="5" width="8" height="2" fill="#fde047"/><rect x="5" y="6" width="6" height="1" fill="#fef9c3"/><rect x="2" y="8" width="12" height="3" fill="#d97706"/><rect x="3" y="10" width="10" height="2" fill="#b45309"/></svg>'
    )}`,
    description: 'Gleaming gold bar smelted from Gold Ore in a Furnace (Min Temp 4).',
    maxStack: 64
  },
  tin: {
    id: 'tin',
    name: 'Tin',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="6" width="10" height="5" fill="#94a3b8"/><rect x="4" y="5" width="8" height="2" fill="#cbd5e1"/><rect x="5" y="6" width="6" height="1" fill="#f1f5f9"/><rect x="2" y="8" width="12" height="3" fill="#64748b"/><rect x="3" y="10" width="10" height="2" fill="#475569"/></svg>'
    )}`,
    description: 'Refined tin bar smelted from Tin Ore in a Furnace (Min Temp 2).',
    maxStack: 64
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="3" width="8" height="10" fill="#1f2937"/><rect x="3" y="5" width="10" height="7" fill="#111827"/><rect x="5" y="4" width="5" height="3" fill="#374151"/><rect x="6" y="8" width="2" height="2" fill="#ea580c"/><rect x="9" y="6" width="2" height="1" fill="#f97316"/></svg>'
    )}`,
    description: 'Concentrated carbon fuel smelted from Wood Logs in a Furnace. Burns for 60s in a Furnace fuel slot.',
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
  },

  // --- Tools: Hoes ---
  wooden_hoe: {
    id: 'wooden_hoe',
    name: 'Wooden Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 1,
    speed: 2.0,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#a16207"/><rect x="12" y="5" width="2" height="3" fill="#a16207"/><rect x="13" y="4" width="1" height="1" fill="#ca8a04"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/><rect x="10" y="5" width="1" height="1" fill="#78350f"/></svg>'
    )}`,
    description: 'Handmade wooden farming hoe. Rapidly clears grass, soil, and crops.',
    maxStack: 1,
    durability: 120
  },
  stone_hoe: {
    id: 'stone_hoe',
    name: 'Stone Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 2,
    speed: 3.5,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#64748b"/><rect x="12" y="5" width="2" height="3" fill="#64748b"/><rect x="13" y="4" width="1" height="1" fill="#94a3b8"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/><rect x="10" y="5" width="1" height="1" fill="#78350f"/></svg>'
    )}`,
    description: 'Sturdy chipped stone farming hoe.',
    maxStack: 1,
    durability: 250
  },
  tin_hoe: {
    id: 'tin_hoe',
    name: 'Tin Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 3,
    speed: 4.8,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#94a3b8"/><rect x="12" y="5" width="2" height="3" fill="#94a3b8"/><rect x="13" y="4" width="1" height="1" fill="#cbd5e1"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/><rect x="10" y="5" width="1" height="1" fill="#78350f"/></svg>'
    )}`,
    description: 'Lightweight tin farming hoe for agile field tilling.',
    maxStack: 1,
    durability: 350
  },
  iron_hoe: {
    id: 'iron_hoe',
    name: 'Iron Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 4,
    speed: 6.5,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#cbd5e1"/><rect x="12" y="5" width="2" height="3" fill="#cbd5e1"/><rect x="13" y="4" width="1" height="1" fill="#ffffff"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/><rect x="10" y="5" width="1" height="1" fill="#78350f"/></svg>'
    )}`,
    description: 'Forged iron farming hoe with excellent cutting power.',
    maxStack: 1,
    durability: 700
  },
  gold_hoe: {
    id: 'gold_hoe',
    name: 'Gold Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 5,
    speed: 8.5,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#facc15"/><rect x="12" y="5" width="2" height="3" fill="#facc15"/><rect x="13" y="4" width="1" height="1" fill="#fef08a"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/><rect x="10" y="5" width="1" height="1" fill="#78350f"/></svg>'
    )}`,
    description: 'Gilded farming hoe with lightning-fast crop harvesting action.',
    maxStack: 1,
    durability: 550
  },
  ice_hoe: {
    id: 'ice_hoe',
    name: 'Ice Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 5,
    speed: 7.5,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#38bdf8"/><rect x="12" y="5" width="2" height="3" fill="#38bdf8"/><rect x="13" y="4" width="1" height="1" fill="#e0f2fe"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/><rect x="10" y="5" width="1" height="1" fill="#78350f"/></svg>'
    )}`,
    description: 'Glacial farming hoe carved from packed mountain ice.',
    maxStack: 1,
    durability: 650
  },
  crystalized_coral_hoe: {
    id: 'crystalized_coral_hoe',
    name: 'Crystalized Coral Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 6,
    speed: 11.0,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#ec4899"/><rect x="12" y="5" width="2" height="3" fill="#f43f5e"/><rect x="13" y="4" width="1" height="1" fill="#fbcfe8"/><rect x="3" y="12" width="2" height="2" fill="#0284c7"/><rect x="5" y="10" width="2" height="2" fill="#0284c7"/><rect x="7" y="8" width="2" height="2" fill="#38bdf8"/><rect x="9" y="6" width="2" height="2" fill="#38bdf8"/><rect x="10" y="5" width="1" height="1" fill="#0284c7"/></svg>'
    )}`,
    description: 'Iridescent oceanic hoe infused with coral crystal.',
    maxStack: 1,
    durability: 1400
  },
  abbysal_hoe: {
    id: 'abbysal_hoe',
    name: 'Abyssal Hoe',
    type: 'tool',
    toolType: 'hoe',
    tier: 7,
    speed: 15.0,
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#7c3aed"/><rect x="12" y="5" width="2" height="3" fill="#18181b"/><rect x="13" y="4" width="1" height="1" fill="#c084fc"/><rect x="3" y="12" width="2" height="2" fill="#374151"/><rect x="5" y="10" width="2" height="2" fill="#374151"/><rect x="7" y="8" width="2" height="2" fill="#4b5563"/><rect x="9" y="6" width="2" height="2" fill="#4b5563"/><rect x="10" y="5" width="1" height="1" fill="#1f2937"/></svg>'
    )}`,
    description: 'Volcanic obsidian scythe-hoe that clears entire swathes of flora in the blink of an eye.',
    maxStack: 1,
    durability: 2800
  },
  // --- Knapped & Forged Tool Heads (Vintage Story Crafting System) ---
  stone_pickaxe_head: {
    id: 'stone_pickaxe_head',
    name: 'Stone Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/StonePickaxeHead.png',
    description: 'Chipped stone pickaxe head knapped from rock. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  stone_axe_head: {
    id: 'stone_axe_head',
    name: 'Stone Axe Head',
    type: 'utility',
    icon: '/ItemSprites/StoneAxeHead.png',
    description: 'Sharp stone axe head knapped from flint/rock. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  stone_shovel_head: {
    id: 'stone_shovel_head',
    name: 'Stone Shovel Head',
    type: 'utility',
    icon: '/ItemSprites/StoneShovelHead.png',
    description: 'Broad stone shovel blade knapped from rock. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  iron_pickaxe_head: {
    id: 'iron_pickaxe_head',
    name: 'Iron Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/IronPickaxeHead.png',
    description: 'Forged iron pickaxe head hammered on the anvil. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  iron_axe_head: {
    id: 'iron_axe_head',
    name: 'Iron Axe Head',
    type: 'utility',
    icon: '/ItemSprites/IronAxeHead.png',
    description: 'Forged iron axe blade hammered on the anvil. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  iron_shovel_head: {
    id: 'iron_shovel_head',
    name: 'Iron Shovel Head',
    type: 'utility',
    icon: '/ItemSprites/IronShovelHead.png',
    description: 'Forged iron shovel head hammered on the anvil. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  tin_pickaxe_head: {
    id: 'tin_pickaxe_head',
    name: 'Tin Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/TinPickaxeHead.png',
    description: 'Forged tin pickaxe head worked on the anvil. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  tin_axe_head: {
    id: 'tin_axe_head',
    name: 'Tin Axe Head',
    type: 'utility',
    icon: '/ItemSprites/TinAxe.png',
    description: 'Forged tin axe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  tin_shovel_head: {
    id: 'tin_shovel_head',
    name: 'Tin Shovel Head',
    type: 'utility',
    icon: '/ItemSprites/TinShovel.png',
    description: 'Forged tin shovel blade. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  gold_pickaxe_head: {
    id: 'gold_pickaxe_head',
    name: 'Gold Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/GoldPickaxeHead.png',
    description: 'Heavy gold pickaxe head forged on the anvil. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  gold_axe_head: {
    id: 'gold_axe_head',
    name: 'Gold Axe Head',
    type: 'utility',
    icon: '/ItemSprites/GoldenAxe.png',
    description: 'Forged golden axe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  gold_shovel_head: {
    id: 'gold_shovel_head',
    name: 'Gold Shovel Head',
    type: 'utility',
    icon: '/ItemSprites/GoldShovel.png',
    description: 'Forged golden shovel head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  ice_pickaxe_head: {
    id: 'ice_pickaxe_head',
    name: 'Ice Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/IcePickaxe.png',
    description: 'Carved glacial ice pickaxe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  ice_hoe_head: {
    id: 'ice_hoe_head',
    name: 'Ice Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#38bdf8"/><rect x="10" y="7" width="3" height="5" fill="#38bdf8"/><rect x="5" y="5" width="6" height="1" fill="#e0f2fe"/><rect x="11" y="8" width="1" height="3" fill="#0284c7"/></svg>'
    )}`,
    description: 'Glacial ice hoe blade carved from ice. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  crystalized_coral_pickaxe_head: {
    id: 'crystalized_coral_pickaxe_head',
    name: 'Crystal Coral Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/CrystalizedCoralPickaxe.png',
    description: 'Living oceanic crystal pickaxe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  crystalized_coral_axe_head: {
    id: 'crystalized_coral_axe_head',
    name: 'Crystal Coral Axe Head',
    type: 'utility',
    icon: '/ItemSprites/CrystalizedCoralAxe.png',
    description: 'Living oceanic crystal axe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  crystalized_coral_shovel_head: {
    id: 'crystalized_coral_shovel_head',
    name: 'Crystal Coral Shovel Head',
    type: 'utility',
    icon: '/ItemSprites/CrystalizedCoralShovel.png',
    description: 'Living oceanic crystal shovel blade. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  abbysal_pickaxe_head: {
    id: 'abbysal_pickaxe_head',
    name: 'Abyssal Pickaxe Head',
    type: 'utility',
    icon: '/ItemSprites/AbbysalPickaxe.png',
    description: 'Razor-sharp volcanic obsidian pickaxe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  abbysal_axe_head: {
    id: 'abbysal_axe_head',
    name: 'Abyssal Axe Head',
    type: 'utility',
    icon: '/ItemSprites/AbbysalAxe.png',
    description: 'Razor-sharp volcanic obsidian axe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  abbysal_shovel_head: {
    id: 'abbysal_shovel_head',
    name: 'Abyssal Shovel Head',
    type: 'utility',
    icon: '/ItemSprites/AbbysalShovel.png',
    description: 'Razor-sharp volcanic obsidian shovel blade. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  stone_hoe_head: {
    id: 'stone_hoe_head',
    name: 'Stone Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#64748b"/><rect x="10" y="7" width="3" height="5" fill="#64748b"/><rect x="5" y="5" width="6" height="1" fill="#94a3b8"/><rect x="11" y="8" width="1" height="3" fill="#475569"/></svg>'
    )}`,
    description: 'Chipped stone hoe blade knapped from rock or shaped at the Forge. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  tin_hoe_head: {
    id: 'tin_hoe_head',
    name: 'Tin Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#94a3b8"/><rect x="10" y="7" width="3" height="5" fill="#94a3b8"/><rect x="5" y="5" width="6" height="1" fill="#cbd5e1"/><rect x="11" y="8" width="1" height="3" fill="#64748b"/></svg>'
    )}`,
    description: 'Forged tin hoe blade worked on the anvil. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  iron_hoe_head: {
    id: 'iron_hoe_head',
    name: 'Iron Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#cbd5e1"/><rect x="10" y="7" width="3" height="5" fill="#cbd5e1"/><rect x="5" y="5" width="6" height="1" fill="#ffffff"/><rect x="11" y="8" width="1" height="3" fill="#94a3b8"/></svg>'
    )}`,
    description: 'Forged iron hoe blade hammered on the anvil or cast at the Forge. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  gold_hoe_head: {
    id: 'gold_hoe_head',
    name: 'Gold Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#facc15"/><rect x="10" y="7" width="3" height="5" fill="#facc15"/><rect x="5" y="5" width="6" height="1" fill="#fef08a"/><rect x="11" y="8" width="1" height="3" fill="#ca8a04"/></svg>'
    )}`,
    description: 'Forged gold hoe blade crafted on the anvil or cast at the Forge. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  crystalized_coral_hoe_head: {
    id: 'crystalized_coral_hoe_head',
    name: 'Crystal Coral Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#ec4899"/><rect x="10" y="7" width="3" height="5" fill="#f43f5e"/><rect x="5" y="5" width="6" height="1" fill="#fbcfe8"/><rect x="11" y="8" width="1" height="3" fill="#be185d"/></svg>'
    )}`,
    description: 'Living oceanic crystal hoe head. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  abbysal_hoe_head: {
    id: 'abbysal_hoe_head',
    name: 'Abyssal Hoe Head',
    type: 'utility',
    icon: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="3" fill="#7c3aed"/><rect x="10" y="7" width="3" height="5" fill="#18181b"/><rect x="5" y="5" width="6" height="1" fill="#c084fc"/><rect x="11" y="8" width="1" height="3" fill="#4c1d95"/></svg>'
    )}`,
    description: 'Razor-sharp volcanic obsidian hoe blade. Assemble with a wooden plank in the 3x3 grid.',
    maxStack: 16
  },
  obsidian_blade: {
    id: 'obsidian_blade',
    name: 'Obsidian Abyssal Blade',
    type: 'utility',
    icon: '/ItemSprites/ObsidianBlade.png',
    description: 'Razor-sharp volcanic glass blade knapped from obsidian. Assemble with a wooden plank.',
    maxStack: 16
  }
};

/**
 * Returns the active icon for an item.
 * For blocks, dynamically resolves the side texture DataURL generated by TextureAtlas.
 */
export function getItemIcon(item: ItemDef | null | undefined): string {
  if (!item) return '';

  const isImageStr = (s: string) =>
    s.startsWith('data:image') ||
    s.startsWith('/') ||
    s.startsWith('http') ||
    s.endsWith('.png') ||
    s.endsWith('.webp');

  if (item.icon && isImageStr(item.icon)) {
    return item.icon;
  }

  // Known item overrides
  if (item.id === 'water_bucket') return '/ItemSprites/WaterBucket.png';
  if (item.id === 'empty_bucket') return '/ItemSprites/EmptyBucket.png';
  if (item.id === 'chalk') return '/ItemSprites/Chalk.png';
  if (item.id === 'flint') return '/ItemSprites/Flint.png';

  // Registered item lookup
  if (item.id && ITEM_REGISTRY[item.id]?.icon && isImageStr(ITEM_REGISTRY[item.id].icon)) {
    return ITEM_REGISTRY[item.id].icon;
  }

  // Block texture resolution
  if (item.blockId !== undefined) {
    const sideTex = getBlockSideTexture(item.blockId);
    if (sideTex) return sideTex;
  }

  return item.icon && isImageStr(item.icon) ? item.icon : '';
}

/**
 * Helper to get or dynamically construct an ItemDef for any BlockType in the world.
 */
export function getItemForBlock(block: BlockType): ItemDef {
  if (isFlintBlock(block)) {
    return ITEM_REGISTRY['flint'] || ITEM_REGISTRY['black_rock'];
  }
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
  // Work Stations: Tool Crafter (costs 4 planks to make), Stone Bench (2 planks on top, 2 stone on bottom), & Furnace (4 of any stone)
  {
    id: 'craft_tool_crafter',
    result: ITEM_REGISTRY['tool_crafter'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_plank', count: 4 }],
    station: 'inventory',
    category: 'workstations'
  },
  {
    id: 'craft_stone_bench',
    result: ITEM_REGISTRY['stone_bench'],
    resultCount: 1,
    ingredients: [
      { itemId: 'any_plank', count: 2 },
      { itemId: 'any_stone', count: 2 }
    ],
    station: 'inventory',
    category: 'workstations'
  },
  {
    id: 'craft_furnace',
    result: ITEM_REGISTRY['furnace'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_stone', count: 4 }],
    station: 'inventory',
    category: 'workstations'
  },
  {
    id: 'craft_forge',
    result: ITEM_REGISTRY['forge'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron', count: 8 },
      { itemId: 'furnace', count: 1 }
    ],
    station: 'inventory',
    category: 'workstations'
  },
  // Basic Wooden Tools (Field Craftable - Only single recipe for each wooden tool)
  {
    id: 'craft_wooden_pickaxe',
    result: ITEM_REGISTRY['wooden_pickaxe'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_plank', count: 3 }],
    station: 'inventory',
    category: 'tools'
  },
  {
    id: 'craft_wooden_axe',
    result: ITEM_REGISTRY['wooden_axe'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_plank', count: 3 }],
    station: 'inventory',
    category: 'tools'
  },
  {
    id: 'craft_wooden_shovel',
    result: ITEM_REGISTRY['wooden_shovel'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_plank', count: 3 }],
    station: 'inventory',
    category: 'tools'
  },
  {
    id: 'craft_wooden_hoe',
    result: ITEM_REGISTRY['wooden_hoe'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_plank', count: 3 }],
    station: 'inventory',
    category: 'tools'
  },
  // Refined Blocks
  {
    id: 'craft_sandstone',
    result: ITEM_REGISTRY['sandstone'],
    resultCount: 1,
    ingredients: [{ itemId: 'sand', count: 4 }],
    station: 'inventory',
    category: 'blocks'
  },
  {
    id: 'craft_packed_ice',
    result: ITEM_REGISTRY['packed_ice'],
    resultCount: 1,
    ingredients: [{ itemId: 'snow', count: 4 }],
    station: 'inventory',
    category: 'blocks'
  },
  {
    id: 'craft_ice_pickaxe_head',
    result: ITEM_REGISTRY['ice_pickaxe_head'],
    resultCount: 1,
    ingredients: [{ itemId: 'packed_ice', count: 2 }],
    station: 'inventory',
    category: 'tools'
  },
  {
    id: 'craft_ice_hoe_head',
    result: ITEM_REGISTRY['ice_hoe_head'],
    resultCount: 1,
    ingredients: [{ itemId: 'packed_ice', count: 2 }],
    station: 'inventory',
    category: 'tools'
  }
];

// 2. Tool Crafter Recipes (Tool Assembly requiring Tool Heads)
export const TOOL_CRAFTER_RECIPES: CraftingRecipe[] = [
  // --- Pickaxes ---
  {
    id: 'craft_assemble_stone_pickaxe',
    result: ITEM_REGISTRY['stone_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'stone_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_assemble_tin_pickaxe',
    result: ITEM_REGISTRY['tin_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'tin_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_assemble_iron_pickaxe',
    result: ITEM_REGISTRY['iron_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_assemble_gold_pickaxe',
    result: ITEM_REGISTRY['gold_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_assemble_ice_pickaxe',
    result: ITEM_REGISTRY['ice_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'ice_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_assemble_crystalized_coral_pickaxe',
    result: ITEM_REGISTRY['crystalized_coral_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'crystalized_coral_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },
  {
    id: 'craft_assemble_abbysal_pickaxe',
    result: ITEM_REGISTRY['abbysal_pickaxe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'abbysal_pickaxe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'pickaxes'
  },

  // --- Axes ---
  {
    id: 'craft_assemble_stone_axe',
    result: ITEM_REGISTRY['stone_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'stone_axe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_assemble_tin_axe',
    result: ITEM_REGISTRY['tin_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'tin_axe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_assemble_iron_axe',
    result: ITEM_REGISTRY['re_enforced_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron_axe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_assemble_gold_axe',
    result: ITEM_REGISTRY['golden_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold_axe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_assemble_crystalized_coral_axe',
    result: ITEM_REGISTRY['crystalized_coral_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'crystalized_coral_axe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },
  {
    id: 'craft_assemble_abbysal_axe',
    result: ITEM_REGISTRY['abbysal_axe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'abbysal_axe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'axes'
  },

  // --- Shovels ---
  {
    id: 'craft_assemble_stone_shovel',
    result: ITEM_REGISTRY['stone_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'stone_shovel_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_assemble_tin_shovel',
    result: ITEM_REGISTRY['tin_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'tin_shovel_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_assemble_iron_shovel',
    result: ITEM_REGISTRY['iron_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron_shovel_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_assemble_gold_shovel',
    result: ITEM_REGISTRY['gold_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold_shovel_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_assemble_crystalized_coral_shovel',
    result: ITEM_REGISTRY['crystalized_coral_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'crystalized_coral_shovel_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },
  {
    id: 'craft_assemble_abbysal_shovel',
    result: ITEM_REGISTRY['abbysal_shovel'],
    resultCount: 1,
    ingredients: [
      { itemId: 'abbysal_shovel_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'shovels'
  },

  // --- Hoes ---
  {
    id: 'craft_assemble_stone_hoe',
    result: ITEM_REGISTRY['stone_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'stone_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  },
  {
    id: 'craft_assemble_tin_hoe',
    result: ITEM_REGISTRY['tin_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'tin_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  },
  {
    id: 'craft_assemble_iron_hoe',
    result: ITEM_REGISTRY['iron_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  },
  {
    id: 'craft_assemble_gold_hoe',
    result: ITEM_REGISTRY['gold_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  },
  {
    id: 'craft_assemble_ice_hoe',
    result: ITEM_REGISTRY['ice_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'ice_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  },
  {
    id: 'craft_assemble_crystalized_coral_hoe',
    result: ITEM_REGISTRY['crystalized_coral_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'crystalized_coral_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  },
  {
    id: 'craft_assemble_abbysal_hoe',
    result: ITEM_REGISTRY['abbysal_hoe'],
    resultCount: 1,
    ingredients: [
      { itemId: 'abbysal_hoe_head', count: 1 },
      { itemId: 'any_plank', count: 1 }
    ],
    station: 'tool_crafter',
    category: 'hoes'
  }
];

// -------------------------------------------------------------
// 3. Furnace Smelting System (5 Fuel Slots, Temp 1..5, ~15s Smelt Time)
// -------------------------------------------------------------
export const SMELT_DURATION_SECONDS = 15.0;

export interface FurnaceSmeltRecipe {
  id: string;
  inputItemId: string; // specific item id or 'any_wood'
  inputLabel: string;
  result: ItemDef;
  resultCount: number;
  minTemp: number; // 1 (absolute min) to 5 (absolute max)
  smeltTime: number; // seconds per item (~15s)
}

export const FURNACE_SMELTING_RECIPES: FurnaceSmeltRecipe[] = [
  {
    id: 'smelt_charcoal',
    inputItemId: 'any_wood',
    inputLabel: 'Any Wood Log',
    result: ITEM_REGISTRY['charcoal'],
    resultCount: 1,
    minTemp: 1,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_stone',
    inputItemId: 'cobblestone',
    inputLabel: 'Cobblestone',
    result: ITEM_REGISTRY['stone'],
    resultCount: 1,
    minTemp: 1,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_glass',
    inputItemId: 'sand',
    inputLabel: 'Sand',
    result: ITEM_REGISTRY['glass'],
    resultCount: 1,
    minTemp: 2,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_tin',
    inputItemId: 'tin_ore',
    inputLabel: 'Tin Ore',
    result: ITEM_REGISTRY['tin'],
    resultCount: 1,
    minTemp: 2,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_molten_tin',
    inputItemId: 'tin',
    inputLabel: 'Tin Ingot',
    result: ITEM_REGISTRY['molten_tin'],
    resultCount: 1,
    minTemp: 2,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_iron',
    inputItemId: 'iron_ore',
    inputLabel: 'Iron Ore',
    result: ITEM_REGISTRY['iron'],
    resultCount: 1,
    minTemp: 3,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_molten_iron',
    inputItemId: 'iron',
    inputLabel: 'Iron Ingot',
    result: ITEM_REGISTRY['molten_iron'],
    resultCount: 1,
    minTemp: 3,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_gold',
    inputItemId: 'gold_ore',
    inputLabel: 'Gold Ore',
    result: ITEM_REGISTRY['gold'],
    resultCount: 1,
    minTemp: 4,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_molten_gold',
    inputItemId: 'gold',
    inputLabel: 'Gold Ingot',
    result: ITEM_REGISTRY['molten_gold'],
    resultCount: 1,
    minTemp: 4,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_magma_rock',
    inputItemId: 'basalt',
    inputLabel: 'Basalt',
    result: ITEM_REGISTRY['magma_rock'],
    resultCount: 1,
    minTemp: 5,
    smeltTime: SMELT_DURATION_SECONDS
  },
  {
    id: 'smelt_obsidian_blade',
    inputItemId: 'obsidian',
    inputLabel: 'Obsidian',
    result: ITEM_REGISTRY['obsidian_blade'],
    resultCount: 1,
    minTemp: 5,
    smeltTime: SMELT_DURATION_SECONDS
  }
];

export function getFurnaceRecipeForInput(item: ItemDef | null | undefined): FurnaceSmeltRecipe | null {
  if (!item) return null;
  const isWood =
    isLogItemId(item.id) ||
    item.id.endsWith('_log') ||
    item.id.endsWith('_wood') ||
    item.blockId === BlockType.OAK_WOOD ||
    item.blockId === BlockType.REDWOOD_LOG ||
    item.blockId === BlockType.LIMELEAF_LOG ||
    item.blockId === BlockType.EVERFROST_LOG ||
    item.blockId === BlockType.PALM_LOG ||
    item.blockId === BlockType.GHOST_LOG ||
    item.blockId === BlockType.RAINFOREST_OAK_LOG ||
    item.blockId === BlockType.KAPOK_LOG ||
    item.blockId === BlockType.BANYAN_LOG ||
    item.blockId === BlockType.STRANGLER_LOG ||
    item.blockId === BlockType.MAHOGANY_LOG ||
    item.blockId === BlockType.CEIBA_LOG;

  for (const r of FURNACE_SMELTING_RECIPES) {
    if (r.inputItemId === 'any_wood' && isWood) return r;
    if (r.inputItemId === item.id) return r;
    if (r.inputItemId === 'iron_ore' && item.blockId === BlockType.IRON_ORE) return r;
    if (r.inputItemId === 'gold_ore' && item.blockId === BlockType.GOLD_ORE) return r;
    if (r.inputItemId === 'tin_ore' && item.blockId === BlockType.TIN_ORE) return r;
    if (r.inputItemId === 'cobblestone' && item.blockId === BlockType.COBBLESTONE) return r;
    if (r.inputItemId === 'sand' && item.blockId === BlockType.SAND) return r;
    if (r.inputItemId === 'basalt' && item.blockId === BlockType.BASALT) return r;
    if (r.inputItemId === 'obsidian' && item.blockId === BlockType.OBSIDIAN) return r;
  }
  return null;
}

/**
 * Returns the burn duration in seconds for a valid fuel item, or 0 if not fuel.
 * Different fuel sources last for different periods of time:
 * - Brush / Dried Seaweed / Shrubs: 8s
 * - Wooden Planks: 12s
 * - Wooden Tools: 15s
 * - Wood Logs: 25s
 * - Charcoal: 60s
 * - Magma Rock: 120s
 */
export function getFuelBurnDuration(item: ItemDef | null | undefined): number {
  if (!item) return 0;
  if (item.id === 'magma_rock' || item.blockId === BlockType.MAGMA_ROCK) return 120;
  if (item.id === 'charcoal') return 60;
  if (
    isLogItemId(item.id) ||
    item.id.endsWith('_log') ||
    item.id.endsWith('_wood') ||
    item.blockId === BlockType.OAK_WOOD ||
    item.blockId === BlockType.REDWOOD_LOG ||
    item.blockId === BlockType.LIMELEAF_LOG ||
    item.blockId === BlockType.EVERFROST_LOG ||
    item.blockId === BlockType.PALM_LOG ||
    item.blockId === BlockType.GHOST_LOG ||
    item.blockId === BlockType.RAINFOREST_OAK_LOG ||
    item.blockId === BlockType.KAPOK_LOG ||
    item.blockId === BlockType.BANYAN_LOG ||
    item.blockId === BlockType.STRANGLER_LOG ||
    item.blockId === BlockType.MAHOGANY_LOG ||
    item.blockId === BlockType.CEIBA_LOG
  ) {
    return 25;
  }
  if (item.id.startsWith('wooden_')) return 15;
  if (
    isPlankItemId(item.id) ||
    item.id.endsWith('_plank') ||
    item.id.endsWith('_planks')
  ) {
    return 12;
  }
  if (
    item.blockId === BlockType.DRIED_SEAWEED ||
    item.blockId === BlockType.WITHERED_SHRUB ||
    item.blockId === BlockType.ASHEN_BRUSH ||
    item.blockId === BlockType.THORN_BUSH ||
    item.blockId === BlockType.VERDANT_SHRUB ||
    item.blockId === BlockType.WATER_REED ||
    item.blockId === BlockType.MARSHROOT
  ) {
    return 8;
  }
  return 0;
}

export function isFuelItem(item: ItemDef | null | undefined): boolean {
  return getFuelBurnDuration(item) > 0;
}

export const FUEL_SOURCE_GUIDE: Array<{ name: string; duration: number; description: string }> = [
  { name: 'Dry Brush / Shrubs', duration: 8, description: 'Fast-burning kindling (8s per item)' },
  { name: 'Wooden Planks', duration: 12, description: 'Standard milled lumber fuel (12s per item)' },
  { name: 'Wooden Tools', duration: 15, description: 'Spare wooden tools (15s per item)' },
  { name: 'Wood Logs', duration: 25, description: 'Dense natural timber logs (25s per item)' },
  { name: 'Charcoal', duration: 60, description: 'High-heat carbonized wood (60s per item)' },
  { name: 'Magma Rock', duration: 120, description: 'Volcanic thermal core (120s per item)' }
];

export interface FurnaceFuelSlot {
  item: ItemDef | null;
  count: number;
  burnRemaining: number;
  burnDuration: number;
  burningItem: ItemDef | null;
}

export interface FurnaceState {
  inputSlot: InventorySlot;
  outputSlot: InventorySlot;
  fuelSlots: FurnaceFuelSlot[]; // 5 fuel slots
  smeltProgress: number; // 0 to 15s
}

export function createDefaultFurnaceState(): FurnaceState {
  return {
    inputSlot: { item: null, count: 0 },
    outputSlot: { item: null, count: 0 },
    fuelSlots: Array.from({ length: 5 }, () => ({
      item: null,
      count: 0,
      burnRemaining: 0,
      burnDuration: 0,
      burningItem: null
    })),
    smeltProgress: 0
  };
}

export function cloneFurnaceState(state: FurnaceState): FurnaceState {
  return {
    inputSlot: { ...state.inputSlot },
    outputSlot: { ...state.outputSlot },
    fuelSlots: state.fuelSlots.map((f) => ({ ...f })),
    smeltProgress: state.smeltProgress
  };
}

/**
 * Computes the fire temperature (0 when cold, 1 to 5 based on how many of the 5 fuel slots are filled or burning).
 * 1 is the absolute min active temperature and 5 is the absolute max.
 */
export function getFurnaceTemperature(state: FurnaceState): number {
  let temp = 0;
  for (let i = 0; i < 5; i++) {
    const f = state.fuelSlots[i];
    if (f && (f.burnRemaining > 0 || (f.item && f.count > 0 && isFuelItem(f.item)))) {
      temp++;
    }
  }
  return temp;
}

/**
 * Advances the furnace simulation by dt seconds.
 */
export function tickFurnaceState(
  prev: FurnaceState,
  dt: number
): { next: FurnaceState; changed: boolean; smeltedItem: ItemDef | null } {
  const recipe = prev.inputSlot.item && prev.inputSlot.count > 0
    ? getFurnaceRecipeForInput(prev.inputSlot.item)
    : null;
  const canOutput = Boolean(
    recipe &&
    (!prev.outputSlot.item ||
      (prev.outputSlot.item.id === recipe.result.id &&
        prev.outputSlot.count + recipe.resultCount <= (recipe.result.maxStack || 64)))
  );

  const anyBurning = prev.fuelSlots.some((f) => f.burnRemaining > 0);
  const potentialTemp = getFurnaceTemperature(prev);
  const canStartOrContinueSmelt = Boolean(recipe && canOutput && potentialTemp >= recipe.minTemp);

  if (!anyBurning && !canStartOrContinueSmelt && prev.smeltProgress <= 0) {
    return { next: prev, changed: false, smeltedItem: null };
  }

  const next = cloneFurnaceState(prev);
  let smeltedItem: ItemDef | null = null;

  // 1. Tick down any currently burning fuel slots
  for (let i = 0; i < 5; i++) {
    const slot = next.fuelSlots[i];
    if (slot.burnRemaining > 0) {
      slot.burnRemaining = Math.max(0, slot.burnRemaining - dt);
      if (slot.burnRemaining <= 0) {
        slot.burnRemaining = 0;
        slot.burnDuration = 0;
        slot.burningItem = null;
      }
    }
  }

  // 2. Re-evaluate available heat slots after burn tick
  const currentPotentialTemp = getFurnaceTemperature(next);
  if (recipe && canOutput && currentPotentialTemp >= recipe.minTemp) {
    // Ignite 1 unit of fuel in any slot that has fuel loaded and isn't currently burning
    for (let i = 0; i < 5; i++) {
      const slot = next.fuelSlots[i];
      if (slot.burnRemaining <= 0 && slot.item && slot.count > 0 && isFuelItem(slot.item)) {
        const dur = getFuelBurnDuration(slot.item);
        slot.burnRemaining = dur;
        slot.burnDuration = dur;
        slot.burningItem = slot.item;
        slot.count -= 1;
        if (slot.count <= 0) {
          slot.item = null;
          slot.count = 0;
        }
      }
    }
  }

  // 3. Count active burning slots and progress smelting (~15s per item)
  let burningSlotsCount = 0;
  for (let i = 0; i < 5; i++) {
    if (next.fuelSlots[i].burnRemaining > 0) burningSlotsCount++;
  }

  if (recipe && canOutput && burningSlotsCount >= recipe.minTemp) {
    next.smeltProgress += dt;
    if (next.smeltProgress >= recipe.smeltTime) {
      next.smeltProgress -= recipe.smeltTime;
      next.inputSlot.count -= 1;
      if (next.inputSlot.count <= 0) {
        next.inputSlot.item = null;
        next.inputSlot.count = 0;
        next.smeltProgress = 0;
      }

      if (!next.outputSlot.item) {
        next.outputSlot.item = recipe.result;
        next.outputSlot.count = recipe.resultCount;
      } else {
        next.outputSlot.count += recipe.resultCount;
      }
      smeltedItem = recipe.result;
    }
  } else if (!recipe || !canOutput) {
    next.smeltProgress = 0;
  } else if (burningSlotsCount < recipe.minTemp) {
    next.smeltProgress = Math.max(0, next.smeltProgress - dt * 0.5);
  }

  return { next, changed: true, smeltedItem };
}

export const FORGE_RECIPES: CraftingRecipe[] = [
  // 1. Molds (make molds using 3 iron)
  {
    id: 'forge_craft_mold',
    result: ITEM_REGISTRY['mold'],
    resultCount: 1,
    ingredients: [{ itemId: 'iron', count: 3 }],
    station: 'forge',
    category: 'molds'
  },

  // 2. Indenting Molds (using 1 mold and 1 fuel source to indent pickaxe, axe, or shovel mold)
  {
    id: 'forge_indent_pickaxe_mold',
    result: ITEM_REGISTRY['pickaxe_mold'],
    resultCount: 1,
    ingredients: [
      { itemId: 'mold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'indenting'
  },
  {
    id: 'forge_indent_axe_mold',
    result: ITEM_REGISTRY['axe_mold'],
    resultCount: 1,
    ingredients: [
      { itemId: 'mold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'indenting'
  },
  {
    id: 'forge_indent_shovel_mold',
    result: ITEM_REGISTRY['shovel_mold'],
    resultCount: 1,
    ingredients: [
      { itemId: 'mold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'indenting'
  },
  {
    id: 'forge_indent_hoe_mold',
    result: ITEM_REGISTRY['hoe_mold'],
    resultCount: 1,
    ingredients: [
      { itemId: 'mold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'indenting'
  },

  // 3. Stone Tool Heads (Forged/chipped from rock)
  {
    id: 'forge_stone_pickaxe_head',
    result: ITEM_REGISTRY['stone_pickaxe_head'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_stone', count: 1 }],
    station: 'forge',
    category: 'stone_heads'
  },
  {
    id: 'forge_stone_axe_head',
    result: ITEM_REGISTRY['stone_axe_head'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_stone', count: 1 }],
    station: 'forge',
    category: 'stone_heads'
  },
  {
    id: 'forge_stone_shovel_head',
    result: ITEM_REGISTRY['stone_shovel_head'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_stone', count: 1 }],
    station: 'forge',
    category: 'stone_heads'
  },
  {
    id: 'forge_stone_hoe_head',
    result: ITEM_REGISTRY['stone_hoe_head'],
    resultCount: 1,
    ingredients: [{ itemId: 'any_stone', count: 1 }],
    station: 'forge',
    category: 'stone_heads'
  },

  // 4. Iron Tool Heads (Forged from Iron Ingot + Fuel)
  {
    id: 'forge_iron_pickaxe_head',
    result: ITEM_REGISTRY['iron_pickaxe_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'iron_heads'
  },
  {
    id: 'forge_iron_axe_head',
    result: ITEM_REGISTRY['iron_axe_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'iron_heads'
  },
  {
    id: 'forge_iron_shovel_head',
    result: ITEM_REGISTRY['iron_shovel_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'iron_heads'
  },
  {
    id: 'forge_iron_hoe_head',
    result: ITEM_REGISTRY['iron_hoe_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'iron', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'iron_heads'
  },

  // 5. Gold Tool Heads (Forged from Gold Ingot + Fuel)
  {
    id: 'forge_gold_pickaxe_head',
    result: ITEM_REGISTRY['gold_pickaxe_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'gold_heads'
  },
  {
    id: 'forge_gold_axe_head',
    result: ITEM_REGISTRY['gold_axe_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'gold_heads'
  },
  {
    id: 'forge_gold_shovel_head',
    result: ITEM_REGISTRY['gold_shovel_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'gold_heads'
  },
  {
    id: 'forge_gold_hoe_head',
    result: ITEM_REGISTRY['gold_hoe_head'],
    resultCount: 1,
    ingredients: [
      { itemId: 'gold', count: 1 },
      { itemId: 'any_fuel', count: 1 }
    ],
    station: 'forge',
    category: 'gold_heads'
  }
];

export function isMoldItem(item: ItemDef | null | undefined): boolean {
  if (!item) return false;
  return (
    item.id === 'mold' ||
    item.id === 'pickaxe_mold' ||
    item.id === 'axe_mold' ||
    item.id === 'shovel_mold' ||
    item.id === 'hoe_mold'
  );
}

export const ALL_CRAFTING_RECIPES = [
  ...INVENTORY_CRAFTING_RECIPES,
  ...TOOL_CRAFTER_RECIPES,
  ...FORGE_RECIPES
];

export const CRAFTING_RECIPES = ALL_CRAFTING_RECIPES;

// Station Definitions structuring categories and recipes
export const CRAFTING_STATIONS: Record<string, CraftingStationDef> = {
  inventory: {
    id: 'inventory',
    name: 'Field Crafting',
    description: 'Personal hand crafting from harvested natural resources.',
    categories: [
      {
        id: 'planks',
        name: 'Planks',
        icon: '/ItemSprites/WoodenAxe.png',
        recipes: INVENTORY_CRAFTING_RECIPES.filter((r) => r.category === 'planks')
      },
      {
        id: 'tools',
        name: 'Wooden Tools',
        icon: '/ItemSprites/WoodenPickaxe.png',
        recipes: INVENTORY_CRAFTING_RECIPES.filter((r) => r.category === 'tools')
      },
      {
        id: 'workstations',
        name: 'Workstations',
        icon: '/ItemSprites/IronPickaxeHead.png',
        recipes: INVENTORY_CRAFTING_RECIPES.filter((r) => r.category === 'workstations')
      },
      {
        id: 'blocks',
        name: 'Blocks',
        icon: '/ItemSprites/StonePickaxe.png',
        recipes: INVENTORY_CRAFTING_RECIPES.filter((r) => r.category === 'blocks')
      }
    ]
  },
  tool_crafter: {
    id: 'tool_crafter',
    name: 'Tool Crafter',
    description: 'Specialized workstation for manufacturing and assembling tools.',
    categories: [
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
      },
      {
        id: 'shovels',
        name: 'Shovels',
        icon: '/ItemSprites/IronShovel.png',
        recipes: TOOL_CRAFTER_RECIPES.filter((r) => r.category === 'shovels')
      },
      {
        id: 'hoes',
        name: 'Hoes',
        icon: `data:image/svg+xml;utf8,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="9" y="3" width="5" height="2" fill="#cbd5e1"/><rect x="12" y="5" width="2" height="3" fill="#cbd5e1"/><rect x="3" y="12" width="2" height="2" fill="#78350f"/><rect x="5" y="10" width="2" height="2" fill="#78350f"/><rect x="7" y="8" width="2" height="2" fill="#92400e"/><rect x="9" y="6" width="2" height="2" fill="#92400e"/></svg>'
        )}`,
        recipes: TOOL_CRAFTER_RECIPES.filter((r) => r.category === 'hoes')
      }
    ]
  },
  forge: {
    id: 'forge',
    name: 'Advanced Metallurgy Forge',
    description: 'High-heat metallurgy forge for crafting molds, forging tool heads, and indenting cavities with fuel.',
    categories: [
      {
        id: 'molds',
        name: 'Iron Molds',
        icon: `data:image/svg+xml;utf8,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><rect x="5" y="5" width="6" height="6" fill="#1f2937"/></svg>'
        )}`,
        recipes: FORGE_RECIPES.filter((r) => r.category === 'molds')
      },
      {
        id: 'indenting',
        name: 'Mold Indenting',
        icon: `data:image/svg+xml;utf8,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="3" width="10" height="10" fill="#4b5563"/><path d="M5 6h6v1H9v4H7V7H5V6z" fill="#ea580c"/></svg>'
        )}`,
        recipes: FORGE_RECIPES.filter((r) => r.category === 'indenting')
      },
      {
        id: 'stone_heads',
        name: 'Stone Tool Heads',
        icon: '/ItemSprites/StonePickaxeHead.png',
        recipes: FORGE_RECIPES.filter((r) => r.category === 'stone_heads')
      },
      {
        id: 'iron_heads',
        name: 'Iron Tool Heads',
        icon: '/ItemSprites/IronPickaxeHead.png',
        recipes: FORGE_RECIPES.filter((r) => r.category === 'iron_heads')
      },
      {
        id: 'gold_heads',
        name: 'Gold Tool Heads',
        icon: '/ItemSprites/GoldPickaxeHead.png',
        recipes: FORGE_RECIPES.filter((r) => r.category === 'gold_heads')
      }
    ]
  }
};

