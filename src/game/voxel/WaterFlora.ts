import { BlockType } from '../../types';
import { isPlantBlock, isUnderwaterPlant, isWaterBlock, isWaterSource, getWaterLevel } from './Blocks';
import { SEA_LEVEL } from './ChunkConstants';

/**
 * WaterFlora module
 * Manages aquatic vegetation and waterlogging mechanics to guarantee
 * water continuity and prevent water texture disappearance at water surfaces.
 */

/**
 * Determines whether a given block at height `y` is an aquatic or waterlogged plant.
 */
export function isWaterloggedPlant(block: BlockType, y: number): boolean {
  if (block === BlockType.AIR || isWaterBlock(block)) {
    return false;
  }

  // 1. Explicit underwater plants always exist in water bodies
  if (isUnderwaterPlant(block)) {
    return true;
  }

  // 2. Water reeds spawning or placed in water at or below sea level
  if (block === BlockType.WATER_REED && y <= SEA_LEVEL) {
    return true;
  }

  // 3. Marshroot or other water-loving flora in water basins
  if (block === BlockType.MARSHROOT && y <= SEA_LEVEL) {
    return true;
  }

  return false;
}

/**
 * Checks whether a block acts as a water medium (pure liquid water, flowing water, or waterlogged plant).
 */
export function isWaterOrWaterlogged(block: BlockType, y: number): boolean {
  if (isWaterBlock(block)) {
    return true;
  }
  return isWaterloggedPlant(block, y);
}

/**
 * Checks whether a block acts as a water source (either stationary water or a waterlogged plant).
 */
export function isWaterSourceMedium(block: BlockType, y: number): boolean {
  return isWaterSource(block) || isWaterloggedPlant(block, y);
}

/**
 * Returns the effective fluid level (1..8) of a block.
 * Waterlogged plants provide full level 8 water source output.
 */
export function getFluidLevel(block: BlockType, y: number): number {
  if (isWaterloggedPlant(block, y)) {
    return 8;
  }
  return getWaterLevel(block);
}

/**
 * Determines whether a water face should be culled against a neighboring block.
 */
export function isWaterFaceCulled(
  neighborBlock: BlockType,
  ny: number,
  neighborY: number,
  neighborIsSolid: boolean,
  currentBlock: BlockType = BlockType.WATER
): boolean {
  // Top face: culled only if the block directly above is also water
  if (ny === 1) {
    return isWaterOrWaterlogged(neighborBlock, neighborY);
  }

  // Bottom face: culled if the block below is solid or water
  if (ny === -1) {
    return neighborIsSolid || isWaterOrWaterlogged(neighborBlock, neighborY);
  }

  // Side faces (ny === 0):
  if (neighborIsSolid) {
    return true;
  }
  if (neighborBlock === BlockType.LAVA) {
    return true;
  }
  if (isWaterOrWaterlogged(neighborBlock, neighborY)) {
    return true;
  }

  // Exposed to air or non-solid plant: render the side face
  return false;
}

/**
 * Returns the replacement block when a voxel is mined.
 * If the mined block was waterlogged, it leaves pure water behind.
 */
export function getMinedBlockReplacement(block: BlockType, y: number): BlockType {
  if (isWaterloggedPlant(block, y)) {
    return BlockType.WATER;
  }
  if (y <= SEA_LEVEL && block === BlockType.BEACH_GRAVEL) {
    return BlockType.WATER;
  }
  return BlockType.AIR;
}
