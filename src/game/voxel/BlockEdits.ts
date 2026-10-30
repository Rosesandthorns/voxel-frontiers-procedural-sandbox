import type { BlockType } from '../../types';
// Keep edited blocks indexed by chunk so streaming does not scan the world's entire edit history.
export class BlockEdits extends Map<string,BlockType> {
 private byChunk=new Map<string,Map<string,BlockType>>();
 constructor(entries?:Iterable<readonly [string,BlockType]>){super();if(entries)for(const [key,value]of entries)this.set(key,value); }
 private chunkKey(key:string){const comma=key.indexOf(','),last=key.lastIndexOf(',');return `${Math.floor(Number(key.slice(0,comma))/16)},${Math.floor(Number(key.slice(last+1))/16)}`;}
 override set(key:string,value:BlockType):this {
  super.set(key,value);const chunk=this.chunkKey(key);let edits=this.byChunk.get(chunk);
  if(!edits){edits=new Map();this.byChunk.set(chunk,edits);}edits.set(key,value);return this;
 }
 override delete(key:string):boolean {const removed=super.delete(key);if(removed){const chunk=this.chunkKey(key),edits=this.byChunk.get(chunk);edits?.delete(key);if(edits?.size===0)this.byChunk.delete(chunk);}return removed;}
 override clear(){super.clear();this.byChunk.clear();}
 forChunk(cx:number,cz:number):Iterable<[string,BlockType]>{return this.byChunk.get(`${cx},${cz}`) ?? [];}
}
