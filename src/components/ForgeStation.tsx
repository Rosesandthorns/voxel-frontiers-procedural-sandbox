import React, { useState, useRef, useMemo, useEffect } from 'react';
import { InventorySlot, ItemDef } from '../types';
import {
  ITEM_REGISTRY,
  isFuelItem
} from '../game/systems/ItemRegistry';
import { ItemIcon } from './ItemIcon';
import { soundManager } from '../game/audio/SoundFX';
import {
  Flame,
  Hammer,
  Layers,
  Sparkles,
  RotateCcw,
  Stamp,
  Check,
  Zap
} from 'lucide-react';

export const MOLD_TEMPLATES: Array<{
  id: 'pickaxe_mold' | 'axe_mold' | 'shovel_mold' | 'hoe_mold';
  name: string;
  item: ItemDef;
  pattern: string[];
}> = [
  {
    id: 'pickaxe_mold',
    name: 'Pickaxe Mold',
    item: ITEM_REGISTRY['pickaxe_mold'],
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
    id: 'axe_mold',
    name: 'Axe Mold',
    item: ITEM_REGISTRY['axe_mold'],
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
    id: 'shovel_mold',
    name: 'Shovel Mold',
    item: ITEM_REGISTRY['shovel_mold'],
    pattern: [
      '................',
      '................',
      '................',
      '................',
      '......######....',
      '.....########...',
      '....##########..',
      '....##########..',
      '....##########..',
      '.....########...',
      '......######....',
      '.......####.....',
      '........##......',
      '................',
      '................',
      '................'
    ]
  },
  {
    id: 'hoe_mold',
    name: 'Hoe Mold',
    item: ITEM_REGISTRY['hoe_mold'],
    pattern: [
      '................',
      '................',
      '................',
      '....##########..',
      '....##########..',
      '....##########..',
      '..........####..',
      '..........####..',
      '..........####..',
      '..........####..',
      '..........####..',
      '................',
      '................',
      '................',
      '................',
      '................'
    ]
  }
];

export interface ForgeToolHeadDef {
  id: string;
  name: string;
  category: 'stone' | 'iron' | 'gold';
  resultItem: ItemDef;
  moldId?: 'pickaxe_mold' | 'axe_mold' | 'shovel_mold' | 'hoe_mold';
  ingredients: {
    description: string;
    stoneCount?: number;
    ironCount?: number;
    goldCount?: number;
    fuelCount?: number;
  };
}

export const FORGE_TOOL_HEADS: ForgeToolHeadDef[] = [
  // --- Stone Tool Heads ---
  {
    id: 'forge_stone_pickaxe_head',
    name: 'Stone Pickaxe Head',
    category: 'stone',
    resultItem: ITEM_REGISTRY['stone_pickaxe_head'],
    ingredients: { description: '1x Stone', stoneCount: 1 }
  },
  {
    id: 'forge_stone_axe_head',
    name: 'Stone Axe Head',
    category: 'stone',
    resultItem: ITEM_REGISTRY['stone_axe_head'],
    ingredients: { description: '1x Stone', stoneCount: 1 }
  },
  {
    id: 'forge_stone_shovel_head',
    name: 'Stone Shovel Head',
    category: 'stone',
    resultItem: ITEM_REGISTRY['stone_shovel_head'],
    ingredients: { description: '1x Stone', stoneCount: 1 }
  },
  {
    id: 'forge_stone_hoe_head',
    name: 'Stone Hoe Head',
    category: 'stone',
    resultItem: ITEM_REGISTRY['stone_hoe_head'],
    ingredients: { description: '1x Stone', stoneCount: 1 }
  },

  // --- Iron Tool Heads ---
  {
    id: 'forge_iron_pickaxe_head',
    name: 'Iron Pickaxe Head',
    category: 'iron',
    resultItem: ITEM_REGISTRY['iron_pickaxe_head'],
    moldId: 'pickaxe_mold',
    ingredients: { description: '1x Iron Ingot + 1x Fuel', ironCount: 1, fuelCount: 1 }
  },
  {
    id: 'forge_iron_axe_head',
    name: 'Iron Axe Head',
    category: 'iron',
    resultItem: ITEM_REGISTRY['iron_axe_head'],
    moldId: 'axe_mold',
    ingredients: { description: '1x Iron Ingot + 1x Fuel', ironCount: 1, fuelCount: 1 }
  },
  {
    id: 'forge_iron_shovel_head',
    name: 'Iron Shovel Head',
    category: 'iron',
    resultItem: ITEM_REGISTRY['iron_shovel_head'],
    moldId: 'shovel_mold',
    ingredients: { description: '1x Iron Ingot + 1x Fuel', ironCount: 1, fuelCount: 1 }
  },
  {
    id: 'forge_iron_hoe_head',
    name: 'Iron Hoe Head',
    category: 'iron',
    resultItem: ITEM_REGISTRY['iron_hoe_head'],
    moldId: 'hoe_mold',
    ingredients: { description: '1x Iron Ingot + 1x Fuel', ironCount: 1, fuelCount: 1 }
  },

  // --- Gold Tool Heads ---
  {
    id: 'forge_gold_pickaxe_head',
    name: 'Gold Pickaxe Head',
    category: 'gold',
    resultItem: ITEM_REGISTRY['gold_pickaxe_head'],
    moldId: 'pickaxe_mold',
    ingredients: { description: '1x Gold Ingot + 1x Fuel', goldCount: 1, fuelCount: 1 }
  },
  {
    id: 'forge_gold_axe_head',
    name: 'Gold Axe Head',
    category: 'gold',
    resultItem: ITEM_REGISTRY['gold_axe_head'],
    moldId: 'axe_mold',
    ingredients: { description: '1x Gold Ingot + 1x Fuel', goldCount: 1, fuelCount: 1 }
  },
  {
    id: 'forge_gold_shovel_head',
    name: 'Gold Shovel Head',
    category: 'gold',
    resultItem: ITEM_REGISTRY['gold_shovel_head'],
    moldId: 'shovel_mold',
    ingredients: { description: '1x Gold Ingot + 1x Fuel', goldCount: 1, fuelCount: 1 }
  },
  {
    id: 'forge_gold_hoe_head',
    name: 'Gold Hoe Head',
    category: 'gold',
    resultItem: ITEM_REGISTRY['gold_hoe_head'],
    moldId: 'hoe_mold',
    ingredients: { description: '1x Gold Ingot + 1x Fuel', goldCount: 1, fuelCount: 1 }
  }
];

export interface ForgeSlots {
  indentMold: InventorySlot;
  indentFuel: InventorySlot;
}

interface ForgeStationProps {
  hotbar: InventorySlot[];
  inventory: InventorySlot[];
  onUpdateSlots: (hotbar: InventorySlot[], inventory: InventorySlot[]) => void;
  setStatusFeedback: (msg: string | null) => void;
  forgeSlotsRef: React.MutableRefObject<ForgeSlots>;
  selectedSlotIndex?: { isHotbar: boolean; index: number } | null;
  onClearSelectedSlot?: () => void;
}

export const ForgeStation: React.FC<ForgeStationProps> = ({
  hotbar,
  inventory,
  onUpdateSlots,
  setStatusFeedback,
  forgeSlotsRef,
  selectedSlotIndex,
  onClearSelectedSlot
}) => {
  // Main view tab: 'heads' (Tool Heads Forging) vs 'molds' (Mold Indenting Studio)
  const [activeTab, setActiveTab] = useState<'heads' | 'molds'>('heads');

  // Tool Heads Category Filter: 'all' | 'stone' | 'iron' | 'gold'
  const [headCategoryFilter, setHeadCategoryFilter] = useState<'all' | 'stone' | 'iron' | 'gold'>('all');

  // Slots: Top (1 Blank Mold), Bottom (1 Fuel)
  const [forgeMold, setForgeMold] = useState<InventorySlot>(forgeSlotsRef.current.indentMold);
  const [forgeFuel, setForgeFuel] = useState<InventorySlot>(forgeSlotsRef.current.indentFuel);

  // 16x16 Indented Tiles State
  const [indentedTiles, setIndentedTiles] = useState<boolean[]>(() => Array(256).fill(false));
  const [selectedMoldGuide, setSelectedMoldGuide] = useState<'pickaxe_mold' | 'axe_mold' | 'shovel_mold' | 'hoe_mold'>('pickaxe_mold');
  const isIndentingMouseDownRef = useRef<boolean>(false);
  const indentDragTargetValueRef = useRef<boolean>(true);
  const [dragOverSlot, setDragOverSlot] = useState<'mold' | 'fuel' | null>(null);

  // Listen to global mouse up for dragging across 16x16 tiles
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isIndentingMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const commitSlots = (newMold: InventorySlot, newFuel: InventorySlot) => {
    forgeSlotsRef.current = {
      indentMold: { ...newMold },
      indentFuel: { ...newFuel }
    };
    setForgeMold({ ...newMold });
    setForgeFuel({ ...newFuel });
  };

  const isStoneItem = (item: ItemDef | null | undefined): boolean => {
    if (!item) return false;
    return (
      item.id === 'stone' ||
      item.id === 'cobblestone' ||
      item.id === 'granite' ||
      item.id === 'diorite' ||
      item.id === 'andesite' ||
      item.id === 'basalt'
    );
  };

  // Count item in player's bags
  const getItemCountInPlayer = (itemId: string): number => {
    let total = 0;
    for (const slot of [...hotbar, ...inventory]) {
      if (slot.item && slot.item.id === itemId && slot.count > 0) {
        total += slot.count;
      }
    }
    return total;
  };

  const stoneCount = useMemo(() => {
    let total = 0;
    for (const slot of [...hotbar, ...inventory]) {
      if (slot.item && isStoneItem(slot.item) && slot.count > 0) total += slot.count;
    }
    return total;
  }, [hotbar, inventory]);

  const ironCount = useMemo(() => getItemCountInPlayer('iron'), [hotbar, inventory]);
  const goldCount = useMemo(() => getItemCountInPlayer('gold'), [hotbar, inventory]);

  const fuelCount = useMemo(() => {
    let total = 0;
    for (const slot of [...hotbar, ...inventory]) {
      if (slot.item && isFuelItem(slot.item) && slot.count > 0) total += slot.count;
    }
    return total;
  }, [hotbar, inventory]);

  const playerIronCount = ironCount;

  const addItemToPlayer = (item: ItemDef, count: number): boolean => {
    const newHotbar = hotbar.map((s) => ({ ...s }));
    const newInventory = inventory.map((s) => ({ ...s }));
    const maxStack = item.maxStack || 64;
    let remaining = count;

    for (const slot of [...newHotbar, ...newInventory]) {
      if (slot.item && slot.item.id === item.id && slot.count < maxStack) {
        const canTake = maxStack - slot.count;
        const add = Math.min(remaining, canTake);
        slot.count += add;
        remaining -= add;
        if (remaining <= 0) break;
      }
    }
    if (remaining > 0) {
      for (const slot of [...newHotbar, ...newInventory]) {
        if (!slot.item || slot.count <= 0) {
          const add = Math.min(remaining, maxStack);
          slot.item = item;
          slot.count = add;
          remaining -= add;
          if (remaining <= 0) break;
        }
      }
    }

    if (remaining < count) {
      onUpdateSlots(newHotbar, newInventory);
      return remaining <= 0;
    }
    return false;
  };

  const consumeItemFromPlayer = (itemId: string, amount: number): boolean => {
    const newHotbar = hotbar.map((s) => ({ ...s }));
    const newInventory = inventory.map((s) => ({ ...s }));
    let remaining = amount;

    for (const slot of [...newHotbar, ...newInventory]) {
      if (slot.item && slot.item.id === itemId && slot.count > 0) {
        const take = Math.min(remaining, slot.count);
        slot.count -= take;
        remaining -= take;
        if (slot.count <= 0) {
          slot.item = null;
          slot.count = 0;
        }
        if (remaining <= 0) break;
      }
    }

    if (remaining <= 0) {
      onUpdateSlots(newHotbar, newInventory);
      return true;
    }
    return false;
  };

  // 1. Mold Crafting: 3 Iron -> 1 Blank Mold
  const handleForgeBlankMold = () => {
    if (playerIronCount < 3) {
      soundManager.playStep('stone');
      setStatusFeedback('Requires 3 Iron to craft a Blank Mold!');
      return;
    }

    if (consumeItemFromPlayer('iron', 3)) {
      soundManager.playAnvilStrike();
      soundManager.playSizzle();
      if (!forgeMold.item || forgeMold.count <= 0) {
        commitSlots({ item: ITEM_REGISTRY['mold'], count: 1 }, forgeFuel);
        setStatusFeedback('Forged 1 Blank Mold and loaded into the Forge!');
      } else {
        addItemToPlayer(ITEM_REGISTRY['mold'], 1);
        setStatusFeedback('Forged 1 Blank Mold from 3 Iron!');
      }
    }
  };

  // 2. Direct Tool Head Forging at the Forge Anvil
  const handleForgeToolHead = (headDef: ForgeToolHeadDef, countToForge: number = 1) => {
    const reqStone = (headDef.ingredients.stoneCount || 0) * countToForge;
    const reqIron = (headDef.ingredients.ironCount || 0) * countToForge;
    const reqGold = (headDef.ingredients.goldCount || 0) * countToForge;
    const reqFuel = (headDef.ingredients.fuelCount || 0) * countToForge;

    if (stoneCount < reqStone || ironCount < reqIron || goldCount < reqGold || fuelCount < reqFuel) {
      soundManager.playStep('stone');
      setStatusFeedback('Not enough materials to forge this tool head!');
      return;
    }

    const newHotbar = hotbar.map((s) => ({ ...s }));
    const newInventory = inventory.map((s) => ({ ...s }));

    const consumeFromLists = (predicate: (item: ItemDef) => boolean, amount: number): boolean => {
      let remaining = amount;
      for (const slot of [...newHotbar, ...newInventory]) {
        if (slot.item && predicate(slot.item) && slot.count > 0) {
          const take = Math.min(remaining, slot.count);
          slot.count -= take;
          remaining -= take;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
          if (remaining <= 0) break;
        }
      }
      return remaining <= 0;
    };

    if (reqStone > 0 && !consumeFromLists(isStoneItem, reqStone)) return;
    if (reqIron > 0 && !consumeFromLists((it) => it.id === 'iron', reqIron)) return;
    if (reqGold > 0 && !consumeFromLists((it) => it.id === 'gold', reqGold)) return;
    if (reqFuel > 0 && !consumeFromLists(isFuelItem, reqFuel)) return;

    // Add result item to player
    const maxStack = headDef.resultItem.maxStack || 16;
    let remainingAdd = countToForge;
    for (const slot of [...newHotbar, ...newInventory]) {
      if (slot.item && slot.item.id === headDef.resultItem.id && slot.count < maxStack) {
        const canTake = maxStack - slot.count;
        const add = Math.min(remainingAdd, canTake);
        slot.count += add;
        remainingAdd -= add;
        if (remainingAdd <= 0) break;
      }
    }
    if (remainingAdd > 0) {
      for (const slot of [...newHotbar, ...newInventory]) {
        if (!slot.item || slot.count <= 0) {
          const add = Math.min(remainingAdd, maxStack);
          slot.item = headDef.resultItem;
          slot.count = add;
          remainingAdd -= add;
          if (remainingAdd <= 0) break;
        }
      }
    }

    if (remainingAdd > 0) {
      soundManager.playStep('stone');
      setStatusFeedback('Inventory Full!');
      return;
    }

    onUpdateSlots(newHotbar, newInventory);
    soundManager.playAnvilStrike();
    soundManager.playSizzle();
    setStatusFeedback(`Forged ${countToForge}x ${headDef.name} at the Forge!`);
  };

  // 3. Indenting Input Verification
  const hasMoldAndFuelLoaded =
    Boolean(forgeMold.item && forgeMold.item.id === 'mold' && forgeMold.count >= 1) &&
    Boolean(forgeFuel.item && isFuelItem(forgeFuel.item) && forgeFuel.count >= 1);

  const handleQuickLoad = () => {
    const newHotbar = hotbar.map((s) => ({ ...s }));
    const newInventory = inventory.map((s) => ({ ...s }));
    const newMold = { ...forgeMold };
    const newFuel = { ...forgeFuel };

    // Load Blank Mold
    if (!newMold.item || newMold.count <= 0) {
      for (const slot of [...newHotbar, ...newInventory]) {
        if (slot.item && slot.item.id === 'mold' && slot.count > 0) {
          newMold.item = slot.item;
          newMold.count = 1;
          slot.count--;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
          break;
        }
      }
    }

    // Load Fuel
    if (!newFuel.item || newFuel.count <= 0) {
      for (const slot of [...newHotbar, ...newInventory]) {
        if (slot.item && isFuelItem(slot.item) && slot.count > 0) {
          newFuel.item = slot.item;
          newFuel.count = 1;
          slot.count--;
          if (slot.count <= 0) {
            slot.item = null;
            slot.count = 0;
          }
          break;
        }
      }
    }

    commitSlots(newMold, newFuel);
    onUpdateSlots(newHotbar, newInventory);
    soundManager.playPop();
  };

  const handleSlotClick = (slotType: 'mold' | 'fuel') => {
    if (selectedSlotIndex) {
      const srcList = selectedSlotIndex.isHotbar ? hotbar : inventory;
      const srcSlot = srcList[selectedSlotIndex.index];

      if (srcSlot && srcSlot.item && srcSlot.count > 0) {
        if (slotType === 'mold') {
          if (srcSlot.item.id !== 'mold') {
            soundManager.playStep('stone');
            setStatusFeedback('Only Blank Molds can be placed in this slot!');
            return;
          }
          const newHotbar = hotbar.map((s) => ({ ...s }));
          const newInventory = inventory.map((s) => ({ ...s }));
          const targetList = selectedSlotIndex.isHotbar ? newHotbar : newInventory;
          const currentTargetSlot = targetList[selectedSlotIndex.index];

          if (forgeMold.item && forgeMold.count > 0) {
            addItemToPlayer(forgeMold.item, forgeMold.count);
          }

          currentTargetSlot.count -= 1;
          if (currentTargetSlot.count <= 0) {
            currentTargetSlot.item = null;
            currentTargetSlot.count = 0;
          }

          commitSlots({ item: ITEM_REGISTRY['mold'], count: 1 }, forgeFuel);
          onUpdateSlots(newHotbar, newInventory);
          soundManager.playPop();
          if (onClearSelectedSlot) onClearSelectedSlot();
          return;
        }

        if (slotType === 'fuel') {
          if (!isFuelItem(srcSlot.item)) {
            soundManager.playStep('stone');
            setStatusFeedback('Only combustible fuel can be placed in this slot!');
            return;
          }
          const newHotbar = hotbar.map((s) => ({ ...s }));
          const newInventory = inventory.map((s) => ({ ...s }));
          const targetList = selectedSlotIndex.isHotbar ? newHotbar : newInventory;
          const currentTargetSlot = targetList[selectedSlotIndex.index];
          const fuelToPlace = currentTargetSlot.item!;

          if (forgeFuel.item && forgeFuel.count > 0) {
            addItemToPlayer(forgeFuel.item, forgeFuel.count);
          }

          currentTargetSlot.count -= 1;
          if (currentTargetSlot.count <= 0) {
            currentTargetSlot.item = null;
            currentTargetSlot.count = 0;
          }

          commitSlots(forgeMold, { item: fuelToPlace, count: 1 });
          onUpdateSlots(newHotbar, newInventory);
          soundManager.playPop();
          if (onClearSelectedSlot) onClearSelectedSlot();
          return;
        }
      }
    }

    // Otherwise withdraw item to player
    const existing = slotType === 'mold' ? forgeMold : forgeFuel;
    if (existing.item && existing.count > 0) {
      if (addItemToPlayer(existing.item, 1)) {
        const nextCount = existing.count - 1;
        if (slotType === 'mold') {
          commitSlots(
            { item: nextCount > 0 ? existing.item : null, count: nextCount },
            forgeFuel
          );
        } else {
          commitSlots(
            forgeMold,
            { item: nextCount > 0 ? existing.item : null, count: nextCount }
          );
        }
        soundManager.playPop();
      }
    }
  };

  const handleSlotDrop = (e: React.DragEvent, slotType: 'mold' | 'fuel') => {
    e.preventDefault();
    setDragOverSlot(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.type === 'inventory' || data.isHotbar !== undefined) {
        const srcList = data.isHotbar ? hotbar : inventory;
        const srcSlot = srcList[data.index];
        if (!srcSlot || !srcSlot.item || srcSlot.count <= 0) return;

        if (slotType === 'mold') {
          if (srcSlot.item.id !== 'mold') {
            setStatusFeedback('Only Blank Molds fit here!');
            return;
          }
          const newHotbar = hotbar.map((s) => ({ ...s }));
          const newInventory = inventory.map((s) => ({ ...s }));
          const targetList = data.isHotbar ? newHotbar : newInventory;
          if (forgeMold.item && forgeMold.count > 0) {
            addItemToPlayer(forgeMold.item, forgeMold.count);
          }
          targetList[data.index].count -= 1;
          if (targetList[data.index].count <= 0) {
            targetList[data.index].item = null;
            targetList[data.index].count = 0;
          }
          commitSlots({ item: ITEM_REGISTRY['mold'], count: 1 }, forgeFuel);
          onUpdateSlots(newHotbar, newInventory);
          soundManager.playPop();
        } else if (slotType === 'fuel') {
          if (!isFuelItem(srcSlot.item)) {
            setStatusFeedback('Only fuel items fit here!');
            return;
          }
          const newHotbar = hotbar.map((s) => ({ ...s }));
          const newInventory = inventory.map((s) => ({ ...s }));
          const targetList = data.isHotbar ? newHotbar : newInventory;
          const fuelItem = targetList[data.index].item!;
          if (forgeFuel.item && forgeFuel.count > 0) {
            addItemToPlayer(forgeFuel.item, forgeFuel.count);
          }
          targetList[data.index].count -= 1;
          if (targetList[data.index].count <= 0) {
            targetList[data.index].item = null;
            targetList[data.index].count = 0;
          }
          commitSlots(forgeMold, { item: fuelItem, count: 1 });
          onUpdateSlots(newHotbar, newInventory);
          soundManager.playPop();
        }
      }
    } catch {
      // Ignored
    }
  };

  // Evaluate 16x16 indented tiles against the mold templates
  const matchedMoldResult = useMemo(() => {
    if (!hasMoldAndFuelLoaded) return null;

    const clickedCount = indentedTiles.filter(Boolean).length;
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

    let bestMatch: { template: (typeof MOLD_TEMPLATES)[0]; score: number } | null = null;
    for (const tmpl of MOLD_TEMPLATES) {
      const score = scoreMaskAgainstTemplate(indentedTiles, tmpl.pattern);
      const effectiveScore = tmpl.id === selectedMoldGuide ? score + 0.02 : score;

      if (score >= 0.50 && (!bestMatch || effectiveScore > bestMatch.score)) {
        bestMatch = { template: tmpl, score: effectiveScore };
      }
    }
    return bestMatch;
  }, [indentedTiles, hasMoldAndFuelLoaded, selectedMoldGuide]);

  // Click / drag to indent a tile inward into the heated mold plate
  const handleIndentTile = (idx: number, nextVal: boolean) => {
    if (!hasMoldAndFuelLoaded) {
      soundManager.playStep('stone');
      setStatusFeedback('Load 1 Blank Mold and 1 Fuel source on the left first!');
      return;
    }
    setIndentedTiles((prev) => {
      if (prev[idx] === nextVal) return prev;
      const copy = [...prev];
      copy[idx] = nextVal;
      return copy;
    });
    soundManager.playAnvilStrike();
  };

  // Stamp guide pattern directly into the mold plate
  const handleStampGuidePattern = () => {
    if (!hasMoldAndFuelLoaded) {
      setStatusFeedback('Load 1 Blank Mold and 1 Fuel source on the left first!');
      return;
    }
    const activeGuide = MOLD_TEMPLATES.find((t) => t.id === selectedMoldGuide)!;
    const newTiles = Array(256).fill(false);
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (activeGuide.pattern[r][c] === '#') {
          newTiles[r * 16 + c] = true;
        }
      }
    }
    setIndentedTiles(newTiles);
    soundManager.playMoldIndent();
    setStatusFeedback(`Pressed ${activeGuide.name} cavity pattern!`);
  };

  // Finish indenting: Consumes 1 Blank Mold + 1 Fuel, and gives the Indented Mold!
  const handleFinishIndenting = () => {
    if (!hasMoldAndFuelLoaded || !matchedMoldResult) return;

    const resultMold = matchedMoldResult.template.item;
    if (!addItemToPlayer(resultMold, 1)) {
      soundManager.playStep('stone');
      setStatusFeedback('Inventory Full!');
      return;
    }

    // Consume 1 mold and 1 fuel
    const nextMold = { ...forgeMold };
    const nextFuel = { ...forgeFuel };
    nextMold.count -= 1;
    if (nextMold.count <= 0) {
      nextMold.item = null;
      nextMold.count = 0;
    }
    nextFuel.count -= 1;
    if (nextFuel.count <= 0) {
      nextFuel.item = null;
      nextFuel.count = 0;
    }

    commitSlots(nextMold, nextFuel);
    setIndentedTiles(Array(256).fill(false));
    soundManager.playMoldIndent();
    soundManager.playSizzle();
    setStatusFeedback(`Successfully indented ${resultMold.name}!`);
  };

  // Filtered Tool Heads for the Heads tab
  const displayedToolHeads = useMemo(() => {
    if (headCategoryFilter === 'all') return FORGE_TOOL_HEADS;
    return FORGE_TOOL_HEADS.filter((h) => h.category === headCategoryFilter);
  }, [headCategoryFilter]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-stone-950 border-b-2 border-stone-800 font-mono">
      {/* Top Station Tabs: Tool Heads Forging vs Mold Indenting Studio */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('heads')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase transition cursor-pointer border ${
              activeTab === 'heads'
                ? 'border-orange-500 bg-orange-600 text-stone-950 shadow-sm'
                : 'border-stone-700 bg-stone-950 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Hammer className="h-3.5 w-3.5" />
            <span>Tool Heads Forging</span>
          </button>

          <button
            onClick={() => setActiveTab('molds')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase transition cursor-pointer border ${
              activeTab === 'molds'
                ? 'border-orange-500 bg-orange-600 text-stone-950 shadow-sm'
                : 'border-stone-700 bg-stone-950 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>16x16 Mold Studio</span>
          </button>
        </div>

        {/* Player Available Materials Pill Badges */}
        <div className="hidden sm:flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-stone-400">
            <span className="font-bold text-stone-200">{stoneCount}</span> Stone
          </span>
          <span className="flex items-center gap-1 text-stone-400">
            <span className="font-bold text-sky-300">{ironCount}</span> Iron
          </span>
          <span className="flex items-center gap-1 text-stone-400">
            <span className="font-bold text-amber-300">{goldCount}</span> Gold
          </span>
          <span className="flex items-center gap-1 text-stone-400">
            <span className="font-bold text-orange-400">{fuelCount}</span> Fuel
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: TOOL HEADS FORGING (Stone, Iron, Gold Tool Heads)    */}
      {/* ============================================================ */}
      {activeTab === 'heads' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 gap-3 overflow-hidden">
          {/* Left Column: Quick Mold Crafter & Category Filters */}
          <div className="flex-[1] flex flex-col justify-between bg-stone-900 border-2 border-stone-800 p-3 min-w-[210px] shrink-0">
            <div>
              {/* Quick 3-Iron Mold Forger */}
              <div className="border-b border-stone-800 pb-2.5 mb-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-stone-300" />
                    Make Molds (3 Iron)
                  </span>
                  <span className="text-[10px] text-stone-400">{ironCount} in bag</span>
                </div>
                <button
                  onClick={handleForgeBlankMold}
                  disabled={ironCount < 3}
                  className={`w-full py-1.5 px-2 text-[11px] font-bold uppercase border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    ironCount >= 3
                      ? 'border-amber-400 bg-amber-600 text-stone-950 hover:bg-amber-500 shadow-sm'
                      : 'border-stone-800 bg-stone-950 text-stone-600 cursor-not-allowed'
                  }`}
                  title="Forge 1 Blank Mold using 3 iron ingots"
                >
                  <Hammer className="h-3.5 w-3.5" />
                  <span>Forge Blank Mold (3 Iron)</span>
                </button>
              </div>

              {/* Head Categories Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Filter Heads:
                </span>
                {[
                  { id: 'all', label: 'All Tool Heads' },
                  { id: 'stone', label: 'Stone Heads (1 Stone)' },
                  { id: 'iron', label: 'Iron Heads (1 Iron + 1 Fuel)' },
                  { id: 'gold', label: 'Gold Heads (1 Gold + 1 Fuel)' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setHeadCategoryFilter(cat.id as any)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs font-bold transition cursor-pointer border ${
                      headCategoryFilter === cat.id
                        ? 'border-orange-500 bg-orange-950/60 text-orange-200'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-stone-500 border-t border-stone-800 pt-2 mt-2">
              Tool heads are forged at high heat and assembled with 1 wooden plank in the Tool Crafter workbench.
            </div>
          </div>

          {/* Right Column: Tool Heads Grid */}
          <div className="flex-[3] flex flex-col bg-stone-900 border-2 border-stone-800 p-3 min-h-0 overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-stone-800">
              <span className="text-xs font-bold uppercase text-orange-400 flex items-center gap-1.5">
                <Hammer className="h-3.5 w-3.5" />
                Forging Tool Heads ({displayedToolHeads.length})
              </span>
              <span className="text-[10px] text-stone-400">
                Click "Forge" to craft onto anvil
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {displayedToolHeads.map((headDef) => {
                const reqStone = headDef.ingredients.stoneCount || 0;
                const reqIron = headDef.ingredients.ironCount || 0;
                const reqGold = headDef.ingredients.goldCount || 0;
                const reqFuel = headDef.ingredients.fuelCount || 0;

                const hasStone = stoneCount >= reqStone;
                const hasIron = ironCount >= reqIron;
                const hasGold = goldCount >= reqGold;
                const hasFuel = fuelCount >= reqFuel;

                const canForge1x = hasStone && hasIron && hasGold && hasFuel;

                // Max craftable
                let maxCraftable = 999;
                if (reqStone > 0) maxCraftable = Math.min(maxCraftable, Math.floor(stoneCount / reqStone));
                if (reqIron > 0) maxCraftable = Math.min(maxCraftable, Math.floor(ironCount / reqIron));
                if (reqGold > 0) maxCraftable = Math.min(maxCraftable, Math.floor(goldCount / reqGold));
                if (reqFuel > 0) maxCraftable = Math.min(maxCraftable, Math.floor(fuelCount / reqFuel));
                if (maxCraftable === 999) maxCraftable = 0;

                const hasMatchingMold = headDef.moldId ? getItemCountInPlayer(headDef.moldId) > 0 : false;

                return (
                  <div
                    key={headDef.id}
                    className={`flex flex-col justify-between p-2.5 border-2 transition ${
                      canForge1x
                        ? 'border-stone-700 bg-stone-950 hover:border-orange-500'
                        : 'border-stone-850 bg-stone-950/60 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone-700 bg-stone-900">
                          <ItemIcon item={headDef.resultItem} className="w-8 h-8 drop-shadow" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-stone-200 truncate">
                            {headDef.name}
                          </div>
                          <div className="text-[10px] text-stone-400 uppercase">
                            {headDef.category} tier blade
                          </div>
                          {hasMatchingMold && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 font-bold bg-emerald-950/80 px-1 border border-emerald-700 mt-0.5">
                              <Zap className="h-2.5 w-2.5" /> Mold Castable
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Required Ingredients */}
                      <div className="space-y-0.5 mb-2 text-[10px]">
                        {reqStone > 0 && (
                          <div className={`flex justify-between ${hasStone ? 'text-stone-300' : 'text-rose-400 font-bold'}`}>
                            <span>Stone:</span>
                            <span>{stoneCount}/{reqStone}</span>
                          </div>
                        )}
                        {reqIron > 0 && (
                          <div className={`flex justify-between ${hasIron ? 'text-stone-300' : 'text-rose-400 font-bold'}`}>
                            <span>Iron Ingot:</span>
                            <span>{ironCount}/{reqIron}</span>
                          </div>
                        )}
                        {reqGold > 0 && (
                          <div className={`flex justify-between ${hasGold ? 'text-stone-300' : 'text-rose-400 font-bold'}`}>
                            <span>Gold Ingot:</span>
                            <span>{goldCount}/{reqGold}</span>
                          </div>
                        )}
                        {reqFuel > 0 && (
                          <div className={`flex justify-between ${hasFuel ? 'text-stone-300' : 'text-rose-400 font-bold'}`}>
                            <span>Fuel Source:</span>
                            <span>{fuelCount}/{reqFuel}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-stone-850">
                      <button
                        onClick={() => handleForgeToolHead(headDef, 1)}
                        disabled={!canForge1x}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold uppercase border transition cursor-pointer flex items-center justify-center gap-1 ${
                          canForge1x
                            ? 'border-orange-500 bg-orange-600 text-stone-950 hover:bg-orange-500 shadow-sm'
                            : 'border-stone-800 bg-stone-900 text-stone-600 cursor-not-allowed'
                        }`}
                      >
                        <Hammer className="h-3 w-3" />
                        <span>Forge 1x</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: 16x16 MOLD INDENTING STUDIO                          */}
      {/* ============================================================ */}
      {activeTab === 'molds' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 gap-3 overflow-hidden">
          {/* LEFT: 1 Mold Slot (Top) + 1 Fuel Slot (Bottom) + Guide Selector + 3-Iron Mold Forging */}
          <div className="flex-[2] flex flex-col justify-between bg-stone-900 border-2 border-stone-800 p-3 min-w-[240px] overflow-y-auto scrollbar-thin">
            <div>
              {/* Quick 3-Iron Mold Forger */}
              <div className="border-b border-stone-800 pb-2 mb-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-stone-300" />
                    Make Molds (3 Iron)
                  </span>
                  <span className="text-[10px] text-stone-400">{playerIronCount} Iron in bag</span>
                </div>
                <button
                  onClick={handleForgeBlankMold}
                  disabled={playerIronCount < 3}
                  className={`w-full py-1.5 px-2 text-[11px] font-bold uppercase border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    playerIronCount >= 3
                      ? 'border-amber-400 bg-amber-600 text-stone-950 hover:bg-amber-500 shadow-sm'
                      : 'border-stone-800 bg-stone-950 text-stone-600 cursor-not-allowed'
                  }`}
                  title="Forge 1 Blank Mold using 3 iron ingots"
                >
                  <Hammer className="h-3.5 w-3.5" />
                  <span>Forge Blank Mold (3 Iron)</span>
                </button>
              </div>

              {/* Materials Input for Indenting */}
              <div className="border-b border-stone-800 pb-1.5 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-400 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  Indent Materials
                </span>
                <button
                  onClick={handleQuickLoad}
                  className="px-2 py-0.5 text-[10px] uppercase font-bold border border-stone-700 bg-stone-950 text-amber-300 hover:bg-stone-800 cursor-pointer"
                  title="Auto-load 1 Blank Mold and 1 Fuel source from inventory"
                >
                  Auto-Load
                </button>
              </div>

              {/* Vertical Stack: Top Slot (1 Blank Mold) & Bottom Slot (1 Fuel) */}
              <div className="flex flex-col items-center gap-2.5 py-2 bg-stone-950/70 border border-stone-800 p-2.5">
                {/* Top Slot: 1 Blank Mold */}
                <div className="flex items-center gap-2.5 w-full">
                  <div
                    id="forge-mold-slot"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverSlot('mold');
                    }}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => handleSlotDrop(e, 'mold')}
                    onClick={() => handleSlotClick('mold')}
                    title="Place 1 Blank Mold here (click with mold selected, drag here, or use Auto-Load)"
                    className={`relative flex h-13 w-13 shrink-0 items-center justify-center border-2 transition-all cursor-pointer ${
                      dragOverSlot === 'mold'
                        ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105'
                        : forgeMold.item
                        ? 'border-emerald-600 bg-stone-900 hover:border-amber-400'
                        : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-amber-500/60'
                    }`}
                  >
                    {forgeMold.item ? (
                      <>
                        <ItemIcon item={forgeMold.item} className="w-9 h-9 drop-shadow" />
                        {forgeMold.count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[10px] font-black text-amber-300 pointer-events-none">
                            {forgeMold.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] text-stone-600 uppercase text-center leading-tight px-1 pointer-events-none">
                        Mold
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-stone-200">1x Blank Mold</span>
                    <span className="text-[10px] text-stone-400 truncate">
                      {forgeMold.item ? `${forgeMold.item.name} loaded` : 'Load blank mold'}
                    </span>
                  </div>
                </div>

                {/* Bottom Slot: 1 Fuel Source */}
                <div className="flex items-center gap-2.5 w-full">
                  <div
                    id="forge-fuel-slot"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverSlot('fuel');
                    }}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => handleSlotDrop(e, 'fuel')}
                    onClick={() => handleSlotClick('fuel')}
                    title="Place 1 Fuel source here (Wood, Planks, Charcoal, etc.)"
                    className={`relative flex h-13 w-13 shrink-0 items-center justify-center border-2 transition-all cursor-pointer ${
                      dragOverSlot === 'fuel'
                        ? 'border-orange-400 bg-orange-950/70 ring-2 ring-orange-400 scale-105'
                        : forgeFuel.item
                        ? 'border-orange-500 bg-stone-900 hover:border-amber-400'
                        : 'border-t-black border-l-black border-b-stone-700 border-r-stone-700 bg-stone-900 hover:border-orange-500/60'
                    }`}
                  >
                    {forgeFuel.item ? (
                      <>
                        <ItemIcon item={forgeFuel.item} className="w-9 h-9 drop-shadow" />
                        {forgeFuel.count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-stone-950 border border-stone-800 px-1 text-[10px] font-black text-amber-300 pointer-events-none">
                            {forgeFuel.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <Flame className="h-6 w-6 text-stone-700 pointer-events-none" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-orange-300">1x Fuel Source</span>
                    <span className="text-[10px] text-stone-400 truncate">
                      {forgeFuel.item ? `${forgeFuel.item.name} loaded` : 'Wood, charcoal, planks'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shape Guide Selector */}
              <div className="mt-2.5">
                <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">
                  Target Mold Shape Guide:
                </div>
                <div className="space-y-1">
                  {MOLD_TEMPLATES.map((tmpl) => {
                    const isSel = selectedMoldGuide === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedMoldGuide(tmpl.id)}
                        className={`w-full flex items-center gap-2 p-1.5 border text-left transition cursor-pointer ${
                          isSel
                            ? 'border-orange-400 bg-orange-950/60 text-orange-200'
                            : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <ItemIcon item={tmpl.item} className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold truncate">{tmpl.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-stone-500 border-t border-stone-800 pt-1.5 mt-2">
              Consumes 1 Blank Mold & 1 Fuel when indented
            </div>
          </div>

          {/* RIGHT: 16x16 Interactive Heated Mold Slab & Output */}
          <div className="flex-[3] flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-stone-900 border-2 border-stone-800 min-h-0">
            {/* 16x16 Mold Matrix */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-full flex items-center justify-between text-[11px]">
                <span className="font-bold text-orange-400 uppercase flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  16x16 Heated Iron Mold Slab
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStampGuidePattern}
                    className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer flex items-center gap-1"
                    title="Heat and stamp the selected guide shape into the mold"
                  >
                    <Stamp className="h-3 w-3" />
                    Stamp Guide
                  </button>
                  <button
                    onClick={() => setIndentedTiles(Array(256).fill(false))}
                    className="text-[10px] text-stone-400 hover:text-stone-200 underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Slab
                  </button>
                </div>
              </div>

              {/* 16x16 Grid: Click or drag to indent */}
              <div
                className="grid p-1.5 bg-stone-950 border-2 border-stone-700 shadow-inner select-none"
                style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
                onMouseLeave={() => {
                  isIndentingMouseDownRef.current = false;
                }}
              >
                {indentedTiles.map((isIndented, idx) => {
                  const r = Math.floor(idx / 16);
                  const c = idx % 16;
                  const activeGuide = MOLD_TEMPLATES.find((t) => t.id === selectedMoldGuide)!;
                  const isGuideTile = activeGuide.pattern[r][c] === '#';

                  return (
                    <div
                      key={`indent-${idx}`}
                      data-indent-index={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const nextVal = !isIndented;
                        isIndentingMouseDownRef.current = true;
                        indentDragTargetValueRef.current = nextVal;
                        handleIndentTile(idx, nextVal);
                      }}
                      onMouseEnter={() => {
                        if (isIndentingMouseDownRef.current) {
                          handleIndentTile(idx, indentDragTargetValueRef.current);
                        }
                      }}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border transition-all cursor-pointer relative select-none ${
                        !hasMoldAndFuelLoaded
                          ? isGuideTile
                            ? 'bg-zinc-850 border-orange-500/30'
                            : 'bg-zinc-900 border-zinc-800'
                          : isIndented
                          ? isGuideTile
                            ? 'bg-stone-950 border-amber-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] ring-1 ring-amber-400/80'
                            : 'bg-stone-950 border-orange-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] ring-1 ring-orange-500/50'
                          : isGuideTile
                          ? 'bg-zinc-800 border-amber-500/50 hover:bg-zinc-700 shadow-sm'
                          : 'bg-zinc-750 border-zinc-650 hover:bg-zinc-650'
                      }`}
                      title={
                        isGuideTile
                          ? `Row ${r + 1}, Col ${c + 1} (${activeGuide.name} Cavity Guide)`
                          : `Row ${r + 1}, Col ${c + 1}`
                      }
                    >
                      {/* Glowing molten ember indicator inside indented cavity */}
                      {isIndented && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 shadow-[0_0_8px_rgba(251,146,60,1)] animate-pulse" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <span className="text-[10px] text-stone-500 text-center">
                {hasMoldAndFuelLoaded
                  ? 'Click or drag across the slab to press & indent the mold cavity'
                  : 'Load 1 Blank Mold & 1 Fuel source in the left slots to begin indenting'}
              </span>
            </div>

            {/* OUTPUT BOX: Target Mold Result & Indent Button */}
            <div className="flex flex-col items-center justify-between w-full sm:w-36 p-3 bg-stone-950 border-2 border-stone-800 self-stretch">
              <div className="w-full flex flex-col items-center gap-1.5 text-center">
                <span className="text-[10px] font-bold uppercase text-orange-400">
                  Indented Mold Result
                </span>

                <div
                  className={`flex h-16 w-16 items-center justify-center border-2 transition-all ${
                    matchedMoldResult
                      ? 'border-orange-500 bg-orange-950/40 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                      : 'border-stone-800 bg-stone-900'
                  }`}
                >
                  {matchedMoldResult ? (
                    <ItemIcon item={matchedMoldResult.template.item} className="w-10 h-10 drop-shadow" />
                  ) : (
                    <ItemIcon
                      item={MOLD_TEMPLATES.find((t) => t.id === selectedMoldGuide)?.item}
                      className="w-10 h-10 opacity-30 grayscale drop-shadow"
                    />
                  )}
                </div>

                <span className="text-xs font-bold text-orange-300 text-center min-h-[16px]">
                  {matchedMoldResult ? matchedMoldResult.template.name : '—'}
                </span>
              </div>

              <button
                onClick={handleFinishIndenting}
                disabled={!matchedMoldResult}
                className={`w-full py-2 px-3 font-mono text-xs font-bold uppercase tracking-wider transition border-2 cursor-pointer ${
                  matchedMoldResult
                    ? 'border-t-orange-400 border-l-orange-400 border-b-orange-900 border-r-orange-900 bg-orange-500 text-stone-950 hover:bg-orange-400 shadow-md'
                    : 'border-stone-800 bg-stone-900 text-stone-600 cursor-not-allowed'
                }`}
              >
                Indent Mold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
