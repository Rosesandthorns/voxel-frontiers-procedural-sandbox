import { BlockDef, BlockType } from '../../types';

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]: {
    id: BlockType.AIR,
    name: 'Air',
    solid: false,
    transparent: true,
    hardness: 0,
    color: '#000000',
    soundType: 'grass'
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: 'Grass Block',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#4caf50',
    soundType: 'grass'
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: 'Dirt',
    solid: true,
    transparent: false,
    hardness: 0.5,
    color: '#795548',
    soundType: 'grass'
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: 'Stone',
    solid: true,
    transparent: false,
    hardness: 1.5,
    color: '#9e9e9e',
    soundType: 'stone'
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: 'Cobblestone',
    solid: true,
    transparent: false,
    hardness: 1.8,
    color: '#757575',
    soundType: 'stone'
  },
  [BlockType.OAK_WOOD]: {
    id: BlockType.OAK_WOOD,
    name: 'Oak Wood',
    solid: true,
    transparent: false,
    hardness: 1.2,
    color: '#5d4037',
    soundType: 'wood'
  },
  [BlockType.OAK_LEAVES]: {
    id: BlockType.OAK_LEAVES,
    name: 'Oak Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#2e7d32',
    soundType: 'grass'
  },
  [BlockType.SAND]: {
    id: BlockType.SAND,
    name: 'Desert Sand',
    solid: true,
    transparent: false,
    hardness: 0.5,
    color: '#e0c068',
    soundType: 'sand'
  },
  [BlockType.SANDSTONE]: {
    id: BlockType.SANDSTONE,
    name: 'Sandstone',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#d4b35a',
    soundType: 'stone'
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS,
    name: 'Prismatic Glass',
    solid: true,
    transparent: true,
    hardness: 0.3,
    color: '#81d4fa',
    soundType: 'glass'
  },
  [BlockType.OBSIDIAN]: {
    id: BlockType.OBSIDIAN,
    name: 'Obsidian',
    solid: true,
    transparent: false,
    hardness: 4.0,
    color: '#1a102f',
    soundType: 'stone'
  },
  [BlockType.MAGMA_ROCK]: {
    id: BlockType.MAGMA_ROCK,
    name: 'Magma Rock',
    solid: true,
    transparent: false,
    hardness: 1.8,
    color: '#d84315',
    lightLevel: 10,
    soundType: 'magma'
  },
  [BlockType.BASALT]: {
    id: BlockType.BASALT,
    name: 'Basalt Pillar',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#37474f',
    soundType: 'stone'
  },
  [BlockType.MYCELIUM]: {
    id: BlockType.MYCELIUM,
    name: 'Spore Turf',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#7b1fa2',
    soundType: 'grass'
  },
  [BlockType.GLOW_SHROOM_BLOCK]: {
    id: BlockType.GLOW_SHROOM_BLOCK,
    name: 'Glowshroom Cap',
    solid: true,
    transparent: false,
    hardness: 0.4,
    color: '#00e5ff',
    lightLevel: 14,
    soundType: 'wood'
  },
  [BlockType.CRYSTAL_BLOCK]: {
    id: BlockType.CRYSTAL_BLOCK,
    name: 'Crystal Cluster',
    solid: true,
    transparent: true,
    hardness: 1.4,
    color: '#b388ff',
    lightLevel: 12,
    soundType: 'crystal'
  },
  [BlockType.AMETHYST_CLUSTER]: {
    id: BlockType.AMETHYST_CLUSTER,
    name: 'Amethyst Geode',
    solid: true,
    transparent: true,
    hardness: 1.6,
    color: '#ea80fc',
    lightLevel: 8,
    soundType: 'crystal'
  },
  [BlockType.IRON_ORE]: {
    id: BlockType.IRON_ORE,
    name: 'Iron Ore',
    solid: true,
    transparent: false,
    hardness: 2.2,
    color: '#d7ccc8',
    soundType: 'stone'
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE,
    name: 'Gold Ore',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#ffd54f',
    soundType: 'stone'
  },
  [BlockType.VOID_STONE]: {
    id: BlockType.VOID_STONE,
    name: 'Void Stone',
    solid: true,
    transparent: false,
    hardness: 3.0,
    color: '#120024',
    soundType: 'stone'
  },
  [BlockType.AETHER_GRASS]: {
    id: BlockType.AETHER_GRASS,
    name: 'Aether Turf',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#80deea',
    soundType: 'grass'
  },
  [BlockType.CLOUD]: {
    id: BlockType.CLOUD,
    name: 'Cumulus Cloud',
    solid: true,
    transparent: true,
    hardness: 0.1,
    color: '#ffffff',
    soundType: 'grass'
  },
  [BlockType.LANTERN]: {
    id: BlockType.LANTERN,
    name: 'Luminous Beacon',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#ffeb3b',
    lightLevel: 15,
    soundType: 'glass'
  },
  [BlockType.WATER]: {
    id: BlockType.WATER,
    name: 'Spring Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'grass'
  },
  [BlockType.LAVA]: {
    id: BlockType.LAVA,
    name: 'Molten Lava',
    solid: false,
    transparent: false,
    liquid: true,
    hardness: 0,
    color: '#ff3d00',
    lightLevel: 15,
    soundType: 'magma'
  },
  [BlockType.CHEST]: {
    id: BlockType.CHEST,
    name: 'Ancient Cache',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#a16207',
    soundType: 'wood'
  },
  [BlockType.ANCIENT_BRICK]: {
    id: BlockType.ANCIENT_BRICK,
    name: 'Ruin Carved Brick',
    solid: true,
    transparent: false,
    hardness: 2.5,
    color: '#607d8b',
    soundType: 'stone'
  },
  [BlockType.BEACON]: {
    id: BlockType.BEACON,
    name: 'Aether Waypoint Beacon',
    solid: false,
    transparent: true,
    hardness: 0.5,
    color: '#00e676',
    lightLevel: 15,
    soundType: 'crystal'
  },
  [BlockType.PACKED_ICE]: {
    id: BlockType.PACKED_ICE,
    name: 'Packed Glacial Ice',
    solid: true,
    transparent: false,
    hardness: 0.8,
    color: '#90caf9',
    soundType: 'glass'
  },
  [BlockType.SNOW]: {
    id: BlockType.SNOW,
    name: 'Snow Crust',
    solid: true,
    transparent: false,
    hardness: 0.4,
    color: '#f8fafc',
    soundType: 'grass'
  },
  [BlockType.CORAL_BLOCK]: {
    id: BlockType.CORAL_BLOCK,
    name: 'Living Coral Colony',
    solid: true,
    transparent: false,
    hardness: 1.2,
    color: '#fb7185',
    soundType: 'stone'
  },
  [BlockType.ABYSSAL_CRIMSON_VENT]: {
    id: BlockType.ABYSSAL_CRIMSON_VENT,
    name: 'Abyssal Crimson Vent',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#dc2626',
    lightLevel: 15,
    soundType: 'magma'
  },
  [BlockType.CRIMSON_TENDRIL]: {
    id: BlockType.CRIMSON_TENDRIL,
    name: 'Crimson Tendril',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#ef4444',
    lightLevel: 12,
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.BLOOD_KELP]: {
    id: BlockType.BLOOD_KELP,
    name: 'Abyssal Blood Kelp',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#b91c1c',
    lightLevel: 10,
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.REDWOOD_LOG]: {
    id: BlockType.REDWOOD_LOG,
    name: 'Redwood Log',
    solid: true,
    transparent: false,
    hardness: 1.5,
    color: '#74361b',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.REDWOOD_LEAVES]: {
    id: BlockType.REDWOOD_LEAVES,
    name: 'Redwood Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#1b4332',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.LIMELEAF_LOG]: {
    id: BlockType.LIMELEAF_LOG,
    name: 'Limeleaf Log',
    solid: true,
    transparent: false,
    hardness: 1.4,
    color: '#58644b',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.LIMELEAF_LEAVES]: {
    id: BlockType.LIMELEAF_LEAVES,
    name: 'Limeleaf Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#a3e635',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.JADELEAF_FERN]: {
    id: BlockType.JADELEAF_FERN,
    name: 'Jadeleaf Fern',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#10b981',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.SUNFLOWER]: {
    id: BlockType.SUNFLOWER,
    name: 'Sunflower',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#facc15',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.ROSEBUSH]: {
    id: BlockType.ROSEBUSH,
    name: 'Rosebush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#e11d48',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.ORO_FLOWER]: {
    id: BlockType.ORO_FLOWER,
    name: 'Oro Flower',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#fbbf24',
    lightLevel: 10,
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.BELL_LILY]: {
    id: BlockType.BELL_LILY,
    name: 'Bell Lily',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#c084fc',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.CYRO_LILY]: {
    id: BlockType.CYRO_LILY,
    name: 'Cyro Lily',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#38bdf8',
    lightLevel: 14,
    soundType: 'crystal',
    renderType: 'cross'
  },
  [BlockType.LILYPAD]: {
    id: BlockType.LILYPAD,
    name: 'Lilypad',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#22c55e',
    soundType: 'grass',
    renderType: 'flat'
  },
  [BlockType.WATER_REED]: {
    id: BlockType.WATER_REED,
    name: 'Water Reed',
    solid: false,
    transparent: true,
    hardness: 0.15,
    color: '#84cc16',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.MARSHROOT]: {
    id: BlockType.MARSHROOT,
    name: 'Marshroot',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#713f12',
    soundType: 'wood',
    renderType: 'cross'
  },
  [BlockType.BERRY_BUSH]: {
    id: BlockType.BERRY_BUSH,
    name: 'Sweet Berry Bush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#ef4444',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.THORN_BUSH]: {
    id: BlockType.THORN_BUSH,
    name: 'Thorn Bush',
    solid: false,
    transparent: true,
    hardness: 0.25,
    color: '#78716c',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.VERDANT_SHRUB]: {
    id: BlockType.VERDANT_SHRUB,
    name: 'Verdant Shrub',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#16a34a',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.GOLDEN_BLOOM_BUSH]: {
    id: BlockType.GOLDEN_BLOOM_BUSH,
    name: 'Golden Bloom Bush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#eab308',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.DRIED_SEAWEED]: {
    id: BlockType.DRIED_SEAWEED,
    name: 'Dried Seaweed',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#655734',
    soundType: 'grass',
    renderType: 'flat'
  },
  [BlockType.SMALL_KELP]: {
    id: BlockType.SMALL_KELP,
    name: 'Small Kelp',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#2d6a36',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.SEAGRASS]: {
    id: BlockType.SEAGRASS,
    name: 'Seagrass',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#22c55e',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.WATER_ALGAE]: {
    id: BlockType.WATER_ALGAE,
    name: 'Shoreline Algae',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#10b981',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.TALL_KELP]: {
    id: BlockType.TALL_KELP,
    name: 'Ocean Kelp',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#23592c',
    soundType: 'grass',
    renderType: 'cross'
  },
  // Decayed Biome Blocks
  [BlockType.GHOST_LOG]: {
    id: BlockType.GHOST_LOG,
    name: 'Ghost Log',
    solid: true,
    transparent: false,
    hardness: 1.1,
    color: '#e2e8f0',
    soundType: 'wood'
  },
  [BlockType.WHITE_LEAVES]: {
    id: BlockType.WHITE_LEAVES,
    name: 'White Ghost Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#f8fafc',
    soundType: 'grass'
  },
  [BlockType.WITHERED_SHRUB]: {
    id: BlockType.WITHERED_SHRUB,
    name: 'Withered Shrub',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#27272a',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.PALE_GHOST_FLOWER]: {
    id: BlockType.PALE_GHOST_FLOWER,
    name: 'Pale Ghost Flower',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#f1f5f9',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.DEATH_CAP_MUSHROOM]: {
    id: BlockType.DEATH_CAP_MUSHROOM,
    name: 'Death Cap Mushroom',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#94a3b8',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.ASHEN_BRUSH]: {
    id: BlockType.ASHEN_BRUSH,
    name: 'Ashen Brush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#a1a1aa',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.SICKLY_BRIAR]: {
    id: BlockType.SICKLY_BRIAR,
    name: 'Sickly Briar',
    solid: false,
    transparent: true,
    hardness: 0.25,
    color: '#52525b',
    soundType: 'grass',
    renderType: 'cube'
  },
  // Desert & Oasis Blocks
  [BlockType.PALM_LOG]: {
    id: BlockType.PALM_LOG,
    name: 'Palm Log',
    solid: true,
    transparent: false,
    hardness: 1.1,
    color: '#78350f',
    soundType: 'wood'
  },
  [BlockType.PALM_LEAVES]: {
    id: BlockType.PALM_LEAVES,
    name: 'Palm Fronds',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#15803d',
    soundType: 'grass'
  },
  [BlockType.SAGUARO_CACTUS]: {
    id: BlockType.SAGUARO_CACTUS,
    name: 'Saguaro Cactus',
    solid: true,
    transparent: false,
    hardness: 0.5,
    color: '#2d6a36',
    soundType: 'grass'
  },
  [BlockType.BARREL_CACTUS]: {
    id: BlockType.BARREL_CACTUS,
    name: 'Golden Barrel Cactus',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#eab308',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.PRICKLY_PEAR]: {
    id: BlockType.PRICKLY_PEAR,
    name: 'Prickly Pear Cactus',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#16a34a',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.FLOWERING_TORCH_CACTUS]: {
    id: BlockType.FLOWERING_TORCH_CACTUS,
    name: 'Flowering Torch Cactus',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#e11d48',
    soundType: 'grass',
    renderType: 'cross'
  },
  // Arctic Biomes Blocks
  [BlockType.EVERFROST_LOG]: {
    id: BlockType.EVERFROST_LOG,
    name: 'Everfrost Wood',
    solid: true,
    transparent: false,
    hardness: 1.4,
    color: '#3b5366',
    soundType: 'wood'
  },
  [BlockType.EVERFROST_LEAVES]: {
    id: BlockType.EVERFROST_LEAVES,
    name: 'Everfrost Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#5b8a99',
    soundType: 'grass'
  },
  [BlockType.ICICLE]: {
    id: BlockType.ICICLE,
    name: 'Icicle',
    solid: false,
    transparent: true,
    hardness: 0.15,
    color: '#cbebfb',
    soundType: 'crystal',
    renderType: 'cross'
  },
  [BlockType.SNOWDROP]: {
    id: BlockType.SNOWDROP,
    name: 'Snowdrop',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#f0f9ff',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.ARCTIC_FRUIT]: {
    id: BlockType.ARCTIC_FRUIT,
    name: 'Arctic Fruit Shrub',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#38bdf8',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.FROST_FERN]: {
    id: BlockType.FROST_FERN,
    name: 'Frost Fern',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#7dd3fc',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.WINTERCREST]: {
    id: BlockType.WINTERCREST,
    name: 'Wintercrest',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#e0f2fe',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.FROST_LICHEN]: {
    id: BlockType.FROST_LICHEN,
    name: 'Frost Lichen',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#bae6fd',
    soundType: 'grass',
    renderType: 'flat'
  },
  // Rainforest Biome
  [BlockType.VINE]: {
    id: BlockType.VINE,
    name: 'Rainforest Vine',
    solid: false,
    transparent: true,
    climbable: true,
    hardness: 0.1,
    color: '#2d7a2d',
    soundType: 'grass',
    renderType: 'wall'
  },
  [BlockType.RAINFOREST_OAK_LOG]: {
    id: BlockType.RAINFOREST_OAK_LOG,
    name: 'Rainforest Oak Log',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#5c4a1e',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.KAPOK_LOG]: {
    id: BlockType.KAPOK_LOG,
    name: 'Kapok Log',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#7a5c2e',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.BANYAN_LOG]: {
    id: BlockType.BANYAN_LOG,
    name: 'Banyan Log',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#6b4c26',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.STRANGLER_LOG]: {
    id: BlockType.STRANGLER_LOG,
    name: 'Strangler Fig Log',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#4a3c1a',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.MAHOGANY_LOG]: {
    id: BlockType.MAHOGANY_LOG,
    name: 'Mahogany Log',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#6b2d1e',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.CEIBA_LOG]: {
    id: BlockType.CEIBA_LOG,
    name: 'Ceiba Log',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#8a7040',
    soundType: 'wood',
    renderType: 'cube'
  },
  [BlockType.RAINFOREST_OAK_LEAVES]: {
    id: BlockType.RAINFOREST_OAK_LEAVES,
    name: 'Rainforest Oak Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#2e6b1a',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.KAPOK_LEAVES]: {
    id: BlockType.KAPOK_LEAVES,
    name: 'Kapok Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#236b18',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.BANYAN_LEAVES]: {
    id: BlockType.BANYAN_LEAVES,
    name: 'Banyan Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#1e7a2a',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.STRANGLER_LEAVES]: {
    id: BlockType.STRANGLER_LEAVES,
    name: 'Strangler Fig Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#3a7a1e',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.MAHOGANY_LEAVES]: {
    id: BlockType.MAHOGANY_LEAVES,
    name: 'Mahogany Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#1e5c14',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.CEIBA_LEAVES]: {
    id: BlockType.CEIBA_LEAVES,
    name: 'Ceiba Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#4a8a2a',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.HELICONIA]: {
    id: BlockType.HELICONIA,
    name: 'Heliconia',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#e63c14',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.GIANT_FERN]: {
    id: BlockType.GIANT_FERN,
    name: 'Giant Fern',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#1a7a2e',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.ORCHID]: {
    id: BlockType.ORCHID,
    name: 'Orchid',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#c84bc8',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.PITCHER_PLANT]: {
    id: BlockType.PITCHER_PLANT,
    name: 'Pitcher Plant',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#7a2a1e',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.JUNGLE_MUSHROOM]: {
    id: BlockType.JUNGLE_MUSHROOM,
    name: 'Jungle Mushroom',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#a06030',
    soundType: 'grass',
    renderType: 'cross'
  },
  [BlockType.LIANA_BUSH]: {
    id: BlockType.LIANA_BUSH,
    name: 'Liana Bush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#2e5c1e',
    soundType: 'grass',
    renderType: 'cube'
  },
  [BlockType.REDWOOD_PLANK]: {
    id: BlockType.REDWOOD_PLANK,
    name: 'Redwood Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#934b35',
    soundType: 'wood'
  },
  [BlockType.WILLOW_PLANK]: {
    id: BlockType.WILLOW_PLANK,
    name: 'Willow Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#9bb36c',
    soundType: 'wood'
  },
  [BlockType.OAK_PLANK]: {
    id: BlockType.OAK_PLANK,
    name: 'Oak Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#b8945f',
    soundType: 'wood'
  },
  [BlockType.EVERFROST_PLANK]: {
    id: BlockType.EVERFROST_PLANK,
    name: 'Everfrost Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#a3c2cf',
    soundType: 'wood'
  },
  [BlockType.PALM_PLANK]: {
    id: BlockType.PALM_PLANK,
    name: 'Palm Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#cfb57a',
    soundType: 'wood'
  },
  [BlockType.GHOST_PLANK]: {
    id: BlockType.GHOST_PLANK,
    name: 'Ghost Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#d6dbe0',
    soundType: 'wood'
  },
  [BlockType.RAINFOREST_OAK_PLANK]: {
    id: BlockType.RAINFOREST_OAK_PLANK,
    name: 'Rainforest Oak Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#6d754b',
    soundType: 'wood'
  },
  [BlockType.KAPOK_PLANK]: {
    id: BlockType.KAPOK_PLANK,
    name: 'Kapok Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#c4ad8d',
    soundType: 'wood'
  },
  [BlockType.BANYAN_PLANK]: {
    id: BlockType.BANYAN_PLANK,
    name: 'Banyan Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#8b694b',
    soundType: 'wood'
  },
  [BlockType.STRANGLER_PLANK]: {
    id: BlockType.STRANGLER_PLANK,
    name: 'Strangler Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#6e4f3a',
    soundType: 'wood'
  },
  [BlockType.MAHOGANY_PLANK]: {
    id: BlockType.MAHOGANY_PLANK,
    name: 'Mahogany Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#7a3b2e',
    soundType: 'wood'
  },
  [BlockType.CEIBA_PLANK]: {
    id: BlockType.CEIBA_PLANK,
    name: 'Ceiba Plank',
    solid: true,
    transparent: false,
    hardness: 1.0,
    color: '#8a7a5f',
    soundType: 'wood'
  },
  [BlockType.TOOL_CRAFTER]: {
    id: BlockType.TOOL_CRAFTER,
    name: 'Tool Crafter',
    solid: true,
    transparent: false,
    hardness: 1.5,
    color: '#8d6e63',
    soundType: 'wood'
  },
  [BlockType.TIN_ORE]: {
    id: BlockType.TIN_ORE,
    name: 'Tin Ore',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#a8b5b8',
    soundType: 'stone'
  }
};

export function isPlankBlock(type: BlockType): boolean {
  return (
    type === BlockType.REDWOOD_PLANK ||
    type === BlockType.WILLOW_PLANK ||
    type === BlockType.OAK_PLANK ||
    type === BlockType.EVERFROST_PLANK ||
    type === BlockType.PALM_PLANK ||
    type === BlockType.GHOST_PLANK ||
    type === BlockType.RAINFOREST_OAK_PLANK ||
    type === BlockType.KAPOK_PLANK ||
    type === BlockType.BANYAN_PLANK ||
    type === BlockType.STRANGLER_PLANK ||
    type === BlockType.MAHOGANY_PLANK ||
    type === BlockType.CEIBA_PLANK
  );
}

export function isStoneOrOre(type: BlockType): boolean {
  return (
    type === BlockType.STONE ||
    type === BlockType.COBBLESTONE ||
    type === BlockType.SANDSTONE ||
    type === BlockType.IRON_ORE ||
    type === BlockType.GOLD_ORE ||
    type === BlockType.TIN_ORE ||
    type === BlockType.OBSIDIAN ||
    type === BlockType.MAGMA_ROCK ||
    type === BlockType.BASALT ||
    type === BlockType.VOID_STONE ||
    type === BlockType.CRYSTAL_BLOCK ||
    type === BlockType.AMETHYST_CLUSTER ||
    type === BlockType.ANCIENT_BRICK ||
    type === BlockType.PACKED_ICE
  );
}

export function isLogBlock(type: BlockType): boolean {
  return (
    type === BlockType.OAK_WOOD ||
    type === BlockType.REDWOOD_LOG ||
    type === BlockType.LIMELEAF_LOG ||
    type === BlockType.GHOST_LOG ||
    type === BlockType.PALM_LOG ||
    type === BlockType.EVERFROST_LOG ||
    type === BlockType.RAINFOREST_OAK_LOG ||
    type === BlockType.KAPOK_LOG ||
    type === BlockType.BANYAN_LOG ||
    type === BlockType.STRANGLER_LOG ||
    type === BlockType.MAHOGANY_LOG ||
    type === BlockType.CEIBA_LOG
  );
}

export function isLeavesBlock(type: BlockType): boolean {
  return (
    type === BlockType.OAK_LEAVES ||
    type === BlockType.REDWOOD_LEAVES ||
    type === BlockType.LIMELEAF_LEAVES ||
    type === BlockType.WHITE_LEAVES ||
    type === BlockType.PALM_LEAVES ||
    type === BlockType.EVERFROST_LEAVES ||
    type === BlockType.RAINFOREST_OAK_LEAVES ||
    type === BlockType.KAPOK_LEAVES ||
    type === BlockType.BANYAN_LEAVES ||
    type === BlockType.STRANGLER_LEAVES ||
    type === BlockType.MAHOGANY_LEAVES ||
    type === BlockType.CEIBA_LEAVES
  );
}

export function isPlantBlock(type: BlockType): boolean {
  switch (type) {
    case BlockType.JADELEAF_FERN:
    case BlockType.SUNFLOWER:
    case BlockType.ROSEBUSH:
    case BlockType.ORO_FLOWER:
    case BlockType.BELL_LILY:
    case BlockType.CYRO_LILY:
    case BlockType.LILYPAD:
    case BlockType.WATER_REED:
    case BlockType.MARSHROOT:
    case BlockType.BERRY_BUSH:
    case BlockType.THORN_BUSH:
    case BlockType.VERDANT_SHRUB:
    case BlockType.GOLDEN_BLOOM_BUSH:
    case BlockType.CRIMSON_TENDRIL:
    case BlockType.BLOOD_KELP:
    case BlockType.ABYSSAL_CRIMSON_VENT:
    case BlockType.DRIED_SEAWEED:
    case BlockType.SMALL_KELP:
    case BlockType.SEAGRASS:
    case BlockType.WATER_ALGAE:
    case BlockType.TALL_KELP:
    // Decayed plants
    case BlockType.WITHERED_SHRUB:
    case BlockType.PALE_GHOST_FLOWER:
    case BlockType.DEATH_CAP_MUSHROOM:
    case BlockType.ASHEN_BRUSH:
    case BlockType.SICKLY_BRIAR:
    // Desert cacti flora
    case BlockType.BARREL_CACTUS:
    case BlockType.PRICKLY_PEAR:
    case BlockType.FLOWERING_TORCH_CACTUS:
    // Arctic flora & features
    case BlockType.SNOWDROP:
    case BlockType.ARCTIC_FRUIT:
    case BlockType.FROST_FERN:
    case BlockType.WINTERCREST:
    case BlockType.FROST_LICHEN:
    case BlockType.ICICLE:
    // Rainforest flora
    case BlockType.VINE:
    case BlockType.HELICONIA:
    case BlockType.GIANT_FERN:
    case BlockType.ORCHID:
    case BlockType.PITCHER_PLANT:
    case BlockType.JUNGLE_MUSHROOM:
    case BlockType.LIANA_BUSH:
      return true;
    default:
      return false;
  }
}

export function isUnderwaterPlant(type: BlockType): boolean {
  return (
    type === BlockType.SMALL_KELP ||
    type === BlockType.SEAGRASS ||
    type === BlockType.WATER_ALGAE ||
    type === BlockType.TALL_KELP ||
    type === BlockType.BLOOD_KELP ||
    type === BlockType.CRIMSON_TENDRIL
  );
}
