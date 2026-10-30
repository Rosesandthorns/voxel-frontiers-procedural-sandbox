import {EntitySpecies as S} from '../../types';
export function creaturePixels(species:S,part:string,color:number,size=32){
 const data=new Uint8Array(size*size*4),base=[color>>16&255,color>>8&255,color&255];let seed=0;for(const c of species+part)seed=Math.imul(seed,31)+c.charCodeAt(0)|0;
 const noise=(x:number,y:number)=>{let n=Math.imul(x+seed,374761393)^Math.imul(y+17,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 const flesh=/nose|beak/.test(part),eye=/eye/.test(part),leg=/leg/.test(part);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=noise(x>>1,y>>1),fine=noise(x,y);let rgb=[...base],shade=Math.floor(n*15)-7;
  if(eye){shade=0;if(x>5&&x<10&&y>5&&y<10)rgb=[225,233,228];}
  else if(flesh){shade=Math.floor(n*12)-6;if(part==='nose'&&x>8&&x<23&&y>12&&y<22)shade-=25;}
  else if(species===S.COW){const spot=Math.sin((x+seed%9)/4.7)+Math.cos(y/5.3)+Math.sin((x+y)/7);rgb=spot>.7?[80,61,48]:[218,210,185];shade=Math.floor(n*15)-7;}
  else if(species===S.SHEEP){if(!leg&&!/head|ear|eye/.test(part)){const tufts=((x>>2)+(y>>2))%3;rgb=tufts===0?[224,220,202]:tufts===1?[206,203,186]:[235,230,213];shade=fine>.88?-14:Math.floor(n*8)-4;}else{rgb=[132,117,97];shade=Math.floor(n*18)-9;}}
  else if(species===S.PIG){rgb=[216,151,149];shade=Math.floor(n*20)-10;if(fine>.965)shade-=25;}
  else if(species===S.WOLF||species===S.CAT||species===S.RAT){shade=Math.floor(n*26)-13;if(x%5<2&&y%6<3)shade-=12;if(species===S.CAT&&(Math.floor(x/4)+Math.floor(y/9))%4===0)shade-=35;if(/head/.test(part)&&y>20)shade+=18;}
  else if(species===S.PENGUIN){if(part==='breast')rgb=[233,226,204];else if(/wing|body|head/.test(part))rgb=[38,47,59];shade=Math.floor(n*16)-8;if(part==='body'&&x>8&&x<24&&y>11)rgb=[226,222,205];}
  else if(species===S.COD||species===S.TROPICAL_FISH||species===S.SNAKE){const row=Math.floor(y/4),scale=(x+row%2*3)%6;shade=scale===0||y%4===0?-25:Math.floor(n*14)-4;if(species===S.TROPICAL_FISH&&Math.floor(x/6)%2===0)rgb=[63,143,166];if(species===S.COD&&y>23)rgb=[208,199,167];if(species===S.SNAKE&&(Math.floor(x/5)+Math.floor(y/5))%3===0)shade-=22;}
  else if(species===S.SQUID){shade=Math.floor(n*25)-12;if(fine>.94)rgb=[124,137,164];if(/leg/.test(part)&&x>11&&x<21&&y%7<3)rgb=[162,156,172];}
  else if(species===S.PIGEON||species===S.SEAGULL){const feathers=(Math.floor((x+(y>>2)%2*3)/5)+Math.floor(y/5))%3;shade=(feathers===0?-22:feathers===1?3:-8)+Math.floor(fine*5)-2;if(part.startsWith('wing')&&y>21)rgb=species===S.SEAGULL?[65,72,81]:[80,83,95];if(species===S.PIGEON&&part==='head'&&y>15)rgb=[91,122,112];}
  else if(species===S.SLIME){shade=Math.floor(n*18)-9;if(x<3||y<3)shade+=28;if(x>27||y>27)shade-=17;}
  else if(species===S.SHADOW_REAPER){shade=fine>.85?5:-2;if(x%8===0)shade-=5;}
  else if(species===S.BOAT){shade=Math.floor(n*12)-6;if(y%8===0)shade-=35;if(x%13<2&&y%8>2)shade-=12;}
  else if(species===S.VILLAGER||species===S.FORTRESS_KEEPER){shade=Math.floor(n*16)-8;if(part==='body'&&x%8===0)shade-=20;if(species===S.FORTRESS_KEEPER&&part==='body'&&(x+y)%6===0)shade+=35;if(part==='head'&&y<8)rgb=[75,58,43];}
  else shade=Math.floor(n*20)-10;
  const i=(x+y*size)*4;for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,rgb[c]+shade));data[i+3]=255;
 }
 return data;
}
