import {build} from 'esbuild';
const result=await build({entryPoints:['scripts/test-world-state.ts'],bundle:true,platform:'node',format:'esm',write:false,loader:{'.mp3':'empty'}});
try{await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}catch(error){console.error(error.name+': '+error.message);process.exitCode=1;}
