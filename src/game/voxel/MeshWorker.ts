/**
 * MeshWorker
 *
 * Handles CPU-intensive chunk meshing on a background thread.
 * Receives voxel data and neighbor information, returns mesh geometry buffers.
 * This keeps the main thread free for smooth rendering.
 */

import { BlockType } from '../../types';
import { BLOCK_DEFS } from './Blocks';
import { CHUNK_D, CHUNK_H, CHUNK_W, CUBE_FACES } from './ChunkConstants';
import { isWaterFaceCulled, isWaterloggedPlant } from './WaterFlora';

// Maximum vertices per chunk (safe worst case)
const MAX_VERTS = 40960 * 3;

interface InitRequest {
  type: 'init';
  uvMap: Map<BlockType, { top: { u0: number; v0: number; u1: number; v1: number }; side: { u0: number; v0: number; u1: number; v1: number }; bottom: { u0: number; v0: number; u1: number; v1: number } }>;
}

interface MeshRequest {
  type: 'mesh';
  id: number;
  cx: number;
  cz: number;
  voxels: Uint8Array;
  maxY: number;
  isSicklyWater: boolean;
  // Neighbor chunk data for seamless borders
  neighborNegX?: Uint8Array;
  neighborPosX?: Uint8Array;
  neighborNegZ?: Uint8Array;
  neighborPosZ?: Uint8Array;
}

interface MeshResult {
  type: 'mesh';
  id: number;
  cx: number;
  cz: number;
  solidPositions: Float32Array;
  solidNormals: Float32Array;
  solidUVs: Float32Array;
  solidColors: Float32Array;
  solidIndices: Uint32Array;
  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterUVs: Float32Array;
  waterColors: Float32Array;
  waterIndices: Uint32Array;
}

// Pre-allocate buffers
const _pos = new Float32Array(MAX_VERTS * 3);
const _nrm = new Float32Array(MAX_VERTS * 3);
const _uv = new Float32Array(MAX_VERTS * 2);
const _col = new Float32Array(MAX_VERTS * 3);
const _idx = new Uint32Array(MAX_VERTS * 1.5);

const _wpos = new Float32Array(MAX_VERTS * 3);
const _wnrm = new Float32Array(MAX_VERTS * 3);
const _wuv = new Float32Array(MAX_VERTS * 2);
const _wcol = new Float32Array(MAX_VERTS * 3);
const _widx = new Uint32Array(MAX_VERTS * 1.5);

// Store UV map for meshing
let uvMap: Map<BlockType, { top: { u0: number; v0: number; u1: number; v1: number }; side: { u0: number; v0: number; u1: number; v1: number }; bottom: { u0: number; v0: number; u1: number; v1: number } }> = new Map();

function computeAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 0.45;
  let count = 0;
  if (side1) count++;
  if (side2) count++;
  if (corner) count++;
  if (count === 3) return 0.55;
  if (count === 2) return 0.70;
  if (count === 1) return 0.85;
  return 1.0;
}

function getBlockType(
  x: number, y: number, z: number,
  voxels: Uint8Array,
  neighborNegX?: Uint8Array,
  neighborPosX?: Uint8Array,
  neighborNegZ?: Uint8Array,
  neighborPosZ?: Uint8Array
): BlockType {
  if (y < 0 || y >= CHUNK_H) return BlockType.AIR;
  if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_D) {
    return voxels[x + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
  }
  if (x < 0 && z >= 0 && z < CHUNK_D && neighborNegX) {
    return neighborNegX[(CHUNK_W - 1) + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
  }
  if (x >= CHUNK_W && z >= 0 && z < CHUNK_D && neighborPosX) {
    return neighborPosX[0 + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
  }
  if (z < 0 && x >= 0 && x < CHUNK_W && neighborNegZ) {
    return neighborNegZ[x + (CHUNK_D - 1) * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
  }
  if (z >= CHUNK_D && x >= 0 && x < CHUNK_W && neighborPosZ) {
    return neighborPosZ[x + 0 * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
  }
  return BlockType.AIR;
}

function isMissingHorizontalNeighbor(
  x: number,
  z: number,
  neighborNegX?: Uint8Array,
  neighborPosX?: Uint8Array,
  neighborNegZ?: Uint8Array,
  neighborPosZ?: Uint8Array
): boolean {
  if (x < 0 && z >= 0 && z < CHUNK_D) return !neighborNegX;
  if (x >= CHUNK_W && z >= 0 && z < CHUNK_D) return !neighborPosX;
  if (z < 0 && x >= 0 && x < CHUNK_W) return !neighborNegZ;
  if (z >= CHUNK_D && x >= 0 && x < CHUNK_W) return !neighborPosZ;
  return false;
}

function meshChunk(req: MeshRequest): MeshResult {
  const { cx, cz, voxels, maxY, isSicklyWater, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ } = req;

  // Reset cursors
  let vp = 0, vn = 0, vu = 0, vc = 0, vi = 0;
  let wp = 0, wn = 0, wu = 0, wc = 0, wi = 0;
  let solidVerts = 0;
  let waterVerts = 0;

  const maxScanY = Math.min(CHUNK_H - 1, maxY);

  for (let y = 0; y <= maxScanY; y++) {
    const yOffset = y * (CHUNK_W * CHUNK_D);
    for (let z = 0; z < CHUNK_D; z++) {
      const zOffset = z * CHUNK_W;
      for (let x = 0; x < CHUNK_W; x++) {
        const block = voxels[x + zOffset + yOffset];
        if (block === BlockType.AIR) continue;

        const def = BLOCK_DEFS[block];
        if (!def) continue;

        // Buried block optimization
        if (
          !def.transparent &&
          x > 0 && x < CHUNK_W - 1 &&
          z > 0 && z < CHUNK_D - 1 &&
          y > 0 && y < maxScanY
        ) {
          const topB = voxels[x + zOffset + (y + 1) * (CHUNK_W * CHUNK_D)];
          const btmB = voxels[x + zOffset + (y - 1) * (CHUNK_W * CHUNK_D)];
          const rightB = voxels[(x + 1) + zOffset + yOffset];
          const leftB = voxels[(x - 1) + zOffset + yOffset];
          const frontB = voxels[x + (z + 1) * CHUNK_W + yOffset];
          const backB = voxels[x + (z - 1) * CHUNK_W + yOffset];
          if (
            !BLOCK_DEFS[topB]?.transparent &&
            !BLOCK_DEFS[btmB]?.transparent &&
            !BLOCK_DEFS[rightB]?.transparent &&
            !BLOCK_DEFS[leftB]?.transparent &&
            !BLOCK_DEFS[frontB]?.transparent &&
            !BLOCK_DEFS[backB]?.transparent
          ) continue;
        }

        const isWaterlogged = isWaterloggedPlant(block, y);

        // Cross/flat render types
        if (def.renderType === 'cross') {
          const plantShade = (def.lightLevel && def.lightLevel > 0) ? 1.0 : 0.95;
          const blockUVs = uvMap.get(block) || { top: { u0: 0, v0: 0, u1: 1, v1: 1 }, side: { u0: 0, v0: 0, u1: 1, v1: 1 }, bottom: { u0: 0, v0: 0, u1: 1, v1: 1 } };
          const uvFace = blockUVs.side;
          const crossPairs: number[][][] = [
            [[0,0,0],[1,0,1],[1,1,1],[0,1,0]],
            [[0,0,1],[1,0,0],[1,1,0],[0,1,1]]
          ];
          for (const corners of crossPairs) {
            const vertIndex = solidVerts;
            for (let i = 0; i < 4; i++) {
              const c = corners[i];
              _pos[vp++] = x + c[0]; _pos[vp++] = y + c[1]; _pos[vp++] = z + c[2];
              _nrm[vn++] = 0; _nrm[vn++] = 1; _nrm[vn++] = 0;
              _uv[vu++] = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
              _uv[vu++] = i < 2 ? uvFace.v0 : uvFace.v1;
              _col[vc++] = plantShade; _col[vc++] = plantShade; _col[vc++] = plantShade;
              solidVerts++;
            }
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
          }
          if (!isWaterlogged) continue;
        } else if (def.renderType === 'wall' || block === BlockType.VINE) {
          // Flat against a wall and vertically (Rainforest Vines)
          const blockUVs = uvMap.get(block) || { top: { u0: 0, v0: 0, u1: 1, v1: 1 }, side: { u0: 0, v0: 0, u1: 1, v1: 1 }, bottom: { u0: 0, v0: 0, u1: 1, v1: 1 } };
          const uvFace = blockUVs.side || blockUVs.top;

          const isWallBlock = (b: BlockType): boolean => {
            if (b === BlockType.AIR || b === BlockType.VINE || b === BlockType.WATER || b === BlockType.LAVA) return false;
            const d = BLOCK_DEFS[b];
            return !!(d && d.solid && d.renderType !== 'cross');
          };

          let wallPX = isWallBlock(getBlockType(x + 1, y, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
          let wallNX = isWallBlock(getBlockType(x - 1, y, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
          let wallPZ = isWallBlock(getBlockType(x, y, z + 1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
          let wallNZ = isWallBlock(getBlockType(x, y, z - 1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));

          // If no wall directly adjacent to this voxel, check upwards for inherited wall attachments
          if (!wallPX && !wallNX && !wallPZ && !wallNZ) {
            for (let dy = 1; dy <= 6; dy++) {
              const upB = getBlockType(x, y + dy, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ);
              if (upB !== BlockType.VINE && upB !== BlockType.AIR && !BLOCK_DEFS[upB]?.solid) break;
              const upPX = isWallBlock(getBlockType(x + 1, y + dy, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
              const upNX = isWallBlock(getBlockType(x - 1, y + dy, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
              const upPZ = isWallBlock(getBlockType(x, y + dy, z + 1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
              const upNZ = isWallBlock(getBlockType(x, y + dy, z - 1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ));
              if (upPX || upNX || upPZ || upNZ) {
                wallPX = upPX;
                wallNX = upNX;
                wallPZ = upPZ;
                wallNZ = upNZ;
                break;
              }
            }
          }

          const addVineQuad = (
            x0: number, y0: number, z0: number,
            x1: number, y1: number, z1: number,
            x2: number, y2: number, z2: number,
            x3: number, y3: number, z3: number,
            nx: number, ny: number, nz: number,
            shade: number
          ) => {
            const vertIndex = solidVerts;
            _pos[vp++] = x0; _pos[vp++] = y0; _pos[vp++] = z0;
            _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
            _uv[vu++]  = uvFace.u0; _uv[vu++] = uvFace.v0;
            _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

            _pos[vp++] = x1; _pos[vp++] = y1; _pos[vp++] = z1;
            _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
            _uv[vu++]  = uvFace.u1; _uv[vu++] = uvFace.v0;
            _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

            _pos[vp++] = x2; _pos[vp++] = y2; _pos[vp++] = z2;
            _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
            _uv[vu++]  = uvFace.u1; _uv[vu++] = uvFace.v1;
            _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

            _pos[vp++] = x3; _pos[vp++] = y3; _pos[vp++] = z3;
            _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
            _uv[vu++]  = uvFace.u0; _uv[vu++] = uvFace.v1;
            _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

            solidVerts += 4;
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex + 1; _idx[vi++] = vertIndex + 2;
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex + 2; _idx[vi++] = vertIndex + 3;
          };

          const eps = 0.02;
          let renderedAny = false;

          if (wallPX) {
            // Wall at +X: vine quad flat against +X wall facing -X
            addVineQuad(
              x + 1 - eps, y,     z,
              x + 1 - eps, y,     z + 1,
              x + 1 - eps, y + 1, z + 1,
              x + 1 - eps, y + 1, z,
              -1, 0, 0,
              0.86
            );
            renderedAny = true;
          }
          if (wallNX) {
            // Wall at -X: vine quad flat against -X wall facing +X
            addVineQuad(
              x + eps, y,     z + 1,
              x + eps, y,     z,
              x + eps, y + 1, z,
              x + eps, y + 1, z + 1,
              1, 0, 0,
              0.86
            );
            renderedAny = true;
          }
          if (wallPZ) {
            // Wall at +Z: vine quad flat against +Z wall facing -Z
            addVineQuad(
              x + 1, y,     z + 1 - eps,
              x,     y,     z + 1 - eps,
              x,     y + 1, z + 1 - eps,
              x + 1, y + 1, z + 1 - eps,
              0, 0, -1,
              0.92
            );
            renderedAny = true;
          }
          if (wallNZ) {
            // Wall at -Z: vine quad flat against -Z wall facing +Z
            addVineQuad(
              x,     y,     z + eps,
              x + 1, y,     z + eps,
              x + 1, y + 1, z + eps,
              x,     y + 1, z + eps,
              0, 0, 1,
              0.92
            );
            renderedAny = true;
          }

          // Fallback: vertical quad in the center if hanging unattached in open space
          if (!renderedAny) {
            addVineQuad(
              x,     y,     z + 0.5,
              x + 1, y,     z + 0.5,
              x + 1, y + 1, z + 0.5,
              x,     y + 1, z + 0.5,
              0, 0, 1,
              0.90
            );
          }

          if (!isWaterlogged) continue;
        } else if (def.renderType === 'flat') {
          const blockUVs = uvMap.get(block) || { top: { u0: 0, v0: 0, u1: 1, v1: 1 }, side: { u0: 0, v0: 0, u1: 1, v1: 1 }, bottom: { u0: 0, v0: 0, u1: 1, v1: 1 } };
          const uvFace = blockUVs.top;
          // Underwater quad in water mesh — visible from below looking up.
          { 
            const vertIndex = waterVerts;
            for (let i = 0; i < 4; i++) {
              const cx2 = i === 0 || i === 3 ? 0 : 1;
              const cz2 = i < 2 ? 0 : 1;
              _wpos[wp++] = x + cx2; _wpos[wp++] = y - 0.95; _wpos[wp++] = z + cz2;
              _wnrm[wn++] = 0; _wnrm[wn++] = 1; _wnrm[wn++] = 0;
              _wuv[wu++] = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
              _wuv[wu++] = i < 2 ? uvFace.v0 : uvFace.v1;
              _wcol[wc++] = 1.0; _wcol[wc++] = 1.0; _wcol[wc++] = 1.0;
              waterVerts++;
            }
            _widx[wi++] = waterVerts-4; _widx[wi++] = waterVerts-3; _widx[wi++] = waterVerts-2;
            _widx[wi++] = waterVerts-4; _widx[wi++] = waterVerts-2; _widx[wi++] = waterVerts-1;
          }
          // Above-water quad in solid mesh — depthWrite:true ensures it beats
          // the water surface from above even with polygonOffset on water.
          {
            const vertIndex = solidVerts;
            for (let i = 0; i < 4; i++) {
              const cx2 = i === 0 || i === 3 ? 0 : 1;
              const cz2 = i < 2 ? 0 : 1;
              _pos[vp++] = x + cx2; _pos[vp++] = y + 0.1; _pos[vp++] = z + cz2;
              _nrm[vn++] = 0; _nrm[vn++] = 1; _nrm[vn++] = 0;
              _uv[vu++] = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
              _uv[vu++] = i < 2 ? uvFace.v0 : uvFace.v1;
              _col[vc++] = 1.0; _col[vc++] = 1.0; _col[vc++] = 1.0;
              solidVerts++;
            }
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
          }
          if (!isWaterlogged) continue;
        }

        const isPureWater = block === BlockType.WATER;
        const isPureLava = block === BlockType.LAVA;
        const isFluid = isPureWater || isPureLava || isWaterlogged;
        const renderWater = isPureWater || isWaterlogged;

        for (const face of CUBE_FACES) {
          const nx = face.dir[0];
          const ny = face.dir[1];
          const nz = face.dir[2];

          if (ny === -1 && y === 0) continue;

          if (
            renderWater &&
            ny === 0 &&
            isMissingHorizontalNeighbor(
              x + nx,
              z + nz,
              neighborNegX,
              neighborPosX,
              neighborNegZ,
              neighborPosZ
            )
          ) {
            continue;
          }

          const neighborBlock = getBlockType(x + nx, y + ny, z + nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ);
          const neighborDef = BLOCK_DEFS[neighborBlock];
          const neighborIsSolid = neighborDef ? neighborDef.solid : false;

          if (renderWater) {
            if (isWaterFaceCulled(neighborBlock, ny, y + ny, neighborIsSolid)) continue;
          } else if (isPureLava) {
            if (neighborBlock === BlockType.LAVA || neighborBlock === BlockType.WATER) continue;
            if (neighborIsSolid) continue;
            if (ny === -1 && neighborBlock !== BlockType.AIR) continue;
            if (ny === 0 && neighborBlock !== BlockType.AIR) continue;
          } else {
            if (neighborBlock !== BlockType.AIR) {
              if (neighborBlock === block) continue;
              if (neighborDef && !neighborDef.transparent) continue;
            }
          }

          // Ambient Occlusion
          const ao0 = 1.0, ao1 = 1.0, ao2 = 1.0, ao3 = 1.0;
          let cornerAO0 = ao0, cornerAO1 = ao1, cornerAO2 = ao2, cornerAO3 = ao3;
          if (!isFluid) {
            if (ny !== 0) {
              const sN = BLOCK_DEFS[getBlockType(x, y+ny, z-1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sS = BLOCK_DEFS[getBlockType(x, y+ny, z+1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sW = BLOCK_DEFS[getBlockType(x-1, y+ny, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sE = BLOCK_DEFS[getBlockType(x+1, y+ny, z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cNW = BLOCK_DEFS[getBlockType(x-1, y+ny, z-1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cNE = BLOCK_DEFS[getBlockType(x+1, y+ny, z-1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cSW = BLOCK_DEFS[getBlockType(x-1, y+ny, z+1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cSE = BLOCK_DEFS[getBlockType(x+1, y+ny, z+1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              if (ny === 1) {
                cornerAO0 = computeAO(sW,sS,cSW);
                cornerAO1 = computeAO(sE,sS,cSE);
                cornerAO2 = computeAO(sE,sN,cNE);
                cornerAO3 = computeAO(sW,sN,cNW);
              } else {
                cornerAO0 = computeAO(sW,sN,cNW);
                cornerAO1 = computeAO(sE,sN,cNE);
                cornerAO2 = computeAO(sE,sS,cSE);
                cornerAO3 = computeAO(sW,sS,cSW);
              }
            } else if (nx !== 0) {
              const sU = BLOCK_DEFS[getBlockType(x+nx,y+1,z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sD = BLOCK_DEFS[getBlockType(x+nx,y-1,z, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sN = BLOCK_DEFS[getBlockType(x+nx,y,z-1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sS = BLOCK_DEFS[getBlockType(x+nx,y,z+1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cUN = BLOCK_DEFS[getBlockType(x+nx,y+1,z-1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cUS = BLOCK_DEFS[getBlockType(x+nx,y+1,z+1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cDN = BLOCK_DEFS[getBlockType(x+nx,y-1,z-1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cDS = BLOCK_DEFS[getBlockType(x+nx,y-1,z+1, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              cornerAO0 = computeAO(sD,sS,cDS);
              cornerAO1 = computeAO(sD,sN,cDN);
              cornerAO2 = computeAO(sU,sN,cUN);
              cornerAO3 = computeAO(sU,sS,cUS);
            } else {
              const sU = BLOCK_DEFS[getBlockType(x,y+1,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sD = BLOCK_DEFS[getBlockType(x,y-1,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sW = BLOCK_DEFS[getBlockType(x-1,y,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const sE = BLOCK_DEFS[getBlockType(x+1,y,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cUW = BLOCK_DEFS[getBlockType(x-1,y+1,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cUE = BLOCK_DEFS[getBlockType(x+1,y+1,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cDW = BLOCK_DEFS[getBlockType(x-1,y-1,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              const cDE = BLOCK_DEFS[getBlockType(x+1,y-1,z+nz, voxels, neighborNegX, neighborPosX, neighborNegZ, neighborPosZ)]?.solid||false;
              cornerAO0 = computeAO(sD,sW,cDW);
              cornerAO1 = computeAO(sD,sE,cDE);
              cornerAO2 = computeAO(sU,sE,cUE);
              cornerAO3 = computeAO(sU,sW,cUW);
            }
          }

          const effectiveBlock = renderWater ? BlockType.WATER : block;
          const blockUVs = uvMap.get(effectiveBlock) || { top: { u0: 0, v0: 0, u1: 1, v1: 1 }, side: { u0: 0, v0: 0, u1: 1, v1: 1 }, bottom: { u0: 0, v0: 0, u1: 1, v1: 1 } };
          const uvFace = blockUVs[face.type];

          let faceShade: number;
          if (ny === 1) faceShade = 1.00;
          else if (ny === -1) faceShade = 0.55;
          else if (nx !== 0) faceShade = 0.78;
          else faceShade = 0.88;

          const uvCoords = [uvFace.u0, uvFace.v0, uvFace.u1, uvFace.v0, uvFace.u1, uvFace.v1, uvFace.u0, uvFace.v1];
          const aos = [cornerAO0, cornerAO1, cornerAO2, cornerAO3];

          if (isFluid) {
            const vertIndex = waterVerts;
            for (let i = 0; i < 4; i++) {
              const c = face.corners[i];
              _wpos[wp++] = x + c[0]; _wpos[wp++] = y + c[1]; _wpos[wp++] = z + c[2];
              _wnrm[wn++] = nx; _wnrm[wn++] = ny; _wnrm[wn++] = nz;
              _wuv[wu++] = uvCoords[i*2]; _wuv[wu++] = uvCoords[i*2+1];
              const ts = faceShade * aos[i];
              if (renderWater && isSicklyWater) {
                _wcol[wc++] = ts*0.82; _wcol[wc++] = ts*0.90; _wcol[wc++] = ts*0.80;
              } else {
                _wcol[wc++] = ts; _wcol[wc++] = ts; _wcol[wc++] = ts;
              }
              waterVerts++;
            }
            _widx[wi++] = vertIndex; _widx[wi++] = vertIndex+1; _widx[wi++] = vertIndex+2;
            _widx[wi++] = vertIndex; _widx[wi++] = vertIndex+2; _widx[wi++] = vertIndex+3;
          } else {
            const vertIndex = solidVerts;
            for (let i = 0; i < 4; i++) {
              const c = face.corners[i];
              _pos[vp++] = x + c[0]; _pos[vp++] = y + c[1]; _pos[vp++] = z + c[2];
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++] = uvCoords[i*2]; _uv[vu++] = uvCoords[i*2+1];
              const ts = faceShade * aos[i];
              _col[vc++] = ts; _col[vc++] = ts; _col[vc++] = ts;
              solidVerts++;
            }
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
            _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
          }
        }
      }
    }
  }

  return {
    type: 'mesh',
    id: req.id,
    cx,
    cz,
    solidPositions: _pos.slice(0, vp),
    solidNormals: _nrm.slice(0, vn),
    solidUVs: _uv.slice(0, vu),
    solidColors: _col.slice(0, vc),
    solidIndices: _idx.slice(0, vi),
    waterPositions: _wpos.slice(0, wp),
    waterNormals: _wnrm.slice(0, wn),
    waterUVs: _wuv.slice(0, wu),
    waterColors: _wcol.slice(0, wc),
    waterIndices: _widx.slice(0, wi)
  };
}

// Worker message handler
self.addEventListener('message', (e: MessageEvent) => {
  const req = e.data;
  if (req.type === 'init') {
    uvMap = new Map(req.uvMap);
  } else if (req.type === 'mesh') {
    const result = meshChunk(req);

    // Transfer all geometry buffers zero-copy back to the main thread.
    // The worker's pre-allocated buffers are sliced into new typed arrays
    // by meshChunk, so each result array owns its own buffer — safe to transfer.
    const transferables: Transferable[] = [
      result.solidPositions.buffer,
      result.solidNormals.buffer,
      result.solidUVs.buffer,
      result.solidColors.buffer,
      result.solidIndices.buffer,
      result.waterPositions.buffer,
      result.waterNormals.buffer,
      result.waterUVs.buffer,
      result.waterColors.buffer,
      result.waterIndices.buffer,
    ];
    self.postMessage(result, { transfer: transferables });
  }
});
