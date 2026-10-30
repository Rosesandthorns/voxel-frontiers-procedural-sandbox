import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire}from'node:module';
const require=createRequire(import.meta.url),{createVersions}=require('../desktop/versions.cjs'),previous=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'biome-version-locks-')),folder=path.join(root,'versions');
function installed(v){const dir=path.join(folder,v);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'.biome-verified.json'),'{}');fs.writeFileSync(path.join(dir,'Biome.exe'),'fixture executable');return dir;}
try{
 const old=installed('0.2.10'),versions=createVersions({folder,current:'0.3.1',launch:async()=>{}});
 process.chdir(old);await versions.remove('0.2.10');assert.equal(process.cwd(),root,'Deleting an inherited working directory first releases the launcher lock');assert.equal(fs.existsSync(old),false);
 const locked=installed('0.3.0'),rename=fs.promises.rename;
 fs.promises.rename=async(from,to)=>{if(from===locked)throw Object.assign(new Error('busy'),{code:'EBUSY'});return rename(from,to);};
 try{await assert.rejects(()=>versions.remove('0.3.0'),/still in use/);}finally{fs.promises.rename=rename;}
 assert.equal(fs.readFileSync(path.join(locked,'Biome.exe'),'utf8'),'fixture executable','A locked deletion never removes files first');assert.ok(fs.existsSync(path.join(locked,'.biome-verified.json')));
 await versions.remove('0.3.0');assert.equal(fs.existsSync(locked),false);
 const pending=installed('0.2.9'),remove=fs.promises.rm;
 fs.promises.rm=async(target,options)=>{if(path.basename(target).startsWith('.remove-0.2.9-'))throw Object.assign(new Error('scanner lock'),{code:'EBUSY'});return remove(target,options);};
 try{assert.equal((await versions.remove('0.2.9')).pendingCleanup,true);}finally{fs.promises.rm=remove;}
 assert.equal(fs.existsSync(pending),false);assert.equal(versions.installed().length,0);createVersions({folder,current:'0.3.1'});await new Promise(r=>setTimeout(r,100));assert.equal(fs.readdirSync(folder).filter(n=>n.startsWith('.remove-')).length,0);
 console.log('Inherited Windows working-directory release, intact files on lock failure, deferred cleanup and next-launch recovery passed.');
}finally{process.chdir(previous);fs.rmSync(root,{recursive:true,force:true});}
