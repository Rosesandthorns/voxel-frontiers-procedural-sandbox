import {RemoteMotion} from './RemoteMotion';
import type {EntityManager} from '../entities/EntityManager';
import * as THREE from 'three';
import {PlayerAvatar} from '../player/PlayerAvatar';
import {loadSkinTexture} from '../player/Skins';
import {PlayerController} from '../player/PlayerController';
import {VoxelWorld} from '../voxel/VoxelWorld';
import {BLOCK_DEFS,isPlantBlock} from '../voxel/Blocks';
import {hasPlantSupport,requiresSupport} from '../voxel/PlantSupport';
import {BlockType} from '../../types';
type Pose={x:number;y:number;z:number;yaw:number;pitch:number};
export class OnlineWorld {
 public get active(){return this.mode==='host'||this.mode==='guest';}
 private mode:string|null=null;private closed=false;private polling=false;private elapsed=0;private poseTime=0;
 private edits=new Map<string,any>();private timer:ReturnType<typeof setInterval>;
 private avatars=new Map<string,PlayerAvatar>();private poses=new Map<string,RemoteMotion>();private players:any[]=[];private versions=new Map<string,number>();
 private entityClock=0;public entities:EntityManager|null=null;
 constructor(private world:VoxelWorld,private scene:THREE.Scene,private player:PlayerController){
  const api=window.desktop!;
  api.online('status').then(state=>{if(this.closed)return;this.mode=state.mode;world.onlineActive=!!state.mode;this.players=state.players??[];if(!this.mode)return;world.isRemote=state.mode==='guest';world.onNetworkEdit=(x,y,z,block)=>{void api.online('edit',{x,y,z,block}).catch(()=>{});};if(state.mode==='host')world.onNetworkBlock=(x,y,z,block)=>{this.edits.set(`${x},${y},${z}`,{x,y,z,block});};void api.online('ready',true);this.reconcile();}).catch(()=>{});
  this.timer=setInterval(()=>void this.poll(),30);
 }
 private replaceSkin(peer:string,data?:string){
  const version=(this.versions.get(peer)??0)+1;this.versions.set(peer,version);
  loadSkinTexture(data).then(texture=>{if(this.closed||this.versions.get(peer)!==version){texture.dispose();return;}this.avatars.get(peer)?.dispose();const avatar=new PlayerAvatar(texture);this.avatars.set(peer,avatar);this.scene.add(avatar.root);}).catch(()=>{});
 }
 private reconcile(){for(const peer of this.avatars.keys())if(!this.players.some(p=>p.puid===peer)){this.avatars.get(peer)!.dispose();this.avatars.delete(peer);this.poses.delete(peer);this.versions.delete(peer);}}
 private async poll(){if(this.polling||!this.mode||this.closed)return;this.polling=true;try{
  const events=await window.desktop!.online('poll');if(this.closed)return;
  for(const event of events){
   if(event.type==='disconnected'){this.mode=null;this.world.onlineActive=false;this.player.isPaused=true;void window.desktop!.online('leave').catch(()=>{});window.dispatchEvent(new CustomEvent('biome-disconnected',{detail:event.message}));}
   if(event.type==='player-damage')this.player.damage(event.amount);
   if(event.type==='boat-use'&&this.mode==='host')void this.entities?.boat(event.action,event.entity,event.pose,event.peer).then(result=>window.desktop!.online('workshop-result',{peer:event.peer,id:event.id,result})).catch(error=>window.desktop!.online('workshop-result',{peer:event.peer,id:event.id,error:error.message}));
   if(event.type==='entity-attack'&&this.mode==='host'&&event.pose)void this.entities?.attack(event.entity,event.item,event.pose).then(result=>window.desktop!.online('workshop-result',{peer:event.peer,id:event.id,result}));
   if(event.type==='workshop-use'&&this.mode==='host')void this.world.useWorkshop(event.coords,event.item).then(result=>window.desktop!.online('workshop-result',{peer:event.peer,id:event.id,result})).catch(error=>window.desktop!.online('workshop-result',{peer:event.peer,id:event.id,error:error.message}));
   if(event.type==='workshop-drops')for(const drop of event.items)this.world.onWorkshopDrop?.(drop.item,drop.count);
   if(event.type==='respawned')window.dispatchEvent(new CustomEvent('biome-respawn',{detail:{confirmed:true,coords:event.coords}}));
   if(event.type==='entities'&&this.mode==='guest')this.entities?.applyNetworkSnapshot(event.states);
   if(event.type==='clock')window.dispatchEvent(new CustomEvent('biome-clock',{detail:{time:event.time,weather:event.weather,speed:event.speed}}));
   if(event.type==='players'){this.players=event.players;this.reconcile();}
   if(event.type==='pose'){let motion=this.poses.get(event.peer);if(!motion){motion=new RemoteMotion();this.poses.set(event.peer,motion);}motion.add(event.pose,performance.now());if(!this.avatars.has(event.peer)&&!this.versions.has(event.peer))this.replaceSkin(event.peer);}
   if(event.type==='skin')this.replaceSkin(event.peer,event.data);
   if(event.type==='chunk-request'&&this.mode==='host'){void this.world.networkSnapshot(event.cx,event.cz).then(snapshot=>{if(!this.closed)return window.desktop!.online('snapshot',{peer:event.peer,id:event.id,snapshot});}).catch(()=>{});}
   if(event.type==='edit-request'&&this.mode==='host'){
    const e=event.edit;if(e.y<=0||!BLOCK_DEFS[e.block as BlockType])continue;
    if(requiresSupport(e.block)&&!hasPlantSupport(this.world,e.x,e.y,e.z,e.block))continue;
    const drops:any[]=[];const drop=this.world.onWorkshopDrop;
    this.world.onWorkshopDrop=(item,count=1)=>drops.push({item,count});
    try{this.world.setBlock(e.x,e.y,e.z,e.block);}finally{this.world.onWorkshopDrop=drop;}
    if(drops.length)void window.desktop!.online('workshop-drops',{peer:event.peer,items:drops});
   }
   if(event.type==='blocks'&&this.mode==='guest'){this.world.networkApplying=true;try{for(const e of event.edits)if(BLOCK_DEFS[e.block as BlockType])this.world.setBlock(e.x,e.y,e.z,e.block);}finally{this.world.networkApplying=false;}}
  }
 }catch{}finally{this.polling=false;}}
 update(delta:number){if(!this.mode)return;if(this.entities)this.entities.targets=()=>[...this.poses].flatMap(([id,motion])=>{const p=motion.sample(performance.now());return p?[{...p,id}]:[];});this.elapsed+=delta;this.poseTime+=delta;this.entityClock+=delta;if(this.mode==='host'&&this.entityClock>.25){this.entityClock=0;void window.desktop!.online('entities',this.entities?.networkSnapshot()??[]).catch(()=>{});}
  if(this.poseTime>.05){this.poseTime=0;const p=this.player;void window.desktop!.online('pose',{x:p.pos.x,y:p.pos.y,z:p.pos.z,yaw:p.yaw,pitch:p.pitch}).catch(()=>{});}
  if(this.elapsed>.1){this.elapsed=0;if(this.mode==='host'&&this.edits.size){const edits=[...this.edits.values()].slice(0,256);for(const e of edits)this.edits.delete(`${e.x},${e.y},${e.z}`);void window.desktop!.online('blocks',edits).catch(()=>{});}}
  for(const[peer,avatar]of this.avatars){const pose=this.poses.get(peer)?.sample(performance.now());avatar.root.visible=!!pose;if(!pose)continue;const prev=avatar.root.position;const speed=prev.lengthSq()===0?0:Math.min(12,Math.hypot(pose.x-prev.x,pose.z-prev.z)/Math.max(.001,delta));avatar.update(pose.x,pose.y,pose.z,pose.yaw,pose.pitch,speed,delta);}

 }
 close(){this.world.onlineActive=false;this.closed=true;clearInterval(this.timer);this.world.onNetworkEdit=null;this.world.onNetworkBlock=null;for(const avatar of this.avatars.values())avatar.dispose();this.avatars.clear();void window.desktop?.online('ready',false).catch(()=>{});}
}
