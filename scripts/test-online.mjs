import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const require=createRequire(import.meta.url),{createOnline}=require('../desktop/online.cjs'),{encode,decoder}=require('../desktop/online-codec.cjs');
const data={type:'test',chunks:Array.from({length:4000},(_,i)=>[i,Math.sin(i)])};const encoded=encode(data);assert.ok(encoded.length>1);const decode=decoder();let decoded;for(const packet of [...encoded].reverse()){decoded=decode.receive('peer',packet)||decoded;}assert.deepEqual(decoded,data);assert.equal(decode.receive('peer',Buffer.alloc(10)),null);await assert.rejects(async()=>encode({data:'x'.repeat(1048577)}));
const congested=decoder();for(let i=0;i<4;i++)congested.receive('peer',encode({...data,i})[0]);assert.deepEqual(congested.receive('peer',encode({type:'heartbeat'})[0]),{type:'heartbeat'},'Incomplete chunk fragments must not block control and movement packets');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'biome-online-'));
const ids={host:'11111111-1111-4111-8111-111111111111',guest:'22222222-2222-4222-8222-222222222222'};
let dropped=0;const peers=new Map();let owner=null;let lobbyId=null;const published=[];
const factory=name=>()=>{const inbox=[];const state={joined:false};const api={
 login:async()=>name,identity:async peer=>ids[peer],host:async()=>{state.joined=true;owner=name;lobbyId='a'.repeat(32);return lobbyId;},join:async code=>{assert.equal(code,lobbyId);state.joined=true;return code;},leave:async()=>{state.joined=false;},send:(peer,packet)=>{assert.ok(state.joined);if(name==='host'&&dropped++<2)return;peers.get(peer).inbox.push({sender:name,data:packet});},poll:()=>inbox.splice(0),status:()=>({user:name,lobbyId:state.joined?lobbyId:null,owner,peers:state.joined?[...peers].filter(([key,p])=>key!==name&&p.state.joined).map(([key])=>key):[],relayOnly:true,error:null}),close:()=>{state.joined=false;},kick:async peer=>{peers.get(peer).state.joined=false;}
 };peers.set(name,{inbox,state,api});return api;};
const friends={allowed:async()=>true,publish:async world=>published.push(world),unpublish:async()=>{}};
const create=name=>createOnline({config:{},saves:folder,identity:async()=>({id:ids[name],username:name,token:'test-token'}),resolveProfile:async id=>({username:Object.entries(ids).find(([,value])=>value===id)[0]}),driverFactory:factory(name),readSkin:()=>null,friends});
fs.writeFileSync(path.join(folder,'test-world.json'),JSON.stringify({seed:42,name:'Test world',spawn:{x:8,y:90,z:8},coords:{x:800,y:90,z:800},modifiedBlocks:[],chunkVersions:{},multiplayer:{enabled:true,access:'friends',maxPlayers:4}}));
const host=create('host'),guest=create('guest');let bridge;let requests=0,bridging=true;
try{
 await host.command('host','test-world');setTimeout(()=>void host.command('ready',true),200);assert.ok(published.length);
 bridge=setInterval(async()=>{if(!bridging)return;for(const event of await host.command('poll'))if(event.type==='chunk-request'&&++requests>1)await host.command('snapshot',{peer:event.peer,id:event.id,snapshot:{format:1,generation:2,biome:'Verdant Plains',name:'Test',subBiome:'test',sickly:false,maxY:90,blocks:[40960,1],water:[40960,0]}});},20);
 await host.command('clock',{time:.72,weather:{season:'winter',totalDays:23}});
 const joined=await guest.command('join','a'.repeat(32));assert.ok(joined.worldId.startsWith('online-'));assert.equal(fs.readdirSync(path.join(folder,'chunks',joined.worldId)).length,9);assert.equal(JSON.parse(fs.readFileSync(path.join(folder,joined.worldId+'.json'))).seed,42);
 assert.ok(dropped>2);assert.equal(JSON.parse(fs.readFileSync(path.join(folder,joined.worldId+'.json'))).timeOfDay,.72);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder,joined.worldId+'.json'))).coords,{x:8,y:90,z:8});assert.ok(requests>=10,'Lost chunk response was retried');bridging=false;
 await guest.command('pose',{x:8,y:90,z:8,yaw:0,pitch:0});await new Promise(r=>setTimeout(r,150));await host.command('poll');
 await guest.command('edit',{x:9,y:90,z:8,block:1});await new Promise(r=>setTimeout(r,150));assert.ok((await host.command('poll')).some(e=>e.type==='edit-request'));
 await guest.command('edit',{x:1000,y:90,z:8,block:1});await new Promise(r=>setTimeout(r,150));assert.ok(!(await host.command('poll')).some(e=>e.type==='edit-request'));
 await host.command('blocks',[{x:9,y:90,z:8,block:1}]);await new Promise(r=>setTimeout(r,150));assert.ok((await guest.command('poll')).some(e=>e.type==='blocks'));
 await guest.command('pose',{x:120,y:90,z:8,yaw:1.2,pitch:0});await new Promise(r=>setTimeout(r,100));
 await guest.command('leave');await new Promise(r=>setTimeout(r,100));bridging=true;const again=await guest.command('join','a'.repeat(32));const returned=JSON.parse(fs.readFileSync(path.join(folder,again.worldId+'.json')));assert.equal(returned.coords.x,120);assert.equal(returned.yaw,1.2);
 await host.command('leave');peers.get('host').state.joined=true;await new Promise(r=>setTimeout(r,150));assert.ok((await guest.command('poll')).some(e=>e.type==='disconnected'),'Explicit host leave disconnects even with stale lobby membership');await guest.command('leave');
 await host.command('host','test-world');await host.command('ready',true);await guest.command('join','a'.repeat(32));await new Promise(r=>setTimeout(r,100));host.close();peers.get('host').state.joined=true;peers.get('guest').inbox.length=0;await new Promise(r=>setTimeout(r,15500));assert.ok((await guest.command('poll')).some(e=>e.type==='disconnected'),'Missing heartbeat disconnects a blackholed host even when lobby membership stays stale');await guest.command('leave');
 console.log('Relay message framing, verified lobby joins, exact chunk bootstrap, world isolation, edit reach checks and host broadcasts passed.');
}finally{if(bridge)clearInterval(bridge);host.close();guest.close();fs.rmSync(folder,{recursive:true,force:true});}
