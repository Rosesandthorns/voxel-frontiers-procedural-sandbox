import {insertInventory} from './InventoryTransfers';
import {BlockType,type ItemDef,type InventorySlot} from '../../types';
import {ageFood,canStackItems,preserveFood,ROT_ITEM} from './FoodFreshness';
export const CHALK_COLORS=['white','red','blue','yellow','green','black','pink','purple','orange','cyan','brown','gray'] as const;
export const CHALK_RGB=['#eee9db','#c54b43','#5479ba','#dec74a','#679446','#373839','#d48b9d','#9266a8','#d89343','#6cb6bd','#927055','#92978d'];
export const isCauldron=(b:BlockType)=>b===BlockType.CAULDRON||(b>=650&&b<=655);
export const isChalk=(b:BlockType)=>b>=600&&b<612;
export const isChest=(b:BlockType)=>b===BlockType.CHEST||(b>=700&&b<716);
export const isWorkshop=(b:BlockType)=>isCauldron(b)||b===BlockType.DRYING_RACK||isChest(b);
const icon=(color:string)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#444033" d="M6 1h4v3h2v10H4V4h2z"/><path fill="${color}" d="M5 6h6v7H5z"/><path fill="#d4c5a1" d="M6 2h4v2H6z"/></svg>`);
const item=(id:string,name:string,type:ItemDef['type'],color:string,extra:Partial<ItemDef>={}):ItemDef=>({id,name,type,icon:icon(color),description:name,maxStack:64,...extra});
export const WORKSHOP_ITEMS:Record<string,ItemDef>={
 cauldron:item('cauldron','Cauldron','block','#535d5c',{blockId:BlockType.CAULDRON,description:'Fill with a water bucket. Add flowers for dye, or food to ferment vinegar. Vinegar preserves food; dye colors chalk.'}),
 drying_rack:item('drying_rack','Drying Rack','block','#96744c',{blockId:BlockType.DRYING_RACK,description:'Hang raw hide for leather or raw meat for jerky. Use an empty hand to collect when ready.'}),
 raw_hide:item('raw_hide','Raw Hide','utility','#b49a73'),leather:item('leather','Leather','utility','#947047'),
 raw_meat:item('raw_meat','Raw Meat','food','#be6f68',{nutrition:10,shelfLifeDays:2}),cooked_meat:item('cooked_meat','Cooked Meat','food','#965e3f',{nutrition:35,shelfLifeDays:5}),
 jerky:item('jerky','Jerky','food','#7c4c31',{nutrition:15,neverSpoils:true,description:'Dried meat. Less filling than cooked meat, but never spoils.'}),
 vinegar:item('vinegar','Vinegar','utility','#d4bb76',{description:'Fermented vinegar. Put it in an empty cauldron to preserve food.'}),
 chalk_block:item('chalk_block','Chalk Block','block','#e7e2d2',{blockId:BlockType.CHALK}),
};
for(let i=0;i<CHALK_COLORS.length;i++){const color=CHALK_COLORS[i];if(i)WORKSHOP_ITEMS['chalk_'+color]=item('chalk_'+color,color[0].toUpperCase()+color.slice(1)+' Chalk','utility',CHALK_RGB[i],{blockId:(600+i) as BlockType,description:'Draw a colored chalk marking on solid ground.'});}
export interface WorkshopState {kind:'cauldron'|'rack'|'chest';slots?:InventorySlot[];fluid?:'water'|'vinegar'|'red'|'blue'|'yellow'|'green';units?:number;readyAt?:number;input?:ItemDef;output?:ItemDef}
export const workshopKind=(b:BlockType)=>isChest(b)?'chest':b===BlockType.DRYING_RACK?'rack':isCauldron(b)?'cauldron':null;
export function workshopDrops(state:WorkshopState|undefined){return [...[state?.input,state?.output].filter((item):item is ItemDef=>!!item).map(item=>({item,count:1})),...(state?.slots??[]).filter(s=>s.item&&s.count>0).map(s=>({item:s.item!,count:s.count}))];}
export interface WorkshopResult {ok:boolean;state:WorkshopState;consume:number;output?:ItemDef;outputCount?:number;block:BlockType;message:string}
export function interactWorkshop(previous:WorkshopState|undefined,block:BlockType,held:ItemDef|null,age:number):WorkshopResult{
 const kind=isChest(block)?'chest':block===BlockType.DRYING_RACK?'rack':'cauldron';const state:WorkshopState=previous?.kind===kind?structuredClone(previous):{kind};
 const finish=(ok:boolean,message:string,consume=0,output?:ItemDef,outputCount=1):WorkshopResult=>({ok,state,consume,output,outputCount:output?outputCount:undefined,block:state.kind==='chest'?block:state.kind==='rack'?BlockType.DRYING_RACK:state.units?({water:650,vinegar:651,red:652,blue:653,yellow:654,green:655}[state.fluid!]) as BlockType:BlockType.CAULDRON,message});
 if(kind==='chest'){
  state.slots??=Array.from({length:27},()=>({item:null,count:0}));for(const slot of state.slots)if(slot.item)slot.item=ageFood(slot.item,age);
  if(!held)return finish(false,'Click a stack to transfer it. Right-click transfers one item.');
  if(held.id.startsWith('@take:')){const match=/^@take:(\d+)(?::(\d+))?$/.exec(held.id),index=match?Number(match[1]):-1;if(index<0||index>=27)return finish(false,'Invalid slot.');const slot=state.slots[index];if(!slot?.item)return finish(false,'That slot is empty.');const output=slot.item,count=Math.min(slot.count,Math.max(1,Math.min(64,Number(match?.[2]??1))));slot.count-=count;if(!slot.count)state.slots[index]={item:null,count:0};return finish(true,'Took '+output.name+'.',0,output,count);}
  const {transferCount,...clean}=held as ItemDef&{transferCount?:number};const fresh=ageFood(clean,age);let remaining=Number.isFinite(transferCount)?Math.max(1,Math.min(64,Math.floor(transferCount!))):1,stored=0;
  while(remaining>0){const slot=state.slots.find(s=>canStackItems(s.item,fresh)&&s.count<fresh.maxStack)??state.slots.find(s=>!s.item);if(!slot)break;const amount=Math.min(remaining,fresh.maxStack-slot.count);slot.item=fresh;slot.count+=amount;stored+=amount;remaining-=amount;}
  return finish(stored>0,stored?'Stored '+fresh.name+'.':'Chest is full.',stored);
 }
 if(state.kind==='rack'){
  if(state.input&&state.readyAt!==undefined&&age>=state.readyAt){const fresh=ageFood(state.input,state.readyAt);state.output=fresh.id==='rot'?ROT_ITEM:state.input.id==='raw_hide'?WORKSHOP_ITEMS.leather:WORKSHOP_ITEMS.jerky;delete state.input;delete state.readyAt;}
  if(state.output){if(held)return finish(false,'Use an empty hand to collect the dried item.');const output=state.output;delete state.output;return finish(true,'Collected '+output.name+'.',0,output);}
  if(state.input)return finish(false,'Drying. Check back later.');
  if(!held)return finish(false,'Add raw hide for leather, or raw meat for jerky.');
  if(held.id!=='raw_hide'&&!(held.type==='food'&&held.id.startsWith('raw_')))return finish(false,'The rack takes raw hide or raw meat.');
  const fresh=ageFood(held,age);if(fresh.type!=='food'&&fresh.id!=='raw_hide')return finish(false,'Spoiled food cannot be dried.');state.input=fresh;state.readyAt=age+.25;return finish(true,'Hung '+held.name+' to dry.',1);
 }
 if(state.readyAt!==undefined&&age>=state.readyAt){state.fluid='vinegar';delete state.readyAt;}
 if(state.readyAt!==undefined)return finish(false,'Fermenting vinegar. Return tomorrow.');
 if(!held)return finish(false,state.units?`${state.fluid} · ${state.units}/4 portions`:'Fill the cauldron with water.');
 if(!state.units){if(held.id==='water_bucket'){state.fluid='water';state.units=4;return finish(true,'Added water.',1,item('empty_bucket','Empty Bucket','utility','#8a8e89',{maxStack:16}));}if(held.id==='vinegar'){state.fluid='vinegar';state.units=4;return finish(true,'Added vinegar.',1);}return finish(false,'Use a water bucket or vinegar to fill it.');}
 if(state.fluid==='vinegar'){
  if(held.type==='food'){const fresh=ageFood(held,age);if(fresh.type!=='food')return finish(false,'Spoiled food cannot be preserved.');if(held.preserved||held.neverSpoils)return finish(false,'This food is already preserved.');state.units!--;return finish(true,'Preserved '+held.name+'.',1,preserveFood(fresh));}
  if(held.id==='empty_bucket'){state.units=0;return finish(true,'Collected vinegar.',1,WORKSHOP_ITEMS.vinegar);}return finish(false,'Add food to preserve it, or collect vinegar with an empty bucket.');
 }
 if(state.fluid!=='water'&&(held.id==='chalk'||CHALK_COLORS.some(c=>held.id==='chalk_'+c))){const output=WORKSHOP_ITEMS['chalk_'+state.fluid];state.units!--;return finish(true,'Dyed chalk '+state.fluid+'.',1,output);}
 if(state.fluid==='water'){
  if(held.id==='empty_bucket'){state.units=0;return finish(true,'Collected water.',1,item('water_bucket','Water Bucket','utility','#497d9e',{maxStack:16}));}
  if(held.type==='food'){state.readyAt=age+1;return finish(true,'Started fermenting vinegar. Ready tomorrow.',1);}
  const name=(held.name+' '+held.id).toLowerCase(),color=/blue|azure/.test(name)?'blue':/gold|yellow|sunflower/.test(name)?'yellow':/leaf|leaves|fern|green/.test(name)?'green':/red|crimson|bloom|flower/.test(name)?'red':null;
  if(color){state.fluid=color;return finish(true,'Mixed '+color+' dye. Add chalk to color it.',1);}
 }
 return finish(false,'That ingredient does not work with these contents.');
}
/** Prepare output atomically: a full inventory never consumes ingredients or loses the result. */
export function workshopInventory(hotbar:InventorySlot[],inventory:InventorySlot[],index:number,result:WorkshopResult){if(!result.ok)return null;const h=hotbar.map(s=>({...s})),bag=inventory.map(s=>({...s}));if(result.consume){if(!h[index]?.item||h[index].count<result.consume)return null;h[index].count-=result.consume;if(!h[index].count)h[index]={item:null,count:0};}return result.output?insertInventory(h,bag,result.output,result.outputCount??1):{hotbar:h,inventory:bag};}
