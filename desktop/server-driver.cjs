const {connect}=require('./server-wire.cjs');
function createServerDriver(){let token,user=null,owner='server',socket,sendWire,lobbyId=null,error=null,profile=null;const inbox=[],members=new Map();
 return {kind:'dedicated',login:async value=>{token=value;},host:async()=>{throw new Error('Use the dedicated server launcher to host this server.');},
  join:async target=>new Promise((resolve,reject)=>{const connection=connect(target.address,message=>{
   if(message.op==='error'){error=String(message.message);reject(new Error(error));socket.destroy();}
   if(message.op==='joined'){user=message.id;profile={id:'server',username:String(message.name).slice(0,48)};lobbyId=target.address;resolve(lobbyId);}
   if(message.op==='members'){members.clear();for(const item of message.players??[])if(item.id!==user)members.set(item.id,item);}
   if(message.op==='packet'&&typeof message.data==='string'&&message.data.length<2000&&inbox.length<512)inbox.push({sender:message.sender,data:Buffer.from(message.data,'base64')});
  });socket=connection.socket;sendWire=connection.send;
   socket.on('secureConnect',()=>{if(!target.fingerprint||socket.getPeerCertificate().fingerprint256!==target.fingerprint){reject(new Error('Server identity changed. Check its fingerprint before trusting it again.'));socket.destroy();return;}sendWire({op:'auth',ticket:token,protocol:1});});
   socket.on('error',e=>{error=e.message;reject(e);});socket.on('close',()=>{error??='Disconnected from server';lobbyId=null;});
  }),
  identity:async peer=>peer==='server'?profile:members.get(peer),
  status:()=>({user,owner,lobbyId,peers:lobbyId?['server',...members.keys()]:[],relayOnly:false,error}),
  send:(peer,data)=>sendWire({op:'packet',to:peer,data:data.toString('base64')}),poll:()=>inbox.splice(0),leave:async()=>{socket?.end();lobbyId=null;inbox.length=0;members.clear();},close:()=>socket?.destroy(),kick:async()=>{}
 };
}
module.exports={createServerDriver};
