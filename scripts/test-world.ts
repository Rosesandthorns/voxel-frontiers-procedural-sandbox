import assert from 'node:assert/strict';
import { encodeRuns, decodeRuns, snapshotChunk, restoreChunk, ChunkStore } from '../src/game/voxel/ChunkStore';
import { Chunk } from '../src/game/voxel/Chunk';
import { WorldGenerator } from '../src/game/voxel/WorldGenerator';
import { SUB_BIOME_REGISTRY, resolveVerdantSubBiome } from '../src/game/voxel/SubBiomeRegistry';
import { BiomeType, BlockType } from '../src/types';
import { hasPlantSupport } from '../src/game/voxel/PlantSupport';
import { setActiveWorld } from '../src/game/config/saveManager';
const disk=new Map<string,string>();
(globalThis as any).window={desktop:{store(action:string,data:string,id:string){
 if(action==='chunkList') return JSON.stringify([...disk.keys()].filter(k=>k.startsWith(id+':')).map(k=>k.slice(id.length+1)));
 if(action==='chunkWrite'){const packet=JSON.parse(data);disk.set(`${id}:${packet.key}`,JSON.stringify(packet.value));return true;}
 if(action==='chunkRead') return disk.get(`${id}:${data}`)??null;
}}};
const chunk=new Chunk(-2,3,BiomeType.VERDANT_PLAINS);chunk.setBlock(0,99,0,BlockType.STONE);chunk.setBlock(15,109,15,BlockType.OAK_WOOD);chunk.setWaterValue(1,100,2,11);
const snap=snapshotChunk(chunk,1);const restored=restoreChunk(-2,3,snap);
assert.deepEqual(restored.voxels,chunk.voxels.subarray(0,restored.voxels.length));assert.deepEqual(restored.waterValues,chunk.waterValues.subarray(0,restored.waterValues.length));assert.equal(restored.getBlock(0,159,0),BlockType.AIR);
assert.throws(()=>decodeRuns([999999,1],new Uint16Array(40)));assert.throws(()=>decodeRuns([1,1],new Uint16Array(40)));
setActiveWorld('one');let store=new ChunkStore();assert.equal(store.save(chunk,1),true);
store=new ChunkStore();const loaded=store.read(-2,3)!.chunk;assert.deepEqual(loaded.voxels,chunk.voxels.subarray(0,loaded.voxels.length));
setActiveWorld('two');assert.equal(new ChunkStore().read(-2,3),null);
const old=new WorldGenerator(321,1);const fresh=new WorldGenerator(321,2);const blend=new WorldGenerator(321,2,['0,0']);
for(let z=1;z<16;z+=4){assert.equal(blend.getHeightAt(15,z,blend.getSubBiomeAt(15,z)),old.getHeightAt(15,z,old.getSubBiomeAt(15,z)));assert.ok(Math.abs(blend.getHeightAt(16,z,blend.getSubBiomeAt(16,z))-old.getHeightAt(16,z,old.getSubBiomeAt(16,z)))<=1);}
assert.equal(blend.getHeightAt(60,8,blend.getSubBiomeAt(60,8)),fresh.getHeightAt(60,8,fresh.getSubBiomeAt(60,8)));
const params={continentalness:0.5,temperature:0,flatness:0,humidity:0,vegetation:0.3,weirdness:0};
assert.equal(resolveVerdantSubBiome(params,2).id,'silver_birch_grove');assert.notEqual(resolveVerdantSubBiome(params,1).id,'silver_birch_grove');
let ground=BlockType.AIR;const reader={getBlock:()=>ground};assert.equal(hasPlantSupport(reader,0,100,0,BlockType.JADELEAF_FERN),false);ground=BlockType.GRASS;assert.equal(hasPlantSupport(reader,0,100,0,BlockType.JADELEAF_FERN),true);ground=BlockType.WATER;assert.equal(hasPlantSupport(reader,0,100,0,BlockType.JADELEAF_FERN),false);assert.equal(hasPlantSupport(reader,0,100,0,BlockType.LILYPAD),true);
for(const key of ['SILVER_BIRCH_GROVE','HEATHER_HEATH']) {
 const generator:any=new WorldGenerator(31,2);generator.getSubBiomeAt=()=>SUB_BIOME_REGISTRY[key];generator.getHeightAt=()=>110;generator.isGroundSolidForTree=()=>true;
 let tree;for(let x=0;x<100&&!tree;x++)tree=generator.getTreeInCell(x,0);
 assert.ok(tree);const blocks:number[]=[];generator.stampTree(tree,(_x:number,y:number,_z:number,block:number)=>{assert.ok(y>110);blocks.push(block);});assert.ok(blocks.length>tree.trunkHeight);
}
console.log('Chunk compression, water state, world isolation, terrain transitions, plant support and new trees passed.');
