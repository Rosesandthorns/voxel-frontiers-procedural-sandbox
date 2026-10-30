import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { decodeRuns } from '../src/game/voxel/ChunkStore';
import { BlockType } from '../src/types';
const require=createRequire(import.meta.url);const {_electron}=require('playwright');
const profile=path.resolve('../../work/biome-upgrade-'+Date.now());fs.mkdirSync(path.join(profile,'saves'),{recursive:true});
const metadata=path.join(profile,'saves','upgrade.json');
fs.writeFileSync(metadata,JSON.stringify({name:'Legacy camp',id:'upgrade',seed:321,generationVersion:1,timestamp:Date.now(),hotbar:Array.from({length:9},()=>({item:null,count:0})),inventory:Array.from({length:27},()=>({item:null,count:0})),health:20,stamina:100,coords:{x:8.5,y:0,z:8.5},modifiedBlocks:[['9,149,9',BlockType.OAK_WOOD]],settings:{renderDistance:2}}));
const start=async()=>{const app=await _electron.launch({executablePath:process.env.VOXEL_TEST_EXE||require('electron'),args:process.env.VOXEL_TEST_EXE?['--disable-gpu']:['.','--disable-gpu'],env:{...process.env,VOXEL_USER_DATA:profile}});await app.evaluate(({BrowserWindow}: any)=>BrowserWindow.getAllWindows()[0].focus());return app;};
async function playSave(app:any){const page=await app.firstWindow();await page.getByRole('button',{name:'Play Legacy camp',exact:true}).click();await page.getByRole('button',{name:'Enter world',exact:true}).click({timeout:120000});await page.waitForTimeout(600);await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save & return to menu',exact:true}).click();await page.getByRole('heading',{name:'BIOME',exact:true}).waitFor();}
let app=await start();try{await playSave(app);}finally{await app.close();}
const oldChunk=path.join(profile,'saves/chunks/upgrade/0,0.json');const oldData=fs.readFileSync(oldChunk,'utf8');const old=JSON.parse(oldData);assert.equal(old.generation,1);const blocks=new Uint16Array(16*160*16);decodeRuns(old.blocks,blocks);assert.equal(blocks[9+9*16+149*256],BlockType.OAK_WOOD);
const state=JSON.parse(fs.readFileSync(metadata,'utf8'));assert.equal(state.generationVersion,5);assert.equal(state.chunkVersions['0,0'],1);state.coords={x:1000.5,y:154,z:0.5};fs.writeFileSync(metadata,JSON.stringify(state));
app=await start();try{await playSave(app);}finally{await app.close();}
assert.equal(fs.readFileSync(oldChunk,'utf8'),oldData,'An old explored chunk was overwritten');const fresh=JSON.parse(fs.readFileSync(path.join(profile,'saves/chunks/upgrade/62,0.json'),'utf8'));assert.equal(fresh.generation,5);
console.log('Legacy upgrade: original chunks and player edits preserved; unexplored chunks use generation 5.');
