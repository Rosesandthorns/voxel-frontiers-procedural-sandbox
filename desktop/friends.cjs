function createFriends(client,identity){
 async function profile(){const who=await identity();if(!who?.username)throw new Error('Sign in and choose a Biome username first.');return who;}
 const check=result=>{if(result.error)throw new Error(result.error.message||'Friends service unavailable');return result.data;};
 async function list(){const who=await profile();const rows=check(await client.from('biome_friends').select('id,requester,recipient,status').or(`requester.eq.${who.id},recipient.eq.${who.id}`))??[];
  const ids=rows.map(row=>row.requester===who.id?row.recipient:row.requester);const profiles=ids.length?check(await client.from('biome_profiles').select('id,username').in('id',ids)):[];
  const worlds=check(await client.from('biome_online_worlds').select('host_id,lobby_id,world_name,access,updated_at'))??[];
  return {ownId:who.id,friends:rows.map(row=>{const id=row.requester===who.id?row.recipient:row.requester;return {...row,playerId:id,username:profiles?.find(p=>p.id===id)?.username??'Unknown player',incoming:row.recipient===who.id,world:worlds.find(w=>w.host_id===id&&Date.parse(w.updated_at)>Date.now()-90000)??null};})};
 }
 async function request(username){if(typeof username!=='string'||!/^[A-Za-z0-9_]{3,20}$/.test(username))throw new Error('Enter a valid Biome username.');await profile();check(await client.rpc('biome_request_friend',{player_name:username}));return list();}
 async function accept(id){await profile();check(await client.rpc('biome_accept_friend',{request_id:id}));return list();}
 async function remove(id){await profile();check(await client.rpc('biome_remove_friend',{request_id:id}));return list();}
 async function publish(world){const who=await profile();const result=await client.from('biome_online_worlds').insert({host_id:who.id,...world});if(result.error?.code==='23505')check(await client.from('biome_online_worlds').update(world).eq('host_id',who.id));else check(result);}
 async function unpublish(){const who=await profile();check(await client.from('biome_online_worlds').delete().eq('host_id',who.id));check(await client.from('biome_world_invites').delete().eq('host_id',who.id));}
 async function allowed(id,access){const friend=check(await client.rpc('biome_is_friend',{other:id}));if(!friend)return false;if(access==='friends')return true;const who=await profile();return !!check(await client.from('biome_world_invites').select('guest_id').eq('host_id',who.id).eq('guest_id',id).maybeSingle());}
 async function invite(id){const who=await profile();if(!await allowed(id,'friends'))throw new Error('Add this player as a friend first.');const result=await client.from('biome_world_invites').insert({host_id:who.id,guest_id:id});if(result.error?.code!=='23505')check(result);return list();}
 return {list,request,accept,remove,publish,unpublish,allowed,invite};
}
module.exports={createFriends};
