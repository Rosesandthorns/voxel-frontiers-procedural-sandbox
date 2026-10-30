import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{_electron}=require('playwright');
const app=await _electron.launch({executablePath:process.env.VOXEL_TEST_EXE||require('electron'),args:process.env.VOXEL_TEST_EXE?[]:['.'],env:{...process.env,VOXEL_USER_DATA:path.resolve('../../work/accounts-smoke-'+Date.now())}});
try {
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());
 const page=await app.firstWindow();
 await page.getByRole('button',{name:'Account',exact:true}).click();
 await page.getByRole('heading',{name:'Your account',exact:true}).waitFor();
 await page.getByRole('button',{name:'Continue with Discord',exact:true}).waitFor();
 assert.equal(await page.getByRole('alert').count(),0);
 const state=await page.evaluate(()=>window.desktop.account('status'));
 assert.equal(state,null);
 assert.equal(await page.evaluate(()=>typeof window.desktop.account),'function');
 await page.screenshot({path:'../../outputs/biome-account-menu.png'});
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByRole('button',{name:'New world',exact:true}).waitFor();
 console.log('Packaged account screen, unsigned-in status, IPC bridge and offline world menu passed.');
}finally{await app.close();}
