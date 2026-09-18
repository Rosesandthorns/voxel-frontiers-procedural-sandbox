import * as THREE from 'three';
import { BlockType } from '../../types';
import { BLOCK_DEFS } from './Blocks';
import { Chunk } from './Chunk';
import { CHUNK_D, CHUNK_H, CHUNK_W, CUBE_FACES, SEA_LEVEL } from './ChunkConstants';
import { TextureAtlas } from './TextureAtlas';
import { isWaterFaceCulled, isWaterloggedPlant } from './WaterFlora';

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
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
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
    nbPosZ?: Chunk
  ) {
    // Dispose previous geometry
    if (chunk.mesh) {
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
        if (nbNegX) return nbNegX.voxels[(CHUNK_W - 1) + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
        return getBlockTypeGlobal(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_D + z);
      }
      if (x >= CHUNK_W && z >= 0 && z < CHUNK_D) {
        if (nbPosX) return nbPosX.voxels[0 + z * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
        return getBlockTypeGlobal(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_D + z);
      }
      if (z < 0 && x >= 0 && x < CHUNK_W) {
        if (nbNegZ) return nbNegZ.voxels[x + (CHUNK_D - 1) * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
        return getBlockTypeGlobal(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_D + z);
      }
      if (z >= CHUNK_D && x >= 0 && x < CHUNK_W) {
        if (nbPosZ) return nbPosZ.voxels[x + 0 * CHUNK_W + y * (CHUNK_W * CHUNK_D)];
        return getBlockTypeGlobal(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_D + z);
      }
      return getBlockTypeGlobal(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_D + z);
    };

    const maxScanY = Math.min(CHUNK_H - 1, chunk.maxY);

    for (let y = 0; y <= maxScanY; y++) {
      const yOffset = y * (CHUNK_W * CHUNK_D);
      for (let z = 0; z < CHUNK_D; z++) {
        const zOffset = z * CHUNK_W;
        for (let x = 0; x < CHUNK_W; x++) {
          const block = chunk.voxels[x + zOffset + yOffset];
          if (block === BlockType.AIR) continue;

          const def = BLOCK_DEFS[block];
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
          } else if (def.renderType === 'wall' || block === BlockType.VINE) {
            // Flat against a wall and vertically (Rainforest Vines)
            const blockUVs = this.atlas.getUVs(block);
            const uvFace = blockUVs.side || blockUVs.top;

            const isWallBlock = (b: BlockType): boolean => {
              if (b === BlockType.AIR || b === BlockType.VINE || b === BlockType.WATER || b === BlockType.LAVA) return false;
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
            const uvFace = blockUVs.top;
            // Underwater quad (y-0.95) — sits at water surface level, visible from below.
            // Above-water quad (y+0.1) — sits 0.1 above water top face, in solid mesh
            // so depthWrite:true wins against the water surface from above.
            const underwaterY = -0.95;
            { // underwater — goes in water mesh (renderOrder 2)
              const vertIndex = waterVerts;
              for (let i = 0; i < 4; i++) {
                const cx2 = i === 0 || i === 3 ? 0 : 1;
                const cz2 = i < 2 ? 0 : 1;
                _wpos[wp++] = x + cx2; _wpos[wp++] = y + underwaterY; _wpos[wp++] = z + cz2;
                _wnrm[wn++] = 0; _wnrm[wn++] = 1; _wnrm[wn++] = 0;
                _wuv[wu++]  = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
                _wuv[wu++]  = i < 2 ? uvFace.v0 : uvFace.v1;
                _wcol[wc++] = 1.0; _wcol[wc++] = 1.0; _wcol[wc++] = 1.0;
                waterVerts++;
              }
              _widx[wi++] = waterVerts-4; _widx[wi++] = waterVerts-3; _widx[wi++] = waterVerts-2;
              _widx[wi++] = waterVerts-4; _widx[wi++] = waterVerts-2; _widx[wi++] = waterVerts-1;
            }
            { // above water — goes in solid mesh (depthWrite:true beats water from above)
              const aboveY = 0.1;
              const vertIndex = solidVerts;
              for (let i = 0; i < 4; i++) {
                const cx2 = i === 0 || i === 3 ? 0 : 1;
                const cz2 = i < 2 ? 0 : 1;
                _pos[vp++] = x + cx2; _pos[vp++] = y + aboveY; _pos[vp++] = z + cz2;
                _nrm[vn++] = 0; _nrm[vn++] = 1; _nrm[vn++] = 0;
                _uv[vu++]  = i === 0 || i === 3 ? uvFace.u0 : uvFace.u1;
                _uv[vu++]  = i < 2 ? uvFace.v0 : uvFace.v1;
                _col[vc++] = 1.0; _col[vc++] = 1.0; _col[vc++] = 1.0;
                solidVerts++;
              }
              _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
              _idx[vi++] = vertIndex; _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
            }
            if (!isWaterlogged) continue;
          }

          const isPureWater = block === BlockType.WATER;
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
              if (isWaterFaceCulled(neighborBlock, ny, y + ny, neighborIsSolid)) continue;
            } else if (isPureLava) {
              if (neighborBlock === BlockType.LAVA || neighborBlock === BlockType.WATER) continue;
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
                _wpos[wp++] = x + c[0]; _wpos[wp++] = y + c[1]; _wpos[wp++] = z + c[2];
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
              for (let i = 0; i < 4; i++) {
                const c = face.corners[i];
                _pos[vp++] = x + c[0]; _pos[vp++] = y + c[1]; _pos[vp++] = z + c[2];
                _nrm[vn++] = nx; _nrm[vn++] = ny; _nrm[vn++] = nz;
                _uv[vu++]  = uvCoords[i*2]; _uv[vu++] = uvCoords[i*2+1];
                const ts = faceShade * aos[i];
                _col[vc++] = ts; _col[vc++] = ts; _col[vc++] = ts;
                solidVerts++;
              }
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+1; _idx[vi++] = vertIndex+2;
              _idx[vi++] = vertIndex;   _idx[vi++] = vertIndex+2; _idx[vi++] = vertIndex+3;
            }
          }
        }
      }
    }

    // ── Upload solid geometry ─────────────────────────────────────────────
    if (solidVerts > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(_pos.slice(0, vp), 3));
      geom.setAttribute('normal',   new THREE.Float32BufferAttribute(_nrm.slice(0, vn), 3));
      geom.setAttribute('uv',       new THREE.Float32BufferAttribute(_uv.slice(0, vu),  2));
      geom.setAttribute('color',    new THREE.Float32BufferAttribute(_col.slice(0, vc), 3));
      geom.setIndex(new THREE.Uint32BufferAttribute(_idx.slice(0, vi), 1));
      geom.computeBoundingBox();
      geom.computeBoundingSphere();

      chunk.mesh = new THREE.Mesh(geom, this.solidMaterial);
      chunk.mesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.mesh.frustumCulled = false;
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
      geom.computeBoundingBox();
      geom.computeBoundingSphere();

      chunk.waterMesh = new THREE.Mesh(geom, this.waterMaterial);
      chunk.waterMesh.position.set(chunk.cx * CHUNK_W, 0, chunk.cz * CHUNK_D);
      chunk.waterMesh.frustumCulled = true;
      chunk.waterMesh.renderOrder = 2;
      scene.add(chunk.waterMesh);
    }

    chunk.isDirty = false;
  }
}
