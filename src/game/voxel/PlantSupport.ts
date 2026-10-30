import { BlockType } from '../../types';
import { BLOCK_DEFS, isPlantBlock, isUnderwaterPlant, isWaterBlock, isWaterSource } from './Blocks';
interface BlockReader { getBlock(x:number,y:number,z:number): BlockType }
export function requiresSupport(block:BlockType){return isPlantBlock(block)||block===BlockType.DRYING_RACK;}
const soils = new Set([BlockType.GRASS,BlockType.DIRT,BlockType.MYCELIUM,BlockType.AETHER_GRASS,BlockType.FARMLAND,BlockType.SAND_FARMLAND,BlockType.SAND,BlockType.SNOW]);
export function hasPlantSupport(world: BlockReader, x:number,y:number,z:number, plant:BlockType): boolean {
 if(y<=0 || !Number.isSafeInteger(y)) return false;
 const below=world.getBlock(x,y-1,z);
 if(plant===BlockType.TORCH||(plant>=600&&plant<612)||plant===BlockType.DRYING_RACK)return !!BLOCK_DEFS[below]?.solid;
 if(plant===BlockType.ICICLE) return !!BLOCK_DEFS[world.getBlock(x,y+1,z)]?.solid;
 if(plant===BlockType.VINE) return [[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].some(([dx,dy,dz])=>!!BLOCK_DEFS[world.getBlock(x+dx,y+dy,z+dz)]?.solid || world.getBlock(x+dx,y+dy,z+dz)===BlockType.VINE);
 if(plant===BlockType.LILYPAD) return isWaterSource(below);
 if(isUnderwaterPlant(plant)) return !!BLOCK_DEFS[below]?.solid || below===plant;
 if(plant===BlockType.WATER_ALGAE) return isWaterBlock(below) || !!BLOCK_DEFS[below]?.solid;
 if(plant===BlockType.WATER_REED || plant===BlockType.SUNFLOWER) return soils.has(below) || below===plant;
 if(plant===BlockType.SAGUARO_CACTUS || plant===BlockType.BARREL_CACTUS || plant===BlockType.PRICKLY_PEAR || plant===BlockType.FLOWERING_TORCH_CACTUS) return below===BlockType.SAND || below===plant || below===BlockType.SAND_FARMLAND;
 if(!isPlantBlock(plant)) return true;
 return soils.has(below);
}
