import {BlockType as B,EntitySpecies as S,type EntityState,type ItemDef} from '../../types';
import {BLOCK_DEFS,isWaterBlock,isDoorBottom,isDoorOpen,getDoorOppositeStateBlock,getDoorTopForBottom} from '../voxel/Blocks';
import {structureHash} from '../voxel/Structures';
import type {WorldGenerator} from '../voxel/WorldGenerator';
export interface CreatureDef {color:number;size:[number,number,number];habitat:string;speed:number;aquatic?:boolean;bird?:boolean;hostile?:boolean;meat?:string;hide?:boolean}
export const BETA_CREATURES:Partial<Record<S,CreatureDef>>={
 [S.VILLAGER]:{color:0x96785b,size:[.55,1.7,.5],habitat:'Villages',speed:1.1},
 [S.FORTRESS_KEEPER]:{color:0x65717b,size:[.6,1.8,.55],habitat:'Mountain fortresses',speed:1},
 [S.PENGUIN]:{color:0x242d3b,size:[.55,.85,.5],habitat:'Arctic',speed:.8,meat:'penguin'},
 [S.WOLF]:{color:0xa5a9ad,size:[.55,.8,1],habitat:'Mountains',speed:1.6,meat:'wolf',hide:true},
 [S.PIGEON]:{color:0x89929b,size:[.3,.4,.45],habitat:'Villages',speed:.9,bird:true,meat:'pigeon'},
 [S.CAT]:{color:0xbd936d,size:[.35,.5,.65],habitat:'Villages',speed:1.4,meat:'cat',hide:true},
 [S.SNAKE]:{color:0x938656,size:[.25,.2,1],habitat:'Deserts',speed:.7,meat:'snake'},
 [S.RAT]:{color:0x8b7e73,size:[.3,.3,.5],habitat:'Deserts',speed:1.2,meat:'rat'},
 [S.COD]:{color:0xb4a891,size:[.25,.3,.65],habitat:'Ocean',speed:1.3,aquatic:true,meat:'cod'},
 [S.TROPICAL_FISH]:{color:0xeab352,size:[.25,.35,.5],habitat:'Ocean',speed:1.1,aquatic:true,meat:'tropical_fish'},
 [S.SQUID]:{color:0x3c496a,size:[.8,1.2,.8],habitat:'Deep ocean',speed:.7,aquatic:true,meat:'squid'},
 [S.COW]:{color:0x705547,size:[.9,1.2,1.4],habitat:'Grasslands',speed:.8,meat:'beef',hide:true},
 [S.PIG]:{color:0xdb9e9e,size:[.75,.8,1],habitat:'Grasslands',speed:.9,meat:'pork',hide:true},
 [S.SHEEP]:{color:0xdcd7c6,size:[.8,1,1.1],habitat:'Grasslands',speed:.8,meat:'mutton',hide:true},
 [S.SEAGULL]:{color:0xe0e4e5,size:[.4,.45,.55],habitat:'Coasts',speed:1.2,bird:true,meat:'seagull'},
 [S.SLIME]:{color:0x80b967,size:[.8,.7,.8],habitat:'Complete darkness',speed:.55,hostile:true},
 [S.SHADOW_REAPER]:{color:0x13121b,size:[.6,1.9,.6],habitat:'Darkness after day three',speed:2.8,hostile:true},
 [S.BOAT]:{color:0x9b7549,size:[1.3,.45,1.8],habitat:'Water',speed:5,aquatic:true},
};
export function creatureState(id:string,species:S,x:number,y:number,z:number):EntityState{return {id,species,x,y,z,vx:0,vy:0,vz:0,rotationY:0,pitch:0,health:species===S.SLIME?12:20,maxHealth:species===S.SLIME?12:20,isHostile:!!BETA_CREATURES[species]?.hostile,isTamed:false,isRidden:false,customTimer:0,targetPos:null,uniqueData:species===S.SLIME?{color:[0x80b967,0x738fb7,0xb885af,0xcab36c][Math.floor(structureHash(Math.floor(x),Math.floor(z),13)*4)]}:{},lastInteractionTime:0};}
const legacyFood:Partial<Record<S,{meat:string;hide?:boolean}>>={[S.REDWOOD_FOX]:{meat:'fox',hide:true},[S.GLIMMER_FOX]:{meat:'fox',hide:true},[S.CARDINAL]:{meat:'cardinal'},[S.SALMON]:{meat:'salmon'},[S.DUNE_CRAB]:{meat:'crab'},[S.MAGMA_SALAMANDER]:{meat:'salamander'},[S.SKY_RAY]:{meat:'ray'},[S.CRYSTAL_BASILISK]:{meat:'basilisk',hide:true}};
export const CREATURE_FOOD:Record<string,ItemDef>={};
for(const def of [...Object.values(BETA_CREATURES),...Object.values(legacyFood)])if(def.meat){const meat=def.meat,label=meat.replaceAll('_',' ');for(const cooked of [false,true]){const id=(cooked?'cooked_':'raw_')+meat;CREATURE_FOOD[id]={id,name:(cooked?'Cooked ':'Raw ')+label,type:'food',maxStack:64,description:cooked?'Cooked meat. Eat before it spoils.':'Cook in a furnace or dry into jerky.',nutrition:cooked?35:10,shelfLifeDays:cooked?5:2,icon:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${cooked?'#805239':'#b36a65'}" d="M2 5h3V3h7v2h2v7h-3v2H4v-2H2z"/><path fill="#e0c4a0" d="M9 5h3v2H9z"/></svg>`) };}}
export function creatureLoot(species:S):ItemDef[]{if(species===S.BOAT)return [{id:'wooden_boat',name:'Wooden Boat',type:'utility',maxStack:1,icon:'',description:'Place on water.'}];const def=BETA_CREATURES[species]??legacyFood[species];return def?.meat?[CREATURE_FOOD['raw_'+def.meat],...(def.hide?[{id:'raw_hide',name:'Raw Hide',type:'utility' as const,maxStack:64,description:'Dry on a drying rack to make leather.',icon:''}]:[])]:[];}
export interface CreatureReader {getBlock(x:number,y:number,z:number):B;setBlock(x:number,y:number,z:number,b:B):unknown}
export interface CreatureTarget{x:number;y:number;z:number;id?:string}
export function operateBoat(states:EntityState[],world:Pick<CreatureReader,'getBlock'>,action:string,id:string|undefined,pose:CreatureTarget,owner:string,add:(s:EntityState)=>void){
 if(action==='place'){if(states.length>=128)throw new Error('Too many creatures or boats nearby.');const x=Math.floor(pose.x),y=Math.floor(pose.y),z=Math.floor(pose.z);if(!isWaterBlock(world.getBlock(x,y,z)))throw new Error('Place boats on water.');if(states.some(s=>s.species===S.BOAT&&Math.hypot(s.x-pose.x,s.z-pose.z)<1.5))throw new Error('There is already a boat here.');const s=creatureState('boat:'+Date.now()+':'+Math.random().toString(36).slice(2,7),S.BOAT,x+.5,y+.7,z+.5);add(s);return {id:s.id,coords:{x:s.x,y:s.y+.3,z:s.z}};}
 const s=states.find(s=>s.id===id&&s.species===S.BOAT);if(!s)throw new Error('Boat unavailable.');
 if(action==='leave'){if(s.uniqueData.rider===owner)delete s.uniqueData.rider;return {};}
 if(Math.hypot(s.x-pose.x,s.y-pose.y,s.z-pose.z)>5)throw new Error('Move closer to the boat.');if(s.uniqueData.rider&&s.uniqueData.rider!==owner)throw new Error('Someone is already in this boat.');for(const other of states)if(other.uniqueData.rider===owner)delete other.uniqueData.rider;s.uniqueData.rider=owner;return {id:s.id,coords:{x:s.x,y:s.y+.3,z:s.z}};
}
export function betaSpawns(world:CreatureReader,generator:WorldGenerator,cx:number,cz:number):EntityState[]{
 const result:EntityState[]=[],hash=structureHash(cx,cz,generator.seed),x=cx*16+4+Math.floor(hash*7),z=cz*16+5,biome=generator.getSubBiomeAt(x,z),y=generator.getHeightAt(x,z,biome)+1;
 const add=(species:S,px=x+.5,py=y,pz=z+.5)=>{if(world.getBlock(Math.floor(px),Math.floor(py),Math.floor(pz))!==B.AIR&&!BETA_CREATURES[species]?.aquatic)return;result.push(creatureState(`beta:${cx},${cz}:${species}:${result.length}`,species,px,py,pz));};
 if(hash<.2){if(biome.isArctic||/arctic|snow|frost/i.test(biome.id))add(S.PENGUIN);else if(/mountain|range|alpine|summit/i.test(biome.id))add(S.WOLF);else if(biome.isDesert){add(hash<.1?S.SNAKE:S.RAT);}else if(y>101&&y<175&&!/ocean|decay|sickly/i.test(biome.id))add([S.COW,S.PIG,S.SHEEP][Math.floor(hash*100)%3]);}
 if(y<100&&hash<.27){const sy=y<75?Math.max(y+2,70):97;if(world.getBlock(x,Math.floor(sy),z)===B.WATER)add(y<75&&hash<.08?S.SQUID:hash<.15?S.COD:S.TROPICAL_FISH,x+.5,sy,z+.5);}
 if(hash<.07&&(biome.isDesert===false||!biome.isDesert)&&Math.abs(y-101)<4)add(S.SEAGULL,x+.5,Math.max(y,100),z+.5);
 if(generator.generationVersion>=5)for(const plan of generator.structures.near(cx,cz))for(const [i,p]of plan.inhabitants.entries())if(Math.floor(p.x/16)===cx&&Math.floor(p.z/16)===cz){add(plan.kind==='village'?S.VILLAGER:S.FORTRESS_KEEPER,p.x,p.y,p.z);if(plan.kind==='village'){add(i%2?S.CAT:S.PIGEON,p.x+1,p.y,p.z+1);}}
 return result;
}
export function tickCreature(s:EntityState,delta:number,world:CreatureReader,targets:CreatureTarget[],light:number):{remove?:boolean;damage?:{id?:string;amount:number};smoke?:boolean}{
 const def=BETA_CREATURES[s.species];if(!def)return {};const dt=Math.min(.1,delta);s.customTimer+=dt;
 const floor=(x:number,y:number,z:number)=>world.getBlock(Math.floor(x),Math.floor(y),Math.floor(z));
 if(s.species===S.SHADOW_REAPER&&light>0)return {remove:true,smoke:true};
 let target=targets[0],distance=Infinity;for(const p of targets){const d=Math.hypot(p.x-s.x,p.y-s.y,p.z-s.z);if(d<distance){target=p;distance=d;}}
 let damage: {id?:string;amount:number}|undefined;
 if(def.hostile&&target&&distance<24){s.rotationY=Math.atan2(target.x-s.x,target.z-s.z);if(distance<1.3&&s.customTimer>(s.uniqueData.attackAt??0)){s.uniqueData.attackAt=s.customTimer+1.2;damage={id:target.id,amount:s.species===S.SHADOW_REAPER?4:2};}}
 else if(s.customTimer>(s.uniqueData.turnAt??0)){s.uniqueData.turnAt=s.customTimer+2+structureHash(Math.floor(s.x),Math.floor(s.z),s.id.length)*4;s.rotationY+=(structureHash(Math.floor(s.x*10),Math.floor(s.z*10),Math.floor(s.customTimer))-0.5)*3;}
 const water=isWaterBlock;
 const inWater=water(floor(s.x,s.y+.1,s.z));
 s.vx=Math.sin(s.rotationY)*def.speed;s.vz=Math.cos(s.rotationY)*def.speed;
 if(s.species===S.BOAT){s.vx=0;s.vz=0;}
 if(def.aquatic&&inWater){s.vy=water(floor(s.x,s.y+.6,s.z))?.4:-.25;if(s.species===S.SQUID&&s.y>85)s.vy=-.5;}
 else if(s.species===S.SEAGULL&&inWater)s.vy=water(floor(s.x,s.y+.3,s.z))?.5:0;
 else s.vy=Math.max(-18,s.vy-18*dt);
 const solid=(x:number,y:number,z:number)=>!!BLOCK_DEFS[floor(x,y,z)]?.solid;
 const radius=def.size[0]*.4,height=def.size[1]*.85;
 const clear=(x:number,y:number,z:number)=>{for(const dx of [-radius,radius])for(const dz of [-radius,radius])for(const dy of [.05,height*.5,height])if(solid(x+dx,y+dy,z+dz))return false;return true;};
 if(s.species===S.VILLAGER||s.species===S.FORTRESS_KEEPER){const x=Math.floor(s.x+Math.sin(s.rotationY)),y=Math.floor(s.y),z=Math.floor(s.z+Math.cos(s.rotationY)),door=world.getBlock(x,y,z);if(isDoorBottom(door)&&!isDoorOpen(door)){const open=getDoorOppositeStateBlock(door);world.setBlock(x,y,z,open);world.setBlock(x,y+1,z,getDoorTopForBottom(open));s.uniqueData.door={x,y,z,closeAt:s.customTimer+3};}const d=s.uniqueData.door;if(d&&s.customTimer>d.closeAt&&Math.hypot(s.x-d.x-.5,s.z-d.z-.5)>1.5){const b=world.getBlock(d.x,d.y,d.z);if(isDoorBottom(b)&&isDoorOpen(b)){const closed=getDoorOppositeStateBlock(b);world.setBlock(d.x,d.y,d.z,closed);world.setBlock(d.x,d.y+1,d.z,getDoorTopForBottom(closed));}delete s.uniqueData.door;}}
 let nx=s.x+s.vx*dt,nz=s.z+s.vz*dt;
 if(clear(nx,s.y,nz)){if(!def.aquatic||!inWater||water(floor(nx,s.y+.1,nz))){s.x=nx;s.z=nz;}else s.rotationY+=Math.PI*.7;}
 else if(clear(nx,s.y+1,nz)&&!def.aquatic){s.x=nx;s.z=nz;s.y+=Math.min(1,4*dt);s.vy=2;}
 else{s.rotationY+=1.2;s.vx=0;s.vz=0;}
 const ny=s.y+s.vy*dt;if(clear(s.x,ny,s.z))s.y=ny;else{s.vy=0;if(s.species===S.SLIME&&s.customTimer>(s.uniqueData.hopAt??0)){s.vy=3;s.uniqueData.hopAt=s.customTimer+1.5;}}
 return {damage};
}
