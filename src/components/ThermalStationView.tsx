import React, { useState, useEffect } from 'react';
import { Flame, Snowflake, ShieldCheck, AlertTriangle, Thermometer, BatteryCharging, ArrowDown, ArrowUp, Info } from 'lucide-react';
import { InventorySlot, ItemDef } from '../types';
import { ItemIcon } from './ItemIcon';
import { isFuelItem } from '../game/systems/ItemRegistry';
import { soundManager } from '../game/audio/SoundFX';
import type { VoxelWorld } from '../game/voxel/VoxelWorld';
import type { TargetTemp, ThermalStationData, ThermalStationType } from '../game/environment/ThermalWorkstationManager';

interface ThermalStationViewProps {
  stationType: ThermalStationType;
  coords: { x: number; y: number; z: number } | null;
  world: VoxelWorld | null;
  hotbar: InventorySlot[];
  inventory: InventorySlot[];
  onUpdateSlots: (newHotbar: InventorySlot[], newInventory: InventorySlot[]) => void;
  setStatusFeedback: (msg: string | null) => void;
  selectedSlotIndex: { isHotbar: boolean; index: number } | null;
  onClearSelectedSlot: () => void;
}

export const ThermalStationView: React.FC<ThermalStationViewProps> = ({
  stationType,
  coords,
  world,
  hotbar,
  inventory,
  onUpdateSlots,
  setStatusFeedback,
  selectedSlotIndex,
  onClearSelectedSlot
}) => {
  const [stationData, setStationData] = useState<ThermalStationData | null>(null);
  const [isDragOverFuel, setIsDragOverFuel] = useState<boolean>(false);
  const [, setRefreshTick] = useState<number>(0);

  // Sync with world's ThermalWorkstationManager
  useEffect(() => {
    if (!coords || !world) return;
    const manager = world.thermalWorkstationManager;
    const station = manager.getOrCreateStation(coords.x, coords.y, coords.z, stationType, world);
    setStationData({ ...station, roomAirCoords: new Set(station.roomAirCoords) });

    const interval = window.setInterval(() => {
      const current = manager.getStation(coords.x, coords.y, coords.z);
      if (current) {
        setStationData({ ...current, roomAirCoords: new Set(current.roomAirCoords) });
      }
      setRefreshTick((t) => t + 1);
    }, 200);

    return () => clearInterval(interval);
  }, [coords, world, stationType]);

  const isHeater = stationType === 'heater';
  const themeColor = isHeater ? 'amber' : 'cyan';
  const isOperating = (stationData?.fuelCount ?? 0) > 0;

  // Deposit fuel into the workstation
  const handleDepositFuel = (amount?: number) => {
    if (!stationData || !coords || !world) return;
    const manager = world.thermalWorkstationManager;

    // Check if player has selected a slot or look through hotbar/inventory for valid fuel
    let sourceSlot: { isHotbar: boolean; index: number } | null = null;
    let foundFuelItem: ItemDef | null = null;

    if (selectedSlotIndex) {
      const list = selectedSlotIndex.isHotbar ? hotbar : inventory;
      const s = list[selectedSlotIndex.index];
      if (s.item && isFuelItem(s.item)) {
        sourceSlot = selectedSlotIndex;
        foundFuelItem = s.item;
      } else {
        setStatusFeedback(`${s.item?.name || 'Item'} is not a valid fuel source!`);
        return;
      }
    } else {
      // Find first fuel in hotbar or inventory
      for (let i = 0; i < hotbar.length; i++) {
        if (hotbar[i].item && isFuelItem(hotbar[i].item)) {
          sourceSlot = { isHotbar: true, index: i };
          foundFuelItem = hotbar[i].item;
          break;
        }
      }
      if (!sourceSlot) {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i].item && isFuelItem(inventory[i].item)) {
            sourceSlot = { isHotbar: false, index: i };
            foundFuelItem = inventory[i].item;
            break;
          }
        }
      }
    }

    if (!sourceSlot || !foundFuelItem) {
      setStatusFeedback('No fuel found in inventory or selected slot!');
      return;
    }

    // Check compatibility with already loaded fuel
    if (stationData.fuelItem && stationData.fuelItem.id !== foundFuelItem.id && stationData.fuelCount > 0) {
      setStatusFeedback(`Cannot mix ${foundFuelItem.name} with already loaded ${stationData.fuelItem.name}!`);
      return;
    }

    const currentList = sourceSlot.isHotbar ? [...hotbar] : [...inventory];
    const itemInSource = currentList[sourceSlot.index];
    if (!itemInSource || !itemInSource.item || itemInSource.count <= 0) return;

    const currentCount = stationData.fuelCount;
    const spaceRemaining = 64 - currentCount;
    if (spaceRemaining <= 0) {
      setStatusFeedback('Fuel storage is already full (64/64)!');
      return;
    }

    const toTransfer = amount !== undefined
      ? Math.min(amount, itemInSource.count, spaceRemaining)
      : Math.min(itemInSource.count, spaceRemaining);

    if (toTransfer <= 0) return;

    // Deduct from player
    itemInSource.count -= toTransfer;
    if (itemInSource.count <= 0) {
      itemInSource.item = null;
      itemInSource.count = 0;
    }

    if (sourceSlot.isHotbar) {
      onUpdateSlots(currentList, inventory);
    } else {
      onUpdateSlots(hotbar, currentList);
    }

    // Add to workstation
    const newCount = currentCount + toTransfer;
    manager.setStationFuel(coords.x, coords.y, coords.z, foundFuelItem, newCount);
    setStationData((prev) =>
      prev
        ? {
            ...prev,
            fuelItem: foundFuelItem,
            fuelCount: newCount
          }
        : null
    );

    soundManager.playChime(isHeater ? 520 : 660);
    setStatusFeedback(`Added ${toTransfer}x ${foundFuelItem.name} to fuel storage`);
    onClearSelectedSlot();
  };

  // Withdraw fuel back to inventory
  const handleTakeFuel = (amount?: number) => {
    if (!stationData || !coords || !world || stationData.fuelCount <= 0 || !stationData.fuelItem) return;
    const manager = world.thermalWorkstationManager;
    const fuelItem = stationData.fuelItem;

    const countToTake = amount ? Math.min(amount, stationData.fuelCount) : stationData.fuelCount;

    // Add back into hotbar or inventory
    let remaining = countToTake;
    const nextHotbar = hotbar.map((s) => ({ ...s }));
    const nextInv = inventory.map((s) => ({ ...s }));

    // Try stacking first
    for (const slot of [...nextHotbar, ...nextInv]) {
      if (slot.item && slot.item.id === fuelItem.id && slot.count < (slot.item.maxStack || 64)) {
        const canAdd = (slot.item.maxStack || 64) - slot.count;
        const add = Math.min(remaining, canAdd);
        slot.count += add;
        remaining -= add;
        if (remaining <= 0) break;
      }
    }

    // Try empty slots
    if (remaining > 0) {
      for (const slot of [...nextHotbar, ...nextInv]) {
        if (!slot.item || slot.count === 0) {
          const add = Math.min(remaining, fuelItem.maxStack || 64);
          slot.item = fuelItem;
          slot.count = add;
          remaining -= add;
          if (remaining <= 0) break;
        }
      }
    }

    const taken = countToTake - remaining;
    if (taken <= 0) {
      setStatusFeedback('Inventory full! Cannot retrieve fuel.');
      return;
    }

    onUpdateSlots(nextHotbar, nextInv);

    const newCount = stationData.fuelCount - taken;
    manager.setStationFuel(coords.x, coords.y, coords.z, newCount > 0 ? fuelItem : null, newCount);
    setStationData((prev) =>
      prev
        ? {
            ...prev,
            fuelCount: newCount,
            fuelItem: newCount > 0 ? fuelItem : null
          }
        : null
    );

    soundManager.playStep('stone');
    setStatusFeedback(`Retrieved ${taken}x ${fuelItem.name} from workstation`);
  };

  // Target temperature toggle (H / M / C)
  const handleSetTargetTemp = (temp: TargetTemp) => {
    if (!stationData || !coords || !world) return;
    if (!stationData.isEnclosed) {
      setStatusFeedback('Requires an enclosed insulated space to configure Target Temp!');
      return;
    }

    const manager = world.thermalWorkstationManager;
    manager.setStationTargetTemp(coords.x, coords.y, coords.z, temp);
    setStationData((prev) => (prev ? { ...prev, targetTemp: temp } : null));

    soundManager.playChime(temp === 'H' ? 620 : temp === 'M' ? 520 : 440);
    setStatusFeedback(`Target Temperature set to: ${temp === 'H' ? 'High' : temp === 'M' ? 'Medium' : 'Cold'}`);
  };

  const dayProgressPercent = Math.round((stationData?.dayFuelProgress ?? 0) * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-950 p-4 gap-4 overflow-y-auto font-mono text-stone-200">
      
      {/* ── TOP HEADER / WORKSTATION IDENTITY ── */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-2 p-3 ${
        isHeater
          ? 'border-amber-600/80 bg-amber-950/30 text-amber-200'
          : 'border-cyan-600/80 bg-cyan-950/30 text-cyan-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 border-2 ${
            isHeater
              ? 'border-amber-500 bg-amber-900/60 text-amber-300'
              : 'border-cyan-400 bg-cyan-900/60 text-cyan-200'
          }`}>
            {isHeater ? <Flame className="h-7 w-7 animate-pulse" /> : <Snowflake className="h-7 w-7 animate-pulse" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-white">
                {isHeater ? 'Thermal Radiator Workstation' : 'Cryo Condenser Workstation'}
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                isOperating
                  ? 'border-emerald-500 bg-emerald-950/80 text-emerald-300 ring-1 ring-emerald-500/50'
                  : 'border-stone-700 bg-stone-900 text-stone-400'
              }`}>
                {isOperating ? '● Operating' : '○ Out of Fuel'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isHeater
                ? 'Thermal field radiator • Suppresses snow & melts ice • Enclosed climate control'
                : 'Cryogenic atmospheric cooler • Freezes water & preserves snow • Enclosed climate control'}
            </p>
          </div>
        </div>

        {coords && (
          <div className="text-[11px] text-stone-400 font-mono mt-2 sm:mt-0 bg-stone-900/80 px-2.5 py-1 border border-stone-800">
            Location: X: {coords.x}, Y: {coords.y}, Z: {coords.z}
          </div>
        )}
      </div>

      {/* ── MAIN CONTROLS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* LEFT COLUMN: FUEL STORAGE & CONSUMPTION */}
        <div className="border-2 border-stone-800 bg-stone-900 p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <BatteryCharging className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                Fuel Reservoir (1 Stack Max)
              </span>
            </div>
            <span className="text-[11px] text-stone-400">
              Consumes 1 unit / day
            </span>
          </div>

          {/* Interactive Fuel Slot + Progress */}
          <div className="flex items-center gap-4 bg-stone-950 p-3 border border-stone-800">
            {/* Slot Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverFuel(true);
              }}
              onDragLeave={() => setIsDragOverFuel(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverFuel(false);
                handleDepositFuel();
              }}
              onClick={() => handleDepositFuel()}
              onContextMenu={(e) => {
                e.preventDefault();
                handleTakeFuel(1);
              }}
              title="Click or drop fuel to load (Max 64). Right-click to retrieve."
              className={`relative flex h-16 w-16 shrink-0 items-center justify-center border-2 cursor-pointer transition-all ${
                isDragOverFuel
                  ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400 scale-105'
                  : stationData?.fuelItem
                  ? 'border-amber-500 bg-stone-900 shadow-[inset_0_0_12px_rgba(245,158,11,0.2)]'
                  : 'border-stone-700 bg-stone-900/60 hover:border-amber-500/60'
              }`}
            >
              {stationData?.fuelItem ? (
                <>
                  <ItemIcon item={stationData.fuelItem} className="w-10 h-10 drop-shadow" />
                  <span className="absolute bottom-1 right-1 bg-stone-950/90 border border-amber-500/80 px-1 text-[11px] font-black text-amber-300 pointer-events-none">
                    {stationData.fuelCount}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-stone-600 pointer-events-none">
                  <Flame className="h-6 w-6 opacity-40 mb-0.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Empty</span>
                </div>
              )}
            </div>

            {/* Status & Stats */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-200">
                  {stationData?.fuelItem ? stationData.fuelItem.name : 'No Fuel Loaded'}
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {stationData?.fuelCount ?? 0} / 64
                </span>
              </div>

              {/* Day Burn Progress Bar */}
              <div className="w-full bg-stone-900 border border-stone-800 h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isHeater ? 'bg-gradient-to-r from-amber-600 to-orange-400' : 'bg-gradient-to-r from-cyan-600 to-sky-400'
                  }`}
                  style={{ width: `${stationData?.fuelCount ? dayProgressPercent : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>
                  {stationData?.fuelCount ? `Current Day Burn: ${dayProgressPercent}%` : 'Burner idle'}
                </span>
                <span className="text-amber-300 font-bold">
                  {stationData?.fuelCount ? `~${stationData.fuelCount} days remaining` : '0 days'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Fuel Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDepositFuel(1)}
              className="px-2 py-1.5 border border-stone-700 bg-stone-800 hover:bg-stone-700 hover:border-amber-500 text-xs font-bold text-stone-200 transition-colors flex items-center justify-center gap-1"
            >
              <ArrowDown className="h-3 w-3 text-amber-400" />
              Deposit 1
            </button>
            <button
              onClick={() => handleDepositFuel()}
              className="px-2 py-1.5 border border-amber-600/80 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400 text-xs font-bold text-amber-200 transition-colors flex items-center justify-center gap-1"
            >
              <ArrowDown className="h-3 w-3 text-amber-400" />
              Deposit Stack
            </button>
            <button
              onClick={() => handleTakeFuel()}
              disabled={!stationData?.fuelCount}
              className={`px-2 py-1.5 border text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                stationData?.fuelCount
                  ? 'border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200'
                  : 'border-stone-800 bg-stone-900 text-stone-600 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="h-3 w-3 text-stone-400" />
              Retrieve
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 5x5 RADIUS FIELD & TARGET TEMPERATURE */}
        <div className="border-2 border-stone-800 bg-stone-900 p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <Thermometer className={`h-4 w-4 ${isHeater ? 'text-amber-400' : 'text-cyan-400'}`} />
              <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                Thermal Range & Climate Setting
              </span>
            </div>
            <span className="text-[11px] text-stone-400">
              5x5 Radius Active
            </span>
          </div>

          {/* 5x5 Radius Status Banner */}
          <div className={`p-2.5 border text-xs leading-relaxed ${
            isHeater
              ? 'border-amber-600/60 bg-amber-950/20 text-amber-200'
              : 'border-cyan-600/60 bg-cyan-950/20 text-cyan-200'
          }`}>
            <span className="font-bold uppercase tracking-wider block mb-0.5">
              {isHeater ? '🔥 5x5 Thermal Range' : '❄️ 5x5 Cryo Range'}
            </span>
            {isHeater
              ? 'Prevents snow from gathering and actively melts all ice into water within a 5x5 area.'
              : 'Permanently prevents snow from melting and freezes all water into packed ice within a 5x5 area.'}
          </div>

          {/* Enclosure & Target Temp (H/M/C) Section */}
          <div className="bg-stone-950 p-3 border border-stone-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {stationData?.isEnclosed ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-xs font-bold text-stone-200">
                  {stationData?.isEnclosed ? 'Enclosed Chamber' : 'Open Environment'}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                stationData?.isEnclosed
                  ? 'border-emerald-500/80 bg-emerald-950 text-emerald-300'
                  : 'border-stone-700 bg-stone-900 text-stone-400'
              }`}>
                {stationData?.isEnclosed ? `${stationData.enclosedAirVolume} / 1000 Air Blocks` : 'Unsealed'}
              </span>
            </div>

            {/* Target Temperature Controls (H / M / C) */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-stone-300 font-semibold">
                  Target Temperature (H / M / C):
                </span>
                <span className="text-[10px] text-stone-500">
                  {stationData?.isEnclosed ? 'Unlocked' : 'Locked'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['H', 'M', 'C'] as TargetTemp[]).map((t) => {
                  const isSelected = stationData?.targetTemp === t;
                  const label = t === 'H' ? 'Hot' : t === 'M' ? 'Medium' : 'Cold';
                  const disabled = !stationData?.isEnclosed;

                  return (
                    <button
                      key={t}
                      disabled={disabled}
                      onClick={() => handleSetTargetTemp(t)}
                      className={`py-2 px-2 border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                        disabled
                          ? 'border-stone-800 bg-stone-900/60 text-stone-600 cursor-not-allowed opacity-60'
                          : isSelected
                          ? isHeater
                            ? 'border-amber-400 bg-amber-950 text-amber-200 ring-2 ring-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : 'border-cyan-400 bg-cyan-950 text-cyan-200 ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'border-stone-700 bg-stone-900 hover:border-stone-500 text-stone-300'
                      }`}
                    >
                      <span className="text-sm font-black">[{t}]</span>
                      <span className="text-[10px] uppercase tracking-wider mt-0.5">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enclosure Feedback Note */}
            <div className="text-[10px] text-stone-400 bg-stone-900/80 p-2 border border-stone-800 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-stone-500 mt-0.5" />
              <span className="leading-tight">
                {stationData?.isEnclosed
                  ? `Sealed space verified (${stationData.enclosedAirVolume} air blocks). Insulated Everfrost doors & solid blocks maintain room climate.`
                  : 'To unlock Target Temp: Place inside an enclosed room (max 1000 air blocks) sealed by solid walls and Insulated Everfrost Doors.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
