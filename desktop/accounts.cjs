const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const CALLBACK = 'http://127.0.0.1:43821/auth/callback';

function encryptedStorage(folder, safeStorage) {
  const fileFor = key => path.join(folder, crypto.createHash('sha256').update(key).digest('hex') + '.bin');
  return {
    getItem(key) {
      try { return safeStorage.decryptString(fs.readFileSync(fileFor(key))); }
      catch (error) { if (error.code === 'ENOENT') return null; throw new Error('Saved sign-in could not be unlocked.'); }
    },
    setItem(key, value) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential encryption is unavailable.');
      fs.mkdirSync(folder, {recursive:true});
      const file = fileFor(key);
      fs.writeFileSync(file + '.tmp', safeStorage.encryptString(value));
      fs.renameSync(file + '.tmp', file);
    },
    removeItem(key) { fs.rmSync(fileFor(key), {force:true}); }
  };
}

function createAccounts({client, openExternal, focus = () => {}, port = 43821, timeout = 180000}) {
  let cancelLogin = null;
  let busy = false;
  async function profile(user) {
    const {data, error} = await client.from('biome_profiles').select('username').eq('id',user.id).maybeSingle();
    if (error) throw new Error('Could not load your Biome profile. Check your connection and retry.');
    return {id:user.id, username:data?.username ?? null};
  }
  async function currentUser() {
    const {data, error} = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw new Error('Sign-in could not be verified. Check your connection and retry.');
    return data?.user ?? null;
  }
  async function status() {
    const user = await currentUser();
    return user ? profile(user) : null;
  }
  async function login() {
    if (busy) throw new Error('Another account action is in progress.');
    busy = true;
    let server, timer;
    try {
      let resolveCode, rejectCode;
      const codeReady = new Promise((resolve,reject) => {resolveCode=resolve;rejectCode=reject;});
      // Install the handler immediately so cancellation during browser launch cannot be unhandled.
      codeReady.catch(()=>{});
      cancelLogin = () => rejectCode(new Error('Sign-in cancelled.'));
      let consumed = false;
      server = http.createServer((req,res) => {
        const url = new URL(req.url,'http://127.0.0.1');
        res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
        res.setHeader('Cache-Control','no-store');
        res.setHeader('Referrer-Policy','no-referrer');
        if (req.method !== 'GET' || url.pathname !== '/auth/callback' || consumed) {res.writeHead(404);res.end();return;}
        const code = url.searchParams.get('code');
        if (!code || code.length > 2048) {
          res.writeHead(400);res.end('Sign-in was not completed. Return to Biome and try again.');
          if(url.searchParams.has('error'))rejectCode(new Error('Discord sign-in was declined or expired.'));
          return;
        }
        consumed = true;
        res.setHeader('Content-Type','text/html; charset=utf-8');
        res.end('<!doctype html><title>Biome sign-in</title><body style="background:#17251f;color:#eee9dc;font:18px system-ui;padding:60px"><h1>Return to Biome</h1><p>Biome is completing your sign-in. You can close this tab.</p></body>');
        resolveCode(code);
      });
      await new Promise((resolve,reject) => {server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
      const {data,error} = await client.auth.signInWithOAuth({provider:'discord',options:{redirectTo:CALLBACK,skipBrowserRedirect:true}});
      if(error || !data?.url)throw new Error('Could not start Discord sign-in.');
      const target = new URL(data.url);
      // Only the configured Supabase service can be opened; never accept a renderer-supplied URL.
      if(target.origin !== 'https://bbcemiampedeyskxprlx.supabase.co' || target.pathname !== '/auth/v1/authorize')throw new Error('Unexpected sign-in destination.');
      timer=setTimeout(()=>rejectCode(new Error('Sign-in timed out. Please try again.')),timeout);
      await openExternal(target.href);
      const code=await codeReady;
      const result=await client.auth.exchangeCodeForSession(code);
      if(result.error)throw new Error('Sign-in expired or could not be verified. Please try again.');
      focus();
      return await status();
    } catch(error) {
      if(error.code === 'EADDRINUSE')throw new Error('The sign-in port is busy. Close another Biome instance and retry.');
      throw error;
    } finally {
      clearTimeout(timer);cancelLogin=null;busy=false;
      if(server){server.closeAllConnections();server.close();}
    }
  }
  async function claim(username) {
    if(typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username))throw new Error('Use 3–20 letters, numbers, or underscores.');
    if(busy)throw new Error('Another account action is in progress.');
    busy=true;
    try {
      const user=await currentUser();if(!user)throw new Error('Sign in before choosing a username.');
      const {data:existing,error:readError}=await client.from('biome_profiles').select('username').eq('id',user.id).maybeSingle();
      if(readError)throw new Error('Could not load your profile. Try again.');
      const table=client.from('biome_profiles');
      const {error}=existing ? await table.update({username}).eq('id',user.id) : await table.insert({id:user.id,username});
      if(error?.code==='23505')throw new Error('That username is already taken. Try another.');
      if(error)throw new Error('Could not save your username. Try again.');
      return profile(user);
    } finally {busy=false;}
  }
  async function signout() {
    if(busy)throw new Error('Cancel the current account action first.');
    busy=true;
    try {const {error}=await client.auth.signOut({scope:'local'});if(error)throw new Error('Could not sign out. Check your connection and retry.');}
    finally {busy=false;}
  }
  async function identity(){const user=await currentUser();if(!user)return null;const value=await profile(user);const session=await client.auth.getSession();if(session.error||!session.data.session)throw new Error('Sign in again.');return {...value,token:session.data.session.access_token};}
  return {status,login,claim,signout,identity,cancel:()=>{cancelLogin?.();},close:()=>{cancelLogin?.();client.auth.stopAutoRefresh();}};
}
module.exports = {createAccounts, encryptedStorage, CALLBACK};
