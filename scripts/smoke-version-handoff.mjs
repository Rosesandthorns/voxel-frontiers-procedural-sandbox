import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire}from'node:module';const require=createRequire(import.meta.url),{_electron,chromium}=require('playwright');
for(const version of (process.env.BIOME_HANDOFF_VERSIONS||'0.3.0,0.3.1,0.3.2').split(',')){
 const profile=path.resolve('../../work/switch-'+version+'-'+Date.now()),target=path.join(profile,'versions',version);fs.mkdirSync(path.join(profile,'saves'),{recursive:true});fs.writeFileSync(path.join(profile,'saves','keep.txt'),'preserved');fs.cpSync(path.resolve('release',version,'win-unpacked'),target,{recursive:true});fs.writeFileSync(path.join(target,'.biome-verified.json'),JSON.stringify({version}));
 const app=await _electron.launch({executablePath:require('electron'),args:['scripts/harness-handoff.cjs'],env:{...process.env,VOXEL_USER_DATA:profile}});let browser;
 try{const page=await app.firstWindow();await page.waitForFunction(()=>!!window.desktop);
 // Keep a debug port only in this isolated test so the replacement can be inspected.

 await page.evaluate(v=>window.desktop.online('versions-launch',v),version).catch(e=>{if(!/closed|destroyed/i.test(e.message))throw e;});
 for(let i=0;i<180&&!browser;i++){try{const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1000});}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.ok(browser,'Replacement starts '+version);const next=browser.contexts()[0].pages()[0];await next.waitForFunction(()=>!!window.desktop);const data=await next.evaluate(()=>window.desktop.online('versions-list'));assert.equal(data.current,version);assert.equal(fs.readFileSync(path.join(profile,'saves','keep.txt'),'utf8'),'preserved');console.log('Real packaged handoff passed: '+version+'; label: '+await next.locator('.menu-edition').innerText());await next.evaluate(()=>window.desktop.action('quit')).catch(()=>{});
 }finally{await browser?.close().catch(()=>{});await app.close().catch(()=>{});}
}

