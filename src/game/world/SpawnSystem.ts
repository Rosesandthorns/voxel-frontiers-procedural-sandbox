import { BlockType } from '../../types';
import { BLOCK_DEFS, isWaterBlock } from '../voxel/Blocks';
import { CHUNK_H, VoxelWorld } from '../voxel/VoxelWorld';

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
}

export class SpawnSystem {
  public static findSafeSpawn(world: VoxelWorld, targetX: number = 8.5, targetZ: number = 8.5): SpawnPoint {
    const spawnX = targetX;
    const spawnZ = targetZ;

    const cx = Math.floor(spawnX / 16);
    const cz = Math.floor(spawnZ / 16);

    // Ensure immediate spawn chunk exists
    const chunk = world.generateChunkSync(cx, cz);

    // Calculate natural mathematical terrain height at spawn
    const subBiome = world.generator.getSubBiomeAt(spawnX, spawnZ);
    const groundY = world.generator.getHeightAt(spawnX, spawnZ, subBiome);

    const lx = ((Math.floor(spawnX) % 16) + 16) % 16;
    const lz = ((Math.floor(spawnZ) % 16) + 16) % 16;

    // Find actual natural surface height at spawn coordinates (scanning down from sky)
    let naturalFloorY = 0;
    if (chunk) {
      for (let y = CHUNK_H - 2; y >= Math.max(20, Math.floor(groundY) - 15); y--) {
        const b = chunk.getBlock(lx, y, lz);
        if (b !== BlockType.AIR && !isWaterBlock(b)) {
          const def = BLOCK_DEFS[b];
          if (def && def.solid) {
            const bAbove1 = chunk.getBlock(lx, y + 1, lz);
            const bAbove2 = chunk.getBlock(lx, y + 2, lz);
            const def1 = BLOCK_DEFS[bAbove1];
            const def2 = BLOCK_DEFS[bAbove2];
            if ((!def1 || !def1.solid) && (!def2 || !def2.solid)) {
              naturalFloorY = y;
              break;
            }
          }
        }
      }
    }

    // Fallback: use mathematical terrain height if scan didn't find open floor
    if (naturalFloorY < 40) {
      naturalFloorY = Math.max(60, Math.floor(groundY));
      const fallbackBlock = subBiome.surfaceBlock ?? BlockType.GRASS;
      world.modifiedBlocks.set(world.getBlockCoordKey(Math.floor(spawnX), naturalFloorY, Math.floor(spawnZ)), fallbackBlock);
      if (chunk) {
        chunk.setBlock(lx, naturalFloorY, lz, fallbackBlock);
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
          const c = world.chunks.get(world.getChunkKey(Math.floor(bx / 16), Math.floor(bz / 16)));
          if (c) {
            c.setBlock(((bx % 16) + 16) % 16, by, ((bz % 16) + 16) % 16, BlockType.AIR);
          }
        }
      }
    }

    return { x: spawnX, y: spawnY, z: spawnZ };
  }
}
