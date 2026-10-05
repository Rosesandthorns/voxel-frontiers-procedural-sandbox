import * as THREE from 'three';
import { BlockType, WeatherType, BiomeType } from '../../types';
import { soundManager } from '../audio/SoundFX';
import {
  BLOCK_DEFS,
  isLeavesBlock,
  isTopsnow,
  getTopsnowHeight,
  isWaterBlock,
  isWaterSource,
  getWaterLevel
} from '../voxel/Blocks';
import { CHUNK_H } from '../voxel/ChunkConstants';
import type { VoxelWorld } from '../voxel/VoxelWorld';

interface GroundFireParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class WeatherEffects {
  public scene: THREE.Scene;

  // Rain particle system (using line segments for realistic motion-blurred streaks)
  private rainCount: number = 2200;
  private rainGeo: THREE.BufferGeometry;
  private rainMat: THREE.LineBasicMaterial;
  private rainLines: THREE.LineSegments;
  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;

  // Player position tracking for smooth world-space precipitation
  private lastPlayerPos: THREE.Vector3 = new THREE.Vector3();
  private hasInitializedPlayerPos: boolean = false;

  // Fast direct-mapped cache for blocking height (4096 columns)
  private heightCacheKeys: Int32Array = new Int32Array(4096).fill(0x7fffffff);
  private heightCacheVals: Float32Array = new Float32Array(4096);
  private cacheTimer: number = 0;
  private lastModifiedSize: number = 0;

  // Splash particle system on rain impact
  private splashCount: number = 300;
  private splashGeo: THREE.BufferGeometry;
  private splashMat: THREE.PointsMaterial;
  private splashPoints: THREE.Points;
  private splashPositions: Float32Array;
  private splashVelocities: Float32Array;
  private splashLifespans: Float32Array;
  private splashCursor: number = 0;
  private splashTexture: THREE.CanvasTexture;

  // Snow particle system
  private snowCount: number = 2400;
  private snowGeo: THREE.BufferGeometry;
  private snowMat: THREE.PointsMaterial;
  private snowPoints: THREE.Points;
  private snowPositions: Float32Array;
  private snowTexture: THREE.CanvasTexture;

  // Drought dust/heat motes
  private droughtCount: number = 300;
  private droughtGeo: THREE.BufferGeometry;
  private droughtMat: THREE.PointsMaterial;
  private droughtPoints: THREE.Points;
  private droughtPositions: Float32Array;

  // Lightning Bolt Mesh
  private lightningGroup: THREE.Group;
  private lightningLines: THREE.LineSegments | null = null;
  private lightningLifetime: number = 0;

  // Extinguishable small fire particles from lightning strike:
  // "while small fires may start, they will be quickly snuffed by the rain"
  private fireParticles: GroundFireParticle[] = [];
  private firePoints: THREE.Points;
  private fireGeo: THREE.BufferGeometry;
  private fireMat: THREE.PointsMaterial;
  private firePositions: Float32Array;
  private fireColors: Float32Array;
  private maxFireParticles: number = 150;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Setup Rain System (Line streaks)
    this.rainGeo = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 6); // 2 vertices per line streak
    this.rainVelocities = new Float32Array(this.rainCount);

    const rainDropLength = 0.9;
    for (let i = 0; i < this.rainCount; i++) {
      const x = (Math.random() - 0.5) * 48;
      const y = Math.random() * 32 - 4;
      const z = (Math.random() - 0.5) * 48;
      const v = 32 + Math.random() * 12;

      this.rainPositions[i * 6] = x;
      this.rainPositions[i * 6 + 1] = y;
      this.rainPositions[i * 6 + 2] = z;

      this.rainPositions[i * 6 + 3] = x + 0.12;
      this.rainPositions[i * 6 + 4] = y - rainDropLength;
      this.rainPositions[i * 6 + 5] = z + 0.08;

      this.rainVelocities[i] = v;
    }

    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0x90bfe8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.visible = false;
    scene.add(this.rainLines);

    // 2. Setup Rain Splash System
    this.splashTexture = new THREE.CanvasTexture(this.createSplashCanvas());
    this.splashGeo = new THREE.BufferGeometry();
    this.splashPositions = new Float32Array(this.splashCount * 3).fill(-9999);
    this.splashVelocities = new Float32Array(this.splashCount * 3);
    this.splashLifespans = new Float32Array(this.splashCount);

    this.splashGeo.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));
    this.splashMat = new THREE.PointsMaterial({
      map: this.splashTexture,
      color: 0xc8e0f8,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    this.splashPoints = new THREE.Points(this.splashGeo, this.splashMat);
    this.splashPoints.frustumCulled = false;
    this.splashPoints.visible = false;
    scene.add(this.splashPoints);

    // 3. Setup Snow Particle System
    this.snowTexture = new THREE.CanvasTexture(this.createSnowflakeCanvas());
    this.snowGeo = new THREE.BufferGeometry();
    this.snowPositions = new Float32Array(this.snowCount * 3);

    for (let i = 0; i < this.snowCount; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 52;
      this.snowPositions[i * 3 + 1] = Math.random() * 32 - 4;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 52;
    }

    this.snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snowMat = new THREE.PointsMaterial({
      map: this.snowTexture,
      color: 0xffffff,
      size: 0.14,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    this.snowPoints = new THREE.Points(this.snowGeo, this.snowMat);
    this.snowPoints.visible = false;
    scene.add(this.snowPoints);

    // 4. Setup Drought Heat Motes
    this.droughtGeo = new THREE.BufferGeometry();
    this.droughtPositions = new Float32Array(this.droughtCount * 3);
    for (let i = 0; i < this.droughtCount; i++) {
      this.droughtPositions[i * 3] = (Math.random() - 0.5) * 40;
      this.droughtPositions[i * 3 + 1] = Math.random() * 20;
      this.droughtPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    this.droughtGeo.setAttribute('position', new THREE.BufferAttribute(this.droughtPositions, 3));
    this.droughtMat = new THREE.PointsMaterial({
      color: 0xffd28a,
      size: 0.12,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.droughtPoints = new THREE.Points(this.droughtGeo, this.droughtMat);
    this.droughtPoints.visible = false;
    scene.add(this.droughtPoints);

    // 5. Setup Lightning Group
    this.lightningGroup = new THREE.Group();
    scene.add(this.lightningGroup);

    // 6. Setup Small Extinguishable Fire Particles
    this.fireGeo = new THREE.BufferGeometry();
    this.firePositions = new Float32Array(this.maxFireParticles * 3);
    this.fireColors = new Float32Array(this.maxFireParticles * 3);
    this.fireGeo.setAttribute('position', new THREE.BufferAttribute(this.firePositions, 3));
    this.fireGeo.setAttribute('color', new THREE.BufferAttribute(this.fireColors, 3));

    this.fireMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.firePoints = new THREE.Points(this.fireGeo, this.fireMat);
    this.firePoints.visible = false;
    scene.add(this.firePoints);
  }

  private createSnowflakeCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, 32, 32);
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(225, 240, 255, 0.4)');
    grad.addColorStop(1, 'rgba(220, 235, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  private createSplashCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, 16, 16);
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 7);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.4, 'rgba(190, 225, 255, 0.7)');
    grad.addColorStop(1, 'rgba(160, 205, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  /**
   * Spawns subtle splash droplets when rain strikes a solid block or water surface.
   */
  public spawnRainSplash(x: number, y: number, z: number, isHeavy: boolean) {
    const count = isHeavy ? 2 : 1;
    for (let c = 0; c < count; c++) {
      const idx = this.splashCursor;
      this.splashCursor = (this.splashCursor + 1) % this.splashCount;

      const pIdx = idx * 3;
      this.splashPositions[pIdx] = x + (Math.random() - 0.5) * 0.35;
      this.splashPositions[pIdx + 1] = y + 0.04;
      this.splashPositions[pIdx + 2] = z + (Math.random() - 0.5) * 0.35;

      this.splashVelocities[pIdx] = (Math.random() - 0.5) * 0.9;
      this.splashVelocities[pIdx + 1] = 0.8 + Math.random() * 0.8;
      this.splashVelocities[pIdx + 2] = (Math.random() - 0.5) * 0.9;

      this.splashLifespans[idx] = 0.12 + Math.random() * 0.08;
    }
  }

  /**
   * Computes the height at which rain stops in a given world column.
   * Requirement: "rain shouldnt travel throuigh solid blocks other than leaves"
   * - Leaves are an explicit exception: rain CAN travel through leaves.
   * - Air, flowers, grass, saplings, and mushrooms do not block rain.
   * - Solid blocks (wood, stone, dirt, glass, cobble, brick, etc.), water, and topsnow block rain.
   */
  public getRainStopHeight(world: VoxelWorld | null, wx: number, wz: number): number {
    if (!world) return 0;

    const ix = Math.floor(wx);
    const iz = Math.floor(wz);

    // 4096-slot direct-mapped hash cache
    const cx = (ix & 63);
    const cz = (iz & 63);
    const cacheIdx = cx + (cz << 6);
    const cacheKey = (ix << 16) ^ (iz & 0xffff);

    if (this.heightCacheKeys[cacheIdx] === cacheKey) {
      return this.heightCacheVals[cacheIdx];
    }

    const chunkX = ix >> 4;
    const chunkZ = iz >> 4;
    const chunk = world.chunks.get(`${chunkX},${chunkZ}`);

    if (!chunk || !chunk.voxels || chunk.voxels.length === 0) {
      return 0;
    }

    const localX = ix & 15;
    const localZ = iz & 15;
    const baseIdx = localX + (localZ << 4);
    const startY = Math.min(CHUNK_H - 1, Math.max(0, (chunk.maxY || 0) + 1));
    const voxels = chunk.voxels;
    const hasMods = world.modifiedBlocks.size > 0;

    let stopH = 0;
    for (let wy = startY; wy >= 0; wy--) {
      let block: BlockType;
      if (hasMods) {
        const mod = world.modifiedBlocks.get(`${ix},${wy},${iz}`);
        block = mod !== undefined ? mod : voxels[baseIdx + (wy << 8)];
      } else {
        block = voxels[baseIdx + (wy << 8)];
      }

      if (block === BlockType.AIR) continue;

      // EXCEPTION: "other than leaves" -> rain passes freely through all tree leaves!
      if (isLeavesBlock(block)) {
        continue;
      }

      // Water surface blocks rain
      if (isWaterBlock(block)) {
        const waterFraction = isWaterSource(block) ? 1.0 : (getWaterLevel(block) || 8) / 8;
        stopH = wy + waterFraction;
        break;
      }

      // Topsnow slab blocks rain
      if (isTopsnow(block)) {
        stopH = wy + getTopsnowHeight(block);
        break;
      }

      // Solid blocks other than leaves block rain!
      const def = BLOCK_DEFS[block];
      if (def?.solid) {
        stopH = wy + 1.0;
        break;
      }
    }

    this.heightCacheKeys[cacheIdx] = cacheKey;
    this.heightCacheVals[cacheIdx] = stopH;
    return stopH;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    weather: WeatherType,
    weatherBlend: number,
    lightningStrikePos: THREE.Vector3 | null,
    world: VoxelWorld | null = null
  ) {
    // 1. Rain / Rainstorm / Thunderstorm updates
    const isRain =
      weather === WeatherType.RAIN ||
      weather === WeatherType.RAINSTORM ||
      weather === WeatherType.THUNDERSTORM;

    // Update active splash droplets
    if (this.splashPoints) {
      let activeSplashes = false;
      for (let i = 0; i < this.splashCount; i++) {
        if (this.splashLifespans[i] > 0) {
          activeSplashes = true;
          this.splashLifespans[i] -= delta;
          const pIdx = i * 3;
          if (this.splashLifespans[i] <= 0) {
            this.splashPositions[pIdx + 1] = -9999;
          } else {
            this.splashPositions[pIdx] += this.splashVelocities[pIdx] * delta;
            this.splashPositions[pIdx + 1] += this.splashVelocities[pIdx + 1] * delta;
            this.splashPositions[pIdx + 2] += this.splashVelocities[pIdx + 2] * delta;
            this.splashVelocities[pIdx + 1] -= 9.8 * delta; // Gravity
          }
        }
      }
      this.splashPoints.visible = isRain && activeSplashes;
      if (this.splashPoints.visible) {
        (this.splashGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    if (isRain) {
      this.rainLines.visible = true;
      this.rainLines.position.copy(playerPos);

      const isHeavy = weather === WeatherType.RAINSTORM || weather === WeatherType.THUNDERSTORM;
      const targetOpacity = isHeavy ? 0.75 : 0.45;
      this.rainMat.opacity = targetOpacity * Math.min(1.0, weatherBlend);
      this.rainMat.color.setHex(isHeavy ? 0x759dbd : 0x90bfe8);

      const fallMultiplier = isHeavy ? 1.4 : 1.0;
      const windX = isHeavy ? 4.5 : 1.8;
      const windZ = isHeavy ? 2.5 : 0.9;
      const dropLen = isHeavy ? 1.4 : 0.85;

      const pos = this.rainGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      // Motion compensation so rain stays steady in world space
      let deltaPx = 0;
      let deltaPy = 0;
      let deltaPz = 0;
      if (this.hasInitializedPlayerPos) {
        deltaPx = playerPos.x - this.lastPlayerPos.x;
        deltaPy = playerPos.y - this.lastPlayerPos.y;
        deltaPz = playerPos.z - this.lastPlayerPos.z;
      } else {
        this.hasInitializedPlayerPos = true;
      }
      this.lastPlayerPos.copy(playerPos);

      // Periodically flush cache (every ~1.5s or on block modification)
      this.cacheTimer += delta;
      if (this.cacheTimer >= 1.5 || (world && world.modifiedBlocks.size !== this.lastModifiedSize)) {
        this.cacheTimer = 0;
        this.lastModifiedSize = world ? world.modifiedBlocks.size : 0;
        this.heightCacheKeys.fill(0x7fffffff);
      }

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        const speed = this.rainVelocities[i] * fallMultiplier;
        const dy = speed * delta;
        const dx = windX * delta;
        const dz = windZ * delta;

        // Apply motion and compensate for player movement
        arr[idx] += dx - deltaPx;
        arr[idx + 1] -= dy + deltaPy;
        arr[idx + 2] += dz - deltaPz;

        // Horizontal boundary wrap within 48m cube around player
        if (arr[idx] > 24) arr[idx] -= 48;
        else if (arr[idx] < -24) arr[idx] += 48;

        if (arr[idx + 2] > 24) arr[idx + 2] -= 48;
        else if (arr[idx + 2] < -24) arr[idx + 2] += 48;

        // World coordinates of drop
        const worldX = playerPos.x + arr[idx];
        const worldTailY = playerPos.y + arr[idx + 1];
        const worldZ = playerPos.z + arr[idx + 2];

        // Query solid obstruction height in this column
        const stopH = this.getRainStopHeight(world, worldX, worldZ);
        const relStopH = stopH - playerPos.y;

        const rawTipRelY = arr[idx + 1] - dropLen;
        const worldTipY = playerPos.y + rawTipRelY;

        // Check if the drop has completely landed on or is below the solid block
        // OR if it's below the bottom of our simulation box (-4 relative to player)
        if (worldTailY <= stopH || arr[idx + 1] < -4) {
          // If drop landed on a visible solid surface, splash!
          if (world && worldTailY <= stopH + 1.2 && stopH > 0) {
            this.spawnRainSplash(worldX, stopH + 0.03, worldZ, isHeavy);
          }

          // Respawn drop at top of rain box
          arr[idx] = (Math.random() - 0.5) * 48;
          arr[idx + 2] = (Math.random() - 0.5) * 48;
          const newWorldX = playerPos.x + arr[idx];
          const newWorldZ = playerPos.z + arr[idx + 2];
          const newStopH = this.getRainStopHeight(world, newWorldX, newWorldZ);

          const spawnRelY = 24 + Math.random() * 8;
          const spawnWorldY = playerPos.y + spawnRelY;

          // Check if column is in a biome where rain occurs (not desert or arctic)
          const dropBiome = world?.generator ? world.generator.getSubBiomeAt(newWorldX, newWorldZ, playerPos.y) : null;
          const isDropInRainBiome = !dropBiome || (
            !dropBiome.isDesert &&
            dropBiome.category !== 'desert' &&
            dropBiome.mainBiome !== BiomeType.THE_DESERT &&
            !dropBiome.isArctic &&
            dropBiome.category !== 'arctic' &&
            !dropBiome.isEversnow &&
            dropBiome.mainBiome !== BiomeType.ARCTIC &&
            dropBiome.mainBiome !== BiomeType.BOREAL_PEAKS
          );

          if (spawnWorldY <= newStopH || !isDropInRainBiome) {
            // Entire column at this height is covered by solid blocks/roof/cave above, or in a dry/cold biome!
            // Hide this drop by setting both endpoints far out of view
            arr[idx + 1] = -9999;
            arr[idx + 4] = -9999;
          } else {
            arr[idx + 1] = spawnRelY;
            arr[idx + 3] = arr[idx] + (windX * 0.035);
            arr[idx + 4] = arr[idx + 1] - dropLen;
            arr[idx + 5] = arr[idx + 2] + (windZ * 0.035);
          }
          continue;
        }

        // Drop is falling above the solid block.
        // If the tip is reaching into the solid block, clamp tip to stop surface so it doesn't poke through ceiling/floor
        let tipRelY = rawTipRelY;
        if (worldTipY < stopH) {
          tipRelY = relStopH;
          if (world && Math.random() < 0.12) {
            this.spawnRainSplash(worldX, stopH + 0.03, worldZ, isHeavy);
          }
        }

        arr[idx + 3] = arr[idx] + (windX * 0.035);
        arr[idx + 4] = tipRelY;
        arr[idx + 5] = arr[idx + 2] + (windZ * 0.035);
      }
      pos.needsUpdate = true;
    } else {
      if (this.rainLines.visible) {
        this.rainLines.visible = false;
        this.rainMat.opacity = 0;
      }
    }

    // 2. Snow / Snowstorm / Eversnow updates
    const isSnow =
      weather === WeatherType.SNOWY ||
      weather === WeatherType.SNOWSTORM ||
      weather === WeatherType.EVERSNOW;

    if (isSnow) {
      this.snowPoints.visible = true;
      this.snowPoints.position.copy(playerPos);

      let fallSpeed = 0.9;
      let windX = 0.4;
      let windZ = 0.2;
      let snowSize = 0.11;
      let snowOpacity = 0.5;

      if (weather === WeatherType.SNOWY) {
        fallSpeed = 0.7;
        windX = 0.2;
        windZ = 0.15;
        snowSize = 0.09;
        snowOpacity = 0.45;
      } else if (weather === WeatherType.SNOWSTORM) {
        fallSpeed = 1.6;
        windX = 2.2;
        windZ = 1.2;
        snowSize = 0.15;
        snowOpacity = 0.75;
      } else if (weather === WeatherType.EVERSNOW) {
        fallSpeed = 2.5;
        windX = 5.0;
        windZ = 2.8;
        snowSize = 0.19;
        snowOpacity = 0.92;
      }

      this.snowMat.size = snowSize;
      this.snowMat.opacity = snowOpacity * Math.min(1.0, weatherBlend);

      const pos = this.snowGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      // Delta compensation for player movement
      let deltaPx = 0;
      let deltaPy = 0;
      let deltaPz = 0;
      if (this.hasInitializedPlayerPos) {
        deltaPx = playerPos.x - this.lastPlayerPos.x;
        deltaPy = playerPos.y - this.lastPlayerPos.y;
        deltaPz = playerPos.z - this.lastPlayerPos.z;
      }

      for (let i = 0; i < this.snowCount; i++) {
        const idx = i * 3;
        const flutter = Math.sin(Date.now() * 0.003 + i * 0.5);

        arr[idx] += (windX + flutter * 0.4) * delta - deltaPx;
        arr[idx + 1] -= (fallSpeed + Math.sin(i * 1.8) * 0.2) * delta + deltaPy;
        arr[idx + 2] += (windZ + Math.cos(Date.now() * 0.003 + i * 0.5) * 0.4) * delta - deltaPz;

        if (arr[idx] > 26) arr[idx] -= 52;
        else if (arr[idx] < -26) arr[idx] += 52;

        if (arr[idx + 2] > 26) arr[idx + 2] -= 52;
        else if (arr[idx + 2] < -26) arr[idx + 2] += 52;

        const worldX = playerPos.x + arr[idx];
        const worldY = playerPos.y + arr[idx + 1];
        const worldZ = playerPos.z + arr[idx + 2];
        const stopH = this.getRainStopHeight(world, worldX, worldZ);

        if (worldY <= stopH || arr[idx + 1] < -4) {
          arr[idx] = (Math.random() - 0.5) * 52;
          arr[idx + 2] = (Math.random() - 0.5) * 52;
          const newWorldX = playerPos.x + arr[idx];
          const newWorldZ = playerPos.z + arr[idx + 2];
          const newStopH = this.getRainStopHeight(world, newWorldX, newWorldZ);

          const spawnRelY = 24 + Math.random() * 8;
          const flakeBiome = world?.generator ? world.generator.getSubBiomeAt(newWorldX, newWorldZ, playerPos.y) : null;
          const isFlakeInSnowBiome = flakeBiome && (
            flakeBiome.isArctic ||
            flakeBiome.category === 'arctic' ||
            flakeBiome.isEversnow ||
            flakeBiome.id === 'eversnow' ||
            flakeBiome.id === 'everfrost_forest' ||
            flakeBiome.id === 'frostbite_peaks' ||
            flakeBiome.id === 'snowy_shoreline' ||
            flakeBiome.id === 'eversnow_bluffs' ||
            flakeBiome.mainBiome === BiomeType.ARCTIC ||
            flakeBiome.mainBiome === BiomeType.BOREAL_PEAKS
          );

          if (playerPos.y + spawnRelY <= newStopH || !isFlakeInSnowBiome) {
            arr[idx + 1] = -9999;
          } else {
            arr[idx + 1] = spawnRelY;
          }
        }
      }
      pos.needsUpdate = true;
    } else {
      if (this.snowPoints.visible) {
        this.snowPoints.visible = false;
        this.snowMat.opacity = 0;
      }
    }

    // 3. Drought Heat Motes
    if (weather === WeatherType.DROUGHT) {
      this.droughtPoints.visible = true;
      this.droughtPoints.position.copy(playerPos);
      this.droughtMat.opacity = 0.4 * Math.min(1.0, weatherBlend);

      const pos = this.droughtGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < this.droughtCount; i++) {
        const idx = i * 3;
        arr[idx + 1] += 0.8 * delta; // rise up gently
        arr[idx] += Math.sin(Date.now() * 0.001 + i) * 0.3 * delta;
        if (arr[idx + 1] > 20) {
          arr[idx] = (Math.random() - 0.5) * 40;
          arr[idx + 1] = 0.2;
          arr[idx + 2] = (Math.random() - 0.5) * 40;
        }
      }
      pos.needsUpdate = true;
    } else {
      if (this.droughtPoints.visible) {
        this.droughtPoints.visible = false;
        this.droughtMat.opacity = 0;
      }
    }

    // 4. Lightning Bolt Lifetime and Fade
    if (this.lightningLifetime > 0) {
      this.lightningLifetime -= delta;
      if (this.lightningLifetime <= 0 && this.lightningLines) {
        this.lightningGroup.remove(this.lightningLines);
        this.lightningLines.geometry.dispose();
        (this.lightningLines.material as THREE.Material).dispose();
        this.lightningLines = null;
      }
    }

    // 5. Extinguishable Ground Fire Particles from Lightning
    // "while small fires may start, they will be quickly snuffed by the rain"
    if (this.fireParticles.length > 0) {
      this.firePoints.visible = true;
      const posAttr = this.fireGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = this.fireGeo.getAttribute('color') as THREE.BufferAttribute;
      const pArr = posAttr.array as Float32Array;
      const cArr = colAttr.array as Float32Array;

      for (let i = this.fireParticles.length - 1; i >= 0; i--) {
        const fp = this.fireParticles[i];
        fp.life += delta;

        // Snuffed quickly by rain (decay faster if rain is active)
        const decayRate = isRain ? 1.6 : 0.8;
        fp.pos.addScaledVector(fp.vel, delta);
        fp.vel.y += 1.2 * delta; // flames rise upward

        if (fp.life >= fp.maxLife / decayRate) {
          this.fireParticles.splice(i, 1);
          continue;
        }

        const pIdx = i * 3;
        pArr[pIdx] = fp.pos.x;
        pArr[pIdx + 1] = fp.pos.y;
        pArr[pIdx + 2] = fp.pos.z;

        const progress = fp.life / (fp.maxLife / decayRate);
        // Fire shifts from yellow-orange to smoky ash as it is snuffed out by rain
        const r = 1.0 - progress * 0.4;
        const g = Math.max(0, 0.7 - progress * 0.65);
        const b = progress > 0.6 ? 0.3 : 0.1;
        cArr[pIdx] = r;
        cArr[pIdx + 1] = g;
        cArr[pIdx + 2] = b;
      }

      this.fireGeo.setDrawRange(0, this.fireParticles.length);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    } else {
      if (this.firePoints.visible) {
        this.firePoints.visible = false;
      }
    }
  }

  /**
   * Spawns a procedural 3D zig-zag lightning bolt from sky to ground.
   * Plays realistic audio and starts small fires that are quickly snuffed by rain.
   */
  public triggerLightningStrike(strikePos: THREE.Vector3) {
    // 1. Play thunder boom
    soundManager.playThunder();

    // 2. Generate jagged zig-zag bolt geometry
    if (this.lightningLines) {
      this.lightningGroup.remove(this.lightningLines);
      this.lightningLines.geometry.dispose();
      (this.lightningLines.material as THREE.Material).dispose();
      this.lightningLines = null;
    }

    const points: THREE.Vector3[] = [];
    const skyY = strikePos.y + 110 + Math.random() * 20;
    const startPoint = new THREE.Vector3(
      strikePos.x + (Math.random() - 0.5) * 30,
      skyY,
      strikePos.z + (Math.random() - 0.5) * 30
    );

    let cur = startPoint.clone();
    const segments = 18;
    const dy = (startPoint.y - strikePos.y) / segments;

    for (let s = 0; s < segments; s++) {
      const nextY = cur.y - dy;
      const frac = (s + 1) / segments;
      const targetAtFrac = startPoint.clone().lerp(strikePos, frac);

      const jitter = (1 - frac) * 5.5 + 1.2;
      const nextX = targetAtFrac.x + (Math.random() - 0.5) * jitter;
      const nextZ = targetAtFrac.z + (Math.random() - 0.5) * jitter;

      const next = new THREE.Vector3(nextX, nextY, nextZ);
      points.push(cur.clone(), next.clone());

      // Occasional branch
      if (s > 4 && s < 14 && Math.random() < 0.4) {
        const branchEnd = cur.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            -dy * (1.2 + Math.random()),
            (Math.random() - 0.5) * 12
          )
        );
        points.push(cur.clone(), branchEnd);
      }

      cur = next;
    }
    // Connect to ground strike point
    points.push(cur.clone(), strikePos.clone());

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xebf8ff,
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    this.lightningLines = new THREE.LineSegments(geom, mat);
    this.lightningGroup.add(this.lightningLines);
    this.lightningLifetime = 0.14; // Visible for ~140ms

    // 3. Spawn small ground spark / fire particles at the strike location
    // "while small fires may start, they will be quickly snuffed by the rain"
    const count = 30 + Math.floor(Math.random() * 25);
    for (let i = 0; i < count; i++) {
      if (this.fireParticles.length >= this.maxFireParticles) break;
      this.fireParticles.push({
        pos: new THREE.Vector3(
          strikePos.x + (Math.random() - 0.5) * 1.8,
          strikePos.y + 0.2 + Math.random() * 0.3,
          strikePos.z + (Math.random() - 0.5) * 1.8
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          0.8 + Math.random() * 1.6,
          (Math.random() - 0.5) * 1.5
        ),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.6, // Short lifespan, quickly snuffed
        size: 0.2 + Math.random() * 0.15,
        color: new THREE.Color(0xffaa22)
      });
    }
  }

  public destroy() {
    this.scene.remove(this.rainLines);
    this.rainGeo.dispose();
    this.rainMat.dispose();

    if (this.splashPoints) {
      this.scene.remove(this.splashPoints);
      this.splashGeo.dispose();
      this.splashMat.dispose();
      this.splashTexture.dispose();
    }

    this.scene.remove(this.snowPoints);
    this.snowGeo.dispose();
    this.snowMat.dispose();
    this.snowTexture.dispose();

    this.scene.remove(this.droughtPoints);
    this.droughtGeo.dispose();
    this.droughtMat.dispose();

    if (this.lightningLines) {
      this.lightningGroup.remove(this.lightningLines);
      this.lightningLines.geometry.dispose();
      (this.lightningLines.material as THREE.Material).dispose();
    }
    this.scene.remove(this.lightningGroup);

    this.scene.remove(this.firePoints);
    this.fireGeo.dispose();
    this.fireMat.dispose();
  }
}
