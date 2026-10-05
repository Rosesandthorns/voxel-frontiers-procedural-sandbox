import { BlockDef, BlockType } from '../../types';
import { BLOCK_DEFS } from '../voxel/Blocks';
import { CROP_CONFIGS, CropConfig } from './CropTypes';

export const CROP_BLOCK_IDS = {
  TRELLIS: 200 as BlockType,
  WILD_SEA_CABBAGE: 201 as BlockType,
  CORN_TOP: 430 as BlockType,
  SUGARCANE_TOP: 431 as BlockType,
  SUNFLOWER_TOP: 432 as BlockType
};

export interface CropBlockBundle {
  crop: CropConfig;
  sprout: BlockType;
  growing: BlockType;
  mature: BlockType;
  wilted: BlockType;
}

export const CROP_BLOCK_BUNDLES: Map<string, CropBlockBundle> = new Map();
export const BLOCK_TO_CROP_MAP: Map<BlockType, { crop: CropConfig; stage: 'sprout' | 'growing' | 'mature' | 'wilted' }> = new Map();

// Initialize all crop block bundles and definitions
const BASE_CROP_BLOCK_ID = 210;

CROP_CONFIGS.forEach((crop, index) => {
  const sprout = (BASE_CROP_BLOCK_ID + index * 4) as BlockType;
  const growing = (BASE_CROP_BLOCK_ID + index * 4 + 1) as BlockType;
  const mature = (BASE_CROP_BLOCK_ID + index * 4 + 2) as BlockType;
  const wilted = (BASE_CROP_BLOCK_ID + index * 4 + 3) as BlockType;

  const bundle: CropBlockBundle = { crop, sprout, growing, mature, wilted };
  CROP_BLOCK_BUNDLES.set(crop.id, bundle);

  BLOCK_TO_CROP_MAP.set(sprout, { crop, stage: 'sprout' });
  BLOCK_TO_CROP_MAP.set(growing, { crop, stage: 'growing' });
  BLOCK_TO_CROP_MAP.set(mature, { crop, stage: 'mature' });
  BLOCK_TO_CROP_MAP.set(wilted, { crop, stage: 'wilted' });

  // 1. Sprout BlockDef
  BLOCK_DEFS[sprout] = {
    id: sprout,
    name: `${crop.name} (Sprout)`,
    solid: false,
    transparent: true,
    hardness: 0.05,
    color: '#84cc16',
    soundType: 'organic',
    renderType: 'cross'
  };

  // 2. Growing BlockDef
  BLOCK_DEFS[growing] = {
    id: growing,
    name: `${crop.name} (Growing)`,
    solid: false,
    transparent: true,
    hardness: 0.1,
    color: '#22c55e',
    soundType: 'organic',
    renderType: 'cross'
  };

  // 3. Mature BlockDef
  BLOCK_DEFS[mature] = {
    id: mature,
    name: `${crop.name} (Mature)`,
    solid: false,
    transparent: true,
    hardness: 0.15,
    color: crop.color,
    soundType: 'organic',
    renderType: 'cross'
  };

  // 4. Wilted BlockDef
  BLOCK_DEFS[wilted] = {
    id: wilted,
    name: `Wilted ${crop.name}`,
    solid: false,
    transparent: true,
    hardness: 0.05,
    color: '#78350f',
    soundType: 'earth',
    renderType: 'cross'
  };
});

// Register Trellis & Wild Sea Cabbage & Tall Tops
BLOCK_DEFS[CROP_BLOCK_IDS.TRELLIS] = {
  id: CROP_BLOCK_IDS.TRELLIS,
  name: 'Garden Trellis',
  solid: true,
  transparent: true,
  hardness: 0.8,
  color: '#8d6e63',
  soundType: 'wood',
  renderType: 'cross'
};

BLOCK_DEFS[CROP_BLOCK_IDS.WILD_SEA_CABBAGE] = {
  id: CROP_BLOCK_IDS.WILD_SEA_CABBAGE,
  name: 'Wild Sea Cabbage',
  solid: false,
  transparent: true,
  hardness: 0.2,
  color: '#4ade80',
  soundType: 'organic',
  renderType: 'cross'
};

BLOCK_DEFS[CROP_BLOCK_IDS.CORN_TOP] = {
  id: CROP_BLOCK_IDS.CORN_TOP,
  name: 'Golden Maize (Top)',
  solid: false,
  transparent: true,
  hardness: 0.1,
  color: '#facc15',
  soundType: 'organic',
  renderType: 'cross'
};

BLOCK_DEFS[CROP_BLOCK_IDS.SUGARCANE_TOP] = {
  id: CROP_BLOCK_IDS.SUGARCANE_TOP,
  name: 'Sugar Cane (Top)',
  solid: false,
  transparent: true,
  hardness: 0.1,
  color: '#4ade80',
  soundType: 'organic',
  renderType: 'cross'
};

BLOCK_DEFS[CROP_BLOCK_IDS.SUNFLOWER_TOP] = {
  id: CROP_BLOCK_IDS.SUNFLOWER_TOP,
  name: 'Tall Sunflower (Head)',
  solid: false,
  transparent: true,
  hardness: 0.1,
  color: '#fbbf24',
  soundType: 'organic',
  renderType: 'cross'
};

export function isCropBlock(block: BlockType): boolean {
  return (
    BLOCK_TO_CROP_MAP.has(block) ||
    block === CROP_BLOCK_IDS.WILD_SEA_CABBAGE ||
    block === CROP_BLOCK_IDS.CORN_TOP ||
    block === CROP_BLOCK_IDS.SUGARCANE_TOP ||
    block === CROP_BLOCK_IDS.SUNFLOWER_TOP
  );
}

export function isTrellisBlock(block: BlockType): boolean {
  return block === CROP_BLOCK_IDS.TRELLIS;
}

export function getCropInfo(block: BlockType): { crop: CropConfig; stage: 'sprout' | 'growing' | 'mature' | 'wilted' } | null {
  return BLOCK_TO_CROP_MAP.get(block) || null;
}

export function getCropBundle(cropId: string): CropBlockBundle | undefined {
  return CROP_BLOCK_BUNDLES.get(cropId);
}

export function getSproutBlock(cropId: string): BlockType | null {
  return CROP_BLOCK_BUNDLES.get(cropId)?.sprout || null;
}

export function getMatureBlock(cropId: string): BlockType | null {
  return CROP_BLOCK_BUNDLES.get(cropId)?.mature || null;
}

export function getWiltedBlockFor(block: BlockType): BlockType | null {
  const info = BLOCK_TO_CROP_MAP.get(block);
  if (!info) return null;
  return CROP_BLOCK_BUNDLES.get(info.crop.id)?.wilted || null;
}

export function getNextStageBlockFor(block: BlockType): BlockType | null {
  const info = BLOCK_TO_CROP_MAP.get(block);
  if (!info) return null;
  const bundle = CROP_BLOCK_BUNDLES.get(info.crop.id);
  if (!bundle) return null;

  switch (info.stage) {
    case 'wilted':
      // If environment recovered, can revive into sprout
      return bundle.sprout;
    case 'sprout':
      return bundle.growing;
    case 'growing':
      return bundle.mature;
    case 'mature':
      return bundle.mature;
  }
}
