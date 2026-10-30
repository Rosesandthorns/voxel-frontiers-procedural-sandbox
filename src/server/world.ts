import {BETA_CREATURES,betaSpawns,tickCreature,creatureLoot,operateBoat,creatureState} from '../game/entities/BetaCreatures';
import {VoxelLighting} from '../game/environment/VoxelLighting';
import {ITEM_REGISTRY} from '../game/systems/ItemRegistry';
import {EntitySpecies,type EntityState} from '../types';
import {interactWorkshop,isWorkshop,workshopKind,workshopDrops} from '../game/systems/Workshop';
import {sanitizeSurvival} from '../../desktop/player-state.cjs';
import fs from 'node:fs';


import path from 'node:path';


import {WorldGenerator} from '../game/voxel/WorldGenerator';


import {Chunk} from '../game/voxel/Chunk';


import {snapshotChunk,restoreChunk} from '../game/voxel/ChunkStore';


import {SeasonWeatherSystem} from '../game/environment/SeasonWeatherSystem';


import {BlockType} from '../types';


import {BLOCK_DEFS,isPlantBlock} from '../game/voxel/Blocks';


import {hasPlantSupport,requiresSupport} from '../game/voxel/PlantSupport';


export function createServerWorld(folder:string,seed:number){


 fs.mkdirSync(path.join(folder,'chunks'),{recursive:true});


 const stateFile=path.join(folder,'world.json');


 const atomic=(file:string,data:unknown)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file);};


 const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{seed,generationVersion:5,chunkVersions:{},players:{}};


 if(!Number.isSafeInteger(state.seed))throw new Error('Invalid world seed');


 state.chunkVersions??={};state.players??={};state.workshops??={};state.creatures??=[];state.betaChunks??=[];
 const creatures=new Map<string,EntityState>(state.creatures.map((s:EntityState)=>{s.uniqueData??={};delete s.uniqueData.rider;return [s.id,s];}));const betaChunks=new Set<string>(state.betaChunks);


 const environment=new SeasonWeatherSystem();if(state.environment)environment.restore(state.environment);


 let time=Number.isFinite(state.timeOfDay)?state.timeOfDay:.25,lastTick=Date.now();


 function clock(){const now=Date.now(),delta=Math.max(0,(now-lastTick)/1000);lastTick=now;time=(time+delta/1200)%1;environment.update(delta,time,null as any,null);state.timeOfDay=time;state.environment=environment.snapshot();return {time,speed:1/1200,weather:state.environment};}


 function checkpoint(){state.creatures=[...creatures.values()];state.betaChunks=[...betaChunks];clock();atomic(stateFile,state);}


 const generator=new WorldGenerator(state.seed,5,[],state.chunkVersions);


 const older=new Map<number,WorldGenerator>();const cache=new Map<string,Chunk>();


 function save(cx:number,cz:number,chunk:Chunk){const key=`${cx},${cz}`;atomic(path.join(folder,'chunks',key+'.json'),snapshotChunk(chunk,state.chunkVersions[key]??5));}


 function chunk(cx:number,cz:number){


  const key=`${cx},${cz}`,cached=cache.get(key);if(cached){cache.delete(key);cache.set(key,cached);return cached;}


  const file=path.join(folder,'chunks',key+'.json');let value:Chunk;


  if(fs.existsSync(file)){const snapshot=JSON.parse(fs.readFileSync(file,'utf8'));value=restoreChunk(cx,cz,snapshot);state.chunkVersions[key]=snapshot.generation;}


  else {const version=state.chunkVersions[key]??5;if(version<5&&!older.has(version))older.set(version,new WorldGenerator(state.seed,version));value=(older.get(version)??generator).generateChunk(cx,cz,new Map());state.chunkVersions[key]=version;save(cx,cz,value);atomic(stateFile,state);}


  cache.set(key,value);lighting.track(value);if(cache.size>160){const oldest=cache.keys().next().value!;const [x,z]=oldest.split(',').map(Number);lighting.forget(x,z);cache.delete(oldest);}return value;


 }


 const reader={getBlock:(x:number,y:number,z:number)=>!Number.isSafeInteger(y)||y<0?BlockType.AIR:chunk(Math.floor(x/16),Math.floor(z/16)).getBlock(x&15,y,z&15)};


 function spawn(){const c=chunk(0,0);for(let y=c.maxY+2;y>2;y--)if(BLOCK_DEFS[c.getBlock(8,y,8)]?.solid&&c.getBlock(8,y+1,8)===BlockType.AIR&&c.getBlock(8,y+2,8)===BlockType.AIR)return {x:8.5,y:y+1.01,z:8.5};return {x:8.5,y:150,z:8.5};}


 const lighting=new VoxelLighting({...reader,chunks:cache});
 const mobEdits:any[]=[];
 const creatureReader={...reader,setBlock:(x:number,y:number,z:number,b:BlockType)=>{const c=chunk(Math.floor(x/16),Math.floor(z/16));c.setBlock(x&15,y,z&15,b);lighting.edit(x,y,z,b);save(c.cx,c.cz,c);mobEdits.push({x,y,z,block:b});}};
 function seedCreatures(cx:number,cz:number){const key=`${cx},${cz}`;if(betaChunks.has(key)||creatures.size>=128)return;betaChunks.add(key);for(const s of betaSpawns(creatureReader,generator,cx,cz))if(creatures.size<128)creatures.set(s.id,s);state.creatures=[...creatures.values()];state.betaChunks=[...betaChunks];}
 const start=state.spawn??spawn();state.spawn=start;atomic(stateFile,state);


 return {


  clock:()=>{const value=clock();atomic(stateFile,state);return value;},


  header:(id:string)=>({...((clock(),{spawn:start,timeRate:1/1200,timeOfDay:time,environment:environment.snapshot()})),seed:state.seed,generationVersion:5,chunkVersions:{},modifiedBlocks:[],coords:state.players[id]?.coords??start,player:state.players[id]}),


  workshop:(coords:{x:number;y:number;z:number},item:any)=>{const {x,y,z}=coords,block=reader.getBlock(x,y,z);if(!isWorkshop(block))throw new Error('Workshop is no longer here.');clock();const key=`${x},${y},${z}`,age=environment.totalDays-1+time,result=interactWorkshop(state.workshops[key],block,item,age);state.workshops[key]=result.state;if(block!==result.block){const c=chunk(Math.floor(x/16),Math.floor(z/16));c.setBlock(x&15,y,z&15,result.block);save(c.cx,c.cz,c);}atomic(stateFile,state);return result;},
  position:(id:string,pose:any)=>{if(!pose||!['x','y','z','yaw'].every(k=>Number.isFinite(pose[k])))return;state.players[id]={...state.players[id],coords:{x:pose.x,y:pose.y,z:pose.z},yaw:pose.yaw};atomic(stateFile,state);},


  snapshot:(cx:number,cz:number)=>{const c=chunk(cx,cz);seedCreatures(cx,cz);return snapshotChunk(c,state.chunkVersions[`${cx},${cz}`]??5);},
  attack:(id:string,item:any,pose:any)=>{const s=creatures.get(id);if(!s||s.species===EntitySpecies.SHADOW_REAPER||s.species===EntitySpecies.VILLAGER||s.species===EntitySpecies.FORTRESS_KEEPER||Math.hypot(s.x-pose.x,s.y-pose.y,s.z-pose.z)>5)return [];s.health-=ITEM_REGISTRY[item?.id??'']?.damage??5;if(s.health>0)return [];creatures.delete(id);return creatureLoot(s.species);},
  boat:(action:string,id:string|undefined,pose:any,owner:string)=>operateBoat([...creatures.values()],creatureReader,action,id,pose,owner,s=>creatures.set(s.id,s)),
  step:(delta:number,targets:any[])=>{lighting.process();const damage:any[]=[];mobEdits.length=0;for(const s of creatures.values()){if(!cache.has(`${Math.floor(s.x/16)},${Math.floor(s.z/16)}`))continue;if(s.species===EntitySpecies.BOAT&&s.uniqueData.rider){const p=targets.find(t=>t.id===s.uniqueData.rider);if(p){s.x=p.x;s.y=p.y-.3;s.z=p.z;s.rotationY=p.yaw??s.rotationY;continue;}delete s.uniqueData.rider;}const r=tickCreature(s,delta,creatureReader,targets,lighting.level(Math.floor(s.x),Math.floor(s.y+1),Math.floor(s.z),time));if(r.remove)creatures.delete(s.id);if(r.damage)damage.push(r.damage);}if(creatures.size<100&&Math.random()<.015&&targets.length){const t=targets[Math.floor(Math.random()*targets.length)],x=Math.floor(t.x+(Math.random()-.5)*24),y=Math.floor(t.y),z=Math.floor(t.z+(Math.random()-.5)*24);if(cache.has(`${Math.floor(x/16)},${Math.floor(z/16)}`)&&reader.getBlock(x,y,z)===0&&reader.getBlock(x,y+1,z)===0&&reader.getBlock(x,y-1,z)!==0&&lighting.level(x,y+1,z,time)===0){const s=creatureState('dark:'+Date.now(),environment.totalDays-1+time>=3&&Math.random()<.25?EntitySpecies.SHADOW_REAPER:EntitySpecies.SLIME,x+.5,y,z+.5);creatures.set(s.id,s);}}state.creatures=[...creatures.values()];return {states:[...creatures.values()].slice(0,128),damage,edits:[...mobEdits]};},


  edit:(edit:{x:number;y:number;z:number;block:BlockType})=>{


   const {x,y,z,block}=edit;if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||y<=0||!Number.isSafeInteger(y)||!BLOCK_DEFS[block])return [];


   if(requiresSupport(block)&&!hasPlantSupport(reader,x,y,z,block))return [];


   const c=chunk(Math.floor(x/16),Math.floor(z/16));const previous=c.getBlock(x&15,y,z&15);const changes:any[]=[{...edit}];
   const clearWorkshop=(px:number,py:number,pz:number)=>{const key=`${px},${py},${pz}`,station=state.workshops[key];if(!station)return;const drops=workshopDrops(station);if(drops.length)changes[0].workshopDrops=[...(changes[0].workshopDrops??[]),...drops];delete state.workshops[key];};
   if(isWorkshop(previous)&&(workshopKind(previous)!==workshopKind(block)))clearWorkshop(x,y,z);
   c.setBlock(x&15,y,z&15,block);lighting.edit(x,y,z,block);


   const above=reader.getBlock(x,y+1,z);if(requiresSupport(above)&&!hasPlantSupport(reader,x,y+1,z,above)){if(isWorkshop(above))clearWorkshop(x,y+1,z);c.setBlock(x&15,y+1,z&15,BlockType.AIR);changes.push({x,y:y+1,z,block:BlockType.AIR});}


   save(c.cx,c.cz,c);atomic(stateFile,state);return changes;


  },


  player:(id:string,value:any)=>{const slots=(a:any,n:number)=>Array.isArray(a)&&a.length===n&&a.every(s=>s&&Number.isInteger(s.count)&&s.count>=0&&s.count<=999&&(!s.item||typeof s.item.id==='string'));


   if(!value||!slots(value.hotbar,9)||!slots(value.inventory,27))return;


   state.players[id]={hotbar:value.hotbar,inventory:value.inventory,health:Math.max(0,Math.min(20,Number.isFinite(value.health)?value.health:20)),survival:sanitizeSurvival(value.survival),stamina:100,coords:value.coords,yaw:value.yaw};atomic(stateFile,state);


  },


  close:()=>checkpoint()


 };


}
