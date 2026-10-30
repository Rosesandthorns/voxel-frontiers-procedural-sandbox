import {WorldGenerator} from '../src/game/voxel/WorldGenerator';import {mountainAt} from '../src/game/voxel/Mountains';import fs from 'node:fs';
const g=new WorldGenerator(1337,3);const found:any={};let land=0,mountains=0;
for(let x=-24000;x<24000;x+=128)for(let z=-24000;z<24000;z+=128){const p=g.getBiomeParameters(x,z);if(p.continentalness>.02)land++;const m=mountainAt(x,z,1337,p);if(m&&m.strength>.22){mountains++;const b=g.getSubBiomeAt(x,z),h=g.getHeightAt(x,z,b);if(!found[b.id]&&h>131)found[b.id]={x,z,height:h,biome:b.id,strength:m.strength};}}
console.log(JSON.stringify({land,mountains,found},null,2));fs.writeFileSync('../../work/mountain-locations.json',JSON.stringify(found));
