import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {createAccounts}=require('../desktop/accounts.cjs');
let user=null, stored=null, duplicate=false, exchanged=false, cancelled=false;
const client={
 auth:{
  getUser:async()=>({data:{user},error:user?null:{name:'AuthSessionMissingError'}}),
  signInWithOAuth:async options=>{assert.equal(options.provider,'discord');assert.equal(options.options.skipBrowserRedirect,true);return {data:{url:'https://bbcemiampedeyskxprlx.supabase.co/auth/v1/authorize?provider=discord'}};},
  exchangeCodeForSession:async code=>{assert.equal(code,'test-code');exchanged=true;user={id:'permanent-id'};return {error:null};},
  signOut:async()=>{user=null;return {error:null};},stopAutoRefresh:()=>{}
 },
 from:table=>{assert.equal(table,'biome_profiles');return {
  select:()=>({eq:(field,id)=>{assert.equal(field,'id');assert.equal(id,'permanent-id');return {maybeSingle:async()=>({data:stored,error:null})};}}),
  insert:async record=>{assert.equal(record.id,'permanent-id');if(duplicate)return {error:{code:'23505'}};stored={username:record.username};return {error:null};},
  update:record=>({eq:async(field,id)=>{assert.equal(id,'permanent-id');stored=record;return {error:null};}})
 };}
};
const accounts=createAccounts({client,port:43822,openExternal:async url=>{
 assert.ok(url.startsWith('https://bbcemiampedeyskxprlx.supabase.co/'));
 assert.equal((await fetch('http://127.0.0.1:43822/unrelated')).status,404);
 assert.equal((await fetch('http://127.0.0.1:43822/auth/callback')).status,400);
 const response=await fetch('http://127.0.0.1:43822/auth/callback?code=test-code');
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.status,200);
}});
assert.equal(await accounts.status(),null);
assert.deepEqual(await accounts.login(),{id:'permanent-id',username:null});assert.ok(exchanged);
await assert.rejects(accounts.claim('bad name'),/letters/);
duplicate=true;await assert.rejects(accounts.claim('Wolf'),/already taken/);duplicate=false;
assert.deepEqual(await accounts.claim('Wolf'),{id:'permanent-id',username:'Wolf'});
assert.deepEqual(await accounts.claim('Thorns'),{id:'permanent-id',username:'Thorns'});
await accounts.signout();assert.equal(await accounts.status(),null);
await assert.rejects(accounts.claim('Wolf'),/Sign in/);
const cancel=createAccounts({client,port:43822,openExternal:async()=>{cancel.cancel();cancelled=true;}});
await assert.rejects(cancel.login(),/cancelled/);assert.ok(cancelled);
const timeout=createAccounts({client,port:43822,timeout:20,openExternal:async()=>{}});
await assert.rejects(timeout.login(),/timed out/);
const occupied=http.createServer();await new Promise(resolve=>occupied.listen(43822,'127.0.0.1',resolve));
await assert.rejects(accounts.login(),/port is busy/);await new Promise(resolve=>occupied.close(resolve));
const unsafe={...client,auth:{...client.auth,signInWithOAuth:async()=>({data:{url:'https://example.com/steal'}})}};
const invalid=createAccounts({client:unsafe,port:43822,openExternal:async()=>assert.fail('Unexpected URL opened')});
await assert.rejects(invalid.login(),/Unexpected/);
accounts.close();cancel.close();timeout.close();invalid.close();
console.log('Desktop OAuth callback, cancellation, timeout, occupied port, URL restriction, username collisions and account isolation passed.');
const {createClient}=require('@supabase/supabase-js');
const config=require('../desktop/account-config.json');
const memory=new Map();
const sdk=createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,autoRefreshToken:false,storage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}}});
const oauth=await sdk.auth.signInWithOAuth({provider:'discord',options:{redirectTo:'http://127.0.0.1:43821/auth/callback',skipBrowserRedirect:true}});
assert.equal(oauth.error,null);
const oauthUrl=new URL(oauth.data.url);
assert.equal(oauthUrl.searchParams.get('code_challenge_method'),'s256');
assert.ok(oauthUrl.searchParams.get('code_challenge'));
assert.ok([...memory.keys()].some(key=>key.includes('code-verifier')));
sdk.auth.stopAutoRefresh();
console.log('Official SDK generates a PKCE challenge and retains its verifier outside the renderer.');
