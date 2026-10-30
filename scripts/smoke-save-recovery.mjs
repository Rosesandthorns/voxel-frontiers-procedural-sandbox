import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{_electron}=require('playwright');
const profile=path.resolve('../../work/save-fault-'+Date.now());
const app=await _electron.launch({executablePath:process.env.VOXEL_TEST_EXE||require('electron'),args:process.env.VOXEL_TEST_EXE?[]:['.'],env:{...process.env,VOXEL_USER_DATA:profile}});
let blocker;
try{
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());
 const page=await app.firstWindow();await page.getByRole('button',{name:'New world',exact:true}).click();await page.getByLabel('World name',{exact:true}).fill('Save recovery test');await page.getByRole('button',{name:'Create & play',exact:true}).click();await page.getByRole('button',{name:'Enter world',exact:true}).click({timeout:120000});
 await page.waitForTimeout(600);await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Paused',exact:true}).waitFor();
 const saveFolder=path.join(profile,'saves');const save=fs.readdirSync(saveFolder).filter(f=>f.endsWith('.json')).find(f=>JSON.parse(fs.readFileSync(path.join(saveFolder,f),'utf8')).name==='Save recovery test');assert.ok(save);
 blocker=path.join(saveFolder,save+'.tmp');assert.ok(blocker.startsWith(profile+path.sep));fs.mkdirSync(blocker);
 const savePath=path.join(saveFolder,save);const before=fs.statSync(savePath).mtimeMs;
 await page.waitForTimeout(31500);
 assert.equal(await page.getByRole('alert').count(),0);
 assert.equal(await page.getByRole('button',{name:'Retry save',exact:true}).count(),0);
 assert.equal(fs.statSync(savePath).mtimeMs,before);
 assert.ok(fs.existsSync(path.join(saveFolder,'save-errors.log')),'Native save failure was exercised');
 fs.rmdirSync(blocker);blocker=undefined;
 await page.waitForFunction(()=>true);
 const deadline=Date.now()+10000;
 while(fs.statSync(savePath).mtimeMs===before && Date.now()<deadline) await page.waitForTimeout(250);
 assert.ok(fs.statSync(savePath).mtimeMs>before,'Autosave retried automatically');
 assert.equal(await page.getByRole('alert').count(),0);
 await page.getByRole('button',{name:'Save & return to menu',exact:true}).click();await page.getByRole('heading',{name:'BIOME',exact:true}).waitFor();
 console.log('Native autosave failure stayed silent and recovered automatically within five seconds.');
}finally{if(blocker)fs.rmdirSync(blocker);await app.close();}
