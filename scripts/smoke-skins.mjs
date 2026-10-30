import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{_electron}=require('playwright');
const profile=path.resolve('../../work/skin-smoke-'+Date.now());
const app=await _electron.launch({executablePath:process.env.VOXEL_TEST_EXE||require('electron'),args:process.env.VOXEL_TEST_EXE?[]:['.'],env:{...process.env,VOXEL_USER_DATA:profile}});
try{
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());const page=await app.firstWindow();
 await page.getByRole('button',{name:'Character',exact:true}).click();await page.getByRole('heading',{name:'Your character',exact:true}).waitFor();
 const href=await page.getByRole('link',{name:'Download skin template',exact:true}).getAttribute('href');
 const template=path.join(profile,'template.png');fs.writeFileSync(template,Buffer.from(href.split(',')[1],'base64'));
 assert.equal(fs.readFileSync(template).readUInt32BE(16),128);
 await page.getByLabel('Choose skin',{exact:true}).setInputFiles(template);
 await page.waitForFunction(()=>!document.body.textContent.includes('Saving skin'));
 const deadline=Date.now()+5000;while(!fs.existsSync(path.join(profile,'player-skin.png'))&&Date.now()<deadline)await page.waitForTimeout(100);
 assert.ok(fs.existsSync(path.join(profile,'player-skin.png')));
 assert.equal(await page.getByRole('alert').count(),0);
 await page.screenshot({path:'../../outputs/biome-character.png'});
 const invalid=path.join(profile,'invalid.png');fs.writeFileSync(invalid,Buffer.from('not a PNG'));
 await page.getByLabel('Choose skin',{exact:true}).setInputFiles(invalid);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/PNG/);
 await page.getByRole('button',{name:'Use default skin',exact:true}).click();
 await page.waitForTimeout(200);assert.equal(fs.existsSync(path.join(profile,'player-skin.png')),false);
 await assert.rejects(page.evaluate(()=>window.desktop.skin('write','data:image/png;base64,bm90IGEgcG5n')));
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'New world',exact:true}).waitFor();
 console.log('Native skin import, PNG validation, local persistence, preview and reset passed.');
}finally{await app.close();}
