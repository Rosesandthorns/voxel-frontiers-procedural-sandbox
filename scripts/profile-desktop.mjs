import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url);const {_electron}=require('playwright');
const tag=process.argv[2]||'baseline';const radius=Number(process.argv[3]||6);
const profilePath=path.resolve('../../work/perf-'+tag+'-'+Date.now());fs.mkdirSync(path.join(profilePath,'saves'),{recursive:true});
const meta={id:'perf',name:'Performance route',seed:321,generationVersion:2,timestamp:Date.now(),hotbar:Array.from({length:9},()=>({item:null,count:0})),inventory:Array.from({length:27},()=>({item:null,count:0})),health:20,stamina:100,coords:{x:8.5,y:145,z:8.5},settings:{renderDistance:radius,enableFlight:true,soundVolume:0,ambientVolume:0,effectsVolume:0,footstepsVolume:0}};
fs.writeFileSync(path.join(profilePath,'saves/perf.json'),JSON.stringify(meta));
const app=await _electron.launch({executablePath:process.env.VOXEL_TEST_EXE || require('electron'),args:[...(process.env.VOXEL_TEST_EXE ? [] : ['.']),...(process.env.VOXEL_PROFILE_GPU ? [] : ['--disable-gpu'])],env:{...process.env,VOXEL_USER_DATA:profilePath}});
try{
await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());const page=await app.firstWindow();page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.getByRole('button',{name:'Play Performance route'}).click();await page.getByRole('button',{name:'Enter world',exact:true}).click({timeout:120000});
const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
await page.evaluate(()=>{window.__frames=[];window.__long=[];window.__recording=true;let last=performance.now();const frame=()=>{const now=performance.now();if(window.__recording){window.__frames.push(now-last);last=now;requestAnimationFrame(frame);}};requestAnimationFrame(frame);new PerformanceObserver(list=>{if(window.__recording)window.__long.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:false});});
await page.keyboard.down('KeyW');await page.waitForTimeout(18000);await page.keyboard.up('KeyW');await page.keyboard.down('KeyD');await page.waitForTimeout(16500);await page.keyboard.up('KeyD');
const {profile}=await cdp.send('Profiler.stop');const metrics=await page.evaluate(()=>{window.__recording=false;const a=window.__frames.sort((x,y)=>x-y);return {frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a[a.length-1],over50:a.filter(x=>x>50).length,over100:a.filter(x=>x>100).length,longTasks:window.__long};});
const counts=new Map();const nodes=new Map(profile.nodes.map(n=>[n.id,n]));for(const id of profile.samples??[]){const f=nodes.get(id)?.callFrame;if(f){const key=f.functionName||'(anonymous)';counts.set(key,(counts.get(key)||0)+1);}}
const gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return gl&&ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';});
const summary={tag,radius,gpu,metrics,hotspots:[...counts].sort((a,b)=>b[1]-a[1]).slice(0,35)};
fs.writeFileSync(path.resolve('../../work/'+tag+'-cpu.json'),JSON.stringify(profile));fs.writeFileSync(path.resolve('../../outputs/'+tag+'-performance.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save & return to menu',exact:true}).click({timeout:120000});await page.getByRole('heading',{name:'BIOME',exact:true}).waitFor();
}finally{await app.close();}
