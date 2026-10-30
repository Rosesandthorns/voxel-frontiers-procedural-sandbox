import React, {useEffect, useState} from 'react';
type Profile = {id:string;username:string|null};
export function AccountPanel() {
  const [open,setOpen]=useState(false);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [busy,setBusy]=useState(false);
  const [checking,setChecking]=useState(true);
  const [error,setError]=useState('');
  const [username,setUsername]=useState('');
  useEffect(()=>{
    let alive=true;
    window.desktop?.account('status').then(value=>{if(alive){setProfile(value);setUsername(value?.username??'');}}).catch(()=>{if(alive)setError('Account unavailable. You can still play your local worlds.');}).finally(()=>{if(alive)setChecking(false);});
    return()=>{alive=false;};
  },[]);
  if(!window.desktop)return null;
  const perform=async(action:'login'|'claim'|'signout')=>{
    setBusy(true);setError('');
    try {const value=await window.desktop!.account(action,action==='claim'?username:undefined);setProfile(value);setUsername(value?.username??'');}
    catch(e){setError(e instanceof Error?e.message:'Could not complete this request.');}
    finally{setBusy(false);}
  };
  return <><button onClick={()=>setOpen(true)}>{profile?.username ?? 'Account'}</button>{open && <div className="pause-backdrop"><section className="pause-panel account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
    <p className="menu-eyebrow">Biome</p><h1 id="account-title">Your account</h1><div className="menu-rule"/>
    {checking ? <p>Checking sign-in…</p> : profile ? <><p>{profile.username ? `Signed in as ${profile.username}` : 'Choose your Biome username.'}</p><form onSubmit={e=>{e.preventDefault();void perform('claim');}}><label>Biome username<input autoFocus value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoComplete="off" disabled={busy} required/></label><p className="account-note">3–20 letters, numbers, or underscores. Names are unique regardless of capitalization.</p><nav className="menu-actions"><button className="primary" disabled={busy} type="submit">{busy?'Saving…':'Save username'}</button><button disabled={busy} type="button" onClick={()=>void perform('signout')}>Sign out</button></nav></form></> : <><p>Sign in, then choose your own Biome username.</p><nav className="menu-actions"><button className="primary" disabled={busy} onClick={()=>void perform('login')}>{busy?'Waiting for Discord…':'Continue with Discord'}</button>{busy && <button onClick={()=>void window.desktop!.account('cancel')}>Cancel sign-in</button>}</nav><p className="account-note">Sign-in opens in your browser. Your local worlds are available offline.</p></>}
    {error && <p className="world-error" role="alert">{error}</p>}
    <nav className="menu-actions"><button disabled={busy} onClick={()=>setOpen(false)}>Back</button></nav>
  </section></div>}</>;
}
