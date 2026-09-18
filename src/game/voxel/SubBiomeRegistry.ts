import { BiomeType, BlockType } from '../../types';
import { BiomeParameters, VerdantSubBiomeDef } from './SubBiomeTypes';
import { SEA_LEVEL } from './ChunkConstants';

/**
 * Registry of biomes and sub-biomes:
 * - The Ocean (~30% of the world, never near spawn, very deep)
 * - Shorelines (transitions with sand beaches or stone cliffs)
 * - Trenches (rare, under oceans, deep dark chasms with glowing red flora)
 * - Verdant Plains (continent with rich Perlin-based sub-biomes)
 *
 * Temperature is very solid and unmoving, determining ocean climate (Frozen, Cold, Open, Coral Cove).
 */

export const SUB_BIOME_REGISTRY: Record<string, VerdantSubBiomeDef> = {
  // ==================== THE OCEAN SUB-BIOMES ====================
  FROZEN_OCEAN: {
    id: 'frozen_ocean',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Frozen Ocean',
    description: 'Very cold, semi-shallow polar ocean with towering glaciers, pack ice, and snowy shelves.',
    accentColor: '#bae6fd',
    baseHeightOffset: -28, // Sea floor around Y 72
    heightVariation: 0.8,
    weirdnessScale: 0.2,
    surfaceBlock: BlockType.DIRT,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0,
    hasGlaciers: true,
    isArctic: true
  },

  COLD_OCEAN: {
    id: 'cold_ocean',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Cold Ocean',
    description: 'Fairly deep, chilling dark waters with gravelly seabeds and cold abyssal currents.',
    accentColor: '#38bdf8',
    baseHeightOffset: -46, // Sea floor around Y 54
    heightVariation: 0.9,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.DIRT,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  OPEN_OCEAN: {
    id: 'open_ocean',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Open Ocean',
    description: 'Vast deep nothingness stretching to the horizon with plunging abyssal depths.',
    accentColor: '#0284c7',
    baseHeightOffset: -62, // Sea floor around Y 38 (deep nothingness!)
    heightVariation: 0.6,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.DIRT,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  CORAL_COVE: {
    id: 'coral_cove',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Coral Cove',
    description: 'Warm, sunlit shallow waters teeming with living coral reefs, bounded by stoney cliffs.',
    accentColor: '#fb7185',
    baseHeightOffset: -22, // Sea floor around Y 78 (semi-shallow)
    heightVariation: 0.5,
    weirdnessScale: 0.15,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SANDSTONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0,
    hasCoralReef: true
  },

  WARM_OCEAN: {
    id: 'warm_ocean',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Warm Ocean',
    description: 'Tropical turquoise sea with smooth golden sandbars and warm rolling ocean swells.',
    accentColor: '#06b6d4',
    baseHeightOffset: -42, // Sea floor around Y 58
    heightVariation: 0.7,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SANDSTONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  // ==================== SHORELINES ====================
  SANDY_SHORELINE: {
    id: 'sandy_shoreline',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Sandy Shoreline',
    description: 'Gentle golden beach blending smoothly between inland grassy plains and the open ocean.',
    accentColor: '#facc15',
    baseHeightOffset: -1, // Right around Y 99-101
    heightVariation: 0.4,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SANDSTONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0,
    shoreType: 'sand'
  },

  STONE_CLIFF_SHORELINE: {
    id: 'stone_cliff_shoreline',
    category: 'ocean',
    mainBiome: BiomeType.THE_OCEAN,
    name: 'Stone Cliff Shoreline',
    description: 'Dramatic precipitous stone bluffs plunging sheer into the deep waves below.',
    accentColor: '#78716c',
    baseHeightOffset: 8, // High cliffs at Y 108-114
    heightVariation: 1.4,
    weirdnessScale: 0.25,
    surfaceBlock: BlockType.STONE,
    subSurfaceBlock: BlockType.COBBLESTONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0,
    shoreType: 'cliff_stone'
  },

  // ==================== TRENCHES ====================
  ABYSSAL_TRENCH: {
    id: 'abyssal_trench',
    category: 'trench',
    mainBiome: BiomeType.TRENCHES,
    name: 'Abyssal Trench',
    description: 'A terrifying dark oceanic chasm carved deep into the crust, colonized by glowing red flora.',
    accentColor: '#dc2626',
    baseHeightOffset: -82, // Chasm floor down at Y 18-25!
    heightVariation: 1.2,
    weirdnessScale: 0.9,
    surfaceBlock: BlockType.BASALT,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0,
    hasTrenchFissure: true
  },

  // ==================== VERDANT PLAINS SUB-BIOMES ====================
  VERDANT_PLAINS_MEADOW: {
    id: 'verdant_plains_meadow',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Meadow',
    description: 'Rolling emerald hills with gentle slopes and lush green turf.',
    accentColor: '#4ade80',
    baseHeightOffset: 3, // Ground around Y 103
    heightVariation: 1.0,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.016, // Spawns Red Wood Trees in cold half, Oak/Limeleaf in warm half
    flowerFrequency: 0.08,
    tallGrassFrequency: 0.15
  },

  VERDANT_MARSH: {
    id: 'verdant_marsh',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Marsh',
    description: 'Low-lying saturated flats dotted with shallow ponds and damp basins.',
    accentColor: '#2dd4bf',
    baseHeightOffset: -2, // Dips slightly under Y 100 for shallow marsh pools
    heightVariation: 0.35,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.012, // Spawns Bushy weeping Limeleaf Trees
    flowerFrequency: 0.07,
    tallGrassFrequency: 0.20,
    hasMudPuddles: true,
    hasReedsOrLilypads: true
  },

  VERDANT_STEPPE: {
    id: 'verdant_steppe',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Steppe',
    description: 'Expansive, windswept green lowlands with gentle open terrain.',
    accentColor: '#84cc16',
    baseHeightOffset: 1,
    heightVariation: 0.3,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.004,
    flowerFrequency: 0.05,
    tallGrassFrequency: 0.12
  },

  CLOVER_PRAIRIE: {
    id: 'clover_prairie',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Clover Prairie',
    description: 'Level sea of emerald turf stretching as far as the eye can see.',
    accentColor: '#86efac',
    baseHeightOffset: 2,
    heightVariation: 0.25,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.003,
    flowerFrequency: 0.14, // Abundant sunflowers, oro flowers, golden blooms
    tallGrassFrequency: 0.18
  },

  MIST_HIGHLANDS: {
    id: 'mist_highlands',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Mist Highlands',
    description: 'Steep verdant knolls with natural cascading creek beds and rolling crests.',
    accentColor: '#38bdf8',
    baseHeightOffset: 12, // Ground around Y 112
    heightVariation: 1.8,
    weirdnessScale: 0.15,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.024, // Stately Red Wood evergreen groves
    flowerFrequency: 0.07,
    tallGrassFrequency: 0.14
  },

  CRAG_RIDGE: {
    id: 'crag_ridge',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Crag Ridge',
    description: 'High rolling grassy ridges with sweeping elevation changes.',
    accentColor: '#4ade80',
    baseHeightOffset: 16, // High ridge peaks around Y 116-125
    heightVariation: 2.1,
    weirdnessScale: 0.25,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.016, // Red Wood evergreens on ridges
    flowerFrequency: 0.04,
    tallGrassFrequency: 0.10
  },

  REDWOOD_FOREST: {
    id: 'redwood_forest',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Redwood Forest',
    description: 'Majestic ancient redwoods soaring high into the canopy with rich woodland understory and mossy needles.',
    accentColor: '#ea580c',
    baseHeightOffset: 8,
    heightVariation: 1.4,
    weirdnessScale: 0.12,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.032,
    flowerFrequency: 0.06,
    tallGrassFrequency: 0.16,
    isRedwoodForest: true,
    treeTypeOverride: 'redwood'
  },

  EMERALD_KNOLLS: {
    id: 'emerald_knolls',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Emerald Knolls',
    description: 'Undulating emerald hills and gentle green pastures.',
    accentColor: '#10b981',
    baseHeightOffset: 8,
    heightVariation: 1.6,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.020, // Limeleaf willows and oaks
    flowerFrequency: 0.10, // Jadeleaf ferns, oro flowers, rosebushes
    tallGrassFrequency: 0.16
  },

  FRACTURED_TERRACES: {
    id: 'fractured_terraces',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Terraced Plains',
    description: 'Stepped grassy plateaus cutting through wide green fields.',
    accentColor: '#22c55e',
    baseHeightOffset: 4,
    heightVariation: 0.6,
    weirdnessScale: 0.4,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.012,
    flowerFrequency: 0.08,
    tallGrassFrequency: 0.12
  },

  VERDANT_SPIRES: {
    id: 'verdant_spires',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Spires',
    description: 'Dramatic grass-crowned hills and bluffs rising above the plains.',
    accentColor: '#16a34a',
    baseHeightOffset: 18,
    heightVariation: 2.5,
    weirdnessScale: 0.5,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.014,
    flowerFrequency: 0.07,
    tallGrassFrequency: 0.14
  },

  PHOSPHOR_FEN: {
    id: 'phosphor_fen',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Basin',
    description: 'Sunken wetland basin nestled between rolling grassy knolls.',
    accentColor: '#14b8a6',
    baseHeightOffset: -1,
    heightVariation: 0.45,
    weirdnessScale: 0.3,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.012, // Limeleaf willows
    flowerFrequency: 0.08,
    tallGrassFrequency: 0.22,
    hasMudPuddles: true,
    hasReedsOrLilypads: true
  },

  PARCHED_FLATS: {
    id: 'parched_flats',
    category: 'verdant',
    mainBiome: BiomeType.VERDANT_PLAINS,
    name: 'Verdant Lowlands',
    description: 'Smooth, expansive green lowlands stretching across the horizon.',
    accentColor: '#84cc16',
    baseHeightOffset: 2,
    heightVariation: 0.28,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.005,
    flowerFrequency: 0.05,
    tallGrassFrequency: 0.10
  },

  // ==================== CAVE SUB-BIOMES ====================
  CRYSTALLINE_CHASM: {
    id: 'crystalline_chasm',
    category: 'cave',
    mainBiome: BiomeType.CRYSTALLINE_CAVERNS,
    name: 'Crystalline Chasm',
    description: 'Deep subterranean caverns glittering with amethyst clusters, rare ore veins, and bioluminescent shrooms.',
    accentColor: '#c084fc',
    baseHeightOffset: -50,
    heightVariation: 1.0,
    weirdnessScale: 0.8,
    surfaceBlock: BlockType.COBBLESTONE,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: 0,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  SUBTERRANEAN_CAVERNS: {
    id: 'subterranean_caverns',
    category: 'cave',
    mainBiome: BiomeType.CRYSTALLINE_CAVERNS,
    name: 'Subterranean Caverns',
    description: 'Sprawling natural stone tunnels and winding caverns cutting deep beneath the continental crust.',
    accentColor: '#a855f7',
    baseHeightOffset: -40,
    heightVariation: 1.0,
    weirdnessScale: 0.5,
    surfaceBlock: BlockType.STONE,
    subSurfaceBlock: BlockType.COBBLESTONE,
    waterLevel: 0,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  FROZEN_CAVERNS: {
    id: 'frozen_caverns',
    category: 'cave',
    mainBiome: BiomeType.CRYSTALLINE_CAVERNS,
    name: 'Glacial Chasm',
    description: 'Sub-zero subterranean fissures shrouded in frost, solid packed ice, and radiant Cyro Lilies.',
    accentColor: '#38bdf8',
    baseHeightOffset: -40,
    heightVariation: 1.0,
    weirdnessScale: 0.5,
    surfaceBlock: BlockType.PACKED_ICE,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: 0,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  ABYSSAL_CAVERN: {
    id: 'abyssal_cavern',
    category: 'cave',
    mainBiome: BiomeType.TRENCHES,
    name: 'Abyssal Flooded Caverns',
    description: 'Subterranean flooded ocean cavern network glowing with hydrothermal vents and deep-sea flora.',
    accentColor: '#f43f5e',
    baseHeightOffset: -60,
    heightVariation: 1.0,
    weirdnessScale: 0.7,
    surfaceBlock: BlockType.BASALT,
    subSurfaceBlock: BlockType.STONE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0,
    tallGrassFrequency: 0
  },

  // ==================== DECAYED LANDS (RARE SURFACE BIOMES) ====================
  DECAYED_FOREST: {
    id: 'decayed_forest',
    category: 'decayed',
    mainBiome: BiomeType.DECAYED_LANDS,
    name: 'Decayed Forest',
    description: 'An eerie withered woodland of ghost trees with pale logs and white leaves, dead plants, weird boulders, and sickly pale waters.',
    accentColor: '#cbd5e1',
    baseHeightOffset: 4,
    heightVariation: 0.8,
    weirdnessScale: 0.35,
    surfaceBlock: BlockType.DIRT, // No grass, just dirt!
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.022, // Ghost trees with pale logs & white leaves
    flowerFrequency: 0.08, // 5 exclusive withered plants
    tallGrassFrequency: 0,
    isDecayed: true,
    hasWeirdBoulders: true,
    isSicklyWater: true,
    treeTypeOverride: 'ghost'
  },

  DECAYED_FIELDS: {
    id: 'decayed_fields',
    category: 'decayed',
    mainBiome: BiomeType.DECAYED_LANDS,
    name: 'Decayed Fields',
    description: 'A desolate, withered open expanse of bare dirt strewn with weird boulders, sickly waters, and sparse dying flora.',
    accentColor: '#94a3b8',
    baseHeightOffset: 2,
    heightVariation: 0.35,
    weirdnessScale: 0.3,
    surfaceBlock: BlockType.DIRT, // No grass, just dirt!
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.005, // Sparse solitary ghost trees
    flowerFrequency: 0.09, // 5 exclusive withered plants
    tallGrassFrequency: 0,
    isDecayed: true,
    hasWeirdBoulders: true,
    isSicklyWater: true,
    treeTypeOverride: 'ghost'
  },

  // ==================== THE DESERT & SUB-BIOMES ====================
  DESERT_DUNES: {
    id: 'desert_dunes',
    category: 'desert',
    mainBiome: BiomeType.THE_DESERT,
    name: 'Golden Dunes',
    description: 'Expansive rolling dunes of golden desert sand, home to barrel cacti and prickly pears.',
    accentColor: '#eab308',
    baseHeightOffset: 5,
    heightVariation: 1.4,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SANDSTONE,
    waterLevel: 0,
    treeFrequency: 0,
    flowerFrequency: 0.022,
    tallGrassFrequency: 0,
    isDesert: true,
    cactusDensity: 0.35
  },

  DESERT_OASIS: {
    id: 'desert_oasis',
    category: 'desert',
    mainBiome: BiomeType.THE_DESERT,
    name: 'Desert Oasis',
    description: 'A tranquil desert spring surrounded by tall tropical palm trees, lush reeds, and calm waters.',
    accentColor: '#06b6d4',
    baseHeightOffset: -2,
    heightVariation: 0.3,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.032, // Palm trees!
    flowerFrequency: 0.06,
    tallGrassFrequency: 0.12,
    isDesert: true,
    hasPalmTrees: true,
    hasReedsOrLilypads: true,
    cactusDensity: 0.04, // Barely any cacti
    treeTypeOverride: 'palm'
  },

  CACTUS_BADLANDS: {
    id: 'cactus_badlands',
    category: 'desert',
    mainBiome: BiomeType.THE_DESERT,
    name: 'Saguaro Cactus Badlands',
    description: 'A dense, towering desert thicket packed with multi-armed saguaro cacti, barrel cacti, and blooming desert flora.',
    accentColor: '#15803d',
    baseHeightOffset: 4,
    heightVariation: 0.75,
    weirdnessScale: 0.15,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SANDSTONE,
    waterLevel: 0,
    treeFrequency: 0,
    flowerFrequency: 0.06,
    tallGrassFrequency: 0,
    isDesert: true,
    cactusDensity: 1.0 // Very dense cacti!
  },

  ARID_SCRUBLAND: {
    id: 'arid_scrubland',
    category: 'desert',
    mainBiome: BiomeType.THE_DESERT,
    name: 'Arid Scrubland',
    description: 'Dry sun-bleached desert barrens with flat sand flats and barely any cacti.',
    accentColor: '#d97706',
    baseHeightOffset: 2,
    heightVariation: 0.3,
    weirdnessScale: 0.08,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SANDSTONE,
    waterLevel: 0,
    treeFrequency: 0,
    flowerFrequency: 0.008,
    tallGrassFrequency: 0,
    isDesert: true,
    cactusDensity: 0.08 // Barely any cacti
  },

  // ==================== RIVER & RIVERMOUTH ====================
  RIVER: {
    id: 'river',
    category: 'river',
    mainBiome: BiomeType.RIVER,
    name: 'Freshwater River',
    description: 'A winding waterway with water at Y100, small shorelines of dirt, sand, or stone, and water reeds.',
    accentColor: '#38bdf8',
    baseHeightOffset: -2,
    heightVariation: 0.1,
    weirdnessScale: 0.05,
    surfaceBlock: BlockType.DIRT,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0.08,
    tallGrassFrequency: 0.15,
    hasReedsOrLilypads: true,
    isRiver: true
  },

  RIVERMOUTH: {
    id: 'rivermouth',
    category: 'river',
    mainBiome: BiomeType.RIVER,
    name: 'Rivermouth Estuary',
    description: 'Where the winding river collides into the ocean via sandy shorebeds and estuarine delta shoals.',
    accentColor: '#0ea5e9',
    baseHeightOffset: -4,
    heightVariation: 0.2,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0.05,
    tallGrassFrequency: 0.1,
    isRivermouth: true,
    hasReedsOrLilypads: true
  },

  // ==================== ARCTIC & BOREAL SUB-BIOMES ====================
  EVERFROST_FOREST: {
    id: 'everfrost_forest',
    category: 'arctic',
    mainBiome: BiomeType.ARCTIC,
    name: 'Everfrost Forest',
    description: 'Sub-zero snowy taiga with towering everfrost conifers, snowdrops, and hanging icicles.',
    accentColor: '#93c5fd',
    baseHeightOffset: 1,
    heightVariation: 0.9,
    weirdnessScale: 0.2,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.032,
    flowerFrequency: 0.03,
    tallGrassFrequency: 0,
    isArctic: true,
    hasEverfrostTrees: true,
    treeTypeOverride: 'everfrost'
  },

  FROZEN_TUNDRA: {
    id: 'frozen_tundra',
    category: 'arctic',
    mainBiome: BiomeType.ARCTIC,
    name: 'Frozen Tundra',
    description: 'Vast, wind-swept expanse of pure white snow, frost lichen, and frigid arctic fruit.',
    accentColor: '#e0f2fe',
    baseHeightOffset: -1,
    heightVariation: 0.4,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.DIRT,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.002,
    flowerFrequency: 0.02,
    tallGrassFrequency: 0,
    isArctic: true,
    treeTypeOverride: 'everfrost'
  },

  FROSTBITE_PEAKS: {
    id: 'frostbite_peaks',
    category: 'arctic',
    mainBiome: BiomeType.BOREAL_PEAKS,
    name: 'Frostbite Peaks',
    description: 'High-altitude jagged ridges clad in eternal snow and sub-zero pack ice shelves.',
    accentColor: '#bfdbfe',
    baseHeightOffset: 16,
    heightVariation: 1.8,
    weirdnessScale: 0.5,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.PACKED_ICE,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0.006,
    flowerFrequency: 0.015,
    tallGrassFrequency: 0,
    isArctic: true,
    isEversnow: true,
    snowStackHeight: 3,
    treeTypeOverride: 'everfrost'
  },

  SNOWY_SHORELINE: {
    id: 'snowy_shoreline',
    category: 'arctic',
    mainBiome: BiomeType.ARCTIC,
    name: 'Snowy Shoreline',
    description: 'Frost-rimmed coast where arctic snow banks meet icy ocean currents.',
    accentColor: '#c7d2fe',
    baseHeightOffset: -2,
    heightVariation: 0.35,
    weirdnessScale: 0.1,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.SAND,
    waterLevel: SEA_LEVEL,
    treeFrequency: 0,
    flowerFrequency: 0.015,
    tallGrassFrequency: 0,
    isArctic: true,
    shoreType: 'sand'
  }
};

// Maintain backwards compatibility alias
export const VERDANT_SUB_BIOMES = SUB_BIOME_REGISTRY;

/**
 * Determines the sub-biome from 6 Perlin noise parameters:
 * - continentalness: Ocean vs Shoreline vs Inland Continent
 * - temperature: Solid, unmoving climate parameter (affects oceans and special features)
 * - flatness: Relief (flat vs hilly)
 * - humidity: Moisture (dry vs wet)
 * - weirdness: Anomalies (trenches, spires)
 * - vegetation: Flora density
 */
export function resolveVerdantSubBiome(params: BiomeParameters): VerdantSubBiomeDef {
  const { continentalness, temperature, flatness, humidity, weirdness, vegetation, coastType = 0 } = params;

  // 1. TRENCHES: Rare chasm under deep ocean when weirdness / fissure noise is high
  if (continentalness < -0.38 && weirdness > 0.40) {
    return SUB_BIOME_REGISTRY.ABYSSAL_TRENCH;
  }

  // 2. THE OCEAN: Continentalness < -0.34 (~30% of total world)
  if (continentalness < -0.34) {
    // Polar ocean requires extreme frigid temperatures so ice doesn't take over ordinary oceans:
    if (temperature < -0.72) {
      // Frigid polar deep, glaciers and pack ice shelves
      return SUB_BIOME_REGISTRY.FROZEN_OCEAN;
    }
    if (temperature < -0.15) {
      // Cold, fairly deep liquid waters (no surface ice takeover)
      return SUB_BIOME_REGISTRY.COLD_OCEAN;
    }
    if (temperature > 0.42) {
      // Warm: Coral Cove if near shallows / stoney boundary, or Warm Ocean
      if (continentalness > -0.45 || flatness > 0.15) {
        return SUB_BIOME_REGISTRY.CORAL_COVE;
      }
      return SUB_BIOME_REGISTRY.WARM_OCEAN;
    }
    // Default Open Ocean: Deep nothingness
    return SUB_BIOME_REGISTRY.OPEN_OCEAN;
  }

  // 3. SHORELINES: Transition blend between Oceans and Landmass (-0.34 <= continentalness < -0.15)
  if (continentalness < -0.15) {
    // Polar shoreline adjacent to arctic zones
    if (temperature < -0.65) {
      return SUB_BIOME_REGISTRY.SNOWY_SHORELINE;
    }
    // Stone cliffs only spawn in dedicated high-relief crag provinces (coastType > 0.38 && flatness > 0.22).
    // Everywhere else along the continental rim spawns as the continuous Sandy Shoreline ramp.
    if (coastType > 0.38 && flatness > 0.22) {
      return SUB_BIOME_REGISTRY.STONE_CLIFF_SHORELINE;
    }
    return SUB_BIOME_REGISTRY.SANDY_SHORELINE;
  }

  // 4. RARER SURFACE BIOMES (Decayed Forest & Decayed Fields)
  // "quite quite rare, not super large, but not small by any means"
  if (weirdness > 0.58 && humidity < -0.20) {
    if (flatness > 0.05) {
      return SUB_BIOME_REGISTRY.DECAYED_FOREST;
    }
    return SUB_BIOME_REGISTRY.DECAYED_FIELDS;
  }

  // 5. THE DESERT: Hot biome, bit more common than rare biomes, but not as common as plains
  // Houses Oasis as sub-biome with palm trees, and sub-biomes determining cacti type & density
  if (temperature > 0.38) {
    if (humidity > 0.26) {
      return SUB_BIOME_REGISTRY.DESERT_OASIS;
    }
    if (vegetation > 0.20) {
      return SUB_BIOME_REGISTRY.CACTUS_BADLANDS;
    }
    if (flatness < -0.20) {
      return SUB_BIOME_REGISTRY.ARID_SCRUBLAND;
    }
    return SUB_BIOME_REGISTRY.DESERT_DUNES;
  }

  // 6. ARCTIC BIOMES: Frigid polar climate (temperature < -0.65)
  // Dedicated snowy regions featuring Everfrost conifer forests, frozen tundra, and frost peaks
  if (temperature < -0.65) {
    if (flatness > 0.30) {
      return SUB_BIOME_REGISTRY.FROSTBITE_PEAKS;
    }
    if (vegetation > -0.15) {
      return SUB_BIOME_REGISTRY.EVERFROST_FOREST;
    }
    return SUB_BIOME_REGISTRY.FROZEN_TUNDRA;
  }

  // 7. VERDANT PLAINS (INLAND CONTINENT):
  if (weirdness > 0.45) {
    if (humidity > 0.3) {
      return SUB_BIOME_REGISTRY.PHOSPHOR_FEN;
    }
    if (flatness > 0.2) {
      return SUB_BIOME_REGISTRY.VERDANT_SPIRES;
    }
    return SUB_BIOME_REGISTRY.FRACTURED_TERRACES;
  }

  // Flat territory: flatness < -0.28
  if (flatness < -0.28) {
    if (humidity > 0.25) {
      return SUB_BIOME_REGISTRY.VERDANT_MARSH;
    }
    if (humidity < -0.3) {
      return SUB_BIOME_REGISTRY.VERDANT_STEPPE;
    }
    if (vegetation > 0.3) {
      return SUB_BIOME_REGISTRY.CLOVER_PRAIRIE;
    }
    if (vegetation < -0.35) {
      return SUB_BIOME_REGISTRY.PARCHED_FLATS;
    }
  }

  // Hilly territory: flatness > 0.32
  if (flatness > 0.32) {
    if (humidity > 0.25) {
      return SUB_BIOME_REGISTRY.MIST_HIGHLANDS;
    }
    if (humidity < -0.25 || vegetation < -0.3) {
      return SUB_BIOME_REGISTRY.CRAG_RIDGE;
    }
    if (vegetation > 0.25) {
      return SUB_BIOME_REGISTRY.EMERALD_KNOLLS;
    }
  }

  // Cooler inland temperate woodland — Towering Redwood Forests
  if (temperature < 0 && vegetation > -0.25) {
    return SUB_BIOME_REGISTRY.REDWOOD_FOREST;
  }

  // Default neutral / common occurrence
  return SUB_BIOME_REGISTRY.VERDANT_PLAINS_MEADOW;
}

/**
 * Helper to identify if a sub-biome constitutes a Redwood Forest habitat
 * (e.g. Redwood Forest, Mist Highlands, Crag Ridge, or any sub-biome generating redwoods)
 */
export function isRedwoodBiome(subBiome: VerdantSubBiomeDef | null | undefined): boolean {
  if (!subBiome) return false;
  return (
    subBiome.id === 'redwood_forest' ||
    Boolean(subBiome.isRedwoodForest) ||
    subBiome.id === 'mist_highlands' ||
    subBiome.id === 'crag_ridge' ||
    subBiome.treeTypeOverride === 'redwood'
  );
}

