import * as THREE from 'three';
import { EntitySpecies, EntityState } from '../../types';
import { soundManager } from '../audio/SoundFX';
import { isRedwoodBiome } from '../voxel/SubBiomeRegistry';
import { VoxelWorld } from '../voxel/VoxelWorld';
import { EntityHitboxDef, moveEntityWithVoxelCollision } from './EntityHitboxPhysics';
import { EntityMeshGroup, EntityModelFactory } from './EntityModels';

export interface FloatingParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: number;
  size: number;
  life: number;
  maxLife: number;
}

export class EntityManager {
  public entities: Map<string, { state: EntityState; mesh: EntityMeshGroup }> = new Map();
  public scene: THREE.Scene;
  public world: VoxelWorld;
  public particles: FloatingParticle[] = [];
  public mountedEntityId: string | null = null;
  public onNotification?: (title: string, message: string) => void;
  public onEntityTamed?: (species: string) => void;

  // Track spawned chunks to limit wildlife density
  private spawnedChunks: Set<string> = new Set();
  private spawnedRiverChunks: Set<string> = new Set();
  private wildlifeSpawnTimer: number = 0;

  // Visual laser beam for Ancient Sentry
  private laserLines: THREE.Line[] = [];

  constructor(scene: THREE.Scene, world: VoxelWorld) {
    this.scene = scene;
    this.world = world;

    // Connect chunk spawn hook
    this.world.entitySpawnCallbacks.push((speciesName, x, y, z) => {
      this.spawnEntity(speciesName as EntitySpecies, x, y, z);
    });
  }

  public spawnEntity(species: EntitySpecies, x: number, y: number, z: number): string {
    const id = `ent_${Math.random().toString(36).substr(2, 9)}`;
    const mesh = EntityModelFactory.createEntityModel(species);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const state: EntityState = {
      id,
      species,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      rotationY: Math.random() * Math.PI * 2,
      pitch: 0,
      health: species === EntitySpecies.PEBBLE_GOLEM ? 30 : species === EntitySpecies.SKY_RAY ? 40 : 15,
      maxHealth: species === EntitySpecies.PEBBLE_GOLEM ? 30 : species === EntitySpecies.SKY_RAY ? 40 : 15,
      isHostile: species === EntitySpecies.VOID_STALKER || species === EntitySpecies.MIMIC_CHEST,
      isTamed: false,
      isRidden: false,
      isBurrowed: species === EntitySpecies.DUNE_CRAB,
      isCamouflaged: species === EntitySpecies.PEBBLE_GOLEM || species === EntitySpecies.MIMIC_CHEST,
      customTimer: 0,
      targetPos: null,
      uniqueData: {},
      lastInteractionTime: 0
    };

    this.entities.set(id, { state, mesh });
    return id;
  }

  public removeEntity(id: string) {
    const ent = this.entities.get(id);
    if (ent) {
      this.scene.remove(ent.mesh);
      this.entities.delete(id);
      if (this.mountedEntityId === id) {
        this.mountedEntityId = null;
      }
    }
  }

  public addParticle(x: number, y: number, z: number, color: number, count: number = 5, spread: number = 0.5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          Math.random() * spread * 0.8 + 0.1,
          (Math.random() - 0.5) * spread
        ),
        color,
        size: 0.12 + Math.random() * 0.1,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6
      });
    }
  }

  public interactWithEntity(
    id: string,
    playerItem: { name: string; type: string } | null,
    playerPos: THREE.Vector3
  ): { success: boolean; message?: string; healed?: boolean; mounted?: boolean } {
    const ent = this.entities.get(id);
    if (!ent) return { success: false };

    const { state, mesh } = ent;
    const now = Date.now();
    if (now - state.lastInteractionTime < 400) return { success: false };
    state.lastInteractionTime = now;

    // 0a. Redwood Fox (Befriend & Pet)
    if (state.species === EntitySpecies.REDWOOD_FOX) {
      soundManager.playEntityInteraction('fox');
      this.addParticle(state.x, state.y + 0.5, state.z, 0xf97316, 12, 0.7);
      state.isTamed = true;
      this.onEntityTamed?.(state.species);
      return { success: true, message: 'Redwood Fox happily yipped and wagged its fluffy tail!' };
    }

    // 0b. Cardinal Bird (Song & Flutter)
    if (state.species === EntitySpecies.CARDINAL) {
      soundManager.playEntityInteraction('cardinal');
      this.addParticle(state.x, state.y + 0.4, state.z, 0xef4444, 10, 0.5);
      state.vy = 3.5;
      state.uniqueData.isFlying = true;
      state.uniqueData.flightTimer = 3.0;
      return { success: true, message: 'Cardinal whistled a melodious forest song and fluttered upward!' };
    }

    // 1. Glimmer Fox Scenting
    if (state.species === EntitySpecies.GLIMMER_FOX) {
      soundManager.playEntityInteraction('fox');
      this.addParticle(state.x, state.y + 0.5, state.z, 0x00e5ff, 12, 0.8);
      state.isTamed = true;
      this.onEntityTamed?.(state.species);

      // Finds treasure or digs
      const searchRadius = 15;
      let foundX = state.x + (Math.random() - 0.5) * searchRadius;
      let foundZ = state.z + (Math.random() - 0.5) * searchRadius;
      state.targetPos = { x: foundX, y: state.y, z: foundZ };
      state.uniqueData.isScenting = true;
      return { success: true, message: 'Glimmer Fox picked up the scent of buried ore!' };
    }

    // 2. Sky Ray Mount
    if (state.species === EntitySpecies.SKY_RAY) {
      if (this.mountedEntityId === id) {
        // Dismount
        this.mountedEntityId = null;
        state.isRidden = false;
        return { success: true, message: 'Dismounted Sky Ray' };
      } else {
        // Mount
        this.mountedEntityId = id;
        state.isRidden = true;
        state.isTamed = true;
        this.onEntityTamed?.(state.species);
        soundManager.playChime(440);
        return { success: true, message: 'Mounted Sky Ray! Soar the skies!', mounted: true };
      }
    }

    // 3. Pebble Golem Taming with Ore
    if (state.species === EntitySpecies.PEBBLE_GOLEM) {
      state.isCamouflaged = false;
      if (playerItem?.name.includes('Ore') || playerItem?.name.includes('Iron') || playerItem?.name.includes('Stone')) {
        state.isTamed = true;
        state.isHostile = false;
        this.addParticle(state.x, state.y + 1, state.z, 0x76ff03, 15, 0.6);
        soundManager.playEntityInteraction('growl');
        this.onEntityTamed?.(state.species);
        return { success: true, message: 'Pebble Golem fed and tamed! It now guards you.' };
      } else {
        soundManager.playEntityInteraction('growl');
        return { success: true, message: 'Pebble Golem awakened from stone sleep!' };
      }
    }

    // 4. Solar Sprite Harvest / Heal
    if (state.species === EntitySpecies.SOLAR_SPRITE) {
      soundManager.playEntityInteraction('sprite');
      this.addParticle(state.x, state.y + 0.5, state.z, 0xffeb3b, 16, 1.0);
      return { success: true, message: 'Solar Sprite shared warm solar radiance (+Health)', healed: true };
    }

    // 5. Mimic Chest Pacify / Open
    if (state.species === EntitySpecies.MIMIC_CHEST) {
      if (playerItem?.name.includes('Gold')) {
        state.isTamed = true;
        state.isHostile = false;
        soundManager.playEntityInteraction('mimic');
        this.addParticle(state.x, state.y + 0.6, state.z, 0xffd54f, 20, 1.2);
        return { success: true, message: 'Mimic Chest pacified with Gold! It spat out relic loot!' };
      } else {
        state.isCamouflaged = false;
        soundManager.playEntityInteraction('mimic');
        return { success: true, message: 'The chest sprouted teeth! It was a Mimic!' };
      }
    }

    // 6. Ancient Sentry Repair
    if (state.species === EntitySpecies.ANCIENT_SENTRY) {
      soundManager.playEntityInteraction('robot');
      if (playerItem?.name.includes('Iron') || playerItem?.name.includes('Gold')) {
        state.isTamed = true;
        state.isHostile = false;
        this.addParticle(state.x, state.y + 1, state.z, 0x00e5ff, 18, 0.9);
        return { success: true, message: 'Ancient Sentry repaired! Laser defense online.' };
      }
    }

    // Default friendly interaction
    soundManager.playEntityInteraction('growl');
    this.addParticle(state.x, state.y + 0.5, state.z, 0xffffff, 8, 0.4);
    return { success: true, message: `Interacted with ${state.species}` };
  }

  public update(delta: number, playerPos: THREE.Vector3): { playerBounced?: boolean; playerHealed?: boolean } {
    let result: { playerBounced?: boolean; playerHealed?: boolean } = {};

    // Periodic wildlife spawner check (runs every ~1.2 seconds)
    this.wildlifeSpawnTimer += delta;
    if (this.wildlifeSpawnTimer > 1.2) {
      this.wildlifeSpawnTimer = 0;
      this.updateWildlifeSpawning(playerPos);
    }

    // Loaded chunk render distance in blocks
    const renderDistChunks = this.world?.currentRenderDistance || 12;
    const maxLoadedDist = renderDistChunks * 16;
    const aiCullDist = maxLoadedDist * 0.75; // 3/4th of the loaded chunk render distance
    const aiCullDistSq = aiCullDist * aiCullDist;

    for (const [id, { state, mesh }] of this.entities.entries()) {
      // Distance to player
      const dx = playerPos.x - state.x;
      const dy = playerPos.y - state.y;
      const dz = playerPos.z - state.z;
      const distSq = dx * dx + dz * dz;

      // Cull far away untamed entities beyond loaded chunk boundaries
      if (distSq > (maxLoadedDist + 24) * (maxLoadedDist + 24) && !state.isTamed) {
        this.removeEntity(id);
        continue;
      }

      // When 3/4th of the loaded chunk render distance away or more, have no AI for them to save resources
      if (distSq >= aiCullDistSq) {
        mesh.position.set(state.x, state.y, state.z);
        mesh.rotation.y = state.rotationY;
        continue;
      }

      state.customTimer += delta;
      const distToPlayer = Math.sqrt(distSq);

      // 1. PUFF SPORE Trampoline Mechanic
      if (state.species === EntitySpecies.PUFF_SPORE) {
        if (distToPlayer < 1.1 && Math.abs(playerPos.y - (state.y + 1.2)) < 0.6) {
          // Player hopped on top of the Puff Spore!
          result.playerBounced = true;
          soundManager.playSuperBounce();
          this.addParticle(state.x, state.y + 1.0, state.z, 0x00e5ff, 20, 1.2);
          // Spore bounces too
          state.vy = 8.0;
        }
      }

      // 2. SOLAR SPRITE Healing Radius
      if (state.species === EntitySpecies.SOLAR_SPRITE) {
        if (distToPlayer < 4.0 && Math.sin(state.customTimer * 2.0) > 0.98) {
          result.playerHealed = true;
          this.addParticle(state.x, state.y + 0.6, state.z, 0x76ff03, 3, 0.4);
        }
      }

      // 3. DUNE CRAB Unburrow on approach
      if (state.species === EntitySpecies.DUNE_CRAB && state.isBurrowed) {
        if (distToPlayer < 4.5) {
          state.isBurrowed = false;
          state.vy = 4.5;
          soundManager.playStep('sand');
          this.addParticle(state.x, state.y, state.z, 0xe0c068, 15, 0.8);
        }
      }

      // 4. VOID STALKER Sun / Torch Fleeing
      if (state.species === EntitySpecies.VOID_STALKER) {
        if (this.world.getBlock(Math.floor(state.x), Math.floor(state.y + 1), Math.floor(state.z)) === 22) {
          // Near lantern! Flee away
          state.vx -= dx * 0.5 * delta;
          state.vz -= dz * 0.5 * delta;
        }
      }

      // 5. MAGMA SALAMANDER Walks on Water -> Creates Cobblestone
      if (state.species === EntitySpecies.MAGMA_SALAMANDER) {
        const belowBlock = this.world.getBlock(Math.floor(state.x), Math.floor(state.y - 0.2), Math.floor(state.z));
        if (belowBlock === 23) {
          // Water -> Solidify to Cobble
          this.world.setBlock(Math.floor(state.x), Math.floor(state.y - 0.2), Math.floor(state.z), 4);
          soundManager.playStep('stone');
          this.addParticle(state.x, state.y, state.z, 0xd84315, 6, 0.4);
        }
      }

      // 6. SKY RAY Ridden / Flight
      if (state.species === EntitySpecies.SKY_RAY) {
        if (this.mountedEntityId === id) {
          // Align with player position
          state.x = playerPos.x;
          state.y = playerPos.y - 0.7;
          state.z = playerPos.z;
        } else {
          // Gentle soaring path high in the sky
          state.vx = Math.sin(state.customTimer * 0.4) * 2.5;
          state.vz = Math.cos(state.customTimer * 0.4) * 2.5;
          state.y += Math.sin(state.customTimer * 0.8) * 0.05;
        }
      }

      // Standard AI Motion (Wander or Follow or Flee)
      if (!state.isRidden && !state.isBurrowed) {
        // Water check for aquatic creatures (BlockType.WATER = 23)
        const inWater = (state.species === EntitySpecies.SALMON) &&
          (this.world.getBlock(Math.floor(state.x), Math.floor(state.y + 0.1), Math.floor(state.z)) === 23);

        // Gravity for ground creatures / flight check
        const isFlying =
          state.species === EntitySpecies.SOLAR_SPRITE ||
          state.species === EntitySpecies.SKY_RAY ||
          state.species === EntitySpecies.ANCIENT_SENTRY ||
          state.species === EntitySpecies.PUFF_SPORE ||
          (state.species === EntitySpecies.CARDINAL && Boolean(state.uniqueData.isFlying)) ||
          inWater;

        if (!isFlying) {
          state.vy -= 18.0 * delta;
        } else if (state.species === EntitySpecies.CARDINAL) {
          // Cardinal active flight: handled in cardinal flight controller below
        } else if (state.species === EntitySpecies.SALMON) {
          // Aquatic swimming physics: maintain depth within water body
          if (state.y > 99.2) {
            // Near water surface (SEA_LEVEL = 100), dive down slightly
            state.vy = -0.6;
          } else if (this.world.getBlock(Math.floor(state.x), Math.floor(state.y - 0.25), Math.floor(state.z)) !== 23) {
            // Near bottom riverbed, rise slightly
            state.vy = 0.6;
          } else {
            // Gentle natural swimming bobbing
            state.vy += Math.sin(state.customTimer * 2.2) * 0.2 * delta;
          }
          state.vy *= 0.92;
        } else {
          // Gentle hovering
          state.vy = Math.sin(state.customTimer * 2.5) * 0.3;
        }

        // ── Custom AI logic by Species ──
        if (state.species === EntitySpecies.SALMON) {
          if (inWater) {
            // Swimming behavior cycle
            if (!state.uniqueData.swimTimer) state.uniqueData.swimTimer = 0;
            state.uniqueData.swimTimer -= delta;

            if (state.uniqueData.swimTimer <= 0) {
              state.uniqueData.swimTimer = 2.0 + Math.random() * 4.0;
              state.uniqueData.swimSpeed = 1.3 + Math.random() * 0.9;
              state.rotationY += (Math.random() - 0.5) * 1.2;
            }

            // Schooling alignment with other nearby Salmon
            for (const [otherId, otherEnt] of this.entities.entries()) {
              if (otherId !== id && otherEnt.state.species === EntitySpecies.SALMON) {
                const odx = otherEnt.state.x - state.x;
                const odz = otherEnt.state.z - state.z;
                const odistSq = odx * odx + odz * odz;
                if (odistSq < 36 && odistSq > 0.8) {
                  // Steer slightly towards neighbor's heading
                  state.rotationY += (otherEnt.state.rotationY - state.rotationY) * 0.05;
                  break;
                }
              }
            }

            // Riverbank avoidance: examine candidate position ahead
            const aheadX = state.x + Math.sin(state.rotationY) * 1.5;
            const aheadZ = state.z + Math.cos(state.rotationY) * 1.5;
            const aheadBlock = this.world.getBlock(Math.floor(aheadX), Math.floor(state.y), Math.floor(aheadZ));
            if (aheadBlock !== 23) {
              // Reached riverbank, turn away
              state.rotationY += Math.PI * (0.6 + Math.random() * 0.4);
              state.uniqueData.swimSpeed = 1.6;
            }

            const swimSpeed = (state.uniqueData.swimSpeed as number) || 1.4;
            state.vx = Math.sin(state.rotationY) * swimSpeed;
            state.vz = Math.cos(state.rotationY) * swimSpeed;
          } else {
            // Flopping on dry land!
            if (!state.uniqueData.flopTimer) state.uniqueData.flopTimer = 0;
            state.uniqueData.flopTimer -= delta;
            if (state.uniqueData.flopTimer <= 0) {
              state.uniqueData.flopTimer = 0.35 + Math.random() * 0.35;
              state.vy = 3.0 + Math.random() * 1.4;
              const flopAngle = Math.random() * Math.PI * 2;
              state.rotationY = flopAngle;
              state.vx = Math.sin(flopAngle) * 1.6;
              state.vz = Math.cos(flopAngle) * 1.6;
            }
          }
        } else if (state.species === EntitySpecies.REDWOOD_FOX) {
          // Fox behavior cycle
          if (!state.uniqueData.pauseTimer) state.uniqueData.pauseTimer = 0;
          if (state.uniqueData.pauseTimer > 0) {
            state.uniqueData.pauseTimer -= delta;
            state.vx = 0;
            state.vz = 0;
          } else {
            // Wander or steer
            if (Math.random() < 0.03 || (state.vx === 0 && state.vz === 0)) {
              state.rotationY += (Math.random() - 0.5) * 1.8;
              const trotSpeed = 2.8;

              // Biome-adherence check: examine candidate position ahead (model faces +Z, forward = +sin, +cos)
              const aheadX = state.x + Math.sin(state.rotationY) * 3.5;
              const aheadZ = state.z + Math.cos(state.rotationY) * 3.5;
              const targetSubBiome = this.world.getSubBiomeAt(aheadX, aheadZ);

              if (!isRedwoodBiome(targetSubBiome)) {
                // If headed towards biome edge, turn around into the forest interior!
                state.rotationY += Math.PI * (0.8 + Math.random() * 0.4);
              }

              // Occasional pause to sniff ground / tilt head curiously
              if (Math.random() < 0.28) {
                state.uniqueData.pauseTimer = 1.8 + Math.random() * 2.4;
              } else {
                state.vx = Math.sin(state.rotationY) * trotSpeed;
                state.vz = Math.cos(state.rotationY) * trotSpeed;
              }
            }
          }

          // Ambient fox chuff
          if (Math.random() < 0.002 && distToPlayer < 24) {
            soundManager.playEntityInteraction('fox');
          }
        } else if (state.species === EntitySpecies.CARDINAL) {
          if (!state.uniqueData.flightTimer) state.uniqueData.flightTimer = 0;
          if (!state.uniqueData.perchTimer) state.uniqueData.perchTimer = 2.0 + Math.random() * 4.0;

          if (state.uniqueData.isFlying) {
            state.uniqueData.flightTimer -= delta;
            const flySpeed = 4.2;

            // Maintain smooth altitude through tree canopy
            const curSubBiome = this.world.getSubBiomeAt(state.x, state.z);
            const gHeight = this.world.generator.getHeightAt(state.x, state.z, curSubBiome);
            const targetFlyY = gHeight + 4.5 + Math.sin(state.customTimer * 1.5) * 1.2;
            state.vy = (targetFlyY - state.y) * 2.0;

            // Biome-adherence check while flying (forward = +sin, +cos)
            const aheadX = state.x + Math.sin(state.rotationY) * 4.0;
            const aheadZ = state.z + Math.cos(state.rotationY) * 4.0;
            if (!isRedwoodBiome(this.world.getSubBiomeAt(aheadX, aheadZ))) {
              state.rotationY += Math.PI * (0.8 + Math.random() * 0.4);
            }

            state.vx = Math.sin(state.rotationY) * flySpeed;
            state.vz = Math.cos(state.rotationY) * flySpeed;

            if (state.uniqueData.flightTimer <= 0) {
              // Land and transition to perched
              state.uniqueData.isFlying = false;
              state.uniqueData.perchTimer = 5.0 + Math.random() * 7.0;
              state.vx = 0;
              state.vz = 0;
            }
          } else {
            // Perched or ground hopping
            state.uniqueData.perchTimer -= delta;

            // Startle take-off if player runs too close (< 3.5m)
            if (distToPlayer < 3.5 && Math.random() < 0.08) {
              state.uniqueData.isFlying = true;
              state.uniqueData.flightTimer = 4.0 + Math.random() * 3.5;
              state.vy = 4.8;
              state.rotationY = Math.atan2(state.x - playerPos.x, state.z - playerPos.z);
            } else if (state.uniqueData.perchTimer <= 0) {
              // Periodic choice: take flight or small hop
              if (Math.random() < 0.42) {
                state.uniqueData.isFlying = true;
                state.uniqueData.flightTimer = 3.5 + Math.random() * 4.0;
                state.vy = 4.2;
                state.rotationY += (Math.random() - 0.5) * 2.0;
              } else {
                // Energetic hop forward
                state.rotationY += (Math.random() - 0.5) * 1.6;
                const hopSpeed = 1.6;
                state.vx = Math.sin(state.rotationY) * hopSpeed;
                state.vz = Math.cos(state.rotationY) * hopSpeed;
                state.vy = 3.2; // hop impulse
                state.uniqueData.perchTimer = 1.5 + Math.random() * 3.0;
              }
            }
          }

          // Ambient cardinal whistle
          if (Math.random() < 0.003 && distToPlayer < 30) {
            soundManager.playCardinalChirp();
          }
        } else {
          // Standard Wander AI for other creatures
          if (Math.random() < 0.02) {
            state.rotationY += (Math.random() - 0.5) * 1.5;
            const speed = state.species === EntitySpecies.GLIMMER_FOX ? 3.0 : 1.2;
            state.vx = Math.sin(state.rotationY) * speed;
            state.vz = Math.cos(state.rotationY) * speed;
          }
        }

        // Boundary recovery: if a Redwood Fox or Cardinal is outside the Redwood Forest, steer back home!
        if (state.species === EntitySpecies.REDWOOD_FOX || state.species === EntitySpecies.CARDINAL) {
          const curBiome = this.world.getSubBiomeAt(state.x, state.z);
          if (!isRedwoodBiome(curBiome)) {
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
              const rx = state.x + Math.sin(a) * 18;
              const rz = state.z + Math.cos(a) * 18;
              if (isRedwoodBiome(this.world.getSubBiomeAt(rx, rz))) {
                state.rotationY = Math.atan2(rx - state.x, rz - state.z);
                const s = state.species === EntitySpecies.CARDINAL ? 3.8 : 2.8;
                state.vx = Math.sin(state.rotationY) * s;
                state.vz = Math.cos(state.rotationY) * s;
                break;
              }
            }
          }
        }

        // If tamed and following player
        if (state.isTamed && distToPlayer > 3.0 && distToPlayer < 25.0) {
          const angle = Math.atan2(dx, dz);
          state.rotationY = angle;
          state.vx = Math.sin(angle) * 3.0;
          state.vz = Math.cos(angle) * 3.0;
        }

        // Apply friction
        state.vx *= 0.88;
        state.vz *= 0.88;

        // Move with 3-axis voxel collision, 1-block step up, and anti-stuck resolution
        const moveResult = moveEntityWithVoxelCollision(state, delta, isFlying, this.world);

        // If an entity hits a wall or is enclosed in a box, steer away rather than getting trapped
        if (moveResult.blockedX || moveResult.blockedZ) {
          state.uniqueData.stuckTicks = ((state.uniqueData.stuckTicks as number) || 0) + 1;
          if (state.uniqueData.stuckTicks >= 2) {
            // Reorient toward open space
            state.rotationY += Math.PI * (0.4 + Math.random() * 0.6);
            const wanderSpeed = state.species === EntitySpecies.REDWOOD_FOX ? 2.5 : 1.5;
            state.vx = Math.sin(state.rotationY) * wanderSpeed;
            state.vz = Math.cos(state.rotationY) * wanderSpeed;
            state.uniqueData.stuckTicks = 0;
          }

          // Unwedge if stuck in tight box corners
          if (typeof state.uniqueData.cornerHopTimer === 'number') {
            state.uniqueData.cornerHopTimer += delta;
            if (state.uniqueData.cornerHopTimer > 0.8) {
              state.vy = 4.2;
              state.rotationY += Math.PI;
              state.uniqueData.cornerHopTimer = 0;
            }
          } else {
            state.uniqueData.cornerHopTimer = 0.1;
          }
        } else {
          state.uniqueData.stuckTicks = 0;
          state.uniqueData.cornerHopTimer = 0;
        }
      }

      // Sync 3D Mesh
      const inWater = (state.species === EntitySpecies.SALMON) &&
        (this.world.getBlock(Math.floor(state.x), Math.floor(state.y + 0.1), Math.floor(state.z)) === 23);

      mesh.position.set(state.x, state.y, state.z);
      mesh.rotation.y = state.rotationY;
      mesh.userData = {
        isFlying: Boolean(state.uniqueData.isFlying),
        groundY: state.y,
        inWater
      };

      // Animate limbs
      const currentSpeed = Math.sqrt(state.vx * state.vx + state.vz * state.vz);
      EntityModelFactory.animateEntity(mesh, currentSpeed, delta);
    }

    // Update Particles — swap-and-pop deletion avoids O(n) array shifts
    let i = this.particles.length;
    while (i--) {
      const p = this.particles[i];
      p.life += delta;
      p.pos.addScaledVector(p.vel, delta);
      p.vel.y -= 2.0 * delta;
      if (p.life >= p.maxLife) {
        // Swap with last element and pop — O(1) removal
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    return result;
  }

  /**
   * Spawns wildlife in authentic habitats:
   * - Redwood Fox and Cardinal in Redwood Forests
   * - Salmon in small groups through River waterways
   * Evaluates chunks around the player and places authentic wildlife groups.
   */
  private updateWildlifeSpawning(playerPos: THREE.Vector3) {
    const playerCX = Math.floor(playerPos.x / 16);
    const playerCZ = Math.floor(playerPos.z / 16);

    // Count existing wildlife & cull far away untamed entities (> 110m)
    let redwoodWildlifeCount = 0;
    let salmonWildlifeCount = 0;
    for (const [id, ent] of this.entities.entries()) {
      const isRedwood =
        ent.state.species === EntitySpecies.REDWOOD_FOX ||
        ent.state.species === EntitySpecies.CARDINAL;
      const isSalmon = ent.state.species === EntitySpecies.SALMON;

      if (isRedwood || isSalmon) {
        const dSq = (ent.state.x - playerPos.x) ** 2 + (ent.state.z - playerPos.z) ** 2;
        if (dSq > 110 * 110 && !ent.state.isTamed) {
          this.removeEntity(id);
          continue;
        }
        if (isRedwood) redwoodWildlifeCount++;
        if (isSalmon) salmonWildlifeCount++;
      }
    }

    // Scan chunks in a doughnut ring around player (distance 1 to 4 chunks: 16m to ~68m)
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const distSq = dx * dx + dz * dz;
        if (distSq < 2 || distSq > 20) continue;

        const cx = playerCX + dx;
        const cz = playerCZ + dz;
        const chunkKey = `${cx},${cz}`;

        // ── 1. RIVER SALMON SPAWNER ──
        // "In Rivers, have Salmon spawn in small groups through the water"
        if (salmonWildlifeCount < 18 && !this.spawnedRiverChunks.has(chunkKey)) {
          this.spawnedRiverChunks.add(chunkKey);
          if (this.spawnedRiverChunks.size > 1500) {
            const first = this.spawnedRiverChunks.values().next().value;
            if (first) this.spawnedRiverChunks.delete(first);
          }

          // Sample river channel within chunk
          let foundRiverX = 0;
          let foundRiverZ = 0;
          let foundRiver = false;
          let riverDepth = 3;

          for (let ox = 3; ox <= 13; ox += 5) {
            for (let oz = 3; oz <= 13; oz += 5) {
              const sampleWX = cx * 16 + ox;
              const sampleWZ = cz * 16 + oz;
              const rs = this.world.generator.riverSystem.getRiverSample(sampleWX, sampleWZ);
              if (rs.inRiver && rs.distToCenter < rs.riverWidth * 0.45) {
                foundRiverX = sampleWX;
                foundRiverZ = sampleWZ;
                foundRiver = true;
                riverDepth = rs.depthOffset || 3;
                break;
              }
            }
            if (foundRiver) break;
          }

          if (foundRiver) {
            // River surface is at SEA_LEVEL (100)
            const riverWaterY = 99.0;
            const blockAtWater = this.world.getBlock(Math.floor(foundRiverX), Math.floor(riverWaterY), Math.floor(foundRiverZ));

            if (blockAtWater === 23) { // 23 = BlockType.WATER
              // Spawn small school of Salmon (3 to 5 fish)
              const groupSize = 3 + Math.floor(Math.random() * 3);
              const schoolAngle = Math.random() * Math.PI * 2;
              const schoolSpeed = 1.3 + Math.random() * 0.7;

              for (let s = 0; s < groupSize; s++) {
                if (salmonWildlifeCount >= 20) break;
                const offsetX = (Math.random() - 0.5) * 3.6;
                const offsetZ = (Math.random() - 0.5) * 3.6;
                const offsetY = -0.3 - Math.random() * Math.max(1.0, riverDepth * 0.6);
                const sx = foundRiverX + offsetX;
                const sz = foundRiverZ + offsetZ;
                const sy = Math.max(96.5, Math.min(99.2, riverWaterY + offsetY));

                // Verify target coordinate is in water
                if (this.world.getBlock(Math.floor(sx), Math.floor(sy), Math.floor(sz)) === 23) {
                  const entId = this.spawnEntity(EntitySpecies.SALMON, sx, sy, sz);
                  const spawnedEnt = this.entities.get(entId);
                  if (spawnedEnt) {
                    spawnedEnt.state.rotationY = schoolAngle + (Math.random() - 0.5) * 0.4;
                    spawnedEnt.state.uniqueData.swimSpeed = schoolSpeed;
                    spawnedEnt.state.uniqueData.swimTimer = 2.0 + Math.random() * 4.0;
                    spawnedEnt.mesh.userData = { inWater: true };
                  }
                  salmonWildlifeCount++;
                }
              }
            }
          }
        }

        // ── 2. REDWOOD FOREST WILDLIFE SPAWNER ──
        if (redwoodWildlifeCount >= 10 || this.spawnedChunks.has(chunkKey)) continue;
        this.spawnedChunks.add(chunkKey);

        // Keep set size bounded
        if (this.spawnedChunks.size > 1500) {
          const firstKey = this.spawnedChunks.values().next().value;
          if (firstKey) this.spawnedChunks.delete(firstKey);
        }

        const centerWX = cx * 16 + 8;
        const centerWZ = cz * 16 + 8;
        const subBiome = this.world.getSubBiomeAt(centerWX, centerWZ);

        // Strictly check for Redwood Forest biomes
        if (!isRedwoodBiome(subBiome)) continue;

        // Deterministic qualification hash (~13% chance per Redwood chunk, roughly 1 in 8 chunks)
        const chunkSeed = Math.abs(Math.sin(cx * 374.12 + cz * 193.81 + 719) * 43758.5453) % 1;
        if (chunkSeed > 0.13) continue;

        // Determine surface coordinates
        const spawnX = cx * 16 + 4 + Math.floor(((chunkSeed * 100) % 1) * 8);
        const spawnZ = cz * 16 + 4 + Math.floor(((chunkSeed * 1000) % 1) * 8);
        const groundHeight = this.world.generator.getHeightAt(spawnX, spawnZ, subBiome);
        if (groundHeight <= 0) continue;

        // Check surface block is solid
        const blockBelow = this.world.getBlock(spawnX, Math.floor(groundHeight), spawnZ);
        if (blockBelow === 0 || blockBelow === 23) continue; // Not air or water

        // Decide species: ~50% Redwood Fox, ~50% Cardinal
        if (chunkSeed < 0.065) {
          // Redwood Fox (1 or 2 foxes)
          const count = chunkSeed < 0.025 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            if (redwoodWildlifeCount >= 10) break;
            const fx = spawnX + (i === 1 ? 2.5 : 0);
            const fz = spawnZ + (i === 1 ? 1.5 : 0);
            const fy = this.world.generator.getHeightAt(fx, fz, subBiome) + 1.0;
            this.spawnEntity(EntitySpecies.REDWOOD_FOX, fx, fy, fz);
            redwoodWildlifeCount++;
          }
        } else {
          // Cardinal flock (1 to 3 birds)
          const count = chunkSeed < 0.09 ? 3 : chunkSeed < 0.11 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            if (redwoodWildlifeCount >= 10) break;
            const bx = spawnX + (i * 1.8 - 1.2);
            const bz = spawnZ + (i * 1.4 - 0.8);
            const groundY = this.world.generator.getHeightAt(bx, bz, subBiome);
            // 40% chance perched higher up in redwood canopy / boughs
            const isPerchedInTree = ((chunkSeed * 50 + i * 17) % 1) > 0.6;
            const by = isPerchedInTree ? groundY + 4 + (i % 3) : groundY + 1.0;
            const entId = this.spawnEntity(EntitySpecies.CARDINAL, bx, by, bz);
            const spawnedEnt = this.entities.get(entId);
            if (spawnedEnt) {
              spawnedEnt.state.uniqueData.isFlying = false;
              spawnedEnt.state.uniqueData.perchTimer = 4.0 + Math.random() * 8.0;
            }
            redwoodWildlifeCount++;
          }
        }
      }
    }
  }

  public destroy() {
    for (const ent of this.entities.values()) {
      this.scene.remove(ent.mesh);
    }
    this.entities.clear();
  }
}
