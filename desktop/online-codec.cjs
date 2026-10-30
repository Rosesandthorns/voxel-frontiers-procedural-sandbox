const {deflateRawSync,inflateRawSync}=require('node:zlib');
const crypto=require('node:crypto');
const LIMIT=1024*1024,SLICE=1146;
function encode(message){const raw=Buffer.from(JSON.stringify(message));if(raw.length>LIMIT)throw new Error('Online message too large');const data=deflateRawSync(raw,{level:1});const count=Math.ceil(data.length/SLICE);if(count>512)throw new Error('Online message too large');const id=crypto.randomBytes(8),result=[];for(let i=0;i<count;i++){const part=Buffer.alloc(16+Math.min(SLICE,data.length-i*SLICE));part.writeUInt32LE(0x42494f31);id.copy(part,4);part.writeUInt16LE(i,12);part.writeUInt16LE(count,14);data.copy(part,16,i*SLICE,(i+1)*SLICE);result.push(part);}return result;}
function decoder(){const entries=new Map();return {receive(peer,packet){
 const now=Date.now();for(const[key,entry]of entries)if(entry.deadline<now)entries.delete(key);
 if(!Buffer.isBuffer(packet)||packet.length<16||packet.length>1170||packet.readUInt32LE(0)!==0x42494f31)return null;
 const index=packet.readUInt16LE(12),count=packet.readUInt16LE(14);if(!count||count>512||index>=count)return null;
 if(count===1){try{return JSON.parse(inflateRawSync(packet.subarray(16),{maxOutputLength:LIMIT}).toString('utf8'));}catch{return null;}}
 const key=peer+':'+packet.subarray(4,12).toString('hex');let entry=entries.get(key);
 if(!entry){if([...entries.keys()].filter(k=>k.startsWith(peer+':')).length>=4)return null;entry={count,parts:new Map(),deadline:now+20000};entries.set(key,entry);}
 if(entry.count!==count)return null;entry.parts.set(index,packet.subarray(16));if(entry.parts.size!==count)return null;
 entries.delete(key);try{const raw=inflateRawSync(Buffer.concat(Array.from({length:count},(_,i)=>entry.parts.get(i))),{maxOutputLength:LIMIT});return JSON.parse(raw.toString('utf8'));}catch{return null;}
 },clear(){entries.clear();}};}
module.exports={encode,decoder};
