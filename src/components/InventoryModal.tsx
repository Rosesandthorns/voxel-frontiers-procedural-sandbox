import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../game/audio/SoundFX';
import {
  CRAFTING_STATIONS,
  CraftingCategory,
  CraftingRecipe,
  ITEM_REGISTRY
} from '../game/systems/ItemRegistry';
import { InventorySlot, ItemDef } from '../types';
import { isPlankBlock, isLogBlock } from '../game/voxel/Blocks';
import { ItemIcon } from './ItemIcon';
import {
  X,
  Hammer,
  Package,
  Wrench,
  Sparkles,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface InventoryModalProps {
  hotbar: InventorySlot[];
  inventory: InventorySlot[];
  onUpdateSlots: (hotbar: InventorySlot[], inventory: InventorySlot[]) => void;
  onClose: () => void;
  initialStation?: 'inventory' | 'tool_crafter';
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hotbar,
  inventory,
  onUpdateSlots,
  onClose,
  initialStation = 'inventory'
}) => {
  // Station & Navigation State
  const [stationId, setStationId] = useState<'inventory' | 'tool_crafter'>(initialStation);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<{ isHotbar: boolean; index: number } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ item: ItemDef; count: number } | null>(null);
  const [recentlyCraftedId, setRecentlyCraftedId] = useState<string | null>(null);

  useEffect(() => {
    setStationId(initialStation);
  }, [initialStation]);

  // Ensure inventory is always 27 slots (9 columns x 3 rows) to align with 9-column hotbar
  const safeInventory: InventorySlot[] = inventory.length >= 27
    ? inventory.slice(0, 27)
    : [...inventory, ...Array.from({ length: 27 - inventory.length }, () => ({ item: null, count: 0 }))];

  // Local state for instant UI responsiveness and rendering
  const [localHotbar, setLocalHotbar] = useState<InventorySlot[]>(() => hotbar.map((s) => ({ ...s })));
  const [localInventory, setLocalInventory] = useState<InventorySlot[]>(() => safeInventory.map((s) => ({ ...s })));

  // Authoritative slots ref to ensure zero race conditions or stale closures during rapid crafting / key repeats
  const slotsRef = useRef<{ hotbar: InventorySlot[]; inventory: InventorySlot[] }>({
    hotbar: hotbar.map((s) => ({ ...s })),
    inventory: safeInventory.map((s) => ({ ...s }))
  });

  // Sync with incoming parent props if they change externally
  useEffect(() => {
    slotsRef.current.hotbar = hotbar.map((s) => ({ ...s }));
    setLocalHotbar(hotbar.map((s) => ({ ...s })));
  }, [hotbar]);

  useEffect(() => {
    slotsRef.current.inventory = safeInventory.map((s) => ({ ...s }));
    setLocalInventory(safeInventory.map((s) => ({ ...s })));
  }, [safeInventory]);

  // Synchronous commit helper that writes to ref, local state, and notifies parent App
  const commitSlots = (newHotbar: InventorySlot[], newInv: InventorySlot[]) => {
    slotsRef.current = {
      hotbar: newHotbar.map((s) => ({ ...s })),
      inventory: newInv.map((s) => ({ ...s }))
    };
    setLocalHotbar(newHotbar.map((s) => ({ ...s })));
    setLocalInventory(newInv.map((s) => ({ ...s })));
    onUpdateSlots(newHotbar, newInv);
  };

  // CRITICAL: Ensure mouse pointer is unlocked immediately upon modal mount
  useEffect(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  const currentStation = CRAFTING_STATIONS[stationId] || CRAFTING_STATIONS.inventory;
  const categories = currentStation.categories;
  const safeCategoryIndex = Math.min(activeCategoryIndex, Math.max(0, categories.length - 1));
  const activeCategory: CraftingCategory | undefined = categories[safeCategoryIndex];

  const recipes = activeCategory?.recipes || [];
  const safeItemIndex = recipes.length > 0 ? (activeItemIndex % recipes.length + recipes.length) % recipes.length : 0;
  const activeRecipe: CraftingRecipe | undefined = recipes[safeItemIndex];

  // When switching station or category, reset safe item index
  useEffect(() => {
    setActiveCategoryIndex(0);
    setActiveItemIndex(0);
  }, [stationId]);

  // Helper to check if an item is a plank
  const isPlank = (item: ItemDef | null | undefined): boolean => {
    if (!item) return false;
    return (
      item.id.endsWith('_plank') ||
      item.id.endsWith('_planks') ||
      (item.blockId !== undefined && isPlankBlock(item.blockId))
    );
  };

  // Helper to check if an item is a wood log
  const isWoodLog = (item: ItemDef | null | undefined): boolean => {
    if (!item) return false;
    return (
      item.id.endsWith('_log') ||
      item.id.endsWith('_wood') ||
      (item.blockId !== undefined && isLogBlock(item.blockId))
    );
  };

  // Count item quantity across hotbar and inventory using authoritative slotsRef
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
      } else if (slot.item.id === itemId) {
        count += slot.count;
      }
    }
    return count;
  };

  const canCraft = (recipe: CraftingRecipe | undefined): boolean => {
    if (!recipe) return false;
    return recipe.ingredients.every((ing) => getItemCount(ing.itemId) >= ing.count);
  };

  // Resolves display name and icon for an ingredient
  const getIngredientInfo = (itemId: string) => {
    if (itemId === 'any_plank') {
      return {
        name: 'Any Plank',
        item: ITEM_REGISTRY['oak_plank'] || ITEM_REGISTRY['redwood_plank']
      };
    }
    if (itemId === 'any_wood') {
      return {
        name: 'Any Wood Log',
        item: ITEM_REGISTRY['oak_log'] || ITEM_REGISTRY['redwood_log']
      };
    }
    const def = ITEM_REGISTRY[itemId];
    return {
      name: def?.name || itemId,
      item: def
    };
  };

  // Navigation handlers
  const handleNextCategory = () => {
    soundManager.playStep('stone');
    setActiveCategoryIndex((prev) => (prev + 1) % categories.length);
    setActiveItemIndex(0);
  };

  const handlePrevCategory = () => {
    soundManager.playStep('stone');
    setActiveCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length);
    setActiveItemIndex(0);
  };

  const handleNextItem = () => {
    if (recipes.length <= 1) return;
    soundManager.playStep('sand');
    setActiveItemIndex((prev) => (prev + 1) % recipes.length);
  };

  const handlePrevItem = () => {
    if (recipes.length <= 1) return;
    soundManager.playStep('sand');
    setActiveItemIndex((prev) => (prev - 1 + recipes.length) % recipes.length);
  };

  // Helper to add crafted item into hotbar or inventory with stack overflow handling
  const addItemToSlots = (
    targetHotbar: InventorySlot[],
    targetInventory: InventorySlot[],
    item: ItemDef,
    countToAdd: number
  ): boolean => {
    let remaining = countToAdd;
    const maxStack = item.maxStack || 64;

    // 1. Try stacking in hotbar
    for (const slot of targetHotbar) {
      if (slot.item?.id === item.id && slot.count < maxStack) {
        const canTake = Math.min(remaining, maxStack - slot.count);
        slot.count += canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    // 2. Try empty slot in hotbar
    for (const slot of targetHotbar) {
      if (!slot.item) {
        const canTake = Math.min(remaining, maxStack);
        slot.item = item;
        slot.count = canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    // 3. Try stacking in inventory
    for (const slot of targetInventory) {
      if (slot.item?.id === item.id && slot.count < maxStack) {
        const canTake = Math.min(remaining, maxStack - slot.count);
        slot.count += canTake;
        remaining -= canTake;
        if (remaining <= 0) return true;
      }
    }

    // 4. Try empty slot in inventory
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

  // Crafting action with transactional check to prevent eating ingredients or uncrafting items
  const craftActiveRecipe = () => {
    if (!activeRecipe || !canCraft(activeRecipe)) {
      soundManager.playStep('stone');
      return;
    }

    // Clone directly from authoritative slotsRef
    const newHotbar = slotsRef.current.hotbar.map((s) => ({ ...s }));
    const newInventory = slotsRef.current.inventory.map((s) => ({ ...s }));

    // Deduct ingredients
    for (const ing of activeRecipe.ingredients) {
      let needed = ing.count;

      const deductFromSlot = (slot: InventorySlot) => {
        if (needed <= 0 || !slot.item) return;

        let matches = false;
        if (ing.itemId === 'any_plank') {
          matches = isPlank(slot.item);
        } else if (ing.itemId === 'any_wood') {
          matches = isWoodLog(slot.item);
        } else {
          matches = slot.item.id === ing.itemId;
        }

        if (matches) {
          const deduct = Math.min(slot.count, needed);
          slot.count -= deduct;
          needed -= deduct;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
        }
      };

      for (const slot of newHotbar) deductFromSlot(slot);
      for (const slot of newInventory) deductFromSlot(slot);
    }

    // Add crafted item to hotbar or backpack
    const added = addItemToSlots(newHotbar, newInventory, activeRecipe.result, activeRecipe.resultCount);
    if (!added) {
      // If inventory is full, abort without saving deduction
      soundManager.playStep('stone');
      return;
    }

    // Commit state immediately to ref, local state, and parent state
    commitSlots(newHotbar, newInventory);

    soundManager.playBlockPlace();
    soundManager.playChime(700);
    setRecentlyCraftedId(activeRecipe.id);
    setTimeout(() => setRecentlyCraftedId(null), 1200);
  };

  // Keep a stable actions ref for the keydown listener to completely eliminate stale closures
  const actionsRef = useRef({
    onClose,
    handlePrevCategory,
    handleNextCategory,
    handlePrevItem,
    handleNextItem,
    craftActiveRecipe
  });

  useEffect(() => {
    actionsRef.current = {
      onClose,
      handlePrevCategory,
      handleNextCategory,
      handlePrevItem,
      handleNextItem,
      craftActiveRecipe
    };
  });

  // Keyboard navigation with capture & stopPropagation to PREVENT player movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Stop all movement keys from propagating to PlayerController
      e.stopPropagation();

      const actions = actionsRef.current;

      if (e.code === 'KeyE' || e.code === 'Escape') {
        e.preventDefault();
        actions.onClose();
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        actions.handlePrevCategory();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        actions.handleNextCategory();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        actions.handlePrevItem();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        actions.handleNextItem();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        actions.craftActiveRecipe();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  // Slot dragging and swapping
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

      if (srcSlot.item && destSlot.item && srcSlot.item.id === destSlot.item.id && destSlot.count < destSlot.item.maxStack) {
        const canTake = destSlot.item.maxStack - destSlot.count;
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

  // Peripheral items for the vertical column
  const prevItemRecipe = recipes.length > 1 ? recipes[(safeItemIndex - 1 + recipes.length) % recipes.length] : null;
  const nextItemRecipe = recipes.length > 1 ? recipes[(safeItemIndex + 1) % recipes.length] : null;

  // Peripheral categories for the horizontal row
  const prevCategory = categories.length > 1 ? categories[(safeCategoryIndex - 1 + categories.length) % categories.length] : null;
  const nextCategory = categories.length > 1 ? categories[(safeCategoryIndex + 1) % categories.length] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none">
      <div className="flex h-[96vh] w-full max-w-3xl flex-col rounded-2xl border-2 border-zinc-700 bg-zinc-950 shadow-2xl text-white overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              stationId === 'tool_crafter'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {stationId === 'tool_crafter' ? <Wrench className="h-4 w-4" /> : <Hammer className="h-4 w-4" />}
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {stationId === 'tool_crafter' ? 'Tool Crafter' : 'Crafting'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-modal"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
              title="Close (E / Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Body Area */}
        <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-2.5 overflow-y-auto justify-between">
          
          {/* ============================================================ */}
          {/* 1. SQUARED CRAFTING MATRIX (Clean, Even 3x3 Symmetrical Grid) */}
          {/* ============================================================ */}
          <div
            className="flex-1 min-h-0 relative flex items-center justify-center py-1"
            onWheel={(e) => {
              if (e.deltaY > 0) handleNextItem();
              else handlePrevItem();
            }}
          >
            {/* Symmetrical 3x3 Square Grid Container */}
            <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-2.5 items-center justify-center">
              {/* Row 1, Col 1: Empty */}
              <div className="w-24 h-24" />

              {/* Row 1, Col 2: TOP ITEM */}
              <div className="flex items-center justify-center">
                {prevItemRecipe ? (
                  <button
                    id="craft-top-item"
                    onClick={handlePrevItem}
                    className="flex flex-col items-center justify-between w-24 h-24 aspect-square rounded-xl border-2 border-black p-1.5 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: '#facc15', color: '#000000' }}
                  >
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-black/70">
                      <ChevronUp className="h-2.5 w-2.5" /> Prev
                    </span>
                    <div className="flex flex-col items-center">
                      <ItemIcon item={prevItemRecipe.result} className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
                      <span className="text-[10px] sm:text-[11px] font-black text-black leading-tight text-center truncate max-w-[84px] mt-0.5">
                        {prevItemRecipe.result.name}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-black/60">[W / ↑]</span>
                  </button>
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-zinc-800/40 bg-zinc-900/10 flex items-center justify-center text-zinc-700 text-xs font-mono">·</div>
                )}
              </div>

              {/* Row 1, Col 3: Empty */}
              <div className="w-24 h-24" />

              {/* Row 2, Col 1: LEFT CATEGORY */}
              <div className="flex items-center justify-center">
                {prevCategory ? (
                  <button
                    id="craft-left-category"
                    onClick={handlePrevCategory}
                    className="flex flex-col items-center justify-between w-24 h-24 aspect-square rounded-xl border-2 border-black p-1.5 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: '#22c55e', color: '#000000' }}
                  >
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-black/70">
                      <ChevronLeft className="h-2.5 w-2.5" /> Prev
                    </span>
                    <div className="flex flex-col items-center">
                      <span className="text-lg sm:text-xl mb-0.5">
                        {prevCategory.icon.startsWith('/') ? (
                          <img src={prevCategory.icon} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain inline" />
                        ) : (
                          prevCategory.icon
                        )}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-black text-black leading-tight text-center truncate max-w-[84px]">
                        {prevCategory.name}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-black/60">[A / ←]</span>
                  </button>
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-zinc-800/40 bg-zinc-900/10 flex items-center justify-center text-zinc-700 text-xs font-mono">·</div>
                )}
              </div>

              {/* Row 2, Col 2: CENTER INTERSECTION */}
              <div className="flex items-center justify-center">
                <div
                  id="craft-center-item"
                  className="flex flex-col items-center justify-between w-24 h-24 aspect-square rounded-xl border-3 border-black p-1.5 shadow-2xl transition-all"
                  style={{ backgroundColor: '#facc15', color: '#000000' }}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between w-full border-b border-black/20 pb-0.5">
                    <span className="text-[8px] font-black uppercase tracking-wider text-black/80">
                      Active
                    </span>
                    <span className="text-[8px] font-mono font-black text-black/70">
                      {recipes.length > 0 ? `${safeItemIndex + 1}/${recipes.length}` : '0/0'}
                    </span>
                  </div>

                  {/* Active Item Details */}
                  {activeRecipe ? (
                    <div className="flex flex-col items-center text-center my-auto">
                      <div className="relative">
                        <ItemIcon item={activeRecipe.result} className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" />
                        {activeRecipe.resultCount > 1 && (
                          <span className="absolute -bottom-1 -right-1.5 rounded bg-black px-1 text-[7px] font-mono font-black text-yellow-300">
                            x{activeRecipe.resultCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-black text-black leading-tight truncate max-w-[84px] mt-0.5">
                        {activeRecipe.result.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-black/60 my-auto">Empty</span>
                  )}

                  {/* Craft Button */}
                  {activeRecipe && (
                    <button
                      id="btn-craft-active"
                      onClick={craftActiveRecipe}
                      disabled={!canCraft(activeRecipe)}
                      className={`flex items-center justify-center gap-1 w-full rounded py-0.5 px-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-md ${
                        canCraft(activeRecipe)
                          ? 'bg-black text-yellow-300 hover:bg-zinc-800'
                          : 'bg-black/30 text-black/40 cursor-not-allowed'
                      }`}
                    >
                      {recentlyCraftedId === activeRecipe.id ? (
                        <>
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                          <span>Crafted!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-2.5 w-2.5 text-yellow-400" />
                          <span>Craft [Space]</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2, Col 3: RIGHT CATEGORY */}
              <div className="flex items-center justify-center">
                {nextCategory ? (
                  <button
                    id="craft-right-category"
                    onClick={handleNextCategory}
                    className="flex flex-col items-center justify-between w-24 h-24 aspect-square rounded-xl border-2 border-black p-1.5 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: '#22c55e', color: '#000000' }}
                  >
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-black/70">
                      Next <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                    <div className="flex flex-col items-center">
                      <span className="text-lg sm:text-xl mb-0.5">
                        {nextCategory.icon.startsWith('/') ? (
                          <img src={nextCategory.icon} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain inline" />
                        ) : (
                          nextCategory.icon
                        )}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-black text-black leading-tight text-center truncate max-w-[84px]">
                        {nextCategory.name}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-black/60">[D / →]</span>
                  </button>
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-zinc-800/40 bg-zinc-900/10 flex items-center justify-center text-zinc-700 text-xs font-mono">·</div>
                )}
              </div>

              {/* Row 3, Col 1: Empty */}
              <div className="w-24 h-24" />

              {/* Row 3, Col 2: BOTTOM ITEM */}
              <div className="flex items-center justify-center">
                {nextItemRecipe ? (
                  <button
                    id="craft-bottom-item"
                    onClick={handleNextItem}
                    className="flex flex-col items-center justify-between w-24 h-24 aspect-square rounded-xl border-2 border-black p-1.5 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: '#facc15', color: '#000000' }}
                  >
                    <div className="flex flex-col items-center pt-0.5">
                      <ItemIcon item={nextItemRecipe.result} className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
                      <span className="text-[10px] sm:text-[11px] font-black text-black leading-tight text-center truncate max-w-[84px] mt-0.5">
                        {nextItemRecipe.result.name}
                      </span>
                    </div>
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-black/70">
                      Next <ChevronDown className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-black/60">[S / ↓]</span>
                  </button>
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-zinc-800/40 bg-zinc-900/10 flex items-center justify-center text-zinc-700 text-xs font-mono">·</div>
                )}
              </div>

              {/* Row 3, Col 3: Empty */}
              <div className="w-24 h-24" />
            </div>
          </div>

          {/* ============================================================ */}
          {/* INGREDIENTS STRIP FOR THE SELECTED CENTER ITEM               */}
          {/* ============================================================ */}
          {activeRecipe && (
            <div className="shrink-0 relative z-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/95 px-4 py-2 text-xs shadow-md">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-400 text-[10px] sm:text-[11px] uppercase tracking-wider">Materials:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeRecipe.ingredients.map((ing, iIdx) => {
                    const have = getItemCount(ing.itemId);
                    const hasEnough = have >= ing.count;
                    const info = getIngredientInfo(ing.itemId);

                    return (
                      <div
                        key={iIdx}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs border ${
                          hasEnough
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        <ItemIcon item={info.item} className="w-3.5 h-3.5" />
                        <span>{info.name}:</span>
                        <span className="font-black">
                          {have}/{ing.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Controls hints */}
              <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-mono text-zinc-400">
                <span>[W/S] Items</span>
                <span>[A/D] Categories</span>
                <span>[Space] Craft</span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. PLAYER INVENTORY & HOTBAR (Organize, Swap & Inspect)       */}
          {/* ============================================================ */}
          <div className="shrink-0 rounded-2xl border-2 border-zinc-800/90 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 p-3.5 sm:p-4 flex flex-col items-center shadow-xl">
            {/* Storage Header & Status Feedback */}
            <div className="w-full flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-amber-400" />
                  Backpack Storage
                </span>
                <span className="text-[9px] font-mono font-bold bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 px-1.5 py-0.5 rounded">
                  27 Slots
                </span>
              </div>

              {/* Real-time Status or Hover Tooltip */}
              <div className="flex items-center gap-2 text-xs">
                {selectedSlotIndex ? (
                  <span className="text-[10px] font-mono text-amber-300 animate-pulse font-bold bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-full">
                    Holding item · Click slot to place or swap
                  </span>
                ) : hoveredItem ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-200 bg-zinc-800/90 border border-zinc-700/80 px-2 py-0.5 rounded-full shadow">
                    <ItemIcon item={hoveredItem.item} className="w-3.5 h-3.5 inline" />
                    <span className="font-bold text-amber-300">{hoveredItem.item.name}</span>
                    <span className="text-zinc-400">({hoveredItem.count}x)</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                    Click item to pick up & swap
                  </span>
                )}
              </div>
            </div>

            {/* 27-slot Backpack Grid (9 columns x 3 rows) - Aligned 1:1 with Hotbar */}
            <div className="grid grid-cols-9 gap-1.5 sm:gap-2 mb-3">
              {localInventory.map((slot, idx) => {
                const isSelected = selectedSlotIndex?.isHotbar === false && selectedSlotIndex?.index === idx;

                return (
                  <button
                    key={`inv-${idx}`}
                    id={`inv-slot-${idx}`}
                    onClick={() => handleSlotClick(false, idx)}
                    onMouseEnter={() => slot.item && setHoveredItem({ item: slot.item, count: slot.count })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 aspect-square flex-col items-center justify-center rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-105 z-10'
                        : 'border-t-zinc-700/60 border-l-zinc-700/60 border-b-zinc-950 border-r-zinc-950 bg-gradient-to-b from-zinc-850 to-zinc-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] hover:border-amber-400/80 hover:shadow-[0_0_10px_rgba(251,191,36,0.25)] hover:scale-[1.03]'
                    }`}
                  >
                    {slot.item ? (
                      <>
                        <ItemIcon item={slot.item} className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                        {slot.count > 1 && (
                          <span className="absolute bottom-0.5 right-1 rounded bg-black/90 border border-zinc-700/60 px-1 text-[9px] sm:text-[10px] font-mono font-black text-amber-300 shadow">
                            {slot.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-800/40" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 9-slot Hotbar Tray - Aligned 1:1 with Backpack Columns */}
            <div className="pt-2.5 border-t border-zinc-800/90 w-full flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
                  <Wrench className="h-3 w-3 text-cyan-400" />
                  Action Hotbar
                </span>
                <span className="text-[9px] font-mono text-zinc-500">Keys 1 — 9</span>
              </div>

              <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
                {localHotbar.map((slot, idx) => {
                  const isSelected = selectedSlotIndex?.isHotbar === true && selectedSlotIndex?.index === idx;

                  return (
                    <button
                      key={`hb-${idx}`}
                      id={`inv-hotbar-slot-${idx}`}
                      onClick={() => handleSlotClick(true, idx)}
                      onMouseEnter={() => slot.item && setHoveredItem({ item: slot.item, count: slot.count })}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 aspect-square flex-col items-center justify-center rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-105 z-10'
                          : 'border-t-zinc-700/70 border-l-zinc-700/70 border-b-zinc-950 border-r-zinc-950 bg-gradient-to-b from-zinc-850 to-zinc-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] hover:border-cyan-400/80 hover:shadow-[0_0_10px_rgba(34,211,238,0.25)] hover:scale-[1.03]'
                      }`}
                    >
                      <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-mono font-bold text-zinc-400 group-hover:text-cyan-300 transition">
                        {idx + 1}
                      </span>
                      {slot.item ? (
                        <>
                          <ItemIcon item={slot.item} className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                          {slot.count > 1 && (
                            <span className="absolute bottom-0.5 right-1 rounded bg-black/90 border border-zinc-700/60 px-1 text-[9px] sm:text-[10px] font-mono font-black text-cyan-300 shadow">
                              {slot.count}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
