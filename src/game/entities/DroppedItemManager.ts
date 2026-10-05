import * as THREE from 'three';
import { BlockType, ItemDef } from '../../types';
import { soundManager } from '../audio/SoundFX';
import { BLOCK_DEFS, isFlintBlock, isWaterBlock } from '../voxel/Blocks';
import { isWaterOrWaterlogged } from '../voxel/WaterFlora';
import { getWaterFlowVector } from '../voxel/FluidSimulation';
import { TextureAtlas, getBlockSideTexture } from '../voxel/TextureAtlas';
import { VoxelWorld } from '../voxel/VoxelWorld';

export interface DroppedItem {
  id: string;
  item: ItemDef;
  count: number;
  mesh: THREE.Object3D;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  baseGroundY: number;
  isOnGround: boolean;
  age: number;
  animTime: number;
}

export class DroppedItemManager {
  public scene: THREE.Scene;
  public world: VoxelWorld;
  public atlas: TextureAtlas;
  public droppedItems: DroppedItem[] = [];

  // Geometry cache for true voxelized extruded item drops
  private cachedItemGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private sharedExtrudedMaterial: THREE.MeshLambertMaterial;

  constructor(scene: THREE.Scene, world: VoxelWorld, atlas: TextureAtlas) {
    this.scene = scene;
    this.world = world;
    this.atlas = atlas;

    this.sharedExtrudedMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });

    // Preload custom item sprites immediately so drops have zero latency
    this.preloadItemGeometry('flint', '/ItemSprites/Flint.png');
    this.preloadItemGeometry('chalk', '/ItemSprites/Chalk.png');
    this.preloadItemGeometry('water_bucket', '/ItemSprites/WaterBucket.png');
    this.preloadItemGeometry('empty_bucket', '/ItemSprites/EmptyBucket.png');
  }

  public spawnItem(
    item: ItemDef,
    x: number,
    y: number,
    z: number,
    count: number = 1,
    customVel?: THREE.Vector3,
    initialAge: number = 0
  ): DroppedItem {
    const id = `drop_${Math.random().toString(36).substr(2, 9)}`;
    const mesh = this.createItemMesh(item);

    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const vel = customVel
      ? customVel.clone()
      : new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          2.2 + Math.random() * 0.4,
          (Math.random() - 0.5) * 1.4
        );

    const dropped: DroppedItem = {
      id,
      item,
      count,
      mesh,
      pos: new THREE.Vector3(x, y, z),
      vel,
      baseGroundY: y,
      isOnGround: false,
      age: initialAge,
      animTime: Math.random() * 10
    };

    this.droppedItems.push(dropped);
    return dropped;
  }

  /**
   * Builds either:
   * - A miniature 3D voxel block (for solid cube terrain blocks)
   * - A 2-pixel depth extruded 3D sprite with sides placed precisely along
   *   transparency contours (for flint, tools, flora, items)
   */
  private createItemMesh(item: ItemDef): THREE.Object3D {
    const isFlint = item.id === 'flint' || (item.blockId !== undefined && isFlintBlock(item.blockId));
    const isRegularCubeBlock =
      !isFlint &&
      item.type === 'block' &&
      item.blockId !== undefined &&
      BLOCK_DEFS[item.blockId]?.renderType !== 'cross' &&
      BLOCK_DEFS[item.blockId]?.renderType !== 'flat' &&
      BLOCK_DEFS[item.blockId]?.renderType !== 'wall' &&
      BLOCK_DEFS[item.blockId]?.renderType !== 'flint_nodule';

    if (isRegularCubeBlock && item.blockId !== undefined) {
      return this.createMiniatureBlockMesh(item.blockId);
    } else {
      return this.createExtrudedSpriteMesh(item);
    }
  }

  /**
   * Creates a miniature spinning voxel cube for full block drops.
   * Scaled to ~0.26 x 0.26 x 0.26 (1/4 block size).
   */
  private createMiniatureBlockMesh(blockId: BlockType): THREE.Mesh {
    const size = 0.26;
    const geometry = new THREE.BoxGeometry(size, size, size);

    const uvFace = this.atlas.uvMap.get(blockId);
    if (uvFace) {
      const uvs = geometry.attributes.uv;
      const setFaceUVs = (faceIndex: number, face: { u0: number; v0: number; u1: number; v1: number }) => {
        uvs.setXY(faceIndex * 4 + 0, face.u0, face.v1);
        uvs.setXY(faceIndex * 4 + 1, face.u1, face.v1);
        uvs.setXY(faceIndex * 4 + 2, face.u0, face.v0);
        uvs.setXY(faceIndex * 4 + 3, face.u1, face.v0);
      };

      // Faces: 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
      setFaceUVs(0, uvFace.side);
      setFaceUVs(1, uvFace.side);
      setFaceUVs(2, uvFace.top);
      setFaceUVs(3, uvFace.bottom);
      setFaceUVs(4, uvFace.side);
      setFaceUVs(5, uvFace.side);
      uvs.needsUpdate = true;
    }

    const material = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      transparent: true,
      alphaTest: 0.5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Creates a 3D extruded voxel mesh for items and non-cube blocks.
   * Accounts for transparency so that side faces are placed directly on the
   * boundaries where non-transparent pixels meet transparency, giving the sides
   * the exact pixel colors and 2 pixels of depth.
   */
  private createExtrudedSpriteMesh(item: ItemDef): THREE.Mesh {
    // 1. Check if geometry already generated and cached
    if (this.cachedItemGeometries.has(item.id)) {
      const mesh = new THREE.Mesh(this.cachedItemGeometries.get(item.id)!, this.sharedExtrudedMaterial);
      mesh.castShadow = true;
      return mesh;
    }

    // 2. Temporary fallback geometry while loading sprite
    const fallbackSize = 0.22;
    const fallbackGeo = new THREE.BoxGeometry(fallbackSize, fallbackSize, fallbackSize * (2 / 32));
    const mesh: THREE.Mesh = new THREE.Mesh(fallbackGeo, this.sharedExtrudedMaterial);
    mesh.castShadow = true;

    // 3. Resolve icon source URL
    const iconUrl = item.icon || (item.blockId !== undefined ? getBlockSideTexture(item.blockId) : '');

    if (iconUrl) {
      this.loadAndBuildGeometry(item.id, iconUrl, (builtGeo) => {
        mesh.geometry = builtGeo;
      });
    }

    return mesh;
  }

  private preloadItemGeometry(id: string, url: string): void {
    if (this.cachedItemGeometries.has(id)) return;
    this.loadAndBuildGeometry(id, url, () => {});
  }

  private loadAndBuildGeometry(
    itemId: string,
    url: string,
    onReady: (geo: THREE.BufferGeometry) => void
  ): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      const geo = this.buildExtrudedSpriteGeometry(imgData, 0.26);

      if (geo) {
        this.cachedItemGeometries.set(itemId, geo);
        onReady(geo);
      }
    };
  }

  /**
   * Generates a 3D pixel-extruded BufferGeometry from 32x32 image data.
   * - Inspects transparency (alpha > 30)
   * - Places side faces EXACTLY where solid pixels meet transparent space
   * - Colors side faces using the color of the adjacent pixel
   * - Depth: exactly 2 pixels
   * - Centered on its visual non-transparent center
   */
  private buildExtrudedSpriteGeometry(
    imgData: ImageData,
    size: number = 0.26
  ): THREE.BufferGeometry | null {
    const { width, height, data } = imgData;

    const getAlpha = (x: number, y: number): number => {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0;
      return data[(y * width + x) * 4 + 3];
    };

    // 1. Find bounding box of non-transparent pixels
    let minX = width, maxX = -1, minY = height, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX === -1) return null; // No visible pixels

    // Calculate visual center of mass
    const cx = (minX + maxX + 1) / 2;
    const cy = (minY + maxY + 1) / 2;
    const maxDim = Math.max(maxX - minX + 1, maxY - minY + 1, 16);
    const pixelSize = size / maxDim;
    const depth = pixelSize * 2.0; // exactly 2 pixels depth
    const halfZ = depth / 2;

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertCount = 0;

    const addQuad = (
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      normal: [number, number, number],
      rgb: [number, number, number]
    ) => {
      const idx = vertCount;
      positions.push(...p0, ...p1, ...p2, ...p3);
      normals.push(
        normal[0], normal[1], normal[2],
        normal[0], normal[1], normal[2],
        normal[0], normal[1], normal[2],
        normal[0], normal[1], normal[2]
      );
      colors.push(
        rgb[0], rgb[1], rgb[2],
        rgb[0], rgb[1], rgb[2],
        rgb[0], rgb[1], rgb[2],
        rgb[0], rgb[1], rgb[2]
      );
      indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
      vertCount += 4;
    };

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        if (a <= 30) continue;

        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;

        const x0 = (x - cx) * pixelSize;
        const x1 = (x + 1 - cx) * pixelSize;
        const y0 = (cy - 1 - y) * pixelSize;
        const y1 = (cy - y) * pixelSize;
        const z0 = -halfZ;
        const z1 = halfZ;

        // Front face (+Z)
        addQuad(
          [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
          [0, 0, 1],
          [r * 0.95, g * 0.95, b * 0.95]
        );

        // Back face (-Z)
        addQuad(
          [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
          [0, 0, -1],
          [r * 0.95, g * 0.95, b * 0.95]
        );

        // Top edge face (+Y) — placed where pixel borders transparency
        if (y - 1 < 0 || getAlpha(x, y - 1) <= 30) {
          addQuad(
            [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0],
            [0, 1, 0],
            [r * 1.0, g * 1.0, b * 1.0]
          );
        }

        // Bottom edge face (-Y) — placed where pixel borders transparency
        if (y + 1 >= height || getAlpha(x, y + 1) <= 30) {
          addQuad(
            [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
            [0, -1, 0],
            [r * 0.70, g * 0.70, b * 0.70]
          );
        }

        // Left edge face (-X) — placed where pixel borders transparency
        if (x - 1 < 0 || getAlpha(x - 1, y) <= 30) {
          addQuad(
            [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
            [-1, 0, 0],
            [r * 0.85, g * 0.85, b * 0.85]
          );
        }

        // Right edge face (+X) — placed where pixel borders transparency
        if (x + 1 >= width || getAlpha(x + 1, y) <= 30) {
          addQuad(
            [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
            [1, 0, 0],
            [r * 0.85, g * 0.85, b * 0.85]
          );
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    return geo;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    onCollect: (item: ItemDef, count: number) => void
  ): void {
    if (this.droppedItems.length === 0) return;

    const chestPos = new THREE.Vector3(playerPos.x, playerPos.y + 0.8, playerPos.z);
    const remaining: DroppedItem[] = [];

    const isSolidAt = (x: number, y: number, z: number): boolean => {
      const bx = Math.floor(x);
      const by = Math.floor(y);
      const bz = Math.floor(z);
      if (by < 0 || by >= 256) return false;
      const b = this.world.getBlock(bx, by, bz);
      const def = (BLOCK_DEFS as Record<number, { solid?: boolean }>)[b];
      return Boolean(def?.solid);
    };

    for (let i = 0; i < this.droppedItems.length; i++) {
      const drop = this.droppedItems[i];
      drop.age += delta;
      drop.animTime += delta;

      // 1. Continuous Ground Support Check:
      // Even if previously on ground, verify the block beneath is still solid.
      // If broken/mined away or unsupported, drop must resume falling immediately!
      const hasSolidGround = isSolidAt(drop.pos.x, drop.pos.y - 0.05, drop.pos.z);
      if (!hasSolidGround) {
        drop.isOnGround = false;
      }

      // If item is trapped inside a solid block, gently push it up towards the surface
      if (isSolidAt(drop.pos.x, drop.pos.y + 0.1, drop.pos.z)) {
        drop.pos.y += 3.0 * delta;
        drop.isOnGround = false;
      }

      // 2. Continuous Physics Update
      const itemBlockY = Math.floor(drop.pos.y + 0.1);
      const itemBlock = this.world.getBlock(Math.floor(drop.pos.x), itemBlockY, Math.floor(drop.pos.z));
      const footBlock = this.world.getBlock(Math.floor(drop.pos.x), Math.floor(drop.pos.y), Math.floor(drop.pos.z));
      const isInWater =
        isWaterBlock(itemBlock) ||
        isWaterOrWaterlogged(itemBlock, itemBlockY) ||
        isWaterBlock(footBlock) ||
        isWaterOrWaterlogged(footBlock, Math.floor(drop.pos.y));

      const flow = isInWater ? getWaterFlowVector(this.world, drop.pos.x, drop.pos.y, drop.pos.z) : new THREE.Vector3(0, 0, 0);
      const hasFlow = flow.x !== 0 || flow.z !== 0 || flow.y !== 0;

      if (hasFlow) {
        // Slow but steady push in flowing direction (~1.25 blocks/sec)
        const flowSpeed = 1.25;
        drop.vel.x += (flow.x * flowSpeed - drop.vel.x) * Math.min(1.0, 3.5 * delta);
        drop.vel.z += (flow.z * flowSpeed - drop.vel.z) * Math.min(1.0, 3.5 * delta);

        if (flow.y < 0) {
          drop.vel.y += (flow.y * 2.2 - drop.vel.y) * Math.min(1.0, 3.5 * delta);
          drop.isOnGround = false;
        }
      }

      if (drop.isOnGround) {
        if (hasFlow && (flow.x !== 0 || flow.z !== 0)) {
          // Flowing water pushes items along the canal floor
          const nextX = drop.pos.x + drop.vel.x * delta;
          const nextZ = drop.pos.z + drop.vel.z * delta;
          if (!isSolidAt(nextX, drop.pos.y + 0.1, drop.pos.z)) {
            drop.pos.x = nextX;
          } else {
            drop.vel.x = 0;
          }
          if (!isSolidAt(drop.pos.x, drop.pos.y + 0.1, nextZ)) {
            drop.pos.z = nextZ;
          } else {
            drop.vel.z = 0;
          }
        } else {
          // Friction on dry ground or calm water floor
          drop.vel.x *= Math.pow(0.4, delta * 60);
          drop.vel.z *= Math.pow(0.4, delta * 60);
          drop.vel.y = 0;
        }
      } else {
        if (isInWater) {
          // Buoyancy in water: gentle sinking and water drag
          drop.vel.y = Math.max(-2.0, drop.vel.y - 4.0 * delta);
          drop.vel.x *= Math.pow(0.88, delta * 60);
          drop.vel.z *= Math.pow(0.88, delta * 60);
        } else {
          // In air: gravity & horizontal air resistance
          drop.vel.y -= 16.0 * delta;
          drop.vel.x *= Math.pow(0.96, delta * 60);
          drop.vel.z *= Math.pow(0.96, delta * 60);
        }

        // Horizontal X collision (slide / bounce gently off walls without stopping vertically)
        if (Math.abs(drop.vel.x) > 0.001) {
          const signX = Math.sign(drop.vel.x);
          const nextX = drop.pos.x + drop.vel.x * delta;
          if (isSolidAt(nextX + signX * 0.15, drop.pos.y + 0.1, drop.pos.z)) {
            drop.vel.x = -drop.vel.x * 0.25;
          } else {
            drop.pos.x = nextX;
          }
        }

        // Horizontal Z collision (slide / bounce gently off walls without stopping vertically)
        if (Math.abs(drop.vel.z) > 0.001) {
          const signZ = Math.sign(drop.vel.z);
          const nextZ = drop.pos.z + drop.vel.z * delta;
          if (isSolidAt(drop.pos.x, drop.pos.y + 0.1, nextZ + signZ * 0.15)) {
            drop.vel.z = -drop.vel.z * 0.25;
          } else {
            drop.pos.z = nextZ;
          }
        }

        // Vertical Y collision
        const nextY = drop.pos.y + drop.vel.y * delta;
        if (drop.vel.y < 0) {
          // Falling downward: check for floor impact
          if (isSolidAt(drop.pos.x, nextY, drop.pos.z)) {
            const surfaceY = Math.floor(nextY) + 1.0;
            drop.pos.y = surfaceY;
            drop.baseGroundY = surfaceY;
            drop.vel.y = 0;
            drop.isOnGround = true;
          } else {
            drop.pos.y = nextY;
          }
        } else {
          // Moving upward: check ceiling impact
          if (isSolidAt(drop.pos.x, nextY + 0.25, drop.pos.z)) {
            drop.vel.y = 0;
          } else {
            drop.pos.y = nextY;
          }
        }

        // Void despawn check
        if (drop.pos.y < -10) {
          this.scene.remove(drop.mesh);
          continue;
        }
      }

      // 3. Spinning & gentle floating bob animation
      drop.mesh.rotation.y += delta * 1.2;

      let displayY = drop.pos.y;
      if (drop.isOnGround) {
        displayY = drop.pos.y + Math.sin(drop.animTime * 2.5) * 0.03 + 0.1;
      }
      drop.mesh.position.set(drop.pos.x, displayY, drop.pos.z);

      // 3. Player collection & magnetic pickup
      if (drop.age > 0.35) {
        const dist = drop.pos.distanceTo(chestPos);

        if (dist < 2.2) {
          // Magnetic attraction towards player chest
          const pullDir = chestPos.clone().sub(drop.pos).normalize();
          const pullSpeed = Math.min(10.0, 4.0 + (2.2 - dist) * 6.0);
          drop.pos.addScaledVector(pullDir, pullSpeed * delta);
          drop.isOnGround = false;
        }

        if (dist < 0.65) {
          // Collected!
          onCollect(drop.item, drop.count);
          soundManager.playItemPickup();
          this.scene.remove(drop.mesh);
          continue;
        }
      }

      // Despawn after 5 minutes
      if (drop.age > 300) {
        this.scene.remove(drop.mesh);
        continue;
      }

      remaining.push(drop);
    }

    this.droppedItems = remaining;
  }

  public destroy(): void {
    for (const drop of this.droppedItems) {
      this.scene.remove(drop.mesh);
    }
    this.droppedItems = [];
    this.cachedItemGeometries.clear();
  }
}
