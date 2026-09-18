import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../voxel/VoxelWorld';

export interface RaycastHit {
  hit: boolean;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  block: BlockType;
}

export class VoxelRaycaster {
  public highlightBox: THREE.LineSegments;
  public targetedBlock: RaycastHit | null = null;
  private boxGeo: THREE.BoxGeometry;
  private edgesGeo: THREE.EdgesGeometry;
  private lineMat: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.boxGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    this.edgesGeo = new THREE.EdgesGeometry(this.boxGeo);
    this.lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    });
    this.highlightBox = new THREE.LineSegments(this.edgesGeo, this.lineMat);
    this.highlightBox.visible = false;
    scene.add(this.highlightBox);
  }

  // Fast Digital Differential Analyzer (DDA) 3D voxel traversal
  public update(
    origin: THREE.Vector3,
    yaw: number,
    pitch: number,
    world: VoxelWorld,
    maxDist: number = 6.0
  ): RaycastHit | null {
    const rayDir = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    ).normalize();

    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = Math.sign(rayDir.x);
    const stepY = Math.sign(rayDir.y);
    const stepZ = Math.sign(rayDir.z);

    const tDeltaX = Math.abs(1 / rayDir.x);
    const tDeltaY = Math.abs(1 / rayDir.y);
    const tDeltaZ = Math.abs(1 / rayDir.z);

    let tMaxX = (stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX;
    let tMaxY = (stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY;
    let tMaxZ = (stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ;

    let nx = 0;
    let ny = 0;
    let nz = 0;
    let totalDist = 0;
    let hitFound = false;

    while (totalDist < maxDist) {
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          totalDist = tMaxX;
          tMaxX += tDeltaX;
          nx = -stepX; ny = 0; nz = 0;
        } else {
          z += stepZ;
          totalDist = tMaxZ;
          tMaxZ += tDeltaZ;
          nx = 0; ny = 0; nz = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          totalDist = tMaxY;
          tMaxY += tDeltaY;
          nx = 0; ny = -stepY; nz = 0;
        } else {
          z += stepZ;
          totalDist = tMaxZ;
          tMaxZ += tDeltaZ;
          nx = 0; ny = 0; nz = -stepZ;
        }
      }

      const block = world.getBlock(x, y, z);
      if (block !== BlockType.AIR && block !== BlockType.WATER && block !== BlockType.LAVA) {
        this.targetedBlock = { hit: true, x, y, z, nx, ny, nz, block };
        this.highlightBox.position.set(x + 0.5, y + 0.5, z + 0.5);
        this.highlightBox.visible = true;
        hitFound = true;
        break;
      }
    }

    if (!hitFound) {
      this.targetedBlock = null;
      this.highlightBox.visible = false;
    }

    return this.targetedBlock;
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.highlightBox);
    this.boxGeo.dispose();
    this.edgesGeo.dispose();
    this.lineMat.dispose();
  }
}
