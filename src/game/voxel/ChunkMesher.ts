import * as THREE from 'three';
import { BlockDef, BlockType } from '../../types';
import { BLOCK_DEFS, isFlintBlock, isWaterBlock, getWaterLevel, isTopsnow, getTopsnowHeight, getTopsnowStage, isPlantBlock, isDoorOpen } from './Blocks';
import { Chunk } from './Chunk';
import { CHUNK_D, CHUNK_H, CHUNK_W, CUBE_FACES, SEA_LEVEL } from './ChunkConstants';
import { TextureAtlas } from './TextureAtlas';
import { isWaterFaceCulled, isWaterloggedPlant } from './WaterFlora';
import { meshFlintNodule, AddFlintQuadFn } from './FlintNoduleGeometry';
import { isMoistureSensitiveBlock, getMoistureColorMultiplier } from './TileMoistureSystem';

// Pre-allocate worst-case buffers once at module load — never allocated again.
// A 16×160×16 chunk has 40960 voxels; each voxel can expose at most 6 faces × 4 verts.
// We allocate for half that (most faces are culled).
const MAX_VERTS = 40960 * 3; // ~120k verts — safe worst case

const _pos    = new Float32Array(MAX_VERTS * 3);
const _nrm    = new Float32Array(MAX_VERTS * 3);
const _uv     = new Float32Array(MAX_VERTS * 2);
const _col    = new Float32Array(MAX_VERTS * 3);
const _idx    = new Uint32Array(MAX_VERTS * 1.5);  // 6 indices per quad, 4 verts per quad → ratio 1.5

const _wpos   = new Float32Array(MAX_VERTS * 3);
const _wnrm   = new Float32Array(MAX_VERTS * 3);
const _wuv    = new Float32Array(MAX_VERTS * 2);
const _wcol   = new Float32Array(MAX_VERTS * 3);
const _widx   = new Uint32Array(MAX_VERTS * 1.5);

export class ChunkMesher {
  public solidMaterial: THREE.MeshLambertMaterial;
  public waterMaterial: THREE.MeshLambertMaterial;

  constructor(public atlas: TextureAtlas) {
    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      transparent: false,
      alphaTest: 0.2,
      depthWrite: true,
      side: THREE.DoubleSide
    });

    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
  }

  public computeAO(side1: boolean, side2: boolean, corner: boolean): number {
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

  public rebuildMesh(
    chunk: Chunk,
    scene: THREE.Scene,
    getBlockTypeGlobal: (wx: number, wy: number, wz: number) => BlockType,
    nbNegX?: Chunk,
    nbPosX?: Chunk,
    nbNegZ?: Chunk,
    nbPosZ?: Chunk,
    waterOnly: boolean = false,
    getBuriedPlant?: (wx: number, wy: number, wz: number) => BlockType | undefined
  ) {
    // Dispose previous geometry
    if (!waterOnly && chunk.mesh) {
      scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }
    if (chunk.waterMesh) {
      scene.remove(chunk.waterMesh);
      chunk.waterMesh.geometry.dispose();
      chunk.waterMesh = null;
    }

    // Cursors into the pre-allocated buffers
    let vp = 0, vn = 0, vu = 0, vc = 0, vi = 0;   // solid
    let wp = 0, wn = 0, wu = 0, wc = 0, wi = 0;   // water
    let solidVerts = 0;
    let waterVerts = 0;

    const getBlockType = (x: number, y: number, z: number): BlockType => {
      if (y < 0 || y >= CHUNK_H) return BlockType.AIR;
      if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_D) {
        return chunk.voxels[x + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
      }
      if (x < 0 && z >= 0 && z < CHUNK_D) {
        return nbNegX ? nbNegX.voxels[(CHUNK_W - 1) + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)] : BlockType.AIR;
      }
      if (x >= CHUNK_W && z >= 0 && z < CHUNK_D) {
        return nbPosX ? nbPosX.voxels[0 + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)] : BlockType.AIR;
      }
      if (z < 0 && x >= 0 && x < CHUNK_W) {
        return nbNegZ ? nbNegZ.voxels[x + (CHUNK_D - 1) * CHUNK_W + y * (CHUNK_W * CHUNK_D)] : BlockType.AIR;
      }
      if (z >= CHUNK_D && x >= 0 && x < CHUNK_W) {
        return nbPosZ ? nbPosZ.voxels[x + 0 * CHUNK_W + y * (CHUNK_W * CHUNK_D)] : BlockType.AIR;
      }
      return getBlockTypeGlobal(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_D + z);
    };

    const getFluidHeight = (bx: number, by: number, bz: number): number => {
      const above = getBlockType(bx, by + 1, bz);
      if (isWaterBlock(above)) return 1.0;
      const b = getBlockType(bx, by, bz);
      if (!isWaterBlock(b)) return 0;
      const lvl = getWaterLevel(b);
      if (lvl >= 8) return 0.88;
      return Math.max(0.12, (lvl / 8) * 0.88);
    };

    const getWaterCornerHeight = (cx2: number, cz2: number, bx: number, by: number, bz: number): number => {
      let maxH = 0;
      let hasWaterAbove = false;
      let count = 0;
      for (let dx = -1; dx <= 0; dx++) {
        for (let dz = -1; dz <= 0; dz++) {
          const px = bx + cx2 + dx;
          const pz = bz + cz2 + dz;
          const above = getBlockType(px, by + 1, pz);
          if (isWaterBlock(above)) {
            hasWaterAbove = true;
            break;
          }
          const b = getBlockType(px, by, pz);
          if (isWaterBlock(b)) {
            const h = getFluidHeight(px, by, pz);
            if (h > maxH) maxH = h;
            count++;
          }
        }
        if (hasWaterAbove) break;
      }
      if (hasWaterAbove) return 1.0;
      return count > 0 ? maxH : 0.88;
    };

    const maxScanY = Math.min(CHUNK_H - 1, chunk.maxY);

    for (let y = 0; y <= maxScanY; y++) {
      const yOffset = y * (CHUNK_W * CHUNK_D);
      for (let z = 0; z < CHUNK_D; z++) {
        const zOffset = z * CHUNK_W;
        for (let x = 0; x < CHUNK_W; x++) {
          const block = chunk.voxels[x + zOffset + yOffset];
          if (block === BlockType.AIR) continue;
          if (waterOnly && !isWaterBlock(block) && !isWaterloggedPlant(block, y)) continue;

          const def = (BLOCK_DEFS as Record<number, BlockDef>)[block];
          if (!def) continue;

          // Buried block optimisation
          if (
            !def.transparent &&
            x > 0 && x < CHUNK_W - 1 &&
            z > 0 && z < CHUNK_D - 1 &&
            y > 0 && y < maxScanY
          ) {
            const topB   = chunk.voxels[x + zOffset + (y + 1) * (CHUNK_W * CHUNK_D)];
            const btmB   = chunk.voxels[x + zOffset + (y - 1) * (CHUNK_W * CHUNK_D)];
            const rightB = chunk.voxels[(x + 1) + zOffset + yOffset];
            const leftB  = chunk.voxels[(x - 1) + zOffset + yOffset];
            const frontB = chunk.voxels[x + (z + 1) * CHUNK_W + yOffset];
            const backB  = chunk.voxels[x + (z - 1) * CHUNK_W + yOffset];
            const blockDefsRec = BLOCK_DEFS as Record<number, BlockDef>;
            if (
              !blockDefsRec[topB]?.transparent &&
              !blockDefsRec[btmB]?.transparent &&
              !blockDefsRec[rightB]?.transparent &&
              !blockDefsRec[leftB]?.transparent &&
              !blockDefsRec[frontB]?.transparent &&
              !blockDefsRec[backB]?.transparent
            ) continue;
          }

          // Submerged interior water block optimisation (skips 95%+ of water voxels in lakes and oceans)
          if (isWaterBlock(block) && y > 0 && y < maxScanY) {
            const topB = getBlockType(x, y + 1, z);
            if (isWaterBlock(topB)) {
              const btmB = getBlockType(x, y - 1, z);
              const rightB = getBlockType(x + 1, y, z);
              const leftB = getBlockType(x - 1, y, z);
              const frontB = getBlockType(x, y, z + 1);
              const backB = getBlockType(x, y, z - 1);
              const blockDefsRec = BLOCK_DEFS as Record<number, BlockDef>;
              if (
                (isWaterBlock(btmB) || blockDefsRec[btmB]?.solid) &&
                (isWaterBlock(rightB) || blockDefsRec[rightB]?.solid) &&
                (isWaterBlock(leftB) || blockDefsRec[leftB]?.solid) &&
                (isWaterBlock(frontB) || blockDefsRec[frontB]?.solid) &&
                (isWaterBlock(backB) || blockDefsRec[backB]?.solid)
              ) {
                continue;
              }
            }
          }

          const isWaterlogged = isWaterloggedPlant(block, y);

          // ── Cross / flat render types ────────────────────────────────────
          if (def.renderType === 'cross') {
            const blockUVs = this.atlas.getUVs(block);
            const uvFace = blockUVs.side;
            const plantShade = (def.lightLevel && def.lightLevel > 0) ? 1.0 : 0.95;

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
                _uv[vu++]  = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
                _uv[vu++]  = i < 2 ? uvFace.v0 : uvFace.v1;
                _col[vc++] = plantShade; _col[vc++] = plantShade; _col[vc++] = plantShade;
                solidVerts++;
              }
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
            }
            if (!isWaterlogged) continue;
          } else if (def.renderType === 'door') {
            const blockUVs = this.atlas.getUVs(block);
            const uvFace = blockUVs.side || blockUVs.top;
            const open = isDoorOpen(block);

            // 3D Door Slab (0.16 thickness):
            // Closed: aligned across X, thin in Z [z + 0.42, z + 0.58]
            // Open: swung 90 degrees against side jamb [x + 0.05, x + 0.21]
            const x0 = open ? x + 0.05 : x;
            const x1 = open ? x + 0.21 : x + 1.0;
            const y0 = y;
            const y1 = y + 1.0;
            const z0 = open ? z : z + 0.42;
            const z1 = open ? z + 1.0 : z + 0.58;

            const addDoorQuad = (
              px0: number, py0: number, pz0: number,
              px1: number, py1: number, pz1: number,
              px2: number, py2: number, pz2: number,
              px3: number, py3: number, pz3: number,
              nx: number, ny: number, nz: number,
              shade: number
            ) => {
              const vertIndex = solidVerts;
              _pos[vp++] = px0; _pos[vp++] = py0; _pos[vp++] = pz0;
              _nrm[vn++] = nx;  _nrm[vn++] = ny;  _nrm[vn++] = nz;
              _uv[vu++]  = uvFace.u0; _uv[vu++] = uvFace.v0;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = px1; _pos[vp++] = py1; _pos[vp++] = pz1;
              _nrm[vn++] = nx;  _nrm[vn++] = ny;  _nrm[vn++] = nz;
              _uv[vu++]  = uvFace.u1; _uv[vu++] = uvFace.v0;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = px2; _pos[vp++] = py2; _pos[vp++] = pz2;
              _nrm[vn++] = nx;  _nrm[vn++] = ny;  _nrm[vn++] = nz;
              _uv[vu++]  = uvFace.u1; _uv[vu++] = uvFace.v1;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = px3; _pos[vp++] = py3; _pos[vp++] = pz3;
              _nrm[vn++] = nx;  _nrm[vn++] = ny;  _nrm[vn++] = nz;
              _uv[vu++]  = uvFace.u0; _uv[vu++] = uvFace.v1;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              solidVerts += 4;
              _idx[vi++] = vertIndex; _idx[vi++] = vertIndex + 1; _idx[vi++] = vertIndex + 2;
              _idx[vi++] = vertIndex; _idx[vi++] = vertIndex + 2; _idx[vi++] = vertIndex + 3;
            };

            // South (+Z)
            addDoorQuad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, 1, 0.95);
            // North (-Z)
            addDoorQuad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, 0, 0, -1, 0.90);
            // East (+X)
            addDoorQuad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, 1, 0, 0, 0.85);
            // West (-X)
            addDoorQuad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, -1, 0, 0, 0.85);
            // Top (+Y)
            addDoorQuad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0, 0, 1, 0, 1.0);
            // Bottom (-Y)
            addDoorQuad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, 0, -1, 0, 0.7);

            continue;
          } else if (def.renderType === 'wall' || block === BlockType.VINE) {
            // Flat against a wall and vertically (Rainforest Vines)
            const blockUVs = this.atlas.getUVs(block);
            const uvFace = blockUVs.side || blockUVs.top;

            const isWallBlock = (b: BlockType): boolean => {
              if (b === BlockType.AIR || b === BlockType.VINE || isWaterBlock(b) || b === BlockType.LAVA) return false;
              const d = BLOCK_DEFS[b];
              return !!(d && d.solid && d.renderType !== 'cross');
            };

            let wallPX = isWallBlock(getBlockType(x + 1, y, z));
            let wallNX = isWallBlock(getBlockType(x - 1, y, z));
            let wallPZ = isWallBlock(getBlockType(x, y, z + 1));
            let wallNZ = isWallBlock(getBlockType(x, y, z - 1));

            // If no wall directly adjacent to this voxel, check upwards for inherited wall attachments
            if (!wallPX && !wallNX && !wallPZ && !wallNZ) {
              for (let dy = 1; dy <= 6; dy++) {
                const upB = getBlockType(x, y + dy, z);
                if (upB !== BlockType.VINE && upB !== BlockType.AIR && !BLOCK_DEFS[upB]?.solid) break;
                const upPX = isWallBlock(getBlockType(x + 1, y + dy, z));
                const upNX = isWallBlock(getBlockType(x - 1, y + dy, z));
                const upPZ = isWallBlock(getBlockType(x, y + dy, z + 1));
                const upNZ = isWallBlock(getBlockType(x, y + dy, z - 1));
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
            const blockUVs = this.atlas.getUVs(block);
            const uvFace = blockUVs.top || blockUVs.side;
            const uvSide = blockUVs.side || uvFace;

            const btmBlock = getBlockType(x, y - 1, z);
            const onWater = isWaterBlock(btmBlock) || block === BlockType.LILYPAD;

            // When on water (water surface at y - 0.12):
            // padTop sits at -0.05 (well above water surface), and padBtm sits at -0.12 (meeting the water surface).
            // On solid ground, padTop sits at 0.03, and padBtm sits at 0.00.
            const padTop = onWater ? -0.05 : 0.03;
            const padBtm = onWater ? -0.12 : 0.00;

            // 1. Top face (normal: 0, 1, 0)
            const vIdxTop = solidVerts;
            const topCorners = [
              [0, padTop, 0, uvFace.u0, uvFace.v0],
              [0, padTop, 1, uvFace.u0, uvFace.v1],
              [1, padTop, 1, uvFace.u1, uvFace.v1],
              [1, padTop, 0, uvFace.u1, uvFace.v0]
            ];
            for (let i = 0; i < 4; i++) {
              const c = topCorners[i];
              _pos[vp++] = x + c[0]; _pos[vp++] = y + c[1]; _pos[vp++] = z + c[2];
              _nrm[vn++] = 0; _nrm[vn++] = 1; _nrm[vn++] = 0;
              _uv[vu++] = c[3]; _uv[vu++] = c[4];
              _col[vc++] = 1.0; _col[vc++] = 1.0; _col[vc++] = 1.0;
              solidVerts++;
            }
            _idx[vi++] = vIdxTop;     _idx[vi++] = vIdxTop + 1; _idx[vi++] = vIdxTop + 2;
            _idx[vi++] = vIdxTop;     _idx[vi++] = vIdxTop + 2; _idx[vi++] = vIdxTop + 3;

            // 2. Bottom face (normal: 0, -1, 0) - visible when looking up from underwater
            const vIdxBtm = solidVerts;
            const btmCorners = [
              [0, padBtm, 0, uvFace.u0, uvFace.v0],
              [1, padBtm, 0, uvFace.u1, uvFace.v0],
              [1, padBtm, 1, uvFace.u1, uvFace.v1],
              [0, padBtm, 1, uvFace.u0, uvFace.v1]
            ];
            for (let i = 0; i < 4; i++) {
              const c = btmCorners[i];
              _pos[vp++] = x + c[0]; _pos[vp++] = y + c[1]; _pos[vp++] = z + c[2];
              _nrm[vn++] = 0; _nrm[vn++] = -1; _nrm[vn++] = 0;
              _uv[vu++] = c[3]; _uv[vu++] = c[4];
              _col[vc++] = 0.75; _col[vc++] = 0.75; _col[vc++] = 0.75;
              solidVerts++;
            }
            _idx[vi++] = vIdxBtm;     _idx[vi++] = vIdxBtm + 1; _idx[vi++] = vIdxBtm + 2;
            _idx[vi++] = vIdxBtm;     _idx[vi++] = vIdxBtm + 2; _idx[vi++] = vIdxBtm + 3;

            // 3. Four vertical rim faces
            // Gives the lilypad a solid 3D cross-section so it never collapses or de-renders at distance
            const rimFaces = [
              // North face (-Z)
              [[0, padTop, 0], [1, padTop, 0], [1, padBtm, 0], [0, padBtm, 0], 0, 0, -1, 0.85],
              // South face (+Z)
              [[1, padTop, 1], [0, padTop, 1], [0, padBtm, 1], [1, padBtm, 1], 0, 0, 1, 0.85],
              // West face (-X)
              [[0, padTop, 1], [0, padTop, 0], [0, padBtm, 0], [0, padBtm, 1], -1, 0, 0, 0.80],
              // East face (+X)
              [[1, padTop, 0], [1, padTop, 1], [1, padBtm, 1], [1, padBtm, 0], 1, 0, 0, 0.80]
            ];

            for (const rf of rimFaces) {
              const vIdxRim = solidVerts;
              const pts = rf.slice(0, 4) as [number, number, number][];
              const [nx, ny, nz, shade] = rf.slice(4) as unknown as [number, number, number, number];
              for (let i = 0; i < 4; i++) {
                const pt = pts[i];
                _pos[vp++] = x + pt[0]; _pos[vp++] = y + pt[1]; _pos[vp++] = z + pt[2];
                _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
                _uv[vu++] = (i === 0 || i === 3) ? uvSide.u0 : uvSide.u1;
                _uv[vu++] = (i === 0 || i === 1) ? uvSide.v0 : uvSide.v1;
                _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;
                solidVerts++;
              }
              _idx[vi++] = vIdxRim;     _idx[vi++] = vIdxRim + 1; _idx[vi++] = vIdxRim + 2;
              _idx[vi++] = vIdxRim;     _idx[vi++] = vIdxRim + 2; _idx[vi++] = vIdxRim + 3;
            }
            if (!isWaterlogged) continue;
          } else if (def.renderType === 'flint_nodule' || isFlintBlock(block)) {
            const blockUVs = this.atlas.getUVs(block);
            const uvFace = blockUVs.side || blockUVs.top;
            const worldX = chunk.cx * CHUNK_W + x;
            const worldY = y;
            const worldZ = chunk.cz * CHUNK_D + z;

            const addFlintQuad: AddFlintQuadFn = (
              x0, y0, z0,
              x1, y1, z1,
              x2, y2, z2,
              x3, y3, z3,
              nx, ny, nz,
              u0, v0, u1, v1,
              shade
            ) => {
              const vertIndex = solidVerts;
              _pos[vp++] = x0; _pos[vp++] = y0; _pos[vp++] = z0;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++] = u0; _uv[vu++] = v0;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = x1; _pos[vp++] = y1; _pos[vp++] = z1;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++] = u1; _uv[vu++] = v0;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = x2; _pos[vp++] = y2; _pos[vp++] = z2;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++] = u1; _uv[vu++] = v1;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = x3; _pos[vp++] = y3; _pos[vp++] = z3;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++] = u0; _uv[vu++] = v1;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              solidVerts += 4;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 1; _idx[vi++] = vertIndex + 2;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 2; _idx[vi++] = vertIndex + 3;
            };

            meshFlintNodule(x, y, z, worldX, worldY, worldZ, getBlockType, uvFace, addFlintQuad, block);
            continue;
          }

          if (isTopsnow(block)) {
            const stage = getTopsnowStage(block);
            const snowH = stage * 0.2;
            const worldX = chunk.cx * CHUNK_W + x;
            const worldY = y;
            const worldZ = chunk.cz * CHUNK_D + z;

            // If a plant is buried here and not completely covered (stage < 5), render the plant emerging from the snow
            if (getBuriedPlant && stage < 5) {
              const buried = getBuriedPlant(worldX, worldY, worldZ);
              if (buried && isPlantBlock(buried)) {
                const bUVs = this.atlas.getUVs(buried);
                const uvFace = bUVs.side || bUVs.top;
                const plantShade = 0.95;
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
                    _uv[vu++]  = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
                    _uv[vu++]  = i < 2 ? uvFace.v0 : uvFace.v1;
                    _col[vc++] = plantShade; _col[vc++] = plantShade; _col[vc++] = plantShade;
                    solidVerts++;
                  }
                  _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
                  _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
                }
              }
            }

            // Snow slab geometry
            const snowUVs = this.atlas.getUVs(BlockType.SNOW);
            const topUV = snowUVs.top;
            const sideUV = snowUVs.side;
            const bottomUV = snowUVs.bottom;

            // 1. Top face
            const aboveB = getBlockType(x, y + 1, z);
            const aboveDef = BLOCK_DEFS[aboveB];
            if (!aboveDef?.solid || aboveDef?.transparent) {
              const vertIndex = solidVerts;
              _pos[vp++] = x;     _pos[vp++] = y + snowH; _pos[vp++] = z + 1;
              _nrm[vn++] = 0;     _nrm[vn++] = 1;         _nrm[vn++] = 0;
              _uv[vu++]  = topUV.u0; _uv[vu++] = topUV.v1;
              _col[vc++] = 1.0;   _col[vc++] = 1.0;       _col[vc++] = 1.0;

              _pos[vp++] = x + 1; _pos[vp++] = y + snowH; _pos[vp++] = z + 1;
              _nrm[vn++] = 0;     _nrm[vn++] = 1;         _nrm[vn++] = 0;
              _uv[vu++]  = topUV.u1; _uv[vu++] = topUV.v1;
              _col[vc++] = 1.0;   _col[vc++] = 1.0;       _col[vc++] = 1.0;

              _pos[vp++] = x + 1; _pos[vp++] = y + snowH; _pos[vp++] = z;
              _nrm[vn++] = 0;     _nrm[vn++] = 1;         _nrm[vn++] = 0;
              _uv[vu++]  = topUV.u1; _uv[vu++] = topUV.v0;
              _col[vc++] = 1.0;   _col[vc++] = 1.0;       _col[vc++] = 1.0;

              _pos[vp++] = x;     _pos[vp++] = y + snowH; _pos[vp++] = z;
              _nrm[vn++] = 0;     _nrm[vn++] = 1;         _nrm[vn++] = 0;
              _uv[vu++]  = topUV.u0; _uv[vu++] = topUV.v0;
              _col[vc++] = 1.0;   _col[vc++] = 1.0;       _col[vc++] = 1.0;

              solidVerts += 4;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 1; _idx[vi++] = vertIndex + 2;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 2; _idx[vi++] = vertIndex + 3;
            }

            // 2. Bottom face
            if (y > 0) {
              const belowB = getBlockType(x, y - 1, z);
              const belowDef = BLOCK_DEFS[belowB];
              if (!belowDef?.solid) {
                const vertIndex = solidVerts;
                _pos[vp++] = x;     _pos[vp++] = y; _pos[vp++] = z;
                _nrm[vn++] = 0;     _nrm[vn++] = -1; _nrm[vn++] = 0;
                _uv[vu++]  = bottomUV.u0; _uv[vu++] = bottomUV.v0;
                _col[vc++] = 0.55;  _col[vc++] = 0.55; _col[vc++] = 0.55;

                _pos[vp++] = x + 1; _pos[vp++] = y; _pos[vp++] = z;
                _nrm[vn++] = 0;     _nrm[vn++] = -1; _nrm[vn++] = 0;
                _uv[vu++]  = bottomUV.u1; _uv[vu++] = bottomUV.v0;
                _col[vc++] = 0.55;  _col[vc++] = 0.55; _col[vc++] = 0.55;

                _pos[vp++] = x + 1; _pos[vp++] = y; _pos[vp++] = z + 1;
                _nrm[vn++] = 0;     _nrm[vn++] = -1; _nrm[vn++] = 0;
                _uv[vu++]  = bottomUV.u1; _uv[vu++] = bottomUV.v1;
                _col[vc++] = 0.55;  _col[vc++] = 0.55; _col[vc++] = 0.55;

                _pos[vp++] = x;     _pos[vp++] = y; _pos[vp++] = z + 1;
                _nrm[vn++] = 0;     _nrm[vn++] = -1; _nrm[vn++] = 0;
                _uv[vu++]  = bottomUV.u0; _uv[vu++] = bottomUV.v1;
                _col[vc++] = 0.55;  _col[vc++] = 0.55; _col[vc++] = 0.55;

                solidVerts += 4;
                _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 1; _idx[vi++] = vertIndex + 2;
                _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 2; _idx[vi++] = vertIndex + 3;
              }
            }

            // 3. Side faces (+X, -X, +Z, -Z)
            const addSnowSide = (
              x0: number, y0: number, z0: number,
              x1: number, y1: number, z1: number,
              x2: number, y2: number, z2: number,
              x3: number, y3: number, z3: number,
              nx: number, ny: number, nz: number,
              shade: number,
              h0: number,
              h1: number
            ) => {
              const vertIndex = solidVerts;
              const vBottom = sideUV.v1 - (sideUV.v1 - sideUV.v0) * h0;
              const vTop = sideUV.v1 - (sideUV.v1 - sideUV.v0) * h1;

              _pos[vp++] = x0; _pos[vp++] = y0; _pos[vp++] = z0;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++]  = sideUV.u0; _uv[vu++] = vBottom;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = x1; _pos[vp++] = y1; _pos[vp++] = z1;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++]  = sideUV.u1; _uv[vu++] = vBottom;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = x2; _pos[vp++] = y2; _pos[vp++] = z2;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++]  = sideUV.u1; _uv[vu++] = vTop;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              _pos[vp++] = x3; _pos[vp++] = y3; _pos[vp++] = z3;
              _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
              _uv[vu++]  = sideUV.u0; _uv[vu++] = vTop;
              _col[vc++] = shade; _col[vc++] = shade; _col[vc++] = shade;

              solidVerts += 4;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 1; _idx[vi++] = vertIndex + 2;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex + 2; _idx[vi++] = vertIndex + 3;
            };

            // +X
            const nbPX = getBlockType(x + 1, y, z);
            const defPX = BLOCK_DEFS[nbPX];
            const hPX = isTopsnow(nbPX) ? getTopsnowHeight(nbPX) : (defPX?.solid && !defPX?.transparent ? 1.0 : 0);
            if (hPX < snowH) {
              addSnowSide(
                x + 1, y + hPX, z + 1,
                x + 1, y + hPX, z,
                x + 1, y + snowH, z,
                x + 1, y + snowH, z + 1,
                1, 0, 0,
                0.78, hPX, snowH
              );
            }

            // -X
            const nbNX = getBlockType(x - 1, y, z);
            const defNX = BLOCK_DEFS[nbNX];
            const hNX = isTopsnow(nbNX) ? getTopsnowHeight(nbNX) : (defNX?.solid && !defNX?.transparent ? 1.0 : 0);
            if (hNX < snowH) {
              addSnowSide(
                x, y + hNX, z,
                x, y + hNX, z + 1,
                x, y + snowH, z + 1,
                x, y + snowH, z,
                -1, 0, 0,
                0.78, hNX, snowH
              );
            }

            // +Z
            const nbPZ = getBlockType(x, y, z + 1);
            const defPZ = BLOCK_DEFS[nbPZ];
            const hPZ = isTopsnow(nbPZ) ? getTopsnowHeight(nbPZ) : (defPZ?.solid && !defPZ?.transparent ? 1.0 : 0);
            if (hPZ < snowH) {
              addSnowSide(
                x, y + hPZ, z + 1,
                x + 1, y + hPZ, z + 1,
                x + 1, y + snowH, z + 1,
                x, y + snowH, z + 1,
                0, 0, 1,
                0.88, hPZ, snowH
              );
            }

            // -Z
            const nbNZ = getBlockType(x, y, z - 1);
            const defNZ = BLOCK_DEFS[nbNZ];
            const hNZ = isTopsnow(nbNZ) ? getTopsnowHeight(nbNZ) : (defNZ?.solid && !defNZ?.transparent ? 1.0 : 0);
            if (hNZ < snowH) {
              addSnowSide(
                x + 1, y + hNZ, z,
                x, y + hNZ, z,
                x, y + snowH, z,
                x + 1, y + snowH, z,
                0, 0, -1,
                0.88, hNZ, snowH
              );
            }

            continue;
          }

          const isPureWater = isWaterBlock(block);
          const isPureLava  = block === BlockType.LAVA;
          const isFluid     = isPureWater || isPureLava || isWaterlogged;
          const renderWater = isPureWater || isWaterlogged;

          for (const face of CUBE_FACES) {
            const nx = face.dir[0];
            const ny = face.dir[1];
            const nz = face.dir[2];

            if (ny === -1 && y === 0) continue;

            const neighborBlock = getBlockType(x + nx, y + ny, z + nz);
            const neighborDef   = BLOCK_DEFS[neighborBlock];
            const neighborIsSolid = neighborDef ? neighborDef.solid : false;

            if (renderWater) {
              if (isWaterFaceCulled(neighborBlock, ny, y + ny, neighborIsSolid, block)) continue;
            } else if (isPureLava) {
              if (neighborBlock === BlockType.LAVA || isWaterBlock(neighborBlock)) continue;
              if (neighborIsSolid) continue;
              if (ny === -1 && neighborBlock !== BlockType.AIR) continue;
              if (ny === 0  && neighborBlock !== BlockType.AIR) continue;
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
                const sN = BLOCK_DEFS[getBlockType(x,   y+ny, z-1)]?.solid||false;
                const sS = BLOCK_DEFS[getBlockType(x,   y+ny, z+1)]?.solid||false;
                const sW = BLOCK_DEFS[getBlockType(x-1, y+ny, z  )]?.solid||false;
                const sE = BLOCK_DEFS[getBlockType(x+1, y+ny, z  )]?.solid||false;
                const cNW= BLOCK_DEFS[getBlockType(x-1, y+ny, z-1)]?.solid||false;
                const cNE= BLOCK_DEFS[getBlockType(x+1, y+ny, z-1)]?.solid||false;
                const cSW= BLOCK_DEFS[getBlockType(x-1, y+ny, z+1)]?.solid||false;
                const cSE= BLOCK_DEFS[getBlockType(x+1, y+ny, z+1)]?.solid||false;
                if (ny === 1) {
                  cornerAO0 = this.computeAO(sW,sS,cSW);
                  cornerAO1 = this.computeAO(sE,sS,cSE);
                  cornerAO2 = this.computeAO(sE,sN,cNE);
                  cornerAO3 = this.computeAO(sW,sN,cNW);
                } else {
                  cornerAO0 = this.computeAO(sW,sN,cNW);
                  cornerAO1 = this.computeAO(sE,sN,cNE);
                  cornerAO2 = this.computeAO(sE,sS,cSE);
                  cornerAO3 = this.computeAO(sW,sS,cSW);
                }
              } else if (nx !== 0) {
                const sU = BLOCK_DEFS[getBlockType(x+nx,y+1,z  )]?.solid||false;
                const sD = BLOCK_DEFS[getBlockType(x+nx,y-1,z  )]?.solid||false;
                const sN = BLOCK_DEFS[getBlockType(x+nx,y,  z-1)]?.solid||false;
                const sS = BLOCK_DEFS[getBlockType(x+nx,y,  z+1)]?.solid||false;
                const cUN= BLOCK_DEFS[getBlockType(x+nx,y+1,z-1)]?.solid||false;
                const cUS= BLOCK_DEFS[getBlockType(x+nx,y+1,z+1)]?.solid||false;
                const cDN= BLOCK_DEFS[getBlockType(x+nx,y-1,z-1)]?.solid||false;
                const cDS= BLOCK_DEFS[getBlockType(x+nx,y-1,z+1)]?.solid||false;
                cornerAO0 = this.computeAO(sD,sS,cDS);
                cornerAO1 = this.computeAO(sD,sN,cDN);
                cornerAO2 = this.computeAO(sU,sN,cUN);
                cornerAO3 = this.computeAO(sU,sS,cUS);
              } else {
                const sU = BLOCK_DEFS[getBlockType(x,  y+1,z+nz)]?.solid||false;
                const sD = BLOCK_DEFS[getBlockType(x,  y-1,z+nz)]?.solid||false;
                const sW = BLOCK_DEFS[getBlockType(x-1,y,  z+nz)]?.solid||false;
                const sE = BLOCK_DEFS[getBlockType(x+1,y,  z+nz)]?.solid||false;
                const cUW= BLOCK_DEFS[getBlockType(x-1,y+1,z+nz)]?.solid||false;
                const cUE= BLOCK_DEFS[getBlockType(x+1,y+1,z+nz)]?.solid||false;
                const cDW= BLOCK_DEFS[getBlockType(x-1,y-1,z+nz)]?.solid||false;
                const cDE= BLOCK_DEFS[getBlockType(x+1,y-1,z+nz)]?.solid||false;
                cornerAO0 = this.computeAO(sD,sW,cDW);
                cornerAO1 = this.computeAO(sD,sE,cDE);
                cornerAO2 = this.computeAO(sU,sE,cUE);
                cornerAO3 = this.computeAO(sU,sW,cUW);
              }
            }

            const effectiveBlock = renderWater ? BlockType.WATER : block;
            const blockUVs = this.atlas.getUVs(effectiveBlock);
            const uvFace   = blockUVs[face.type];

            let faceShade: number;
            if      (ny === 1)  faceShade = 1.00;
            else if (ny === -1) faceShade = 0.55;
            else if (nx !== 0)  faceShade = 0.78;
            else                faceShade = 0.88;

            const uvCoords = [
              uvFace.u0, uvFace.v0,
              uvFace.u1, uvFace.v0,
              uvFace.u1, uvFace.v1,
              uvFace.u0, uvFace.v1
            ];
            const aos = [cornerAO0, cornerAO1, cornerAO2, cornerAO3];

            if (isFluid) {
              const vertIndex = waterVerts;
              for (let i = 0; i < 4; i++) {
                const c = face.corners[i];
                const vx = x + c[0];
                const vz = z + c[2];
                let vy = y;
                if (c[1] === 1) {
                  if (renderWater) {
                    vy = y + getWaterCornerHeight(c[0], c[2], x, y, z);
                  } else {
                    vy = y + 1.0;
                  }
                } else {
                  vy = y;
                }
                _wpos[wp++] = vx;
                _wpos[wp++] = vy;
                _wpos[wp++] = vz;
                _wnrm[wn++] = nx; _wnrm[wn++] = ny; _wnrm[wn++] = nz;
                _wuv[wu++]  = uvCoords[i*2]; _wuv[wu++] = uvCoords[i*2+1];
                const ts = faceShade * aos[i];
                if (renderWater && chunk.isSicklyWater) {
                  _wcol[wc++] = ts*0.82; _wcol[wc++] = ts*0.90; _wcol[wc++] = ts*0.80;
                } else {
                  _wcol[wc++] = ts; _wcol[wc++] = ts; _wcol[wc++] = ts;
                }
                waterVerts++;
              }
              _widx[wi++] = vertIndex;   _widx[wi++] = vertIndex+1; _widx[wi++] = vertIndex+2;
              _widx[wi++] = vertIndex;   _widx[wi++] = vertIndex+2; _widx[wi++] = vertIndex+3;
            } else {
              const vertIndex = solidVerts;
              const isMoist = isMoistureSensitiveBlock(block);
              let mr = 1.0, mg = 1.0, mb = 1.0;
              if (isMoist && chunk.waterValues) {
                const wVal = chunk.getWaterValue(x, y, z);
                const mults = getMoistureColorMultiplier(block, wVal);
                mr = mults[0]; mg = mults[1]; mb = mults[2];
              }
              for (let i = 0; i < 4; i++) {
                const c = face.corners[i];
                _pos[vp++] = x + c[0]; _pos[vp++] = y + c[1]; _pos[vp++] = z + c[2];
                _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
                _uv[vu++]  = uvCoords[i*2]; _uv[vu++] = uvCoords[i*2+1];
                const ts = faceShade * aos[i];
                _col[vc++] = ts * mr; _col[vc++] = ts * mg; _col[vc++] = ts * mb;
                solidVerts++;
              }
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
            }
          }
        }
      }
    }

    const topY = Math.max(16, Math.min(CHUNK_H, chunk.maxY + 2));
    const halfY = topY * 0.5;
    const sphereRadius = Math.sqrt(64 + 64 + halfY * halfY);

    // ── Upload solid geometry ─────────────────────────────────────────────
    if (!waterOnly && solidVerts > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(_pos.slice(0, vp), 3));
      geom.setAttribute('normal',   new THREE.Float32BufferAttribute(_nrm.slice(0, vn), 3));
      geom.setAttribute('uv',       new THREE.Float32BufferAttribute(_uv.slice(0, vu),  2));
      geom.setAttribute('color',    new THREE.Float32BufferAttribute(_col.slice(0, vc), 3));
      geom.setIndex(new THREE.Uint32BufferAttribute(_idx.slice(0, vi), 1));
      geom.boundingBox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(CHUNK_W, topY, CHUNK_D));
      geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(CHUNK_W * 0.5, halfY, CHUNK_D * 0.5), sphereRadius);

      chunk.mesh = new THREE.Mesh(geom, this.solidMaterial);
      chunk.mesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.mesh.frustumCulled = true;
      scene.add(chunk.mesh);
    }

    // ── Upload water/liquid geometry ──────────────────────────────────────
    if (waterVerts > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(_wpos.slice(0, wp), 3));
      geom.setAttribute('normal',   new THREE.Float32BufferAttribute(_wnrm.slice(0, wn), 3));
      geom.setAttribute('uv',       new THREE.Float32BufferAttribute(_wuv.slice(0, wu),  2));
      geom.setAttribute('color',    new THREE.Float32BufferAttribute(_wcol.slice(0, wc), 3));
      geom.setIndex(new THREE.Uint32BufferAttribute(_widx.slice(0, wi), 1));
      geom.boundingBox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(CHUNK_W, topY, CHUNK_D));
      geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(CHUNK_W * 0.5, halfY, CHUNK_D * 0.5), sphereRadius);

      chunk.waterMesh = new THREE.Mesh(geom, this.waterMaterial);
      chunk.waterMesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.waterMesh.frustumCulled = true;
      chunk.waterMesh.renderOrder = 2;
      scene.add(chunk.waterMesh);
    }

    chunk.isDirty = false;
  }
}
