import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire}from'node:module';

const require=createRequire(import.meta.url),{_electron}=require('playwright');
const profile=path.resolve('../../work/block-mesh-'+Date.now()),saves=path.join(profile,'saves');
fs.mkdirSync(saves,{recursive:true});
const slots=n=>Array.from({length:n},()=>({item:null,count:0}));
fs.writeFileSync(path.join(saves,'mesh.json'),JSON.stringify({id:'mesh',name:'Mesh verification',seed:1337,generationVersion:6,timestamp:Date.now(),hotbar:slots(9),inventory:slots(27),health:20,stamina:100,coords:{x:8.5,y:140,z:8.5},settings:{enableFlight:true,renderDistance:3,soundVolume:0}}));
const app=await _electron.launch({executablePath:process.env.VOXEL_TEST_EXE||require('electron'),args:process.env.VOXEL_TEST_EXE?['--disable-gpu']:['.','--disable-gpu'],env:{...process.env,VOXEL_USER_DATA:profile}});
const find=()=>{const n=document.getElementById('voxel-canvas').parentElement;for(let f=n[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];f;f=f.return)for(let h=f.memoizedState;h;h=h.next){const v=h.memoizedState?.current;if(v?.chunks instanceof Map&&v?.setBlock)return v;}};
try{
 const page=await app.firstWindow();
 await page.getByRole('button',{name:'Play Mesh verification',exact:true}).click();
 await page.getByRole('button',{name:'Enter world',exact:true}).click({timeout:120000});
 await page.waitForFunction(source=>{const w=(0,eval)('('+source+')()');return !!w?.chunks.get(`${w.currentChunkCX},${w.currentChunkCZ}`)?.mesh;},find.toString(),{timeout:120000});
 const start=await page.evaluate(source=>{const w=(0,eval)('('+source+')()'),c=w.chunks.get(`${w.currentChunkCX},${w.currentChunkCZ}`),x=c.cx*16+8,z=c.cz*16+8;return {key:`${c.cx},${c.cz}`,x,z,count:c.mesh.geometry.getAttribute('position').count,y:c.maxY+10,mesh:c.mesh.uuid};},find.toString());
 await page.evaluate(([source,p])=>(0,eval)('('+source+')()').setBlock(p.x,p.y,p.z,3),[find.toString(),start]);
 await page.waitForFunction(([source,p])=>{const w=(0,eval)('('+source+')()'),c=w.chunks.get(p.key);return w.getBlock(p.x,p.y,p.z)===3&&c.mesh?.uuid!==p.mesh;},[find.toString(),start]);
 const placed=await page.evaluate(([source,p])=>{const w=(0,eval)('('+source+')()'),c=w.chunks.get(p.key);return {...p,mesh:c.mesh.uuid,count:c.mesh.geometry.getAttribute('position').count};},[find.toString(),start]);
 await page.evaluate(([source,p])=>(0,eval)('('+source+')()').setBlock(p.x,p.y,p.z,0),[find.toString(),placed]);
 await page.waitForFunction(([source,p])=>{const w=(0,eval)('('+source+')()'),c=w.chunks.get(p.key);return w.getBlock(p.x,p.y,p.z)===0&&c.mesh?.uuid!==p.mesh;},[find.toString(),placed]);
 const finalCount=await page.evaluate(([source,p])=>(0,eval)('('+source+')()').chunks.get(p.key).mesh.geometry.getAttribute('position').count,[find.toString(),start]);
 assert.ok(placed.count>start.count,'Placed block is present in rendered geometry');
 assert.equal(finalCount,start.count,'Broken block is removed from rendered geometry');
 console.log('Packaged chunk mesh visibly adds placed blocks and removes broken blocks.');
}finally{await app.close();}
