const { app, BrowserWindow, Menu, protocol, net, ipcMain, shell, safeStorage, nativeImage } = require('electron');
const fs = require('node:fs');
const {encodeRuns,decodeRuns,unpackSnapshot,packPayload}=require('./chunk-codec.cjs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
app.setName('Biome');
if (process.env.VOXEL_USER_DATA) app.setPath('userData', path.resolve(process.env.VOXEL_USER_DATA));
protocol.registerSchemesAsPrivileged([{ scheme: 'voxel', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let win;
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(() => {
  const updateDesktopEntry=file=>{if(process.platform==='win32'&&app.isPackaged&&!process.env.VOXEL_USER_DATA){try{shell.writeShortcutLink(path.join(app.getPath('desktop'),'Biome.lnk'),'update',{target:file||process.execPath,cwd:path.dirname(file||process.execPath),description:'Play Biome',icon:file||process.execPath,iconIndex:0})||shell.writeShortcutLink(path.join(app.getPath('desktop'),'Biome.lnk'),'create',{target:file||process.execPath,cwd:path.dirname(file||process.execPath),description:'Play Biome',icon:file||process.execPath,iconIndex:0});}catch(error){console.error('Could not update Biome desktop shortcut:',error.message);}}};
  const startupVersions=require('./versions.cjs').createVersions({folder:path.join(app.getPath('userData'),'versions'),current:require('../package.json').version});
  const selectedExecutable=startupVersions.startup();
  if(app.isPackaged&&selectedExecutable){updateDesktopEntry(selectedExecutable);app.relaunch({execPath:selectedExecutable,args:[]});app.quit();return;}
  updateDesktopEntry();
  const root = path.resolve(__dirname, '../dist');
  const saves = path.join(app.getPath('userData'), 'saves');
  let lastErrorLog=0;
  const logSaveFailure=(error,operation)=>{
    if(Date.now()-lastErrorLog<1000)return;
    lastErrorLog=Date.now();
    const line=JSON.stringify({time:new Date().toISOString(),operation,code:error.code,message:error.message})+'\n';
    fs.appendFile(path.join(saves,'save-errors.log'),line,()=>{});
  };

  fs.mkdirSync(saves, { recursive: true });
  const legacy = path.join(app.getPath('appData'), 'Voxel Frontiers', 'saves', 'world.json');
  const localLegacy = path.join(saves, 'world.json');
  const migration = path.join(saves, '.legacy-imported');
  if (!fs.existsSync(migration)) {
    const source = fs.existsSync(localLegacy) ? localLegacy : legacy;
    if (fs.existsSync(source) && !fs.existsSync(path.join(saves, 'legacy.json'))) fs.copyFileSync(source, path.join(saves, 'legacy.json'));
    fs.writeFileSync(migration, '1');
  }
  protocol.handle('voxel', request => {
    const url = new URL(request.url);
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (url.host !== 'game' || !file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  let online;
  const chunkEpochs=new Map();
  const deletedWorlds=new Set();
  let writeEpoch=0;
  ipcMain.on('save-store', (event, action, data, id = 'legacy') => {
    if (event.sender !== win?.webContents || !event.senderFrame?.url.startsWith('voxel://game/')) { event.returnValue = { error: 'Forbidden' }; return; }
    try {
      if (action === 'list') { event.returnValue = { value: JSON.stringify(fs.readdirSync(saves).filter(f => /^[a-zA-Z0-9-]+\.json$/.test(f) && f !== 'world.json').map(f => f.slice(0, -5))) }; return; }
      if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error('Invalid world id');
      const save = path.join(saves, id + '.json');
      const chunkDir = path.join(saves, 'chunks', id);
      if (action === 'chunkList') { event.returnValue = { value: JSON.stringify(fs.existsSync(chunkDir) ? fs.readdirSync(chunkDir).filter(f => /^-?\d+,-?\d+\.json$/.test(f)).map(f => f.slice(0,-5)) : []) }; return; }
      if (action === 'chunkRead' || action === 'chunkWrite') {
        const packet = action === 'chunkRead' ? { key: data } : JSON.parse(data);
        if (typeof packet.key !== 'string' || !/^-?\d+,-?\d+$/.test(packet.key)) throw new Error('Invalid chunk');
        const chunkFile = path.join(chunkDir, packet.key + '.json');
        if (action === 'chunkRead') { event.returnValue = { value: fs.existsSync(chunkFile) ? fs.readFileSync(chunkFile, 'utf8') : null }; return; }
        const payload = JSON.stringify(packet.value);
        if (Buffer.byteLength(payload) > 2 * 1024 * 1024) throw new Error('Chunk too large');
        fs.mkdirSync(chunkDir, { recursive: true });
        chunkEpochs.set(chunkFile,++writeEpoch);
        fs.writeFileSync(chunkFile + '.tmp', payload, 'utf8'); fs.renameSync(chunkFile + '.tmp', chunkFile);
        event.returnValue = { value: true }; return;
      }
      if (action === 'read') event.returnValue = { value: fs.existsSync(save) ? fs.readFileSync(save, 'utf8') : null };
      else if (action === 'write') {
        if (typeof data !== 'string' || Buffer.byteLength(data) > 32 * 1024 * 1024) throw new Error('Save too large');
        JSON.parse(data);
        fs.writeFileSync(save + '.tmp', data, 'utf8');
        fs.renameSync(save + '.tmp', save);
        event.returnValue = { value: true };
      } else if (action === 'clear') { deletedWorlds.add(id); fs.rmSync(save, { force: true }); fs.rmSync(chunkDir, { recursive: true, force: true }); event.returnValue = { value: true }; }
      else event.returnValue = { error: 'Unknown action' };
    } catch (error) {logSaveFailure(error,action); event.returnValue = { error: error.message, code: error.code }; }
  });
  ipcMain.handle('chunk-store-async', async (event, action, data, id) => {
    if(event.sender!==win?.webContents || !event.senderFrame?.url.startsWith('voxel://game/')) throw new Error('Forbidden');
    if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id)||typeof data?.key!=='string'||! /^-?\d+,-?\d+$/.test(data.key)) throw new Error('Invalid world/chunk id');
    if(deletedWorlds.has(id))throw new Error('World deleted');
    const folder=path.join(saves,'chunks',id), file=path.join(folder,data.key+'.json');
    if(action==='read') {
      if(online?.status().mode==='guest'&&online.status().worldId===id){const value=await online.chunk(...data.key.split(',').map(Number));return unpackSnapshot(value);}
      const value=JSON.parse(await fs.promises.readFile(file,'utf8'));
      return unpackSnapshot(value);
    }
    if(action!=='write'||!(data.value?.voxels instanceof Uint16Array)||data.value.voxels.length%4096!==0||data.value.voxels.length>16777216||!(data.value?.waterValues instanceof Uint8Array)||data.value.waterValues.length!==data.value.voxels.length)throw new Error('Invalid chunk payload');
    const epoch=++writeEpoch;chunkEpochs.set(file,epoch);
    const {voxels,waterValues,...header}=data.value;
    const payload=JSON.stringify(packPayload(data.value));
    const temporary=file+'.'+epoch+'.tmp';
    try {
      await fs.promises.mkdir(folder,{recursive:true});
      await fs.promises.writeFile(temporary,payload,'utf8');
      // Commit in this event-loop turn so an older async write cannot replace a newer synchronous checkpoint.
      if(!deletedWorlds.has(id) && chunkEpochs.get(file)===epoch) fs.renameSync(temporary,file);
      else await fs.promises.rm(temporary,{force:true});
      return true;
    } catch(error) {logSaveFailure(error,'chunkWrite');await fs.promises.rm(temporary,{force:true}).catch(()=>{});throw error;}
  });
  ipcMain.handle('desktop-action', (event, action) => {
    if (event.sender !== win?.webContents || !event.senderFrame?.url.startsWith('voxel://game/')) return;
    if (action === 'saves') return shell.openPath(saves);
    if (action === 'fullscreen') win.setFullScreen(!win.isFullScreen());
    if (action === 'quit') app.quit();
  });
  const skinFile=path.join(app.getPath('userData'),'player-skin.png');
  ipcMain.handle('biome-skin',async(event,action,data)=>{
    if(event.sender!==win?.webContents || event.senderFrame!==win.webContents.mainFrame || !event.senderFrame.url.startsWith('voxel://game/'))throw new Error('Forbidden');
    if(action==='read')return fs.existsSync(skinFile)?'data:image/png;base64,'+(await fs.promises.readFile(skinFile)).toString('base64'):null;
    if(action==='reset'){await fs.promises.rm(skinFile,{force:true});return null;}
    if(action!=='write'||typeof data!=='string'||data.length>512*1024||!data.startsWith('data:image/png;base64,'))throw new Error('Invalid skin');
    const image=nativeImage.createFromBuffer(Buffer.from(data.slice(22),'base64'));
    const size=image.getSize();if(image.isEmpty()||size.width!==128||size.height!==128)throw new Error('Skin must be 128 x 128');
    await fs.promises.writeFile(skinFile+'.tmp',image.toPNG());await fs.promises.rename(skinFile+'.tmp',skinFile);return null;
  });
  const {createClient}=require('@supabase/supabase-js');
  const {createAccounts,encryptedStorage}=require('./accounts.cjs');
  const accountConfig=require('./account-config.json');
  const accountClient=createClient(accountConfig.url,accountConfig.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true,storage:encryptedStorage(path.join(app.getPath('userData'),'account'),safeStorage)}});
  const accounts=createAccounts({client:accountClient,openExternal:url=>shell.openExternal(url),focus:()=>{win?.show();win?.focus();}});
  const {createFriends}=require('./friends.cjs');
  const friends=createFriends(accountClient,accounts.identity);
  const {createOnline}=require('./online.cjs');
  const {probe}=require('./server-wire.cjs');
  const {createServerDriver}=require('./server-driver.cjs');
  const {createEOS}=require('./eos-native.cjs');
  const configFile=app.isPackaged?path.join(process.resourcesPath,'eos-config.json'):path.join(__dirname,'../.env.eos.json');
  const eosConfig=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):null;
  online=createOnline({serverDriverFactory:createServerDriver,joinTicket:async fingerprint=>{if(typeof fingerprint!=='string'||!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint))throw new Error('Invalid server fingerprint');if(!await accounts.identity())throw new Error('Sign in before joining a server.');const ticket=require('node:crypto').randomBytes(32).toString('hex');const {error}=await accountClient.rpc('biome_create_server_ticket',{ticket_hash:require('node:crypto').createHash('sha256').update(ticket).digest('hex'),server_fingerprint:fingerprint});if(error)throw new Error(error.code==='P0001'?error.message:'Could not create a secure join ticket. Check your sign-in and connection, then try again.');return ticket;},config:eosConfig,saves,identity:accounts.identity,friends,resolveProfile:async id=>{const {data,error}=await accountClient.from('biome_profiles').select('username').eq('id',id).maybeSingle();if(error)throw error;return data;},readSkin:()=>fs.existsSync(skinFile)?'data:image/png;base64,'+fs.readFileSync(skinFile).toString('base64'):null,driverFactory:config=>{if(!config)throw new Error('Online services are not configured in this build.');return createEOS(config,{dllPath:app.isPackaged?path.join(process.resourcesPath,'EOSSDK-Win64-Shipping.dll'):path.join(__dirname,'native','EOSSDK-Win64-Shipping.dll')});}});
  const versions=require('./versions.cjs').createVersions({folder:path.join(app.getPath('userData'),'versions'),saves,current:require('../package.json').version,onSelection:updateDesktopEntry,launch:async file=>{app.relaunch({execPath:file,args:[]});app.quit();}});
  app.on('before-quit',()=>{online.close();accounts.close();});
  ipcMain.handle('biome-online',async(event,action,data)=>{
    if(event.sender!==win?.webContents||event.senderFrame!==win.webContents.mainFrame||!event.senderFrame.url.startsWith('voxel://game/'))throw new Error('Forbidden');
    try{if(action==='versions-cancel'){versions.cancel();return {value:true};}if(action==='versions-status')return {value:versions.status()};if(action==='versions-list'){const installed=versions.installed();try{return {value:{releases:await versions.list(),installed,current:versions.current}};}catch(error){return {value:{releases:[],installed,current:versions.current,error:error.message}};}}if(action==='versions-install')return {value:await versions.install(data)};if(action==='versions-remove')return {value:await versions.remove(data)};if(action==='versions-launch')return {value:await versions.run(data)};if(action==='server-probe')return {value:await probe(data)};return {value:await online.command(action,data)};}catch(error){return {error:error.message||'Online request failed.'};}
  });
  ipcMain.handle('biome-friends',async(event,action,data)=>{
    if(event.sender!==win?.webContents||event.senderFrame!==win.webContents.mainFrame||!event.senderFrame.url.startsWith('voxel://game/'))throw new Error('Forbidden');
    if(!['list','request','accept','remove','invite'].includes(action))throw new Error('Unknown friends action');
    try{if(action==='invite'&&online.status().mode!=='host')throw new Error('Open a multiplayer world before inviting a friend.');return {value:await friends[action](data)};}catch(error){return {error:error.message||'Friends request failed.'};}
  });
  ipcMain.handle('biome-account',async(event,action,value)=>{
    if(event.sender!==win?.webContents || event.senderFrame!==win.webContents.mainFrame || !event.senderFrame.url.startsWith('voxel://game/'))throw new Error('Forbidden');
    if(!['status','login','claim','signout','cancel'].includes(action))throw new Error('Unknown account action');
    try {return {value:await accounts[action](value)};}
    catch(error){return {error:error.message || 'Account request failed. Please retry.'};}
  });
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ title: 'Biome', icon: path.join(__dirname, 'icon.png'), width: 1280, height: 800, minWidth: 800, minHeight: 600, backgroundColor: '#171c18', webPreferences: { backgroundThrottling: false, preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('voxel://game/')) event.preventDefault(); });
  win.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(contents === win.webContents && permission === 'pointerLock'));
  win.loadURL('voxel://game/index.html');
});
app.on('window-all-closed', () => app.quit());
