import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {Chunk} from '../src/game/voxel/Chunk';
import {snapshotChunk,restoreChunk,encodeRuns} from '../src/game/voxel/ChunkStore';
import {BiomeType,BlockType} from '../src/types';
import {WorldGenerator} from '../src/game/voxel/WorldGenerator';
import {meshVerticalChunk} from '../src/game/voxel/VerticalMeshing';
import fs from 'node:fs';

const c=new Chunk(0,0,BiomeType.VERDANT_PLAINS);c.setBlock(1,90,1,BlockType.STONE);c.setBlock(2,1_000_000,2,BlockType.OAK_PLANK);c.setWaterValue(2,1_000_000,2,7);
assert.equal(c.voxels.length,40960);assert.equal(c.extraSections.size,1);assert.equal(c.getBlock(2,999_999,2),BlockType.AIR);assert.equal(c.getBlock(2,1_000_001,2),BlockType.AIR);
const saved=snapshotChunk(c,4);const codec=createRequire(import.meta.url)('../desktop/chunk-codec.cjs');const wire=codec.unpackSnapshot(saved);assert.equal(wire.sections[0].blocks[2+2*16],BlockType.OAK_PLANK);assert.deepEqual(codec.packPayload(wire),saved);assert.equal(saved.height,96);assert.ok(JSON.stringify(saved).length<2000);const restored=restoreChunk(0,0,saved);assert.equal(restored.getBlock(2,1_000_000,2),BlockType.OAK_PLANK);assert.equal(restored.getWaterValue(2,1_000_000,2),7);assert.equal(restored.columnTop(2,2),1_000_000);
assert.equal(c.columnTop(2,2,b=>b===BlockType.STONE),-1);
const legacy=restoreChunk(0,0,{format:1,generation:3,biome:BiomeType.VERDANT_PLAINS,name:'Old',subBiome:'old',sickly:false,maxY:90,blocks:encodeRuns(c.voxels),water:encodeRuns(c.waterValues)});assert.equal(legacy.getBlock(1,90,1),BlockType.STONE);
restored.setBlock(2,1_000_000,2,BlockType.AIR);restored.setWaterValue(2,1_000_000,2,0);assert.equal(restored.extraSections.size,0,'Empty sections are removed');assert.equal(restored.maxY,90,'Removing a distant block does not leave a giant scan bound');
let calls=0;await meshVerticalChunk({request:async()=>{calls++;const result:any={cx:0,cz:0,type:'mesh',id:0};for(const kind of ['solid','water'])for(const suffix of ['Positions','Normals','UVs','Colors','Indices'])result[kind+suffix]=suffix==='Indices'?new Uint32Array():new Float32Array();return result;}} as any,c,[]);assert.equal(calls,2,'Meshing skips the million-block empty gap');
const g=new WorldGenerator(1337,4),old=new WorldGenerator(1337,3);let best={x:0,z:0,height:0,biome:''};let low=Infinity;
for(let x=-24000;x<=-23000;x+=24)for(let z=-15700;z<=-14700;z+=24){const b=g.getSubBiomeAt(x,z),h=g.getHeightAt(x,z,b);low=Math.min(low,h);if(b.id==='high_ranges'&&h>best.height)best={x,z,height:h,biome:b.id};}
assert.ok(best.height>250,'Mountains rise far above the former ceiling');assert.ok(best.height-low>150,'Distinct valleys and peaks');assert.ok(old.getHeightAt(best.x,best.z,old.getSubBiomeAt(best.x,best.z))<160);
const blended=new WorldGenerator(1337,4,[],{'0,0':3});for(let z=1;z<16;z+=4)assert.equal(blended.getHeightAt(15,z,blended.getSubBiomeAt(15,z)),old.getHeightAt(15,z,old.getSubBiomeAt(15,z)));
const tall=g.generateChunk(Math.floor(best.x/16),Math.floor(best.z/16),new Map());assert.ok(tall.voxels.length>40960);assert.notEqual(tall.getBlock(best.x&15,best.height,best.z&15),BlockType.AIR);assert.equal(tall.getBlock(best.x&15,best.height+40,best.z&15),BlockType.AIR);
fs.writeFileSync('../../work/grand-mountain-location.json',JSON.stringify(best));console.log('Sparse Y1,000,000 block/water round-trip, implicit air, empty-section removal, legacy snapshots, sparse meshing and tall mountain relief passed:',best);
