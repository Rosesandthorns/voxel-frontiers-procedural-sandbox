import { BlockDef, BlockType } from '../../types';

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]: {
    id: BlockType.AIR,
    name: 'Air',
    solid: false,
    transparent: true,
    hardness: 0,
    color: '#000000',
    soundType: 'earth'
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: 'Grass Block',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#4caf50',
    soundType: 'earth'
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: 'Dirt',
    solid: true,
    transparent: false,
    hardness: 0.5,
    color: '#795548',
    soundType: 'earth'
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: 'Stone',
    solid: true,
    transparent: false,
    hardness: 1.5,
    color: '#9e9e9e',
    soundType: 'rocky'
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: 'Cobblestone',
    solid: true,
    transparent: false,
    hardness: 1.8,
    color: '#757575',
    soundType: 'rocky'
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
    soundType: 'organic'
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
    soundType: 'rocky'
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
    soundType: 'rocky'
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
    soundType: 'rocky'
  },
  [BlockType.MYCELIUM]: {
    id: BlockType.MYCELIUM,
    name: 'Spore Turf',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#7b1fa2',
    soundType: 'earth'
  },
  [BlockType.GLOW_SHROOM_BLOCK]: {
    id: BlockType.GLOW_SHROOM_BLOCK,
    name: 'Glowshroom Cap',
    solid: true,
    transparent: false,
    hardness: 0.4,
    color: '#00e5ff',
    lightLevel: 14,
    soundType: 'organic'
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
    hardness: 4.0,
    color: '#d7ccc8',
    soundType: 'rocky'
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE,
    name: 'Gold Ore',
    solid: true,
    transparent: false,
    hardness: 4.5,
    color: '#ffd54f',
    soundType: 'rocky'
  },
  [BlockType.VOID_STONE]: {
    id: BlockType.VOID_STONE,
    name: 'Void Stone',
    solid: true,
    transparent: false,
    hardness: 3.0,
    color: '#120024',
    soundType: 'rocky'
  },
  [BlockType.AETHER_GRASS]: {
    id: BlockType.AETHER_GRASS,
    name: 'Aether Turf',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#80deea',
    soundType: 'earth'
  },
  [BlockType.CLOUD]: {
    id: BlockType.CLOUD,
    name: 'Cumulus Cloud',
    solid: true,
    transparent: true,
    hardness: 0.1,
    color: '#ffffff',
    soundType: 'earth'
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
    soundType: 'water'
  },
  [BlockType.SALT_WATER]: {
    id: BlockType.SALT_WATER,
    name: 'Salt Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_7]: {
    id: BlockType.WATER_FLOWING_7,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_6]: {
    id: BlockType.WATER_FLOWING_6,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_5]: {
    id: BlockType.WATER_FLOWING_5,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_4]: {
    id: BlockType.WATER_FLOWING_4,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_3]: {
    id: BlockType.WATER_FLOWING_3,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_2]: {
    id: BlockType.WATER_FLOWING_2,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FLOWING_1]: {
    id: BlockType.WATER_FLOWING_1,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
  },
  [BlockType.WATER_FALLING]: {
    id: BlockType.WATER_FALLING,
    name: 'Falling Water',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 0,
    color: '#29b6f6',
    soundType: 'water'
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
    soundType: 'water'
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
    soundType: 'rocky'
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
    soundType: 'crystal'
  },
  [BlockType.SNOW]: {
    id: BlockType.SNOW,
    name: 'Snow Crust',
    solid: true,
    transparent: false,
    hardness: 0.4,
    color: '#f8fafc',
    soundType: 'snow'
  },
  [BlockType.CORAL_BLOCK]: {
    id: BlockType.CORAL_BLOCK,
    name: 'Living Coral Colony',
    solid: true,
    transparent: false,
    hardness: 1.2,
    color: '#fb7185',
    soundType: 'organic'
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
    soundType: 'organic',
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
    soundType: 'organic',
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
    soundType: 'organic',
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
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.JADELEAF_FERN]: {
    id: BlockType.JADELEAF_FERN,
    name: 'Jadeleaf Fern',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#10b981',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.SUNFLOWER]: {
    id: BlockType.SUNFLOWER,
    name: 'Sunflower',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#facc15',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.ROSEBUSH]: {
    id: BlockType.ROSEBUSH,
    name: 'Rosebush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#e11d48',
    soundType: 'organic',
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
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.BELL_LILY]: {
    id: BlockType.BELL_LILY,
    name: 'Bell Lily',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#c084fc',
    soundType: 'earth',
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
    soundType: 'earth',
    renderType: 'flat'
  },
  [BlockType.WATER_REED]: {
    id: BlockType.WATER_REED,
    name: 'Water Reed',
    solid: false,
    transparent: true,
    hardness: 0.15,
    color: '#84cc16',
    soundType: 'earth',
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
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.THORN_BUSH]: {
    id: BlockType.THORN_BUSH,
    name: 'Thorn Bush',
    solid: false,
    transparent: true,
    hardness: 0.25,
    color: '#78716c',
    soundType: 'earth',
    renderType: 'cube'
  },
  [BlockType.VERDANT_SHRUB]: {
    id: BlockType.VERDANT_SHRUB,
    name: 'Verdant Shrub',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#16a34a',
    soundType: 'earth',
    renderType: 'cube'
  },
  [BlockType.GOLDEN_BLOOM_BUSH]: {
    id: BlockType.GOLDEN_BLOOM_BUSH,
    name: 'Golden Bloom Bush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#eab308',
    soundType: 'rocky',
    renderType: 'cube'
  },
  [BlockType.DRIED_SEAWEED]: {
    id: BlockType.DRIED_SEAWEED,
    name: 'Dried Seaweed',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#655734',
    soundType: 'earth',
    renderType: 'flat'
  },
  [BlockType.SMALL_KELP]: {
    id: BlockType.SMALL_KELP,
    name: 'Small Kelp',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#2d6a36',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.SEAGRASS]: {
    id: BlockType.SEAGRASS,
    name: 'Seagrass',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#22c55e',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.WATER_ALGAE]: {
    id: BlockType.WATER_ALGAE,
    name: 'Shoreline Algae',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#10b981',
    soundType: 'earth',
    renderType: 'cross'
  },
  [BlockType.TALL_KELP]: {
    id: BlockType.TALL_KELP,
    name: 'Ocean Kelp',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#23592c',
    soundType: 'organic',
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
    soundType: 'organic'
  },
  [BlockType.WITHERED_SHRUB]: {
    id: BlockType.WITHERED_SHRUB,
    name: 'Withered Shrub',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#27272a',
    soundType: 'earth',
    renderType: 'cube'
  },
  [BlockType.PALE_GHOST_FLOWER]: {
    id: BlockType.PALE_GHOST_FLOWER,
    name: 'Pale Ghost Flower',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#f1f5f9',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.DEATH_CAP_MUSHROOM]: {
    id: BlockType.DEATH_CAP_MUSHROOM,
    name: 'Death Cap Mushroom',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#94a3b8',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.ASHEN_BRUSH]: {
    id: BlockType.ASHEN_BRUSH,
    name: 'Ashen Brush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#a1a1aa',
    soundType: 'earth',
    renderType: 'cube'
  },
  [BlockType.SICKLY_BRIAR]: {
    id: BlockType.SICKLY_BRIAR,
    name: 'Sickly Briar',
    solid: false,
    transparent: true,
    hardness: 0.25,
    color: '#52525b',
    soundType: 'earth',
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
    soundType: 'organic'
  },
  [BlockType.SAGUARO_CACTUS]: {
    id: BlockType.SAGUARO_CACTUS,
    name: 'Saguaro Cactus',
    solid: true,
    transparent: false,
    hardness: 0.5,
    color: '#2d6a36',
    soundType: 'organic'
  },
  [BlockType.BARREL_CACTUS]: {
    id: BlockType.BARREL_CACTUS,
    name: 'Golden Barrel Cactus',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#eab308',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.PRICKLY_PEAR]: {
    id: BlockType.PRICKLY_PEAR,
    name: 'Prickly Pear Cactus',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#16a34a',
    soundType: 'earth',
    renderType: 'cross'
  },
  [BlockType.FLOWERING_TORCH_CACTUS]: {
    id: BlockType.FLOWERING_TORCH_CACTUS,
    name: 'Flowering Torch Cactus',
    solid: false,
    transparent: true,
    hardness: 0.3,
    color: '#e11d48',
    soundType: 'organic',
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
    soundType: 'organic'
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
    soundType: 'snow',
    renderType: 'cross'
  },
  [BlockType.ARCTIC_FRUIT]: {
    id: BlockType.ARCTIC_FRUIT,
    name: 'Arctic Fruit Shrub',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#38bdf8',
    soundType: 'earth',
    renderType: 'cube'
  },
  [BlockType.FROST_FERN]: {
    id: BlockType.FROST_FERN,
    name: 'Frost Fern',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#7dd3fc',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.WINTERCREST]: {
    id: BlockType.WINTERCREST,
    name: 'Wintercrest',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#e0f2fe',
    soundType: 'earth',
    renderType: 'cross'
  },
  [BlockType.FROST_LICHEN]: {
    id: BlockType.FROST_LICHEN,
    name: 'Frost Lichen',
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#bae6fd',
    soundType: 'earth',
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
    soundType: 'organic',
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
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.KAPOK_LEAVES]: {
    id: BlockType.KAPOK_LEAVES,
    name: 'Kapok Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#236b18',
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.BANYAN_LEAVES]: {
    id: BlockType.BANYAN_LEAVES,
    name: 'Banyan Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#1e7a2a',
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.STRANGLER_LEAVES]: {
    id: BlockType.STRANGLER_LEAVES,
    name: 'Strangler Fig Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#3a7a1e',
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.MAHOGANY_LEAVES]: {
    id: BlockType.MAHOGANY_LEAVES,
    name: 'Mahogany Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#1e5c14',
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.CEIBA_LEAVES]: {
    id: BlockType.CEIBA_LEAVES,
    name: 'Ceiba Leaves',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#4a8a2a',
    soundType: 'organic',
    renderType: 'cube'
  },
  [BlockType.HELICONIA]: {
    id: BlockType.HELICONIA,
    name: 'Heliconia',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#e63c14',
    soundType: 'earth',
    renderType: 'cross'
  },
  [BlockType.GIANT_FERN]: {
    id: BlockType.GIANT_FERN,
    name: 'Giant Fern',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#1a7a2e',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.ORCHID]: {
    id: BlockType.ORCHID,
    name: 'Orchid',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#c84bc8',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.PITCHER_PLANT]: {
    id: BlockType.PITCHER_PLANT,
    name: 'Pitcher Plant',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#7a2a1e',
    soundType: 'earth',
    renderType: 'cross'
  },
  [BlockType.JUNGLE_MUSHROOM]: {
    id: BlockType.JUNGLE_MUSHROOM,
    name: 'Jungle Mushroom',
    solid: false,
    transparent: true,
    hardness: 0.0,
    color: '#a06030',
    soundType: 'organic',
    renderType: 'cross'
  },
  [BlockType.LIANA_BUSH]: {
    id: BlockType.LIANA_BUSH,
    name: 'Liana Bush',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#2e5c1e',
    soundType: 'earth',
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
  [BlockType.STONE_BENCH]: {
    id: BlockType.STONE_BENCH,
    name: 'Stone Bench',
    solid: true,
    transparent: false,
    hardness: 1.5,
    color: '#78716c',
    soundType: 'stone'
  },
  [BlockType.FURNACE]: {
    id: BlockType.FURNACE,
    name: 'Furnace',
    solid: true,
    transparent: false,
    hardness: 1.8,
    color: '#6b7280',
    soundType: 'stone'
  },
  [BlockType.FORGE]: {
    id: BlockType.FORGE,
    name: 'Forge',
    solid: true,
    transparent: false,
    hardness: 2.4,
    color: '#374151',
    soundType: 'stone'
  },
  [BlockType.TIN_ORE]: {
    id: BlockType.TIN_ORE,
    name: 'Tin Ore',
    solid: true,
    transparent: false,
    hardness: 2.0,
    color: '#a8b5b8',
    soundType: 'rocky'
  },
  [BlockType.LIMESTONE]: {
    id: BlockType.LIMESTONE,
    name: 'Limestone',
    solid: true,
    transparent: false,
    hardness: 1.5,
    color: '#d4cbb8',
    soundType: 'rocky'
  },
  [BlockType.BLACK_ROCK]: {
    id: BlockType.BLACK_ROCK,
    name: 'Black Rock',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#26282d',
    soundType: 'rocky',
    renderType: 'flint_nodule'
  },
  [BlockType.BLACK_ROCK_1]: {
    id: BlockType.BLACK_ROCK_1,
    name: 'Black Rock',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#26282d',
    soundType: 'rocky',
    renderType: 'flint_nodule'
  },
  [BlockType.BLACK_ROCK_2]: {
    id: BlockType.BLACK_ROCK_2,
    name: 'Black Rock',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#26282d',
    soundType: 'rocky',
    renderType: 'flint_nodule'
  },
  [BlockType.BLACK_ROCK_3]: {
    id: BlockType.BLACK_ROCK_3,
    name: 'Black Rock',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#26282d',
    soundType: 'rocky',
    renderType: 'flint_nodule'
  },
  [BlockType.BLACK_ROCK_4]: {
    id: BlockType.BLACK_ROCK_4,
    name: 'Black Rock',
    solid: false,
    transparent: true,
    hardness: 0.2,
    color: '#26282d',
    soundType: 'rocky',
    renderType: 'flint_nodule'
  },
  [BlockType.CHALK]: {
    id: BlockType.CHALK,
    name: 'Chalk',
    solid: true,
    transparent: false,
    hardness: 0.8,
    color: '#f0ede6',
    soundType: 'rocky'
  },
  [BlockType.BEACH_GRAVEL]: {
    id: BlockType.BEACH_GRAVEL,
    name: 'Beach Gravel',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#9e9689',
    soundType: 'gravel'
  },
  [BlockType.TOPSNOW_1]: {
    id: BlockType.TOPSNOW_1,
    name: 'Top Snow (Stage 1)',
    solid: true,
    transparent: true,
    hardness: 0.1,
    color: '#ffffff',
    soundType: 'snow'
  },
  [BlockType.TOPSNOW_2]: {
    id: BlockType.TOPSNOW_2,
    name: 'Top Snow (Stage 2)',
    solid: true,
    transparent: true,
    hardness: 0.15,
    color: '#ffffff',
    soundType: 'snow'
  },
  [BlockType.TOPSNOW_3]: {
    id: BlockType.TOPSNOW_3,
    name: 'Top Snow (Stage 3)',
    solid: true,
    transparent: true,
    hardness: 0.2,
    color: '#ffffff',
    soundType: 'snow'
  },
  [BlockType.TOPSNOW_4]: {
    id: BlockType.TOPSNOW_4,
    name: 'Top Snow (Stage 4)',
    solid: true,
    transparent: true,
    hardness: 0.25,
    color: '#ffffff',
    soundType: 'snow'
  },
  [BlockType.TOPSNOW_5]: {
    id: BlockType.TOPSNOW_5,
    name: 'Top Snow (Stage 5)',
    solid: true,
    transparent: false,
    hardness: 0.3,
    color: '#ffffff',
    soundType: 'snow'
  },
  [BlockType.FARMLAND]: {
    id: BlockType.FARMLAND,
    name: 'Farmland',
    solid: true,
    transparent: false,
    hardness: 0.6,
    color: '#5c4033',
    soundType: 'earth'
  },
  [BlockType.SAND_FARMLAND]: {
    id: BlockType.SAND_FARMLAND,
    name: 'Sand Farmland',
    solid: true,
    transparent: false,
    hardness: 0.5,
    color: '#d2b48c',
    soundType: 'sand'
  },
  [BlockType.HEATER]: {
    id: BlockType.HEATER,
    name: 'Heater',
    solid: true,
    transparent: false,
    hardness: 1.8,
    color: '#d97706',
    soundType: 'metal'
  },
  [BlockType.COOLER]: {
    id: BlockType.COOLER,
    name: 'Cooler',
    solid: true,
    transparent: false,
    hardness: 1.8,
    color: '#0284c7',
    soundType: 'metal'
  }
} as Record<BlockType, BlockDef>;

// ── Register all 12 Wood Doors into BLOCK_DEFS ──
export interface WoodDoorInfo {
  woodName: string;
  itemKey: string;
  bottom: BlockType;
  top: BlockType;
  bottomOpen: BlockType;
  topOpen: BlockType;
  color: string;
  isInsulated?: boolean;
}

export const WOOD_DOOR_INFOS: WoodDoorInfo[] = [
  { woodName: 'Oak', itemKey: 'oak_door', bottom: BlockType.OAK_DOOR_BOTTOM, top: BlockType.OAK_DOOR_TOP, bottomOpen: BlockType.OAK_DOOR_BOTTOM_OPEN, topOpen: BlockType.OAK_DOOR_TOP_OPEN, color: '#b48c5a' },
  { woodName: 'Redwood', itemKey: 'redwood_door', bottom: BlockType.REDWOOD_DOOR_BOTTOM, top: BlockType.REDWOOD_DOOR_TOP, bottomOpen: BlockType.REDWOOD_DOOR_BOTTOM_OPEN, topOpen: BlockType.REDWOOD_DOOR_TOP_OPEN, color: '#934b35' },
  { woodName: 'Willow', itemKey: 'willow_door', bottom: BlockType.WILLOW_DOOR_BOTTOM, top: BlockType.WILLOW_DOOR_TOP, bottomOpen: BlockType.WILLOW_DOOR_BOTTOM_OPEN, topOpen: BlockType.WILLOW_DOOR_TOP_OPEN, color: '#688a5c' },
  { woodName: 'Everfrost', itemKey: 'everfrost_door', bottom: BlockType.EVERFROST_DOOR_BOTTOM, top: BlockType.EVERFROST_DOOR_TOP, bottomOpen: BlockType.EVERFROST_DOOR_BOTTOM_OPEN, topOpen: BlockType.EVERFROST_DOOR_TOP_OPEN, color: '#8cafcd', isInsulated: true },
  { woodName: 'Palm', itemKey: 'palm_door', bottom: BlockType.PALM_DOOR_BOTTOM, top: BlockType.PALM_DOOR_TOP, bottomOpen: BlockType.PALM_DOOR_BOTTOM_OPEN, topOpen: BlockType.PALM_DOOR_TOP_OPEN, color: '#c39b69' },
  { woodName: 'Ghost', itemKey: 'ghost_door', bottom: BlockType.GHOST_DOOR_BOTTOM, top: BlockType.GHOST_DOOR_TOP, bottomOpen: BlockType.GHOST_DOOR_BOTTOM_OPEN, topOpen: BlockType.GHOST_DOOR_TOP_OPEN, color: '#d6dbe0' },
  { woodName: 'Rainforest Oak', itemKey: 'rainforest_oak_door', bottom: BlockType.RAINFOREST_OAK_DOOR_BOTTOM, top: BlockType.RAINFOREST_OAK_DOOR_TOP, bottomOpen: BlockType.RAINFOREST_OAK_DOOR_BOTTOM_OPEN, topOpen: BlockType.RAINFOREST_OAK_DOOR_TOP_OPEN, color: '#6d754b' },
  { woodName: 'Kapok', itemKey: 'kapok_door', bottom: BlockType.KAPOK_DOOR_BOTTOM, top: BlockType.KAPOK_DOOR_TOP, bottomOpen: BlockType.KAPOK_DOOR_BOTTOM_OPEN, topOpen: BlockType.KAPOK_DOOR_TOP_OPEN, color: '#c4ad8d' },
  { woodName: 'Banyan', itemKey: 'banyan_door', bottom: BlockType.BANYAN_DOOR_BOTTOM, top: BlockType.BANYAN_DOOR_TOP, bottomOpen: BlockType.BANYAN_DOOR_BOTTOM_OPEN, topOpen: BlockType.BANYAN_DOOR_TOP_OPEN, color: '#8b694b' },
  { woodName: 'Strangler', itemKey: 'strangler_door', bottom: BlockType.STRANGLER_DOOR_BOTTOM, top: BlockType.STRANGLER_DOOR_TOP, bottomOpen: BlockType.STRANGLER_DOOR_BOTTOM_OPEN, topOpen: BlockType.STRANGLER_DOOR_TOP_OPEN, color: '#6e4f3a' },
  { woodName: 'Mahogany', itemKey: 'mahogany_door', bottom: BlockType.MAHOGANY_DOOR_BOTTOM, top: BlockType.MAHOGANY_DOOR_TOP, bottomOpen: BlockType.MAHOGANY_DOOR_BOTTOM_OPEN, topOpen: BlockType.MAHOGANY_DOOR_TOP_OPEN, color: '#7a3b2e' },
  { woodName: 'Ceiba', itemKey: 'ceiba_door', bottom: BlockType.CEIBA_DOOR_BOTTOM, top: BlockType.CEIBA_DOOR_TOP, bottomOpen: BlockType.CEIBA_DOOR_BOTTOM_OPEN, topOpen: BlockType.CEIBA_DOOR_TOP_OPEN, color: '#8a7a5f' }
];

for (const d of WOOD_DOOR_INFOS) {
  const prefix = d.isInsulated ? `Insulated ${d.woodName}` : d.woodName;
  BLOCK_DEFS[d.bottom] = {
    id: d.bottom,
    name: `${prefix} Door (Lower)`,
    solid: true,
    transparent: true,
    hardness: 1.0,
    color: d.color,
    soundType: 'wood',
    renderType: 'door'
  };
  BLOCK_DEFS[d.top] = {
    id: d.top,
    name: `${prefix} Door (Upper)`,
    solid: true,
    transparent: true,
    hardness: 1.0,
    color: d.color,
    soundType: 'wood',
    renderType: 'door'
  };
  BLOCK_DEFS[d.bottomOpen] = {
    id: d.bottomOpen,
    name: `${prefix} Door (Lower, Open)`,
    solid: false,
    transparent: true,
    hardness: 1.0,
    color: d.color,
    soundType: 'wood',
    renderType: 'door'
  };
  BLOCK_DEFS[d.topOpen] = {
    id: d.topOpen,
    name: `${prefix} Door (Upper, Open)`,
    solid: false,
    transparent: true,
    hardness: 1.0,
    color: d.color,
    soundType: 'wood',
    renderType: 'door'
  };
}

export function isShrubBlock(type: BlockType): boolean {
  return (
    type === BlockType.VERDANT_SHRUB ||
    type === BlockType.WITHERED_SHRUB ||
    type === BlockType.ARCTIC_FRUIT ||
    type === BlockType.ASHEN_BRUSH ||
    type === BlockType.BERRY_BUSH ||
    type === BlockType.THORN_BUSH ||
    type === BlockType.GOLDEN_BLOOM_BUSH ||
    type === BlockType.ROSEBUSH ||
    type === BlockType.SICKLY_BRIAR ||
    type === BlockType.LIANA_BUSH
  );
}

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

export function isFlintBlock(type: BlockType): boolean {
  return (
    type === BlockType.BLACK_ROCK ||
    type === BlockType.BLACK_ROCK_1 ||
    type === BlockType.BLACK_ROCK_2 ||
    type === BlockType.BLACK_ROCK_3 ||
    type === BlockType.BLACK_ROCK_4
  );
}

export function isStoneOrOre(type: BlockType): boolean {
  return (
    type === BlockType.STONE ||
    type === BlockType.COBBLESTONE ||
    type === BlockType.SANDSTONE ||
    type === BlockType.LIMESTONE ||
    type === BlockType.CHALK ||
    isFlintBlock(type) ||
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

/** Check if block is any form of water (source, flowing 1-7, falling, or salt water) */
export function isWaterBlock(type: BlockType): boolean {
  return (
    type === BlockType.WATER ||
    type === BlockType.SALT_WATER ||
    (type >= BlockType.WATER_FLOWING_7 && type <= BlockType.WATER_FALLING)
  );
}

/** Check if block is stationary water source block */
export function isWaterSource(type: BlockType): boolean {
  return type === BlockType.WATER || type === BlockType.SALT_WATER;
}

/** Check if block is falling vertical water stream */
export function isWaterFalling(type: BlockType): boolean {
  return type === BlockType.WATER_FALLING;
}

/**
 * Returns Minecraft-equivalent water fluid level:
 * 8: Source block or vertical falling column
 * 7..1: Flowing water levels (7 is highest flow, 1 is shallowest edge)
 * 0: Not water
 */
export function getWaterLevel(type: BlockType): number {
  if (type === BlockType.WATER || type === BlockType.SALT_WATER || type === BlockType.WATER_FALLING) return 8;
  if (type === BlockType.WATER_FLOWING_7) return 7;
  if (type === BlockType.WATER_FLOWING_6) return 6;
  if (type === BlockType.WATER_FLOWING_5) return 5;
  if (type === BlockType.WATER_FLOWING_4) return 4;
  if (type === BlockType.WATER_FLOWING_3) return 3;
  if (type === BlockType.WATER_FLOWING_2) return 2;
  if (type === BlockType.WATER_FLOWING_1) return 1;
  return 0;
}

/**
 * Converts a level (1..8) to corresponding BlockType
 */
export function getWaterBlockForLevel(level: number, falling: boolean = false): BlockType {
  if (level <= 0) return BlockType.AIR;
  if (falling) return BlockType.WATER_FALLING;
  if (level >= 8) return BlockType.WATER;
  switch (level) {
    case 7: return BlockType.WATER_FLOWING_7;
    case 6: return BlockType.WATER_FLOWING_6;
    case 5: return BlockType.WATER_FLOWING_5;
    case 4: return BlockType.WATER_FLOWING_4;
    case 3: return BlockType.WATER_FLOWING_3;
    case 2: return BlockType.WATER_FLOWING_2;
    case 1: return BlockType.WATER_FLOWING_1;
    default: return BlockType.WATER_FLOWING_1;
  }
}

/**
 * Checks if water can flow into and replace or displace this block.
 * Air, flowers, grass, saplings, mushrooms, torches can be washed away by water.
 */
export function isPassableByWater(type: BlockType): boolean {
  if (type === BlockType.AIR) return true;
  // Underwater and aquatic vegetation coexists with water and must not be washed away
  if (isUnderwaterPlant(type)) return false;
  if (type === BlockType.WATER_REED || type === BlockType.MARSHROOT) return false;
  if (isPlantBlock(type)) return true;
  if (type === BlockType.LANTERN) return true;
  return false;
}

/**
 * Checks if a block is any stage of topsnow (1 to 5).
 */
export function isTopsnow(type: BlockType): boolean {
  return type >= BlockType.TOPSNOW_1 && type <= BlockType.TOPSNOW_5;
}

/**
 * Returns the stage (1 to 5) for a topsnow block.
 * Returns 5 for full SNOW block, 0 for non-snow blocks.
 */
export function getTopsnowStage(type: BlockType): number {
  if (type >= BlockType.TOPSNOW_1 && type <= BlockType.TOPSNOW_5) {
    return (type - BlockType.TOPSNOW_1) + 1;
  }
  if (type === BlockType.SNOW) return 5;
  return 0;
}

/**
 * Returns the height in blocks for a topsnow stage (0.2, 0.4, 0.6, 0.8, 1.0).
 */
export function getTopsnowHeight(type: BlockType): number {
  const stage = getTopsnowStage(type);
  return stage > 0 ? stage * 0.2 : 0;
}

/**
 * Returns the corresponding BlockType for a given topsnow stage (1 to 5).
 */
export function getTopsnowForStage(stage: number): BlockType {
  const clamped = Math.max(1, Math.min(5, Math.round(stage)));
  return (BlockType.TOPSNOW_1 + (clamped - 1)) as BlockType;
}

/**
 * Checks if a block reacts to moisture and water values (0 to 13).
 */
export function isMoistureSensitiveBlock(type: BlockType): boolean {
  return (
    type === BlockType.FARMLAND ||
    type === BlockType.SAND ||
    type === BlockType.SAND_FARMLAND
  );
}

// ── Door Classification & Manipulation Helpers ──

export function isDoorBlock(type: BlockType): boolean {
  return type >= BlockType.OAK_DOOR_BOTTOM && type <= BlockType.CEIBA_DOOR_TOP_OPEN;
}

export function isDoorBottom(type: BlockType): boolean {
  if (!isDoorBlock(type)) return false;
  for (const d of WOOD_DOOR_INFOS) {
    if (type === d.bottom || type === d.bottomOpen) return true;
  }
  return false;
}

export function isDoorTop(type: BlockType): boolean {
  if (!isDoorBlock(type)) return false;
  for (const d of WOOD_DOOR_INFOS) {
    if (type === d.top || type === d.topOpen) return true;
  }
  return false;
}

export function isDoorOpen(type: BlockType): boolean {
  if (!isDoorBlock(type)) return false;
  for (const d of WOOD_DOOR_INFOS) {
    if (type === d.bottomOpen || type === d.topOpen) return true;
  }
  return false;
}

/**
 * Returns true if the block is an Insulated Everfrost Door.
 * Everfrost doors are insulated, meaning they seal enclosed spaces against temperature loss.
 */
export function isInsulatedDoor(type: BlockType): boolean {
  return (
    type === BlockType.EVERFROST_DOOR_BOTTOM ||
    type === BlockType.EVERFROST_DOOR_TOP ||
    type === BlockType.EVERFROST_DOOR_BOTTOM_OPEN ||
    type === BlockType.EVERFROST_DOOR_TOP_OPEN
  );
}

export function getDoorOppositeStateBlock(type: BlockType): BlockType {
  for (const d of WOOD_DOOR_INFOS) {
    if (type === d.bottom) return d.bottomOpen;
    if (type === d.bottomOpen) return d.bottom;
    if (type === d.top) return d.topOpen;
    if (type === d.topOpen) return d.top;
  }
  return type;
}

export function getDoorItemKey(type: BlockType): string {
  for (const d of WOOD_DOOR_INFOS) {
    if (
      type === d.bottom ||
      type === d.top ||
      type === d.bottomOpen ||
      type === d.topOpen
    ) {
      return d.itemKey;
    }
  }
  return 'oak_door';
}

export function getDoorTopForBottom(bottomBlock: BlockType): BlockType {
  for (const d of WOOD_DOOR_INFOS) {
    if (bottomBlock === d.bottom) return d.top;
    if (bottomBlock === d.bottomOpen) return d.topOpen;
  }
  return BlockType.OAK_DOOR_TOP;
}

export function isThermalWorkstation(type: BlockType): boolean {
  return type === BlockType.HEATER || type === BlockType.COOLER;
}



