// Run with Electron's Node mode so every native helper of the old game exits first.
const {spawn}=require('node:child_process');
const options=JSON.parse(process.argv[2]);
const deadline=Date.now()+30000;
const timer=setInterval(()=>{
 let alive=true;try{process.kill(options.parent,0);}catch{alive=false;}
 if(alive){if(Date.now()>deadline){clearInterval(timer);process.exitCode=1;}return;}
 clearInterval(timer);const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(options.exe,options.args,{cwd:options.cwd,env,detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>process.exitCode=1);child.unref();
},100);
