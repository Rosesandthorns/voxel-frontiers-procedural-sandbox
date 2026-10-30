import type {ItemDef} from '../../types';
export const TOOL_LIFETIMES=[0,120,250,400,700,1000,1600,2800];
export function toolLifetime(item:ItemDef){return item.maxDurability??TOOL_LIFETIMES[Math.max(1,Math.min(7,item.tier??1))];}
export function wearTool(item:ItemDef,uses=1):ItemDef|null {
 if(item.type!=='tool'&&item.type!=='weapon')return item;
 const maxDurability=toolLifetime(item),durability=Math.min(maxDurability,item.durability??maxDurability)-Math.max(0,uses);
 return durability>0?{...item,maxDurability,durability}:null;
}
