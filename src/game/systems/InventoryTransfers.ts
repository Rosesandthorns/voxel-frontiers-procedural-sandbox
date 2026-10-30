import type {InventorySlot,ItemDef} from '../../types';
import {canStackItems} from './FoodFreshness';
export function inventoryCapacity(slots:InventorySlot[],item:ItemDef){return slots.reduce((n,s)=>n+(!s.item?item.maxStack:canStackItems(s.item,item)?Math.max(0,item.maxStack-s.count):0),0);}
/** All-or-nothing insertion; never overfills a slot or consumes part of a failed transfer. */
export function insertInventory(hotbar:InventorySlot[],inventory:InventorySlot[],item:ItemDef,count:number){
 if(!Number.isInteger(count)||count<=0||inventoryCapacity([...hotbar,...inventory],item)<count)return null;
 const h=hotbar.map(s=>({...s})),bag=inventory.map(s=>({...s})),slots=[...h,...bag];
 for(const slot of [...slots.filter(s=>canStackItems(s.item,item)),...slots.filter(s=>!s.item)]){const amount=Math.min(count,item.maxStack-slot.count);if(amount<=0)continue;slot.item=item;slot.count+=amount;count-=amount;if(!count)break;}
 return {hotbar:h,inventory:bag};
}
