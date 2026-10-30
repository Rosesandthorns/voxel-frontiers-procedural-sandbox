const {app,safeStorage}=require('electron');const path=require('node:path');const fs=require('node:fs');const crypto=require('node:crypto');
const profile=process.env.BIOME_AUTH_TEST_PROFILE;
const report=message=>{fs.writeFileSync(path.join(profile,'result.txt'),message);console.log(message);};
app.setPath('userData',profile);
app.whenReady().then(async()=>{
 let eos;
 try{
  const key='sb-bbcemiampedeyskxprlx-auth-token';const file=path.join(profile,'account',crypto.createHash('sha256').update(key).digest('hex')+'.bin');
  if(!fs.existsSync(file)){report('No saved session available for live EOS verification.');return;}
  const session=JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));
  if(!session.access_token||session.expires_at*1000<Date.now()+30000){report('Saved session is expired; live EOS verification needs a fresh sign-in.');return;}
  eos=require('../desktop/eos-native.cjs').createEOS(require('../.env.eos.json'),{diagnostics:true,debug:message=>fs.appendFileSync(path.join(profile,'native-steps.txt'),message+'\n')});
  const user=await eos.login(session.access_token);if(!user)throw new Error('No EOS identity returned');
  const code=await eos.host(2);if(!code)throw new Error('No lobby returned');
  report('Live Biome identity authenticated by EOS; relay-only private lobby creation succeeded.');
  await eos.leave();
 }catch(error){report('Live EOS verification: '+error.message);process.exitCode=1;}
 finally{eos?.close();app.quit();}
});
