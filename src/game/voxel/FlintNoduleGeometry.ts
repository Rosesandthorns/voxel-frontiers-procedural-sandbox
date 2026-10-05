import { BlockType } from '../../types';
import { BLOCK_DEFS, isFlintBlock, isWaterBlock } from './Blocks';

export type AddFlintQuadFn = (
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number,
  nx: number, ny: number, nz: number,
  u0: number, v0: number,
  u1: number, v1: number,
  shade: number
) => void;

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface BoxSubdivision {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  depth: number;
}

function hash3(x: number, y: number, z: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 3266489917) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function computeFaceShade(nx: number, ny: number, nz: number): number {
  if (ny > 0.5) return 1.0;
  if (ny < -0.5) return 0.55;
  if (Math.abs(nx) > 0.5) return 0.80;
  return 0.90;
}

export type AttachmentDir = 'negX' | 'posX' | 'negZ' | 'posZ' | 'negY' | 'posY';

export function getFlintAttachmentDir(
  x: number,
  y: number,
  z: number,
  getBlock: (bx: number, by: number, bz: number) => BlockType
): AttachmentDir {
  // 1. Prioritize limestone cliff wall neighbors
  if (getBlock(x - 1, y, z) === BlockType.LIMESTONE) return 'negX';
  if (getBlock(x + 1, y, z) === BlockType.LIMESTONE) return 'posX';
  if (getBlock(x, y, z - 1) === BlockType.LIMESTONE) return 'negZ';
  if (getBlock(x, y, z + 1) === BlockType.LIMESTONE) return 'posZ';
  if (getBlock(x, y - 1, z) === BlockType.LIMESTONE) return 'negY';
  if (getBlock(x, y + 1, z) === BlockType.LIMESTONE) return 'posY';

  // 2. Fall back to any solid terrain neighbor
  const isSolid = (b: BlockType) => {
    if (b === BlockType.AIR || isWaterBlock(b) || b === BlockType.LAVA || isFlintBlock(b)) return false;
    const def = (BLOCK_DEFS as Record<number, { solid?: boolean }>)[b];
    return !!def?.solid;
  };

  if (isSolid(getBlock(x - 1, y, z))) return 'negX';
  if (isSolid(getBlock(x + 1, y, z))) return 'posX';
  if (isSolid(getBlock(x, y, z - 1))) return 'negZ';
  if (isSolid(getBlock(x, y, z + 1))) return 'posZ';
  if (isSolid(getBlock(x, y - 1, z))) return 'negY';
  if (isSolid(getBlock(x, y + 1, z))) return 'posY';

  return 'negY';
}

/**
 * Meshes a 3D flint nodule clinging to a cliff surface.
 * Only sticks out a few pixels (2-4 pixels / ~0.06-0.12 units)
 * and only a few pixels tall (4-8 pixels / ~0.12-0.25 units).
 * Includes 5 distinct natural variants with subtle organic jitter.
 */
export function meshFlintNodule(
  x: number,
  y: number,
  z: number,
  worldX: number,
  worldY: number,
  worldZ: number,
  getBlock: (bx: number, by: number, bz: number) => BlockType,
  uvFace: { u0: number; v0: number; u1: number; v1: number },
  addQuad: AddFlintQuadFn,
  blockType?: BlockType
): void {
  const attachDir = getFlintAttachmentDir(x, y, z, getBlock);

  // Setup basis vectors so that T x B = N (right-handed frame where N points outward into air)
  let P0: Vector3;
  let T: Vector3;
  let B: Vector3;
  let N: Vector3;

  switch (attachDir) {
    case 'negX':
      // Wall is at x - 1, cliff face is at x = 0, nodule protrudes along +X
      P0 = { x, y, z: z + 1 };
      T = { x: 0, y: 0, z: -1 };
      B = { x: 0, y: 1, z: 0 };
      N = { x: 1, y: 0, z: 0 };
      break;

    case 'posX':
      // Wall is at x + 1, cliff face is at x = 1, nodule protrudes along -X
      P0 = { x: x + 1, y, z };
      T = { x: 0, y: 0, z: 1 };
      B = { x: 0, y: 1, z: 0 };
      N = { x: -1, y: 0, z: 0 };
      break;

    case 'negZ':
      // Wall is at z - 1, cliff face is at z = 0, nodule protrudes along +Z
      P0 = { x, y, z };
      T = { x: 1, y: 0, z: 0 };
      B = { x: 0, y: 1, z: 0 };
      N = { x: 0, y: 0, z: 1 };
      break;

    case 'posZ':
      // Wall is at z + 1, cliff face is at z = 1, nodule protrudes along -Z
      P0 = { x: x + 1, y, z: z + 1 };
      T = { x: -1, y: 0, z: 0 };
      B = { x: 0, y: 1, z: 0 };
      N = { x: 0, y: 0, z: -1 };
      break;

    case 'negY':
      // Floor is at y - 1, nodule sits on floor at y = 0, protrudes along +Y
      P0 = { x, y, z: z + 1 };
      T = { x: 1, y: 0, z: 0 };
      B = { x: 0, y: 0, z: -1 };
      N = { x: 0, y: 1, z: 0 };
      break;

    case 'posY':
      // Ceiling is at y + 1, nodule hangs from y = 1, protrudes along -Y
      P0 = { x, y: y + 1, z };
      T = { x: 1, y: 0, z: 0 };
      B = { x: 0, y: 0, z: 1 };
      N = { x: 0, y: -1, z: 0 };
      break;
  }

  // Deterministic seed for variant and subtle positioning jitter
  const h = hash3(worldX, worldY, worldZ);
  let variant: number;
  if (blockType === BlockType.BLACK_ROCK_1) variant = 1;
  else if (blockType === BlockType.BLACK_ROCK_2) variant = 2;
  else if (blockType === BlockType.BLACK_ROCK_3) variant = 3;
  else if (blockType === BlockType.BLACK_ROCK_4) variant = 4;
  else {
    variant = h % 5;
  }
  const jitterU = (((h >> 3) & 0xff) / 255 - 0.5) * 0.08;
  const jitterV = (((h >> 11) & 0xff) / 255 - 0.5) * 0.06;

  // Define 5 natural flint variants
  // Scale reference: 1 pixel in 32x32 = 0.03125 units
  const boxes: BoxSubdivision[] = [];

  switch (variant) {
    case 0:
      // Variant 0: "Conchoidal Faceted Nodule" (A sharp, faceted chert lump with a raised central chip)
      boxes.push({
        u0: Math.max(0.05, 0.32 + jitterU),
        u1: Math.min(0.95, 0.68 + jitterU),
        v0: Math.max(0.05, 0.38 + jitterV),
        v1: Math.min(0.95, 0.62 + jitterV),
        depth: 0.085 // ~2.7 pixels
      });
      boxes.push({
        u0: Math.max(0.05, 0.42 + jitterU),
        u1: Math.min(0.95, 0.58 + jitterU),
        v0: Math.max(0.05, 0.44 + jitterV),
        v1: Math.min(0.95, 0.56 + jitterV),
        depth: 0.120 // ~3.8 pixels
      });
      break;

    case 1:
      // Variant 1: "Bedding Seam" (A thin horizontal mineral seam running along limestone strata)
      boxes.push({
        u0: Math.max(0.05, 0.20 + jitterU),
        u1: Math.min(0.95, 0.80 + jitterU),
        v0: Math.max(0.05, 0.42 + jitterV),
        v1: Math.min(0.95, 0.54 + jitterV), // Only ~4 pixels tall
        depth: 0.068 // ~2.2 pixels
      });
      boxes.push({
        u0: Math.max(0.05, 0.40 + jitterU),
        u1: Math.min(0.95, 0.62 + jitterU),
        v0: Math.max(0.05, 0.39 + jitterV),
        v1: Math.min(0.95, 0.57 + jitterV),
        depth: 0.098 // ~3.1 pixels
      });
      break;

    case 2:
      // Variant 2: "Twin Mineral Cluster" (Two natural flint nodules side-by-side)
      boxes.push({
        u0: Math.max(0.05, 0.26 + jitterU),
        u1: Math.min(0.95, 0.50 + jitterU),
        v0: Math.max(0.05, 0.40 + jitterV),
        v1: Math.min(0.95, 0.62 + jitterV),
        depth: 0.090 // ~2.9 pixels
      });
      boxes.push({
        u0: Math.max(0.05, 0.58 + jitterU),
        u1: Math.min(0.95, 0.74 + jitterU),
        v0: Math.max(0.05, 0.34 + jitterV),
        v1: Math.min(0.95, 0.48 + jitterV),
        depth: 0.065 // ~2.1 pixels
      });
      break;

    case 3:
      // Variant 3: "Angular Stepped Shard" (Sharp angled fractured flint with a conchoidal step)
      boxes.push({
        u0: Math.max(0.05, 0.30 + jitterU),
        u1: Math.min(0.95, 0.64 + jitterU),
        v0: Math.max(0.05, 0.34 + jitterV),
        v1: Math.min(0.95, 0.54 + jitterV),
        depth: 0.075 // ~2.4 pixels
      });
      boxes.push({
        u0: Math.max(0.05, 0.36 + jitterU),
        u1: Math.min(0.95, 0.54 + jitterU),
        v0: Math.max(0.05, 0.46 + jitterV),
        v1: Math.min(0.95, 0.64 + jitterV),
        depth: 0.115 // ~3.7 pixels
      });
      break;

    case 4:
    default:
      // Variant 4: "Low-Profile Subtle Inset" (Very subtle, smooth nodule barely protruding from the rock)
      boxes.push({
        u0: Math.max(0.05, 0.34 + jitterU),
        u1: Math.min(0.95, 0.66 + jitterU),
        v0: Math.max(0.05, 0.40 + jitterV),
        v1: Math.min(0.95, 0.58 + jitterV),
        depth: 0.065 // ~2.1 pixels
      });
      break;
  }

  const uSpan = uvFace.u1 - uvFace.u0;
  const vSpan = uvFace.v1 - uvFace.v0;

  const pt = (u: number, v: number, d: number): [number, number, number] => [
    P0.x + T.x * u + B.x * v + N.x * d,
    P0.y + T.y * u + B.y * v + N.y * d,
    P0.z + T.z * u + B.z * v + N.z * d
  ];

  // Render each 3D box of the nodule
  for (const box of boxes) {
    const { u0, u1, v0, v1, depth } = box;

    // 1. Front face (exposed to air at d = depth, normal = +N)
    {
      const p0 = pt(u0, v0, depth);
      const p1 = pt(u1, v0, depth);
      const p2 = pt(u1, v1, depth);
      const p3 = pt(u0, v1, depth);
      const shade = computeFaceShade(N.x, N.y, N.z);
      addQuad(
        p0[0], p0[1], p0[2],
        p1[0], p1[1], p1[2],
        p2[0], p2[1], p2[2],
        p3[0], p3[1], p3[2],
        N.x, N.y, N.z,
        uvFace.u0 + uSpan * u0, uvFace.v0 + vSpan * v0,
        uvFace.u0 + uSpan * u1, uvFace.v0 + vSpan * v1,
        shade
      );
    }

    // 2. Top face (at v = v1, normal = +B)
    {
      const p0 = pt(u1, v1, 0);
      const p1 = pt(u0, v1, 0);
      const p2 = pt(u0, v1, depth);
      const p3 = pt(u1, v1, depth);
      const shade = computeFaceShade(B.x, B.y, B.z);
      const depthFrac = depth / 0.15;
      addQuad(
        p0[0], p0[1], p0[2],
        p1[0], p1[1], p1[2],
        p2[0], p2[1], p2[2],
        p3[0], p3[1], p3[2],
        B.x, B.y, B.z,
        uvFace.u0 + uSpan * u1, uvFace.v0,
        uvFace.u0 + uSpan * u0, uvFace.v0 + vSpan * depthFrac,
        shade
      );
    }

    // 3. Bottom face (at v = v0, normal = -B)
    {
      const p0 = pt(u0, v0, 0);
      const p1 = pt(u1, v0, 0);
      const p2 = pt(u1, v0, depth);
      const p3 = pt(u0, v0, depth);
      const shade = computeFaceShade(-B.x, -B.y, -B.z);
      const depthFrac = depth / 0.15;
      addQuad(
        p0[0], p0[1], p0[2],
        p1[0], p1[1], p1[2],
        p2[0], p2[1], p2[2],
        p3[0], p3[1], p3[2],
        -B.x, -B.y, -B.z,
        uvFace.u0 + uSpan * u0, uvFace.v1,
        uvFace.u0 + uSpan * u1, uvFace.v1 - vSpan * depthFrac,
        shade
      );
    }

    // 4. Left face (at u = u0, normal = -T)
    {
      const p0 = pt(u0, v1, 0);
      const p1 = pt(u0, v0, 0);
      const p2 = pt(u0, v0, depth);
      const p3 = pt(u0, v1, depth);
      const shade = computeFaceShade(-T.x, -T.y, -T.z);
      const depthFrac = depth / 0.15;
      addQuad(
        p0[0], p0[1], p0[2],
        p1[0], p1[1], p1[2],
        p2[0], p2[1], p2[2],
        p3[0], p3[1], p3[2],
        -T.x, -T.y, -T.z,
        uvFace.u0, uvFace.v0 + vSpan * v1,
        uvFace.u0 + uSpan * depthFrac, uvFace.v0 + vSpan * v0,
        shade
      );
    }

    // 5. Right face (at u = u1, normal = +T)
    {
      const p0 = pt(u1, v0, 0);
      const p1 = pt(u1, v1, 0);
      const p2 = pt(u1, v1, depth);
      const p3 = pt(u1, v0, depth);
      const shade = computeFaceShade(T.x, T.y, T.z);
      const depthFrac = depth / 0.15;
      addQuad(
        p0[0], p0[1], p0[2],
        p1[0], p1[1], p1[2],
        p2[0], p2[1], p2[2],
        p3[0], p3[1], p3[2],
        T.x, T.y, T.z,
        uvFace.u1, uvFace.v0 + vSpan * v0,
        uvFace.u1 - uSpan * depthFrac, uvFace.v0 + vSpan * v1,
        shade
      );
    }
  }
}
