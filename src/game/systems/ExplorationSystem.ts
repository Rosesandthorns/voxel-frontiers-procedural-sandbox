import {BETA_CREATURES} from '../entities/BetaCreatures';
import { BiomeType, DiscoveryStats, EntitySpecies, ExplorationWaypoint } from '../../types';
import { soundManager } from '../audio/SoundFX';

export interface CreatureEntry {
  species: EntitySpecies;
  title: string;
  icon: string;
  habitat: string;
  uniqueMechanic: string;
  tamingFood: string;
  drops: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
}

export const BESTIARY_DATA: Record<EntitySpecies, CreatureEntry> = {
 ...Object.fromEntries(Object.entries(BETA_CREATURES).map(([species,def])=>[species,{species,title:species,icon:'•',habitat:def.habitat,uniqueMechanic:def.hostile?'Appears in complete darkness. Keep your surroundings lit.':'A resident of '+def.habitat.toLowerCase()+'.',tamingFood:'None',drops:def.meat?'Raw '+def.meat:'None',rarity:'Uncommon'}])) as Record<EntitySpecies,CreatureEntry>,
  [EntitySpecies.REDWOOD_FOX]: {
    species: EntitySpecies.REDWOOD_FOX,
    title: 'The Rust-Coated Prowler',
    icon: '🦊',
    habitat: 'Towering Redwood Forests',
    uniqueMechanic: 'An orange-coated woodland fox with a bushy white-tipped tail. Trots stealthily through towering redwoods and curtsies with curious head tilts.',
    tamingFood: 'Sweet Berries & Apples',
    drops: 'Redwood Fur, Forest Pelt',
    rarity: 'Uncommon'
  },
  [EntitySpecies.CARDINAL]: {
    species: EntitySpecies.CARDINAL,
    title: 'The Crimson Crested Songbird',
    icon: '🐦',
    habitat: 'Redwood Forest Canopies & Understories',
    uniqueMechanic: 'A vibrant scarlet bird sporting a peaked crest and black mask. Hops through undergrowth, takes to the canopy in gentle fluttering bursts, and sings melodious woodland chirps.',
    tamingFood: 'Wild Forest Seeds',
    drops: 'Crimson Feather, Song Flute',
    rarity: 'Common'
  },
  [EntitySpecies.SALMON]: {
    species: EntitySpecies.SALMON,
    title: 'The Riverway Swimmer',
    icon: '🐟',
    habitat: 'Winding Rivers & Freshwater Streams',
    uniqueMechanic: 'A sleek, coral-pink and silver freshwater fish that navigates river channels in schools. Swims actively through river water, meandering with currents and schooling in small groups.',
    tamingFood: 'None (Wild Fish)',
    drops: 'Raw Salmon',
    rarity: 'Common'
  },
};

export class ExplorationSystem {
  public stats: DiscoveryStats;
  public waypoints: ExplorationWaypoint[] = [];
  public currentBiome: BiomeType = BiomeType.VERDANT_PLAINS;
  public currentSubBiomeId: string = 'verdant_plains_meadow';
  public onBiomeDiscovered?: (biome: BiomeType) => void;
  public onSubBiomeDiscovered?: (subBiomeName: string, subBiomeDesc: string) => void;
  public onEntityScanned?: (species: EntitySpecies) => void;

  constructor() {
    this.stats = {
      biomesDiscovered: { [BiomeType.VERDANT_PLAINS]: true, 'verdant_plains_meadow': true },
      entitiesEncountered: {},
      entitiesTamed: {},
      blocksMined: 0,
      blocksPlaced: 0,
      relicsFound: 0,
      distanceTraveled: 0
    };
  }

  public checkBiome(newBiome: BiomeType) {
    if (newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      if (!this.stats.biomesDiscovered[newBiome]) {
        this.stats.biomesDiscovered[newBiome] = true;
        this.onBiomeDiscovered?.(newBiome);
      }
    }
  }

  public checkSubBiome(subBiomeId: string, subBiomeName: string, description: string) {
    if (subBiomeId !== this.currentSubBiomeId) {
      this.currentSubBiomeId = subBiomeId;
      if (!this.stats.biomesDiscovered[subBiomeId]) {
        this.stats.biomesDiscovered[subBiomeId] = true;
        this.onSubBiomeDiscovered?.(subBiomeName, description);
      }
    }
  }

  public recordEntityEncounter(species: EntitySpecies) {
    if (!this.stats.entitiesEncountered[species]) {
      this.stats.entitiesEncountered[species] = true;
      soundManager.playChime(659.25);
      this.onEntityScanned?.(species);
    }
  }

  public recordEntityTamed(species: EntitySpecies) {
    this.stats.entitiesTamed[species] = true;
  }

  public addWaypoint(name: string, x: number, y: number, z: number, color: string = '#00e676') {
    const wp: ExplorationWaypoint = {
      id: `wp_${Date.now()}`,
      name,
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z),
      color
    };
    this.waypoints.push(wp);
    soundManager.playChime(523.25);
    return wp;
  }

  public removeWaypoint(id: string) {
    this.waypoints = this.waypoints.filter((w) => w.id !== id);
  }
}
