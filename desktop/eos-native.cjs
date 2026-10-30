const koffi=require('koffi');
const path=require('node:path');
const crypto=require('node:crypto');
const definitions=require('./eos-types.json').structs;
const types={};for(const [name,fields]of Object.entries(definitions)){types[name]=koffi.struct(name,Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v==='char[33]'?koffi.array('char',33,'String'):v])));}
const logMessageType=koffi.struct('BiomeEOSLogMessage',{Category:'str',Message:'str',Level:'int32_t'});
const callbackType=koffi.proto('void BiomeEOSCallback(const void *data)');
let initialized=false;
function createEOS(config,{dllPath=path.join(__dirname,'native','EOSSDK-Win64-Shipping.dll'),debug=()=>{},diagnostics=false}={}){
 debug('loading native library');const lib=koffi.load(dllPath),f={};
 const bind=(name,result,args)=>f[name]=lib.func('EOS_'+name,result,args);
 bind('Initialize','int',['EOS_InitializeOptions *']);bind('Shutdown','int',[]);
 bind('Platform_Create','void *',['EOS_Platform_Options *']);bind('Platform_Release','void',['void *']);bind('Platform_Tick','void',['void *']);
 for(const service of ['Connect','P2P','Lobby'])bind('Platform_Get'+service+'Interface','void *',['void *']);
 bind('EResult_ToString','str',['int']);bind('EResult_IsOperationComplete','int',['int']);bind('ProductUserId_ToString','int',['void *','void *',koffi.inout('int32_t *')]);
 const asyncBind=(name,type)=>bind(name,'void',['void *',type+' *','void *','void *']);
 asyncBind('Connect_Login','EOS_Connect_LoginOptions');asyncBind('Connect_CreateUser','EOS_Connect_CreateUserOptions');
 asyncBind('Connect_QueryProductUserIdMappings','EOS_Connect_QueryProductUserIdMappingsOptions');
 bind('Connect_GetProductUserIdMapping','int',['void *','EOS_Connect_GetProductUserIdMappingOptions *','void *',koffi.inout('int32_t *')]);
 asyncBind('Lobby_CreateLobby','EOS_Lobby_CreateLobbyOptions');asyncBind('Lobby_JoinLobbyById','EOS_Lobby_JoinLobbyByIdOptions');asyncBind('Lobby_LeaveLobby','EOS_Lobby_LeaveLobbyOptions');asyncBind('Lobby_KickMember','EOS_Lobby_KickMemberOptions');
 bind('Lobby_CopyLobbyDetailsHandle','int',['void *','EOS_Lobby_CopyLobbyDetailsHandleOptions *',koffi.out('void **')]);
 bind('LobbyDetails_CopyInfo','int',['void *','EOS_LobbyDetails_CopyInfoOptions *',koffi.out('void **')]);bind('LobbyDetails_Info_Release','void',['void *']);bind('LobbyDetails_Release','void',['void *']);
 bind('LobbyDetails_GetMemberCount','uint32_t',['void *','EOS_LobbyDetails_GetMemberCountOptions *']);bind('LobbyDetails_GetMemberByIndex','void *',['void *','EOS_LobbyDetails_GetMemberByIndexOptions *']);
 bind('P2P_SetRelayControl','int',['void *','EOS_P2P_SetRelayControlOptions *']);bind('P2P_GetRelayControl','int',['void *','EOS_P2P_GetRelayControlOptions *',koffi.out('int *')]);
 bind('P2P_AcceptConnection','int',['void *','EOS_P2P_AcceptConnectionOptions *']);bind('P2P_CloseConnections','int',['void *','EOS_P2P_CloseConnectionsOptions *']);
 bind('P2P_AddNotifyPeerConnectionRequest','uint64_t',['void *','EOS_P2P_AddNotifyPeerConnectionRequestOptions *','void *','void *']);bind('P2P_RemoveNotifyPeerConnectionRequest','void',['void *','uint64_t']);
 bind('P2P_SendPacket','int',['void *','EOS_P2P_SendPacketOptions *']);
 bind('P2P_ReceivePacket','int',['void *','EOS_P2P_ReceivePacketOptions *',koffi.out('void **'),koffi.inout('EOS_P2P_SocketId *'),koffi.out('uint8_t *'),'void *',koffi.out('uint32_t *')]);
 bind('Logging_SetCallback','int',[koffi.pointer(callbackType)]);bind('Logging_SetLogLevel','int',['int','int']);
 let logCallback=null;
 const check=(result)=>{if(result!==0)throw new Error(f.EResult_ToString(result));};
 if(initialized)throw new Error('EOS is already running.');
 debug('SDK initialize');check(f.Initialize({ApiVersion:5,ProductName:'Biome',ProductVersion:'0.2.10'}));initialized=true;
 if(diagnostics){logCallback=koffi.register(pointer=>{const record=koffi.decode(pointer,logMessageType);const value=record.Message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'<JWT>').split(config.clientSecret).join('<client credential>');debug(record.Category+': '+value);},koffi.pointer(callbackType));f.Logging_SetCallback(logCallback);f.Logging_SetLogLevel(2147483647,300);}
 debug('platform create');const platform=f.Platform_Create({ApiVersion:15,ProductId:config.productId,SandboxId:config.sandboxId,DeploymentId:config.deploymentId,ClientCredentials:{ClientId:config.clientId,ClientSecret:config.clientSecret},bIsServer:0,Flags:6,TickBudgetInMilliseconds:2});
 if(!platform){f.Shutdown();initialized=false;throw new Error('Could not initialize EOS platform.');}
 debug('interfaces');const connect=f.Platform_GetConnectInterface(platform),p2p=f.Platform_GetP2PInterface(platform),lobby=f.Platform_GetLobbyInterface(platform);
 try{check(f.P2P_SetRelayControl(p2p,{ApiVersion:1,RelayControl:2}));const relay=[0];check(f.P2P_GetRelayControl(p2p,{ApiVersion:1},relay));if(relay[0]!==2)throw new Error('Relay-only transport could not be enabled.');}
 catch(error){f.Platform_Release(platform);f.Shutdown();initialized=false;throw error;}
 let user=null,lobbyId=null,owner=null,socket=null,closed=false;
 let peers=new Map(),queue=[],failure=null,lastMembers=0;let connectionNotification=null,connectionCallback=null;
 const callbacks=new Map();
 const userString=id=>{const buffer=Buffer.alloc(65),length=[65];check(f.ProductUserId_ToString(id,buffer,length));return buffer.toString('utf8').replace(/\0.*$/s,'');};
 const call=(name,handle,options,infoType)=>new Promise((resolve,reject)=>{
  debug('request '+name);const callback=koffi.register(pointer=>{
   debug('callback '+name);
   const record=koffi.decode(pointer,types[infoType]);debug('decoded '+name+' '+record.ResultCode);if(!f.EResult_IsOperationComplete(record.ResultCode))return;const pending=callbacks.get(callback);if(!pending)return;
   clearTimeout(pending.timer);callbacks.delete(callback);setImmediate(()=>{koffi.unregister(callback);if(closed)reject(new Error('Online session closed.'));else resolve(record);});
  },koffi.pointer(callbackType));
  const timer=setTimeout(()=>reject(new Error('Online request timed out.')),20000);callbacks.set(callback,{timer,reject});
  try{f[name](handle,options,null,callback);}catch(error){clearTimeout(timer);callbacks.delete(callback);koffi.unregister(callback);reject(error);}
 });
 function members(){
  if(!lobbyId)return;
  const details=[null];check(f.Lobby_CopyLobbyDetailsHandle(lobby,{ApiVersion:1,LobbyId:lobbyId,LocalUserId:user},details));
  try{
   const info=[null];check(f.LobbyDetails_CopyInfo(details[0],{ApiVersion:1},info));
   try{owner=userString(koffi.decode(info[0],types.EOS_LobbyDetails_Info).LobbyOwnerUserId);}finally{f.LobbyDetails_Info_Release(info[0]);}
   const updated=new Map(),count=f.LobbyDetails_GetMemberCount(details[0],{ApiVersion:1});
   if(count>8)throw new Error('Unsupported lobby size.');
   for(let i=0;i<count;i++){const id=f.LobbyDetails_GetMemberByIndex(details[0],{ApiVersion:1,MemberIndex:i});const key=userString(id);if(key!==userString(user))updated.set(key,id);}
   for(const [key,id]of updated)if(!peers.has(key))check(f.P2P_AcceptConnection(p2p,{ApiVersion:1,LocalUserId:user,RemoteUserId:id,SocketId:socket}));
   peers=updated;
  }finally{f.LobbyDetails_Release(details[0]);}
 }
 const timer=setInterval(()=>{
  if(closed)return;
  try{
   f.Platform_Tick(platform);
   if(user&&lobbyId){
    if(Date.now()-lastMembers>1000){lastMembers=Date.now();members();}
    for(let i=0;i<32;i++){
     const remote=[null],channel=[0],size=[0],packet=Buffer.alloc(1170),remoteSocket={ApiVersion:1,SocketName:''};
     const result=f.P2P_ReceivePacket(p2p,{ApiVersion:2,LocalUserId:user,MaxDataSizeBytes:1170},remote,remoteSocket,channel,packet,size);
     if(result===18)break; // EOS_NotFound: receive queue is empty.
     check(result);const sender=userString(remote[0]);
     if(peers.has(sender)&&remoteSocket.SocketName===socket.SocketName&&channel[0]===0&&queue.length<256)queue.push({sender,data:packet.subarray(0,size[0])});
    }
   }
  }catch(error){failure=error.message;}
 },16);
 function listenConnections(){if(connectionCallback)return;connectionCallback=koffi.register(pointer=>{try{const request=koffi.decode(pointer,types.EOS_P2P_OnIncomingConnectionRequestInfo);const requestedSocket=koffi.decode(request.SocketId,types.EOS_P2P_SocketId);if(socket&&requestedSocket.SocketName===socket.SocketName&&peers.has(userString(request.RemoteUserId)))check(f.P2P_AcceptConnection(p2p,{ApiVersion:1,LocalUserId:user,RemoteUserId:request.RemoteUserId,SocketId:socket}));}catch(error){failure=error.message;}},koffi.pointer(callbackType));connectionNotification=f.P2P_AddNotifyPeerConnectionRequest(p2p,{ApiVersion:1,LocalUserId:user,SocketId:null},null,connectionCallback);if(!connectionNotification)throw new Error('Could not listen for player connections.');}
 function activate(id){listenConnections();lobbyId=id;socket={ApiVersion:1,SocketName:crypto.createHash('sha256').update(id).digest('hex').slice(0,32)};members();}
 async function login(token){debug('Connect login requested');const result=await call('Connect_Login',connect,{ApiVersion:2,Credentials:{ApiVersion:1,Token:token,Type:9}},'EOS_Connect_LoginCallbackInfo');
  debug('Connect login callback '+result.ResultCode);if(result.ResultCode===3&&result.ContinuanceToken){const created=await call('Connect_CreateUser',connect,{ApiVersion:1,ContinuanceToken:result.ContinuanceToken},'EOS_Connect_CreateUserCallbackInfo');debug('Create user callback '+created.ResultCode);check(created.ResultCode);user=created.LocalUserId;}
  else{check(result.ResultCode);user=result.LocalUserId;}
  return userString(user);
 }
 async function host(maxPlayers=8){if(!user)throw new Error('Sign in first.');if(lobbyId)throw new Error('Leave the current lobby first.');
  const result=await call('Lobby_CreateLobby',lobby,{ApiVersion:10,LocalUserId:user,MaxLobbyMembers:maxPlayers,PermissionLevel:2,bAllowInvites:1,BucketId:'biome-1',bDisableHostMigration:1,bEnableJoinById:1},'EOS_Lobby_CreateLobbyCallbackInfo');check(result.ResultCode);activate(result.LobbyId);return result.LobbyId;}
 async function join(id){if(!user)throw new Error('Sign in first.');if(lobbyId)throw new Error('Leave the current lobby first.');if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(id))throw new Error('Invalid lobby code.');
  const result=await call('Lobby_JoinLobbyById',lobby,{ApiVersion:3,LobbyId:id,LocalUserId:user},'EOS_Lobby_JoinLobbyByIdCallbackInfo');check(result.ResultCode);activate(result.LobbyId);return result.LobbyId;}
 async function leave(){if(!lobbyId)return;const result=await call('Lobby_LeaveLobby',lobby,{ApiVersion:1,LocalUserId:user,LobbyId:lobbyId},'EOS_Lobby_LeaveLobbyCallbackInfo');check(result.ResultCode);f.P2P_CloseConnections(p2p,{ApiVersion:1,LocalUserId:user,SocketId:socket});lobbyId=null;owner=null;socket=null;peers.clear();queue=[];}
 async function identity(peer){
  const target=user&&peer===userString(user)?user:peers.get(peer);if(!target)throw new Error('Player left the lobby.');
  const result=await call('Connect_QueryProductUserIdMappings',connect,{ApiVersion:2,LocalUserId:user,ProductUserIds:[target],ProductUserIdCount:1},'EOS_Connect_QueryProductUserIdMappingsCallbackInfo');check(result.ResultCode);
  const buffer=Buffer.alloc(257),length=[257];check(f.Connect_GetProductUserIdMapping(connect,{ApiVersion:1,LocalUserId:user,AccountIdType:8,TargetProductUserId:target},buffer,length));
  return buffer.toString('utf8').replace(/\0.*$/s,'');
 }
 async function kick(peer){const target=peers.get(peer);if(!target)return;const result=await call('Lobby_KickMember',lobby,{ApiVersion:1,LocalUserId:user,LobbyId:lobbyId,TargetUserId:target},'EOS_Lobby_KickMemberCallbackInfo');check(result.ResultCode);}
 function send(peer,data,reliable=true){if(!lobbyId||!peers.has(peer)||!Buffer.isBuffer(data)||data.length>1170)throw new Error('Invalid peer packet.');check(f.P2P_SendPacket(p2p,{ApiVersion:3,LocalUserId:user,RemoteUserId:peers.get(peer),SocketId:socket,Channel:0,DataLengthBytes:data.length,Data:data,bAllowDelayedDelivery:1,Reliability:reliable?2:0,bDisableAutoAcceptConnection:1}));}
 function close(){if(closed)return;closed=true;clearInterval(timer);if(connectionNotification)f.P2P_RemoveNotifyPeerConnectionRequest(p2p,connectionNotification);if(connectionCallback)koffi.unregister(connectionCallback);f.Platform_Release(platform);for(const [cb,pending]of callbacks){clearTimeout(pending.timer);pending.reject(new Error('Online session closed.'));koffi.unregister(cb);}callbacks.clear();f.Shutdown();if(logCallback)koffi.unregister(logCallback);initialized=false;lib.unload();}
 return {login,host,join,leave,send,close,identity,kick,poll:()=>{const result=queue;queue=[];return result;},status:()=>({user:user?userString(user):null,lobbyId,owner,peers:[...peers.keys()],relayOnly:true,error:failure})};
}
module.exports={createEOS};
