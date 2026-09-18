import { BlockType } from '../../types';
import {
  generateIronOre,
  generateGoldOre,
  generateOakLeaves,
  generateLeaves,
  generateLogSide,
  generateLogTop,
  generateSand,
  generateSandstone,
  generateGlass,
  generateObsidian,
  generateMagmaRock,
  generateBasalt,
  generateVoidStone,
  generateMycelium,
  generateAetherGrass,
  generateAncientBrick,
  generateWater,
  generateLava,
  generatePackedIce,
  generateSnow,
  generateChest,
  generateLantern,
  generateCloud,
  generateBeacon,
  generateCrystalBlock,
  generateCoralBlock,
  generateAbyssalCrimsonVent,
  generateSaguaroCactus,
  generateGlowShroomBlock,
  generateAmethystCluster,
  generatePalmLog,
  generatePalmLeaves,
  generateEverfrostLog,
  generateBushBlock,
  BushType,
  generateFloraBlock,
  generatePlanks32,
  generateToolCrafterTop32,
  generateToolCrafterSide32,
  generateTinOre32
} from './TextureGenerators32';

export type RegisterBlock32Fn = (
  id: BlockType,
  topBuf: Uint8ClampedArray,
  sideBuf: Uint8ClampedArray,
  bottomBuf?: Uint8ClampedArray
) => void;

export function registerAllRemainingBlocks32(
  registerBlock32: RegisterBlock32Fn,
  customDirtSide: Uint8ClampedArray,
  customStoneTop: Uint8ClampedArray
) {
  // 6. OAK LEAVES
  const oakLeaves = generateOakLeaves();
  registerBlock32(BlockType.OAK_LEAVES, oakLeaves, oakLeaves);

  // 7. SAND
  const sand = generateSand();
  registerBlock32(BlockType.SAND, sand, sand);

  // 8. SANDSTONE
  registerBlock32(
    BlockType.SANDSTONE,
    generateSandstone('top'),
    generateSandstone('side'),
    generateSandstone('bottom')
  );

  // 9. GLASS
  const glass = generateGlass();
  registerBlock32(BlockType.GLASS, glass, glass);

  // 10. OBSIDIAN
  const obsidian = generateObsidian();
  registerBlock32(BlockType.OBSIDIAN, obsidian, obsidian);

  // 11. MAGMA ROCK
  const magmaRock = generateMagmaRock();
  registerBlock32(BlockType.MAGMA_ROCK, magmaRock, magmaRock);

  // 12. BASALT
  registerBlock32(
    BlockType.BASALT,
    generateBasalt('top'),
    generateBasalt('side')
  );

  // 13. MYCELIUM
  registerBlock32(
    BlockType.MYCELIUM,
    generateMycelium('top', customDirtSide),
    generateMycelium('side', customDirtSide),
    customDirtSide
  );

  // 14. GLOW SHROOM BLOCK
  const glowShroom = generateGlowShroomBlock();
  registerBlock32(BlockType.GLOW_SHROOM_BLOCK, glowShroom, glowShroom);

  // 15. CRYSTAL BLOCK
  const crystal = generateCrystalBlock();
  registerBlock32(BlockType.CRYSTAL_BLOCK, crystal, crystal);

  // 16. AMETHYST CLUSTER
  registerBlock32(
    BlockType.AMETHYST_CLUSTER,
    generateAmethystCluster('top'),
    generateAmethystCluster('side')
  );

  // 17. IRON ORE (built on user's custom stone)
  const ironOre = generateIronOre(customStoneTop);
  registerBlock32(BlockType.IRON_ORE, ironOre, ironOre);

  // 18. GOLD ORE (built on user's custom stone)
  const goldOre = generateGoldOre(customStoneTop);
  registerBlock32(BlockType.GOLD_ORE, goldOre, goldOre);

  // 19. VOID STONE
  const voidStone = generateVoidStone();
  registerBlock32(BlockType.VOID_STONE, voidStone, voidStone);

  // 20. AETHER GRASS
  registerBlock32(
    BlockType.AETHER_GRASS,
    generateAetherGrass('top', customDirtSide),
    generateAetherGrass('side', customDirtSide),
    customDirtSide
  );

  // 21. CLOUD
  const cloud = generateCloud();
  registerBlock32(BlockType.CLOUD, cloud, cloud);

  // 22. LANTERN
  registerBlock32(
    BlockType.LANTERN,
    generateLantern('top'),
    generateLantern('side')
  );

  // 23. WATER
  const water = generateWater();
  registerBlock32(BlockType.WATER, water, water);

  // 24. LAVA
  const lava = generateLava();
  registerBlock32(BlockType.LAVA, lava, lava);

  // 25. CHEST
  registerBlock32(
    BlockType.CHEST,
    generateChest('top'),
    generateChest('front'),
    generateChest('side')
  );

  // 26. ANCIENT BRICK
  registerBlock32(
    BlockType.ANCIENT_BRICK,
    generateAncientBrick('top'),
    generateAncientBrick('side')
  );

  // 27. BEACON
  const beacon = generateBeacon();
  registerBlock32(BlockType.BEACON, beacon, beacon);

  // 28. PACKED ICE
  const packedIce = generatePackedIce();
  registerBlock32(BlockType.PACKED_ICE, packedIce, packedIce);

  // 29. SNOW
  const snow = generateSnow();
  registerBlock32(BlockType.SNOW, snow, snow);

  // 30. CORAL BLOCK
  const coral = generateCoralBlock();
  registerBlock32(BlockType.CORAL_BLOCK, coral, coral);

  // 31. ABYSSAL CRIMSON VENT
  const crimsonVent = generateAbyssalCrimsonVent();
  registerBlock32(BlockType.ABYSSAL_CRIMSON_VENT, crimsonVent, crimsonVent);

  // Logs & Leaves generators helper
  const regLog = (
    id: BlockType,
    barkDark: [number, number, number],
    barkMid: [number, number, number],
    barkLight: [number, number, number],
    ringDark: [number, number, number],
    ringLight: [number, number, number]
  ) => {
    const heartwood: [number, number, number] = [
      Math.round((ringDark[0] + ringLight[0]) * 0.5),
      Math.round((ringDark[1] + ringLight[1]) * 0.5),
      Math.round((ringDark[2] + ringLight[2]) * 0.5)
    ];
    registerBlock32(
      id,
      generateLogTop(barkDark, ringLight, ringDark, heartwood),
      generateLogSide(barkDark, barkMid, barkLight)
    );
  };

  const regLeaves = (
    id: BlockType,
    dark: [number, number, number],
    mid: [number, number, number],
    light: [number, number, number],
    accent?: [number, number, number]
  ) => {
    const shadow: [number, number, number] = [
      Math.round(dark[0] * 0.7),
      Math.round(dark[1] * 0.7),
      Math.round(dark[2] * 0.7)
    ];
    const highlight: [number, number, number] = [
      Math.min(255, Math.round(light[0] * 1.25)),
      Math.min(255, Math.round(light[1] * 1.25)),
      Math.min(255, Math.round(light[2] * 1.25))
    ];
    const l = generateLeaves({ shadow, dark, mid, light, highlight, accent });
    registerBlock32(id, l, l);
  };

  // 34. REDWOOD LOG
  regLog(
    BlockType.REDWOOD_LOG,
    [58, 22, 14],
    [98, 42, 28],
    [135, 62, 42],
    [112, 54, 38],
    [165, 92, 65]
  );

  // 35. REDWOOD LEAVES
  regLeaves(
    BlockType.REDWOOD_LEAVES,
    [24, 62, 38],
    [42, 108, 65],
    [68, 155, 95]
  );

  // 36. LIMELEAF LOG
  regLog(
    BlockType.LIMELEAF_LOG,
    [48, 52, 28],
    [88, 95, 52],
    [125, 135, 75],
    [135, 142, 85],
    [175, 185, 115]
  );

  // 37. LIMELEAF LEAVES
  regLeaves(
    BlockType.LIMELEAF_LEAVES,
    [52, 95, 22],
    [95, 158, 42],
    [148, 215, 65]
  );

  // 56. GHOST LOG
  regLog(
    BlockType.GHOST_LOG,
    [42, 48, 58],
    [82, 92, 108],
    [125, 138, 155],
    [115, 125, 142],
    [175, 188, 205]
  );

  // 57. WHITE LEAVES
  regLeaves(
    BlockType.WHITE_LEAVES,
    [120, 135, 150],
    [185, 198, 212],
    [235, 242, 250]
  );

  // 63. PALM LOG
  registerBlock32(
    BlockType.PALM_LOG,
    generatePalmLog('top'),
    generatePalmLog('side')
  );

  // 64. PALM LEAVES
  const palmLeaves = generatePalmLeaves();
  registerBlock32(BlockType.PALM_LEAVES, palmLeaves, palmLeaves);

  // 65. SAGUARO CACTUS
  registerBlock32(
    BlockType.SAGUARO_CACTUS,
    generateSaguaroCactus('top'),
    generateSaguaroCactus('side')
  );

  // 69. EVERFROST LOG
  registerBlock32(
    BlockType.EVERFROST_LOG,
    generateEverfrostLog('top'),
    generateEverfrostLog('side')
  );

  // 70. EVERFROST LEAVES
  regLeaves(
    BlockType.EVERFROST_LEAVES,
    [32, 65, 85],
    [65, 125, 155],
    [145, 215, 245],
    [220, 245, 255]
  );

  // Rainforest Logs & Leaves
  // 78. RAINFOREST OAK
  regLog(
    BlockType.RAINFOREST_OAK_LOG,
    [52, 34, 18],
    [88, 58, 32],
    [125, 85, 48],
    [135, 95, 55],
    [178, 132, 85]
  );
  regLeaves(
    BlockType.RAINFOREST_OAK_LEAVES,
    [22, 68, 25],
    [38, 118, 45],
    [65, 175, 75]
  );

  // 79. KAPOK
  regLog(
    BlockType.KAPOK_LOG,
    [62, 58, 48],
    [102, 95, 82],
    [145, 138, 122],
    [138, 132, 115],
    [185, 178, 162]
  );
  regLeaves(
    BlockType.KAPOK_LEAVES,
    [35, 75, 30],
    [65, 138, 55],
    [115, 195, 95]
  );

  // 80. BANYAN
  regLog(
    BlockType.BANYAN_LOG,
    [48, 38, 28],
    [85, 68, 52],
    [122, 98, 78],
    [118, 95, 75],
    [165, 138, 112]
  );
  regLeaves(
    BlockType.BANYAN_LEAVES,
    [28, 72, 32],
    [48, 125, 58],
    [82, 185, 95]
  );

  // 81. STRANGLER
  regLog(
    BlockType.STRANGLER_LOG,
    [58, 32, 22],
    [98, 58, 42],
    [138, 88, 65],
    [128, 78, 55],
    [175, 122, 95]
  );
  regLeaves(
    BlockType.STRANGLER_LEAVES,
    [32, 82, 38],
    [58, 142, 68],
    [98, 205, 112]
  );

  // 82. MAHOGANY
  regLog(
    BlockType.MAHOGANY_LOG,
    [68, 25, 18],
    [115, 45, 32],
    [158, 68, 52],
    [142, 58, 42],
    [195, 98, 78]
  );
  regLeaves(
    BlockType.MAHOGANY_LEAVES,
    [25, 65, 28],
    [45, 115, 48],
    [78, 168, 82]
  );

  // 83. CEIBA
  regLog(
    BlockType.CEIBA_LOG,
    [55, 52, 45],
    [95, 88, 78],
    [135, 128, 115],
    [128, 122, 108],
    [175, 168, 155]
  );
  regLeaves(
    BlockType.CEIBA_LEAVES,
    [38, 78, 35],
    [68, 142, 62],
    [118, 198, 105]
  );

  // -------------------------------------------------------------
  // Bush & Shrub Blocks (Solid 32x32 Voxel Cube Foliage Blocks)
  // -------------------------------------------------------------
  const bushMappings: Array<{ id: BlockType; type: BushType }> = [
    { id: BlockType.BERRY_BUSH, type: 'berry' },
    { id: BlockType.THORN_BUSH, type: 'thorn' },
    { id: BlockType.VERDANT_SHRUB, type: 'verdant' },
    { id: BlockType.GOLDEN_BLOOM_BUSH, type: 'golden_bloom' },
    { id: BlockType.ROSEBUSH, type: 'rosebush' },
    { id: BlockType.WITHERED_SHRUB, type: 'withered' },
    { id: BlockType.ASHEN_BRUSH, type: 'ashen' },
    { id: BlockType.SICKLY_BRIAR, type: 'sickly_briar' },
    { id: BlockType.ARCTIC_FRUIT, type: 'arctic_fruit' },
    { id: BlockType.LIANA_BUSH, type: 'liana_bush' }
  ];

  for (const { id, type } of bushMappings) {
    const bushBuf = generateBushBlock(type);
    registerBlock32(id, bushBuf, bushBuf);
  }

  // Cross-rendered plants, Flora, Kelp, Mushrooms, Vines
  const floraBlocks: BlockType[] = [
    BlockType.CRIMSON_TENDRIL,
    BlockType.BLOOD_KELP,
    BlockType.JADELEAF_FERN,
    BlockType.SUNFLOWER,
    BlockType.ORO_FLOWER,
    BlockType.BELL_LILY,
    BlockType.CYRO_LILY,
    BlockType.LILYPAD,
    BlockType.WATER_REED,
    BlockType.MARSHROOT,
    BlockType.DRIED_SEAWEED,
    BlockType.SMALL_KELP,
    BlockType.SEAGRASS,
    BlockType.WATER_ALGAE,
    BlockType.TALL_KELP,
    BlockType.PALE_GHOST_FLOWER,
    BlockType.DEATH_CAP_MUSHROOM,
    BlockType.BARREL_CACTUS,
    BlockType.PRICKLY_PEAR,
    BlockType.FLOWERING_TORCH_CACTUS,
    BlockType.ICICLE,
    BlockType.SNOWDROP,
    BlockType.FROST_FERN,
    BlockType.WINTERCREST,
    BlockType.FROST_LICHEN,
    BlockType.VINE,
    BlockType.HELICONIA,
    BlockType.GIANT_FERN,
    BlockType.ORCHID,
    BlockType.PITCHER_PLANT,
    BlockType.JUNGLE_MUSHROOM
  ];

  for (const fId of floraBlocks) {
    const fBuf = generateFloraBlock(fId);
    registerBlock32(fId, fBuf, fBuf);
  }

  // -------------------------------------------------------------
  // Planks
  // -------------------------------------------------------------
  const plankConfigs: Array<{ id: BlockType; color: [number, number, number]; seed: number }> = [
    { id: BlockType.REDWOOD_PLANK, color: [147, 75, 53], seed: 101 },
    { id: BlockType.WILLOW_PLANK, color: [155, 179, 108], seed: 102 },
    { id: BlockType.OAK_PLANK, color: [184, 148, 95], seed: 103 },
    { id: BlockType.EVERFROST_PLANK, color: [163, 194, 207], seed: 104 },
    { id: BlockType.PALM_PLANK, color: [207, 181, 122], seed: 105 },
    { id: BlockType.GHOST_PLANK, color: [214, 219, 224], seed: 106 },
    { id: BlockType.RAINFOREST_OAK_PLANK, color: [109, 117, 75], seed: 107 },
    { id: BlockType.KAPOK_PLANK, color: [196, 173, 141], seed: 108 },
    { id: BlockType.BANYAN_PLANK, color: [139, 105, 75], seed: 109 },
    { id: BlockType.STRANGLER_PLANK, color: [110, 79, 58], seed: 110 },
    { id: BlockType.MAHOGANY_PLANK, color: [122, 59, 46], seed: 111 },
    { id: BlockType.CEIBA_PLANK, color: [138, 122, 95], seed: 112 }
  ];

  for (const p of plankConfigs) {
    const pBuf = generatePlanks32(p.color, p.seed);
    registerBlock32(p.id, pBuf, pBuf);
  }

  // Workstation: Tool Crafter
  const toolCrafterTop = generateToolCrafterTop32();
  const toolCrafterSide = generateToolCrafterSide32();
  const toolCrafterBottom = generatePlanks32([130, 95, 65], 88);
  registerBlock32(BlockType.TOOL_CRAFTER, toolCrafterTop, toolCrafterSide, toolCrafterBottom);

  // Ore: Tin Ore
  const tinOreBuf = generateTinOre32();
  registerBlock32(BlockType.TIN_ORE, tinOreBuf, tinOreBuf);
}
