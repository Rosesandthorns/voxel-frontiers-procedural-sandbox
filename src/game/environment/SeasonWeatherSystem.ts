import * as THREE from 'three';
import { BlockType, Season, WeatherType } from '../../types';
import {
  isPlantBlock,
  isTopsnow,
  getTopsnowStage,
  getTopsnowForStage
} from '../voxel/Blocks';
import { CHUNK_D, CHUNK_H, CHUNK_W } from '../voxel/ChunkConstants';
import type { VoxelWorld } from '../voxel/VoxelWorld';

/**
 * Probability distribution for each season according to the brief:
 * - Spring: mostly rain and cloudy, occasional rainstorm
 * - Summer: sunny, rare thunderstorms, a small chance of drought
 * - Autumn: cloudy and light rain, fewer sunny days
 * - Winter: cold weather plus some cloudy days
 */
export const SEASON_WEATHER_POOLS: Record<Season, WeatherType[]> = {
  [Season.SPRING]: [WeatherType.RAIN, WeatherType.CLOUDY, WeatherType.RAINSTORM, WeatherType.SUNNY],
  [Season.SUMMER]: [WeatherType.SUNNY, WeatherType.CLOUDY, WeatherType.THUNDERSTORM, WeatherType.DROUGHT, WeatherType.RAIN],
  [Season.AUTUMN]: [WeatherType.CLOUDY, WeatherType.RAIN, WeatherType.SUNNY, WeatherType.RAINSTORM],
  [Season.WINTER]: [WeatherType.SNOWY, WeatherType.SNOWSTORM, WeatherType.EVERSNOW, WeatherType.CLOUDY]
};

export function getRandomWeatherForSeason(season: Season, excludeCurrent?: WeatherType): WeatherType {
  const pool = SEASON_WEATHER_POOLS[season];
  const candidates = excludeCurrent && pool.length > 1 ? pool.filter((w) => w !== excludeCurrent) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function pickWeatherForSeason(season: Season): WeatherType {
  const r = Math.random();
  switch (season) {
    case Season.SPRING:
      if (r < 0.45) return WeatherType.RAIN;
      if (r < 0.80) return WeatherType.CLOUDY;
      if (r < 0.95) return WeatherType.RAINSTORM;
      return WeatherType.SUNNY;

    case Season.SUMMER:
      if (r < 0.60) return WeatherType.SUNNY;
      if (r < 0.75) return WeatherType.CLOUDY;
      if (r < 0.85) return WeatherType.THUNDERSTORM;
      if (r < 0.95) return WeatherType.DROUGHT;
      return WeatherType.RAIN;

    case Season.AUTUMN:
      if (r < 0.50) return WeatherType.CLOUDY;
      if (r < 0.85) return WeatherType.RAIN;
      if (r < 0.95) return WeatherType.SUNNY;
      return WeatherType.RAINSTORM;

    case Season.WINTER:
      // Cold weather types: Snowy, Snowstorm, Eversnow
      if (r < 0.35) return WeatherType.SNOWY;
      if (r < 0.65) return WeatherType.SNOWSTORM;
      if (r < 0.80) return WeatherType.EVERSNOW;
      return WeatherType.CLOUDY;
  }
}

export class SeasonWeatherSystem {
  /**
   * Hotkey handler to change the season to spring/summer/autumn/winter and change the weather to a random one in that season.
   */
  public applySeasonHotKey(season: Season): WeatherType {
    this.season = season;
    this.dayInSeason = 1;
    const randomWeather = getRandomWeatherForSeason(season, this.currentWeather);
    this.setWeatherImmediate(randomWeather);
    return randomWeather;
  }
  // Season state (Always starts Day 1 of Spring, cycles every 7 days)
  public season: Season = Season.SPRING;
  public dayInSeason: number = 1; // 1 to 7
  public totalDays: number = 1;

  // Weather state (Default is Cloudy as per brief)
  public currentWeather: WeatherType = WeatherType.CLOUDY;
  public targetWeather: WeatherType = WeatherType.CLOUDY;
  public weatherBlend: number = 1.0; // 0 to 1 during transition
  private transitionSpeed: number = 0.15; // ~6.6 seconds for smooth crossfade

  // Weather duration & schedule (each weather lasts 0.5 to 1.5 in-game days)
  private weatherDurationDays: number = 1.0;
  private weatherProgressDays: number = 0.0;

  // Previous timeOfDay to detect day wrap-arounds
  private lastTimeOfDay: number = 0.25;

  // Topsnow accumulation & melting timers
  private snowAccumulateTimer: number = 0;
  private snowMeltTimer: number = 0;

  // Lightning / Thunder tracking
  public lightningFlash: number = 0; // 0 to 1 (visual flash intensity)
  public lightningStrikePos: THREE.Vector3 | null = null;
  private nextLightningTime: number = 10;
  private lightningTimer: number = 0;
  public onLightningStrike?: (pos: THREE.Vector3) => void;

  constructor() {
    this.currentWeather = WeatherType.CLOUDY;
    this.targetWeather = WeatherType.CLOUDY;
    this.weatherBlend = 1.0;
  }

  /**
   * Returns true if current or transitioning weather produces rain precipitation.
   */
  public isRaining(): boolean {
    return (
      this.currentWeather === WeatherType.RAIN ||
      this.currentWeather === WeatherType.RAINSTORM ||
      this.currentWeather === WeatherType.THUNDERSTORM ||
      (this.weatherBlend < 0.8 && (
        this.targetWeather === WeatherType.RAIN ||
        this.targetWeather === WeatherType.RAINSTORM ||
        this.targetWeather === WeatherType.THUNDERSTORM
      ))
    );
  }

  /**
   * Advances game time and tracks days, seasons, weather cycles, topsnow, and lightning.
   */
  public update(
    delta: number,
    timeOfDay: number,
    world: VoxelWorld | null,
    playerPos: THREE.Vector3 | null
  ) {
    // 1. Calculate timeOfDay progression
    let timeDelta = timeOfDay - this.lastTimeOfDay;
    if (timeDelta < -0.5) {
      // Wrapped around midnight (e.g. from 0.999 to 0.001)
      timeDelta += 1.0;
      this.advanceDay();
    } else if (timeDelta < 0) {
      timeDelta = 0;
    }
    this.lastTimeOfDay = timeOfDay;

    // Update thermal workstations (burn 1 fuel per day, 5x5 field & room climate)
    if (world && world.thermalWorkstationManager) {
      world.thermalWorkstationManager.update(delta, timeDelta, world);
    }

    // Track weather progress throughout the in-game day
    this.weatherProgressDays += timeDelta;
    if (this.weatherProgressDays >= this.weatherDurationDays) {
      this.weatherProgressDays = 0;
      this.weatherDurationDays = 0.5 + Math.random() * 0.8;
      this.transitionToWeather(pickWeatherForSeason(this.season));
    }

    // 2. Weather transition blending
    if (this.weatherBlend < 1.0) {
      this.weatherBlend = Math.min(1.0, this.weatherBlend + delta * this.transitionSpeed);
      if (this.weatherBlend >= 1.0) {
        this.currentWeather = this.targetWeather;
      }
    }

    // 3. Lightning & Thunder during Thunderstorm
    if (this.currentWeather === WeatherType.THUNDERSTORM || this.targetWeather === WeatherType.THUNDERSTORM) {
      this.lightningTimer += delta;
      if (this.lightningTimer >= this.nextLightningTime) {
        this.triggerLightning(playerPos);
      }
    } else {
      this.lightningTimer = 0;
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - delta * 4.5);
    }

    // 4. Topsnow accumulation & melting simulation
    if (world && playerPos) {
      this.updateTopsnowSimulation(delta, world, playerPos);
    }
  }

  /**
   * Advances the current day. After 7 days, the season changes.
   * Cycle: Spring -> Summer -> Autumn -> Winter -> Spring
   */
  public advanceDay() {
    this.dayInSeason++;
    this.totalDays++;

    if (this.dayInSeason > 7) {
      this.dayInSeason = 1;
      switch (this.season) {
        case Season.SPRING:
          this.season = Season.SUMMER;
          break;
        case Season.SUMMER:
          this.season = Season.AUTUMN;
          break;
        case Season.AUTUMN:
          this.season = Season.WINTER;
          break;
        case Season.WINTER:
          this.season = Season.SPRING;
          break;
      }
    }

    // Pick new seasonal weather on day rollover
    this.transitionToWeather(pickWeatherForSeason(this.season));
  }

  /**
   * Smoothly crossfades to a new weather type.
   */
  public transitionToWeather(newWeather: WeatherType) {
    if (this.targetWeather === newWeather && this.weatherBlend >= 1.0) return;
    this.currentWeather = this.weatherBlend >= 0.5 ? this.targetWeather : this.currentWeather;
    this.targetWeather = newWeather;
    this.weatherBlend = 0.0;
  }

  /**
   * Immediately sets the weather (for testing/settings).
   */
  public setWeatherImmediate(weather: WeatherType) {
    this.currentWeather = weather;
    this.targetWeather = weather;
    this.weatherBlend = 1.0;
  }

  /**
   * Immediately sets the season (for testing/settings).
   */
  public setSeasonImmediate(season: Season, day: number = 1) {
    this.season = season;
    this.dayInSeason = Math.max(1, Math.min(7, day));
    this.transitionToWeather(pickWeatherForSeason(season));
  }

  /**
   * Triggers a lightning strike near the player with accompanying thunder & spark.
   */
  private triggerLightning(playerPos: THREE.Vector3 | null) {
    this.lightningTimer = 0;
    this.nextLightningTime = 6 + Math.random() * 14;
    this.lightningFlash = 1.0;

    if (playerPos) {
      const offsetX = (Math.random() - 0.5) * 48;
      const offsetZ = (Math.random() - 0.5) * 48;
      this.lightningStrikePos = new THREE.Vector3(
        playerPos.x + offsetX,
        playerPos.y,
        playerPos.z + offsetZ
      );
      this.onLightningStrike?.(this.lightningStrikePos);
    }
  }

  /**
   * Topsnow buildup during Snowstorm/Eversnow and gradual melting in non-snow weather.
   */
  private updateTopsnowSimulation(
    delta: number,
    world: VoxelWorld,
    playerPos: THREE.Vector3
  ) {
    const isEversnow = this.currentWeather === WeatherType.EVERSNOW || this.targetWeather === WeatherType.EVERSNOW;
    const isSnowstorm = this.currentWeather === WeatherType.SNOWSTORM || this.targetWeather === WeatherType.SNOWSTORM;
    const isAccumulating = isEversnow || isSnowstorm;

    if (isAccumulating) {
      // Accumulate snow layers
      const interval = isEversnow ? 0.45 : 0.85;
      this.snowAccumulateTimer += delta;

      if (this.snowAccumulateTimer >= interval) {
        this.snowAccumulateTimer = 0;
        const columnsPerTick = isEversnow ? 4 : 2;
        const maxStage = isEversnow ? 5 : 2; // Snowstorm causes a light layer, Eversnow builds up higher

        for (let i = 0; i < columnsPerTick; i++) {
          const rx = Math.floor(playerPos.x + (Math.random() - 0.5) * 44);
          const rz = Math.floor(playerPos.z + (Math.random() - 0.5) * 44);
          this.depositTopsnowAtColumn(world, rx, rz, maxStage);
        }
      }
    } else {
      // Melting: "will melt soon after"
      this.snowMeltTimer += delta;
      const meltInterval = 0.5;

      if (this.snowMeltTimer >= meltInterval) {
        this.snowMeltTimer = 0;
        const meltsPerTick = 3;

        for (let i = 0; i < meltsPerTick; i++) {
          const rx = Math.floor(playerPos.x + (Math.random() - 0.5) * 48);
          const rz = Math.floor(playerPos.z + (Math.random() - 0.5) * 48);
          this.meltTopsnowAtColumn(world, rx, rz);
        }
      }
    }
  }

  /**
   * Deposits or increases topsnow in a column, burying plants if encountered.
   */
  private depositTopsnowAtColumn(world: VoxelWorld, wx: number, wz: number, maxStage: number) {
    // Prevent snow from gathering if within 5x5 radius of an active Heater or enclosed heated room
    if (world.thermalWorkstationManager?.isSnowPreventedAt(wx, wz)) {
      return;
    }

    // Scan down from above player to find the top solid or plant block
    const startY = Math.min(CHUNK_H - 2, Math.max(10, Math.floor(130)));
    for (let wy = startY; wy >= 5; wy--) {
      const block = world.getBlock(wx, wy, wz);
      if (block === BlockType.AIR) continue;

      // Found top block
      if (isTopsnow(block)) {
        const curStage = getTopsnowStage(block);
        if (curStage < maxStage) {
          world.setBlock(wx, wy, wz, getTopsnowForStage(curStage + 1));
        }
        return;
      }

      if (isPlantBlock(block)) {
        // "it can go on tiles with plants and effectively buries them until the layer melts away."
        world.setBuriedPlant(wx, wy, wz, block);
        world.setBlock(wx, wy, wz, BlockType.TOPSNOW_1);
        return;
      }

      // If top block is solid and air is above it, place topsnow on top
      if (wy + 1 < CHUNK_H && world.getBlock(wx, wy + 1, wz) === BlockType.AIR) {
        world.setBlock(wx, wy + 1, wz, BlockType.TOPSNOW_1);
      }
      return;
    }
  }

  /**
   * Melts topsnow in a column, restoring any buried plant when stage 1 melts away.
   */
  private meltTopsnowAtColumn(world: VoxelWorld, wx: number, wz: number) {
    // Prevent snow from melting if within 5x5 radius of an active Cooler or enclosed cooled room
    if (world.thermalWorkstationManager?.isSnowMeltPreventedAt(wx, wz)) {
      return;
    }

    const startY = Math.min(CHUNK_H - 2, Math.max(10, Math.floor(130)));
    for (let wy = startY; wy >= 5; wy--) {
      const block = world.getBlock(wx, wy, wz);
      if (block === BlockType.AIR) continue;

      if (isTopsnow(block)) {
        const stage = getTopsnowStage(block);
        if (stage > 1) {
          // Decrement stage
          world.setBlock(wx, wy, wz, getTopsnowForStage(stage - 1));
        } else {
          // Stage 1 melts completely away!
          const buried = world.getBuriedPlant(wx, wy, wz);
          if (buried) {
            world.setBlock(wx, wy, wz, buried);
            world.clearBuriedPlant(wx, wy, wz);
          } else {
            world.setBlock(wx, wy, wz, BlockType.AIR);
          }
        }
        return;
      }
      return;
    }
  }
}
