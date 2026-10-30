import {isLogBlock,isLeavesBlock,isPlantBlock} from './Blocks';
import {BlockType as B} from '../../types';
import type {Chunk} from './Chunk';
export interface StructureTerrain {seed:number;getHeightAt(x:number,z:number,biome:any):number;getSubBiomeAt(x:number,z:number):any}
export interface StructurePlan {id:string;kind:'village'|'fortress';x:number;z:number;y:number;radius:number;wood:B;wall:B;inhabitants:{x:number;y:number;z:number}[];blocks:Map<string,B>}
export function structureHash(x:number,z:number,seed:number){let h=Math.imul(x^seed,374761393)^Math.imul(z,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
export class StructurePlanner {
 private cache=new Map<string,StructurePlan|null>();
 constructor(private terrain:StructureTerrain,private previous:Record<string,number>={}){}
 private height(x:number,z:number){return this.terrain.getHeightAt(x,z,this.terrain.getSubBiomeAt(x,z));}
 public plan(gx:number,gz:number,kind:'village'|'fortress'):StructurePlan|null {
  const key=`${kind}:${gx},${gz}`;if(this.cache.has(key))return this.cache.get(key)!;
  const seed=this.terrain.seed+(kind==='fortress'?77199:4421),spacing=kind==='fortress'?1536:512;
  const h=structureHash(gx,gz,seed);if(h>(kind==='fortress'?.22:.4))return this.remember(key,null);
  let x=Math.round(gx*spacing+96+structureHash(gx+1,gz,seed)*(spacing-192)),z=Math.round(gz*spacing+96+structureHash(gx,gz+1,seed)*(spacing-192));const radius=kind==='fortress'?23:29;
  if(Math.hypot(x,z)<180)return this.remember(key,null);
  let biome=this.terrain.getSubBiomeAt(x,z),y=this.height(x,z);
  if(kind==='fortress'){
   if(y<150||!/range|mountain|summit|alpine|cedar|pine|crag/i.test(biome.id+' '+biome.name))return this.remember(key,null);
   let best:{x:number;z:number;y:number;biome:any;relief:number}|undefined;
   for(let dz=-96;dz<=96;dz+=32)for(let dx=-96;dx<=96;dx+=32){const px=x+dx,pz=z+dz,b=this.terrain.getSubBiomeAt(px,pz),h=this.height(px,pz);if(h<185||!/range|mountain|summit|alpine|cedar|pine|crag/i.test(b.id+' '+b.name))continue;let low=h,high=h;for(let tz=-radius;tz<=radius;tz+=8)for(let tx=-radius;tx<=radius;tx+=8){const sample=this.height(px+tx,pz+tz);low=Math.min(low,sample);high=Math.max(high,sample);}if(!best||high-low<best.relief)best={x:px,z:pz,y:h,biome:b,relief:high-low};}
   if(!best||best.relief>28)return this.remember(key,null);x=best.x;z=best.z;y=best.y;biome=best.biome;
  }
  let lo=y,hi=y;
  for(let dz=-radius;dz<=radius;dz+=8)for(let dx=-radius;dx<=radius;dx+=8){const sy=this.height(x+dx,z+dz);lo=Math.min(lo,sy);hi=Math.max(hi,sy);}
  if(kind==='fortress'&&!/range|mountain|summit|alpine|cedar|pine|crag/i.test(biome.id+' '+biome.name))return this.remember(key,null);
  if(kind==='village'&&(y<=102||lo<99||hi-lo>8)||kind==='fortress'&&(y<185||hi-lo>28))return this.remember(key,null);
  // Do not cut a structure into terrain explored before this generation existed.
  for(let cz=Math.floor((z-radius-5)/16);cz<=Math.floor((z+radius+5)/16);cz++)for(let cx=Math.floor((x-radius-5)/16);cx<=Math.floor((x+radius+5)/16);cx++)if(this.previous[`${cx},${cz}`]!==undefined&&this.previous[`${cx},${cz}`]<5)return this.remember(key,null);
  const wood=biome.isArctic?B.EVERFROST_PLANK:biome.isDesert?B.PALM_PLANK:biome.isRainforest?B.RAINFOREST_OAK_PLANK:B.OAK_PLANK,wall=biome.isDesert?B.SANDSTONE:biome.isArctic?B.COBBLESTONE:wood;
  const p:StructurePlan={id:key,kind,x,z,y:Math.round(y),radius,wood,wall,inhabitants:[],blocks:new Map()};
  const put=(px:number,py:number,pz:number,b:B)=>p.blocks.set(`${px},${py},${pz}`,b);
  const column=(px:number,pz:number,top:number,b:B)=>{const ground=this.height(px,pz);for(let py=Math.max(1,Math.min(ground,top)-2);py<=top;py++)put(px,py,pz,b);};
  const house=(hx:number,hz:number,w:number,d:number,roof:B)=>{const floor=Math.max(p.y,Math.round(this.height(hx,hz)));for(let dz=-d;dz<=d;dz++)for(let dx=-w;dx<=w;dx++){column(hx+dx,hz+dz,floor,B.COBBLESTONE);put(hx+dx,floor,hz+dz,wood);for(let dy=1;dy<=18;dy++)put(hx+dx,floor+dy,hz+dz,B.AIR);for(let dy=1;dy<=5;dy++)put(hx+dx,floor+dy,hz+dz,dy===5?roof:Math.abs(dx)===w||Math.abs(dz)===d?wall:B.AIR);if((Math.abs(dx)===w&&dz===0)||(Math.abs(dz)===d&&Math.abs(dx)===2))put(hx+dx,floor+3,hz+dz,B.GLASS);}
   const front=hz>z?-d:d;const door=biome.isArctic?B.EVERFROST_DOOR_BOTTOM:biome.isDesert?B.PALM_DOOR_BOTTOM:biome.isRainforest?B.RAINFOREST_OAK_DOOR_BOTTOM:B.OAK_DOOR_BOTTOM;put(hx,floor+1,hz+front,door);put(hx,floor+2,hz+front,(door+1) as B);put(hx-1,floor+1,hz-d+1,B.TORCH);p.inhabitants.push({x:hx+.5,y:floor+1,z:hz+.5});
   for(let dz=-d-1;dz<=d+1;dz++)for(let dx=-w-1;dx<=w+1;dx++){const rise=Math.max(0,w-Math.abs(dx));put(hx+dx,floor+6+rise,hz+dz,roof);}
   for(let step=0;step<Math.max(0,Math.abs(hz-z)-d);step++){const pz=hz+front+Math.sign(z-hz)*(step+1);for(let dx=-1;dx<=1;dx++){column(hx+dx,pz,p.y,B.COBBLESTONE);put(hx+dx,p.y+1,pz,B.AIR);put(hx+dx,p.y+2,pz,B.AIR);}}
  };
  if(kind==='village'){
   for(let dz=-radius;dz<=radius;dz++)for(let dx=-1;dx<=1;dx++){column(x+dx,z+dz,p.y,B.COBBLESTONE);put(x+dx,p.y+1,z+dz,B.AIR);put(x+dx,p.y+2,z+dz,B.AIR);}
   for(const [dx,dz,w,d] of [[-13,-14,4,4],[13,-12,3,5],[-13,12,4,3],[13,14,5,4]]){house(x+dx,z+dz,w,d,biome.isDesert?B.SANDSTONE:wood);for(let i=0;i<=Math.abs(dx);i++)for(let width=-1;width<=1;width++){column(x+Math.sign(dx)*i,z+dz+Math.sign(-dz)*(d+3)+width,p.y,B.COBBLESTONE);put(x+Math.sign(dx)*i,p.y+1,z+dz+Math.sign(-dz)*(d+3)+width,B.AIR);put(x+Math.sign(dx)*i,p.y+2,z+dz+Math.sign(-dz)*(d+3)+width,B.AIR);}}
   for(const sign of [-1,1])if(this.height(x,z+sign*38)<100){for(let dz=24;dz<=42;dz++)for(let dx=-2;dx<=2;dx++){put(x+dx,102,z+sign*dz,wood);if(Math.abs(dx)===2&&dz%5===0)for(let py=96;py<102;py++)put(x+dx,py,z+sign*dz,B.OAK_WOOD);}break;}
  }else{
   const floor=Math.round(hi);p.y=floor;
   for(let dz=-21;dz<=21;dz++)for(let dx=-21;dx<=21;dx++){column(x+dx,z+dz,floor,B.COBBLESTONE);for(let dy=1;dy<=11;dy++)put(x+dx,floor+dy,z+dz,Math.abs(dx)===21||Math.abs(dz)===21?B.COBBLESTONE:B.AIR);if((Math.abs(dx)===21||Math.abs(dz)===21)&&(dx+dz)%2===0)put(x+dx,floor+12,z+dz,B.STONE);}
   for(const dx of [-18,18])for(const dz of [-18,18])for(let tx=-3;tx<=3;tx++)for(let tz=-3;tz<=3;tz++)for(let dy=1;dy<=17;dy++)put(x+dx+tx,floor+dy,z+dz+tz,Math.abs(tx)===3||Math.abs(tz)===3||dy===16?B.STONE:B.AIR);
   for(let dx=-2;dx<=2;dx++)for(let dy=1;dy<=5;dy++)put(x+dx,floor+dy,z+21,B.AIR);
   house(x,z-5,7,6,B.STONE);p.inhabitants.push({x:x+10,y:floor+1,z:z+8});
  }
  return this.remember(key,p);
 }
 private remember(key:string,value:StructurePlan|null){this.cache.set(key,value);if(this.cache.size>256)this.cache.delete(this.cache.keys().next().value!);return value;}
 public near(cx:number,cz:number){const plans:StructurePlan[]=[];for(const kind of ['village','fortress'] as const){const spacing=kind==='fortress'?1536:512,gx=Math.floor(cx*16/spacing),gz=Math.floor(cz*16/spacing);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const p=this.plan(gx+dx,gz+dz,kind);if(p&&Math.abs(p.x-(cx*16+8))<=p.radius+24&&Math.abs(p.z-(cz*16+8))<=p.radius+24)plans.push(p);}}return plans;}
 public stamp(chunk:Chunk){for(const p of this.near(chunk.cx,chunk.cz)){if(p.kind==='village')for(let z=0;z<16;z++)for(let x=0;x<16;x++){const wx=chunk.cx*16+x,wz=chunk.cz*16+z,edge=p.radius+structureHash(wx,wz,this.terrain.seed)*3;if(Math.hypot(wx-p.x,wz-p.z)>edge)continue;const bottom=Math.floor(this.height(wx,wz))+1,top=chunk.columnTop(x,z);for(let y=bottom;y<=top;y++){const b=chunk.getBlock(x,y,z);if(isLogBlock(b)||isLeavesBlock(b)||isPlantBlock(b)){const i=x+z*16+y*256;if(i<chunk.voxels.length){chunk.voxels[i]=B.AIR;chunk.waterValues[i]=0;}else chunk.setBlock(x,y,z,B.AIR);}}}for(const [key,b]of p.blocks){const [x,y,z]=key.split(',').map(Number);if(Math.floor(x/16)===chunk.cx&&Math.floor(z/16)===chunk.cz)chunk.setBlock(x&15,y,z&15,b);}}}
}
