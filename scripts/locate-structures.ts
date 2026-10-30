import fs from 'node:fs';import {WorldGenerator} from '../src/game/voxel/WorldGenerator';
const generator=new WorldGenerator(1337,5),found:any={};
for(let radius=0;radius<40&&(!found.village||!found.fortress);radius++)for(let z=-radius;z<=radius;z++)for(let x=-radius;x<=radius;x++){if(Math.abs(x)!==radius&&Math.abs(z)!==radius)continue;for(const kind of ['village','fortress']as const)if(!found[kind]){const p=generator.structures.plan(x,z,kind);if(p)found[kind]={id:p.id,x:p.x,y:p.y,z:p.z,kind:p.kind};}}
fs.writeFileSync('../../work/biome-structures.json',JSON.stringify(found,null,2));console.log(found);if(!found.village||!found.fortress)process.exitCode=1;
