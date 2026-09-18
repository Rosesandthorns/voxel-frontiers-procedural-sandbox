import { SEA_LEVEL } from '../voxel/ChunkConstants';

export type RiverBendType = 'meandering' | 'winding_crag' | 'gentle_flow';
export type RiverShoreType = 'sand' | 'dirt' | 'stone';

export interface RiverSegment {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
  shoreWidth: number;
  shoreType: RiverShoreType;
  bendType: RiverBendType;
  isMouth: boolean;
  riverId: number;
}

export interface RiverSample {
  inRiver: boolean;
  inShore: boolean;
  isRivermouth: boolean;
  shoreType: RiverShoreType;
  distToCenter: number;
  riverWidth: number;
  depthOffset: number; // For carving terrain down to Y100 water level
  riverType: RiverBendType;
  valleyBlend: number; // 0.0 at river shoreline -> 1.0 at valley crest
}

interface SectorData {
  segments: RiverSegment[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
}

const SECTOR_SIZE = 384;

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function distToSegment(
  px: number,
  pz: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number
): number {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x0, pz - z0);

  let t = ((px - x0) * dx + (pz - z0) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x0 + t * dx;
  const projZ = z0 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

export class RiverSystem {
  private sectorCache: Map<string, SectorData> = new Map();
  private maxCacheSize = 512;
  private lastSampleKey = 0x7fffffff;
  private lastSampleValue: RiverSample | null = null;

  constructor(
    private seed: number,
    private isDesertLocation: (wx: number, wz: number) => boolean,
    private getContinentalness: (wx: number, wz: number) => number
  ) {}

  private getSectorKey(secX: number, secZ: number): string {
    return `${secX},${secZ}`;
  }

  public getSectorData(secX: number, secZ: number): SectorData {
    const key = this.getSectorKey(secX, secZ);
    const cached = this.sectorCache.get(key);
    if (cached) return cached;

    const segments = this.generateSectorRivers(secX, secZ);
    let bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
    if (segments.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const seg of segments) {
        if (seg.x0 < minX) minX = seg.x0;
        if (seg.x1 < minX) minX = seg.x1;
        if (seg.x0 > maxX) maxX = seg.x0;
        if (seg.x1 > maxX) maxX = seg.x1;
        if (seg.z0 < minZ) minZ = seg.z0;
        if (seg.z1 < minZ) minZ = seg.z1;
        if (seg.z0 > maxZ) maxZ = seg.z0;
        if (seg.z1 > maxZ) maxZ = seg.z1;
      }
      bounds = { minX, maxX, minZ, maxZ };
    }

    const data: SectorData = { segments, bounds };

    if (this.sectorCache.size >= this.maxCacheSize) {
      const firstKey = this.sectorCache.keys().next().value;
      if (firstKey) this.sectorCache.delete(firstKey);
    }
    this.sectorCache.set(key, data);
    return data;
  }

  public getSegmentsInSector(secX: number, secZ: number): RiverSegment[] {
    return this.getSectorData(secX, secZ).segments;
  }

  private generateSectorRivers(secX: number, secZ: number): RiverSegment[] {
    const sectorSeed = (secX * 31337) ^ (secZ * 7919) ^ this.seed;
    const rng = (offset: number) => pseudoRandom(sectorSeed + offset * 137);

    // Probability of a river originating or passing through this sector
    const hasRiver = rng(1) > 0.42;
    if (!hasRiver) return [];

    const segments: RiverSegment[] = [];
    const originX = secX * SECTOR_SIZE + (rng(2) * 0.6 + 0.2) * SECTOR_SIZE;
    const originZ = secZ * SECTOR_SIZE + (rng(3) * 0.6 + 0.2) * SECTOR_SIZE;

    // Rivers cannot spawn in desert
    if (this.isDesertLocation(originX, originZ)) {
      return [];
    }

    // Determine river type and shoreline characteristics
    const typeRoll = rng(4);
    let bendType: RiverBendType = 'meandering';
    if (typeRoll < 0.35) bendType = 'meandering';
    else if (typeRoll < 0.68) bendType = 'winding_crag';
    else bendType = 'gentle_flow';

    const shoreRoll = rng(5);
    let shoreType: RiverShoreType = 'sand';
    if (shoreRoll < 0.45) shoreType = 'sand';
    else if (shoreRoll < 0.75) shoreType = 'dirt';
    else shoreType = 'stone';

    const riverWidth = 5.5 + rng(6) * 2.5; // Thin river: 5.5 to 8 blocks wide
    const shoreWidth = 1.8 + rng(7) * 1.5; // Small shorelines: 1.8 to 3.3 blocks wide
    const riverId = Math.floor(rng(8) * 100000);

    // Determine flow direction towards lower continentalness (towards ocean)
    // Sample gradient around origin
    const delta = 48;
    const cEast = this.getContinentalness(originX + delta, originZ);
    const cWest = this.getContinentalness(originX - delta, originZ);
    const cNorth = this.getContinentalness(originX, originZ - delta);
    const cSouth = this.getContinentalness(originX, originZ + delta);

    let gradX = cWest - cEast;
    let gradZ = cNorth - cSouth;
    const gradLen = Math.hypot(gradX, gradZ);

    let baseAngle = 0;
    if (gradLen > 0.01) {
      baseAngle = Math.atan2(gradZ, gradX);
    } else {
      baseAngle = rng(9) * Math.PI * 2;
    }

    // Walk the river path step-by-step
    let currX = originX;
    let currZ = originZ;
    let currAngle = baseAngle;
    const stepLength = 14;
    const maxSteps = 45; // ~600 blocks of river flow

    const pathPoints: { x: number; z: number }[] = [{ x: currX, z: currZ }];

    for (let step = 0; step < maxSteps; step++) {
      // Add bendiness according to river type
      let bendOffset = 0;
      if (bendType === 'meandering') {
        bendOffset = Math.sin(step * 0.38 + rng(10) * 5) * 0.55;
      } else if (bendType === 'winding_crag') {
        bendOffset = (pseudoRandom(sectorSeed + step * 31) - 0.5) * 0.95;
      } else {
        bendOffset = Math.sin(step * 0.18 + rng(11) * 3) * 0.28;
      }

      currAngle += bendOffset;

      const nextX = currX + Math.cos(currAngle) * stepLength;
      const nextZ = currZ + Math.sin(currAngle) * stepLength;

      // 1. Rivers CANNOT pass through desert
      if (this.isDesertLocation(nextX, nextZ)) {
        break;
      }

      // 2. A river CANNOT pass through itself (check self-intersection with earlier segments)
      let selfIntersects = false;
      for (let i = 0; i < pathPoints.length - 3; i++) {
        const p0 = pathPoints[i];
        const p1 = pathPoints[i + 1];
        const d = distToSegment(nextX, nextZ, p0.x, p0.z, p1.x, p1.z);
        if (d < riverWidth * 1.8) {
          selfIntersects = true;
          break;
        }
      }
      if (selfIntersects) {
        break;
      }

      // 3. If a river passes through another river, one of the rivers ends there and merges in a T shape!
      let hitOtherRiver = false;
      // Check already existing segments in nearby sectors
      const neighborSecX = Math.floor(nextX / SECTOR_SIZE);
      const neighborSecZ = Math.floor(nextZ / SECTOR_SIZE);
      if (neighborSecX !== secX || neighborSecZ !== secZ) {
        const neighborKey = this.getSectorKey(neighborSecX, neighborSecZ);
        const neighborData = this.sectorCache.get(neighborKey);
        if (neighborData && neighborData.segments) {
          for (const seg of neighborData.segments) {
            if (seg.riverId === riverId) continue;
            const d = distToSegment(nextX, nextZ, seg.x0, seg.z0, seg.x1, seg.z1);
            if (d <= riverWidth + seg.width * 0.5) {
              // Merge into T-junction and end here!
              segments.push({
                x0: currX,
                z0: currZ,
                x1: nextX,
                z1: nextZ,
                width: riverWidth,
                shoreWidth,
                shoreType,
                bendType,
                isMouth: false,
                riverId
              });
              hitOtherRiver = true;
              break;
            }
          }
        }
      }
      if (hitOtherRiver) {
        break;
      }

      // 4. Check if entering ocean via shorebed -> becomes Rivermouth subbiome!
      const cont = this.getContinentalness(nextX, nextZ);
      const isEnteringOcean = cont < -0.20;

      const isMouth = isEnteringOcean;
      const actualWidth = isMouth ? riverWidth * 1.8 : riverWidth;

      segments.push({
        x0: currX,
        z0: currZ,
        x1: nextX,
        z1: nextZ,
        width: actualWidth,
        shoreWidth,
        shoreType,
        bendType,
        isMouth,
        riverId
      });

      pathPoints.push({ x: nextX, z: nextZ });
      currX = nextX;
      currZ = nextZ;

      if (isEnteringOcean) {
        // Reached the ocean shorebed, collided into Rivermouth! End here.
        break;
      }
    }

    return segments;
  }

  private lastWX = 0x7fffffff;
  private lastWZ = 0x7fffffff;

  /**
   * Fast query for any world (wx, wz) coordinate.
   * Returns river and shoreline sample.
   */
  public getRiverSample(wx: number, wz: number): RiverSample {
    if (wx === this.lastWX && wz === this.lastWZ && this.lastSampleValue) {
      return this.lastSampleValue;
    }

    const secX = Math.floor(wx / SECTOR_SIZE);
    const secZ = Math.floor(wz / SECTOR_SIZE);

    let minDist = 999999;
    let closestSegment: RiverSegment | null = null;

    // Check current sector and 8 adjacent sectors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const sector = this.getSectorData(secX + dx, secZ + dz);
        // Fast skip if sector has no rivers or coordinate is completely outside sector river bounding box
        if (!sector.bounds) continue;
        if (
          wx < sector.bounds.minX - 45 ||
          wx > sector.bounds.maxX + 45 ||
          wz < sector.bounds.minZ - 45 ||
          wz > sector.bounds.maxZ + 45
        ) {
          continue;
        }

        const segs = sector.segments;
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          // Quick bounding box rejection
          const minX = Math.min(seg.x0, seg.x1) - 40;
          const maxX = Math.max(seg.x0, seg.x1) + 40;
          const minZ = Math.min(seg.z0, seg.z1) - 40;
          const maxZ = Math.max(seg.z0, seg.z1) + 40;
          if (wx < minX || wx > maxX || wz < minZ || wz > maxZ) continue;

          const dist = distToSegment(wx, wz, seg.x0, seg.z0, seg.x1, seg.z1);
          if (dist < minDist) {
            minDist = dist;
            closestSegment = seg;
          }
        }
      }
    }

    let result: RiverSample;

    const riverWidth = closestSegment ? closestSegment.width : 6;
    const halfW = riverWidth * 0.5;
    const shoreOuter = halfW + (closestSegment ? closestSegment.shoreWidth : 2.5);
    // Valley slope zone: terrain bends downwards towards the river over 26 blocks
    const valleyWidth = 26.0;
    const valleyOuter = shoreOuter + valleyWidth;

    if (!closestSegment || minDist > valleyOuter) {
      result = {
        inRiver: false,
        inShore: false,
        isRivermouth: false,
        shoreType: 'sand',
        distToCenter: minDist,
        riverWidth,
        depthOffset: 0,
        riverType: 'meandering',
        valleyBlend: 1.0
      };
    } else {
      if (minDist <= halfW) {
        // Inside river channel: water surface is at Y100
        // Calculate depth profile (bowl-shaped bed down to Y96-98)
        const t = minDist / halfW;
        const depth = (1 - t * t) * 3.5 + 1.2;
        result = {
          inRiver: true,
          inShore: false,
          isRivermouth: closestSegment.isMouth,
          shoreType: closestSegment.shoreType,
          distToCenter: minDist,
          riverWidth: closestSegment.width,
          depthOffset: depth,
          riverType: closestSegment.bendType,
          valleyBlend: 0.0
        };
      } else if (minDist <= shoreOuter) {
        // On river shoreline
        const t = (minDist - halfW) / closestSegment.shoreWidth;
        result = {
          inRiver: false,
          inShore: true,
          isRivermouth: closestSegment.isMouth,
          shoreType: closestSegment.shoreType,
          distToCenter: minDist,
          riverWidth: closestSegment.width,
          depthOffset: (1 - t) * 1.5,
          riverType: closestSegment.bendType,
          valleyBlend: 0.0
        };
      } else {
        // In the sloping river valley: terrain bends downwards towards the river
        const t = (minDist - shoreOuter) / valleyWidth;
        const clampedT = Math.max(0, Math.min(1, t));
        result = {
          inRiver: false,
          inShore: false,
          isRivermouth: closestSegment.isMouth,
          shoreType: closestSegment.shoreType,
          distToCenter: minDist,
          riverWidth: closestSegment.width,
          depthOffset: 0,
          riverType: closestSegment.bendType,
          valleyBlend: clampedT
        };
      }
    }

    this.lastWX = wx;
    this.lastWZ = wz;
    this.lastSampleValue = result;
    return result;
  }
}
