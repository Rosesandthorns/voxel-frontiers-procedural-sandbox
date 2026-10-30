import React from 'react';
import type { InventorySlot } from '../types';
import { ItemIcon } from './ItemIcon';
interface Props { hunger?:number;oxygen?:number;health?: number; maxHealth?: number; stamina?: number; maxStamina?: number; hotbar: InventorySlot[]; selectedHotbarIndex: number; onSelectHotbar: (index: number) => void; miningProgress?: number }
function VitalMeter({name,value,max,color}:{name:string;value:number;max:number;color:string}){return <div className="vital-meter" role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} title={name}><span style={{width:Math.max(0,Math.min(100,value/max*100))+'%',backgroundColor:color}}/></div>;}
export function HUD({ hunger=100,oxygen=20,health = 20, maxHealth = 20, stamina = 100, maxStamina = 100, hotbar, selectedHotbarIndex, onSelectHotbar, miningProgress = 0 }: Props) {
  return <div className="game-hud">
    <div className="crosshair" aria-hidden="true">+</div>
    {miningProgress > 0 && <progress className="mining-progress" aria-label="Mining" max={1} value={miningProgress}/>}
    <div className="hud-bottom"><div className="vitals">{oxygen<20&&<div className="breath-row"><VitalMeter name="Breath" value={oxygen} max={20} color="#78b6c5"/></div>}<VitalMeter name="Health" value={health} max={maxHealth} color="#bd6758"/><VitalMeter name="Hunger" value={hunger} max={100} color="#c8b365"/></div>
      <div className="hotbar">{hotbar.map((slot, i) => <button key={i} aria-label={`${i + 1}: ${slot.item?.name ?? 'Empty'}`} aria-pressed={i === selectedHotbarIndex} className={i === selectedHotbarIndex ? 'selected' : ''} onClick={() => onSelectHotbar(i)}><small>{i + 1}</small><ItemIcon item={slot.item}/>{slot.count > 1 && <b>{slot.count}</b>}</button>)}</div>
      <div className="held-item">{hotbar[selectedHotbarIndex]?.item?.name ?? '\u00a0'}</div>
    </div>
  </div>;
}
