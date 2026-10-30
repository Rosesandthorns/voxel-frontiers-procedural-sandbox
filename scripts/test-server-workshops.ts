import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServerWorld} from '../src/server/world';
import {BlockType} from '../src/types';
import {WORKSHOP_ITEMS} from '../src/game/systems/Workshop';

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'biome-workshops-'));
let world:ReturnType<typeof createServerWorld>|undefined;
try {
 world=createServerWorld(folder,1337);
 const coords={x:8,y:1000,z:8};
 world.edit({...coords,y:999,block:BlockType.STONE});
 world.edit({...coords,block:BlockType.DRYING_RACK});
 assert.equal(world.workshop(coords,WORKSHOP_ITEMS.raw_hide).consume,1);
 world.close();world=createServerWorld(folder,1337);
 assert.match(world.workshop(coords,null).message,/Drying/,'Rack contents survive restart');
 const broken=world.edit({...coords,block:BlockType.AIR});
 assert.equal(broken[0].workshopDrops[0].item.id,'raw_hide','Breaking returns the held ingredient once');
 world.edit({...coords,block:BlockType.DRYING_RACK});
 assert.match(world.workshop(coords,null).message,/Add raw hide/,'Replacing a rack never resurrects its old input');
 world.workshop(coords,WORKSHOP_ITEMS.raw_hide);
 const unsupported=world.edit({...coords,y:999,block:BlockType.AIR});
 assert.equal(unsupported.find(e=>e.y===1000)?.block,BlockType.AIR,'A rack falls when its floor is removed');
 assert.equal(unsupported[0].workshopDrops[0].item.id,'raw_hide');
 assert.equal(world.edit({...coords,block:BlockType.DRYING_RACK}).length,0,'A server rejects floating racks');
 world.edit({...coords,y:999,block:BlockType.STONE});
 world.edit({...coords,block:BlockType.CAULDRON});
 assert.equal(world.workshop(coords,{id:'water_bucket'}).state.units,4);
 world.close();world=createServerWorld(folder,1337);
 assert.equal(world.workshop(coords,null).state.units,4,'Cauldron contents survive restart');
 world.edit({...coords,block:BlockType.AIR});
 world.edit({...coords,block:BlockType.CAULDRON});
 assert.equal(world.workshop(coords,null).state.units,undefined,'Breaking clears liquid contents');
 console.log('Dedicated-server workshop restart, break/drop, replacement and cauldron persistence passed.');
} finally {world?.close();fs.rmSync(folder,{recursive:true,force:true});}
