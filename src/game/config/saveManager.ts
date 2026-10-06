import { InventorySlot, Season, WorldSettings } from '../../types';

export interface SavedGameState {
  hotbar: InventorySlot[];
  inventory: InventorySlot[];
  health: number;
  stamina: number;
  coords: { x: number; y: number; z: number };
  yaw?: number;
  selectedHotbarIndex?: number;
  settings?: WorldSettings;
  season?: Season;
  dayInSeason?: number;
  timestamp: number;
}

const SAVE_KEY = 'voxel_frontiers_world_save';

export function saveGame(state: Omit<SavedGameState, 'timestamp'>): boolean {
  try {
    const fullState: SavedGameState = {
      ...state,
      timestamp: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(fullState));
    return true;
  } catch (err) {
    console.error('Failed to save game state:', err);
    return false;
  }
}

export function loadGame(): SavedGameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGameState;
    if (parsed && Array.isArray(parsed.hotbar) && Array.isArray(parsed.inventory)) {
      if (parsed.coords && (typeof parsed.coords.y !== 'number' || parsed.coords.y < 50)) {
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
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.error('Failed to clear saved game state:', err);
  }
}
