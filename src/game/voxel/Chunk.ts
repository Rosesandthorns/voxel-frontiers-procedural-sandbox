import * as THREE from 'three';
import { BiomeType, BlockType } from '../../types';
import { CHUNK_D, CHUNK_H, CHUNK_W } from './ChunkConstants';

export interface SurfaceMoistureTile {
  lx: number;
  ly: number;
  lz: number;
  wx: number;
  wy: number;
  wz: number;
  baseVal: number;
  isExposed: boolean;
}

export class Chunk {
  public cx: number;
  public cz: number;
  public voxels: Uint16Array;
  public waterValues: Uint8Array;
  public extraSections=new Map<number,{blocks:Uint16Array;water:Uint8Array}>();
  public hasWater: boolean = false;
  // Compact flat array of surface water coords & potentials: [lx, ly, lz, pot, ...]
  public waterSources: number[] = [];
  public surfaceMoistureTiles: Map<number, SurfaceMoistureTile> = new Map();
  public saveRevision = 0;
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
    this.voxels = new Uint16Array(CHUNK_W * CHUNK_H * CHUNK_D);
    this.waterValues = new Uint8Array(CHUNK_W * CHUNK_H * CHUNK_D);
  }

  public getIndex(x: number, y: number, z: number): number {
    return x + z * CHUNK_W + y * (CHUNK_W * CHUNK_D);
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || !Number.isSafeInteger(y) || y < 0) {
      return BlockType.AIR;
    }
    const index=this.getIndex(x,y,z);return index<this.voxels.length?this.voxels[index]:(this.extraSections.get(Math.floor(y/16))?.blocks[x+z*16+(y%16)*256]??BlockType.AIR);
  }

  public setBlock(x: number, y: number, z: number, type: BlockType) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || !Number.isSafeInteger(y) || y < 0) {
      return;
    }
    const index=this.getIndex(x,y,z);
    if(this.getBlock(x,y,z)===type)return;
    if(index<this.voxels.length)this.voxels[index]=type;
    else{const section=this.section(y,type!==BlockType.AIR);if(section){section.blocks[x+z*16+(y%16)*256]=type;this.pruneSection(y);}}
    this.saveRevision++;
    if (type !== BlockType.AIR && y > this.maxY) {
      this.maxY = y;
    }
    if(type===BlockType.AIR&&y===this.maxY)this.recomputeTop();
    this.isDirty = true;
  }

  public getWaterValue(x: number, y: number, z: number): number {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || !Number.isSafeInteger(y) || y < 0) {
      return 0;
    }
    const index=this.getIndex(x,y,z);return index<this.waterValues.length?this.waterValues[index]:(this.extraSections.get(Math.floor(y/16))?.water[x+z*16+(y%16)*256]??0);
  }

  public setWaterValue(x: number, y: number, z: number, val: number) {
    if (x < 0 || x >= CHUNK_W || z < 0 || z >= CHUNK_D || !Number.isSafeInteger(y) || y < 0) {
      return;
    }
    const index=this.getIndex(x,y,z), next=Math.max(0,Math.min(13,Math.round(val)));
    if(this.getWaterValue(x,y,z)!==next){if(index<this.waterValues.length)this.waterValues[index]=next;else{const section=this.section(y,next!==0);if(section){section.water[x+z*16+(y%16)*256]=next;this.pruneSection(y);}}this.saveRevision++;}
  }
  private section(y:number,create:boolean){const key=Math.floor(y/16);let section=this.extraSections.get(key);if(!section&&create){section={blocks:new Uint16Array(4096),water:new Uint8Array(4096)};this.extraSections.set(key,section);}return section;}
  private pruneSection(y:number){const key=Math.floor(y/16),section=this.extraSections.get(key);if(section&&!section.blocks.some(Boolean)&&!section.water.some(Boolean))this.extraSections.delete(key);}
  private recomputeTop(){let top=0;for(let i=this.voxels.length-1;i>=0;i--)if(this.voxels[i]){top=Math.floor(i/256);break;}for(const [sy,section]of this.extraSections)for(let i=4095;i>=0;i--)if(section.blocks[i]){top=Math.max(top,sy*16+Math.floor(i/256));break;}this.maxY=top;}
  public columnTop(x:number,z:number,visible:(b:BlockType)=>boolean=(b)=>b!==BlockType.AIR){let top=-1;for(const [sy,section]of this.extraSections)for(let y=15;y>=0;y--){if(visible(section.blocks[x+z*16+y*256])){top=Math.max(top,sy*16+y);break;}}for(let y=this.voxels.length/256-1;y>top;y--)if(visible(this.voxels[x+z*16+y*256]))return y;return top;}
  public occupiedBands(){const result=new Set<number>();for(let i=0;i<this.voxels.length;i++)if(this.voxels[i]||this.waterValues[i])result.add(Math.floor(i/(256*160)));for(const [sy]of this.extraSections)result.add(Math.floor(sy/10));return [...result].sort((a,b)=>a-b);}
  public band(baseY:number){const blocks=new Uint16Array(40960),water=new Uint8Array(40960),start=baseY*256;if(start<this.voxels.length){blocks.set(this.voxels.subarray(start,start+40960));water.set(this.waterValues.subarray(start,start+40960));}for(const [sy,section]of this.extraSections){const offset=(sy*16-baseY)*256;if(offset>=0&&offset<40960){blocks.set(section.blocks,offset);water.set(section.water,offset);}}return {blocks,water};}
  public plane(y:number){const plane=new Uint16Array(256);for(let z=0;z<16;z++)for(let x=0;x<16;x++)plane[x+z*16]=this.getBlock(x,y,z);return plane;}
  public cloneSections(){return [...this.extraSections].map(([y,s])=>({y,blocks:s.blocks.slice(),water:s.water.slice()}));}
  public loadSections(sections?:Array<{y:number;blocks:Uint16Array;water:Uint8Array}>){this.extraSections.clear();for(const s of sections??[]){if(!Number.isSafeInteger(s.y)||s.y<Math.ceil(this.voxels.length/4096)||s.blocks.length!==4096||s.water.length!==4096)throw new Error('Invalid vertical section');this.extraSections.set(s.y,{blocks:s.blocks,water:s.water});}
  }
}
