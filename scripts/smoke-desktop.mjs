import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {_electron}=require('playwright');
const userData=path.resolve('../../work/biome-desktop-'+Date.now());
const launch=()=>_electron.launch({executablePath:process.env.VOXEL_TEST_EXE||require('electron'),args:process.env.VOXEL_TEST_EXE?['--disable-gpu']:['.','--disable-gpu'],env:{...process.env,VOXEL_USER_DATA:userData}});
let app=await launch();await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].show();BrowserWindow.getAllWindows()[0].focus();});let page=await app.firstWindow();page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log(m.type(),m.text());});const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function enter(name){await page.getByRole('button',{name:`Play ${name}`,exact:true}).click();await page.getByRole('button',{name:'Enter world',exact:true}).click({timeout:120000});await page.waitForTimeout(600);}
async function pause(){await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Paused',exact:true}).waitFor();}
async function leave(){await page.getByRole('button',{name:'Save & return to menu',exact:true}).click();await page.getByRole('heading',{name:'BIOME',exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>window.__workerCount ?? 0),0);assert.equal(await page.evaluate(()=>window.__loopingAudio?.size ?? 0),0);}
async function create(name){await page.getByRole('button',{name:'New world',exact:true}).click();await page.getByLabel('World name',{exact:true}).fill(name);await page.getByRole('button',{name:'Create & play',exact:true}).click();await page.getByRole('button',{name:'Enter world',exact:true}).click({timeout:120000});await page.waitForTimeout(500);}
try {
 await page.getByRole('heading',{name:'BIOME',exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.getByText('WASD Move',{exact:false}).count(),0);
 await page.evaluate(async()=>{
   const api=window.desktop;
   const header={format:1,generation:2,biome:'Verdant Plains',name:'Race test',subBiome:'test',sickly:false,maxY:100};
   const stale=api.chunks('write',{key:'0,0',value:{...header,voxels:new Uint16Array(40960).fill(3),waterValues:new Uint8Array(40960)}},'io-race');
   api.store('chunkWrite',JSON.stringify({key:'0,0',value:{...header,blocks:[40960,1],water:[40960,0]}}),'io-race');
   await stale;
   const current=await api.chunks('read',{key:'0,0'},'io-race');
   if(current.voxels[0]!==1)throw new Error('An old async write replaced a newer manual checkpoint');
   api.store('clear',undefined,'io-race');
 });
 await page.evaluate(()=>{
   window.__workerCount=0;
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker { constructor(...args){super(...args);window.__workerCount++;} terminate(){window.__workerCount--;return super.terminate();} };
   window.__loopingAudio=new Set();
   const start=AudioBufferSourceNode.prototype.start, stop=AudioBufferSourceNode.prototype.stop;
   AudioBufferSourceNode.prototype.start=function(...args){if(this.loop){window.__loopingAudio.add(this);this.addEventListener('ended',()=>window.__loopingAudio.delete(this),{once:true});}return start.apply(this,args);};
   AudioBufferSourceNode.prototype.stop=function(...args){window.__loopingAudio.delete(this);return stop.apply(this,args);};
 });
 await create('Birch Home');await pause();
 console.log('Before resume',await page.evaluate(()=>({focus:document.hasFocus(),lock:document.pointerLockElement?.id})));
 await page.getByRole('button',{name:'Resume',exact:false}).click();
 await page.waitForFunction(()=>document.pointerLockElement?.id==='voxel-canvas',{},{timeout:10000});
 await page.waitForTimeout(500);await pause();
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.pointerLockElement?.id==='voxel-canvas',{},{timeout:10000});
 await page.waitForTimeout(500);await pause();
 await page.screenshot({path:'../../outputs/biome-pause.png'});await leave();
 await create('Second Valley');await pause();await leave();
 const files=fs.readdirSync(path.join(userData,'saves')).filter(f=>f.endsWith('.json')&&f!=='world.json');
 const states=files.map(f=>({file:f,state:JSON.parse(fs.readFileSync(path.join(userData,'saves',f),'utf8'))}));
 const home=states.find(x=>x.state.name==='Birch Home');const valley=states.find(x=>x.state.name==='Second Valley');assert.ok(home&&valley);assert.notEqual(home.state.id,valley.state.id);
 const chunkDir=path.join(userData,'saves/chunks',home.state.id);const chunks=fs.readdirSync(chunkDir).filter(f=>f.endsWith('.json'));assert.ok(chunks.length>=9);
 const file=path.join(chunkDir,chunks[0]);const original=fs.readFileSync(file,'utf8');
 await page.screenshot({path:'../../outputs/biome-worlds.png'});
 await app.close();app=await launch();page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await enter('Birch Home');await pause();await leave();
 assert.equal(fs.readFileSync(file,'utf8'),original,'Explored terrain changed on restart');
 await page.getByRole('button',{name:'Rename Second Valley',exact:true}).click();await page.getByRole('textbox',{name:'World name'}).fill('Quiet Valley');await page.getByRole('button',{name:'Save name',exact:true}).click();await page.getByRole('button',{name:'Play Quiet Valley',exact:true}).waitFor();
 await page.getByRole('button',{name:'Delete Quiet Valley',exact:true}).click();await page.getByRole('button',{name:'Delete permanently',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Play Quiet Valley',exact:true}).count(),0);assert.ok(fs.existsSync(chunkDir));assert.ok(!fs.existsSync(path.join(userData,'saves/chunks',valley.state.id)));
 assert.deepEqual(errors,[]);console.log('Desktop: separate worlds, creation, pointer recapture, unload, rename/delete and explored chunks surviving restart passed.');
} finally {await app.close();}
