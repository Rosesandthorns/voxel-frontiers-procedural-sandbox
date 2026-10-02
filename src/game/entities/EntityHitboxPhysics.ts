import * as THREE from 'three';
import { BlockType, EntitySpecies, EntityState } from '../../types';
import { BLOCK_DEFS } from '../voxel/Blocks';
import { VoxelWorld } from '../voxel/VoxelWorld';

export interface EntityHitboxDef {
  /** Width across the entity's local X axis (meters) */
  width: number;
  /** Total height from feet up local Y axis (meters) */
  height: number;
  /** Length along the entity's local Z axis (meters) */
  depth: number;
  /** Vertical offset of bottom face from state.y */
  yOffset: number;
  /** Horizontal collision radius for voxel physics */
  collisionRadius: number;
  /** Height for voxel physics collision box */
  collisionHeight: number;
}

/**
 * Hitboxes for all entity species.
 * Specifically tuned to be tight and slightly inset from visual geometry
 * ("way smaller, opposite of extending their design") to prevent oversized
 * phantom hit areas.
 */
export const ENTITY_HITBOX_DEFS: Record<EntitySpecies, EntityHitboxDef> = {
  [EntitySpecies.CARDINAL]: {
    width: 0.22,
    height: 0.32,
    depth: 0.28,
    yOffset: 0.04,
    collisionRadius: 0.12,
    collisionHeight: 0.34
  },
  [EntitySpecies.SALMON]: {
    width: 0.20,
    height: 0.24,
    depth: 0.48,
    yOffset: 0.02,
    collisionRadius: 0.12,
    collisionHeight: 0.26
  },
  [EntitySpecies.REDWOOD_FOX]: {
    width: 0.34,
    height: 0.48,
    depth: 0.55,
    yOffset: 0.04,
    collisionRadius: 0.18,
    collisionHeight: 0.52
  },
  [EntitySpecies.GLIMMER_FOX]: {
    width: 0.34,
    height: 0.48,
    depth: 0.55,
    yOffset: 0.04,
    collisionRadius: 0.18,
    collisionHeight: 0.52
  },
  [EntitySpecies.PUFF_SPORE]: {
    width: 0.36,
    height: 0.40,
    depth: 0.36,
    yOffset: 0.02,
    collisionRadius: 0.18,
    collisionHeight: 0.42
  },
  [EntitySpecies.PEBBLE_GOLEM]: {
    width: 0.50,
    height: 0.90,
    depth: 0.42,
    yOffset: 0.02,
    collisionRadius: 0.25,
    collisionHeight: 0.92
  },
  [EntitySpecies.SOLAR_SPRITE]: {
    width: 0.22,
    height: 0.28,
    depth: 0.22,
    yOffset: 0.04,
    collisionRadius: 0.12,
    collisionHeight: 0.30
  },
  [EntitySpecies.DUNE_CRAB]: {
    width: 0.40,
    height: 0.26,
    depth: 0.35,
    yOffset: 0.02,
    collisionRadius: 0.20,
    collisionHeight: 0.28
  },
  [EntitySpecies.VOID_STALKER]: {
    width: 0.35,
    height: 1.00,
    depth: 0.35,
    yOffset: 0.05,
    collisionRadius: 0.18,
    collisionHeight: 1.05
  },
  [EntitySpecies.MAGMA_SALAMANDER]: {
    width: 0.35,
    height: 0.30,
    depth: 0.55,
    yOffset: 0.02,
    collisionRadius: 0.18,
    collisionHeight: 0.34
  },
  [EntitySpecies.SKY_RAY]: {
    width: 1.00,
    height: 0.25,
    depth: 1.10,
    yOffset: 0.02,
    collisionRadius: 0.35,
    collisionHeight: 0.30
  },
  [EntitySpecies.SPORE_SHROOMLING]: {
    width: 0.24,
    height: 0.38,
    depth: 0.24,
    yOffset: 0.02,
    collisionRadius: 0.12,
    collisionHeight: 0.40
  },
  [EntitySpecies.ANCIENT_SENTRY]: {
    width: 0.40,
    height: 0.80,
    depth: 0.40,
    yOffset: 0.05,
    collisionRadius: 0.22,
    collisionHeight: 0.85
  },
  [EntitySpecies.MIMIC_CHEST]: {
    width: 0.50,
    height: 0.50,
    depth: 0.50,
    yOffset: 0.02,
    collisionRadius: 0.25,
    collisionHeight: 0.52
  },
  [EntitySpecies.CRYSTAL_BASILISK]: {
    width: 0.35,
    height: 0.35,
    depth: 0.65,
    yOffset: 0.02,
    collisionRadius: 0.20,
    collisionHeight: 0.38
  }
};

const DEFAULT_HITBOX_DEF: EntityHitboxDef = {
  width: 0.30,
  height: 0.45,
  depth: 0.30,
  yOffset: 0.02,
  collisionRadius: 0.16,
  collisionHeight: 0.45
};

export function getEntityHitboxDef(species: EntitySpecies): EntityHitboxDef {
  return ENTITY_HITBOX_DEFS[species] ?? DEFAULT_HITBOX_DEF;
}

export interface EntityHitResult {
  entityId: string;
  species: EntitySpecies;
  distance: number;
  point: THREE.Vector3;
}

/**
 * Checks if a ray intersects an axis-aligned bounding box using the fast slab method.
 * Returns intersection distance t >= 0 or -1 if no hit.
 */
function intersectRayAABB(
  origX: number,
  origY: number,
  origZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number
): number {
  const invDx = dirX !== 0 ? 1.0 / dirX : 1e9;
  const invDy = dirY !== 0 ? 1.0 / dirY : 1e9;
  const invDz = dirZ !== 0 ? 1.0 / dirZ : 1e9;

  let t1 = (minX - origX) * invDx;
  let t2 = (maxX - origX) * invDx;
  let t3 = (minY - origY) * invDy;
  let t4 = (maxY - origY) * invDy;
  let t5 = (minZ - origZ) * invDz;
  let t6 = (maxZ - origZ) * invDz;

  const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
  const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

  if (tmax < 0 || tmin > tmax) {
    return -1;
  }

  return tmin >= 0 ? tmin : tmax;
}

/**
 * Performs an exact raycast against all entities using their tight oriented bounding boxes.
 * Excludes entities that are occluded by solid blocks if a block distance is provided.
 */
export function raycastEntityHit(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  entities: Iterable<{ state: EntityState }>,
  maxDistance: number = 4.5,
  blockDistance: number = Infinity
): EntityHitResult | null {
  let closestHit: EntityHitResult | null = null;
  let closestDist = Math.min(maxDistance, blockDistance);

  for (const { state } of entities) {
    const def = getEntityHitboxDef(state.species);

    // Coarse spherical distance cull
    const dx = state.x - rayOrigin.x;
    const dy = (state.y + def.yOffset + def.height * 0.5) - rayOrigin.y;
    const dz = state.z - rayOrigin.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const maxRadius = Math.max(def.width, def.height, def.depth) * 0.8;
    const maxRange = closestDist + maxRadius;

    if (distSq > maxRange * maxRange) {
      continue;
    }

    // Transform ray into entity's local space (translated by entity pos, rotated by -rotationY)
    const relX = rayOrigin.x - state.x;
    const relY = rayOrigin.y - state.y;
    const relZ = rayOrigin.z - state.z;

    const cosA = Math.cos(-state.rotationY);
    const sinA = Math.sin(-state.rotationY);

    const localOrigX = relX * cosA - relZ * sinA;
    const localOrigY = relY;
    const localOrigZ = relX * sinA + relZ * cosA;

    const localDirX = rayDir.x * cosA - rayDir.z * sinA;
    const localDirY = rayDir.y;
    const localDirZ = rayDir.x * sinA + rayDir.z * cosA;

    // Entity local bounding box (tight and inset)
    const halfW = def.width * 0.5;
    const halfD = def.depth * 0.5;
    const minY = def.yOffset;
    const maxY = def.yOffset + def.height;

    const hitT = intersectRayAABB(
      localOrigX,
      localOrigY,
      localOrigZ,
      localDirX,
      localDirY,
      localDirZ,
      -halfW,
      minY,
      -halfD,
      halfW,
      maxY,
      halfD
    );

    if (hitT >= 0 && hitT < closestDist) {
      closestDist = hitT;
      const hitPoint = rayOrigin.clone().addScaledVector(rayDir, hitT);
      closestHit = {
        entityId: state.id,
        species: state.species,
        distance: hitT,
        point: hitPoint
      };
    }
  }

  return closestHit;
}

/**
 * Checks if an AABB volume overlaps any solid blocks in the voxel world.
 */
export function isEntityColliding(
  px: number,
  py: number,
  pz: number,
  radius: number,
  height: number,
  world: VoxelWorld
): boolean {
  const margin = 0.02;
  const minX = Math.floor(px - radius + margin);
  const maxX = Math.floor(px + radius - margin);
  const minY = Math.floor(py + margin);
  const maxY = Math.floor(py + height - margin);
  const minZ = Math.floor(pz - radius + margin);
  const maxZ = Math.floor(pz + radius - margin);

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

export interface EntityMoveResult {
  blockedX: boolean;
  blockedZ: boolean;
  isGrounded: boolean;
}

/**
 * Resolves voxel collisions for entities using separate X, Z, and Y axis passes,
 * step-up mechanics for 1-block steps, and an anti-stuck push-out routine to
 * prevent mobs from ever getting stuck inside boxes or solid voxel walls.
 */
export function moveEntityWithVoxelCollision(
  state: EntityState,
  delta: number,
  isFlying: boolean,
  world: VoxelWorld
): EntityMoveResult {
  const def = getEntityHitboxDef(state.species);
  const radius = def.collisionRadius;
  const height = def.collisionHeight;

  let blockedX = false;
  let blockedZ = false;
  let isGrounded = false;

  // 1. Anti-Stuck Check: If already inside a solid block (e.g. placed block or trapped in box corner)
  if (isEntityColliding(state.x, state.y, state.z, radius, height, world)) {
    // Try popping upward if headroom is available
    if (!isEntityColliding(state.x, Math.floor(state.y) + 1.01, state.z, radius, height, world)) {
      state.y = Math.floor(state.y) + 1.01;
      state.vy = 0;
    } else {
      // Nudge out toward open air in cardinal directions
      const nudges = [
        [0.15, 0],
        [-0.15, 0],
        [0, 0.15],
        [0, -0.15]
      ];
      for (const [nx, nz] of nudges) {
        if (!isEntityColliding(state.x + nx, state.y, state.z + nz, radius, height, world)) {
          state.x += nx;
          state.z += nz;
          break;
        }
      }
    }
  }

  // 2. Horizontal X movement
  const dx = state.vx * delta;
  if (dx !== 0) {
    const targetX = state.x + dx;
    if (isEntityColliding(targetX, state.y, state.z, radius, height, world)) {
      // Check 1-block step up
      if (!isFlying && !isEntityColliding(targetX, state.y + 1.05, state.z, radius, height, world)) {
        state.y += 1.05;
        state.x = targetX;
      } else {
        // Blocked by wall: do NOT penetrate, zero out X velocity
        state.vx = 0;
        blockedX = true;
      }
    } else {
      state.x = targetX;
    }
  }

  // 3. Horizontal Z movement
  const dz = state.vz * delta;
  if (dz !== 0) {
    const targetZ = state.z + dz;
    if (isEntityColliding(state.x, state.y, targetZ, radius, height, world)) {
      // Check 1-block step up
      if (!isFlying && !isEntityColliding(state.x, state.y + 1.05, targetZ, radius, height, world)) {
        state.y += 1.05;
        state.z = targetZ;
      } else {
        // Blocked by wall: do NOT penetrate, zero out Z velocity
        state.vz = 0;
        blockedZ = true;
      }
    } else {
      state.z = targetZ;
    }
  }

  // 4. Vertical Y movement
  const dy = state.vy * delta;
  if (!isFlying) {
    if (dy < 0) {
      // Falling down
      const targetY = state.y + dy;
      if (isEntityColliding(state.x, targetY, state.z, radius, height, world)) {
        state.y = Math.ceil(targetY);
        state.vy = 0;
        isGrounded = true;
      } else {
        state.y = targetY;
        isGrounded = false;
      }
    } else if (dy > 0) {
      // Jumping up
      const targetY = state.y + dy;
      if (isEntityColliding(state.x, targetY, state.z, radius, height, world)) {
        state.vy = 0;
      } else {
        state.y = targetY;
      }
      isGrounded = false;
    } else {
      // vy is 0: verify if ground remains under feet
      if (isEntityColliding(state.x, state.y - 0.05, state.z, radius, height, world)) {
        isGrounded = true;
      }
    }
  } else {
    // Flying entities (Cardinal, Sky Ray, etc.)
    const targetY = state.y + dy;
    if (isEntityColliding(state.x, targetY, state.z, radius, height, world)) {
      state.vy = -state.vy * 0.5;
    } else {
      state.y = targetY;
    }
  }

  return { blockedX, blockedZ, isGrounded };
}
