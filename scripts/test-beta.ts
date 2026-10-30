import {creaturePixels} from '../src/game/entities/CreatureTextures';
import {pixelItemIcon} from '../src/game/systems/PixelItemIcons';
import {inventoryCapacity,insertInventory} from '../src/game/systems/InventoryTransfers';
import assert from 'node:assert/strict';
import {BlockType as B,EntitySpecies as S} from '../src/types';
import {StructurePlanner} from '../src/game/voxel/Structures';
import {Chunk} from '../src/game/voxel/Chunk';
import {BiomeType} from '../src/types';
import {BETA_CREATURES,creatureState,creatureLoot,operateBoat,tickCreature} from '../src/game/entities/BetaCreatures';
import {ITEM_REGISTRY,INVENTORY_CRAFTING_RECIPES,FURNACE_SMELTING_RECIPES,PLANK_ITEM_IDS} from '../src/game/systems/ItemRegistry';
import {wearTool,toolLifetime} from '../src/game/systems/ToolDurability';
import {interactWorkshop,workshopDrops} from '../src/game/systems/Workshop';
const flat={seed:1337,getHeightAt:()=>120,getSubBiomeAt:()=>({id:'meadow',name:'Meadow'})};
const planner=new StructurePlanner(flat);let village:ReturnType<StructurePlanner['plan']>=null;
for(let x=1;x<20&&!village;x++)village=planner.plan(x,1,'village');assert.ok(village);assert.equal(village.inhabitants.length,4);assert.ok([...village.blocks.values()].includes(B.OAK_DOOR_BOTTOM));
assert.deepEqual(new StructurePlanner(flat).plan(Number(village.id.split(':')[1].split(',')[0]),1,'village'),village);
const chunks=new Map<string,Chunk>();for(const [key,block]of village.blocks){const [x,y,z]=key.split(',').map(Number),cx=Math.floor(x/16),cz=Math.floor(z/16),ck=`${cx},${cz}`;let c=chunks.get(ck);if(!c){c=new Chunk(cx,cz,BiomeType.VERDANT_PLAINS,'Meadow','meadow');chunks.set(ck,c);planner.stamp(c);}assert.equal(c.getBlock(x&15,y,z&15),block,'Structure stamps agree across chunk boundaries');}
const oldKey=[...chunks.keys()][0],protectedPlanner=new StructurePlanner(flat,{[oldKey]:4});assert.equal(protectedPlanner.plan(Number(village.id.split(':')[1].split(',')[0]),1,'village'),null,'A village cannot be cut into explored old terrain');
const mountain=new StructurePlanner({...flat,getHeightAt:()=>250,getSubBiomeAt:()=>({id:'high_ranges',name:'High Ranges'})});let fort=null;for(let x=1;x<25&&!fort;x++)fort=mountain.plan(x,1,'fortress');assert.ok(fort);assert.equal(planner.plan(1,1,'fortress'),null,'Fortresses require mountains');
for(const kind of ['pickaxe','axe','shovel','hoe']){const tools=Object.values(ITEM_REGISTRY).filter(i=>i.toolType===kind).sort((a,b)=>(a.tier??0)-(b.tier??0));for(let i=1;i<tools.length;i++)if(tools[i].tier!>tools[i-1].tier!)assert.ok(toolLifetime(tools[i])>toolLifetime(tools[i-1]));}
const tool=ITEM_REGISTRY.wooden_shovel;assert.equal(wearTool({...tool,durability:1}),null);assert.equal(wearTool(tool)?.durability,toolLifetime(tool)-1);
let chest=interactWorkshop(undefined,702 as B,tool,0);assert.equal(chest.consume,1);assert.equal(chest.state.slots?.[0].item?.id,tool.id);const take=interactWorkshop(chest.state,702 as B,{...tool,id:'@take:0'},1);assert.equal(take.output?.id,tool.id);assert.equal(take.state.slots?.[0].item,null);assert.equal(workshopDrops(chest.state)[0].count,1);
for(const wood of PLANK_ITEM_IDS)assert.ok(INVENTORY_CRAFTING_RECIPES.some(r=>r.result.id===wood.replace('_plank','')+'_chest'&&r.ingredients[0].itemId===wood&&r.ingredients[0].count===4));
for(const species of [S.COW,S.PIG,S.SHEEP,S.SQUID,S.PENGUIN,S.WOLF,S.CAT,S.RAT,S.SNAKE,S.SEAGULL]){const food=creatureLoot(species)[0];assert.equal(food.type,'food');assert.ok(FURNACE_SMELTING_RECIPES.some(r=>r.inputItemId===food.id));}
const blocks=new Map<string,B>(),world={getBlock:(x:number,y:number,z:number)=>blocks.get(`${x},${y},${z}`)??(y===0?B.STONE:B.AIR),setBlock:(x:number,y:number,z:number,b:B)=>blocks.set(`${x},${y},${z}`,b)};
const reaper=creatureState('shadow',S.SHADOW_REAPER,0,1,0);assert.equal(tickCreature(reaper,.1,world,[],1).smoke,true);assert.equal(tickCreature(reaper,.1,world,[],0).remove,undefined);
const slime=creatureState('slime',S.SLIME,0,1,0);assert.ok(tickCreature(slime,.1,world,[{x:.5,y:1,z:0,id:'guest'}],0).damage);
assert.equal(Object.keys(BETA_CREATURES).length,18);
blocks.set('2,2,2',B.WATER);const boats:any[]=[];const boat=operateBoat(boats,world,'place',undefined,{x:2,y:2,z:2},'alice',s=>boats.push(s));assert.ok(boat.id);operateBoat(boats,world,'board',boat.id,boat.coords!,'alice',()=>{});assert.throws(()=>operateBoat(boats,world,'board',boat.id,boat.coords!,'bob',()=>{}),/already/);operateBoat(boats,world,'leave',boat.id,boat.coords!,'alice',()=>{});assert.equal(boats[0].uniqueData.rider,undefined);
console.log('Deterministic cross-chunk villages/fortresses, old-terrain protection, tier durability, chest recipes/storage, species food, darkness rules and exclusive boat ownership passed.');

const stackItem=ITEM_REGISTRY.cobblestone,emptySlots=Array.from({length:9},()=>({item:null,count:0}));const multi=insertInventory(emptySlots,[],stackItem,130);assert.deepEqual(multi?.hotbar.slice(0,3).map(s=>s.count),[64,64,2]);const fullSlots=Array.from({length:9},()=>({item:stackItem,count:64}));assert.equal(insertInventory(fullSlots,[],stackItem,1),null);assert.equal(fullSlots[0].count,64);assert.equal(inventoryCapacity(fullSlots,stackItem),0);const bulk=interactWorkshop(undefined,702 as B,{...stackItem,transferCount:64} as any,0);assert.equal(bulk.consume,64);assert.equal(bulk.state.slots?.[0].count,64);const bulkTake=interactWorkshop(bulk.state,702 as B,{...stackItem,id:'@take:0:64'},0);assert.equal(bulkTake.outputCount,64);assert.equal(bulkTake.state.slots?.[0].count,0);

for(const id of ['wooden_boat','raw_hide','leather','jerky','vinegar','apple','oak_chest']){const item=ITEM_REGISTRY[id]??{id,name:id,type:'utility' as const};const icon=pixelItemIcon(item);assert.ok(icon.startsWith('data:image/svg+xml,'));const svg=decodeURIComponent(icon.slice(icon.indexOf(',')+1));assert.match(svg,/width="32" height="32"/);assert.match(svg,/shape-rendering="crispEdges"/);assert.match(svg,/<rect /);assert.equal(pixelItemIcon(item),icon);}

let waterEdits=0;const readOnlyBoatWorld={getBlock:world.getBlock,setBlock:()=>{waterEdits++;throw new Error('Boat attempted a voxel edit');}};const passiveBoat=creatureState('boat-no-water',S.BOAT,2.5,2.7,2.5);for(let i=0;i<30;i++)tickCreature(passiveBoat,.1,readOnlyBoatWorld,[],15);assert.equal(waterEdits,0,'Boats never create or replace water while floating');operateBoat([],readOnlyBoatWorld,'place',undefined,{x:2,y:2,z:2},'test',()=>{});assert.equal(waterEdits,0,'Placing a boat never changes a water block');

for(const species of Object.keys(BETA_CREATURES)as S[]){const data=creaturePixels(species,'body',0x998877);assert.equal(data.length,32*32*4);assert.deepEqual(data,creaturePixels(species,'body',0x998877));const colors=new Set<string>();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);assert.ok(colors.size>3,species+' needs textured detail');}
