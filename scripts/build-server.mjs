import {build} from 'esbuild';import fs from 'node:fs';import crypto from 'node:crypto';
fs.mkdirSync('server-dist',{recursive:true});
const worker=await build({entryPoints:['desktop/server-world-worker.cjs'],bundle:true,platform:'node',target:'node22',format:'cjs',write:false,minify:true});
await build({entryPoints:['desktop/server.cjs'],bundle:true,platform:'node',target:'node22',format:'cjs',outfile:'server-dist/biome-server.cjs',minify:true,banner:{js:'globalThis.__biomeWorldWorkerCode='+JSON.stringify(worker.outputFiles[0].text)+';'}});
const file=fs.readFileSync('server-dist/biome-server.cjs');fs.writeFileSync('server-dist/biome-server.cjs.sha256',crypto.createHash('sha256').update(file).digest('hex')+'  biome-server.cjs\n');
console.log('Standalone dedicated server bundle built.');
