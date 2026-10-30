const {parentPort,workerData}=require('node:worker_threads');
const {createServerWorld}=require('./generated/server-world.cjs');
let world;
try{world=createServerWorld(workerData.folder,workerData.seed);parentPort.postMessage({ready:true});}catch(error){parentPort.postMessage({fatal:error.message});}
parentPort.on('message',async({id,action,args})=>{try{if(!world)throw new Error('World unavailable');const result=world[action](...args);parentPort.postMessage({id,result});}catch(error){parentPort.postMessage({id,error:error.message});}});
