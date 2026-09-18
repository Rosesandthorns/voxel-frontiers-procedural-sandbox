export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  OAK_WOOD = 5,
  OAK_LEAVES = 6,
  SAND = 7,
  SANDSTONE = 8,
  GLASS = 9,
  OBSIDIAN = 10,
  MAGMA_ROCK = 11,
  BASALT = 12,
  MYCELIUM = 13,
  GLOW_SHROOM_BLOCK = 14,
  CRYSTAL_BLOCK = 15,
  AMETHYST_CLUSTER = 16,
  IRON_ORE = 17,
  GOLD_ORE = 18,
  VOID_STONE = 19,
  AETHER_GRASS = 20,
  CLOUD = 21,
  LANTERN = 22,
  WATER = 23,
  LAVA = 24,
  CHEST = 25,
  ANCIENT_BRICK = 26,
  BEACON = 27,
  PACKED_ICE = 28,
  SNOW = 29,
  CORAL_BLOCK = 30,
  ABYSSAL_CRIMSON_VENT = 31,
  CRIMSON_TENDRIL = 32,
  BLOOD_KELP = 33,
  REDWOOD_LOG = 34,
  REDWOOD_LEAVES = 35,
  LIMELEAF_LOG = 36,
  LIMELEAF_LEAVES = 37,
  JADELEAF_FERN = 38,
  SUNFLOWER = 39,
  ROSEBUSH = 40,
  ORO_FLOWER = 41,
  BELL_LILY = 42,
  CYRO_LILY = 43,
  LILYPAD = 44,
  WATER_REED = 45,
  MARSHROOT = 46,
  BERRY_BUSH = 47,
  THORN_BUSH = 48,
  VERDANT_SHRUB = 49,
  GOLDEN_BLOOM_BUSH = 50,
  DRIED_SEAWEED = 51,
  SMALL_KELP = 52,
  SEAGRASS = 53,
  WATER_ALGAE = 54,
  TALL_KELP = 55,
  // Decayed Biomes
  GHOST_LOG = 56,
  WHITE_LEAVES = 57,
  WITHERED_SHRUB = 58,
  PALE_GHOST_FLOWER = 59,
  DEATH_CAP_MUSHROOM = 60,
  ASHEN_BRUSH = 61,
  SICKLY_BRIAR = 62,
  // Desert & Oasis
  PALM_LOG = 63,
  PALM_LEAVES = 64,
  SAGUARO_CACTUS = 65,
  BARREL_CACTUS = 66,
  PRICKLY_PEAR = 67,
  FLOWERING_TORCH_CACTUS = 68,
  // Arctic Biomes
  EVERFROST_LOG = 69,
  EVERFROST_LEAVES = 70,
  ICICLE = 71,
  SNOWDROP = 72,
  ARCTIC_FRUIT = 73,
  FROST_FERN = 74,
  WINTERCREST = 75,
  FROST_LICHEN = 76,
  // Rainforest Biome
  VINE = 77,
  RAINFOREST_OAK_LOG = 78,
  KAPOK_LOG = 79,
  BANYAN_LOG = 80,
  STRANGLER_LOG = 81,
  MAHOGANY_LOG = 82,
  CEIBA_LOG = 83,
  RAINFOREST_OAK_LEAVES = 84,
  KAPOK_LEAVES = 85,
  BANYAN_LEAVES = 86,
  STRANGLER_LEAVES = 87,
  MAHOGANY_LEAVES = 88,
  CEIBA_LEAVES = 89,
  HELICONIA = 90,
  GIANT_FERN = 91,
  ORCHID = 92,
  PITCHER_PLANT = 93,
  JUNGLE_MUSHROOM = 94,
  LIANA_BUSH = 95,
  // Planks
  REDWOOD_PLANK = 96,
  WILLOW_PLANK = 97,
  OAK_PLANK = 98,
  EVERFROST_PLANK = 99,
  PALM_PLANK = 100,
  GHOST_PLANK = 101,
  RAINFOREST_OAK_PLANK = 102,
  KAPOK_PLANK = 103,
  BANYAN_PLANK = 104,
  STRANGLER_PLANK = 105,
  MAHOGANY_PLANK = 106,
  CEIBA_PLANK = 107,
  // Workstations
  TOOL_CRAFTER = 108,
  // Ores
  TIN_ORE = 109
}

export enum BiomeType {
  VERDANT_PLAINS = 'Verdant Plains',
  THE_OCEAN = 'The Ocean',
  TRENCHES = 'Abyssal Trenches',
  CRYSTALLINE_CAVERNS = 'Crystalline Chasm',
  MYSTIC_SPORE_FOREST = 'Mystic Spore Forest',
  SCORCHED_MAGMA_WASTES = 'Scorched Magma Wastes',
  CELESTIAL_SKY_ISLES = 'Celestial Sky Isles',
  GOLDEN_DUNES = 'Golden Dunes',
  DEEP_OCEAN_TRENCH = 'Abyssal Coral Shallows',
  BOREAL_PEAKS = 'Frosted Boreal Peaks',
  DECAYED_LANDS = 'Decayed Lands',
  THE_DESERT = 'The Desert',
  ARCTIC = 'Arctic Biomes',
  RIVER = 'River',
  RAINFOREST = 'Rainforest'
}

export interface BlockDef {
  id: BlockType;
  name: string;
  solid: boolean;
  transparent: boolean;
  liquid?: boolean;
  lightLevel?: number;
  hardness: number; // break time factor
  color: string; // fallback color
  topTexture?: string;
  sideTexture?: string;
  bottomTexture?: string;
  soundType: 'stone' | 'wood' | 'grass' | 'sand' | 'glass' | 'crystal' | 'magma';
  renderType?: 'cube' | 'cross' | 'flat' | 'wall';
  climbable?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  type: 'block' | 'tool' | 'weapon' | 'utility' | 'food' | 'relic';
  blockId?: BlockType;
  icon: string;
  description: string;
  maxStack: number;
  durability?: number;
  damage?: number;
  toolType?: 'pickaxe' | 'axe' | 'shovel';
  tier?: number;
  speed?: number;
}

export interface InventorySlot {
  item: ItemDef | null;
  count: number;
}

export enum EntitySpecies {
  REDWOOD_FOX = 'Redwood Fox',
  CARDINAL = 'Cardinal',
  SALMON = 'Salmon',
  GLIMMER_FOX = 'Glimmer Fox',
  PUFF_SPORE = 'Puff Spore',
  PEBBLE_GOLEM = 'Pebble Golem',
  SOLAR_SPRITE = 'Solar Sprite',
  DUNE_CRAB = 'Dune Crab',
  VOID_STALKER = 'Void Stalker',
  MAGMA_SALAMANDER = 'Magma Salamander',
  SKY_RAY = 'Sky Ray',
  SPORE_SHROOMLING = 'Spore Shroomling',
  ANCIENT_SENTRY = 'Ancient Sentry',
  MIMIC_CHEST = 'Treasure Mimic',
  CRYSTAL_BASILISK = 'Crystal Basilisk'
}

export interface EntityState {
  id: string;
  species: EntitySpecies;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotationY: number;
  pitch: number;
  health: number;
  maxHealth: number;
  isHostile: boolean;
  isTamed: boolean;
  isRidden: boolean;
  isBurrowed?: boolean;
  isCamouflaged?: boolean;
  customTimer: number;
  targetPos: { x: number; y: number; z: number } | null;
  uniqueData: Record<string, any>;
  lastInteractionTime: number;
}

export interface ExplorationWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface DiscoveryStats {
  biomesDiscovered: Record<string, boolean>;
  entitiesEncountered: Record<string, boolean>;
  entitiesTamed: Record<string, boolean>;
  blocksMined: number;
  blocksPlaced: number;
  relicsFound: number;
  distanceTraveled: number;
}

export interface WorldSettings {
  renderDistance: number; // in chunks (4-14, default 9)
  fov: number;
  dayNightSpeed: number; // 1 = normal (approx 12 min), 0 = frozen
  fogDensity: number;
  enableThirdPerson: boolean;
  enableFlight: boolean;
  soundVolume: number;
  timeOfDay: number; // 0.0 to 1.0 (0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 0.0/1.0 = midnight)
}
