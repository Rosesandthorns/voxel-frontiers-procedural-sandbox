import { BlockType } from '../../types';
import { BLOCK_DEFS } from '../voxel/Blocks';
import { CHUNK_H, VoxelWorld } from '../voxel/VoxelWorld';

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
}

export class SpawnSystem {
  public static findSafeSpawn(world: VoxelWorld): SpawnPoint {
    const spawnX = 8.5;
    const spawnZ = 8.5;

    // Calculate natural terrain height at spawn in <0.01ms
    const subBiome = world.generator.getSubBiomeAt(spawnX, spawnZ);
    const groundY = world.generator.getHeightAt(spawnX, spawnZ, subBiome);
    // Ensure immediate spawn chunk (0, 0) exists
    const chunk = world.generateChunkSync(0, 0);

    // Find actual natural surface height at spawn coordinates
    let naturalFloorY = 0;
    if (chunk) {
      for (let y = CHUNK_H - 1; y >= 1; y--) {
        const b = chunk.getBlock(8, y, 8);
        if (b !== BlockType.AIR && b !== BlockType.WATER) {
          const def = BLOCK_DEFS[b];
          if (def && def.solid) {
            naturalFloorY = y;
            break;
          }
        }
      }
    }

    // Fallback only if no solid block exists at column
    if (naturalFloorY === 0) {
      naturalFloorY = Math.max(1, Math.floor(groundY));
      const fallbackBlock = subBiome.surfaceBlock ?? BlockType.DIRT;
      world.modifiedBlocks.set(world.getBlockCoordKey(8, naturalFloorY, 8), fallbackBlock);
      if (chunk) {
        chunk.setBlock(8, naturalFloorY, 8, fallbackBlock);
      }
    }

    const spawnY = naturalFloorY + 1.0;

    // Carve 3x4x3 open air space above floor so player is never trapped inside blocks
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        for (let oy = 0; oy <= 3; oy++) {
          const bx = Math.floor(spawnX + ox);
          const by = Math.floor(spawnY + oy);
          const bz = Math.floor(spawnZ + oz);
          world.modifiedBlocks.set(world.getBlockCoordKey(bx, by, bz), BlockType.AIR);
          if (chunk) {
            chunk.setBlock(bx, by, bz, BlockType.AIR);
          }
        }
      }
    }

    return { x: spawnX, y: spawnY, z: spawnZ };
  }
}
