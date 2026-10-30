const fs=require('node:fs');const {shell}=require('electron');shell.openExternal=async url=>{fs.writeFileSync(process.env.BIOME_AUTH_URL_FILE,url);};require('../desktop/main.cjs');
