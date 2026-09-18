import { BlockType } from '../../types';
import { isPlantBlock, isUnderwaterPlant } from './Blocks';
import { SEA_LEVEL } from './ChunkConstants';

/**
 * WaterFlora module
 * Manages aquatic vegetation and waterlogging mechanics to guarantee
 * water continuity and prevent water texture disappearance at water surfaces.
 */

/**
 * Determines whether a given block at height `y` is an aquatic or waterlogged plant.
 *
 * An aquatic plant is submerged or sits in the water column (e.g., Seagrass,
 * Small Kelp, Shoreline Water Algae, Tall Kelp, Blood Kelp, Crimson Tendril,
 * or Water Reeds submerged at or below SEA_LEVEL).
 */
export function isWaterloggedPlant(block: BlockType, y: number): boolean {
  if (block === BlockType.AIR || block === BlockType.WATER) {
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
 * Checks whether a block acts as a water medium (pure liquid water or a waterlogged plant).
 */
export function isWaterOrWaterlogged(block: BlockType, y: number): boolean {
  if (block === BlockType.WATER) {
    return true;
  }
  return isWaterloggedPlant(block, y);
}

/**
 * Determines whether a water face should be culled against a neighboring block.
 *
 * Rules:
 * - Mutual internal water faces between pure water and/or waterlogged plants are culled.
 * - Water contacting lava is culled.
 * - Water contacting solid blocks (terrain, seabed, walls) is culled.
 * - Bottom faces (ny === -1) are only rendered if facing open air (e.g. waterfall).
 * - Horizontal faces (ny === 0) are culled against non-air blocks.
 * - Top faces (ny === 1) facing air or non-solid air flora are RENDERED to maintain
 *   the continuous water surface texture.
 */
export function isWaterFaceCulled(
  neighborBlock: BlockType,
  ny: number,
  neighborY: number,
  neighborIsSolid: boolean
): boolean {
  // 1. Neighbor also contains water (pure water or waterlogged plant)
  if (isWaterOrWaterlogged(neighborBlock, neighborY)) {
    return true;
  }

  // 2. Contacting lava
  if (neighborBlock === BlockType.LAVA) {
    return true;
  }

  // 3. Solid blocks (ground, rocks, seabed, cliffs)
  if (neighborIsSolid) {
    return true;
  }

  // 4. Bottom face: only visible when facing air
  if (ny === -1 && neighborBlock !== BlockType.AIR) {
    return true;
  }

  // 5. Side face: culled if neighbor is non-air
  if (ny === 0 && neighborBlock !== BlockType.AIR) {
    return true;
  }

  // 6. Top face (ny === 1): facing AIR, lilypads, or open air flora.
  // Must render the water surface texture!
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
  return BlockType.AIR;
}
