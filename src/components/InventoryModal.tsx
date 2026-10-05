import React, { useState, useEffect, useRef, useMemo } from 'react';
import { soundManager } from '../game/audio/SoundFX';
import {
  ALL_CRAFTING_RECIPES,
  INVENTORY_CRAFTING_RECIPES,
  TOOL_CRAFTER_RECIPES,
  CraftingRecipe,
  ITEM_REGISTRY,
  isStoneTypeItem,
  isFlintTypeItem,
  FurnaceState,
  createDefaultFurnaceState,
  cloneFurnaceState,
  getFurnaceTemperature,
  getFurnaceRecipeForInput,
  getFuelBurnDuration,
  isFuelItem,
  FURNACE_SMELTING_RECIPES,
  FUEL_SOURCE_GUIDE,
  SMELT_DURATION_SECONDS,
  FurnaceSmeltRecipe,
  FORGE_RECIPES,
  isMoldItem,
  isPlankItemId
} from '../game/systems/ItemRegistry';
import { BlockType, InventorySlot, ItemDef } from '../types';
import { isPlankBlock, isLogBlock } from '../game/voxel/Blocks';
import { ItemIcon } from './ItemIcon';
import { ForgeStation } from './ForgeStation';
import { ThermalStationView } from './ThermalStationView';
import type { VoxelWorld } from '../game/voxel/VoxelWorld';
import {
  X,
  Layers,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Package,
  Wrench,
  ArrowRight,
  Sparkles,
  Check,
  Flame,
  Thermometer,
  Hammer,
  Droplets,
  Snowflake
} from 'lucide-react';

interface InventoryModalProps {
  hotbar: InventorySlot[];
  inventory: InventorySlot[];
  onUpdateSlots: (hotbar: InventorySlot[], inventory: InventorySlot[]) => void;
  onClose: () => void;
  initialStation?: 'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge' | 'heater' | 'cooler';
  stationCoords?: { x: number; y: number; z: number } | null;
  world?: VoxelWorld | null;
  furnaceState?: FurnaceState;
  onUpdateFurnaceState?: React.Dispatch<React.SetStateAction<FurnaceState>>;
}

const STONE_HEAD_TEMPLATES: Array<{
  id: 'stone_pickaxe_head' | 'stone_axe_head' | 'stone_shovel_head' | 'stone_hoe_head';
  name: string;
  item: ItemDef;
  pattern: string[];
}> = [
  {
    id: 'stone_pickaxe_head',
    name: 'Stone Pickaxe Head',
    item: ITEM_REGISTRY['stone_pickaxe_head'],
    pattern: [
      '................',
      '................',
      '................',
      '......####......',
      '.....######.....',
      '....########....',
      '....########....',
      '...###.##.###...',
      '..###......###..',
      '..##........##..',
      '.###........###.',
      '.##..........##.',
      '................',
      '................',
      '................',
      '................'
    ]
  },
  {
    id: 'stone_axe_head',
    name: 'Stone Axe Head',
    item: ITEM_REGISTRY['stone_axe_head'],
    pattern: [
      '................',
      '................',
      '................',
      '................',
      '.....#######....',
      '....########....',
      '...##########...',
      '...##########...',
      '...##########...',
      '...##########...',
      '....########....',
      '.....#######....',
      '................',
      '................',
      '................',
      '................'
    ]
  },
  {
    id: 'stone_shovel_head',
    name: 'Stone Shovel Head',
    item: ITEM_REGISTRY['stone_shovel_head'],
    pattern: [
      '................',
      '................',
      '................',
      '......####......',
      '......####......',
      '......####......',
      '.....######.....',
      '.....######.....',
      '....########....',
      '....########....',
      '.....######.....',
      '......####......',
      '.......##.......',
      '................',
      '................',
      '................'
    ]
  },
  {
    id: 'stone_hoe_head',
    name: 'Stone Hoe Head',
    item: ITEM_REGISTRY['stone_hoe_head'],
    pattern: [
      '................',
      '................',
      '................',
      '....#########...',
      '....#########...',
      '..........###...',
      '..........###...',
      '..........###...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ]
  }
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hotbar,
  inventory,
  onUpdateSlots,
  onClose,
  initialStation = 'inventory',
  stationCoords = null,
  world = null,
  furnaceState: propFurnaceState,
  onUpdateFurnaceState
}) => {
  // 3x3 Assembly Grid State (each slot supports stacking multiple items like Minecraft)
  const createEmptyGrid = (): InventorySlot[] =>
    Array.from({ length: 9 }, () => ({ item: null, count: 0 }));

  const [gridSlots, setGridSlots] = useState<InventorySlot[]>(createEmptyGrid);
  const gridSlotsRef = useRef<InventorySlot[]>(createEmptyGrid());
  const [preferredRecipeId, setPreferredRecipeId] = useState<string | null>(null);

  // Fallback local furnace state if not controlled by parent
  const [fallbackFurnace, setFallbackFurnace] = useState<FurnaceState>(createDefaultFurnaceState);
  const activeFurnace = propFurnaceState || fallbackFurnace;
  const furnaceRef = useRef<FurnaceState>(activeFurnace);
  useEffect(() => {
    furnaceRef.current = activeFurnace;
  }, [activeFurnace]);

  const commitFurnace = (updater: FurnaceState | ((prev: FurnaceState) => FurnaceState)) => {
    if (onUpdateFurnaceState) {
      onUpdateFurnaceState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        furnaceRef.current = next;
        return next;
      });
    } else {
      setFallbackFurnace((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        furnaceRef.current = next;
        return next;
      });
    }
  };

  // Drag-and-drop state
  type DragSource =
    | { type: 'inventory'; isHotbar: boolean; index: number }
    | { type: 'grid'; index: number }
    | { type: 'stone_bench'; slotType: 'stone' | 'flint' };
  const dragSourceRef = useRef<DragSource | null>(null);
  const [dragOverGridIndex, setDragOverGridIndex] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ isHotbar: boolean; index: number } | null>(null);
  const [dragOverStoneBenchSlot, setDragOverStoneBenchSlot] = useState<'stone' | 'flint' | null>(null);
  const [dragOverFurnaceSlot, setDragOverFurnaceSlot] = useState<'input' | 'fuel_0' | 'fuel_1' | 'fuel_2' | 'fuel_3' | 'fuel_4' | null>(null);

  // Stone Bench State: Top slot (1 of any stone type block), Bottom slot (1 flint), and 16x16 manual carving grid
  const [stoneBenchStone, setStoneBenchStone] = useState<InventorySlot>({ item: null, count: 0 });
  const [stoneBenchFlint, setStoneBenchFlint] = useState<InventorySlot>({ item: null, count: 0 });
  const stoneBenchSlotsRef = useRef<{ stone: InventorySlot; flint: InventorySlot }>({
    stone: { item: null, count: 0 },
    flint: { item: null, count: 0 }
  });
  const [carvedTiles, setCarvedTiles] = useState<boolean[]>(() => Array(256).fill(false));
  const [selectedHeadGuide, setSelectedHeadGuide] = useState<'stone_pickaxe_head' | 'stone_axe_head' | 'stone_shovel_head' | 'stone_hoe_head'>('stone_pickaxe_head');
  const isCarvingMouseDownRef = useRef<boolean>(false);
  const carveDragTargetValueRef = useRef<boolean>(true);

  const commitStoneBenchSlots = (newStone: InventorySlot, newFlint: InventorySlot) => {
    stoneBenchSlotsRef.current = {
      stone: { ...newStone },
      flint: { ...newFlint }
    };
    setStoneBenchStone({ ...newStone });
    setStoneBenchFlint({ ...newFlint });
  };

  // Forge Slots Ref for returning items safely on modal close
  const forgeSlotsRef = useRef<{
    indentMold: InventorySlot;
    indentFuel: InventorySlot;
  }>({
    indentMold: { item: null, count: 0 },
    indentFuel: { item: null, count: 0 }
  });

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isCarvingMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const commitGridSlots = (newGrid: InventorySlot[]) => {
    const cloned = newGrid.map((s) => ({ ...s }));
    gridSlotsRef.current = cloned;
    setGridSlots(cloned.map((s) => ({ ...s })));
  };

  // Recipe Catalog Search, Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'craftable' | 'name' | 'default'>('craftable');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Main crafting inventory recipes: only wooden tools are allowed in the main crafting inventory,
  // while the Tool Crafter ('tool_crafter') shows all tools (wooden tools + assembled tools).
  const mainCraftingRecipes = useMemo(() => {
    if (initialStation === 'tool_crafter') {
      return [
        ...INVENTORY_CRAFTING_RECIPES.filter((r) => r.result.type === 'tool'),
        ...TOOL_CRAFTER_RECIPES.filter((r) => r.result.type === 'tool')
      ];
    }
    return INVENTORY_CRAFTING_RECIPES.filter(
      (r) => r.result.type !== 'tool' || r.result.id.startsWith('wooden_')
    );
  }, [initialStation]);

  // Ensure inventory is always 27 slots (9 columns x 3 rows) to align with 9-column hotbar
  const safeInventory: InventorySlot[] = inventory.length >= 27
    ? inventory.slice(0, 27)
    : [...inventory, ...Array.from({ length: 27 - inventory.length }, () => ({ item: null, count: 0 }))];

  // Local state for instant zero-latency UI updates
  const [localHotbar, setLocalHotbar] = useState<InventorySlot[]>(() => hotbar.map((s) => ({ ...s })));
  const [localInventory, setLocalInventory] = useState<InventorySlot[]>(() => safeInventory.map((s) => ({ ...s })));

  // Authoritative slots ref to ensure zero race conditions or stale closures
  const slotsRef = useRef<{ hotbar: InventorySlot[]; inventory: InventorySlot[] }>({
    hotbar: hotbar.map((s) => ({ ...s })),
    inventory: safeInventory.map((s) => ({ ...s }))
  });

  // EXACT ORIGINAL INVENTORY INTERACTION STATE:
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<{ isHotbar: boolean; index: number } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ item: ItemDef; count: number } | null>(null);

  // Sync with incoming parent props
  useEffect(() => {
    slotsRef.current.hotbar = hotbar.map((s) => ({ ...s }));
    setLocalHotbar(hotbar.map((s) => ({ ...s })));
  }, [hotbar]);

  useEffect(() => {
    slotsRef.current.inventory = safeInventory.map((s) => ({ ...s }));
    setLocalInventory(safeInventory.map((s) => ({ ...s })));
  }, [safeInventory]);

  const commitSlots = (newHotbar: InventorySlot[], newInv: InventorySlot[]) => {
    slotsRef.current = {
      hotbar: newHotbar.map((s) => ({ ...s })),
      inventory: newInv.map((s) => ({ ...s }))
    };
    setLocalHotbar(newHotbar.map((s) => ({ ...s })));
    setLocalInventory(newInv.map((s) => ({ ...s })));
    onUpdateSlots(newHotbar, newInv);
  };

  // Unlock mouse pointer on modal open
  useEffect(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  // Material helpers
  const isPlank = (item: ItemDef | null | undefined): boolean => {
    if (!item) return false;
    return (
      isPlankItemId(item.id) ||
      item.id.endsWith('_plank') ||
      item.id.endsWith('_planks') ||
      (item.blockId !== undefined && isPlankBlock(item.blockId))
    );
  };

  const isWoodLog = (item: ItemDef | null | undefined): boolean => {
    if (!item) return false;
    return (
      item.id.endsWith('_log') ||
      item.id.endsWith('_wood') ||
      (item.blockId !== undefined && isLogBlock(item.blockId))
    );
  };

  const isStone = (item: ItemDef | null | undefined): boolean => {
    return isStoneTypeItem(item);
  };

  const isFlint = (item: ItemDef | null | undefined): boolean => {
    return isFlintTypeItem(item);
  };

  // Count item quantity across hotbar and inventory
  const getItemCount = (itemId: string): number => {
    let count = 0;
    const currentHotbar = slotsRef.current.hotbar;
    const currentInv = slotsRef.current.inventory;
    const allSlots = [...currentHotbar, ...currentInv];

    for (const slot of allSlots) {
      if (!slot.item) continue;

      if (itemId === 'any_plank') {
        if (isPlank(slot.item)) count += slot.count;
      } else if (itemId === 'any_wood') {
        if (isWoodLog(slot.item)) count += slot.count;
      } else if (itemId === 'any_stone') {
        if (isStone(slot.item)) count += slot.count;
      } else if (slot.item.id === itemId) {
        count += slot.count;
      }
    }
    return count;
  };

  // Helper to add item with stack overflow handling
  const addItemToSlots = (
    targetHotbar: InventorySlot[],
    targetInventory: InventorySlot[],
    item: ItemDef,
    countToAdd: number
  ): boolean => {
    let remaining = countToAdd;
    const maxStack = item.maxStack || 64;

    for (const slot of targetHotbar) {
      if (slot.item?.id === item.id && slot.count < maxStack) {
        const canTake = Math.min(remaining, maxStack - slot.count);
        slot.count += canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    for (const slot of targetHotbar) {
      if (!slot.item) {
        const canTake = Math.min(remaining, maxStack);
        slot.item = item;
        slot.count = canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    for (const slot of targetInventory) {
      if (slot.item?.id === item.id && slot.count < maxStack) {
        const canTake = Math.min(remaining, maxStack - slot.count);
        slot.count += canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    for (const slot of targetInventory) {
      if (!slot.item) {
        const canTake = Math.min(remaining, maxStack);
        slot.item = item;
        slot.count = canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    return remaining === 0;
  };

  // Check if player has all ingredients for a recipe
  const canCraftRecipe = (recipe: CraftingRecipe): boolean => {
    return recipe.ingredients.every((ing) => getItemCount(ing.itemId) >= ing.count);
  };

  // Helper to verify 3x3 grid positional requirement for Stone Bench and Forge (8 iron surrounding 1 furnace)
  const matchesRecipePositionalRule = (recipe: CraftingRecipe): boolean => {
    if (recipe.id === 'craft_forge') {
      // Slot 4 (center) must be furnace
      const center = gridSlots[4];
      if (!center.item || (center.item.id !== 'furnace' && center.item.blockId !== BlockType.FURNACE)) {
        return false;
      }
      // Surrounding slots [0, 1, 2, 3, 5, 6, 7, 8] must be iron
      const surrounding = [0, 1, 2, 3, 5, 6, 7, 8];
      for (const idx of surrounding) {
        const s = gridSlots[idx];
        if (!s.item || s.item.id !== 'iron') {
          return false;
        }
      }
      return true;
    }

    if (recipe.id !== 'craft_stone_bench') return true;

    let maxPlankRow = -1;
    let minStoneRow = 99;
    let plankSlotsCount = 0;
    let stoneSlotsCount = 0;

    for (let i = 0; i < 9; i++) {
      const slot = gridSlots[i];
      if (!slot.item || slot.count <= 0) continue;
      const row = Math.floor(i / 3);
      if (isPlank(slot.item)) {
        plankSlotsCount++;
        if (row > maxPlankRow) maxPlankRow = row;
      } else if (isStone(slot.item)) {
        stoneSlotsCount++;
        if (row < minStoneRow) minStoneRow = row;
      } else {
        return false;
      }
    }

    return plankSlotsCount > 0 && stoneSlotsCount > 0 && maxPlankRow < minStoneRow;
  };

  // 3x3 Grid Recipe Matching (matches all valid recipes for current 3x3 grid items & stack counts)
  const matchingGridRecipes = useMemo(() => {
    const presentItems: Record<string, number> = {};
    let totalItems = 0;

    for (let i = 0; i < 9; i++) {
      const slot = gridSlots[i];
      if (slot.item && slot.count > 0) {
        const c = slot.count;
        totalItems += c;
        if (isPlank(slot.item)) {
          presentItems['any_plank'] = (presentItems['any_plank'] || 0) + c;
        }
        if (isWoodLog(slot.item)) {
          presentItems['any_wood'] = (presentItems['any_wood'] || 0) + c;
        }
        if (isStone(slot.item)) {
          presentItems['any_stone'] = (presentItems['any_stone'] || 0) + c;
        }
        presentItems[slot.item.id] = (presentItems[slot.item.id] || 0) + c;
      }
    }

    if (totalItems === 0) return [];

    // 1. Exact count matches first (totalItems === reqTotal)
    const exactMatched: CraftingRecipe[] = [];
    for (const r of mainCraftingRecipes) {
      const reqTotal = r.ingredients.reduce((acc, ing) => acc + ing.count, 0);
      if (reqTotal !== totalItems) continue;
      if (!matchesRecipePositionalRule(r)) continue;

      const matches = r.ingredients.every((ing) => {
        const has = presentItems[ing.itemId] || 0;
        return has >= ing.count;
      });

      if (matches) {
        exactMatched.push(r);
      }
    }

    if (exactMatched.length > 0) {
      return exactMatched;
    }

    // 2. Surplus stack matches (when multiple items are stacked in a slot, e.g. 5 logs or 6 planks)
    const surplusMatched: CraftingRecipe[] = [];
    for (const r of mainCraftingRecipes) {
      if (!matchesRecipePositionalRule(r)) continue;
      const matchesMin = r.ingredients.every((ing) => {
        const has = presentItems[ing.itemId] || 0;
        return has >= ing.count;
      });
      if (!matchesMin) continue;

      // Ensure every item type present in the grid belongs to this recipe
      const allGridItemsValid = gridSlots.every((slot) => {
        if (!slot.item || slot.count <= 0) return true;
        return r.ingredients.some((ing) => {
          if (ing.itemId === 'any_plank') return isPlank(slot.item);
          if (ing.itemId === 'any_wood') return isWoodLog(slot.item);
          if (ing.itemId === 'any_stone') return isStone(slot.item);
          return ing.itemId === slot.item!.id;
        });
      });

      if (allGridItemsValid) {
        surplusMatched.push(r);
      }
    }

    return surplusMatched;
  }, [gridSlots, mainCraftingRecipes]);

  const gridRecipeResult = useMemo(() => {
    if (matchingGridRecipes.length === 0) return null;

    if (preferredRecipeId) {
      const preferred = matchingGridRecipes.find((r) => r.id === preferredRecipeId);
      if (preferred) {
        return { recipe: preferred, result: preferred.result, count: preferred.resultCount };
      }
    }

    const chosen = matchingGridRecipes[0];
    return { recipe: chosen, result: chosen.result, count: chosen.resultCount };
  }, [matchingGridRecipes, preferredRecipeId]);

  // Craft from 3x3 Grid (deducts required ingredient counts from grid slots like Minecraft)
  const handleCraftFromGrid = () => {
    if (!gridRecipeResult) return;

    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const newGrid = gridSlotsRef.current.map((s) => ({ ...s }));

    const added = addItemToSlots(newHotbar, newInventory, gridRecipeResult.result, gridRecipeResult.count);
    if (!added) {
      soundManager.playStep('stone');
      setStatusFeedback('Inventory Full!');
      return;
    }

    // Deduct exact required ingredient amounts from the 3x3 grid slots
    for (const ing of gridRecipeResult.recipe.ingredients) {
      let needed = ing.count;
      for (let i = 0; i < 9; i++) {
        const slot = newGrid[i];
        if (!slot.item || slot.count <= 0 || needed <= 0) continue;

        let match = false;
        if (ing.itemId === 'any_plank') match = isPlank(slot.item);
        else if (ing.itemId === 'any_wood') match = isWoodLog(slot.item);
        else if (ing.itemId === 'any_stone') match = isStone(slot.item);
        else match = slot.item.id === ing.itemId;

        if (match) {
          const take = Math.min(needed, slot.count);
          slot.count -= take;
          needed -= take;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
        }
      }
    }

    commitGridSlots(newGrid);
    if (newGrid.every((s) => !s.item || s.count <= 0)) {
      setPreferredRecipeId(null);
    }
    commitSlots(newHotbar, newInventory);
    soundManager.playBlockPlace();
    soundManager.playChime(660);
    setStatusFeedback(`Assembled ${gridRecipeResult.result.name}!`);
    setTimeout(() => setStatusFeedback(null), 1800);
  };

  // Quick-fill 3x3 grid from chosen recipe
  const handleQuickFillGrid = (recipe: CraftingRecipe) => {
    // Return any existing items in grid back to a working copy of inventory first
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));

    for (let i = 0; i < 9; i++) {
      const slot = gridSlotsRef.current[i];
      if (slot.item && slot.count > 0) {
        addItemToSlots(newHotbar, newInventory, slot.item, slot.count);
      }
    }

    // Check if player has required materials once grid items are returned
    const countInWorkingSlots = (itemId: string): number => {
      let c = 0;
      for (const slot of [...newHotbar, ...newInventory]) {
        if (!slot.item) continue;
        if (itemId === 'any_plank' && isPlank(slot.item)) c += slot.count;
        else if (itemId === 'any_wood' && isWoodLog(slot.item)) c += slot.count;
        else if (itemId === 'any_stone' && isStone(slot.item)) c += slot.count;
        else if (slot.item.id === itemId) c += slot.count;
      }
      return c;
    };

    const hasAll = recipe.ingredients.every((ing) => countInWorkingSlots(ing.itemId) >= ing.count);
    if (!hasAll) {
      soundManager.playStep('stone');
      setStatusFeedback('Missing required materials!');
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }

    // Now populate grid with required items from inventory
    const newGrid: InventorySlot[] = createEmptyGrid();

    if (recipe.id === 'craft_stone_bench') {
      // Place 2 planks on top (slots 3, 4) and 2 stone on bottom (slots 6, 7)
      const plankIndices = [3, 4];
      const stoneIndices = [6, 7];
      for (const idx of plankIndices) {
        for (const slot of [...newHotbar, ...newInventory]) {
          if (slot.item && isPlank(slot.item)) {
            newGrid[idx] = { item: slot.item, count: 1 };
            slot.count--;
            if (slot.count <= 0) {
              slot.item = null;
              slot.count = 0;
            }
            break;
          }
        }
      }
      for (const idx of stoneIndices) {
        for (const slot of [...newHotbar, ...newInventory]) {
          if (slot.item && isStone(slot.item)) {
            newGrid[idx] = { item: slot.item, count: 1 };
            slot.count--;
            if (slot.count <= 0) {
              slot.item = null;
              slot.count = 0;
            }
            break;
          }
        }
      }
    } else if (recipe.id === 'craft_forge') {
      // Place 1 furnace in center (slot 4) and 8 iron surrounding it
      for (const slot of [...newHotbar, ...newInventory]) {
        if (slot.item && (slot.item.id === 'furnace' || slot.item.blockId === BlockType.FURNACE) && slot.count > 0) {
          newGrid[4] = { item: slot.item, count: 1 };
          slot.count--;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
          break;
        }
      }
      const ironIndices = [0, 1, 2, 3, 5, 6, 7, 8];
      for (const idx of ironIndices) {
        for (const slot of [...newHotbar, ...newInventory]) {
          if (slot.item && slot.item.id === 'iron' && slot.count > 0) {
            newGrid[idx] = { item: slot.item, count: 1 };
            slot.count--;
            if (slot.count <= 0) {
              slot.item = null;
              slot.count = 0;
            }
            break;
          }
        }
      }
    } else {
      let gridIndex = 0;
      for (const ing of recipe.ingredients) {
        for (let c = 0; c < ing.count; c++) {
          let foundItem: ItemDef | null = null;
          for (const slot of [...newHotbar, ...newInventory]) {
            if (!slot.item) continue;
            let match = false;
            if (ing.itemId === 'any_plank') match = isPlank(slot.item);
            else if (ing.itemId === 'any_wood') match = isWoodLog(slot.item);
            else if (ing.itemId === 'any_stone') match = isStone(slot.item);
            else match = slot.item.id === ing.itemId;

            if (match) {
              foundItem = slot.item;
              slot.count--;
              if (slot.count <= 0) {
                slot.item = null;
                slot.count = 0;
              }
              break;
            }
          }

          if (foundItem && gridIndex < 9) {
            newGrid[gridIndex++] = { item: foundItem, count: 1 };
          }
        }
      }
    }

    setPreferredRecipeId(recipe.id);
    commitGridSlots(newGrid);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('sand');
  };

  // Direct craft without having to click the output box
  const handleDirectCraftRecipe = (recipe: CraftingRecipe) => {
    if (!canCraftRecipe(recipe)) {
      soundManager.playStep('stone');
      setStatusFeedback('Missing materials!');
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }

    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));

    // Deduct ingredients
    for (const ing of recipe.ingredients) {
      let needed = ing.count;
      for (const slot of [...newHotbar, ...newInventory]) {
        if (!slot.item || needed <= 0) continue;
        let match = false;
        if (ing.itemId === 'any_plank') match = isPlank(slot.item);
        else if (ing.itemId === 'any_wood') match = isWoodLog(slot.item);
        else if (ing.itemId === 'any_stone') match = isStone(slot.item);
        else match = slot.item.id === ing.itemId;

        if (match) {
          const take = Math.min(needed, slot.count);
          slot.count -= take;
          needed -= take;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
        }
      }
    }

    const added = addItemToSlots(newHotbar, newInventory, recipe.result, recipe.resultCount);
    if (!added) {
      soundManager.playStep('stone');
      setStatusFeedback('Inventory Full!');
      return;
    }

    commitSlots(newHotbar, newInventory);
    soundManager.playBlockPlace();
    soundManager.playChime(660);
    setStatusFeedback(`Assembled ${recipe.result.name}!`);
    setTimeout(() => setStatusFeedback(null), 1800);
  };

  // Clear 3x3 grid back to inventory
  const handleClearGrid = () => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));

    for (let i = 0; i < 9; i++) {
      const slot = gridSlotsRef.current[i];
      if (slot.item && slot.count > 0) {
        addItemToSlots(newHotbar, newInventory, slot.item, slot.count);
      }
    }

    commitGridSlots(createEmptyGrid());
    setPreferredRecipeId(null);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('wood');
  };

  // Safely close modal, returning any items left in the 3x3 grid or Stone Bench slots to inventory
  const handleSafeClose = () => {
    const hasGridItems = gridSlotsRef.current.some((s) => s.item !== null && s.count > 0);
    const hasStoneBenchItems =
      (stoneBenchSlotsRef.current.stone.item !== null && stoneBenchSlotsRef.current.stone.count > 0) ||
      (stoneBenchSlotsRef.current.flint.item !== null && stoneBenchSlotsRef.current.flint.count > 0);
    const hasForgeItems =
      (forgeSlotsRef.current.indentMold.item !== null && forgeSlotsRef.current.indentMold.count > 0) ||
      (forgeSlotsRef.current.indentFuel.item !== null && forgeSlotsRef.current.indentFuel.count > 0);

    if (hasGridItems || hasStoneBenchItems || hasForgeItems) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      for (let i = 0; i < 9; i++) {
        const slot = gridSlotsRef.current[i];
        if (slot.item && slot.count > 0) {
          addItemToSlots(newHotbar, newInventory, slot.item, slot.count);
        }
      }
      if (stoneBenchSlotsRef.current.stone.item && stoneBenchSlotsRef.current.stone.count > 0) {
        addItemToSlots(
          newHotbar,
          newInventory,
          stoneBenchSlotsRef.current.stone.item,
          stoneBenchSlotsRef.current.stone.count
        );
      }
      if (stoneBenchSlotsRef.current.flint.item && stoneBenchSlotsRef.current.flint.count > 0) {
        addItemToSlots(
          newHotbar,
          newInventory,
          stoneBenchSlotsRef.current.flint.item,
          stoneBenchSlotsRef.current.flint.count
        );
      }
      // Return forge slots items
      const fSlots = [
        forgeSlotsRef.current.indentMold,
        forgeSlotsRef.current.indentFuel
      ];
      for (const fs of fSlots) {
        if (fs.item && fs.count > 0) {
          addItemToSlots(newHotbar, newInventory, fs.item, fs.count);
        }
      }
      forgeSlotsRef.current = {
        indentMold: { item: null, count: 0 },
        indentFuel: { item: null, count: 0 }
      };

      commitGridSlots(createEmptyGrid());
      commitStoneBenchSlots({ item: null, count: 0 }, { item: null, count: 0 });
      commitSlots(newHotbar, newInventory);
    }
    onClose();
  };

  // Place item(s) from an inventory/hotbar slot into a 3x3 crafting grid slot (supports stacking in the same slot!)
  const placeInventoryItemIntoGrid = (
    isHotbar: boolean,
    slotIdx: number,
    targetGridIdx: number,
    placeAll: boolean = false
  ) => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const newGrid = gridSlotsRef.current.map((s) => ({ ...s }));

    const srcList = isHotbar ? newHotbar : newInventory;
    const srcSlot = srcList[slotIdx];
    if (!srcSlot || !srcSlot.item || srcSlot.count <= 0) return;

    const itemToPlace = srcSlot.item;
    const maxStack = itemToPlace.maxStack || 64;
    const destGridSlot = newGrid[targetGridIdx];

    if (!destGridSlot.item || destGridSlot.count <= 0) {
      // Target grid slot is empty
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      destGridSlot.item = itemToPlace;
      destGridSlot.count = take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else if (destGridSlot.item.id === itemToPlace.id) {
      // Target grid slot already has the SAME item -> stack them up to maxStack!
      if (destGridSlot.count >= maxStack) return;
      const canAdd = maxStack - destGridSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, canAdd) : Math.min(1, srcSlot.count, canAdd);
      destGridSlot.count += take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else {
      // Target grid slot has a DIFFERENT item -> return existing stack to inventory and place new item
      const existingItem = destGridSlot.item;
      const existingCount = destGridSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;

      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }

      addItemToSlots(newHotbar, newInventory, existingItem, existingCount);
      destGridSlot.item = itemToPlace;
      destGridSlot.count = take;
    }

    commitGridSlots(newGrid);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('wood');
  };

  // Drag & Drop Handlers
  const parseDragSource = (e: React.DragEvent): DragSource | null => {
    if (dragSourceRef.current) return dragSourceRef.current;
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (raw) {
        return JSON.parse(raw) as DragSource;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  };

  const handleInventoryDragStart = (e: React.DragEvent, isHotbar: boolean, index: number) => {
    const sourceSlots = isHotbar ? slotsRef.current.hotbar : slotsRef.current.inventory;
    const slot = sourceSlots[index];
    if (!slot || !slot.item) {
      e.preventDefault();
      return;
    }
    const payload: DragSource = { type: 'inventory', isHotbar, index };
    dragSourceRef.current = payload;
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    } catch {
      // Ignore dataTransfer errors in synthetic events
    }
  };

  const handleGridDragStart = (e: React.DragEvent, gridIndex: number) => {
    const slot = gridSlotsRef.current[gridIndex];
    if (!slot || !slot.item || slot.count <= 0) {
      e.preventDefault();
      return;
    }
    const payload: DragSource = { type: 'grid', index: gridIndex };
    dragSourceRef.current = payload;
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    } catch {
      // Ignore
    }
  };

  const handleGridDragOver = (e: React.DragEvent, gridIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGridIndex !== gridIndex) {
      setDragOverGridIndex(gridIndex);
    }
  };

  const handleGridDrop = (e: React.DragEvent, targetGridIndex: number) => {
    e.preventDefault();
    setDragOverGridIndex(null);
    setDragOverSlot(null);

    const src = parseDragSource(e);
    dragSourceRef.current = null;
    if (!src) return;

    if (src.type === 'inventory') {
      placeInventoryItemIntoGrid(src.isHotbar, src.index, targetGridIndex, e.shiftKey);
      setSelectedSlotIndex(null);
    } else if (src.type === 'grid') {
      if (src.index === targetGridIndex) return;
      const newGrid = gridSlotsRef.current.map((s) => ({ ...s }));
      const srcGridSlot = newGrid[src.index];
      const destGridSlot = newGrid[targetGridIndex];
      if (!srcGridSlot.item || srcGridSlot.count <= 0) return;

      if (destGridSlot.item && destGridSlot.item.id === srcGridSlot.item.id) {
        // Stack same items inside the 3x3 crafting grid
        const maxStack = destGridSlot.item.maxStack || 64;
        const canTake = Math.max(0, maxStack - destGridSlot.count);
        const take = Math.min(srcGridSlot.count, canTake);
        destGridSlot.count += take;
        srcGridSlot.count -= take;
        if (srcGridSlot.count <= 0) {
          srcGridSlot.item = null;
          srcGridSlot.count = 0;
        }
      } else {
        const tempItem = destGridSlot.item;
        const tempCount = destGridSlot.count;
        destGridSlot.item = srcGridSlot.item;
        destGridSlot.count = srcGridSlot.count;
        srcGridSlot.item = tempItem;
        srcGridSlot.count = tempCount;
      }

      commitGridSlots(newGrid);
      soundManager.playStep('wood');
    }
  };

  const handleInventoryDragOver = (e: React.DragEvent, isHotbar: boolean, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverSlot || dragOverSlot.isHotbar !== isHotbar || dragOverSlot.index !== index) {
      setDragOverSlot({ isHotbar, index });
    }
  };

  const handleInventoryDrop = (e: React.DragEvent, destIsHotbar: boolean, destIndex: number) => {
    e.preventDefault();
    setDragOverGridIndex(null);
    setDragOverSlot(null);

    const src = parseDragSource(e);
    dragSourceRef.current = null;
    if (!src) return;

    if (src.type === 'grid') {
      const gridSlot = gridSlotsRef.current[src.index];
      if (!gridSlot || !gridSlot.item || gridSlot.count <= 0) return;

      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const newGrid = gridSlotsRef.current.map((s) => ({ ...s }));

      const destList = destIsHotbar ? newHotbar : newInventory;
      const destSlot = destList[destIndex];

      if (!destSlot.item) {
        destSlot.item = gridSlot.item;
        destSlot.count = gridSlot.count;
        newGrid[src.index] = { item: null, count: 0 };
      } else if (destSlot.item.id === gridSlot.item.id && destSlot.count < (destSlot.item.maxStack || 64)) {
        const maxStack = destSlot.item.maxStack || 64;
        const canTake = maxStack - destSlot.count;
        const take = Math.min(gridSlot.count, canTake);
        destSlot.count += take;
        newGrid[src.index].count -= take;
        if (newGrid[src.index].count <= 0) {
          newGrid[src.index] = { item: null, count: 0 };
        }
      } else {
        // Swap destination slot stack with the grid slot stack
        const tempItem = destSlot.item;
        const tempCount = destSlot.count;
        destSlot.item = gridSlot.item;
        destSlot.count = gridSlot.count;
        newGrid[src.index] = { item: tempItem, count: tempCount };
      }

      commitGridSlots(newGrid);
      commitSlots(newHotbar, newInventory);
      soundManager.playStep('sand');
    } else if (src.type === 'inventory') {
      if (src.isHotbar === destIsHotbar && src.index === destIndex) return;

      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));

      const srcList = src.isHotbar ? newHotbar : newInventory;
      const destList = destIsHotbar ? newHotbar : newInventory;

      const srcSlot = srcList[src.index];
      const destSlot = destList[destIndex];

      if (!srcSlot.item) return;

      if (destSlot.item && srcSlot.item.id === destSlot.item.id && destSlot.count < (destSlot.item.maxStack || 64)) {
        const maxStack = destSlot.item.maxStack || 64;
        const canTake = maxStack - destSlot.count;
        const take = Math.min(srcSlot.count, canTake);
        destSlot.count += take;
        srcSlot.count -= take;
        if (srcSlot.count <= 0) {
          srcSlot.item = null;
          srcSlot.count = 0;
        }
      } else {
        const tempItem = destSlot.item;
        const tempCount = destSlot.count;
        destSlot.item = srcSlot.item;
        destSlot.count = srcSlot.count;
        srcSlot.item = tempItem;
        srcSlot.count = tempCount;
      }

      setSelectedSlotIndex(null);
      soundManager.playStep('sand');
      commitSlots(newHotbar, newInventory);
    }
  };

  const handleDragEnd = () => {
    dragSourceRef.current = null;
    setDragOverGridIndex(null);
    setDragOverSlot(null);
    setDragOverStoneBenchSlot(null);
    setDragOverFurnaceSlot(null);
  };

  // ============================================================
  // FURNACE: Input Slot + 5 Fuel Slots (Temp 1..5) + Output Slot
  // ============================================================
  const currentFurnaceTemp = getFurnaceTemperature(activeFurnace);
  const activeSmeltRecipe = useMemo(() => {
    if (!activeFurnace.inputSlot.item || activeFurnace.inputSlot.count <= 0) return null;
    return getFurnaceRecipeForInput(activeFurnace.inputSlot.item);
  }, [activeFurnace.inputSlot]);

  const placeInventoryItemIntoFurnaceInput = (
    isHotbar: boolean,
    slotIdx: number,
    placeAll: boolean = false
  ) => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const srcList = isHotbar ? newHotbar : newInventory;
    const srcSlot = srcList[slotIdx];
    if (!srcSlot || !srcSlot.item || srcSlot.count <= 0) return;

    const itemToPlace = srcSlot.item;
    const smeltRec = getFurnaceRecipeForInput(itemToPlace);
    if (!smeltRec) {
      soundManager.playStep('stone');
      setStatusFeedback(`${itemToPlace.name} cannot be smelted in the Furnace!`);
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }

    const nextF = cloneFurnaceState(furnaceRef.current);
    const destSlot = nextF.inputSlot;
    const maxStack = itemToPlace.maxStack || 64;

    if (!destSlot.item || destSlot.count <= 0) {
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      destSlot.item = itemToPlace;
      destSlot.count = take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
      nextF.smeltProgress = 0;
    } else if (destSlot.item.id === itemToPlace.id) {
      if (destSlot.count >= maxStack) return;
      const canAdd = maxStack - destSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, canAdd) : Math.min(1, srcSlot.count, canAdd);
      destSlot.count += take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else {
      const existingItem = destSlot.item;
      const existingCount = destSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
      addItemToSlots(newHotbar, newInventory, existingItem, existingCount);
      destSlot.item = itemToPlace;
      destSlot.count = take;
      nextF.smeltProgress = 0;
    }

    commitFurnace(nextF);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('stone');
  };

  const placeInventoryItemIntoFurnaceFuel = (
    isHotbar: boolean,
    slotIdx: number,
    fuelIdx: number,
    placeAll: boolean = false
  ) => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const srcList = isHotbar ? newHotbar : newInventory;
    const srcSlot = srcList[slotIdx];
    if (!srcSlot || !srcSlot.item || srcSlot.count <= 0) return;

    const itemToPlace = srcSlot.item;
    if (!isFuelItem(itemToPlace)) {
      soundManager.playStep('stone');
      setStatusFeedback(`${itemToPlace.name} is not a valid fuel source!`);
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }

    const nextF = cloneFurnaceState(furnaceRef.current);
    const destSlot = nextF.fuelSlots[fuelIdx];
    const maxStack = itemToPlace.maxStack || 64;

    if (!destSlot.item || destSlot.count <= 0) {
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      destSlot.item = itemToPlace;
      destSlot.count = take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else if (destSlot.item.id === itemToPlace.id) {
      if (destSlot.count >= maxStack) return;
      const canAdd = maxStack - destSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, canAdd) : Math.min(1, srcSlot.count, canAdd);
      destSlot.count += take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else {
      const existingItem = destSlot.item;
      const existingCount = destSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
      addItemToSlots(newHotbar, newInventory, existingItem, existingCount);
      destSlot.item = itemToPlace;
      destSlot.count = take;
    }

    commitFurnace(nextF);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('wood');
  };

  const handleFurnaceInputClick = (e: React.MouseEvent) => {
    if (selectedSlotIndex) {
      const srcList = selectedSlotIndex.isHotbar ? slotsRef.current.hotbar : slotsRef.current.inventory;
      const srcSlot = srcList[selectedSlotIndex.index];
      if (srcSlot && srcSlot.item && srcSlot.count > 0) {
        const placeAll = e.shiftKey;
        const valid = Boolean(getFurnaceRecipeForInput(srcSlot.item));
        const remaining = valid ? (placeAll ? 0 : srcSlot.count - 1) : srcSlot.count;
        placeInventoryItemIntoFurnaceInput(selectedSlotIndex.isHotbar, selectedSlotIndex.index, placeAll);
        if (valid && remaining <= 0) {
          setSelectedSlotIndex(null);
        }
        return;
      }
      setSelectedSlotIndex(null);
      return;
    }

    const existing = furnaceRef.current.inputSlot;
    if (existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const nextF = cloneFurnaceState(furnaceRef.current);
      if (addItemToSlots(newHotbar, newInventory, existing.item, existing.count)) {
        nextF.inputSlot = { item: null, count: 0 };
        nextF.smeltProgress = 0;
        commitFurnace(nextF);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('stone');
      }
    }
  };

  const handleFurnaceInputContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedSlotIndex) {
      handleFurnaceInputClick(e);
      return;
    }
    const existing = furnaceRef.current.inputSlot;
    if (existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const nextF = cloneFurnaceState(furnaceRef.current);
      if (addItemToSlots(newHotbar, newInventory, existing.item, 1)) {
        nextF.inputSlot.count -= 1;
        if (nextF.inputSlot.count <= 0) {
          nextF.inputSlot.item = null;
          nextF.inputSlot.count = 0;
          nextF.smeltProgress = 0;
        }
        commitFurnace(nextF);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('stone');
      }
    }
  };

  const handleFurnaceFuelClick = (e: React.MouseEvent, fuelIdx: number) => {
    if (selectedSlotIndex) {
      const srcList = selectedSlotIndex.isHotbar ? slotsRef.current.hotbar : slotsRef.current.inventory;
      const srcSlot = srcList[selectedSlotIndex.index];
      if (srcSlot && srcSlot.item && srcSlot.count > 0) {
        const placeAll = e.shiftKey;
        const valid = isFuelItem(srcSlot.item);
        const remaining = valid ? (placeAll ? 0 : srcSlot.count - 1) : srcSlot.count;
        placeInventoryItemIntoFurnaceFuel(selectedSlotIndex.isHotbar, selectedSlotIndex.index, fuelIdx, placeAll);
        if (valid && remaining <= 0) {
          setSelectedSlotIndex(null);
        }
        return;
      }
      setSelectedSlotIndex(null);
      return;
    }

    const existing = furnaceRef.current.fuelSlots[fuelIdx];
    if (existing && existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const nextF = cloneFurnaceState(furnaceRef.current);
      if (addItemToSlots(newHotbar, newInventory, existing.item, existing.count)) {
        nextF.fuelSlots[fuelIdx].item = null;
        nextF.fuelSlots[fuelIdx].count = 0;
        commitFurnace(nextF);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('wood');
      }
    }
  };

  const handleFurnaceFuelContextMenu = (e: React.MouseEvent, fuelIdx: number) => {
    e.preventDefault();
    if (selectedSlotIndex) {
      handleFurnaceFuelClick(e, fuelIdx);
      return;
    }
    const existing = furnaceRef.current.fuelSlots[fuelIdx];
    if (existing && existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const nextF = cloneFurnaceState(furnaceRef.current);
      if (addItemToSlots(newHotbar, newInventory, existing.item, 1)) {
        nextF.fuelSlots[fuelIdx].count -= 1;
        if (nextF.fuelSlots[fuelIdx].count <= 0) {
          nextF.fuelSlots[fuelIdx].item = null;
          nextF.fuelSlots[fuelIdx].count = 0;
        }
        commitFurnace(nextF);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('wood');
      }
    }
  };

  const handleFurnaceOutputClick = () => {
    const out = furnaceRef.current.outputSlot;
    if (!out.item || out.count <= 0) return;

    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const nextF = cloneFurnaceState(furnaceRef.current);

    if (addItemToSlots(newHotbar, newInventory, out.item, out.count)) {
      const collectedName = out.item.name;
      const collectedCount = out.count;
      nextF.outputSlot = { item: null, count: 0 };
      commitFurnace(nextF);
      commitSlots(newHotbar, newInventory);
      soundManager.playChime(660);
      setStatusFeedback(`Collected ${collectedCount}x ${collectedName}!`);
      setTimeout(() => setStatusFeedback(null), 1800);
    } else {
      soundManager.playStep('stone');
      setStatusFeedback('Inventory Full!');
      setTimeout(() => setStatusFeedback(null), 1800);
    }
  };

  const handleFurnaceDrop = (e: React.DragEvent, target: 'input' | number) => {
    e.preventDefault();
    setDragOverFurnaceSlot(null);
    setDragOverSlot(null);

    const src = parseDragSource(e);
    dragSourceRef.current = null;
    if (!src) return;

    if (src.type === 'inventory') {
      if (target === 'input') {
        placeInventoryItemIntoFurnaceInput(src.isHotbar, src.index, e.shiftKey);
      } else {
        placeInventoryItemIntoFurnaceFuel(src.isHotbar, src.index, target, e.shiftKey);
      }
      setSelectedSlotIndex(null);
    }
  };

  // Helper to load a smeltable recipe's input from player inventory into the Furnace Input slot
  const handleQuickLoadSmeltRecipe = (recipe: FurnaceSmeltRecipe) => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const nextF = cloneFurnaceState(furnaceRef.current);

    // Find matching input item in inventory/hotbar
    let foundSlot: InventorySlot | null = null;
    for (const slot of [...newHotbar, ...newInventory]) {
      if (!slot.item || slot.count <= 0) continue;
      const rMatch = getFurnaceRecipeForInput(slot.item);
      if (rMatch && rMatch.id === recipe.id) {
        foundSlot = slot;
        break;
      }
    }

    if (!foundSlot || !foundSlot.item) {
      soundManager.playStep('stone');
      setStatusFeedback(`No ${recipe.inputLabel} in your inventory!`);
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }

    if (nextF.inputSlot.item && nextF.inputSlot.item.id !== foundSlot.item.id && nextF.inputSlot.count > 0) {
      addItemToSlots(newHotbar, newInventory, nextF.inputSlot.item, nextF.inputSlot.count);
      nextF.inputSlot = { item: null, count: 0 };
      nextF.smeltProgress = 0;
    }

    const maxStack = foundSlot.item.maxStack || 64;
    if (!nextF.inputSlot.item || nextF.inputSlot.count <= 0) {
      nextF.inputSlot = { item: foundSlot.item, count: 1 };
      foundSlot.count -= 1;
      if (foundSlot.count <= 0) {
        foundSlot.item = null;
        foundSlot.count = 0;
      }
    } else if (nextF.inputSlot.count < maxStack) {
      nextF.inputSlot.count += 1;
      foundSlot.count -= 1;
      if (foundSlot.count <= 0) {
        foundSlot.item = null;
        foundSlot.count = 0;
      }
    }

    commitFurnace(nextF);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('stone');
  };

  // Distribute fuel from inventory across N fuel slots (1 to 5) to set desired fire temperature
  const handleAutoFillFuelSlots = (targetSlotCount: number) => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const nextF = cloneFurnaceState(furnaceRef.current);

    let filled = 0;
    for (let i = 0; i < 5; i++) {
      if (filled >= targetSlotCount) break;
      const fSlot = nextF.fuelSlots[i];
      if (fSlot.burnRemaining > 0 || (fSlot.item && fSlot.count > 0)) {
        filled++;
        continue;
      }

      // Find best available fuel in inventory (prefer charcoal/logs/planks)
      for (const invSlot of [...newHotbar, ...newInventory]) {
        if (invSlot.item && invSlot.count > 0 && isFuelItem(invSlot.item)) {
          fSlot.item = invSlot.item;
          fSlot.count = 1;
          invSlot.count -= 1;
          if (invSlot.count <= 0) {
            invSlot.item = null;
            invSlot.count = 0;
          }
          filled++;
          break;
        }
      }
    }

    commitFurnace(nextF);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('wood');
  };

  const handleClearUnburnedFuel = () => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const nextF = cloneFurnaceState(furnaceRef.current);

    for (let i = 0; i < 5; i++) {
      const fSlot = nextF.fuelSlots[i];
      if (fSlot.item && fSlot.count > 0) {
        if (addItemToSlots(newHotbar, newInventory, fSlot.item, fSlot.count)) {
          fSlot.item = null;
          fSlot.count = 0;
        }
      }
    }

    commitFurnace(nextF);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('wood');
  };

  // ============================================================
  // STONE BENCH: 1 Stone Slot + 1 Flint Slot + 16x16 Carving Grid
  // ============================================================
  const hasStoneAndFlintLoaded =
    !!stoneBenchStone.item &&
    stoneBenchStone.count >= 1 &&
    !!stoneBenchFlint.item &&
    stoneBenchFlint.count >= 1;

  const placeInventoryItemIntoStoneBench = (
    isHotbar: boolean,
    slotIdx: number,
    targetSlotType: 'stone' | 'flint',
    placeAll: boolean = false
  ) => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const newStone = { ...stoneBenchSlotsRef.current.stone };
    const newFlint = { ...stoneBenchSlotsRef.current.flint };

    const srcList = isHotbar ? newHotbar : newInventory;
    const srcSlot = srcList[slotIdx];
    if (!srcSlot || !srcSlot.item || srcSlot.count <= 0) return;

    const itemToPlace = srcSlot.item;
    if (targetSlotType === 'stone' && !isStone(itemToPlace)) {
      soundManager.playStep('stone');
      setStatusFeedback('Top slot requires any Stone block!');
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }
    if (targetSlotType === 'flint' && !isFlint(itemToPlace)) {
      soundManager.playStep('stone');
      setStatusFeedback('Bottom slot requires Flint!');
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }

    const destSlot = targetSlotType === 'stone' ? newStone : newFlint;
    const maxStack = itemToPlace.maxStack || 64;

    if (!destSlot.item || destSlot.count <= 0) {
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      destSlot.item = itemToPlace;
      destSlot.count = take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else if (destSlot.item.id === itemToPlace.id) {
      if (destSlot.count >= maxStack) return;
      const canAdd = maxStack - destSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, canAdd) : Math.min(1, srcSlot.count, canAdd);
      destSlot.count += take;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
    } else {
      const existingItem = destSlot.item;
      const existingCount = destSlot.count;
      const take = placeAll ? Math.min(srcSlot.count, maxStack) : 1;
      srcSlot.count -= take;
      if (srcSlot.count <= 0) {
        srcSlot.item = null;
        srcSlot.count = 0;
      }
      addItemToSlots(newHotbar, newInventory, existingItem, existingCount);
      destSlot.item = itemToPlace;
      destSlot.count = take;
    }

    commitStoneBenchSlots(newStone, newFlint);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('stone');
  };

  const handleStoneBenchSlotClick = (e: React.MouseEvent, slotType: 'stone' | 'flint') => {
    if (selectedSlotIndex) {
      const srcList = selectedSlotIndex.isHotbar ? slotsRef.current.hotbar : slotsRef.current.inventory;
      const srcSlot = srcList[selectedSlotIndex.index];
      if (srcSlot && srcSlot.item && srcSlot.count > 0) {
        const placeAll = e.shiftKey;
        const valid = slotType === 'stone' ? isStone(srcSlot.item) : isFlint(srcSlot.item);
        const remainingAfterPlace = valid ? (placeAll ? 0 : srcSlot.count - 1) : srcSlot.count;
        placeInventoryItemIntoStoneBench(selectedSlotIndex.isHotbar, selectedSlotIndex.index, slotType, placeAll);
        if (valid && remainingAfterPlace <= 0) {
          setSelectedSlotIndex(null);
        }
        return;
      }
      setSelectedSlotIndex(null);
      return;
    }

    const existing = slotType === 'stone' ? stoneBenchSlotsRef.current.stone : stoneBenchSlotsRef.current.flint;
    if (existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const newStone = { ...stoneBenchSlotsRef.current.stone };
      const newFlint = { ...stoneBenchSlotsRef.current.flint };

      if (addItemToSlots(newHotbar, newInventory, existing.item, existing.count)) {
        if (slotType === 'stone') {
          newStone.item = null;
          newStone.count = 0;
        } else {
          newFlint.item = null;
          newFlint.count = 0;
        }
        commitStoneBenchSlots(newStone, newFlint);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('stone');
      }
    }
  };

  const handleStoneBenchSlotContextMenu = (e: React.MouseEvent, slotType: 'stone' | 'flint') => {
    e.preventDefault();
    if (selectedSlotIndex) {
      handleStoneBenchSlotClick(e, slotType);
      return;
    }

    const existing = slotType === 'stone' ? stoneBenchSlotsRef.current.stone : stoneBenchSlotsRef.current.flint;
    if (existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const newStone = { ...stoneBenchSlotsRef.current.stone };
      const newFlint = { ...stoneBenchSlotsRef.current.flint };
      const target = slotType === 'stone' ? newStone : newFlint;

      if (addItemToSlots(newHotbar, newInventory, existing.item, 1)) {
        target.count -= 1;
        if (target.count <= 0) {
          target.item = null;
          target.count = 0;
        }
        commitStoneBenchSlots(newStone, newFlint);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('stone');
      }
    }
  };

  const handleStoneBenchDrop = (e: React.DragEvent, slotType: 'stone' | 'flint') => {
    e.preventDefault();
    setDragOverStoneBenchSlot(null);
    setDragOverSlot(null);

    const src = parseDragSource(e);
    dragSourceRef.current = null;
    if (!src) return;

    if (src.type === 'inventory') {
      placeInventoryItemIntoStoneBench(src.isHotbar, src.index, slotType, e.shiftKey);
      setSelectedSlotIndex(null);
    }
  };

  const handleQuickLoadStoneBench = () => {
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const newStone = { ...stoneBenchSlotsRef.current.stone };
    const newFlint = { ...stoneBenchSlotsRef.current.flint };

    if (!newStone.item || newStone.count <= 0) {
      for (const slot of [...newHotbar, ...newInventory]) {
        if (slot.item && isStone(slot.item) && slot.count > 0) {
          newStone.item = slot.item;
          newStone.count = 1;
          slot.count--;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
          break;
        }
      }
    }

    if (!newFlint.item || newFlint.count <= 0) {
      for (const slot of [...newHotbar, ...newInventory]) {
        if (slot.item && isFlint(slot.item) && slot.count > 0) {
          newFlint.item = slot.item;
          newFlint.count = 1;
          slot.count--;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
          break;
        }
      }
    }

    commitStoneBenchSlots(newStone, newFlint);
    commitSlots(newHotbar, newInventory);
    soundManager.playStep('stone');
  };

  // Evaluate 16x16 carved tiles against the 3 stone tool head templates
  const matchedStoneHeadResult = useMemo(() => {
    if (!hasStoneAndFlintLoaded) return null;

    const clickedCount = carvedTiles.filter(Boolean).length;
    if (clickedCount === 0 || clickedCount === 256) return null;

    const scoreMaskAgainstTemplate = (mask: boolean[], pattern: string[]): number => {
      let inter = 0;
      let union = 0;
      for (let i = 0; i < 256; i++) {
        const r = Math.floor(i / 16);
        const c = i % 16;
        const tVal = pattern[r][c] === '#';
        const mVal = mask[i];
        if (tVal && mVal) inter++;
        if (tVal || mVal) union++;
      }
      const directIoU = union > 0 ? inter / union : 0;

      // Also compute translation-invariant IoU so freehand carvings slightly shifted on the 16x16 grid match too
      let bestShiftedIoU = directIoU;
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          if (dr === 0 && dc === 0) continue;
          let sInter = 0;
          let sUnion = 0;
          for (let r = 0; r < 16; r++) {
            for (let c = 0; c < 16; c++) {
              const tr = r - dr;
              const tc = c - dc;
              const tVal = tr >= 0 && tr < 16 && tc >= 0 && tc < 16 ? pattern[tr][tc] === '#' : false;
              const mVal = mask[r * 16 + c];
              if (tVal && mVal) sInter++;
              if (tVal || mVal) sUnion++;
            }
          }
          const iou = sUnion > 0 ? sInter / sUnion : 0;
          if (iou > bestShiftedIoU) bestShiftedIoU = iou;
        }
      }
      return bestShiftedIoU;
    };

    const invertedMask = carvedTiles.map((v) => !v);
    let bestMatch: { template: (typeof STONE_HEAD_TEMPLATES)[0]; score: number } | null = null;

    for (const tmpl of STONE_HEAD_TEMPLATES) {
      const scoreClicked = clickedCount >= 16 && clickedCount <= 135
        ? scoreMaskAgainstTemplate(carvedTiles, tmpl.pattern)
        : 0;
      const unclickedCount = 256 - clickedCount;
      const scoreRemaining = unclickedCount >= 16 && unclickedCount <= 135
        ? scoreMaskAgainstTemplate(invertedMask, tmpl.pattern)
        : 0;

      const score = Math.max(scoreClicked, scoreRemaining);
      // Slight tie-breaker preference for the currently selected guide
      const effectiveScore = tmpl.id === selectedHeadGuide ? score + 0.02 : score;

      if (score >= 0.52 && (!bestMatch || effectiveScore > bestMatch.score)) {
        bestMatch = { template: tmpl, score: effectiveScore };
      }
    }

    return bestMatch;
  }, [carvedTiles, hasStoneAndFlintLoaded, selectedHeadGuide]);

  const handleCarveTile = (idx: number, nextVal: boolean) => {
    if (!hasStoneAndFlintLoaded) {
      soundManager.playStep('stone');
      setStatusFeedback('Insert 1 Stone block and 1 Flint on the left first!');
      setTimeout(() => setStatusFeedback(null), 1800);
      return;
    }
    setCarvedTiles((prev) => {
      if (prev[idx] === nextVal) return prev;
      const copy = [...prev];
      copy[idx] = nextVal;
      return copy;
    });
    soundManager.playDigChip('stone');
  };

  const handleFinishStoneCarving = () => {
    if (!hasStoneAndFlintLoaded || !matchedStoneHeadResult) return;

    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
    const newStone = { ...stoneBenchSlotsRef.current.stone };
    const newFlint = { ...stoneBenchSlotsRef.current.flint };

    const resultItem = matchedStoneHeadResult.template.item;
    if (!addItemToSlots(newHotbar, newInventory, resultItem, 1)) {
      soundManager.playStep('stone');
      setStatusFeedback('Inventory Full!');
      return;
    }

    // Consume 1 stone and 1 flint
    newStone.count -= 1;
    if (newStone.count <= 0) {
      newStone.item = null;
      newStone.count = 0;
    }
    newFlint.count -= 1;
    if (newFlint.count <= 0) {
      newFlint.item = null;
      newFlint.count = 0;
    }

    commitStoneBenchSlots(newStone, newFlint);
    commitSlots(newHotbar, newInventory);
    setCarvedTiles(Array(256).fill(false));
    soundManager.playBlockBreak('stone');
    soundManager.playChime(660);
    setStatusFeedback(`Carved ${resultItem.name}!`);
    setTimeout(() => setStatusFeedback(null), 1800);
  };

  // Click interaction on 3x3 crafting grid slot (places held item or returns grid stack to inventory)
  const handleGridSlotClick = (e: React.MouseEvent, gridIndex: number) => {
    if (selectedSlotIndex) {
      const srcList = selectedSlotIndex.isHotbar ? slotsRef.current.hotbar : slotsRef.current.inventory;
      const srcSlot = srcList[selectedSlotIndex.index];
      if (srcSlot && srcSlot.item && srcSlot.count > 0) {
        const placeAll = e.shiftKey;
        const remainingAfterPlace = placeAll ? 0 : srcSlot.count - 1;
        placeInventoryItemIntoGrid(selectedSlotIndex.isHotbar, selectedSlotIndex.index, gridIndex, placeAll);
        if (remainingAfterPlace <= 0) {
          setSelectedSlotIndex(null);
        }
        return;
      }
      setSelectedSlotIndex(null);
      return;
    }

    const existing = gridSlotsRef.current[gridIndex];
    if (existing && existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const newGrid = gridSlotsRef.current.map((s) => ({ ...s }));

      if (addItemToSlots(newHotbar, newInventory, existing.item, existing.count)) {
        newGrid[gridIndex] = { item: null, count: 0 };
        commitGridSlots(newGrid);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('wood');
      }
    }
  };

  // Right-click interaction on 3x3 crafting grid slot (places 1 held item or removes 1 item from grid stack)
  const handleGridSlotContextMenu = (e: React.MouseEvent, gridIndex: number) => {
    e.preventDefault();
    if (selectedSlotIndex) {
      const srcList = selectedSlotIndex.isHotbar ? slotsRef.current.hotbar : slotsRef.current.inventory;
      const srcSlot = srcList[selectedSlotIndex.index];
      if (srcSlot && srcSlot.item && srcSlot.count > 0) {
        const remainingAfterPlace = srcSlot.count - 1;
        placeInventoryItemIntoGrid(selectedSlotIndex.isHotbar, selectedSlotIndex.index, gridIndex, false);
        if (remainingAfterPlace <= 0) {
          setSelectedSlotIndex(null);
        }
      }
      return;
    }

    const existing = gridSlotsRef.current[gridIndex];
    if (existing && existing.item && existing.count > 0) {
      const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
      const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));
      const newGrid = gridSlotsRef.current.map((s) => ({ ...s }));

      if (addItemToSlots(newHotbar, newInventory, existing.item, 1)) {
        newGrid[gridIndex].count -= 1;
        if (newGrid[gridIndex].count <= 0) {
          newGrid[gridIndex] = { item: null, count: 0 };
        }
        commitGridSlots(newGrid);
        commitSlots(newHotbar, newInventory);
        soundManager.playStep('wood');
      }
    }
  };

  // Recipe Categories
  const categories = useMemo(() => {
    if (initialStation === 'tool_crafter') {
      return [
        { id: 'all', name: 'All Tools' },
        { id: 'pickaxes', name: 'Pickaxes' },
        { id: 'axes', name: 'Axes' },
        { id: 'shovels', name: 'Shovels' },
        { id: 'hoes', name: 'Hoes' }
      ];
    }
    return [
      { id: 'all', name: 'All Recipes' },
      { id: 'tools', name: 'Tools' },
      { id: 'planks', name: 'Planks' },
      { id: 'workstations', name: 'Workstations' },
      { id: 'blocks', name: 'Blocks' }
    ];
  }, [initialStation]);

  // Filtered & Sorted Assembly Recipes (only wooden tools included in main crafting inventory)
  const processedRecipes = useMemo(() => {
    let list = [...mainCraftingRecipes];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((r) => {
        if (r.category === selectedCategory) return true;
        if (selectedCategory === 'pickaxes' && r.result.id === 'wooden_pickaxe') return true;
        if (selectedCategory === 'axes' && r.result.id === 'wooden_axe') return true;
        if (selectedCategory === 'shovels' && r.result.id === 'wooden_shovel') return true;
        if (selectedCategory === 'hoes' && r.result.id === 'wooden_hoe') return true;
        return false;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const nameMatch = r.result.name.toLowerCase().includes(q);
        const ingMatch = r.ingredients.some((ing) => ing.itemId.toLowerCase().includes(q));
        return nameMatch || ingMatch;
      });
    }

    // Sorting
    if (sortBy === 'craftable') {
      list.sort((a, b) => {
        const aCan = canCraftRecipe(a) ? 1 : 0;
        const bCan = canCraftRecipe(b) ? 1 : 0;
        if (bCan !== aCan) return bCan - aCan;
        return a.result.name.localeCompare(b.result.name);
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.result.name.localeCompare(b.result.name));
    }

    return list;
  }, [mainCraftingRecipes, selectedCategory, searchQuery, sortBy, localHotbar, localInventory]);

  // EXACT ORIGINAL INVENTORY SLOT INTERACTION (100% PRESERVED MECHANICS)
  const handleSlotClick = (isHotbar: boolean, index: number) => {
    const currentHotbar = slotsRef.current.hotbar;
    const currentInv = slotsRef.current.inventory;

    if (!selectedSlotIndex) {
      const sourceSlots = isHotbar ? currentHotbar : currentInv;
      if (sourceSlots[index]?.item) {
        setSelectedSlotIndex({ isHotbar, index });
        soundManager.playStep('sand');
      }
    } else {
      const newHotbar = currentHotbar.map((s) => ({ ...s }));
      const newInventory = currentInv.map((s) => ({ ...s }));

      const srcList = selectedSlotIndex.isHotbar ? newHotbar : newInventory;
      const destList = isHotbar ? newHotbar : newInventory;

      const srcSlot = srcList[selectedSlotIndex.index];
      const destSlot = destList[index];

      if (selectedSlotIndex.isHotbar === isHotbar && selectedSlotIndex.index === index) {
        setSelectedSlotIndex(null);
        return;
      }

      if (srcSlot.item && destSlot.item && srcSlot.item.id === destSlot.item.id && destSlot.count < (destSlot.item.maxStack || 64)) {
        const maxStack = destSlot.item.maxStack || 64;
        const canTake = maxStack - destSlot.count;
        const take = Math.min(srcSlot.count, canTake);
        destSlot.count += take;
        srcSlot.count -= take;
        if (srcSlot.count <= 0) {
          srcSlot.item = null;
          srcSlot.count = 0;
        }
      } else {
        const tempItem = destSlot.item;
        const tempCount = destSlot.count;
        destSlot.item = srcSlot.item;
        destSlot.count = srcSlot.count;
        srcSlot.item = tempItem;
        srcSlot.count = tempCount;
      }

      setSelectedSlotIndex(null);
      soundManager.playStep('sand');
      commitSlots(newHotbar, newInventory);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyE' || e.code === 'Escape') {
        e.preventDefault();
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const totalCraftable = useMemo(() => {
    return mainCraftingRecipes.filter((r) => canCraftRecipe(r)).length;
  }, [mainCraftingRecipes, localHotbar, localInventory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 select-none">
      
      {/* Heavy Sharp Voxel Game Window Frame */}
      <div className="flex h-[96vh] max-h-[880px] w-full max-w-4xl flex-col border-4 border-t-stone-600 border-l-stone-600 border-b-stone-950 border-r-stone-950 bg-stone-950 text-stone-100 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        
        {/* ============================================================ */}
        {/* TOP BAR: Clean Title Bar (No Extra Tabs)                    */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between border-b-2 border-stone-800 px-3 py-2 bg-stone-900 shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-t-amber-400 border-l-amber-400 border-b-amber-900 border-r-amber-900 bg-amber-600 text-stone-950 font-bold uppercase text-xs">
              {initialStation === 'heater' ? (
                <Flame className="h-4 w-4" />
              ) : initialStation === 'cooler' ? (
                <Snowflake className="h-4 w-4" />
              ) : initialStation === 'forge' ? (
                <Hammer className="h-4 w-4" />
              ) : initialStation === 'furnace' ? (
                <Flame className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              <span>
                {initialStation === 'heater'
                  ? 'Thermal Heater Workstation — Radiator'
                  : initialStation === 'cooler'
                  ? 'Cryo Cooler Workstation — Condenser'
                  : initialStation === 'forge'
                  ? 'Advanced Metallurgy Forge — Tool Heads & Mold Studio'
                  : initialStation === 'furnace'
                  ? 'Stone Furnace — 5-Fuel Thermal Smelter'
                  : initialStation === 'stone_bench'
                  ? 'Stone Bench — 16x16 Manual Stone Carving'
                  : initialStation === 'tool_crafter'
                  ? 'Tool Crafter Workbench'
                  : '3x3 Assembly Workbench'}
              </span>
            </div>
            {initialStation !== 'stone_bench' &&
              initialStation !== 'furnace' &&
              initialStation !== 'forge' &&
              initialStation !== 'heater' &&
              initialStation !== 'cooler' && (
              <span className="text-[11px] text-stone-400 hidden sm:inline">
                {totalCraftable} craftable recipes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {statusFeedback && (
              <span className="text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 border border-amber-500/80">
                {statusFeedback}
              </span>
            )}

            <button
              id="btn-close-modal"
              onClick={handleSafeClose}
              className="flex h-7 w-7 items-center justify-center border-2 border-t-stone-600 border-l-stone-600 border-b-stone-950 border-r-stone-950 bg-stone-850 text-stone-300 hover:bg-rose-900 hover:text-white transition cursor-pointer"
              title="Close (E / Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. TOP HALF: FURNACE, STONE BENCH, OR 3x3 WORKBENCH          */}
        {/* ============================================================ */}
        {initialStation === 'furnace' ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 gap-3 overflow-hidden bg-stone-950 border-b-2 border-stone-800 font-mono">
            {/* LEFT: Smelting Recipes & Minimum Temperature Guide + Fuel Durations */}
            <div className="flex-[2] flex flex-col justify-between bg-stone-900 border-2 border-stone-800 p-2.5 min-w-[250px] overflow-y-auto scrollbar-thin">
              <div>
                <div className="border-b border-stone-800 pb-1.5 mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                    Smelting Recipes (~15s/item)
                  </span>
                  <span className="text-[10px] text-stone-400">Min Temp 1–5</span>
                </div>

                <div className="space-y-1 mb-3">
                  {FURNACE_SMELTING_RECIPES.map((sr) => {
                    const tempMet = currentFurnaceTemp >= sr.minTemp;
                    const isCurrentInput = activeSmeltRecipe?.id === sr.id;
                    return (
                      <div
                        key={sr.id}
                        className={`flex items-center justify-between p-1.5 border text-xs ${
                          isCurrentInput
                            ? 'border-amber-400 bg-amber-950/40'
                            : 'border-stone-800 bg-stone-950/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon item={sr.result} className="w-6 h-6 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-stone-200 text-[11px] truncate">
                              {sr.inputLabel} → {sr.result.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span
                                className={`px-1 border font-bold ${
                                  tempMet
                                    ? 'border-emerald-600/80 bg-emerald-950/60 text-emerald-300'
                                    : 'border-amber-700/80 bg-amber-950/50 text-amber-300'
                                }`}
                              >
                                Min Temp: {sr.minTemp}
                              </span>
                              <span className="text-stone-500">{sr.smeltTime}s</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleQuickLoadSmeltRecipe(sr)}
                          className="px-2 py-1 text-[10px] uppercase font-bold border border-stone-700 bg-stone-900 text-amber-300 hover:bg-stone-800 cursor-pointer shrink-0"
                          title={`Load 1 ${sr.inputLabel} from inventory`}
                        >
                          Load
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fuel Sources Reference */}
              <div className="border-t border-stone-800 pt-2">
                <div className="text-[10px] font-bold uppercase text-orange-400 mb-1">
                  Fuel Sources & Burn Durations:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {FUEL_SOURCE_GUIDE.map((fg) => (
                    <div
                      key={fg.name}
                      className="flex items-center justify-between px-1.5 py-0.5 bg-stone-950 border border-stone-800 text-stone-300"
                      title={fg.description}
                    >
                      <span className="truncate">{fg.name}</span>
                      <span className="font-bold text-amber-400 ml-1">{fg.duration}s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Interactive Furnace Chamber, Temperature Gauge (1-5), & 5 Fuel Slots */}
            <div className="flex-[3] flex flex-col justify-between gap-2.5 p-3 bg-stone-900 border-2 border-stone-800 min-h-0">
              {/* 1. TOP: SMELTING CHAMBER (Input -> 15s Progress -> Output) */}
              <div className="flex items-center justify-between gap-3 p-3 bg-stone-950 border-2 border-stone-800">
                {/* Input Slot */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">Smelt Input</span>
                  <div
                    id="furnace-input-slot"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFurnaceSlot('input');
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverFurnaceSlot('input');
                    }}
                    onDragLeave={() => setDragOverFurnaceSlot(null)}
                    onDrop={(e) => handleFurnaceDrop(e, 'input')}
                    onClick={handleFurnaceInputClick}
                    onContextMenu={handleFurnaceInputContextMenu}
                    onMouseEnter={() =>
                      activeFurnace.inputSlot.item &&
                      setHoveredItem({
                        item: activeFurnace.inputSlot.item,
                        count: activeFurnace.inputSlot.count
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                    title="Place Iron Ore, Gold Ore, Tin Ore, Wood Log, Sand, Cobblestone, etc. here"
                    className={`relative flex h-14 w-14 items-center justify-center border-2 transition-all cursor-pointer ${
                      dragOverFurnaceSlot === 'input'
                        ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105'
                        : activeFurnace.inputSlot.item
                        ? 'border-amber-500 bg-stone-900 hover:border-amber-300'
                        : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-500/60'
                    }`}
                  >
                    {activeFurnace.inputSlot.item ? (
                      <>
                        <ItemIcon item={activeFurnace.inputSlot.item} className="w-9 h-9 drop-shadow" />
                        {activeFurnace.inputSlot.count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[10px] font-black text-amber-300 pointer-events-none">
                            {activeFurnace.inputSlot.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] text-stone-600 uppercase text-center leading-tight px-1 pointer-events-none">
                        Ore / Log
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold min-h-[14px]">
                    {activeSmeltRecipe
                      ? `Needs Temp ≥ ${activeSmeltRecipe.minTemp}`
                      : activeFurnace.inputSlot.item
                      ? activeFurnace.inputSlot.item.name
                      : 'Empty'}
                  </span>
                </div>

                {/* Center: 15s Smelting Progress Bar */}
                <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                  <div className="flex items-center justify-between w-full text-[10px]">
                    <span className="font-bold uppercase text-amber-400">
                      {activeSmeltRecipe
                        ? currentFurnaceTemp >= activeSmeltRecipe.minTemp
                          ? `Smelting ${activeSmeltRecipe.result.name}...`
                          : `Need Temp ${activeSmeltRecipe.minTemp} (Have ${currentFurnaceTemp})`
                        : 'Smelting Progress'}
                    </span>
                    <span className="font-bold text-stone-300">
                      {activeFurnace.smeltProgress.toFixed(1)}s / {SMELT_DURATION_SECONDS.toFixed(0)}s
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div className="w-full h-5 bg-stone-900 border-2 border-stone-700 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-400 transition-all duration-100"
                      style={{
                        width: `${Math.min(100, (activeFurnace.smeltProgress / SMELT_DURATION_SECONDS) * 100)}%`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">
                      {Math.round(Math.min(100, (activeFurnace.smeltProgress / SMELT_DURATION_SECONDS) * 100))}%
                    </div>
                  </div>

                  <span className="text-[10px] text-stone-400 text-center">
                    {activeSmeltRecipe && currentFurnaceTemp < activeSmeltRecipe.minTemp ? (
                      <span className="text-rose-400 font-bold">
                        Fire too cool! Fill at least {activeSmeltRecipe.minTemp} fuel slots below.
                      </span>
                    ) : activeSmeltRecipe ? (
                      <span className="text-emerald-400">
                        Produces 1x {activeSmeltRecipe.result.name} every 15s
                      </span>
                    ) : (
                      'Place ore or wood in the input slot to smelt'
                    )}
                  </span>
                </div>

                {/* Output Slot */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">Smelted Output</span>
                  <div
                    id="furnace-output-slot"
                    onClick={handleFurnaceOutputClick}
                    onMouseEnter={() =>
                      activeFurnace.outputSlot.item &&
                      setHoveredItem({
                        item: activeFurnace.outputSlot.item,
                        count: activeFurnace.outputSlot.count
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                    title={
                      activeFurnace.outputSlot.item
                        ? `Click to collect ${activeFurnace.outputSlot.count}x ${activeFurnace.outputSlot.item.name}`
                        : 'Smelted output appears here'
                    }
                    className={`relative flex h-14 w-14 items-center justify-center border-2 transition-all ${
                      activeFurnace.outputSlot.item
                        ? 'border-emerald-500 bg-stone-900 hover:border-amber-300 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900'
                    }`}
                  >
                    {activeFurnace.outputSlot.item ? (
                      <>
                        <ItemIcon item={activeFurnace.outputSlot.item} className="w-9 h-9 drop-shadow" />
                        {activeFurnace.outputSlot.count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-amber-500 border border-stone-950 px-1 text-[10px] font-black text-stone-950 pointer-events-none">
                            {activeFurnace.outputSlot.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] text-stone-600 uppercase text-center leading-tight px-1 pointer-events-none">
                        Output
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold min-h-[14px]">
                    {activeFurnace.outputSlot.item
                      ? `${activeFurnace.outputSlot.item.name} (Click)`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* 2. MIDDLE: TEMPERATURE GAUGE (1 = Absolute Min, 5 = Absolute Max) */}
              <div className="p-2.5 bg-stone-950 border-2 border-stone-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Thermometer
                      className={`h-4 w-4 ${
                        currentFurnaceTemp >= 4
                          ? 'text-red-400'
                          : currentFurnaceTemp >= 1
                          ? 'text-amber-400'
                          : 'text-stone-500'
                      }`}
                    />
                    <span className="font-bold uppercase text-stone-200">
                      Fire Temperature Gauge:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-black border ${
                        currentFurnaceTemp === 0
                          ? 'border-stone-700 bg-stone-900 text-stone-400'
                          : currentFurnaceTemp >= (activeSmeltRecipe?.minTemp ?? 1)
                          ? 'border-orange-500 bg-orange-950 text-amber-300'
                          : 'border-rose-600 bg-rose-950 text-rose-300'
                      }`}
                    >
                      {currentFurnaceTemp === 0
                        ? '0 / 5 (Cold)'
                        : `Temp ${currentFurnaceTemp} / 5`}
                    </span>
                  </div>

                  <span className="text-[10px] text-stone-400">
                    1 = Absolute Min · 5 = Absolute Max
                  </span>
                </div>

                {/* 5-Segment Visual Temperature Bar */}
                <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isLit = currentFurnaceTemp >= level;
                    const isReqMin = activeSmeltRecipe?.minTemp === level;
                    const levelColors: Record<number, string> = {
                      1: 'bg-amber-600 border-amber-400 text-stone-950',
                      2: 'bg-orange-500 border-orange-300 text-stone-950',
                      3: 'bg-orange-600 border-amber-300 text-white',
                      4: 'bg-red-600 border-orange-300 text-white',
                      5: 'bg-rose-500 border-yellow-200 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                    };

                    return (
                      <div
                        key={`temp-gauge-${level}`}
                        className={`relative flex flex-col items-center justify-center py-1 px-1 border-2 transition-all ${
                          isLit
                            ? levelColors[level]
                            : isReqMin
                            ? 'border-amber-500/80 bg-stone-900 text-amber-300'
                            : 'border-stone-800 bg-stone-900 text-stone-500'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-black">
                          <Flame className={`h-3 w-3 ${isLit ? 'animate-pulse' : 'opacity-40'}`} />
                          <span>
                            {level === 1 ? '1 (Min)' : level === 5 ? '5 (Max)' : `Temp ${level}`}
                          </span>
                        </div>
                        {isReqMin && (
                          <span className="text-[8px] uppercase font-black tracking-tighter">
                            ★ Required Min
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. BOTTOM: 5 FUEL SLOTS (Number of filled slots determines Fire Temperature 1–5) */}
              <div className="p-2.5 bg-stone-950 border-2 border-stone-800 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs font-bold uppercase text-orange-400">
                      5 Fuel Slots ({currentFurnaceTemp}/5 Active)
                    </span>
                  </div>

                  {/* Quick-fill fuel buttons for 1..5 slots */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-stone-400 mr-0.5">Quick Fill:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={`qf-${n}`}
                        onClick={() => handleAutoFillFuelSlots(n)}
                        className="px-1.5 py-0.5 border border-stone-700 bg-stone-900 text-amber-300 hover:bg-stone-800 font-bold cursor-pointer"
                        title={`Auto-fill up to ${n} fuel slot(s) from inventory for Temp ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={handleClearUnburnedFuel}
                      className="ml-1 px-1.5 py-0.5 border border-stone-700 bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
                      title="Return unburned fuel stacks to inventory"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Row of 5 Fuel Slots */}
                <div className="grid grid-cols-5 gap-2">
                  {activeFurnace.fuelSlots.map((fSlot, fIdx) => {
                    const isBurning = fSlot.burnRemaining > 0;
                    const hasFuel = Boolean(fSlot.item && fSlot.count > 0);
                    const displayItem = fSlot.item || fSlot.burningItem;
                    const burnPct =
                      isBurning && fSlot.burnDuration > 0
                        ? Math.min(100, (fSlot.burnRemaining / fSlot.burnDuration) * 100)
                        : 0;
                    const isDragTarget = dragOverFurnaceSlot === `fuel_${fIdx}`;
                    const fuelDur = displayItem ? getFuelBurnDuration(displayItem) : 0;

                    return (
                      <div
                        key={`fuel-slot-${fIdx}`}
                        id={`furnace-fuel-slot-${fIdx}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverFurnaceSlot(`fuel_${fIdx}` as any);
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDragOverFurnaceSlot(`fuel_${fIdx}` as any);
                        }}
                        onDragLeave={() => setDragOverFurnaceSlot(null)}
                        onDrop={(e) => handleFurnaceDrop(e, fIdx)}
                        onClick={(e) => handleFurnaceFuelClick(e, fIdx)}
                        onContextMenu={(e) => handleFurnaceFuelContextMenu(e, fIdx)}
                        onMouseEnter={() =>
                          fSlot.item && setHoveredItem({ item: fSlot.item, count: fSlot.count })
                        }
                        onMouseLeave={() => setHoveredItem(null)}
                        title={
                          displayItem
                            ? `Fuel Slot #${fIdx + 1}: ${displayItem.name} (${fuelDur}s burn time per item)`
                            : `Fuel Slot #${fIdx + 1}: Place Wood, Planks, Charcoal, etc. here (+1 Fire Temp)`
                        }
                        className={`relative flex flex-col items-center justify-between p-1.5 border-2 transition-all cursor-pointer min-h-[76px] ${
                          isDragTarget
                            ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105'
                            : isBurning
                            ? 'border-orange-500 bg-orange-950/30 shadow-[inset_0_0_10px_rgba(249,115,22,0.3)]'
                            : hasFuel
                            ? 'border-amber-600/80 bg-stone-900 hover:border-amber-400'
                            : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-500/60'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between text-[9px]">
                          <span className="font-bold text-stone-400">#{fIdx + 1}</span>
                          {isBurning ? (
                            <span className="text-orange-400 font-black flex items-center gap-0.5">
                              <Flame className="h-2.5 w-2.5" />
                              {Math.ceil(fSlot.burnRemaining)}s
                            </span>
                          ) : hasFuel ? (
                            <span className="text-amber-400 font-bold">{fuelDur}s</span>
                          ) : null}
                        </div>

                        <div className="relative flex items-center justify-center my-0.5 h-9 w-9">
                          {displayItem ? (
                            <>
                              <ItemIcon
                                item={displayItem}
                                className={`w-8 h-8 drop-shadow ${
                                  !hasFuel && isBurning ? 'opacity-80' : ''
                                }`}
                              />
                              {fSlot.count > 0 && (
                                <span className="absolute -bottom-1 -right-1 bg-stone-950 border border-stone-800 px-1 text-[9px] font-black text-amber-300 pointer-events-none">
                                  {fSlot.count}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[9px] text-stone-600 uppercase pointer-events-none">
                              Fuel
                            </span>
                          )}
                        </div>

                        {/* Individual Slot Burn Time Bar */}
                        <div className="w-full h-1.5 bg-stone-950 border border-stone-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 transition-all duration-100"
                            style={{ width: `${hasFuel && !isBurning ? 100 : burnPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : initialStation === 'stone_bench' ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 gap-3 overflow-hidden bg-stone-950 border-b-2 border-stone-800 font-mono">
            {/* LEFT: 1 Stone Slot (Top) + 1 Flint Slot (Bottom) + Guide Selector */}
            <div className="flex-[2] flex flex-col justify-between bg-stone-900 border-2 border-stone-800 p-3 min-w-[230px]">
              <div>
                <div className="border-b border-stone-800 pb-1.5 mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-amber-400">Materials Input</span>
                  <button
                    onClick={handleQuickLoadStoneBench}
                    className="px-2 py-0.5 text-[10px] uppercase font-bold border border-stone-700 bg-stone-950 text-amber-300 hover:bg-stone-800 cursor-pointer"
                    title="Auto-load 1 Stone block and 1 Flint from your inventory"
                  >
                    Auto-Load
                  </button>
                </div>

                {/* Vertical Stack: Top Slot (1 Any Stone Block) & Bottom Slot (1 Flint) */}
                <div className="flex flex-col items-center gap-3 py-2 bg-stone-950/70 border border-stone-800 p-3">
                  {/* Top Slot: 1 of Any Stone Type Block */}
                  <div className="flex items-center gap-3 w-full">
                    <div
                      id="stone-bench-stone-slot"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverStoneBenchSlot('stone');
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverStoneBenchSlot('stone');
                      }}
                      onDragLeave={() => setDragOverStoneBenchSlot(null)}
                      onDrop={(e) => handleStoneBenchDrop(e, 'stone')}
                      onClick={(e) => handleStoneBenchSlotClick(e, 'stone')}
                      onContextMenu={(e) => handleStoneBenchSlotContextMenu(e, 'stone')}
                      title="Place 1 of any Stone type block here"
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center border-2 transition-all cursor-pointer ${
                        dragOverStoneBenchSlot === 'stone'
                          ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105'
                          : stoneBenchStone.item
                          ? 'border-emerald-600 bg-stone-900 hover:border-amber-400'
                          : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-500/60'
                      }`}
                    >
                      {stoneBenchStone.item ? (
                        <>
                          <ItemIcon item={stoneBenchStone.item} className="w-9 h-9 drop-shadow" />
                          {stoneBenchStone.count > 1 && (
                            <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[10px] font-black text-amber-300 pointer-events-none">
                              {stoneBenchStone.count}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[9px] text-stone-600 uppercase text-center leading-tight px-1 pointer-events-none">
                          Stone
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-stone-200">1x Any Stone Block</span>
                      <span className="text-[10px] text-stone-400">
                        {stoneBenchStone.item
                          ? `${stoneBenchStone.item.name} (${stoneBenchStone.count} loaded)`
                          : 'Drag or click stone block here'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Slot (Under Stone Slot): 1 Flint */}
                  <div className="flex items-center gap-3 w-full">
                    <div
                      id="stone-bench-flint-slot"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverStoneBenchSlot('flint');
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverStoneBenchSlot('flint');
                      }}
                      onDragLeave={() => setDragOverStoneBenchSlot(null)}
                      onDrop={(e) => handleStoneBenchDrop(e, 'flint')}
                      onClick={(e) => handleStoneBenchSlotClick(e, 'flint')}
                      onContextMenu={(e) => handleStoneBenchSlotContextMenu(e, 'flint')}
                      title="Place 1 Flint here"
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center border-2 transition-all cursor-pointer ${
                        dragOverStoneBenchSlot === 'flint'
                          ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105'
                          : stoneBenchFlint.item
                          ? 'border-emerald-600 bg-stone-900 hover:border-amber-400'
                          : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-500/60'
                      }`}
                    >
                      {stoneBenchFlint.item ? (
                        <>
                          <ItemIcon item={stoneBenchFlint.item} className="w-9 h-9 drop-shadow" />
                          {stoneBenchFlint.count > 1 && (
                            <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[10px] font-black text-amber-300 pointer-events-none">
                              {stoneBenchFlint.count}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[9px] text-stone-600 uppercase text-center leading-tight px-1 pointer-events-none">
                          Flint
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-stone-200">1x Flint Chisel</span>
                      <span className="text-[10px] text-stone-400">
                        {stoneBenchFlint.item
                          ? `${stoneBenchFlint.item.name} (${stoneBenchFlint.count} loaded)`
                          : 'Drag or click flint here'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shape Guide Selector */}
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase text-stone-400 mb-1.5">
                    Target Tool Head Shape Guide:
                  </div>
                  <div className="space-y-1">
                    {STONE_HEAD_TEMPLATES.map((tmpl) => {
                      const isSel = selectedHeadGuide === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          onClick={() => setSelectedHeadGuide(tmpl.id)}
                          className={`w-full flex items-center gap-2 p-1.5 border text-left transition cursor-pointer ${
                            isSel
                              ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                              : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <ItemIcon item={tmpl.item} className="w-6 h-6 shrink-0" />
                          <span className="text-xs font-bold truncate">{tmpl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-stone-500 border-t border-stone-800 pt-1.5">
                Consumes 1 Stone & 1 Flint when finished
              </div>
            </div>

            {/* RIGHT: 16x16 Manual Stone Carving Grid & Output */}
            <div className="flex-[3] flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-stone-900 border-2 border-stone-800 min-h-0">
              {/* 16x16 Carving Matrix */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-full flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-400 uppercase">16x16 Stone Carving Slab</span>
                  <button
                    onClick={() => setCarvedTiles(Array(256).fill(false))}
                    className="text-[10px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
                  >
                    Reset Slab
                  </button>
                </div>

                <div
                  className="grid p-1.5 bg-stone-950 border-2 border-stone-700 shadow-inner select-none"
                  style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
                  onMouseLeave={() => {
                    isCarvingMouseDownRef.current = false;
                  }}
                >
                  {carvedTiles.map((isCarved, idx) => {
                    const r = Math.floor(idx / 16);
                    const c = idx % 16;
                    const activeGuide = STONE_HEAD_TEMPLATES.find((t) => t.id === selectedHeadGuide)!;
                    const isGuideTile = activeGuide.pattern[r][c] === '#';

                    return (
                      <div
                        key={`carve-${idx}`}
                        data-carve-index={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const nextVal = !isCarved;
                          isCarvingMouseDownRef.current = true;
                          carveDragTargetValueRef.current = nextVal;
                          handleCarveTile(idx, nextVal);
                        }}
                        onMouseEnter={() => {
                          if (isCarvingMouseDownRef.current) {
                            handleCarveTile(idx, carveDragTargetValueRef.current);
                          }
                        }}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border transition-colors cursor-pointer ${
                          !hasStoneAndFlintLoaded
                            ? isGuideTile
                              ? 'bg-stone-800/70 border-amber-500/30'
                              : 'bg-stone-900/50 border-stone-850'
                            : isCarved
                            ? isGuideTile
                              ? 'bg-amber-500 border-amber-300 shadow-inner'
                              : 'bg-stone-950 border-stone-900'
                            : isGuideTile
                            ? 'bg-stone-600 border-amber-400/70 hover:bg-amber-400/80'
                            : 'bg-stone-700 border-stone-600 hover:bg-stone-800'
                        }`}
                        title={
                          isGuideTile
                            ? `Row ${r + 1}, Col ${c + 1} (Guide Shape)`
                            : `Row ${r + 1}, Col ${c + 1}`
                        }
                      />
                    );
                  })}
                </div>

                <span className="text-[10px] text-stone-400 text-center">
                  {hasStoneAndFlintLoaded
                    ? 'Click or drag tiles in the 16x16 grid to carve the stone tool head shape'
                    : 'Place 1 Stone block & 1 Flint in the left slots to begin carving'}
                </span>
              </div>

              {/* Output & Finish Carving Button */}
              <div className="flex flex-col items-center justify-center gap-2.5 min-w-[150px] p-2 bg-stone-950 border border-stone-800 self-stretch">
                <span className="text-[10px] font-bold uppercase text-stone-400">Carved Output</span>

                <div
                  onClick={handleFinishStoneCarving}
                  className={`relative flex h-16 w-16 items-center justify-center border-2 border-t-amber-600 border-l-amber-600 border-b-amber-950 border-r-amber-950 bg-stone-900 p-2 shadow-inner ${
                    matchedStoneHeadResult ? 'cursor-pointer hover:border-amber-400' : ''
                  }`}
                  title={
                    matchedStoneHeadResult
                      ? `Click to finish carving ${matchedStoneHeadResult.template.name}`
                      : 'Carve the tool head shape in the 16x16 grid'
                  }
                >
                  {matchedStoneHeadResult ? (
                    <ItemIcon item={matchedStoneHeadResult.template.item} className="w-11 h-11 drop-shadow" />
                  ) : (
                    <span className="text-[10px] text-stone-600 text-center">Shape Head</span>
                  )}
                </div>

                <span className="text-xs font-bold text-amber-300 text-center min-h-[16px]">
                  {matchedStoneHeadResult ? matchedStoneHeadResult.template.name : '—'}
                </span>

                <button
                  onClick={handleFinishStoneCarving}
                  disabled={!matchedStoneHeadResult}
                  className={`w-full py-2 px-3 font-mono text-xs font-bold uppercase tracking-wider transition border-2 cursor-pointer ${
                    matchedStoneHeadResult
                      ? 'border-t-amber-400 border-l-amber-400 border-b-amber-900 border-r-amber-900 bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md'
                      : 'border-stone-800 bg-stone-900 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  Assemble
                </button>
              </div>
            </div>
          </div>
        ) : initialStation === 'heater' || initialStation === 'cooler' ? (
          <ThermalStationView
            stationType={initialStation}
            coords={stationCoords}
            world={world}
            hotbar={localHotbar}
            inventory={localInventory}
            onUpdateSlots={(h, inv) => commitSlots(h, inv)}
            setStatusFeedback={(msg) => {
              setStatusFeedback(msg);
              if (msg) setTimeout(() => setStatusFeedback(null), 2500);
            }}
            selectedSlotIndex={selectedSlotIndex}
            onClearSelectedSlot={() => setSelectedSlotIndex(null)}
          />
        ) : initialStation === 'forge' ? (
          <ForgeStation
            hotbar={localHotbar}
            inventory={localInventory}
            onUpdateSlots={(h, inv) => commitSlots(h, inv)}
            setStatusFeedback={(msg) => {
              setStatusFeedback(msg);
              if (msg) setTimeout(() => setStatusFeedback(null), 2500);
            }}
            forgeSlotsRef={forgeSlotsRef}
            selectedSlotIndex={selectedSlotIndex}
            onClearSelectedSlot={() => setSelectedSlotIndex(null)}
          />
        ) : (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 gap-3 overflow-hidden bg-stone-950 border-b-2 border-stone-800">
          
          {/* LEFT: Recipe Browser (Search, Sort & Filters) */}
          <div className="flex-[3] flex flex-col min-h-0 bg-stone-900 border-2 border-stone-800 p-2.5">
            
            {/* Search Bar & Sort Toggle */}
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes or materials..."
                  className="w-full pl-8 pr-7 py-1 font-mono text-xs bg-stone-950 border border-stone-700 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Sort Switcher */}
              <button
                onClick={() => setSortBy(sortBy === 'craftable' ? 'name' : 'craftable')}
                className={`flex items-center gap-1 px-2 py-1 font-mono text-xs border uppercase font-bold transition cursor-pointer whitespace-nowrap ${
                  sortBy === 'craftable'
                    ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                    : 'border-stone-700 bg-stone-850 text-stone-300 hover:bg-stone-800'
                }`}
                title="Toggle sort: Craftable First vs Alphabetical"
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>{sortBy === 'craftable' ? 'Craftable 1st' : 'Name A-Z'}</span>
              </button>
            </div>

            {/* Sharp Category Filter Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none shrink-0 font-mono text-[11px]">
              {categories.map((cat) => {
                const isSel = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 uppercase font-bold border transition cursor-pointer whitespace-nowrap ${
                      isSel
                        ? 'border-amber-500 bg-amber-600 text-stone-950'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Recipe Cards List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {processedRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-500 font-mono text-xs p-4 text-center">
                  No recipes match '{searchQuery}'
                </div>
              ) : (
                processedRecipes.map((r) => {
                  const can = canCraftRecipe(r);

                  return (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-2 border transition ${
                        can
                          ? 'bg-stone-850 border-stone-700 hover:border-amber-400'
                          : 'bg-stone-950 border-stone-850 text-stone-500'
                      }`}
                    >
                      {/* Item Details */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center border border-stone-700 bg-stone-900 p-0.5">
                          <ItemIcon item={r.result} className="w-6 h-6" />
                          {r.resultCount > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-stone-950 border border-stone-800 px-0.5 text-[8px] font-mono font-bold text-amber-300">
                              x{r.resultCount}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={`font-mono font-bold text-xs truncate max-w-[140px] sm:max-w-[180px] ${
                            can ? 'text-stone-200' : 'text-stone-400'
                          }`}>
                            {r.result.name}
                          </span>

                          <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                            {r.ingredients.map((ing, iIdx) => {
                              const have = getItemCount(ing.itemId);
                              const ok = have >= ing.count;
                              const cleanName = ing.itemId.replace('craft_', '').replace('_', ' ');

                              return (
                                <span
                                  key={iIdx}
                                  className={`px-1 border ${
                                    ok
                                      ? 'bg-stone-900 border-stone-700 text-stone-300'
                                      : 'bg-rose-950/40 border-rose-900/60 text-rose-400'
                                  }`}
                                >
                                  {ing.count}x {cleanName} ({have})
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Place in 3x3 or Direct Assemble */}
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        <button
                          onClick={() => handleQuickFillGrid(r)}
                          className="px-2 py-1 text-[10px] uppercase font-bold border border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white cursor-pointer"
                          title="Auto-place ingredients into 3x3 grid"
                        >
                          To Grid
                        </button>

                        <button
                          onClick={() => handleDirectCraftRecipe(r)}
                          disabled={!can}
                          className={`px-2.5 py-1 text-[10px] uppercase font-bold border-2 transition cursor-pointer ${
                            can
                              ? 'border-t-amber-400 border-l-amber-400 border-b-amber-900 border-r-amber-900 bg-amber-500 text-stone-950 hover:bg-amber-400'
                              : 'border-stone-800 bg-stone-900 text-stone-600 cursor-not-allowed'
                          }`}
                        >
                          Craft
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-stone-800 text-[10px] font-mono text-stone-500">
              <span>Showing {processedRecipes.length} recipes</span>
              <span>Drag items into 3x3 grid or click 'Craft'</span>
            </div>
          </div>

          {/* RIGHT: 3x3 Interactive Grid Matrix & Output */}
          <div className="flex-[2] flex flex-col items-center justify-between p-3 bg-stone-900 border-2 border-stone-800 shrink-0 min-w-[240px]">
            
            <div className="w-full flex items-center justify-between border-b border-stone-800 pb-1 font-mono text-xs">
              <span className="font-bold text-amber-400 uppercase">3x3 Grid Workbench</span>
              <button
                onClick={handleClearGrid}
                className="text-[10px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
              >
                Clear Grid
              </button>
            </div>

            {/* Sharp 3x3 Grid Matrix (Drop Zone for Inventory Items) */}
            <div className="my-auto flex flex-col items-center gap-2.5">
              <div className="grid grid-cols-3 gap-1 p-2 bg-stone-950 border-2 border-stone-800 shadow-inner">
                {gridSlots.map((slot, idx) => {
                  const item = slot.item;
                  const count = slot.count;
                  const isDragOver = dragOverGridIndex === idx;
                  return (
                    <div
                      key={`grid-${idx}`}
                      id={`crafting-grid-slot-${idx}`}
                      data-grid-index={idx}
                      draggable={!!item && count > 0}
                      onDragStart={(e) => handleGridDragStart(e, idx)}
                      onDragOver={(e) => handleGridDragOver(e, idx)}
                      onDragEnter={(e) => handleGridDragOver(e, idx)}
                      onDragLeave={() => setDragOverGridIndex(null)}
                      onDrop={(e) => handleGridDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => handleGridSlotClick(e, idx)}
                      onContextMenu={(e) => handleGridSlotContextMenu(e, idx)}
                      onMouseEnter={() => item && setHoveredItem({ item, count })}
                      onMouseLeave={() => setHoveredItem(null)}
                      title={
                        item
                          ? `${item.name} (${count}x) · Click to return, Right-click for 1, or drop more to stack`
                          : 'Drag & drop or click with held item to place (stacks multiple items)'
                      }
                      className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center border-2 transition-all cursor-pointer ${
                        isDragOver
                          ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105 z-10'
                          : item
                          ? 'border-t-black border-l-black border-b-stone-600 border-r-stone-600 bg-stone-900 hover:border-amber-400 shadow-inner'
                          : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-500/60 shadow-inner'
                      }`}
                    >
                      {item ? (
                        <>
                          <ItemIcon item={item} className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow" />
                          {count > 1 && (
                            <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[9px] sm:text-[10px] font-mono font-black text-amber-300 pointer-events-none">
                              {count}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-stone-700 font-mono pointer-events-none">·</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Arrow down to Output */}
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-stone-500 rotate-90" />
              </div>

              {/* Output preview */}
              <div className="flex flex-col items-center gap-1">
                <div
                  onClick={handleCraftFromGrid}
                  className={`relative flex h-16 w-16 items-center justify-center border-2 border-t-amber-600 border-l-amber-600 border-b-amber-950 border-r-amber-950 bg-stone-950 p-2 shadow-inner ${
                    gridRecipeResult ? 'cursor-pointer hover:border-amber-400' : ''
                  }`}
                  title={gridRecipeResult ? `Click to assemble ${gridRecipeResult.result.name}` : 'Output'}
                >
                  {gridRecipeResult ? (
                    <>
                      <ItemIcon item={gridRecipeResult.result} className="w-11 h-11 drop-shadow" />
                      {gridRecipeResult.count > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 border border-stone-900 px-1 text-[9px] font-mono font-black text-black pointer-events-none">
                          x{gridRecipeResult.count}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-stone-700 font-mono">Output</span>
                  )}
                </div>

                {gridRecipeResult && (
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {gridRecipeResult.result.name}
                  </span>
                )}

                {matchingGridRecipes.length > 1 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {matchingGridRecipes.map((mr) => {
                      const isCurrent = gridRecipeResult?.recipe.id === mr.id;
                      return (
                        <button
                          key={mr.id}
                          onClick={() => setPreferredRecipeId(mr.id)}
                          className={`px-1.5 py-0.5 text-[9px] font-mono border cursor-pointer ${
                            isCurrent
                              ? 'border-amber-400 bg-amber-600 text-stone-950 font-bold'
                              : 'border-stone-700 bg-stone-950 text-stone-400 hover:text-stone-200'
                          }`}
                          title={`Select ${mr.result.name}`}
                        >
                          {mr.result.name.replace('Wooden ', '')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Assemble Button */}
            <button
              onClick={handleCraftFromGrid}
              disabled={!gridRecipeResult}
              className={`w-full py-2 font-mono text-xs font-bold uppercase tracking-wider transition border-2 cursor-pointer ${
                gridRecipeResult
                  ? 'border-t-amber-400 border-l-amber-400 border-b-amber-900 border-r-amber-900 bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md'
                  : 'border-stone-800 bg-stone-950 text-stone-600 cursor-not-allowed'
              }`}
            >
              Assemble
            </button>
          </div>

        </div>
        )}

        {/* ============================================================ */}
        {/* 2. BOTTOM HALF: BACKPACK (27) & ACTION HOTBAR (9)           */}
        {/* ============================================================ */}
        <div className="shrink-0 border-t-2 border-stone-800 bg-stone-900 p-3 sm:p-4 flex flex-col items-center">
          
          {/* Storage Header */}
          <div className="w-full flex items-center justify-between mb-2.5 px-1 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-400" />
                Backpack Storage
              </span>
              <span className="text-[9px] font-bold bg-stone-950 border border-stone-800 text-stone-300 px-1.5 py-0.5">
                27 Slots
              </span>
            </div>

            {/* Status / Hover Tooltip */}
            <div className="flex items-center gap-2 text-xs">
              {selectedSlotIndex ? (
                <span className="text-[10px] text-amber-300 font-bold bg-amber-950 border border-amber-500 px-2 py-0.5">
                  Holding item · Click slot or 3x3 grid to place
                </span>
              ) : hoveredItem ? (
                <div className="flex items-center gap-1.5 text-[11px] text-stone-200 bg-stone-950 border border-stone-800 px-2.5 py-0.5 shadow-sm">
                  <ItemIcon item={hoveredItem.item} className="w-3.5 h-3.5 inline" />
                  <span className="font-bold text-amber-300">{hoveredItem.item.name}</span>
                  <span className="text-stone-400">({hoveredItem.count}x)</span>
                </div>
              ) : (
                <span className="text-[10px] text-stone-500 hidden sm:inline">
                  Drag & drop into 3x3 grid or click to swap
                </span>
              )}
            </div>
          </div>

          {/* 27-slot Backpack Grid (9 columns x 3 rows) - Sharp Square Voxel Slots */}
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5 mb-2.5">
            {localInventory.map((slot, idx) => {
              const isSelected = selectedSlotIndex?.isHotbar === false && selectedSlotIndex?.index === idx;
              const isDragTarget = dragOverSlot?.isHotbar === false && dragOverSlot?.index === idx;

              return (
                <div
                  key={`inv-${idx}`}
                  id={`inv-slot-${idx}`}
                  role="button"
                  tabIndex={0}
                  draggable={!!slot.item}
                  onDragStart={(e) => handleInventoryDragStart(e, false, idx)}
                  onDragOver={(e) => handleInventoryDragOver(e, false, idx)}
                  onDragEnter={(e) => handleInventoryDragOver(e, false, idx)}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => handleInventoryDrop(e, false, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleSlotClick(false, idx)}
                  onMouseEnter={() => slot.item && setHoveredItem({ item: slot.item, count: slot.count })}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 aspect-square flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected || isDragTarget
                      ? 'border-2 border-amber-400 bg-amber-950/80 ring-2 ring-amber-400 z-10'
                      : 'border-2 border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] hover:border-amber-400'
                  }`}
                >
                  {slot.item ? (
                    <>
                      <ItemIcon item={slot.item} className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow" />
                      {slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[9px] sm:text-[10px] font-mono font-black text-amber-300 pointer-events-none">
                          {slot.count}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-1 h-1 bg-stone-800 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 9-slot Hotbar Tray - Aligned 1:1 with Backpack Columns */}
          <div className="pt-2 border-t border-stone-800 w-full flex flex-col items-center font-mono">
            <div className="w-full flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Wrench className="h-3 w-3 text-cyan-400" />
                Action Hotbar
              </span>
              <span className="text-[9px] text-stone-500">Keys 1 — 9</span>
            </div>

            <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
              {localHotbar.map((slot, idx) => {
                const isSelected = selectedSlotIndex?.isHotbar === true && selectedSlotIndex?.index === idx;
                const isDragTarget = dragOverSlot?.isHotbar === true && dragOverSlot?.index === idx;

                return (
                  <div
                    key={`hb-${idx}`}
                    id={`inv-hotbar-slot-${idx}`}
                    role="button"
                    tabIndex={0}
                    draggable={!!slot.item}
                    onDragStart={(e) => handleInventoryDragStart(e, true, idx)}
                    onDragOver={(e) => handleInventoryDragOver(e, true, idx)}
                    onDragEnter={(e) => handleInventoryDragOver(e, true, idx)}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => handleInventoryDrop(e, true, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleSlotClick(true, idx)}
                    onMouseEnter={() => slot.item && setHoveredItem({ item: slot.item, count: slot.count })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 aspect-square flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected || isDragTarget
                        ? 'border-2 border-amber-400 bg-amber-950/80 ring-2 ring-amber-400 z-10'
                        : 'border-2 border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] hover:border-cyan-400'
                    }`}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-mono font-bold text-stone-500 group-hover:text-cyan-300 pointer-events-none">
                      {idx + 1}
                    </span>
                    {slot.item ? (
                      <>
                        <ItemIcon item={slot.item} className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow" />
                        {slot.count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[9px] sm:text-[10px] font-mono font-black text-cyan-300 pointer-events-none">
                            {slot.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="w-1 h-1 bg-stone-800 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
