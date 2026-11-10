import {buildBetaCreature,animateBetaCreature} from './BetaCreatureModels';
import type {VillagerVariant} from './BetaCreatureModels';
import * as THREE from 'three';
import { EntitySpecies } from '../../types';
import {
  buildRedwoodFoxModel,
  buildCardinalModel,
  buildSalmonModel,
  animateRedwoodFox,
  animateCardinal,
  animateSalmon,
} from './MinecraftMobFactory';

export interface EntityMeshGroup extends THREE.Group {
  species: EntitySpecies;
  animTime: number;
  parts: Record<string, THREE.Object3D>;
  // Model-only villager job outfit (farmer, blacksmith, ...). Unset = the
  // default villager. Not a job/AI/spawn field — nothing reads it in-game.
  villagerVariant?: VillagerVariant;
}

export class EntityModelFactory {
  // Shared materials for entity rendering
  private static materials: Record<string, THREE.MeshLambertMaterial> = {};

  private static getMaterial(color: number, emissive: number = 0, opacity: number = 1): THREE.MeshLambertMaterial {
    const key = `${color}_${emissive}_${opacity}`;
    if (!this.materials[key]) {
      this.materials[key] = new THREE.MeshLambertMaterial({
        color,
        emissive,
        transparent: opacity < 1,
        opacity
      });
    }
    return this.materials[key];
  }

  public static createEntityModel(species: EntitySpecies, opts?: {villagerVariant?: VillagerVariant}): EntityMeshGroup {
    const group = new THREE.Group() as EntityMeshGroup;
    group.species = species;
    group.animTime = Math.random() * 10;
    group.parts = {};
    if(opts?.villagerVariant)group.villagerVariant = opts.villagerVariant;

    if(buildBetaCreature(group))return group;
    switch (species) {
      case EntitySpecies.REDWOOD_FOX:
        buildRedwoodFoxModel(group);
        break;
      case EntitySpecies.CARDINAL:
        buildCardinalModel(group);
        break;
      case EntitySpecies.SALMON:
        buildSalmonModel(group);
        break;
    }

    return group;
  }

  // Animation updates for limbs and movement
  public static animateEntity(g: EntityMeshGroup, speed: number, delta: number) {
    if(animateBetaCreature(g,speed,delta))return;
    g.animTime += delta * 4.0;
    const t = g.animTime;

    switch (g.species) {
      case EntitySpecies.REDWOOD_FOX:
        animateRedwoodFox(g, speed, delta);
        break;
      case EntitySpecies.CARDINAL:
        animateCardinal(g, speed, delta);
        break;
      case EntitySpecies.SALMON:
        animateSalmon(g, speed, delta);
        break;
    }
  }
}
