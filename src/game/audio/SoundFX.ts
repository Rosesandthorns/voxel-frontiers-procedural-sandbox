import { BlockSoundCategory, ItemDef, WeatherType, BiomeType, WorldSettings } from '../../types';
import { VerdantSubBiomeDef } from '../voxel/SubBiomeTypes';
import { SEA_LEVEL, CHUNK_H } from '../voxel/ChunkConstants';
import { isLeavesBlock } from '../voxel/Blocks';
import type { VoxelWorld } from '../voxel/VoxelWorld';
import type * as THREE from 'three';

import walkUrl from './Walk.mp3';
import walkSandUrl from './WalkSand.mp3';
import walkGrassUrl from './WalkGrass.mp3';
import walkStoneUrl from './WalkStone.mp3';
import oceanUrl from './Ocean.mp3';
import pickUpItemUrl from './PickUpItem.mp3';
import snowstormUrl from './Snowstorm.mp3';
import rainfallUrl from './Rainfall.mp3';
import dropMetalUrl from './DropMetal.mp3';
import dropUrl from './Drop.mp3';
import swimUrl from './Swim.mp3';
import putOnArmourUrl from './PutOnArmour.mp3';

interface ActiveLoopTrack {
  source: AudioBufferSourceNode;
  gain: GainNode;
  key: string;
}

export class SoundFX {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  public isMuted: boolean = false;
  private volumeSettings = {
    master: 0.8,
    ambient: 0.8,
    effects: 0.8,
    footsteps: 0.8
  };

  // Track last procedural step sources so we can cut them if player stops mid-sound
  private _lastStepSources: AudioScheduledSourceNode[] = [];

  // Decoded audio buffers cache
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private bufferLoadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

  // Active looping tracks
  private activeWalkKey: string | null = null;
  private currentWalkTrack: ActiveLoopTrack | null = null;
  private rainTrack: ActiveLoopTrack | null = null;
  private snowstormTrack: ActiveLoopTrack | null = null;
  private oceanTrack: ActiveLoopTrack | null = null;
  private swimTrack: ActiveLoopTrack | null = null;

  // Weather soundscape proximity caching
  private lastProximityCheckTime: number = 0;
  private lastProximityPos = { x: -9999, y: -9999, z: -9999 };
  private cachedRainProximity: number = 0;
  private cachedSnowProximity: number = 0;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Dynamics compressor acts as a master limiter and glue
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volumeSettings.master, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);

        this.generatePinkNoiseBuffer();

        // Preload all recorded audio buffers immediately on first interaction
        const sources: [string, string][] = [
          ['walk', walkUrl],
          ['walk_sand', walkSandUrl],
          ['walk_grass', walkGrassUrl],
          ['walk_stone', walkStoneUrl],
          ['ocean', oceanUrl],
          ['pickup', pickUpItemUrl],
          ['snowstorm', snowstormUrl],
          ['rainfall', rainfallUrl],
          ['drop_metal', dropMetalUrl],
          ['drop', dropUrl],
          ['swim', swimUrl],
          ['armour', putOnArmourUrl]
        ];
        for (const [k, u] of sources) {
          this.loadAudioBuffer(k, u);
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public applySettings(settings: Pick<WorldSettings, 'soundVolume' | 'ambientVolume' | 'effectsVolume' | 'footstepsVolume'>) {
    this.volumeSettings = {
      master: settings.soundVolume,
      ambient: settings.ambientVolume,
      effects: settings.effectsVolume,
      footsteps: settings.footstepsVolume
    };
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volumeSettings.master, this.ctx.currentTime, 0.02);
    }
  }

  private ambientGain(value: number): number {
    return value * this.volumeSettings.ambient;
  }

  private effectsGain(value: number): number {
    return value * this.volumeSettings.effects;
  }

  private footstepsGain(value: number): number {
    return value * this.volumeSettings.footsteps;
  }

  private loadAudioBuffer(key: string, url: string): Promise<AudioBuffer | null> {
    if (this.audioBuffers.has(key)) {
      return Promise.resolve(this.audioBuffers.get(key)!);
    }
    if (this.bufferLoadingPromises.has(key)) {
      return this.bufferLoadingPromises.get(key)!;
    }
    if (!this.ctx) return Promise.resolve(null);

    const promise = (async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        if (!this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(key, decoded);
        return decoded;
      } catch (err) {
        console.warn(`Failed to decode audio for ${key}:`, err);
        return null;
      }
    })();

    this.bufferLoadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Generates a 2-second looped pink noise buffer.
   * Pink noise produces rich, natural organic frequencies without the harsh hiss of white noise.
   */
  private generatePinkNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = buffer;
  }

  /**
   * Plays a noise burst shaped by a filter and volume envelope.
   */
  private playFilteredNoise(
    now: number,
    duration: number,
    filterType: BiquadFilterType,
    freq: number,
    gainLevel: number,
    Q: number = 1.0
  ): AudioBufferSourceNode | undefined {
    if (!this.ctx || !this.masterGain || !this.pinkNoiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.pinkNoiseBuffer;
    source.loop = true;
    source.loopStart = Math.random() * 1.5;
    source.loopEnd = source.loopStart + duration + 0.05;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.setValueAtTime(Q, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration + 0.02);
    return source;
  }

  private normalizeSoundType(type?: string): BlockSoundCategory {
    if (!type) return 'earth';
    if (type === 'stone') return 'rocky';
    if (type === 'grass') return 'earth';
    return type as BlockSoundCategory;
  }

  /**
   * Stop any currently playing walk/step sound immediately.
   * Called by PlayerController when movement stops or surface block changes.
   */
  public stopWalkSound() {
    this.updateWalkSound(false, 'other');
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const src of this._lastStepSources) {
      try { src.stop(now + 0.02); } catch (_) { /* already stopped */ }
    }
    this._lastStepSources = [];
  }

  /**
   * Continuous looping walk track based on terrain surface:
   * - 'sand': WalkSand.mp3
   * - 'grass': WalkGrass.mp3
   * - 'stone': WalkStone.mp3
   * - 'other': Walk.mp3
   *
   * Smoothly crossfades between surfaces, stops immediately when walking ceases,
   * and starts at the audible portion of the track.
   */
  public updateWalkSound(isWalking: boolean, surface: 'sand' | 'grass' | 'stone' | 'other') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const targetKey =
      surface === 'sand'
        ? 'walk_sand'
        : surface === 'grass'
        ? 'walk_grass'
        : surface === 'stone'
        ? 'walk_stone'
        : 'walk';

    if (!isWalking) {
      if (this.currentWalkTrack) {
        const tr = this.currentWalkTrack;
        tr.gain.gain.cancelScheduledValues(now);
        tr.gain.gain.setValueAtTime(tr.gain.gain.value, now);
        // Stop as soon as walking stops (smooth micro-fade over 40ms to avoid audio click)
        tr.gain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
        setTimeout(() => {
          try {
            tr.source.stop();
            tr.source.disconnect();
            tr.gain.disconnect();
          } catch (_) {}
        }, 50);
        this.currentWalkTrack = null;
        this.activeWalkKey = null;
      }
      return;
    }

    if (this.activeWalkKey === targetKey && this.currentWalkTrack) {
      return;
    }

    const buffer = this.audioBuffers.get(targetKey);
    if (!buffer) {
      // Buffer still decoding; request load
      const url =
        targetKey === 'walk_sand'
          ? walkSandUrl
          : targetKey === 'walk_grass'
          ? walkGrassUrl
          : targetKey === 'walk_stone'
          ? walkStoneUrl
          : walkUrl;
      this.loadAudioBuffer(targetKey, url);
      return;
    }

    // Crossfade: smoothly fade out previous track
    if (this.currentWalkTrack) {
      const oldTr = this.currentWalkTrack;
      oldTr.gain.gain.cancelScheduledValues(now);
      oldTr.gain.gain.setValueAtTime(oldTr.gain.gain.value, now);
      oldTr.gain.gain.linearRampToValueAtTime(0.0001, now + 0.06);
      setTimeout(() => {
        try {
          oldTr.source.stop();
          oldTr.source.disconnect();
          oldTr.gain.disconnect();
        } catch (_) {}
      }, 70);
      this.currentWalkTrack = null;
    }

    // Start at an audible point (skipping leading silence) and normalize volume
    let startOffset = 0.0;
    let targetVol = 0.7;
    if (targetKey === 'walk_sand') {
      startOffset = 0.32;
      targetVol = 2.4; // Boost quiet recording (-19.5 dB)
    } else if (targetKey === 'walk_grass') {
      startOffset = 0.31;
      targetVol = 1.25;
    } else if (targetKey === 'walk_stone') {
      startOffset = 0.40;
      targetVol = 2.2; // Boost quiet recording (-16.2 dB)
    } else {
      startOffset = 0.0;
      targetVol = 0.7;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = startOffset;
    src.loopEnd = buffer.duration;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(this.footstepsGain(targetVol), now + 0.04);

    src.connect(gain);
    gain.connect(this.masterGain);

    src.start(now, startOffset);

    this.currentWalkTrack = { source: src, gain, key: targetKey };
    this.activeWalkKey = targetKey;
  }

  /**
   * Smooth ambient audio manager:
   * - Rainfall: raining sound effect
   * - Snowstorm: snowstorm sound effect, loops cleanly when dying out (loopEnd: 82.5s)
   * - Ocean: plays when near large bodies of water above ground, skips leading silence (start: 4.65s)
   * - Swim: plays when underwater
   *
   * Smoothly crossfades between states and stops as soon as conditions cease.
   */
  public updateAmbientAudio(params: {
    isUnderwater: boolean;
    weather: WeatherType;
    weatherBlend: number;
    subBiome?: VerdantSubBiomeDef | null;
    playerPos?: THREE.Vector3;
    world?: VoxelWorld | null;
  }) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const { isUnderwater, weather, weatherBlend, subBiome, playerPos, world } = params;

    // Update proximity to rain and snowstorms periodically or when player moves
    const nowMs = performance.now();
    let needProximityCheck = nowMs - this.lastProximityCheckTime > 250;
    if (!needProximityCheck && playerPos) {
      const pdx = playerPos.x - this.lastProximityPos.x;
      const pdy = playerPos.y - this.lastProximityPos.y;
      const pdz = playerPos.z - this.lastProximityPos.z;
      if (pdx * pdx + pdy * pdy + pdz * pdz > 2.25) {
        needProximityCheck = true;
      }
    }

    if (needProximityCheck && playerPos && world) {
      this.lastProximityCheckTime = nowMs;
      this.lastProximityPos.x = playerPos.x;
      this.lastProximityPos.y = playerPos.y;
      this.lastProximityPos.z = playerPos.z;
      this.cachedRainProximity = this.getRainProximity(playerPos, world, subBiome);
      this.cachedSnowProximity = this.getSnowstormProximity(playerPos, world, subBiome);
    }

    // 1. Rainfall Ambient Loop
    // "make it so if you are nowhere near rain while it's raining, you don't hear it"
    const isRaining =
      !isUnderwater &&
      (weather === WeatherType.RAIN ||
        weather === WeatherType.RAINSTORM ||
        weather === WeatherType.THUNDERSTORM);

    const rainProximity = isRaining ? this.cachedRainProximity : 0.0;
    const rainTargetVol = isRaining && rainProximity > 0.02
      ? (weather === WeatherType.RAIN ? 0.45 : 0.75) * Math.min(1.0, weatherBlend) * rainProximity
      : 0.0;

    this.updateAmbientLoop(
      'rainfall',
      rainfallUrl,
      rainTargetVol > 0.01,
      this.ambientGain(rainTargetVol),
      0.35, // start offset to skip quiet leader
      undefined,
      0.8 // fade duration
    );

    // 2. Snowstorm Ambient Loop
    // "same with snowstorms"
    const isSnowstorm =
      !isUnderwater &&
      (weather === WeatherType.SNOWSTORM || weather === WeatherType.EVERSNOW);

    const snowProximity = isSnowstorm ? this.cachedSnowProximity : 0.0;
    const snowTargetVol = isSnowstorm && snowProximity > 0.02
      ? (weather === WeatherType.SNOWSTORM ? 0.6 : 0.85) * Math.min(1.0, weatherBlend) * snowProximity
      : 0.0;

    this.updateAmbientLoop(
      'snowstorm',
      snowstormUrl,
      snowTargetVol > 0.01,
      this.ambientGain(snowTargetVol),
      0.5,
      82.5, // Loops as soon as the sound dies out at 82.5s!
      0.8
    );

    // 3. Swim Ambient Loop (when underwater)
    const swimTargetVol = isUnderwater ? 0.8 : 0.0;
    this.updateAmbientLoop(
      'swim',
      swimUrl,
      swimTargetVol > 0.01,
      this.ambientGain(swimTargetVol),
      0.0,
      undefined,
      0.25 // Fast responsive fade
    );

    // 4. Ocean Ambient Loop
    // "Ocean - plays when near large bodies of water but above ground, like an ocean"
    let isNearOcean = false;
    if (!isUnderwater && playerPos) {
      if (
        subBiome &&
        (subBiome.shoreType !== undefined ||
          subBiome.category === 'ocean' ||
          subBiome.id.includes('shore') ||
          subBiome.id.includes('beach') ||
          subBiome.id.includes('ocean'))
      ) {
        isNearOcean = true;
      } else if (world && playerPos.y <= SEA_LEVEL + 6) {
        // Quick check for nearby water at sea level
        const ix = Math.floor(playerPos.x);
        const iz = Math.floor(playerPos.z);
        if (
          world.getBlock(ix, SEA_LEVEL, iz) === 5 ||
          world.getBlock(ix + 12, SEA_LEVEL, iz) === 5 ||
          world.getBlock(ix - 12, SEA_LEVEL, iz) === 5 ||
          world.getBlock(ix, SEA_LEVEL, iz + 12) === 5 ||
          world.getBlock(ix, SEA_LEVEL, iz - 12) === 5
        ) {
          isNearOcean = true;
        }
      }
    }

    const oceanTargetVol = isNearOcean ? 1.4 : 0.0; // Boosted volume
    this.updateAmbientLoop(
      'ocean',
      oceanUrl,
      oceanTargetVol > 0.01,
      this.ambientGain(oceanTargetVol),
      4.65, // Starts at 4.65s to skip the 4.6s of silence at the beginning!
      undefined,
      0.8
    );
  }

  private updateAmbientLoop(
    key: string,
    url: string,
    active: boolean,
    targetGain: number,
    startOffset: number = 0,
    loopEnd?: number,
    fadeTime: number = 0.5
  ) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    let track =
      key === 'rainfall'
        ? this.rainTrack
        : key === 'snowstorm'
        ? this.snowstormTrack
        : key === 'swim'
        ? this.swimTrack
        : key === 'ocean'
        ? this.oceanTrack
        : null;

    if (!active) {
      if (track) {
        track.gain.gain.cancelScheduledValues(now);
        track.gain.gain.setValueAtTime(track.gain.gain.value, now);
        track.gain.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
        const toClean = track;
        setTimeout(() => {
          try {
            toClean.source.stop();
            toClean.source.disconnect();
            toClean.gain.disconnect();
          } catch (_) {}
        }, (fadeTime + 0.05) * 1000);

        if (key === 'rainfall') this.rainTrack = null;
        else if (key === 'snowstorm') this.snowstormTrack = null;
        else if (key === 'swim') this.swimTrack = null;
        else if (key === 'ocean') this.oceanTrack = null;
      }
      return;
    }

    // Active
    if (!track) {
      const buffer = this.audioBuffers.get(key);
      if (!buffer) {
        this.loadAudioBuffer(key, url);
        return;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = startOffset;
      if (loopEnd !== undefined && loopEnd > 0 && loopEnd < buffer.duration) {
        src.loopEnd = loopEnd;
      } else {
        src.loopEnd = buffer.duration;
      }

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + fadeTime);

      src.connect(gain);
      gain.connect(this.masterGain);

      src.start(now, startOffset);

      track = { source: src, gain, key };
      if (key === 'rainfall') this.rainTrack = track;
      else if (key === 'snowstorm') this.snowstormTrack = track;
      else if (key === 'swim') this.swimTrack = track;
      else if (key === 'ocean') this.oceanTrack = track;
    } else {
      // Smoothly update gain
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setValueAtTime(track.gain.gain.value, now);
      track.gain.gain.linearRampToValueAtTime(targetGain, now + 0.3);
    }
  }

  /**
   * Returns true if rain can fall in this sub-biome (excludes deserts and arctic/eversnow).
   */
  public isRainBiome(sb?: VerdantSubBiomeDef | null): boolean {
    if (!sb) return false;
    if (sb.isDesert || sb.category === 'desert' || sb.mainBiome === BiomeType.THE_DESERT) {
      return false;
    }
    if (
      sb.isArctic ||
      sb.category === 'arctic' ||
      sb.isEversnow ||
      sb.mainBiome === BiomeType.ARCTIC ||
      sb.mainBiome === BiomeType.BOREAL_PEAKS
    ) {
      return false;
    }
    return true;
  }

  /**
   * Returns true if snowstorms can occur in this sub-biome (arctic, eversnow, snowy boreal).
   */
  public isSnowstormBiome(sb?: VerdantSubBiomeDef | null): boolean {
    if (!sb) return false;
    return Boolean(
      sb.isArctic ||
      sb.category === 'arctic' ||
      sb.isEversnow ||
      sb.id === 'eversnow' ||
      sb.id === 'everfrost_forest' ||
      sb.id === 'frostbite_peaks' ||
      sb.id === 'snowy_shoreline' ||
      sb.id === 'eversnow_bluffs' ||
      sb.mainBiome === BiomeType.ARCTIC ||
      sb.mainBiome === BiomeType.BOREAL_PEAKS
    );
  }

  /**
   * Computes proximity to rain (0.0 to 1.0).
   * Returns 0.0 if the player is nowhere near rain (e.g. in desert, arctic, or deep in a cave).
   */
  public getRainProximity(
    playerPos?: THREE.Vector3,
    world?: VoxelWorld | null,
    subBiome?: VerdantSubBiomeDef | null
  ): number {
    if (!playerPos || !world) return 0.0;

    const inRainBiome = this.isRainBiome(subBiome);
    let biomeFactor = 0.0;

    if (inRainBiome) {
      biomeFactor = 1.0;
    } else if (world.generator) {
      // Player is in a non-rain biome (desert or arctic). Check distance to nearest rain biome.
      let nearestDist = Infinity;
      const sampleDistances = [12, 24, 36];
      for (const d of sampleDistances) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const sx = playerPos.x + Math.cos(angle) * d;
          const sz = playerPos.z + Math.sin(angle) * d;
          const sBiome = world.generator.getSubBiomeAt(sx, sz, playerPos.y);
          if (this.isRainBiome(sBiome)) {
            nearestDist = d;
            break;
          }
        }
        if (nearestDist < Infinity) break;
      }
      if (nearestDist < Infinity) {
        biomeFactor = Math.max(0, 1.0 - nearestDist / 36) * 0.7;
      } else {
        // Nowhere near rain!
        return 0.0;
      }
    } else {
      return 0.0;
    }

    // Check overhead cover and subterranean cave depth
    const px = Math.floor(playerPos.x);
    const py = Math.floor(playerPos.y);
    const pz = Math.floor(playerPos.z);

    let surfaceY = py;
    if (world.generator && subBiome) {
      surfaceY = world.generator.getHeightAt(px, pz, subBiome);
    }

    const depthBelowGround = surfaceY - py;
    if (depthBelowGround >= 18) {
      // Deep inside a subterranean cavern system — inaudible!
      return 0.0;
    }

    // Check for solid non-leaf blocks above head
    let solidRoofCount = 0;
    for (let dy = 2; dy <= 20; dy++) {
      const b = world.getBlock(px, py + dy, pz);
      if (b !== 0 && !isLeavesBlock(b)) {
        solidRoofCount++;
      }
    }

    let shelterFactor = 1.0;
    if (solidRoofCount > 0) {
      if (depthBelowGround > 4) {
        shelterFactor = Math.max(0, 1.0 - (depthBelowGround - 4) / 14);
      } else {
        shelterFactor = 0.45; // Indoors/under roof near surface
      }
    }

    return biomeFactor * shelterFactor;
  }

  /**
   * Computes proximity to snowstorm (0.0 to 1.0).
   * Returns 0.0 if the player is nowhere near a snowstorm (e.g. in desert/plains/forest or deep in a cave).
   */
  public getSnowstormProximity(
    playerPos?: THREE.Vector3,
    world?: VoxelWorld | null,
    subBiome?: VerdantSubBiomeDef | null
  ): number {
    if (!playerPos || !world) return 0.0;

    const inSnowBiome = this.isSnowstormBiome(subBiome);
    let biomeFactor = 0.0;

    if (inSnowBiome) {
      biomeFactor = 1.0;
    } else if (world.generator) {
      // Check if player is near any snowstorm biome
      let nearestDist = Infinity;
      const sampleDistances = [16, 32, 48];
      for (const d of sampleDistances) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const sx = playerPos.x + Math.cos(angle) * d;
          const sz = playerPos.z + Math.sin(angle) * d;
          const sBiome = world.generator.getSubBiomeAt(sx, sz, playerPos.y);
          if (this.isSnowstormBiome(sBiome)) {
            nearestDist = d;
            break;
          }
        }
        if (nearestDist < Infinity) break;
      }
      if (nearestDist < Infinity) {
        biomeFactor = Math.max(0, 1.0 - nearestDist / 48) * 0.7;
      } else {
        // Nowhere near snowstorm!
        return 0.0;
      }
    } else {
      return 0.0;
    }

    // Check overhead cover and subterranean cave depth
    const px = Math.floor(playerPos.x);
    const py = Math.floor(playerPos.y);
    const pz = Math.floor(playerPos.z);

    let surfaceY = py;
    if (world.generator && subBiome) {
      surfaceY = world.generator.getHeightAt(px, pz, subBiome);
    }

    const depthBelowGround = surfaceY - py;
    if (depthBelowGround >= 18) {
      // Deep underground in a cavern system — inaudible!
      return 0.0;
    }

    let solidRoofCount = 0;
    for (let dy = 2; dy <= 20; dy++) {
      const b = world.getBlock(px, py + dy, pz);
      if (b !== 0 && !isLeavesBlock(b)) {
        solidRoofCount++;
      }
    }

    let shelterFactor = 1.0;
    if (solidRoofCount > 0) {
      if (depthBelowGround > 4) {
        shelterFactor = Math.max(0, 1.0 - (depthBelowGround - 4) / 14);
      } else {
        shelterFactor = 0.45;
      }
    }

    return biomeFactor * shelterFactor;
  }

  /**
   * Distinct footsteps based on block category:
   * - 'organic': soft whispery leaves/petals rustle
   * - 'earth': damp muted soil thud
   * - 'rocky': crisp solid mineral click
   * - 'wood': warm hollow timber tap
   * - 'sand': granular sandy swish
   * - 'gravel': crunchy stone grit
   * - 'snow': high crisp powder squeak/crunch
   * - 'glass': slick ceramic/glass tap
   * - 'crystal': delicate crystal chime tap
   * - 'magma': sizzling hot volcanic thud
   * - 'water': fluid liquid slosh & bloop
   */
  public playStep(type: BlockSoundCategory | string = 'earth') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Clear stale step source refs and stop any lingering previous step
    this._lastStepSources = this._lastStepSources.filter(s => {
      try { (s as any)._vfActive; return false; } catch { return false; }
    });

    const cat = this.normalizeSoundType(type);
    const now = this.ctx.currentTime;

    switch (cat) {
      case 'organic': {
        // Soft whispery brush of delicate foliage, leaves, or petals
        this.playFilteredNoise(now, 0.045, 'bandpass', 2800 + Math.random() * 400, 0.11, 1.6);
        break;
      }

      case 'earth': {
        // Damp, muted soil thud + soft earth crumble
        this.playFilteredNoise(now, 0.055, 'lowpass', 850 + Math.random() * 200, 0.12, 1.0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(85 + Math.random() * 15, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      case 'rocky': {
        // Crisp, solid tactile rock click + mineral body resonance
        this.playFilteredNoise(now, 0.032, 'bandpass', 2200 + Math.random() * 300, 0.14, 2.5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160 + Math.random() * 25, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.045);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }

      case 'wood': {
        // Warm, resonant hollow timber thud
        this.playFilteredNoise(now, 0.045, 'bandpass', 650, 0.1, 1.8);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190 + Math.random() * 20, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.065);
        break;
      }

      case 'sand': {
        // Granular sandy swish and shoe sinking
        this.playFilteredNoise(now, 0.075, 'bandpass', 1400 + Math.random() * 250, 0.14, 1.1);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      case 'gravel': {
        // Coarse, crunchy pebble grit scatter
        this.playFilteredNoise(now, 0.07, 'bandpass', 2300 + Math.random() * 300, 0.16, 1.5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      case 'snow': {
        // High crisp powdery snow squeak and crunch
        this.playFilteredNoise(now, 0.06, 'bandpass', 3200 + Math.random() * 300, 0.15, 1.8);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.045);
        break;
      }

      case 'glass': {
        // Slick, crisp ceramic/glass tap
        this.playFilteredNoise(now, 0.025, 'bandpass', 3400, 0.12, 3.0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      case 'crystal': {
        // Delicate crystal bell chime tap
        this.playFilteredNoise(now, 0.02, 'bandpass', 3800, 0.08, 3.5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1320, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.065);
        break;
      }

      case 'magma': {
        // Sizzling volcanic thud
        this.playFilteredNoise(now, 0.06, 'bandpass', 2200, 0.12, 1.8);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.075);
        break;
      }

      case 'water':
      default: {
        // Gentle liquid slosh & bloop
        this.playFilteredNoise(now, 0.085, 'lowpass', 750 + Math.random() * 200, 0.13, 1.5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320 + Math.random() * 50, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.075);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
    }
  }

  /**
   * Periodic chipping/mining tick sound while actively holding left-click digging into a block.
   */
  public playDigChip(type: BlockSoundCategory | string = 'rocky') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const cat = this.normalizeSoundType(type);
    const now = this.ctx.currentTime;

    switch (cat) {
      case 'organic':
        // Light rustle / foliage snip tick
        this.playFilteredNoise(now, 0.028, 'bandpass', 3200 + Math.random() * 400, 0.14, 1.8);
        break;

      case 'earth':
        // Shovel slicing into moist earth
        this.playFilteredNoise(now, 0.035, 'lowpass', 900, 0.13, 1.2);
        break;

      case 'rocky': {
        // Crisp pickaxe ping/chink on rock
        this.playFilteredNoise(now, 0.025, 'bandpass', 2600 + Math.random() * 400, 0.18, 3.0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      case 'wood': {
        // Axe chop notch bite into timber
        this.playFilteredNoise(now, 0.03, 'bandpass', 850, 0.15, 2.0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.035);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case 'sand':
      case 'gravel':
        this.playFilteredNoise(now, 0.04, 'bandpass', cat === 'gravel' ? 2200 : 1500, 0.14, 1.4);
        break;

      case 'snow':
        this.playFilteredNoise(now, 0.035, 'bandpass', 3400, 0.13, 2.0);
        break;

      case 'glass':
      case 'crystal': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(cat === 'glass' ? 2600 : 1800, now);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      default:
        this.playFilteredNoise(now, 0.03, 'bandpass', 1800, 0.12, 1.5);
        break;
    }
  }

  /**
   * Block finished breaking!
   * Rich, tactile material fracture:
   * - 'organic': crisp stem snap + leafy crunch dispersal + soft pop
   * - 'earth': deep soil clump breakup & shovel collapse
   * - 'rocky': heavy, crunchy rock fracture and scattering stone fragments
   * - 'wood': splitting timber crack with splinter release
   * - 'sand'/'gravel': granular avalanche scatter
   * - 'glass': shimmering glass fracture with falling tinkle shards
   * - 'crystal': crystalline chime burst & prismatic shatter
   * - 'snow': soft snow puff dispersal
   */
  public playBlockBreak(type: BlockSoundCategory | string = 'rocky') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const cat = this.normalizeSoundType(type);
    const now = this.ctx.currentTime;

    switch (cat) {
      case 'organic': {
        // Crisp stem snap + delicate leafy rustle + tiny organic pop
        this.playFilteredNoise(now, 0.035, 'bandpass', 2800, 0.2, 2.2);
        this.playFilteredNoise(now + 0.01, 0.09, 'lowpass', 1700, 0.15, 1.0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.035);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.045);
        break;
      }

      case 'earth': {
        // Deep, rich shovel collapse of a dirt clump breaking apart
        this.playFilteredNoise(now, 0.035, 'lowpass', 950, 0.2, 1.2);
        this.playFilteredNoise(now + 0.015, 0.12, 'lowpass', 650, 0.16, 0.9);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'rocky': {
        // Heavy, crunchy rock fracture and scattering stone fragments
        this.playFilteredNoise(now, 0.04, 'bandpass', 2200, 0.24, 2.2);
        this.playFilteredNoise(now + 0.015, 0.14, 'lowpass', 1100, 0.19, 0.9);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + Math.random() * 20, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      case 'wood': {
        // Splitting timber crack with woody splinter release
        this.playFilteredNoise(now, 0.04, 'bandpass', 1300, 0.22, 2.0);
        this.playFilteredNoise(now + 0.015, 0.12, 'lowpass', 850, 0.16, 1.0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'sand':
      case 'gravel': {
        // Granular avalanche & scatter of loose grains/pebbles
        const freq = cat === 'gravel' ? 2200 : 1300;
        this.playFilteredNoise(now, 0.14, 'bandpass', freq, 0.22, 1.1);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'glass': {
        // Crisp shattering glass fracture with falling tinkle shards
        this.playFilteredNoise(now, 0.08, 'bandpass', 3600, 0.22, 2.5);
        [2200, 3100, 4200].forEach((f, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.02);
          gain.gain.setValueAtTime(0.08, now + idx * 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.09);
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(now + idx * 0.02);
          osc.stop(now + idx * 0.02 + 0.1);
        });
        break;
      }

      case 'crystal': {
        // Multi-tone crystalline chime burst and prismatic shatter
        this.playFilteredNoise(now, 0.06, 'bandpass', 3800, 0.16, 3.0);
        [880, 1320, 1760].forEach((f, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.03);
          gain.gain.setValueAtTime(0.1, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(now + idx * 0.03);
          osc.stop(now + idx * 0.03 + 0.28);
        });
        break;
      }

      case 'snow': {
        // Soft powdery snow puff dispersal
        this.playFilteredNoise(now, 0.08, 'lowpass', 1800, 0.18, 1.2);
        break;
      }

      case 'magma': {
        // Heavy basalt rupture + fiery rumble
        this.playFilteredNoise(now, 0.12, 'bandpass', 1600, 0.2, 1.5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.17);
        break;
      }

      default: {
        this.playFilteredNoise(now, 0.04, 'bandpass', 2000, 0.2, 2.0);
        this.playFilteredNoise(now + 0.015, 0.12, 'lowpass', 1000, 0.15, 0.9);
        break;
      }
    }
  }

  /**
   * Block placement matching the material acoustics:
   * Placing wood sounds like a solid timber clack, placing stone sounds like a rock thud,
   * placing leaves/flowers sounds like a gentle rustle, placing dirt sounds like an earth pat.
   */
  public playBlockPlace(type: BlockSoundCategory | string = 'earth') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const cat = this.normalizeSoundType(type);
    const now = this.ctx.currentTime;

    switch (cat) {
      case 'organic':
        // Soft foliage rustle placement
        this.playFilteredNoise(now, 0.045, 'bandpass', 2600, 0.14, 1.5);
        break;

      case 'wood': {
        // Firm wooden block knock / carpenter tap
        this.playFilteredNoise(now, 0.03, 'bandpass', 750, 0.12, 1.8);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'rocky': {
        // Solid rock clack + firm thud
        this.playFilteredNoise(now, 0.025, 'bandpass', 1800, 0.15, 2.2);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.065);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.075);
        break;
      }

      case 'sand':
      case 'gravel':
        this.playFilteredNoise(now, 0.06, 'bandpass', cat === 'gravel' ? 2200 : 1300, 0.16, 1.3);
        break;

      case 'crystal': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case 'earth':
      default: {
        this.playFilteredNoise(now, 0.03, 'lowpass', 850, 0.12, 1.2);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
    }
  }

  /**
   * Soft, organic breath/cloth jump takeoff rather than cartoon arcade spring.
   */
  public playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.playFilteredNoise(now, 0.075, 'bandpass', 650, 0.1, 1.0);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(105, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Deep, resonant bounce with warm harmonics.
   */
  public playSuperBounce() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.22);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }


  public isMetalItem(item?: ItemDef | null): boolean {
    if (!item) return false;
    const id = (item.id || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return (
      id.includes('iron') ||
      id.includes('gold') ||
      id.includes('tin') ||
      id.includes('copper') ||
      id.includes('metal') ||
      id.includes('bucket') ||
      id.includes('shears') ||
      id.includes('re-enforced') ||
      id.includes('armor') ||
      id.includes('armour') ||
      name.includes('iron') ||
      name.includes('gold') ||
      name.includes('tin') ||
      name.includes('copper') ||
      name.includes('bucket') ||
      name.includes('shears')
    );
  }

  /**
   * Dropped item sound effect:
   * - Drop metal: dropped item for metal items
   * - Drop: dropped item sound effect with tone and pitch variation
   */
  public playDrop(item?: ItemDef | null) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const isMetal = this.isMetalItem(item);
    const key = isMetal ? 'drop_metal' : 'drop';
    const buffer = this.audioBuffers.get(key);
    if (!buffer) {
      // Fallback procedural pop
      const now = this.ctx.currentTime;
      this.playFilteredNoise(now, 0.015, 'bandpass', 1500, 0.08, 2.0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const startFreq = 480 + Math.random() * 40;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.55, now + 0.045);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.055);
      return;
    }

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    // Tone and pitch vary slightly (±7% variation)
    src.playbackRate.value = 0.94 + Math.random() * 0.12;

    const gain = this.ctx.createGain();
    // Balanced to match the exact perceived sound level of pickup
    gain.gain.setValueAtTime(this.effectsGain(isMetal ? 0.085 : 0.055), now);

    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  /**
   * Delightful, smooth acoustic wooden/bubble pop for item drops and tossing.
   */
  public playPop() {
    this.playDrop(null);
  }

  /**
   * Pick up item sound effect:
   * Tone and pitch vary slightly, boosted gain for clarity.
   */
  public playItemPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.audioBuffers.get('pickup');
    if (!buffer) {
      return;
    }

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    // Tone and pitch vary slightly (±8% variation)
    src.playbackRate.value = 0.93 + Math.random() * 0.14;

    const gain = this.ctx.createGain();
    // Gentle, pleasant, unobtrusive volume
    gain.gain.setValueAtTime(this.effectsGain(0.5), now);

    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  /**
   * Equipment sound effect for equipping armor.
   */
  public playPutOnArmour() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.audioBuffers.get('armour');
    if (!buffer) return;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.97 + Math.random() * 0.06;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.effectsGain(1.1), now);

    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  /**
   * Smooth zip-line / cable tether sound for grappling hook.
   */
  public playLaser() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.playFilteredNoise(now, 0.12, 'bandpass', 2400, 0.14, 3.0);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Warm, lush celesta / kalimba chime with harmonic overtones.
   */
  public playChime(freq: number = 587.33) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    gain1.gain.setValueAtTime(this.effectsGain(0.18), now);
    gain1.gain.exponentialRampToValueAtTime(0.0005, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    gain2.gain.setValueAtTime(this.effectsGain(0.04), now);
    gain2.gain.exponentialRampToValueAtTime(0.0005, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.4);
  }

  /**
   * Peaceful ascending pentatonic chord for milestones / discoveries.
   */
  public playBiomeDiscovered() {
    if (this.isMuted) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playChime(freq);
      }, idx * 110);
    });
  }

  /**
   * Wildlife and creature interactions.
   */
  public playEntityInteraction(soundType: 'fox' | 'cardinal' | 'sprite' | 'mimic' | 'robot' | 'growl') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (soundType === 'cardinal') {
      this.playCardinalChirp();
    } else if (soundType === 'fox') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (soundType === 'sprite') {
      [1046.5, 1318.5, 1567.98].forEach((f, idx) => {
        setTimeout(() => this.playChime(f), idx * 60);
      });
    } else if (soundType === 'mimic') {
      this.playFilteredNoise(now, 0.09, 'bandpass', 550, 0.16, 2.0);
    } else if (soundType === 'robot') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.06);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  }

  public playCardinalChirp() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(14, now);
    modGain.gain.setValueAtTime(80, now);

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(1800, now);
    carrier.frequency.exponentialRampToValueAtTime(2350, now + 0.06);
    carrier.frequency.exponentialRampToValueAtTime(1700, now + 0.14);

    carrierGain.gain.setValueAtTime(0.001, now);
    carrierGain.gain.linearRampToValueAtTime(0.12, now + 0.015);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(this.masterGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + 0.16);
    carrier.stop(now + 0.16);
  }

  /**
   * Deep realistic thunder boom with low-frequency rumble and reverberation.
   */
  public playThunder() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Initial sharp crack
    const crackOsc = this.ctx.createOscillator();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(140, now);
    crackOsc.frequency.exponentialRampToValueAtTime(35, now + 0.15);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.55, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.28);

    // 2. Heavy low rumbling bass
    const bassOsc = this.ctx.createOscillator();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(55, now);
    bassOsc.frequency.exponentialRampToValueAtTime(28, now + 2.5);

    const bassGain = this.ctx.createGain();
    bassGain.gain.setValueAtTime(0.001, now);
    bassGain.gain.linearRampToValueAtTime(0.7, now + 0.08);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);
    bassOsc.start(now);
    bassOsc.stop(now + 2.9);

    // 3. Multi-layer filtered pink noise rumble
    this.playFilteredNoise(now, 2.8, 'lowpass', 180, 0.45, 1.2);
    this.playFilteredNoise(now + 0.2, 2.5, 'bandpass', 120, 0.35, 1.8);
    this.playFilteredNoise(now + 0.5, 2.2, 'lowpass', 90, 0.4, 1.0);
  }

  public playItemDrop(item?: ItemDef | null) {
    this.playDrop(item);
  }

  public playAnvilStrike() {
    this.playBlockBreak('stone');
    this.playChime(420);
  }

  public playMoldIndent() {
    this.playStep('stone');
    this.playChime(350);
  }

  public playSizzle() {
    this.playStep('sand');
  }

  public playDoor(isOpen: boolean = true) {
    this.playStep('wood');
    this.playChime(isOpen ? 440 : 330);
  }
}

export const soundManager = new SoundFX();
