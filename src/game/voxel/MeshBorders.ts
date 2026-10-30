import { CHUNK_W, CHUNK_H, CHUNK_D } from './ChunkConstants';
// Workers only query one face from each neighbour, not its complete 40,960-voxel volume.
export function copyMeshBorder(voxels: Uint16Array | undefined, axis: 'x' | 'z', edge: number): Uint16Array | undefined {
 if(!voxels)return undefined;
 const border=new Uint16Array(CHUNK_W*CHUNK_H);
 for(let y=0;y<CHUNK_H;y++) for(let i=0;i<CHUNK_W;i++) border[i+y*CHUNK_W]=voxels[(axis==='x'?edge+i*CHUNK_W:i+edge*CHUNK_W)+y*CHUNK_W*CHUNK_D];
 return border;
}
