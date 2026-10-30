const cp=require('node:child_process'),spawn=cp.spawn;
cp.spawn=function(exe,args,options){if(options?.env?.ELECTRON_RUN_AS_NODE==='1'){const value=JSON.parse(args[1]);value.args.push('--remote-debugging-port=0');args=[args[0],JSON.stringify(value)];}return spawn.call(this,exe,args,options);};
require('../desktop/main.cjs');
