import * as THREE from 'three';
import { VerdantSubBiomeDef } from '../voxel/SubBiomeTypes';

export interface SkyColors {
  skyColor: THREE.Color;
  ambientIntensity: number;
  starOpacity: number;
}

interface SkyKeyframe {
  time: number;
  skyColor: number;
  fogColor: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunIntensity: number;
  sunColor: number;
  moonIntensity: number;
  moonColor: number;
  starOpacity: number;
}

// 24-hour continuous gradient timeline
const SKY_TIMELINE: SkyKeyframe[] = [
  {
    // Midnight (00:00)
    time: 0.0,
    skyColor: 0x090e1f,
    fogColor: 0x0b1224,
    ambientColor: 0x243654,
    ambientIntensity: 0.32,
    hemiSkyColor: 0x142038,
    hemiGroundColor: 0x090f1c,
    hemiIntensity: 0.25,
    sunIntensity: 0.0,
    sunColor: 0xffeedd,
    moonIntensity: 0.44,
    moonColor: 0xc4dbfa,
    starOpacity: 0.95
  },
  {
    // Late Night (03:45)
    time: 0.16,
    skyColor: 0x0c1228,
    fogColor: 0x0f162e,
    ambientColor: 0x263858,
    ambientIntensity: 0.34,
    hemiSkyColor: 0x16223d,
    hemiGroundColor: 0x0b1120,
    hemiIntensity: 0.26,
    sunIntensity: 0.0,
    sunColor: 0xff8844,
    moonIntensity: 0.40,
    moonColor: 0xb5cded,
    starOpacity: 0.90
  },
  {
    // Astronomical Dawn / Deep Twilight (04:45)
    time: 0.20,
    skyColor: 0x1d1e44,
    fogColor: 0x271e3d,
    ambientColor: 0x3a3860,
    ambientIntensity: 0.40,
    hemiSkyColor: 0x28264e,
    hemiGroundColor: 0x121022,
    hemiIntensity: 0.32,
    sunIntensity: 0.05,
    sunColor: 0xff5a28,
    moonIntensity: 0.25,
    moonColor: 0xa8c4e6,
    starOpacity: 0.65
  },
  {
    // Nautical Dawn / Coral Rose Horizon (05:30)
    time: 0.23,
    skyColor: 0x563856,
    fogColor: 0x8a4556,
    ambientColor: 0x684a64,
    ambientIntensity: 0.52,
    hemiSkyColor: 0x64405f,
    hemiGroundColor: 0x251820,
    hemiIntensity: 0.42,
    sunIntensity: 0.35,
    sunColor: 0xff6c36,
    moonIntensity: 0.10,
    moonColor: 0x9cb8d9,
    starOpacity: 0.28
  },
  {
    // Sunrise / Golden Dawn (06:00)
    time: 0.25,
    skyColor: 0xf38558,
    fogColor: 0xf9a171,
    ambientColor: 0xffcb9e,
    ambientIntensity: 0.68,
    hemiSkyColor: 0xf59871,
    hemiGroundColor: 0x482f27,
    hemiIntensity: 0.55,
    sunIntensity: 0.85,
    sunColor: 0xffaa5e,
    moonIntensity: 0.0,
    moonColor: 0x8eaac9,
    starOpacity: 0.04
  },
  {
    // Golden Early Morning (06:45)
    time: 0.28,
    skyColor: 0x9cd2f8,
    fogColor: 0xc1e2fa,
    ambientColor: 0xffeed6,
    ambientIntensity: 0.78,
    hemiSkyColor: 0x9cd2f8,
    hemiGroundColor: 0x403828,
    hemiIntensity: 0.65,
    sunIntensity: 1.15,
    sunColor: 0xffdfa8,
    moonIntensity: 0.0,
    moonColor: 0x8eaac9,
    starOpacity: 0.0
  },
  {
    // Clear Morning (08:25)
    time: 0.35,
    skyColor: 0x76c3fa,
    fogColor: 0x9bddfb,
    ambientColor: 0xffffff,
    ambientIntensity: 0.85,
    hemiSkyColor: 0x76c3fa,
    hemiGroundColor: 0x38322a,
    hemiIntensity: 0.70,
    sunIntensity: 1.30,
    sunColor: 0xfffaeb,
    moonIntensity: 0.0,
    moonColor: 0x8eaac9,
    starOpacity: 0.0
  },
  {
    // High Noon / Midday (12:00)
    time: 0.50,
    skyColor: 0x6bb8f8,
    fogColor: 0x95d6fa,
    ambientColor: 0xffffff,
    ambientIntensity: 0.88,
    hemiSkyColor: 0x6bb8f8,
    hemiGroundColor: 0x38342c,
    hemiIntensity: 0.72,
    sunIntensity: 1.35,
    sunColor: 0xfffff5,
    moonIntensity: 0.0,
    moonColor: 0x8eaac9,
    starOpacity: 0.0
  },
  {
    // Afternoon / Golden Hour Approach (15:35)
    time: 0.65,
    skyColor: 0x77bee8,
    fogColor: 0x9cd7f4,
    ambientColor: 0xfff4e0,
    ambientIntensity: 0.84,
    hemiSkyColor: 0x77bee8,
    hemiGroundColor: 0x3c352a,
    hemiIntensity: 0.68,
    sunIntensity: 1.25,
    sunColor: 0xffe2b0,
    moonIntensity: 0.0,
    moonColor: 0x8eaac9,
    starOpacity: 0.0
  },
  {
    // Golden Hour Warmth (17:05)
    time: 0.71,
    skyColor: 0xdd9063,
    fogColor: 0xf0aa76,
    ambientColor: 0xffd0a2,
    ambientIntensity: 0.75,
    hemiSkyColor: 0xe09165,
    hemiGroundColor: 0x422a20,
    hemiIntensity: 0.60,
    sunIntensity: 1.05,
    sunColor: 0xff994c,
    moonIntensity: 0.0,
    moonColor: 0x9ab8dc,
    starOpacity: 0.0
  },
  {
    // Sunset (18:00)
    time: 0.75,
    skyColor: 0xe96245,
    fogColor: 0xf17d5a,
    ambientColor: 0xffa57c,
    ambientIntensity: 0.65,
    hemiSkyColor: 0xe96245,
    hemiGroundColor: 0x38201d,
    hemiIntensity: 0.52,
    sunIntensity: 0.75,
    sunColor: 0xff6632,
    moonIntensity: 0.12,
    moonColor: 0xa6c2e4,
    starOpacity: 0.08
  },
  {
    // Dusk / Twilight Plum & Violet (18:50)
    time: 0.79,
    skyColor: 0x462854,
    fogColor: 0x663357,
    ambientColor: 0x584062,
    ambientIntensity: 0.48,
    hemiSkyColor: 0x462854,
    hemiGroundColor: 0x1d1522,
    hemiIntensity: 0.38,
    sunIntensity: 0.18,
    sunColor: 0xd74728,
    moonIntensity: 0.26,
    moonColor: 0xb3cdee,
    starOpacity: 0.42
  },
  {
    // Nightfall (20:10)
    time: 0.84,
    skyColor: 0x141a34,
    fogColor: 0x17203e,
    ambientColor: 0x283a5a,
    ambientIntensity: 0.36,
    hemiSkyColor: 0x192241,
    hemiGroundColor: 0x0e1526,
    hemiIntensity: 0.28,
    sunIntensity: 0.0,
    sunColor: 0xff8844,
    moonIntensity: 0.40,
    moonColor: 0xbed4f5,
    starOpacity: 0.86
  },
  {
    // Midnight wrapped (24:00 = 00:00)
    time: 1.0,
    skyColor: 0x090e1f,
    fogColor: 0x0b1224,
    ambientColor: 0x243654,
    ambientIntensity: 0.32,
    hemiSkyColor: 0x142038,
    hemiGroundColor: 0x090f1c,
    hemiIntensity: 0.25,
    sunIntensity: 0.0,
    sunColor: 0xffeedd,
    moonIntensity: 0.44,
    moonColor: 0xc4dbfa,
    starOpacity: 0.95
  }
];

function createSunCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 128, 128);
  const center = 64;
  const radius = 50;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.6, '#fffbe6');
  grad.addColorStop(0.85, '#ffea9f');
  grad.addColorStop(1, '#ffc73b');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function createSunHaloCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 256, 256);
  const center = 128;
  const radius = 128;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
  grad.addColorStop(0, 'rgba(255, 245, 200, 0.7)');
  grad.addColorStop(0.2, 'rgba(255, 210, 100, 0.45)');
  grad.addColorStop(0.5, 'rgba(255, 140, 40, 0.2)');
  grad.addColorStop(0.8, 'rgba(255, 90, 20, 0.05)');
  grad.addColorStop(1, 'rgba(255, 60, 10, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function createMoonCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 128, 128);
  const center = 64;
  const radius = 50;

  // Silvery-white base
  const grad = ctx.createRadialGradient(center - 10, center - 10, 6, center, center, radius);
  grad.addColorStop(0, '#f2f7ff');
  grad.addColorStop(0.7, '#d6e4f7');
  grad.addColorStop(1, '#b4c9e4');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle lunar craters and maria
  const craters = [
    { x: 50, y: 46, r: 12, alpha: 0.26 },
    { x: 74, y: 55, r: 15, alpha: 0.22 },
    { x: 58, y: 76, r: 11, alpha: 0.28 },
    { x: 42, y: 68, r: 8, alpha: 0.20 },
    { x: 78, y: 38, r: 9, alpha: 0.18 },
    { x: 62, y: 32, r: 7, alpha: 0.15 }
  ];

  for (const c of craters) {
    const cGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    cGrad.addColorStop(0, `rgba(130, 155, 185, ${c.alpha})`);
    cGrad.addColorStop(0.7, `rgba(145, 170, 200, ${c.alpha * 0.7})`);
    cGrad.addColorStop(1, 'rgba(180, 205, 230, 0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft lunar limb highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, radius - 1, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function createMoonHaloCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 256, 256);
  const center = 128;
  const radius = 128;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
  grad.addColorStop(0, 'rgba(215, 235, 255, 0.6)');
  grad.addColorStop(0.25, 'rgba(160, 200, 255, 0.35)');
  grad.addColorStop(0.55, 'rgba(110, 160, 240, 0.14)');
  grad.addColorStop(0.85, 'rgba(70, 120, 220, 0.03)');
  grad.addColorStop(1, 'rgba(50, 100, 200, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function createSnowflakeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 32, 32);
  const center = 16;
  const radius = 13;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(0.7, 'rgba(235, 245, 255, 0.35)');
  grad.addColorStop(1, 'rgba(235, 245, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export class SkySystem {
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public playerLight: THREE.PointLight;

  // Celestial bodies & stars
  public celestialGroup: THREE.Group;
  public sunGroup: THREE.Group;
  public sunMesh: THREE.Mesh;
  public sunMat: THREE.MeshBasicMaterial;
  public sunHalo: THREE.Mesh;
  public sunHaloMat: THREE.MeshBasicMaterial;

  public moonGroup: THREE.Group;
  public moonMesh: THREE.Mesh;
  public moonMat: THREE.MeshBasicMaterial;
  public moonHalo: THREE.Mesh;
  public moonHaloMat: THREE.MeshBasicMaterial;

  public stars: THREE.Points;
  private starMat: THREE.PointsMaterial;
  private starGeo: THREE.BufferGeometry;

  // Snowfall & Blizzard particle system for Arctic and Eversnow biomes
  public snowfallPoints: THREE.Points;
  private snowMat: THREE.PointsMaterial;
  private snowGeo: THREE.BufferGeometry;
  private snowPositions: Float32Array;
  private snowCount: number = 1800;

  // Texture references for clean disposal
  private sunTexture: THREE.CanvasTexture;
  private sunHaloTexture: THREE.CanvasTexture;
  private moonTexture: THREE.CanvasTexture;
  private moonHaloTexture: THREE.CanvasTexture;
  private snowTexture: THREE.CanvasTexture;

  // Reusable colors to prevent per-frame garbage collection
  private _c1 = new THREE.Color();
  private _c2 = new THREE.Color();
  private _skyColor = new THREE.Color();
  private _fogColor = new THREE.Color();
  private _ambientColor = new THREE.Color();
  private _hemiSkyColor = new THREE.Color();
  private _hemiGroundColor = new THREE.Color();
  private _sunColor = new THREE.Color();
  private _moonColor = new THREE.Color();

  constructor(scene: THREE.Scene, initialRenderDist: number = 9) {
    const initialFogFar = Math.max(48, (initialRenderDist - 0.75) * 16);
    const initialFogNear = Math.max(20, initialFogFar * 0.65);

    // Initial Fog & Sky
    scene.background = new THREE.Color(0x76c3fa);
    scene.fog = new THREE.Fog(0x9bddfb, initialFogNear, initialFogFar);

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(this.ambientLight);

    // Hemisphere light (sky vs ground soft bounce)
    this.hemiLight = new THREE.HemisphereLight(0x76c3fa, 0x38322a, 0.7);
    scene.add(this.hemiLight);

    // Sun directional light (illuminates terrain during daytime)
    this.sunLight = new THREE.DirectionalLight(0xfff8e1, 1.35);
    this.sunLight.position.set(50, 100, 30);
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Moon directional light (illuminates terrain with silvery glow at night)
    this.moonLight = new THREE.DirectionalLight(0xc4dbfa, 0.44);
    this.moonLight.position.set(-50, 100, -30);
    scene.add(this.moonLight);
    scene.add(this.moonLight.target);

    // Player personal light (illuminates immediate surroundings and caves)
    this.playerLight = new THREE.PointLight(0xfffaed, 1.2, 32);
    scene.add(this.playerLight);

    // Celestial parent group (centered on player)
    this.celestialGroup = new THREE.Group();
    scene.add(this.celestialGroup);

    // 1. Procedural Sun & Corona
    this.sunTexture = new THREE.CanvasTexture(createSunCanvas());
    this.sunTexture.generateMipmaps = false;
    this.sunTexture.minFilter = THREE.LinearFilter;

    this.sunHaloTexture = new THREE.CanvasTexture(createSunHaloCanvas());
    this.sunHaloTexture.generateMipmaps = false;
    this.sunHaloTexture.minFilter = THREE.LinearFilter;

    this.sunGroup = new THREE.Group();

    // Sun core disc
    const sunGeo = new THREE.PlaneGeometry(26, 26);
    this.sunMat = new THREE.MeshBasicMaterial({
      map: this.sunTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunMat);
    this.sunMesh.renderOrder = 0;
    this.sunGroup.add(this.sunMesh);

    // Sun halo / corona
    const sunHaloGeo = new THREE.PlaneGeometry(68, 68);
    this.sunHaloMat = new THREE.MeshBasicMaterial({
      map: this.sunHaloTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    this.sunHalo = new THREE.Mesh(sunHaloGeo, this.sunHaloMat);
    this.sunHalo.renderOrder = -1;
    this.sunGroup.add(this.sunHalo);

    this.celestialGroup.add(this.sunGroup);

    // 2. Procedural Moon & Lunar Glow
    this.moonTexture = new THREE.CanvasTexture(createMoonCanvas());
    this.moonTexture.generateMipmaps = false;
    this.moonTexture.minFilter = THREE.LinearFilter;

    this.moonHaloTexture = new THREE.CanvasTexture(createMoonHaloCanvas());
    this.moonHaloTexture.generateMipmaps = false;
    this.moonHaloTexture.minFilter = THREE.LinearFilter;

    this.moonGroup = new THREE.Group();

    // Moon core disc
    const moonGeo = new THREE.PlaneGeometry(22, 22);
    this.moonMat = new THREE.MeshBasicMaterial({
      map: this.moonTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    this.moonMesh = new THREE.Mesh(moonGeo, this.moonMat);
    this.moonMesh.renderOrder = 0;
    this.moonGroup.add(this.moonMesh);

    // Moon halo
    const moonHaloGeo = new THREE.PlaneGeometry(54, 54);
    this.moonHaloMat = new THREE.MeshBasicMaterial({
      map: this.moonHaloTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    this.moonHalo = new THREE.Mesh(moonHaloGeo, this.moonHaloMat);
    this.moonHalo.renderOrder = -1;
    this.moonGroup.add(this.moonHalo);

    this.celestialGroup.add(this.moonGroup);

    // 3. Stars dome for night sky with organic distribution and twinkling
    this.starGeo = new THREE.BufferGeometry();
    const starCoords: number[] = [];
    const starColors: number[] = [];

    for (let i = 0; i < 900; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 240;

      // Hemispherical distribution above horizon
      starCoords.push(
        r * Math.sin(phi) * Math.cos(theta),
        Math.abs(r * Math.sin(phi) * Math.sin(theta)) + 4,
        r * Math.cos(phi)
      );

      // Subtle celestial color variation (crisp white, soft cyan-white, soft amber-white)
      const colorRand = Math.random();
      if (colorRand > 0.85) {
        starColors.push(1.0, 0.94, 0.82); // Warm star
      } else if (colorRand > 0.65) {
        starColors.push(0.85, 0.92, 1.0); // Blue giant star
      } else {
        starColors.push(1.0, 1.0, 1.0); // Pure white
      }
    }

    this.starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    this.starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    this.starMat = new THREE.PointsMaterial({
      size: 1.65,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      fog: false
    });
    this.stars = new THREE.Points(this.starGeo, this.starMat);
    this.stars.renderOrder = -2;
    scene.add(this.stars);

    // Initialize Snowfall & Blizzard particle system
    this.snowPositions = new Float32Array(this.snowCount * 3);
    for (let i = 0; i < this.snowCount; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 56;
      this.snowPositions[i * 3 + 1] = Math.random() * 32 - 6;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 56;
    }
    this.snowGeo = new THREE.BufferGeometry();
    this.snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));

    const snowCanvas = createSnowflakeCanvas();
    this.snowTexture = new THREE.CanvasTexture(snowCanvas);

    this.snowMat = new THREE.PointsMaterial({
      map: this.snowTexture,
      color: 0xffffff,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      fog: true
    });
    this.snowfallPoints = new THREE.Points(this.snowGeo, this.snowMat);
    this.snowfallPoints.visible = false;
    scene.add(this.snowfallPoints);
  }

  /**
   * Computes smooth gradient interpolation across the 24-hour cycle.
   */
  private interpolateTimeline(timeOfDay: number) {
    let t = timeOfDay % 1.0;
    if (t < 0) t += 1.0;

    let k1 = SKY_TIMELINE[0];
    let k2 = SKY_TIMELINE[SKY_TIMELINE.length - 1];

    for (let i = 0; i < SKY_TIMELINE.length - 1; i++) {
      if (t >= SKY_TIMELINE[i].time && t <= SKY_TIMELINE[i + 1].time) {
        k1 = SKY_TIMELINE[i];
        k2 = SKY_TIMELINE[i + 1];
        break;
      }
    }

    const span = k2.time - k1.time;
    const rawFrac = span > 0 ? (t - k1.time) / span : 0;
    // Cubic smoothstep easing for silky, continuous gradients
    const frac = rawFrac * rawFrac * (3 - 2 * rawFrac);

    this._skyColor.setHex(k1.skyColor).lerp(this._c2.setHex(k2.skyColor), frac);
    this._fogColor.setHex(k1.fogColor).lerp(this._c2.setHex(k2.fogColor), frac);
    this._ambientColor.setHex(k1.ambientColor).lerp(this._c2.setHex(k2.ambientColor), frac);
    this._hemiSkyColor.setHex(k1.hemiSkyColor).lerp(this._c2.setHex(k2.hemiSkyColor), frac);
    this._hemiGroundColor.setHex(k1.hemiGroundColor).lerp(this._c2.setHex(k2.hemiGroundColor), frac);
    this._sunColor.setHex(k1.sunColor).lerp(this._c2.setHex(k2.sunColor), frac);
    this._moonColor.setHex(k1.moonColor).lerp(this._c2.setHex(k2.moonColor), frac);

    return {
      skyColor: this._skyColor,
      fogColor: this._fogColor,
      ambientColor: this._ambientColor,
      ambientIntensity: THREE.MathUtils.lerp(k1.ambientIntensity, k2.ambientIntensity, frac),
      hemiSkyColor: this._hemiSkyColor,
      hemiGroundColor: this._hemiGroundColor,
      hemiIntensity: THREE.MathUtils.lerp(k1.hemiIntensity, k2.hemiIntensity, frac),
      sunIntensity: THREE.MathUtils.lerp(k1.sunIntensity, k2.sunIntensity, frac),
      sunColor: this._sunColor,
      moonIntensity: THREE.MathUtils.lerp(k1.moonIntensity, k2.moonIntensity, frac),
      moonColor: this._moonColor,
      starOpacity: THREE.MathUtils.lerp(k1.starOpacity, k2.starOpacity, frac)
    };
  }

  public update(
    timeOfDay: number,
    playerPos: THREE.Vector3,
    renderDistance: number,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    isUnderwater: boolean = false,
    subBiome?: VerdantSubBiomeDef
  ) {
    // 1. Center stars and celestial orbits around player position
    this.stars.position.copy(playerPos);
    this.celestialGroup.position.copy(playerPos);
    this.playerLight.position.set(playerPos.x, playerPos.y + 1.6, playerPos.z);

    // 2. Orbital geometry for Sun and Moon
    // Radius 185 is well inside the camera far plane (300+) but beyond active terrain
    const CELESTIAL_DIST = 185;
    const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2;
    const tiltAngle = 0.26; // ~15-degree orbital tilt

    const sunX = Math.cos(sunAngle) * CELESTIAL_DIST;
    const sunY = Math.sin(sunAngle) * CELESTIAL_DIST;
    const sunZ = Math.cos(sunAngle) * Math.sin(tiltAngle) * CELESTIAL_DIST;

    this.sunGroup.position.set(sunX, sunY, sunZ);
    this.sunGroup.lookAt(0, 0, 0);

    // Moon orbits 180 degrees directly opposite the Sun
    const moonAngle = sunAngle + Math.PI;
    const moonX = Math.cos(moonAngle) * CELESTIAL_DIST;
    const moonY = Math.sin(moonAngle) * CELESTIAL_DIST;
    const moonZ = Math.cos(moonAngle) * Math.sin(tiltAngle) * CELESTIAL_DIST;

    this.moonGroup.position.set(moonX, moonY, moonZ);
    this.moonGroup.lookAt(0, 0, 0);

    // Smooth horizon fade for celestial bodies as they set below the ground
    const sunHorizonFade = THREE.MathUtils.clamp((sunY + 12) / 30, 0, 1);
    this.sunMat.opacity = sunHorizonFade;
    this.sunHaloMat.opacity = sunHorizonFade * 0.75;
    this.sunGroup.visible = sunHorizonFade > 0.001 && !isUnderwater;

    // Shift sun core color towards warm sunset amber near the horizon
    if (sunY < 32) {
      const sunsetFactor = Math.max(0, (32 - sunY) / 44);
      this._c1.setHex(0xffffff).lerp(this._c2.setHex(0xff7733), sunsetFactor);
      this.sunMat.color.copy(this._c1);
      this._c1.setHex(0xffeedd).lerp(this._c2.setHex(0xff5511), sunsetFactor);
      this.sunHaloMat.color.copy(this._c1);
    } else {
      this.sunMat.color.setHex(0xffffff);
      this.sunHaloMat.color.setHex(0xffffff);
    }

    const moonHorizonFade = THREE.MathUtils.clamp((moonY + 12) / 30, 0, 1);
    this.moonMat.opacity = moonHorizonFade;
    this.moonHaloMat.opacity = moonHorizonFade * 0.65;
    this.moonGroup.visible = moonHorizonFade > 0.001 && !isUnderwater;

    // 3. Directional lights alignment and targeting
    this.sunLight.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z + sunZ);
    this.sunLight.target.position.copy(playerPos);

    this.moonLight.position.set(playerPos.x + moonX, playerPos.y + moonY, playerPos.z + moonZ);
    this.moonLight.target.position.copy(playerPos);

    // 4. Underwater environment overrides: deep blue fog & much closer view distance
    if (isUnderwater) {
      this.snowfallPoints.visible = false;
      const depthFactor = Math.max(0, Math.min(1, (100 - camera.position.y) / 80));

      const isSickly = !!subBiome?.isSicklyWater;
      let waterColor: THREE.Color;
      if (isSickly) {
        const shallowSickly = new THREE.Color(0x22352b);
        const abyssalSickly = new THREE.Color(0x101a15);
        waterColor = shallowSickly.clone().lerp(abyssalSickly, depthFactor);
      } else {
        const shallowBlue = new THREE.Color(0x064079);
        const abyssalBlue = new THREE.Color(0x011224);
        waterColor = shallowBlue.clone().lerp(abyssalBlue, depthFactor);
      }

      scene.background = waterColor;
      renderer.setClearColor(waterColor, 1.0);

      this.starMat.opacity = 0.0;
      this.stars.visible = false;
      this.celestialGroup.visible = false;
      this.sunLight.visible = false;
      this.moonLight.visible = false;

      this.ambientLight.intensity = Math.max(0.35, 0.7 - depthFactor * 0.35);
      this.ambientLight.color.setHex(isSickly ? 0x86efac : 0x38bdf8);

      this.hemiLight.color.copy(waterColor);
      this.hemiLight.groundColor.setHex(0x020a14);
      this.hemiLight.intensity = 0.45;

      const underwaterFogNear = 1.0;
      const underwaterFogFar = Math.max(16, 28 - depthFactor * 10);

      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(waterColor);
        scene.fog.near = underwaterFogNear;
        scene.fog.far = underwaterFogFar;
      }

      const desiredFar = underwaterFogFar + 15;
      if (Math.abs(camera.far - desiredFar) > 5) {
        camera.far = desiredFar;
        camera.updateProjectionMatrix();
      }

      return;
    }

    // 5. Above-water smooth continuous sky and atmospheric gradient
    this.celestialGroup.visible = true;
    const state = this.interpolateTimeline(timeOfDay);

    scene.background = state.skyColor;
    renderer.setClearColor(state.skyColor, 1.0);

    // Ambient light
    this.ambientLight.color.copy(state.ambientColor);
    this.ambientLight.intensity = state.ambientIntensity;

    // Hemisphere light
    this.hemiLight.color.copy(state.hemiSkyColor);
    this.hemiLight.groundColor.copy(state.hemiGroundColor);
    this.hemiLight.intensity = state.hemiIntensity;

    // Directional sunlight
    if (state.sunIntensity > 0.001) {
      this.sunLight.visible = true;
      this.sunLight.intensity = state.sunIntensity;
      this.sunLight.color.copy(state.sunColor);
    } else {
      this.sunLight.visible = false;
    }

    // Directional moonlight
    if (state.moonIntensity > 0.001) {
      this.moonLight.visible = true;
      this.moonLight.intensity = state.moonIntensity;
      this.moonLight.color.copy(state.moonColor);
    } else {
      this.moonLight.visible = false;
    }

    // Subtle star twinkle
    const twinkle = Math.sin(timeOfDay * 140 + Date.now() * 0.0012) * 0.04;
    this.starMat.opacity = Math.max(0, Math.min(1, state.starOpacity + twinkle));
    this.stars.visible = this.starMat.opacity > 0.005;

    // 6. Horizon fog matching sky gradient & Eversnow / Arctic weather overrides
    const curDist = renderDistance || 9;
    let currentFogFar = Math.max(48, (curDist - 0.75) * 16);
    let currentFogNear = Math.max(20, currentFogFar * 0.65);

    const isEversnow = subBiome?.isEversnow || subBiome?.id === 'eversnow';
    const isArctic = isEversnow || subBiome?.isArctic || subBiome?.category === 'arctic';

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(state.fogColor);
      if (isEversnow) {
        // "called the Eversnow biome, the snow stacks much higher and you can barely see with all the snowfall there"
        currentFogNear = 2.0;
        currentFogFar = 16.0;
        const blizzardFog = new THREE.Color(0xdce7f4);
        scene.fog.color.lerp(blizzardFog, 0.94);
        scene.background = scene.fog.color;
        renderer.setClearColor(scene.fog.color, 1.0);
      } else if (isArctic) {
        currentFogNear = Math.max(14, currentFogNear * 0.7);
        currentFogFar = Math.max(38, currentFogFar * 0.75);
        const coldFog = new THREE.Color(0xe2ebf5);
        scene.fog.color.lerp(coldFog, 0.45);
      }
      scene.fog.near = currentFogNear;
      scene.fog.far = currentFogFar;
    }

    // 7. Update Snowfall & Blizzard particle system around player
    if (isArctic) {
      this.snowfallPoints.visible = true;
      this.snowfallPoints.position.copy(playerPos);

      const fallSpeed = isEversnow ? 1.8 : 0.9;
      const windX = isEversnow ? 1.0 : 0.25;
      const windZ = isEversnow ? 0.6 : 0.18;
      this.snowMat.size = isEversnow ? 0.14 : 0.09;
      this.snowMat.opacity = isEversnow ? 0.85 : 0.55;

      const posAttr = this.snowGeo.getAttribute('position') as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      const dt = 0.016;

      for (let i = 0; i < this.snowCount; i++) {
        const idx = i * 3;
        const flutter = Math.sin(timeOfDay * 100 + i * 0.4);
        array[idx]     += (windX + flutter * 0.25) * dt;
        array[idx + 1] -= (fallSpeed + Math.sin(i * 1.5) * 0.2) * dt;
        array[idx + 2] += (windZ + Math.cos(timeOfDay * 100 + i * 0.4) * 0.25) * dt;

        if (array[idx + 1] < -6) {
          array[idx + 1] = 26;
          array[idx]     = (Math.random() - 0.5) * 56;
          array[idx + 2] = (Math.random() - 0.5) * 56;
        }
        if (array[idx]     >  28) array[idx]     = -28;
        else if (array[idx]     < -28) array[idx]     =  28;
        if (array[idx + 2] >  28) array[idx + 2] = -28;
        else if (array[idx + 2] < -28) array[idx + 2] =  28;
      }
      // Only mark dirty when visible — avoids a GPU upload every frame when not snowing
      posAttr.needsUpdate = true;
    } else {
      if (this.snowfallPoints.visible) {
        this.snowfallPoints.visible = false;
        this.snowMat.opacity = 0.0;
      }
    }

    // 8. Camera far clipping plane matches fog boundary + buffer
    // Only call updateProjectionMatrix when the value actually changes (it's expensive)
    const desiredFar = isEversnow ? 50 : Math.max(300, currentFogFar + 50);
    if (Math.abs(camera.far - desiredFar) > 5) {
      camera.far = desiredFar;
      camera.updateProjectionMatrix();
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.sunLight);
    scene.remove(this.sunLight.target);
    scene.remove(this.moonLight);
    scene.remove(this.moonLight.target);
    scene.remove(this.ambientLight);
    scene.remove(this.hemiLight);
    scene.remove(this.playerLight);
    scene.remove(this.stars);
    scene.remove(this.celestialGroup);
    scene.remove(this.snowfallPoints);

    this.starGeo.dispose();
    this.starMat.dispose();

    this.snowGeo.dispose();
    this.snowMat.dispose();
    this.snowTexture.dispose();

    this.sunMesh.geometry.dispose();
    this.sunMat.dispose();
    this.sunHalo.geometry.dispose();
    this.sunHaloMat.dispose();
    this.sunTexture.dispose();
    this.sunHaloTexture.dispose();

    this.moonMesh.geometry.dispose();
    this.moonMat.dispose();
    this.moonHalo.geometry.dispose();
    this.moonHaloMat.dispose();
    this.moonTexture.dispose();
    this.moonHaloTexture.dispose();
  }
}

