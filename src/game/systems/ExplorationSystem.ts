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
  [EntitySpecies.GLIMMER_FOX]: {
    species: EntitySpecies.GLIMMER_FOX,
    title: 'The Luminous Scent Hound',
    icon: '🦊',
    habitat: 'Verdant Plains & Ancient Glades',
    uniqueMechanic: 'Scents out hidden underground ore, gems, and treasure caches when fed Sweet Star-Berries, sprinting directly toward buried loot.',
    tamingFood: 'Sweet Star-Berries',
    drops: 'Glimmer Fur, Raw Ore',
    rarity: 'Uncommon'
  },
  [EntitySpecies.PUFF_SPORE]: {
    species: EntitySpecies.PUFF_SPORE,
    title: 'Buoyant Trampoline Floater',
    icon: '🫧',
    habitat: 'Mystic Spore Forests & Damp Basins',
    uniqueMechanic: 'Acts as a natural trampoline. Jumping on its cap launches you 15 blocks into the sky. If struck, inflates and floats upward.',
    tamingFood: 'Water Drops',
    drops: 'Spore Gel, Elastic Tendrils',
    rarity: 'Common'
  },
  [EntitySpecies.PEBBLE_GOLEM]: {
    species: EntitySpecies.PEBBLE_GOLEM,
    title: 'Subterranean Stone Sentry',
    icon: '🗿',
    habitat: 'Golden Dunes & Mountain Ravines',
    uniqueMechanic: 'Blends seamlessly into the terrain as a stone block until approached. When fed Iron Ore or Quartz, awakens as a protective bodyguard.',
    tamingFood: 'Iron Ore / Quartz',
    drops: 'Cobblestone, Heavy Stone Fist',
    rarity: 'Uncommon'
  },
  [EntitySpecies.SOLAR_SPRITE]: {
    species: EntitySpecies.SOLAR_SPRITE,
    title: 'Prismatic Aurora Moth',
    icon: '🦋',
    habitat: 'Celestial Sky Isles & High Peaks',
    uniqueMechanic: 'Radiates a photosynthetic healing aura that constantly restores nearby player health and accelerates plant growth. Can be caught in a Prism Sphere.',
    tamingFood: 'Flower Nectar',
    drops: 'Solar Dust, Bioluminescent Silk',
    rarity: 'Rare'
  },
  [EntitySpecies.DUNE_CRAB]: {
    species: EntitySpecies.DUNE_CRAB,
    title: 'Sub-sand Scuttler',
    icon: '🦀',
    habitat: 'Golden Dunes & Sandstone Canyons',
    uniqueMechanic: 'Burrows underneath desert sands to ambush prey. Pops up with a shower of sand grains and snaps with heavy chitin claws.',
    tamingFood: 'Fish / Kelp',
    drops: 'Carapace Plate, Chitin Pincer',
    rarity: 'Common'
  },
  [EntitySpecies.VOID_STALKER]: {
    species: EntitySpecies.VOID_STALKER,
    title: 'Phase-Shifting Shadow Wisp',
    icon: '👁️',
    habitat: 'Deep Caverns & Scorched Magma Wastes',
    uniqueMechanic: 'Can phase through single-layer solid walls. Highly allergic to sunlight and torch lanterns, which cause it to vanish into the dark.',
    tamingFood: 'Dark Motes',
    drops: 'Void Shards (Teleport Pearl)',
    rarity: 'Rare'
  },
  [EntitySpecies.MAGMA_SALAMANDER]: {
    species: EntitySpecies.MAGMA_SALAMANDER,
    title: 'Lava-Skating Fire Drake',
    icon: '🦎',
    habitat: 'Scorched Magma Wastes & Molten Pools',
    uniqueMechanic: 'Swims through boiling lava unharmed. When it skitters across water bodies, it instantly solidifies water into cobblestone bridges.',
    tamingFood: 'Magma Cream',
    drops: 'Molten Scale, Fire Essence',
    rarity: 'Rare'
  },
  [EntitySpecies.SKY_RAY]: {
    species: EntitySpecies.SKY_RAY,
    title: 'Celestial Aether Glider',
    icon: '🪁',
    habitat: 'Celestial Sky Isles (High Altitude)',
    uniqueMechanic: 'Majestic flying creature that glides between floating islands. Player can lasso it with a Grappling Hook to mount and steer it across the skies.',
    tamingFood: 'Cloud Crystals',
    drops: 'Aether Feather, Glider Membrane',
    rarity: 'Legendary'
  },
  [EntitySpecies.SPORE_SHROOMLING]: {
    species: EntitySpecies.SPORE_SHROOMLING,
    title: 'Chorus Shroomling',
    icon: '🍄',
    habitat: 'Mystic Spore Forest',
    uniqueMechanic: 'Hops rhythmically and releases spore clouds: green spores cure ailments, pink spores grant temporary super-jump height.',
    tamingFood: 'Glowshroom Cap',
    drops: 'Fungal Spores, Luminescent Cap',
    rarity: 'Common'
  },
  [EntitySpecies.ANCIENT_SENTRY]: {
    species: EntitySpecies.ANCIENT_SENTRY,
    title: 'Clockwork Eye Drone',
    icon: '🤖',
    habitat: 'Ruined Temples & Ancient Altars',
    uniqueMechanic: 'Projects a tracking targeting laser. If repaired with Gold or Iron, converts into an autonomous base escort turret.',
    tamingFood: 'Gold Ore / Iron Ore',
    drops: 'Ancient Gears, Laser Core',
    rarity: 'Rare'
  },
  [EntitySpecies.MIMIC_CHEST]: {
    species: EntitySpecies.MIMIC_CHEST,
    title: 'Treasure Mimic',
    icon: '📦',
    habitat: 'Dungeons & Ancient Shrines',
    uniqueMechanic: 'Disguised as an ordinary treasure cache. When fed Gold Ore, pacifies into a walking pet chest that quadruples your inventory!',
    tamingFood: 'Gold Ore',
    drops: 'Triple Relic Loot, Mimic Teeth',
    rarity: 'Uncommon'
  },
  [EntitySpecies.CRYSTAL_BASILISK]: {
    species: EntitySpecies.CRYSTAL_BASILISK,
    title: 'Prismatic Mirror Serpent',
    icon: '🐍',
    habitat: 'Crystalline Chasm & Amethyst Depths',
    uniqueMechanic: 'Armored with reflective amethyst scales that deflect projectiles into colorful light refractions and turns damp ground into crystal.',
    tamingFood: 'Amethyst Shards',
    drops: 'Prismatic Scale, Amethyst Core',
    rarity: 'Legendary'
  }
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
