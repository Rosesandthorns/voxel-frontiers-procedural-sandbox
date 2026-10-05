import * as THREE from 'three';
import { BlockType } from '../../types';
import { BLOCK_DEFS, isWaterBlock, isTopsnow, getTopsnowHeight } from '../voxel/Blocks';
import { CHUNK_H } from '../voxel/ChunkConstants';
import { VoxelWorld } from '../voxel/VoxelWorld';

export class PlayerPhysics {
  public static readonly WIDTH = 0.6;
  public static readonly HEIGHT = 1.8;
  public static readonly EYE_HEIGHT = 1.62;

  public static checkCollision(
    px: number,
    py: number,
    pz: number,
    hw: number,
    h: number,
    world: VoxelWorld
  ): boolean {
    const minX = Math.floor(px - hw);
    const maxX = Math.floor(px + hw);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + h);
    const minZ = Math.floor(pz - hw);
    const maxZ = Math.floor(pz + hw);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = world.getBlock(x, y, z);
          if (block !== BlockType.AIR && !isWaterBlock(block) && block !== BlockType.LAVA) {
            const def = BLOCK_DEFS[block];
            if (def && def.solid) {
              if (isTopsnow(block)) {
                const snowH = getTopsnowHeight(block);
                // Allow standing flush on top of topsnow without detecting collision
                if (py < y + snowH - 0.01 && py + h > y) {
                  return true;
                }
              } else {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  public static moveWithCollision(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    delta: number,
    isGrounded: boolean,
    isFlying: boolean,
    world: VoxelWorld
  ): { isGrounded: boolean } {
    const hw = PlayerPhysics.WIDTH / 2;
    const h = PlayerPhysics.HEIGHT;

    const dx = vel.x * delta;
    const dy = vel.y * delta;
    const dz = vel.z * delta;

    if (isFlying) {
      pos.x += dx;
      pos.y += dy;
      pos.z += dz;
      return { isGrounded: false };
    }

    const startY = pos.y;
    let steppedY = startY;

    // Helper to calculate exact step-up required for voxel blocks or partial topsnow slabs (up to 1.05m)
    const findStepUpHeight = (targetX: number, targetZ: number, currentY: number): number | null => {
      let maxSolidTop = -Infinity;
      const minX = Math.floor(targetX - hw + 0.05);
      const maxX = Math.floor(targetX + hw - 0.05);
      const minZ = Math.floor(targetZ - hw + 0.05);
      const maxZ = Math.floor(targetZ + hw - 0.05);
      const testMinY = Math.floor(currentY - 0.1);
      const testMaxY = Math.floor(currentY + 1.1);

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let y = testMinY; y <= testMaxY; y++) {
            const block = world.getBlock(x, y, z);
            if (block !== BlockType.AIR && !isWaterBlock(block) && block !== BlockType.LAVA) {
              const def = BLOCK_DEFS[block];
              if (def && def.solid) {
                const blockTop = y + (isTopsnow(block) ? getTopsnowHeight(block) : 1.0);
                if (blockTop > currentY && blockTop <= currentY + 1.05) {
                  maxSolidTop = Math.max(maxSolidTop, blockTop);
                }
              }
            }
          }
        }
      }
      return maxSolidTop !== -Infinity ? maxSolidTop : null;
    };

    // Horizontal X movement
    const newX = pos.x + dx;
    if (this.checkCollision(newX, steppedY, pos.z, hw, h, world)) {
      if (isGrounded) {
        const stepTargetY = findStepUpHeight(newX, pos.z, startY);
        if (stepTargetY !== null && !this.checkCollision(newX, stepTargetY, pos.z, hw, h, world)) {
          steppedY = stepTargetY;
          pos.x = newX;
        } else {
          vel.x = 0;
        }
      } else {
        vel.x = 0;
      }
    } else {
      pos.x = newX;
    }

    // Horizontal Z movement
    const newZ = pos.z + dz;
    if (this.checkCollision(pos.x, steppedY, newZ, hw, h, world)) {
      if (isGrounded) {
        const stepTargetY = findStepUpHeight(pos.x, newZ, startY);
        if (stepTargetY !== null && !this.checkCollision(pos.x, stepTargetY, newZ, hw, h, world)) {
          steppedY = stepTargetY;
          pos.z = newZ;
        } else {
          vel.z = 0;
        }
      } else {
        vel.z = 0;
      }
    } else {
      pos.z = newZ;
    }

    pos.y = steppedY;

    // Vertical Y movement
    const newY = pos.y + dy;
    let grounded = isGrounded;

    if (dy < 0) {
      // Falling down: find the highest solid surface under the player's bounding box
      let highestSolidTop = -Infinity;
      const minX = Math.floor(pos.x - hw + 0.05);
      const maxX = Math.floor(pos.x + hw - 0.05);
      const minZ = Math.floor(pos.z - hw + 0.05);
      const maxZ = Math.floor(pos.z + hw - 0.05);
      const testMinY = Math.floor(newY - 0.1);
      const testMaxY = Math.floor(pos.y + 0.1);

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let y = testMinY; y <= testMaxY; y++) {
            const block = world.getBlock(x, y, z);
            if (block !== BlockType.AIR && !isWaterBlock(block) && block !== BlockType.LAVA) {
              const def = BLOCK_DEFS[block];
              if (def && def.solid) {
                const blockTop = y + (isTopsnow(block) ? getTopsnowHeight(block) : 1.0);
                if (blockTop <= pos.y + 0.05) {
                  highestSolidTop = Math.max(highestSolidTop, blockTop);
                }
              }
            }
          }
        }
      }

      if (highestSolidTop !== -Infinity && newY <= highestSolidTop) {
        pos.y = highestSolidTop;
        vel.y = 0;
        grounded = true;
      } else if (this.checkCollision(pos.x, newY, pos.z, hw, h, world)) {
        pos.y = Math.ceil(newY);
        vel.y = 0;
        grounded = true;
      } else {
        pos.y = newY;
        grounded = false;
      }
    } else if (dy > 0) {
      // Jumping up into ceiling
      if (this.checkCollision(pos.x, newY, pos.z, hw, h, world)) {
        pos.y = Math.floor(newY + h) - h - 0.01;
        vel.y = 0;
      } else {
        pos.y = newY;
        grounded = false;
      }
    }

    // Keep within world height limits
    if (pos.y < 1) {
      pos.y = 1;
      vel.y = 0;
      grounded = true;
    } else if (pos.y > CHUNK_H + 20) {
      pos.y = CHUNK_H + 20;
      vel.y = 0;
    }

    // Un-stuck safety: If player is trapped inside a solid block, place on top of open ground
    if (this.checkCollision(pos.x, pos.y, pos.z, hw, h, world)) {
      let safeY = Math.ceil(pos.y);
      while (safeY < CHUNK_H && this.checkCollision(pos.x, safeY, pos.z, hw, h, world)) {
        safeY++;
      }
      pos.y = safeY;
      vel.y = 0;
      grounded = true;
    }

    return { isGrounded: grounded };
  }
}
