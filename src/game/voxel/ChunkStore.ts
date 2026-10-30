import { Chunk } from './Chunk';
import { CHUNK_H } from './ChunkConstants';
import { getActiveWorld } from '../config/saveManager';
import type { BiomeType } from '../../types';
export interface ChunkSnapshot { format: 1 | 2; height?:number; sections?:Array<{y:number;blocks:number[];water:number[]}>; generation: number; biome: BiomeType; name: string; subBiome: string; sickly: boolean; maxY: number; blocks: number[]; water: number[] }
export function encodeRuns(values: Uint16Array | Uint8Array): number[] {
 const result: number[] = [];
 for (let i = 0; i < values.length;) { const value = values[i]; let end = i + 1; while (end < values.length && values[end] === value) end++; result.push(end-i,value); i=end; }
 return result;
}
export function decodeRuns(runs: number[], target: Uint16Array | Uint8Array) {
 if (!Array.isArray(runs) || runs.length % 2) throw new Error('Invalid chunk data');
 let offset = 0;
 for (let i=0;i<runs.length;i+=2) { const [count,value]=[runs[i],runs[i+1]]; if (!Number.isInteger(count) || count <= 0 || offset+count > target.length || !Number.isInteger(value) || value < 0 || value > (target instanceof Uint8Array ? 255 : 65535)) throw new Error('Invalid chunk run'); target.fill(value,offset,offset+count);offset+=count; }
 if (offset !== target.length) throw new Error('Incomplete chunk');
}
export function snapshotChunk(chunk: Chunk, generation: number): ChunkSnapshot {
 let last=chunk.voxels.length-1;while(last>=0&&!chunk.voxels[last]&&!chunk.waterValues[last])last--;
 const height=Math.max(16,Math.ceil((Math.floor(last/256)+1)/16)*16);
 return {format:2,height,generation,biome:chunk.biome,name:chunk.subBiomeName,subBiome:chunk.subBiomeId,sickly:chunk.isSicklyWater,maxY:chunk.maxY,blocks:encodeRuns(chunk.voxels.subarray(0,height*256)),water:encodeRuns(chunk.waterValues.subarray(0,height*256)),sections:chunk.cloneSections().map(s=>({y:s.y,blocks:encodeRuns(s.blocks),water:encodeRuns(s.water)}))};
}
export function restoreChunk(cx: number, cz: number, value: ChunkSnapshot): Chunk {
 if (![1,2].includes(value.format) || !Number.isInteger(value.generation) || !Number.isInteger(value.maxY) || value.maxY < 0 || !Number.isSafeInteger(value.maxY)) throw new Error('Unsupported chunk snapshot');
 const chunk = new Chunk(cx,cz,value.biome,value.name,value.subBiome);
 const height=value.format===1?160:value.height!;if(!Number.isSafeInteger(height)||height<16||height%16||height>65536)throw new Error('Invalid dense chunk height');
 chunk.voxels=new Uint16Array(height*256);chunk.waterValues=new Uint8Array(height*256);
 decodeRuns(value.blocks,chunk.voxels);decodeRuns(value.water,chunk.waterValues);
 chunk.loadSections(value.sections?.map(s=>{const blocks=new Uint16Array(4096),water=new Uint8Array(4096);decodeRuns(s.blocks,blocks);decodeRuns(s.water,water);return {y:s.y,blocks,water};}));
 chunk.maxY=value.maxY;chunk.isSicklyWater=value.sickly; return chunk;
}
interface PendingChunk { chunk: Chunk; generation: number; retryAfter?: number }
export class ChunkStore {
 private worldId = getActiveWorld();
 private closed=false;
 private pending = new Map<string, PendingChunk>();
 private savedRevision = new WeakMap<Chunk,number>();
 private writing = new Set<string>();
 private activeWrites = 0;
 private activeReads = 0;
 private readWaiters: Array<()=>void> = [];
 private failedKeys=new Map<string,unknown>();
 get hasWriteError(){return this.failedKeys.size>0;}
 get lastWriteError(){return this.failedKeys.values().next().value ?? null;}
 readonly keys: Set<string>;
 constructor() {
  this.keys = new Set(window.desktop ? JSON.parse(window.desktop.store('chunkList',undefined,this.worldId) as string) : JSON.parse(localStorage.getItem(`biome-chunks-${this.worldId}`) || '[]'));
 }
 private clonePending(entry: PendingChunk) {
  const source=entry.chunk;
  const chunk=new Chunk(source.cx,source.cz,source.biome,source.subBiomeName,source.subBiomeId);
  chunk.voxels=source.voxels.slice();chunk.waterValues=source.waterValues.slice();chunk.maxY=source.maxY;chunk.isSicklyWater=source.isSicklyWater;chunk.loadSections(source.cloneSections());
  return {chunk,generation:entry.generation};
 }
 read(cx:number,cz:number): {chunk:Chunk;generation:number} | null {
  const key=`${cx},${cz}`, queued=this.pending.get(key);
  if(queued) return this.clonePending(queued);
  if(!this.keys.has(key)) return null;
  const raw=JSON.parse((window.desktop ? window.desktop.store('chunkRead',key,this.worldId) : localStorage.getItem(`biome-chunk-${this.worldId}-${key}`)) as string);
  if(!raw) throw new Error(`Missing explored chunk ${key}`);
  const chunk=restoreChunk(cx,cz,raw);this.savedRevision.set(chunk,chunk.saveRevision);
  return {chunk,generation:raw.generation};
 }
 async readAsync(cx:number,cz:number): Promise<{chunk:Chunk;generation:number}|null> {
  if(this.closed)throw new Error('World unloaded');
  const key=`${cx},${cz}`,queued=this.pending.get(key);
  const remote=this.worldId.startsWith('online-');
  if(queued&&!remote) return this.clonePending(queued);
  if(!this.keys.has(key)&&!remote) return null;
  if(!window.desktop?.chunks) return this.read(cx,cz);
  if(this.activeReads>=2) await new Promise<void>(resolve=>this.readWaiters.push(resolve));
  else this.activeReads++;
  let raw:any;
  try {if(this.closed)throw new Error('World unloaded');raw=await window.desktop.chunks('read',{key},this.worldId);if(this.closed)throw new Error('World unloaded');}
  finally {const next=this.readWaiters.shift();if(next)next();else this.activeReads--;}
  if(![1,2].includes(raw.format) || !Number.isInteger(raw.maxY) || raw.maxY<0 || !Number.isSafeInteger(raw.maxY) || raw.voxels?.length!==(raw.height??160)*256 || raw.waterValues?.length!==raw.voxels?.length)throw new Error('Invalid explored chunk');
  const chunk=new Chunk(cx,cz,raw.biome,raw.name,raw.subBiome);
  chunk.voxels=raw.voxels;chunk.waterValues=raw.waterValues;chunk.maxY=raw.maxY;chunk.isSicklyWater=raw.sickly;chunk.loadSections(raw.sections);
  this.savedRevision.set(chunk,chunk.saveRevision);return {chunk,generation:raw.generation};
 }
 queue(chunk:Chunk,generation:number) {
  if(this.savedRevision.get(chunk)===chunk.saveRevision) return;
  const key=`${chunk.cx},${chunk.cz}`;
  if(this.pending.get(key)?.chunk!==chunk) this.pending.set(key,{chunk,generation});
 }
 // One small batch per frame; compression and disk I/O happen in the desktop main process.
 process(maxConcurrent=2) {
  if(this.closed || this.activeWrites>=maxConcurrent) return;
  for(const [key,entry] of this.pending) {
   if(this.writing.has(key) || (entry.retryAfter ?? 0)>performance.now()) continue;
   if(!window.desktop?.chunks){this.save(entry.chunk,entry.generation);return;}
   const chunk=entry.chunk,revision=chunk.saveRevision;
   const value={format:2,height:chunk.voxels.length/256,sections:chunk.cloneSections(),generation:entry.generation,biome:chunk.biome,name:chunk.subBiomeName,subBiome:chunk.subBiomeId,sickly:chunk.isSicklyWater,maxY:chunk.maxY,voxels:chunk.voxels.slice(),waterValues:chunk.waterValues.slice()};
   this.writing.add(key);this.activeWrites++;
   window.desktop.chunks('write',{key,value},this.worldId).then(()=>{
    this.keys.add(key);
    // A manual checkpoint or newer edit may have superseded this background snapshot.
    if(this.pending.get(key)===entry){this.savedRevision.set(chunk,revision);if(chunk.saveRevision===revision)this.pending.delete(key);}
    if(this.pending.get(key)===undefined && this.savedRevision.get(chunk)===revision)this.failedKeys.delete(key);
   }).catch(error=>{
    // Ignore failures for a snapshot already replaced by a successful checkpoint/newer queued chunk.
    if(this.pending.get(key)!==entry || (this.savedRevision.get(chunk) ?? -1)>=revision)return;
    entry.retryAfter=performance.now()+5000;
    if(!this.hasWriteError)console.error('Background chunk save failed',key,error);
    this.failedKeys.set(key,error);
   }).finally(()=>{this.writing.delete(key);this.activeWrites--;});
   if(this.activeWrites>=maxConcurrent) break;
  }
 }
 save(chunk:Chunk,generation:number): boolean {
  if(this.savedRevision.get(chunk)===chunk.saveRevision) return true;
  const key=`${chunk.cx},${chunk.cz}`;
  this.queue(chunk,generation);
  try {
   const value=snapshotChunk(chunk,generation);
   if(window.desktop)window.desktop.store('chunkWrite',JSON.stringify({key,value}),this.worldId);
   else {localStorage.setItem(`biome-chunk-${this.worldId}-${key}`,JSON.stringify(value));localStorage.setItem(`biome-chunks-${this.worldId}`,JSON.stringify([...new Set([...this.keys,key])]));}
   this.keys.add(key);this.savedRevision.set(chunk,chunk.saveRevision);this.pending.delete(key);this.failedKeys.delete(key);return true;
  }catch(error){console.error('Chunk save failed',key,error);this.failedKeys.set(key,error);return false;}
 }
 close(){this.closed=true;}
 flush():boolean {let ok=true;for(const entry of this.pending.values())if(!this.save(entry.chunk,entry.generation))ok=false;return ok;}
}
