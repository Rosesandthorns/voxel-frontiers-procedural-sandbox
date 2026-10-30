import type { FurnaceState } from '../systems/ItemRegistry';

import { InventorySlot, Season, WorldSettings } from '../../types';



export interface SavedGameState {
  workshops?:Record<string,import('../systems/Workshop').WorkshopState>;

  id?: string;

  name?: string;

  generationVersion?: number;

  chunkVersions?: Record<string, number>;

  createdAt?: number;

  multiplayer?: {enabled:boolean;access:'friends'|'invite';maxPlayers?:number};

  furnaceState?: FurnaceState;

  seed?: number;

  modifiedBlocks?: [string, number][];

  hotbar: InventorySlot[];

  inventory: InventorySlot[];

  survival?: import('../player/Survival').SurvivalState;
  health: number;

  stamina: number;

  coords: { x: number; y: number; z: number };

  yaw?: number;

  selectedHotbarIndex?: number;

  settings?: WorldSettings;

  spawn?: {x:number;y:number;z:number};

  timeRate?: number;
  timeOfDay?: number;

  environment?: ReturnType<import('../environment/SeasonWeatherSystem').SeasonWeatherSystem['snapshot']>;

  mobs?: ReturnType<import('../entities/EntityManager').EntityManager['saveState']>;

  season?: Season;

  dayInSeason?: number;

  timestamp: number;

}



let lastSaveError: unknown = null;

export function getLastSaveError(){return lastSaveError;}



const SAVE_KEY = 'voxel_frontiers_world_save';

let activeWorld = 'legacy';

export function getActiveWorld() { return activeWorld; }

export function setActiveWorld(id: string) { activeWorld = id; }

function readWorld(id: string): string | null {

  return window.desktop ? window.desktop.store('read', undefined, id) as string | null : localStorage.getItem(`${SAVE_KEY}_${id}`) ?? (id === 'legacy' ? localStorage.getItem(SAVE_KEY) : null);

}

export interface WorldSummary { id: string; name: string; timestamp: number; seed?: number }

export function listWorlds(): WorldSummary[] {

  const ids: string[] = window.desktop ? JSON.parse(window.desktop.store('list') as string) : Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => k.startsWith(SAVE_KEY + '_')).map(k => k.slice(SAVE_KEY.length + 1));

  if (!window.desktop && localStorage.getItem(SAVE_KEY) && !ids.includes('legacy')) ids.push('legacy');

  return ids.filter(id=>!id.startsWith('online-')).flatMap(id => { const state = loadGame(id); return state ? [{ id, name: state.name || 'My first world', timestamp: state.timestamp, seed: state.seed }] : []; }).sort((a,b) => b.timestamp - a.timestamp);

}

export function deleteWorld(id: string): boolean {

  try {

    if (window.desktop) window.desktop.store('clear', undefined, id);

    else { localStorage.removeItem(`${SAVE_KEY}_${id}`); if (id === 'legacy') localStorage.removeItem(SAVE_KEY); }

    if (!window.desktop) {

      const keys=JSON.parse(localStorage.getItem(`biome-chunks-${id}`) || '[]');

      for(const key of keys) localStorage.removeItem(`biome-chunk-${id}-${key}`);

      localStorage.removeItem(`biome-chunks-${id}`);

    }

    return true;

  } catch { return false; }

}





export function saveGame(state: Omit<SavedGameState, 'timestamp'>): boolean {

  try {

    const fullState: SavedGameState = {

      ...state,

      id: activeWorld,

      timestamp: Date.now()

    };

    if (window.desktop) window.desktop.store('write', JSON.stringify(fullState), activeWorld);

    else localStorage.setItem(`${SAVE_KEY}_${activeWorld}`, JSON.stringify(fullState));

    lastSaveError=null;

    return true;

  } catch (err) {

    lastSaveError=err;

    console.error('Failed to save game state:', err);

    return false;

  }

}



export function loadGame(id = activeWorld): SavedGameState | null {

  try {

    const raw = readWorld(id);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as SavedGameState;

    if (parsed && Array.isArray(parsed.hotbar) && parsed.hotbar.length === 9 && Array.isArray(parsed.inventory) && parsed.inventory.length === 27) {

      if (parsed.chunkVersions && (typeof parsed.chunkVersions !== 'object' || Array.isArray(parsed.chunkVersions) || !Object.entries(parsed.chunkVersions).every(([key,v]) => /^-?\d+,-?\d+$/.test(key) && Number.isInteger(v) && v >= 1 && v <= 6))) return null;

      const slots = [...parsed.hotbar, ...parsed.inventory];

      if (!slots.every(slot => slot && Number.isFinite(slot.count) && slot.count >= 0 && (!slot.item || typeof slot.item.id === 'string'))) return null;

      if (![parsed.health, parsed.stamina].every(Number.isFinite)) return null;

      if (parsed.seed !== undefined && !Number.isSafeInteger(parsed.seed)) return null;

      if (parsed.modifiedBlocks !== undefined && (!Array.isArray(parsed.modifiedBlocks) || !parsed.modifiedBlocks.every(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && /^-?\d+,-?\d+,-?\d+$/.test(entry[0]) && Number.isInteger(entry[1]) && entry[1] >= 0))) return null;

      if (parsed.coords && ![parsed.coords.x, parsed.coords.y, parsed.coords.z].every(Number.isFinite)) return null;

      parsed.health = Math.max(0, Math.min(20, parsed.health));

      parsed.stamina = Math.max(0, Math.min(100, parsed.stamina));

      parsed.selectedHotbarIndex = Math.max(0, Math.min(8, Math.floor(parsed.selectedHotbarIndex || 0)));

      if (parsed.coords && (typeof parsed.coords.y !== 'number' || parsed.coords.y < 0)) {

        parsed.coords = undefined as any;

      }

      return parsed;

    }

  } catch (err) {

    console.error('Failed to parse saved game state:', err);

  }

  return null;

}



export function hasSavedGame(): boolean {

  try {

    return loadGame() !== null;

  } catch {

    return false;

  }

}



export function clearSavedGame(): boolean {

  try {

    if (window.desktop) window.desktop.store('clear', undefined, activeWorld);

    else localStorage.removeItem(`${SAVE_KEY}_${activeWorld}`);

    return true;

  } catch (err) {

    console.error('Failed to clear saved game state:', err);

    return false;

  }

}
