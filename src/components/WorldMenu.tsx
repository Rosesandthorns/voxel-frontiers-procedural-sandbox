import { version as gameVersion } from '../../package.json';
import {VersionsPanel} from './VersionsPanel';

import {ServersPanel} from './ServersPanel';

import React, { useState } from 'react';

import {FriendsPanel,WorldMultiplayerSettings} from './FriendsPanel';

import {CharacterPanel} from './CharacterPanel';

import {AccountPanel} from './AccountPanel';

import { listWorlds, loadGame, saveGame, setActiveWorld, deleteWorld, type WorldSummary } from '../game/config/saveManager';

import { createDefaultBackpack, DEFAULT_WORLD_SETTINGS } from '../game/config/gameDefaults';

import { SettingsModal } from './SettingsModal';

export function WorldMenu({ onSelect }: { onSelect: (id: string) => void }) {

  const [worlds, setWorlds] = useState<WorldSummary[]>(() => { try { return listWorlds(); } catch { return []; } });

  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');

  const [seed, setSeed] = useState('');

  const [error, setError] = useState('');

  const [deleting, setDeleting] = useState<string | null>(null);

  const [renaming, setRenaming] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settings, setSettings] = useState(DEFAULT_WORLD_SETTINGS);

  const play=async(id:string,offline=false)=>{setError('');try{const world=loadGame(id);if(!offline&&world?.multiplayer?.enabled&&window.desktop)await window.desktop.online('host',id);onSelect(id);}catch(e){setError(e instanceof Error?e.message:'Could not open world.');}};

  const refresh = () => setWorlds(listWorlds());

  const create = (event: React.FormEvent) => {

    event.preventDefault();

    if (!name.trim()) { setError('Give your world a name.'); return; }

    const id = crypto.randomUUID();

    const numericSeed = /^-?\d+$/.test(seed.trim()) && Number.isSafeInteger(Number(seed)) ? Number(seed) : seed.trim() ? Array.from(seed.trim()).reduce((n,c) => Math.imul(n,31) + c.charCodeAt(0) | 0, 0) : crypto.getRandomValues(new Uint32Array(1))[0];

    setActiveWorld(id);

    if (!saveGame({ name: name.trim(), seed: numericSeed, createdAt: Date.now(), generationVersion: 6, hotbar: Array.from({length:9}, () => ({item:null,count:0})), inventory: createDefaultBackpack(), health:20, stamina:100, coords:{x:8.5,y:0,z:8.5}, settings })) { setError('Could not create this world. Check disk space and folder permissions.'); return; }

    onSelect(id);

  };

  return <div className="frontier-menu">

    <div className="menu-landscape" aria-hidden="true"><i/><i/><i/></div>

    <main className="world-menu-content">

      <header className="world-menu-header"><div><p className="menu-eyebrow">A world of your own</p><h1>BIOME</h1></div><div className="world-menu-tools"><AccountPanel/><CharacterPanel/><FriendsPanel onSelect={onSelect}/><ServersPanel onSelect={onSelect}/><VersionsPanel/><button onClick={() => setSettingsOpen(true)}>Settings</button>{window.desktop && <><button onClick={() => window.desktop!.action('fullscreen')}>Fullscreen</button><button onClick={() => window.desktop!.action('saves')}>Saves folder</button><button onClick={() => window.desktop!.action('quit')}>Quit</button></>}</div></header>

      {creating ? <form onSubmit={create} className="world-create"><h2>New world</h2><label>World name<input autoFocus maxLength={48} value={name} onChange={e => setName(e.target.value)} placeholder="Your next adventure"/></label><label>Seed <small>Optional; the same text makes the same landscape</small><input maxLength={64} value={seed} onChange={e => setSeed(e.target.value)} placeholder="Leave blank for a surprise"/></label><p>Explore wildflower meadows, silver birch groves, and mossy highlands.</p><div className="world-buttons"><button className="primary" type="submit">Create & play</button><button type="button" onClick={() => { setCreating(false); setError(''); }}>Back</button></div></form> : <section aria-label="World selection" className="world-library"><div className="world-library-heading"><h2>Your worlds <small>{worlds.length}</small></h2><button className="primary" onClick={() => {setCreating(true);setName('');setError('');}}>New world</button></div>

        {worlds.length === 0 && <div className="empty-worlds"><h3>Somewhere new awaits.</h3><p>Create your first world to begin.</p></div>}

        <div className="world-list">{worlds.map(w => <article key={w.id} className="world-row"><div className="world-thumbnail" aria-hidden="true" style={{filter:`hue-rotate(${(w.seed ?? 0) % 45}deg)`}}/>

          <div className="world-row-info">{renaming === w.id ? <form onSubmit={e => {e.preventDefault(); const state = loadGame(w.id); if (!state || !name.trim()) return; setActiveWorld(w.id); if (saveGame({...state,name:name.trim()})) {setRenaming(null);refresh();} else setError('Could not rename world.');}}><input aria-label="World name" value={name} maxLength={48} onChange={e => setName(e.target.value)} autoFocus/><button type="submit">Save name</button><button type="button" onClick={() => setRenaming(null)}>Cancel</button></form> : <><h3>{w.name}</h3><p>Last played {new Date(w.timestamp).toLocaleDateString()}</p></>}</div>

          {deleting === w.id ? <div className="world-buttons"><span>Delete this world?</span><button onClick={() => {if(deleteWorld(w.id)){setDeleting(null);refresh();}else setError('Could not delete world.');}}>Delete permanently</button><button onClick={() => setDeleting(null)}>Cancel</button></div> : <div className="world-buttons"><button className="primary" onClick={() => void play(w.id)} aria-label={`Play ${w.name}`}>Play</button>{loadGame(w.id)?.multiplayer?.enabled&&<button onClick={()=>void play(w.id,true)}>Play offline</button>}<WorldMultiplayerSettings id={w.id} onSaved={refresh}/><button aria-label={`Rename ${w.name}`} onClick={() => {setRenaming(w.id);setName(w.name);}}>Rename</button><button aria-label={`Delete ${w.name}`} onClick={() => setDeleting(w.id)}>Delete</button></div>}

        </article>)}</div>

      </section>}

      {error && <p className="world-error" role="alert">{error}</p>}

    </main><span className="menu-edition">{window.desktop ? 'DESKTOP EDITION' : 'LOCAL PREVIEW'} · {gameVersion}</span>

    {settingsOpen && <SettingsModal settings={settings} onUpdateSettings={s => setSettings(v => ({...v,...s}))} onReseedWorld={() => {}} onClose={() => setSettingsOpen(false)}/>}

  </div>;

}
