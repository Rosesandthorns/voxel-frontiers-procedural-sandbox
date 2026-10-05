import { InventorySlot, WorldSettings } from '../../types';
import { ITEM_REGISTRY } from '../systems/ItemRegistry';

export const createDefaultBackpack = (): InventorySlot[] => {
  const slots: InventorySlot[] = Array.from({ length: 27 }, () => ({
    item: null,
    count: 0
  }));

  // Starter Farming Kit
  const starterItems = [
    { id: 'wooden_hoe', count: 1 },
    { id: 'water_bucket', count: 1 },
    { id: 'trellis', count: 8 },
    { id: 'radishes_seed', count: 8 },
    { id: 'tomatoes_seed', count: 6 },
    { id: 'peas_seed', count: 6 },
    { id: 'corn_seed', count: 6 },
    { id: 'carrots_seed', count: 6 },
    { id: 'strawberries_seed', count: 4 }
  ];

  starterItems.forEach((st, idx) => {
    if (idx < slots.length && ITEM_REGISTRY[st.id]) {
      slots[idx] = { item: ITEM_REGISTRY[st.id], count: st.count };
    }
  });

  return slots;
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
