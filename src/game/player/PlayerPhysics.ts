import * as THREE from 'three';
import { BlockType } from '../../types';
import { BLOCK_DEFS } from '../voxel/Blocks';
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
          if (block !== BlockType.AIR && block !== BlockType.WATER && block !== BlockType.LAVA) {
            const def = BLOCK_DEFS[block];
            if (def && def.solid) {
              return true;
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

    // Horizontal X movement
    const newX = pos.x + dx;
    if (this.checkCollision(newX, pos.y, pos.z, hw, h, world)) {
      // Step up for 1-block voxel stairs
      if (isGrounded && !this.checkCollision(newX, pos.y + 1.05, pos.z, hw, h, world)) {
        pos.y += 1.05;
        pos.x = newX;
      } else {
        vel.x = 0;
      }
    } else {
      pos.x = newX;
    }

    // Horizontal Z movement
    const newZ = pos.z + dz;
    if (this.checkCollision(pos.x, pos.y, newZ, hw, h, world)) {
      if (isGrounded && !this.checkCollision(pos.x, pos.y + 1.05, newZ, hw, h, world)) {
        pos.y += 1.05;
        pos.z = newZ;
      } else {
        vel.z = 0;
      }
    } else {
      pos.z = newZ;
    }

    // Vertical Y movement
    const newY = pos.y + dy;
    let grounded = isGrounded;

    if (dy < 0) {
      // Falling down: find the highest solid block top that the player would intersect
      let highestSolidTop = -Infinity;
      const minX = Math.floor(pos.x - hw + 0.05);
      const maxX = Math.floor(pos.x + hw - 0.05);
      const minZ = Math.floor(pos.z - hw + 0.05);
      const maxZ = Math.floor(pos.z + hw - 0.05);
      const testMinY = Math.floor(newY);
      const testMaxY = Math.floor(pos.y + 0.1);

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let y = testMinY; y <= testMaxY; y++) {
            const block = world.getBlock(x, y, z);
            if (block !== BlockType.AIR && block !== BlockType.WATER && block !== BlockType.LAVA) {
              const def = BLOCK_DEFS[block];
              if (def && def.solid) {
                highestSolidTop = Math.max(highestSolidTop, y + 1.0);
              }
            }
          }
        }
      }

      if (highestSolidTop !== -Infinity && highestSolidTop <= pos.y + 0.25) {
        pos.y = highestSolidTop;
        vel.y = 0;
        grounded = true;
      } else if (this.checkCollision(pos.x, newY, pos.z, hw, h, world)) {
        const safeFloor = Math.ceil(newY);
        pos.y = Math.max(safeFloor, Math.floor(pos.y));
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
