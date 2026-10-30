import type {Chunk} from './Chunk';
import type {MeshWorkerPool,MeshResult} from './MeshWorkerPool';

/** Mesh only occupied bands: a block at Y1,000,000 does not scan the empty gap. */
export async function meshVerticalChunk(pool:MeshWorkerPool,chunk:Chunk,neighbors:Array<Chunk|undefined>):Promise<MeshResult>{
 const bands=chunk.occupiedBands();if(!bands.length)bands.push(0);
 const results=await Promise.all(bands.map(async band=>{const base=band*160,data=chunk.band(base),near=neighbors.map(n=>n?.band(base).blocks);const result=await pool.request(chunk.cx,chunk.cz,data.blocks,159,chunk.isSicklyWater,near[0],near[1],near[2],near[3],data.water,{below:chunk.plane(base-1),above:chunk.plane(base+160)});for(const array of [result.solidPositions,result.waterPositions])for(let i=1;i<array.length;i+=3)array[i]+=base;return result;}));
 const result={...results[0]};
 for(const kind of ['solid','water'] as const){let vertexOffset=0;for(const part of results){const indices=part[`${kind}Indices`];for(let i=0;i<indices.length;i++)indices[i]+=vertexOffset;vertexOffset+=part[`${kind}Positions`].length/3;}
  for(const name of ['Positions','Normals','UVs','Colors','Indices'] as const){const key=`${kind}${name}` as const,total=results.reduce((n,r)=>n+r[key].length,0),array=name==='Indices'?new Uint32Array(total):new Float32Array(total);let offset=0;for(const part of results){array.set(part[key],offset);offset+=part[key].length;}(result as any)[key]=array;}
 }
 return result;
}
