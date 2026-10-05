import { BlockType } from '../../types';
import { BLOCK_DEFS, isFlintBlock, isPlantBlock, isWaterBlock } from './Blocks';
import { VoxelWorld } from './VoxelWorld';

/**
 * Checks if a given block type requires a solid supporting block to remain in place.
 */
export function isDependentBlock(type: BlockType): boolean {
  if (type === BlockType.AIR || isWaterBlock(type) || type === BlockType.LAVA) {
    return false;
  }
  if (isPlantBlock(type)) return true;
  if (isFlintBlock(type)) return true;
  if (type === BlockType.ICICLE) return true;
  return false;
}

/**
 * Checks whether an adjacent block at (x, y, z) currently has any solid
 * block with player collision adjacent to it that can support it.
 */
export function hasSolidSupport(world: VoxelWorld, x: number, y: number, z: number): boolean {
  const dirs: [number, number, number][] = [
    [-1, 0, 0],
    [1, 0, 0],
    [0, -1, 0],
    [0, 1, 0],
    [0, 0, -1],
    [0, 0, 1]
  ];

  for (const [dx, dy, dz] of dirs) {
    const neighbor = world.getBlock(x + dx, y + dy, z + dz);
    if (neighbor === BlockType.AIR || isWaterBlock(neighbor) || neighbor === BlockType.LAVA || isFlintBlock(neighbor)) {
      continue;
    }
    const def = (BLOCK_DEFS as Record<number, { solid?: boolean }>)[neighbor];
    if (def?.solid) {
      return true;
    }
  }
  return false;
}

/**
 * Breaks any dependent blocks (plants, cacti, flowers, flint, icicles)
 * that were attached to or resting on the broken block at (brokenX, brokenY, brokenZ).
 */
export function breakDependentBlocks(
  world: VoxelWorld,
  brokenX: number,
  brokenY: number,
  brokenZ: number,
  onBreak: (x: number, y: number, z: number, block: BlockType) => void
): void {
  // 1. Check blocks resting on top: (brokenX, brokenY + 1, brokenZ) and chain upwards (cacti, tall plants)
  let checkY = brokenY + 1;
  while (checkY < 256) {
    const aboveBlock = world.getBlock(brokenX, checkY, brokenZ);
    if (aboveBlock === BlockType.AIR) break;

    const isTopDependent = isPlantBlock(aboveBlock) || isFlintBlock(aboveBlock);
    if (isTopDependent) {
      // Check if it still has solid support directly beneath it
      const blockBelow = world.getBlock(brokenX, checkY - 1, brokenZ);
      const defBelow = (BLOCK_DEFS as Record<number, { solid?: boolean }>)[blockBelow];
      if (!defBelow?.solid) {
        // Break this dependent block
        world.setBlock(brokenX, checkY, brokenZ, BlockType.AIR);
        onBreak(brokenX, checkY, brokenZ, aboveBlock);
        checkY++;
        continue;
      }
    }
    break;
  }

  // 2. Check blocks attached to any of the 4 horizontal sides and underside (-X, +X, -Z, +Z, -Y)
  const neighborOffsets: [number, number, number][] = [
    [-1, 0, 0],
    [1, 0, 0],
    [0, 0, -1],
    [0, 0, 1],
    [0, -1, 0]
  ];

  for (const [dx, dy, dz] of neighborOffsets) {
    const nx = brokenX + dx;
    const ny = brokenY + dy;
    const nz = brokenZ + dz;
    const neighborBlock = world.getBlock(nx, ny, nz);

    if (neighborBlock === BlockType.AIR) continue;

    // A. Flint clinging to the side or underside of this block
    if (isFlintBlock(neighborBlock)) {
      if (!hasSolidSupport(world, nx, ny, nz)) {
        world.setBlock(nx, ny, nz, BlockType.AIR);
        onBreak(nx, ny, nz, neighborBlock);
      }
    }

    // B. Icicle hanging from underside of broken block
    if (neighborBlock === BlockType.ICICLE && dy === -1) {
      const blockAbove = world.getBlock(nx, ny + 1, nz);
      const defAbove = (BLOCK_DEFS as Record<number, { solid?: boolean }>)[blockAbove];
      if (!defAbove?.solid) {
        world.setBlock(nx, ny, nz, BlockType.AIR);
        onBreak(nx, ny, nz, neighborBlock);
      }
    }

    // C. Vines clinging to broken block face
    if (neighborBlock === BlockType.VINE) {
      if (!hasSolidSupport(world, nx, ny, nz)) {
        world.setBlock(nx, ny, nz, BlockType.AIR);
        onBreak(nx, ny, nz, neighborBlock);
      }
    }
  }
}
