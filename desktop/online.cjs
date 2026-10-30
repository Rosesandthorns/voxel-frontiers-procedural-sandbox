const {sanitizeSurvival}=require('./player-state.cjs');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');

const {encode,decoder}=require('./online-codec.cjs');

function createOnline({config,identity,resolveProfile,saves,driverFactory,readSkin,friends,serverDriverFactory,joinTicket}){

 let driver=null,mode=null,worldId=null,events=[],lastError=null,ownProfile=null,operation=false,closed=false;

 let outgoing=[],requestCounter=0,headerWaiter=null,ready=false,lastRefresh=0,lastLogin=0,access='friends',heartbeat=0,expectedHost=null;

 const earlyMessages=new Map(),welcomeSent=new Map();let lastHello=0,latestClock=null,lastHeartbeat=0,lastHostSeen=0,disconnected=false;const realtime=new Map(),positionSaved=new Map();

 const workshopPending=new Map();
 const reassembly=decoder(),pending=new Map(),verified=new Map(),verifying=new Set(),poses=new Map(),welcomed=new Set(),rates=new Map();

 const push=event=>{if(event.type==='disconnected'){events=[event];return;}if(event.type==='pose'){const old=events.findIndex(e=>e.type==='pose'&&e.peer===event.peer);if(old>=0)events.splice(old,1);}if(events.length<256)events.push(event);};

 const rate=(peer,type,max)=>{const key=peer+type;const now=Date.now();let value=rates.get(key);if(!value||now-value.time>1000){value={time:now,count:0};rates.set(key,value);}return ++value.count<=max;};

 const status=()=>({mode,worldId,lobbyId:driver?.status().lobbyId??null,user:driver?.status().user??null,owner:driver?.status().owner??null,relayOnly:driver?.kind!=='dedicated',players:[...(ownProfile?[{...ownProfile,puid:driver?.status().user}]:[]),...[...verified].map(([puid,profile])=>({...profile,puid}))],error:lastError||driver?.status().error||null});

 function send(peer,message,reliable=true){if(!reliable){realtime.set(peer+':'+message.type,{peer,message});return;}const packets=encode(message);if(outgoing.length+packets.length>2048){if(!reliable)return;throw new Error('Online send queue is full.');}const batch=packets.map(packet=>({peer,packet,reliable}));if(message.type==='snapshot')outgoing.push(...batch);else outgoing.unshift(...batch);}

 function broadcast(message,except){for(const peer of verified.keys())if(peer!==except)send(peer,message);}

 async function ensure(dedicated=false){

  if(driver&&((driver.kind==='dedicated')!==dedicated)){await leave();driver.close();driver=null;}

  if(driver)return;

  const who=await identity();if(!who?.username)throw new Error('Sign in and choose a Biome username before playing online.');

  ownProfile={id:who.id,username:who.username};

  driver=dedicated?serverDriverFactory():driverFactory(config);try{if(!dedicated)await driver.login(who.token);lastLogin=Date.now();}catch(error){driver.close();driver=null;throw error;}

 }

 function metadata(peer){const state=JSON.parse(fs.readFileSync(path.join(saves,worldId+'.json'),'utf8'));return {name:state.name,seed:state.seed,generationVersion:state.generationVersion??1,chunkVersions:{},modifiedBlocks:[],timeRate:latestClock?.speed??(.002*(state.settings?.dayNightSpeed??1)),timeOfDay:latestClock?.time??state.timeOfDay,environment:latestClock?.weather??state.environment,spawn:state.spawn??state.coords,coords:state.spawn??state.coords,multiplayer:state.multiplayer,player:peer?readPlayer(peer):undefined};}

 function readPlayer(peer){const id=verified.get(peer)?.id;if(!id)return;const file=path.join(saves,'players',worldId,id+'.json');if(fs.existsSync(file))return JSON.parse(fs.readFileSync(file,'utf8'));}

 function savePlayer(peer,value){const id=verified.get(peer)?.id;if(!id||!worldId)return;const slots=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(s=>s&&Number.isInteger(s.count)&&s.count>=0&&s.count<=999&&(!s.item||typeof s.item.id==='string'));if(!slots(value?.hotbar,9)||!slots(value?.inventory,27))return;const folder=path.join(saves,'players',worldId);fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,id+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify({hotbar:value.hotbar,inventory:value.inventory,coords:poses.get(peer)??metadata().coords,health:Math.max(0,Math.min(20,Number.isFinite(value.health)?value.health:20)),survival:sanitizeSurvival(value.survival),stamina:100}));fs.renameSync(file+'.tmp',file);}

 function savePosition(peer,force=false){const id=verified.get(peer)?.id,pose=poses.get(peer);if(mode!=='host'||!id||!pose||(!force&&Date.now()-(positionSaved.get(peer)||0)<5000))return;const folder=path.join(saves,'players',worldId);fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,id+'.json'),previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};fs.writeFileSync(file+'.tmp',JSON.stringify({...previous,coords:{x:pose.x,y:pose.y,z:pose.z},yaw:pose.yaw}));fs.renameSync(file+'.tmp',file);positionSaved.set(peer,Date.now());}

 function disconnect(message){if(disconnected)return;disconnected=true;lastError=message;push({type:'disconnected',message});for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(new Error(message));}pending.clear();for(const request of workshopPending.values()){clearTimeout(request.timer);request.reject(new Error('Connection closed.'));}workshopPending.clear();}

 async function verify(peer){if(verifying.has(peer))return;verifying.add(peer);try{const external=await driver.identity(peer);if(driver.kind==='dedicated'){if(!external?.username||typeof external.id!=='string')return;verified.set(peer,external);push({type:'players',players:status().players});const early=earlyMessages.get(peer);earlyMessages.delete(peer);if(early)await onMessage(peer,early);return;}const id=external;if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error('Invalid player identity');const profile=await resolveProfile(id);if(!profile?.username)throw new Error('Player has no Biome username');if(mode==='guest'&&peer===driver.status().owner&&expectedHost&&id!==expectedHost)throw new Error('Server owner does not match the selected friend');if(mode==='host'&&!await friends.allowed(id,access)){await driver.kick(peer);throw new Error('Player is not invited');}if(driver.status().peers.includes(peer)){verified.set(peer,{id,username:profile.username});push({type:'players',players:status().players});const early=earlyMessages.get(peer);earlyMessages.delete(peer);if(early)await onMessage(peer,early);}}catch(error){lastError='Could not verify player: '+error.message;}finally{verifying.delete(peer);}}

 async function onMessage(peer,message){

  if(!message||typeof message.type!=='string')return;if(!verified.has(peer)){if(mode==='guest'&&peer===driver.status().owner&&message.type==='welcome')earlyMessages.set(peer,message);return;}

  const owner=driver.status().owner;

  if(mode==='guest'&&peer===owner){lastHostSeen=Date.now();if(message.type==='goodbye'){disconnect('The host left the world.');return;}}

  if(message.type==='heartbeat')return;

  if(message.type==='hello'&&mode==='host'&&ready){send(peer,{type:'welcome',world:metadata(peer)});return;}

  if(message.type==='welcome-ack'&&mode==='host'){welcomed.add(peer);return;}

  if(message.type==='welcome'&&mode==='guest'&&peer===owner){send(peer,{type:'welcome-ack'});if(headerWaiter){headerWaiter.resolve(message.world);headerWaiter=null;}return;}

  if(message.type==='entities'&&mode==='guest'&&peer===owner&&Array.isArray(message.states)&&message.states.length<=128){push({type:'entities',states:message.states});return;}

  if(message.type==='clock'&&mode==='guest'&&peer===owner&&Number.isFinite(message.time)){push({type:'clock',time:message.time,weather:message.weather,speed:message.speed});return;}

  if(message.type==='boat-use'&&mode==='host'&&ready&&rate(peer,'boat',3)){const pose=poses.get(peer),p=message.action==='place'?message.pose:pose;if(pose&&p&&validPose({...p,yaw:0,pitch:0})&&Math.hypot(p.x-pose.x,p.y-pose.y,p.z-pose.z)<=9)push({type:'boat-use',peer,id:message.id,action:message.action,entity:message.entity,pose:p});return;}
  if(message.type==='entity-attack'&&mode==='host'&&ready&&rate(peer,'attack',3)&&typeof message.entity==='string'&&message.entity.length<100){push({type:'entity-attack',peer,id:message.id,entity:message.entity,item:message.item,pose:poses.get(peer)});return;}
  if(message.type==='player-damage'&&mode==='guest'&&peer===owner&&Number.isFinite(message.amount)&&message.amount>0&&message.amount<=4){push({type:'player-damage',amount:message.amount});return;}
  if(message.type==='workshop-use'&&mode==='host'&&ready&&rate(peer,'workshop',4)&&typeof message.id==='string'&&message.id.length<80&&validEdit({...message.coords,block:0})){const p=poses.get(peer)??readPlayer(peer)?.coords??metadata().coords;if(Math.hypot(message.coords.x-p.x,message.coords.y-p.y,message.coords.z-p.z)<=9&&(!message.item||(typeof message.item.id==='string'&&message.item.id.length<100)))push({type:'workshop-use',peer,id:message.id,coords:message.coords,item:message.item??null});return;}
  if(message.type==='workshop-drops'&&mode==='guest'&&peer===owner&&Array.isArray(message.items)&&message.items.length<=32){push({type:'workshop-drops',items:message.items});return;}
  if(message.type==='workshop-result'&&mode==='guest'&&peer===owner){const wait=workshopPending.get(message.id);if(wait){clearTimeout(wait.timer);workshopPending.delete(message.id);message.error?wait.reject(new Error(message.error)):wait.resolve(message.result);}return;}
  if(message.type==='respawn-request'&&mode==='host'&&rate(peer,'respawn',1)){const coords=metadata().coords;poses.set(peer,{...coords,yaw:0,pitch:0});savePosition(peer,true);const old=readPlayer(peer);savePlayer(peer,{hotbar:old?.hotbar??Array.from({length:9},()=>({item:null,count:0})),inventory:old?.inventory??Array.from({length:27},()=>({item:null,count:0})),health:20,survival:{hunger:100,oxygen:20}});send(peer,{type:'respawned',coords});broadcast({type:'player-teleport',peer,pose:poses.get(peer)},peer);return;}
  if(message.type==='respawned'&&mode==='guest'&&peer===owner&&validPose({...message.coords,yaw:0,pitch:0})){push({type:'respawned',coords:message.coords});return;}
  if(message.type==='player-teleport'&&mode==='guest'&&peer===owner&&typeof message.peer==='string'&&message.peer!==driver.status().user&&validPose(message.pose)){poses.set(message.peer,message.pose);push({type:'pose',peer:message.peer,pose:message.pose});return;}
  if(message.type==='pose'){

   if(!rate(peer,'pose',25)||!validPose(message.pose))return;

   const old=poses.get(peer);if(old&&peer!==owner&&Math.hypot(message.pose.x-old.x,message.pose.y-old.y,message.pose.z-old.z)>120)return;

   poses.set(peer,message.pose);try{savePosition(peer);}catch(error){lastError='Player position could not be saved: '+error.message;}push({type:'pose',peer,pose:message.pose});return;

  }

  if(message.type==='skin'){if(!rate(peer,'skin',1)||typeof message.data!=='string'||message.data.length>100000||!message.data.startsWith('data:image/png;base64,'))return;const image=Buffer.from(message.data.slice(22),'base64');if(image.length<24||image.readUInt32BE(16)!==128||image.readUInt32BE(20)!==128)return;push({type:'skin',peer,data:message.data});return;}

  if(mode==='host'){

   if(message.type==='player-save'&&rate(peer,'save',2))savePlayer(peer,message.state);

   if(message.type==='chunk'&&rate(peer,'chunk',64)&&Number.isInteger(message.cx)&&Number.isInteger(message.cz)&&Math.abs(message.cx)<1875000&&Math.abs(message.cz)<1875000&&typeof message.id==='string'&&message.id.length<80&&ready){

    const position=poses.get(peer)??readPlayer(peer)?.coords??metadata().coords;if(Math.abs(message.cx-Math.floor(position.x/16))>18||Math.abs(message.cz-Math.floor(position.z/16))>18)return;

    push({type:'chunk-request',peer,id:message.id,cx:message.cx,cz:message.cz});

   }

   if(message.type==='edit'&&ready&&rate(peer,'edit',16)&&validEdit(message.edit)){const position=poses.get(peer);if(position&&Math.hypot(message.edit.x-position.x,message.edit.y-position.y,message.edit.z-position.z)<=9)push({type:'edit-request',peer,edit:message.edit});}

  }else if(peer===owner){

   if(message.type==='snapshot'&&typeof message.id==='string'){const wait=pending.get(message.id);if(wait){pending.delete(message.id);clearTimeout(wait.timer);wait.resolve(message.snapshot);}}

   if(message.type==='blocks'&&Array.isArray(message.edits)&&message.edits.length<=256&&message.edits.every(validEdit))push({type:'blocks',edits:message.edits});

  }

 }

 function validPose(p){return p&&['x','y','z','yaw','pitch'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&Math.abs(p.x)<3e7&&Math.abs(p.z)<3e7&&p.y>-500&&Number.isFinite(p.y);}

 function validEdit(e){return e&&['x','y','z','block'].every(k=>Number.isInteger(e[k]))&&Math.abs(e.x)<3e7&&Math.abs(e.z)<3e7&&e.y>=0&&Number.isSafeInteger(e.y)&&e.block>=0&&e.block<65536;}

 const timer=setInterval(()=>{

  if(!driver||closed)return;

  try{

   const state=driver.status();

   if(mode==='host'&&state.lobbyId&&Date.now()-heartbeat>30000){heartbeat=Date.now();void friends.publish({lobby_id:state.lobbyId,world_name:metadata().name.slice(0,48),access}).catch(()=>{});for(const [peer,person]of verified)void friends.allowed(person.id,access).then(ok=>{if(!ok){verified.delete(peer);void driver.kick(peer).catch(()=>{});}}).catch(()=>{});}

   for(const peer of state.peers)if(!verified.has(peer))void verify(peer);

   for(const peer of verified.keys())if(!state.peers.includes(peer)){try{savePosition(peer,true);}catch(error){lastError=error.message;}verified.delete(peer);welcomed.delete(peer);poses.delete(peer);push({type:'players',players:status().players});}

   if(mode==='guest'&&worldId&&(!state.lobbyId||!state.peers.includes(state.owner)||Date.now()-lastHostSeen>15000))disconnect(state.error||'Connection to the host was lost.');

   if(mode==='host'&&Date.now()-lastHeartbeat>2000){lastHeartbeat=Date.now();broadcast({type:'heartbeat'});}

   if(mode==='host'&&ready)for(const peer of verified.keys())if(!welcomed.has(peer)&&Date.now()-(welcomeSent.get(peer)||0)>1000){send(peer,{type:'welcome',world:metadata(peer)});welcomeSent.set(peer,Date.now());send(peer,{type:'skin',data:readSkin()});}

   if(mode==='guest'&&headerWaiter&&state.owner&&verified.has(state.owner)&&Date.now()-lastHello>1000){lastHello=Date.now();send(state.owner,{type:'hello'});}

   if(mode==='guest'&&state.owner&&verified.has(state.owner)&&!welcomed.has(state.owner)){send(state.owner,{type:'skin',data:readSkin()});welcomed.add(state.owner);}

   for(const [key,value]of realtime){realtime.delete(key);if(state.peers.includes(value.peer))for(const packet of encode(value.message))driver.send(value.peer,packet,false);}

   for(let i=0;i<16&&outgoing.length;i++){const packet=outgoing.shift();if(state.peers.includes(packet.peer))driver.send(packet.peer,packet.packet,packet.reliable);}

   for(const packet of driver.poll()){const message=reassembly.receive(packet.sender,packet.data);if(message)void onMessage(packet.sender,message).catch(error=>{lastError=error.message;});}

   if(driver.kind!=='dedicated'&&Date.now()-lastLogin>40*60000&&Date.now()-lastRefresh>30000){lastRefresh=Date.now();void identity().then(who=>driver?.login(who.token)).then(()=>lastLogin=Date.now()).catch(()=>lastError='Online sign-in expired. Leave and sign in again.');}

  }catch(error){lastError=error.message;}

 },30);

 async function chunk(cx,cz){if(mode!=='guest'||disconnected)throw new Error('No online world');if(pending.size>=8)throw new Error('Too many pending chunks');const id=String(++requestCounter);return new Promise((resolve,reject)=>{let attempts=0;const request=()=>{if(!pending.has(id))return;if(++attempts>4){pending.delete(id);reject(new Error('Terrain download timed out. Retrying nearby chunks.'));return;}try{send(driver.status().owner,{type:'chunk',cx,cz,id});}catch(error){pending.delete(id);reject(error);return;}pending.get(id).timer=setTimeout(request,4000);};pending.set(id,{resolve,reject,timer:null});request();});}

 async function leave(){if(mode==='host'){for(const peer of verified.keys()){try{savePosition(peer,true);}catch{}try{for(const packet of encode({type:'goodbye'}))driver.send(peer,packet,true);}catch{}}}if(mode==='host')await friends.unpublish().catch(()=>{});if(driver)await driver.leave().catch(()=>{});mode=null;worldId=null;ready=false;verified.clear();welcomed.clear();welcomeSent.clear();lastHello=0;latestClock=null;lastHeartbeat=0;lastHostSeen=0;disconnected=false;realtime.clear();positionSaved.clear();poses.clear();rates.clear();outgoing=[];events=[];reassembly.clear();earlyMessages.clear();for(const value of pending.values()){clearTimeout(value.timer);value.reject(new Error('Left online world.'));}pending.clear();for(const request of workshopPending.values()){clearTimeout(request.timer);request.reject(new Error('Connection closed.'));}workshopPending.clear();}

 async function command(action,data){

  if(action==='status')return status();if(action==='poll'){const result=events;events=[];return result;}

  if(action==='player-damage'){if(mode==='host'&&verified.has(data.peer))send(data.peer,{type:'player-damage',amount:data.amount});return;}
  if(action==='boat-use'){if(mode!=='guest'||!driver)throw new Error('No online host');const id=String(++requestCounter);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{workshopPending.delete(id);reject(new Error('Boat request timed out.'));},15000);workshopPending.set(id,{resolve,reject,timer});send(driver.status().owner,{type:'boat-use',id,action:data.action,entity:data.entity,pose:data.pose});});}
  if(action==='entity-attack'){if(mode!=='guest'||!driver)throw new Error('No online host');const id=String(++requestCounter);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{workshopPending.delete(id);reject(new Error('Attack timed out.'));},15000);workshopPending.set(id,{resolve,reject,timer});send(driver.status().owner,{type:'entity-attack',id,entity:data.entity,item:data.item});});}
  if(action==='workshop'){if(mode!=='guest'||!driver)throw new Error('No online host');const id=String(++requestCounter);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{workshopPending.delete(id);reject(new Error('Workshop request timed out.'));},15000);workshopPending.set(id,{resolve,reject,timer});send(driver.status().owner,{type:'workshop-use',id,coords:data.coords,item:data.item});});}
  if(action==='workshop-drops'){if(mode==='host'&&verified.has(data.peer)&&Array.isArray(data.items)&&data.items.length<=32)send(data.peer,{type:'workshop-drops',items:data.items});return;}
  if(action==='workshop-result'){if(mode==='host'&&verified.has(data.peer))send(data.peer,{type:'workshop-result',id:data.id,result:data.result,error:data.error});return;}
  if(action==='respawn'){if(mode==='guest'&&driver)send(driver.status().owner,{type:'respawn-request'});return;}
  if(action==='pose'){if(!validPose(data))throw new Error('Invalid player position');if(driver){poses.set(driver.status().user,data);for(const peer of verified.keys())send(peer,{type:'pose',pose:data},false);}return;}

  if(action==='world-spawn'){if(mode==='host'&&validPose({...data,yaw:0,pitch:0})){const file=path.join(saves,worldId+'.json'),state=JSON.parse(fs.readFileSync(file,'utf8'));if(!state.spawn){state.spawn=data;fs.writeFileSync(file+'.tmp',JSON.stringify(state));fs.renameSync(file+'.tmp',file);}}return;}

  if(action==='ready'){ready=!!data;return;}

  if(action==='chunk')return chunk(data.cx,data.cz);

  if(action==='snapshot'){if(mode!=='host'||!verified.has(data.peer)||typeof data.id!=='string')return;send(data.peer,{type:'snapshot',id:data.id,snapshot:data.snapshot});return;}

  if(action==='blocks'){if(mode==='host'&&Array.isArray(data)&&data.length<=256&&data.every(validEdit))broadcast({type:'blocks',edits:data});return;}

  if(action==='player-save'){if(mode==='guest'&&driver){for(const packet of encode({type:'player-save',state:data}))driver.send(driver.status().owner,packet,true);}return;}

  if(action==='entities'){if(mode==='host'&&Array.isArray(data)&&data.length<=128)broadcast({type:'entities',states:data});return;}

  if(action==='clock'){if(mode==='host'&&Number.isFinite(data?.time)){latestClock=data;broadcast({type:'clock',time:data.time,weather:data.weather,speed:data.speed});}return;}

  if(action==='edit'){if(mode==='guest'&&validEdit(data))send(driver.status().owner,{type:'edit',edit:data});return;}

  if(operation)throw new Error('Another online action is in progress.');operation=true;

  try{

   if(action==='leave')return await leave();

   if(!['host','join'].includes(action))throw new Error('Unknown online action');

   const dedicated=action==='join'&&data?.transport==='server';await ensure(dedicated);lastError=null;

   if(action==='host'){if(typeof data!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(data)||data.startsWith('online-')||!fs.existsSync(path.join(saves,data+'.json')))throw new Error('Choose a local world to host.');const state=JSON.parse(fs.readFileSync(path.join(saves,data+'.json'),'utf8'));if(!state.multiplayer?.enabled)throw new Error('Enable multiplayer in this world’s settings first.');access=state.multiplayer.access==='invite'?'invite':'friends';worldId=data;mode='host';try{await friends.unpublish();await driver.host(Math.max(2,Math.min(8,state.multiplayer.maxPlayers||8)));await friends.publish({lobby_id:driver.status().lobbyId,world_name:state.name.slice(0,48),access});heartbeat=Date.now();}catch(error){await driver.leave().catch(()=>{});mode=null;worldId=null;throw error;}return status();}

   expectedHost=typeof data==='object'?data.hostId:null;const code=dedicated?{address:data.address,fingerprint:data.fingerprint}:typeof data==='object'?data.code:data;if(dedicated){await driver.login(await joinTicket(data.fingerprint));}mode='guest';let headerTimer;const header=new Promise((resolve,reject)=>{headerWaiter={resolve,reject};headerTimer=setTimeout(()=>{headerWaiter=null;reject(new Error(lastError||driver?.status().error||'Could not connect to the host. Check that both games are updated and the host world is open.'));},60000);});header.catch(()=>{});

   try{await driver.join(code);const world=await header;lastHostSeen=Date.now();if(world.player?.coords&&validPose({...world.player.coords,yaw:0,pitch:0}))world.coords=world.player.coords;if(!Number.isSafeInteger(world.seed)||!validPose({...world.coords,yaw:0,pitch:0})||!Array.isArray(world.modifiedBlocks))throw new Error('Invalid world header');worldId='online-'+crypto.randomUUID();

    const state={...world,id:worldId,name:'Online visit',createdAt:Date.now(),timestamp:Date.now(),health:world.player?.health??20,survival:sanitizeSurvival(world.player?.survival),stamina:100,yaw:world.player?.yaw??0,hotbar:world.player?.hotbar??Array.from({length:9},()=>({item:null,count:0})),inventory:world.player?.inventory??Array.from({length:27},()=>({item:null,count:0}))};

    fs.writeFileSync(path.join(saves,worldId+'.json'),JSON.stringify(state));

    const folder=path.join(saves,'chunks',worldId);fs.mkdirSync(folder,{recursive:true});const cx=Math.floor(world.coords.x/16),cz=Math.floor(world.coords.z/16);

    // Persist exact host snapshots before the synchronous spawn check runs.

    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const snapshot=await chunk(cx+dx,cz+dz);fs.writeFileSync(path.join(folder,`${cx+dx},${cz+dz}.json`),JSON.stringify(snapshot));}

    return status();

   }catch(error){await leave().catch(()=>{});throw error;}finally{clearTimeout(headerTimer);headerWaiter=null;}

  }finally{operation=false;}

 }

 function close(){if(mode==='host')for(const peer of verified.keys()){try{savePosition(peer,true);for(const packet of encode({type:'goodbye'}))driver.send(peer,packet,true);}catch{}}closed=true;clearInterval(timer);for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(new Error('Online service closed'));}pending.clear();for(const request of workshopPending.values()){clearTimeout(request.timer);request.reject(new Error('Online service closed.'));}workshopPending.clear();if(mode==='host')void friends.unpublish().catch(()=>{});driver?.close();driver=null;}

 return {command,status,chunk,close};

}

module.exports={createOnline};
