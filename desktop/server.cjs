const fs=require('node:fs');const path=require('node:path');const tls=require('node:tls');const crypto=require('node:crypto');const {Worker}=require('node:worker_threads');

const {framed}=require('./server-wire.cjs');const {encode,decoder}=require('./online-codec.cjs');

const defaults={name:'My Biome server',host:'0.0.0.0',port:25570,maxPlayers:8,seed:1337,autoUpdate:false,whitelistEnabled:false,whitelist:[],blacklist:[]};

function validConfig(value){const c={...defaults,...value};if(typeof c.name!=='string'||!c.name.trim()||c.name.length>48)throw new Error('Server name must be 1–48 characters');if(!Number.isInteger(c.maxPlayers)||c.maxPlayers<1||c.maxPlayers>32)throw new Error('Player limit must be 1–32');if(!Number.isInteger(c.port)||c.port<0||c.port>65535)throw new Error('Invalid port');if(!Number.isSafeInteger(c.seed))throw new Error('Seed must be a safe integer');for(const key of ['whitelist','blacklist'])if(!Array.isArray(c[key])||!c[key].every(x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{3,40}$/.test(x)))throw new Error('Access lists must contain Biome usernames or UUIDs');return c;}

function allowed(config,person){const matches=item=>item.toLowerCase()===person.username.toLowerCase()||item===person.id;if(config.blacklist.some(matches))return false;return !config.whitelistEnabled||config.whitelist.some(matches);}

async function startServer({folder,config:input,authenticate,log=console.log,worldFactory}={}){

 fs.mkdirSync(folder,{recursive:true});const releaseLock=require('./server-lock.cjs').lockWorld(folder);let cleanupWorker=null,cleanupServer=null,cleanupHeartbeat=null;try{const configFile=path.join(folder,'server.json');let config=validConfig(input??(fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):defaults));

 const saveConfig=()=>{fs.writeFileSync(configFile+'.tmp',JSON.stringify(config,null,2));fs.renameSync(configFile+'.tmp',configFile);};saveConfig();

 const certFile=path.join(folder,'server-cert.pem'),keyFile=path.join(folder,'server-key.pem');

 if(!fs.existsSync(certFile)||!fs.existsSync(keyFile)){const pems=await require('selfsigned').generate([{name:'commonName',value:'Biome dedicated server'}],{keyType:'ec',curve:'P-256',algorithm:'sha256',notAfterDate:new Date(Date.now()+10*365*86400000)});fs.writeFileSync(keyFile,pems.private,{mode:0o600});fs.writeFileSync(certFile,pems.cert);}

 const cert=fs.readFileSync(certFile),fingerprint=new crypto.X509Certificate(cert).fingerprint256;

 if(!authenticate){const {createClient}=require('@supabase/supabase-js');const account=require('./account-config.json');const client=createClient(account.url,account.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});

  authenticate=async ticket=>{if(typeof ticket!=='string'||!/^[0-9a-f]{64}$/.test(ticket))throw new Error('Invalid join ticket');const hash=crypto.createHash('sha256').update(ticket).digest('hex');const {data,error}=await client.rpc('biome_redeem_server_ticket',{ticket_hash:hash,server_fingerprint:fingerprint});if(error)throw new Error('Server account verification is unavailable.');if(!data?.[0]?.username)throw new Error('Join ticket expired or was already used.');return data[0];};}

 let rpc;

 if(worldFactory)rpc=await worldFactory();else{const worker=new Worker(globalThis.__biomeWorldWorkerCode??path.join(__dirname,'server-world-worker.cjs'),{eval:!!globalThis.__biomeWorldWorkerCode,workerData:{folder:path.join(folder,'world'),seed:config.seed}});cleanupWorker=()=>worker.terminate();let next=0;const pending=new Map();

  await new Promise((resolve,reject)=>{const fail=error=>{for(const request of pending.values())request.reject(error);pending.clear();};worker.on('error',e=>{reject(e);fail(e);});worker.on('exit',code=>{if(code)fail(new Error('World worker stopped'));});worker.on('message',message=>{if(message.ready)resolve();else if(message.fatal)reject(new Error(message.fatal));else{const request=pending.get(message.id);if(request){pending.delete(message.id);message.error?request.reject(new Error(message.error)):request.resolve(message.result);}}});});

  rpc={call:(action,...args)=>new Promise((resolve,reject)=>{if(pending.size>=128){reject(new Error('World is busy'));return;}const id=++next;pending.set(id,{resolve,reject});worker.postMessage({id,action,args});}),close:async()=>{await rpc.call('close');await worker.terminate();}};}

 const players=new Map(),connections=new Set(),ipCounts=new Map();let closed=false;

 const info=()=>({op:'info',name:config.name,players:players.size,maxPlayers:config.maxPlayers,protocol:1});

 const send=(peer,message,sender='server')=>{for(const packet of encode(message))peer.send({op:'packet',sender,data:packet.toString('base64')});};

 const broadcast=(message,except,sender='server')=>{for(const peer of players.values())if(peer!==except)send(peer,message,sender);};

 const members=()=>{const message={op:'members',players:[...players.values()].map(p=>({id:p.person.id,username:p.person.username}))};for(const p of players.values())p.send(message);};

 const error=(peer,message)=>{peer.send({op:'error',message});peer.socket.end();};

 const rate=(peer,name,limit)=>{let r=peer.rates.get(name);const now=Date.now();if(!r||now-r.at>1000){r={at:now,count:0};peer.rates.set(name,r);}return ++r.count<=limit;};

 const validPose=p=>p&&['x','y','z','yaw','pitch'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&Math.abs(p.x)<3e7&&Math.abs(p.z)<3e7&&p.y>-500&&Number.isFinite(p.y);

 async function message(peer,value){

  if(!value||typeof value.op!=='string')return;

  if(value.op==='info'&&!peer.person){peer.send(info());return;}

  if(value.op==='auth'&&!peer.person&&!peer.authenticating){peer.authenticating=true;try{if(value.protocol!==1)throw new Error('This server requires a compatible Biome version.');if(players.size>=config.maxPlayers)throw new Error('The server is full.');const person=await authenticate(value.ticket);if(!person?.id||!person.username)throw new Error('Sign in to a Biome account first.');if(closed||peer.socket.destroyed)return;if(!allowed(config,person))throw new Error('You are not allowed to join this server.');if(players.has(person.id))throw new Error('This account is already connected.');if(players.size>=config.maxPlayers)throw new Error('The server is full.');peer.person=person;players.set(person.id,peer);peer.socket.setTimeout(90000);peer.send({op:'joined',id:person.id,name:config.name});members();const world=await rpc.call('header',person.id);peer.pose={...world.coords,yaw:0,pitch:0};send(peer,{type:'welcome',world:{...world,name:config.name}});for(const other of players.values())if(other!==peer){if(other.pose)send(peer,{type:'pose',pose:other.pose},other.person.id);if(other.skin)send(peer,{type:'skin',data:other.skin},other.person.id);}log(`${person.username} joined (${players.size}/${config.maxPlayers})`);}catch(e){error(peer,e.message);}return;}

  if(!peer.person||value.op!=='packet'||typeof value.data!=='string'||value.data.length>2000||!rate(peer,'packets',500))return;

  const decoded=peer.decoder.receive(peer.person.id,Buffer.from(value.data,'base64'));if(!decoded)return;

  if(decoded.type==='entity-attack'&&rate(peer,'attack',3)&&typeof decoded.entity==='string'){const result=await rpc.call('attack',decoded.entity,decoded.item,peer.pose);send(peer,{type:'workshop-result',id:decoded.id,result});return;}
  if(decoded.type==='boat-use'&&rate(peer,'boat',3)){try{const pose=decoded.action==='place'?decoded.pose:peer.pose;if(!pose||!['x','y','z'].every(k=>Number.isFinite(pose[k]))||Math.hypot(pose.x-peer.pose.x,pose.y-peer.pose.y,pose.z-peer.pose.z)>9)throw new Error('Move closer.');const result=await rpc.call('boat',decoded.action,decoded.entity,pose,peer.person.id);send(peer,{type:'workshop-result',id:decoded.id,result});}catch(e){send(peer,{type:'workshop-result',id:decoded.id,error:e.message});}return;}
  if(decoded.type==='workshop-use'&&rate(peer,'workshop',4)&&typeof decoded.id==='string'&&decoded.id.length<80){const p=decoded.coords;if(!p||!['x','y','z'].every(k=>Number.isSafeInteger(p[k]))||Math.hypot(p.x-peer.pose.x,p.y-peer.pose.y,p.z-peer.pose.z)>9)return;try{const result=await rpc.call('workshop',p,decoded.item);send(peer,{type:'workshop-result',id:decoded.id,result});broadcast({type:'blocks',edits:[{...p,block:result.block}]});}catch(e){send(peer,{type:'workshop-result',id:decoded.id,error:e.message});}return;}
  if(decoded.type==='respawn-request'&&rate(peer,'respawn',1)){const world=await rpc.call('header',peer.person.id),coords=world.spawn;peer.pose={...coords,yaw:0,pitch:0};await rpc.call('player',peer.person.id,{hotbar:world.player?.hotbar??Array.from({length:9},()=>({item:null,count:0})),inventory:world.player?.inventory??Array.from({length:27},()=>({item:null,count:0})),coords,health:20,survival:{hunger:100,oxygen:20}});send(peer,{type:'respawned',coords});broadcast({type:'player-teleport',peer:peer.person.id,pose:peer.pose},peer);return;}
  if(decoded.type==='pose'&&rate(peer,'pose',25)&&validPose(decoded.pose)){const old=peer.pose;if(old&&Math.hypot(decoded.pose.x-old.x,decoded.pose.y-old.y,decoded.pose.z-old.z)>120)return;peer.pose=decoded.pose;if(Date.now()-(peer.savedPositionAt||0)>5000){peer.savedPositionAt=Date.now();await rpc.call('position',peer.person.id,peer.pose);}broadcast(decoded,peer,peer.person.id);}

  if(decoded.type==='skin'&&rate(peer,'skin',1)&&typeof decoded.data==='string'&&decoded.data.length<100000&&decoded.data.startsWith('data:image/png;base64,')){const png=Buffer.from(decoded.data.slice(22),'base64');if(png.length<24||png.readUInt32BE(16)!==128||png.readUInt32BE(20)!==128)return;peer.skin=decoded.data;broadcast(decoded,peer,peer.person.id);}

  if(decoded.type==='chunk'&&rate(peer,'chunks',32)&&peer.pending<4&&Number.isInteger(decoded.cx)&&Number.isInteger(decoded.cz)&&Math.abs(decoded.cx)<1875000&&Math.abs(decoded.cz)<1875000&&typeof decoded.id==='string'&&decoded.id.length<80&&Math.abs(decoded.cx-Math.floor(peer.pose.x/16))<=18&&Math.abs(decoded.cz-Math.floor(peer.pose.z/16))<=18){peer.pending++;try{const snapshot=await rpc.call('snapshot',decoded.cx,decoded.cz);send(peer,{type:'snapshot',id:decoded.id,snapshot});}finally{peer.pending--;}}

  if(decoded.type==='edit'&&rate(peer,'edits',16)){const e=decoded.edit;if(e&&['x','y','z','block'].every(k=>Number.isInteger(e[k]))&&Math.hypot(e.x-peer.pose.x,e.y-peer.pose.y,e.z-peer.pose.z)<=9){const edits=await rpc.call('edit',e);if(edits.length){const drops=edits.flatMap(e=>e.workshopDrops??[]);for(const e of edits)delete e.workshopDrops;broadcast({type:'blocks',edits});if(drops.length)send(peer,{type:'workshop-drops',items:drops});}}}

  if(decoded.type==='player-save'&&rate(peer,'save',2)&&decoded.state){const data={...decoded.state,coords:peer.pose};await rpc.call('player',peer.person.id,data);}

 }

 const server=tls.createServer({key:fs.readFileSync(keyFile),cert,minVersion:'TLSv1.3',handshakeTimeout:10000},socket=>{

  const ip=socket.remoteAddress;const count=ipCounts.get(ip)??0;if(connections.size>=config.maxPlayers+16||count>=6){socket.destroy();return;}ipCounts.set(ip,count+1);connections.add(socket);socket.setNoDelay(true);socket.setTimeout(15000,()=>socket.destroy());

  const peer={socket,send:null,person:null,pose:null,skin:null,rates:new Map(),decoder:decoder(),pending:0,authenticating:false};peer.send=framed(socket,value=>{if(!rate(peer,'wire',600)){socket.destroy();return;}void message(peer,value).catch(e=>error(peer,e.message));});

  socket.on('error',()=>{});socket.on('close',()=>{connections.delete(socket);ipCounts.set(ip,Math.max(0,(ipCounts.get(ip)??1)-1));if(peer.person){if(peer.pose)void rpc.call('position',peer.person.id,peer.pose).catch(()=>{});players.delete(peer.person.id);members();log(`${peer.person.username} left`);}});

 });

 cleanupServer=()=>server.close(()=>{});server.maxConnections=config.maxPlayers+32;server.on('tlsClientError',()=>{});

 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.port,config.host,resolve);});

 let simulating=false;const simulation=setInterval(async()=>{if(simulating||closed||!players.size)return;simulating=true;try{const result=await rpc.call('step',.1,[...players.values()].filter(p=>p.pose).map(p=>({...p.pose,id:p.person.id})));if(!closed){broadcast({type:'entities',states:result.states});if(result.edits.length)broadcast({type:'blocks',edits:result.edits});for(const hit of result.damage){const peer=players.get(hit.id);if(peer)send(peer,{type:'player-damage',amount:hit.amount});}}}catch(e){log('Creature update failed: '+e.message);}finally{simulating=false;}},100);
 let ticking=false;const heartbeat=setInterval(async()=>{if(ticking||closed)return;ticking=true;try{const value=await rpc.call('clock');if(!closed)broadcast({type:'clock',...value});}catch(error){log('World clock update failed: '+error.message);}finally{ticking=false;}},5000);cleanupHeartbeat=()=>{clearInterval(heartbeat);clearInterval(simulation);};

 async function stop(){if(closed)return;closed=true;clearInterval(heartbeat);clearInterval(simulation);for(const peer of players.values())if(peer.pose)await rpc.call('position',peer.person.id,peer.pose);for(const socket of connections)socket.destroy();await new Promise(resolve=>server.close(resolve));try{await rpc.close();}finally{releaseLock();}}

 async function command(line){const [action,...args]=line.trim().split(/\s+/);const value=args.join(' ');

  if(action==='stop'){await stop();return 'Server stopped.';}

  if(action==='list')return `${players.size}/${config.maxPlayers}: ${[...players.values()].map(p=>p.person.username).join(', ')}`;

  if(action==='help')return 'list | name <name> | limit <1-32> | whitelist on/off/add/remove <username> | blacklist add/remove <username> | kick <username> | save | reload | autoupdate true/false | stop';

  if(action==='name'){config=validConfig({...config,name:value});saveConfig();return 'Server name saved.';}

  if(action==='limit'){config=validConfig({...config,maxPlayers:Number(value)});saveConfig();return 'Player limit saved.';}

  if(action==='autoupdate'&&['true','false'].includes(value)){config.autoUpdate=value==='true';saveConfig();return 'Auto-update '+value+' (checked at restart).';}

  if(action==='whitelist'||action==='blacklist'){const [sub,user]=args;if(action==='whitelist'&&['on','off'].includes(sub))config.whitelistEnabled=sub==='on';else{if(!['add','remove'].includes(sub)||!user||!/^[a-zA-Z0-9_-]{3,40}$/.test(user))return 'Use add/remove followed by a Biome username or UUID.';config[action]=config[action].filter(x=>x.toLowerCase()!==user.toLowerCase());if(sub==='add')config[action].push(user);}saveConfig();for(const p of players.values())if(!allowed(config,p.person))error(p,'The server access list changed.');return 'Access list saved.';}

  if(action==='kick'){const p=[...players.values()].find(p=>p.person.username.toLowerCase()===value.toLowerCase());if(p)error(p,'You were removed by the server operator.');return p?'Player removed.':'Player not found.';}

  if(action==='save'){await rpc.call('close');return 'World saved.';}

  if(action==='reload'){config=validConfig(JSON.parse(fs.readFileSync(configFile,'utf8')));for(const p of players.values())if(!allowed(config,p.person))error(p,'The server access list changed.');return 'Settings reloaded. Host and port changes apply after restart.';}

  return 'Unknown command. Type help.';

 }

 log(`Biome server: ${config.name}\nPort: ${server.address().port} TCP/TLS | ${config.maxPlayers} players\nCertificate SHA-256: ${fingerprint}`);

 return {server,stop,command,fingerprint,config,address:server.address()};

}catch(error){cleanupHeartbeat?.();cleanupServer?.();await cleanupWorker?.();releaseLock();throw error;}

}

async function cli(){const args=process.argv.slice(2);const get=name=>{const i=args.indexOf('--'+name);return i<0?undefined:args[i+1];};if(args.includes('--help')){console.log('Biome server --data <folder> --name <name> --host <IP> --port 25570 --max-players 8 --auto-update true|false\nCommands: whitelist on/off/add/remove, blacklist add/remove, kick, list, save, reload, stop');return;}

 const folder=path.resolve(get('data')||path.join(process.cwd(),'biome-server'));fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'server.json');let config=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{...defaults};for(const [flag,key]of [['name','name'],['host','host'],['port','port'],['max-players','maxPlayers'],['seed','seed'],['auto-update','autoUpdate']]){const v=get(flag);if(v!==undefined)config[key]=['port','maxPlayers','seed'].includes(key)?Number(v):key==='autoUpdate'?v==='true':v;}

 config=validConfig(config);

 if(config.autoUpdate)await require('./server-update.cjs').stageUpdate(folder).catch(e=>console.log('Update check: '+e.message));

 const game=await startServer({folder,config});for(const entries of Object.values(require('node:os').networkInterfaces()))for(const ip of entries??[])if(ip.family==='IPv4'&&!ip.internal)console.log('LAN address: '+ip.address+':'+game.address.port);

 console.log('Internet players need your public server address and a reachable TCP port. Use hosting with DDoS protection for public servers. No router/firewall settings were changed.\nType help for console commands.');

 const readline=require('node:readline').createInterface({input:process.stdin,output:process.stdout});readline.on('line',line=>void game.command(line).then(result=>{console.log(result);if(line.trim()==='stop')readline.close();}).catch(e=>console.log(e.message)));let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;readline.close();await game.stop();};process.on('SIGINT',stop);process.on('SIGTERM',stop);

}

module.exports={startServer,validConfig,allowed,cli};if(require.main===module)cli().catch(e=>{console.error(e.message);process.exitCode=1;});
