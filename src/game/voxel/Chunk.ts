import * as THREE from 'three';
import { BiomeType, BlockType } from '../../types';
import { CHUNK_D, CHUNK_H, CHUNK_W } from './ChunkConstants';

export class Chunk {
  public cx: number;
  public cz: number;
  public voxels: Uint8Array;
  public isDirty: boolean = true;
  public needsRemesh: boolean = false;  // set when a re-enqueue was dropped mid-flight
  public mesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public biome: BiomeType;
  public subBiomeName: string = 'Verdant Meadow';
  public subBiomeId: string = 'verdant_plains_meadow';
  public isSicklyWater: boolean = false;
  public maxY: number = 16;

  constructor(cx: number, cz: number, biome: BiomeType, subBiomeName: string = 'Verdant Meadow', subBiomeId: string = 'verdant_plains_meadow') {
    this.cx = cx;
    this.cz = cz;
    this.biome = biome;
    this.subBiomeName = subBiomeName;
    this.subBiomeId = subBiomeId;
    this.voxels = new Uint8Array(CHUNK_W * CHUNK_H * CHUNK_D);
  }

  public getIndex(x: number, y: number, z: number): number {
    return x + z * CHUNK_W + y * (CHUNK_W * CHUNK_D);
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || y < 0 || y >= CHUNK_H) {
      return BlockType.AIR;
    }
    return this.voxels[this.getIndex(x, y, z)];
  }

  public setBlock(x: number, y: number, z: number, type: BlockType) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || y < 0 || y >= CHUNK_H) {
      return;
    }
    this.voxels[this.getIndex(x, y, z)] = type;
    if (type !== BlockType.AIR && y > this.maxY) {
      this.maxY = y;
    }
    this.isDirty = true;
  }
}
