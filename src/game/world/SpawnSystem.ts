import { BlockType } from '../../types';
import { BLOCK_DEFS, isWaterBlock } from '../voxel/Blocks';
import { VoxelWorld } from '../voxel/VoxelWorld';

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
}

export class SpawnSystem {
  public static findSafeSpawn(world: VoxelWorld, targetX: number = 8.5, targetZ: number = 8.5): SpawnPoint {
    const tx=Math.floor(targetX),tz=Math.floor(targetZ);
    let spawnX=targetX,spawnZ=targetZ,naturalFloorY=-1;
    const candidates:Array<[number,number]>=[[tx,tz]];
    // Search nearby dry land in widening rings so rivers and ocean shallows are rejected.
    for(let radius=2;radius<=64;radius+=2){
      for(let d=-radius;d<=radius;d+=2)candidates.push([tx+d,tz-radius],[tx+d,tz+radius]);
      for(let d=-radius+2;d<radius;d+=2)candidates.push([tx-radius,tz+d],[tx+radius,tz+d]);
    }
    for(const [wx,wz] of candidates){
      const chunk=world.generateChunkSync(Math.floor(wx/16),Math.floor(wz/16)),lx=wx&15,lz=wz&15;
      for(let y=chunk.columnTop(lx,lz);y>=20;y--){
        const floor=chunk.getBlock(lx,y,lz),feet=chunk.getBlock(lx,y+1,lz),head=chunk.getBlock(lx,y+2,lz);
        if(BLOCK_DEFS[floor]?.solid&&!isWaterBlock(floor)&&feet===BlockType.AIR&&head===BlockType.AIR){
          spawnX=wx+.5;spawnZ=wz+.5;naturalFloorY=y;break;
        }
      }
      if(naturalFloorY>=20)break;
    }
    // Pathological all-water seeds get a dry emergency platform above the surface.
    if(naturalFloorY<20){
      const chunk=world.generateChunkSync(Math.floor(tx/16),Math.floor(tz/16)),lx=tx&15,lz=tz&15;
      naturalFloorY=Math.max(60,chunk.columnTop(lx,lz)+1);spawnX=tx+.5;spawnZ=tz+.5;
      world.modifiedBlocks.set(world.getBlockCoordKey(tx,naturalFloorY,tz),BlockType.STONE);
      chunk.setBlock(lx,naturalFloorY,lz,BlockType.STONE);
    }

    const spawnY = naturalFloorY + 1.0;

    // Carve 3x4x3 open air space above floor so player is never trapped inside blocks
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        for (let oy = 0; oy <= 3; oy++) {
          const bx = Math.floor(spawnX + ox);
          const by = Math.floor(spawnY + oy);
          const bz = Math.floor(spawnZ + oz);
          if(isWaterBlock(world.getBlock(bx,by,bz)))continue;
          world.modifiedBlocks.set(world.getBlockCoordKey(bx, by, bz), BlockType.AIR);
          const c = world.chunks.get(world.getChunkKey(Math.floor(bx / 16), Math.floor(bz / 16)));
          if (c) {
            c.setBlock(((bx % 16) + 16) % 16, by, ((bz % 16) + 16) % 16, BlockType.AIR);
          }
        }
      }
    }

    return { x: spawnX, y: spawnY, z: spawnZ };
  }
}
