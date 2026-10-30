import type {ItemDef,InventorySlot} from '../../types';
export const ROT_ITEM:ItemDef={id:'rot',name:'Rot',type:'utility',icon:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#596039" d="M2 12V8h3V5h6v3h3v5H3z"/><path fill="#838251" d="M5 7h4v2H5z"/></svg>'),description:'Spoiled food. No longer edible.',maxStack:64};
export function ageFood(item:ItemDef,age:number):ItemDef {
 if(item.type!=='food'||item.preserved||item.neverSpoils)return item;
 const life=item.shelfLifeDays??(item.id.startsWith('raw_')?2:item.id.startsWith('cooked_')?5:3);
 if(item.freshUntilDay===undefined)return {...item,freshUntilDay:Math.floor(age*4)/4+life,shelfLifeDays:life,foodState:'fresh'};
 if(age>=item.freshUntilDay)return ROT_ITEM;
 const state=item.freshUntilDay-age<=life*.25?'stale':'fresh';return state===item.foodState?item:{...item,foodState:state};
}
export function ageFoodSlots(slots:InventorySlot[],age:number){let changed=false;const next=slots.map(slot=>{if(!slot.item)return slot;const item=ageFood(slot.item,age);if(item===slot.item)return slot;changed=true;return {...slot,item};});return changed?next:slots;}
export function foodNutrition(item:ItemDef,age:number){const current=ageFood(item,age);if(current.type!=='food')return 0;return (current.nutrition??20)*(current.foodState==='stale'?.5:1);}
export function preserveFood(item:ItemDef):ItemDef{return {...item,name:item.preserved?item.name:'Preserved '+item.name,preserved:true,freshUntilDay:undefined,foodState:'preserved'};}
export function canStackItems(a:ItemDef|null|undefined,b:ItemDef|null|undefined){if(!a||!b||a.id!==b.id)return false;if(a.type==='tool'||a.type==='weapon'||b.type==='tool'||b.type==='weapon')return false;if(a.type==='food'||b.type==='food')return !!a.preserved===!!b.preserved&&a.freshUntilDay===b.freshUntilDay;return true;}
