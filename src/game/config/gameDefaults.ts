import { InventorySlot, WorldSettings } from '../../types';
import { ITEM_REGISTRY } from '../systems/ItemRegistry';

export const DEFAULT_HOTBAR: InventorySlot[] = Array.from({ length: 9 }, () => ({
  item: null,
  count: 0
}));

export const createDefaultBackpack = (): InventorySlot[] => {
  return Array.from({ length: 27 }, () => ({
    item: null,
    count: 0
  }));
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  // 12 chunks gives a solid view distance without killing the frame budget
  renderDistance: 12,
  fov: 90,
  dayNightSpeed: 1,
  fogDensity: 0.007,
  enableThirdPerson: false,
  enableFlight: false,
  soundVolume: 0.8,
  timeOfDay: 0.35
};

// Maximum values the settings UI should allow on desktop
export const MAX_RENDER_DISTANCE = 24;
export const MIN_FOG_DENSITY = 0.002;
