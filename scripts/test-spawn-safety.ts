import assert from 'node:assert/strict';
import {SpawnSystem} from '../src/game/world/SpawnSystem';
import {Chunk} from '../src/game/voxel/Chunk';
import {BiomeType,BlockType} from '../src/types';
import {isWaterBlock} from '../src/game/voxel/Blocks';

const chunks=new Map<string,Chunk>();
const generateChunkSync=(cx:number,cz:number)=>{const key=`${cx},${cz}`;let c=chunks.get(key);if(c)return c;c=new Chunk(cx,cz,BiomeType.VERDANT_PLAINS);for(let x=0;x<16;x++)for(let z=0;z<16;z++){c.setBlock(x,30,z,BlockType.STONE);c.setBlock(x,31,z,BlockType.WATER);c.setBlock(x,32,z,BlockType.WATER);}if(cx===0&&cz===0){c.setBlock(10,31,8,BlockType.AIR);c.setBlock(10,32,8,BlockType.AIR);c.setBlock(10,30,8,BlockType.GRASS);}chunks.set(key,c);return c;};
const world:any={chunks,modifiedBlocks:new Map(),generateChunkSync,getChunkKey:(x:number,z:number)=>`${x},${z}`,getBlockCoordKey:(x:number,y:number,z:number)=>`${x},${y},${z}`,getBlock:(x:number,y:number,z:number)=>generateChunkSync(Math.floor(x/16),Math.floor(z/16)).getBlock(x&15,y,z&15)};
const spawn=SpawnSystem.findSafeSpawn(world,8.5,8.5);assert.deepEqual(spawn,{x:10.5,y:31,z:8.5});assert.equal(isWaterBlock(world.getBlock(Math.floor(spawn.x),Math.floor(spawn.y),Math.floor(spawn.z))),false);assert.equal(world.getBlock(Math.floor(spawn.x),Math.floor(spawn.y)-1,Math.floor(spawn.z)),BlockType.GRASS);
console.log('Spawn search rejects river water and selects nearby dry land.');
