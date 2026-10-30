const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fixture=JSON.parse(fs.readFileSync(process.env.BIOME_TEST_FIXTURE,'utf8'));
const accounts=require('../desktop/accounts.cjs');const original=accounts.createAccounts;
accounts.createAccounts=options=>({...original(options),identity:async()=>({...fixture.person,token:'not-a-real-account-token'})});
const supabase=require('@supabase/supabase-js'),make=supabase.createClient;
supabase.createClient=(...args)=>{const client=make(...args);const rpc=client.rpc.bind(client);client.rpc=async(name,params)=>{if(name==='biome_create_server_ticket'){const current=fs.existsSync(fixture.tickets)?JSON.parse(fs.readFileSync(fixture.tickets,'utf8')):{};current[params.ticket_hash]={...fixture.person,audience:params.server_fingerprint};fs.writeFileSync(fixture.tickets,JSON.stringify(current));return {error:null};}return rpc(name,params);};return client;};
require('../desktop/main.cjs');
