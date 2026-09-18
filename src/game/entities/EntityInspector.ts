import * as THREE from 'three';
import { EntitySpecies } from '../../types';
import { EntityManager } from './EntityManager';
import { raycastEntityHit } from './EntityHitboxPhysics';

export interface InspectedEntityInfo {
  id: string;
  species: EntitySpecies;
  health: number;
  maxHealth: number;
  isTamed: boolean;
  isHostile: boolean;
  prompt: string;
}

export class EntityInspector {
  public static getPromptForSpecies(species: EntitySpecies): string {
    switch (species) {
      case EntitySpecies.REDWOOD_FOX:
        return '[Right Click] Pet & Befriend Redwood Fox';
      case EntitySpecies.CARDINAL:
        return '[Right Click] Listen to Cardinal Song';
      case EntitySpecies.GLIMMER_FOX:
        return '[Right Click] Feed Star-Berries to Scent Treasure';
      case EntitySpecies.SKY_RAY:
        return '[Right Click / Grapple] Mount & Soar Sky';
      case EntitySpecies.PUFF_SPORE:
        return 'Jump on cap for Super Trampoline Bounce!';
      case EntitySpecies.PEBBLE_GOLEM:
        return '[Right Click] Feed Iron Ore to Tame';
      case EntitySpecies.MIMIC_CHEST:
        return '[Right Click] Feed Gold to Pacify for Triple Loot';
      default:
        return '[Right Click] Interact';
    }
  }

  public static findTargetedEntity(
    entityManager: EntityManager,
    playerPos: THREE.Vector3,
    yaw: number,
    pitch: number,
    maxDistance: number = 6.0
  ): InspectedEntityInfo | null {
    const eyeOrigin = new THREE.Vector3(playerPos.x, playerPos.y + 1.62, playerPos.z);
    const lookDir = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    ).normalize();

    const hit = raycastEntityHit(
      eyeOrigin,
      lookDir,
      entityManager.entities.values(),
      maxDistance
    );

    if (hit) {
      const ent = entityManager.entities.get(hit.entityId);
      if (ent) {
        return {
          id: ent.state.id,
          species: ent.state.species,
          health: ent.state.health,
          maxHealth: ent.state.maxHealth,
          isTamed: ent.state.isTamed,
          isHostile: ent.state.isHostile,
          prompt: this.getPromptForSpecies(ent.state.species)
        };
      }
    }
    return null;
  }
}

