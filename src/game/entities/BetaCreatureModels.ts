import * as T from 'three';
import {EntitySpecies as S} from '../../types';
import {BETA_CREATURES} from './BetaCreatures';
import type {EntityMeshGroup} from './EntityModels';
import {creaturePixels} from './CreatureTextures';
const textures=new Map<string,T.DataTexture>();
function texture(species:S,name:string,color:number){const part=name.replace(/-?\d+$/,''),key=species+':'+part+':'+color;let tex=textures.get(key);if(!tex){tex=new T.DataTexture(creaturePixels(species,part,color),32,32,T.RGBAFormat);tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestFilter;tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=false;tex.needsUpdate=true;textures.set(key,tex);}return tex;}
export function buildBetaCreature(g:EntityMeshGroup){const def=BETA_CREATURES[g.species];if(!def)return false;const [w,h,d]=def.size;
 const box=(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,emissive=0)=>{const mesh=new T.Mesh(new T.BoxGeometry(sx,sy,sz),new T.MeshLambertMaterial({color:0xffffff,map:texture(g.species,name,color),emissive,transparent:g.species===S.SLIME,opacity:g.species===S.SLIME?.78:1}));mesh.position.set(x,y,z);g.add(mesh);g.parts[name]=mesh;return mesh;};
 if(g.species===S.BOAT){box('hull',0,.12,0,w,.18,d,def.color);box('left',-w/2,.33,0,.12,.38,d,def.color);box('right',w/2,.33,0,.12,.38,d,def.color);box('front',0,.33,d/2,w,.38,.12,def.color);box('back',0,.33,-d/2,w,.38,.12,def.color);for(const sign of [-1,1])box('oar'+sign,sign*.9,.4,0,.12,.08,1.2,0xc6a36d);return true;}
 if(g.species===S.VILLAGER||g.species===S.FORTRESS_KEEPER||g.species===S.SHADOW_REAPER){box('body',0,h*.45,0,w*.8,h*.6,d*.8,def.color);box('head',0,h*.85,0,w*.85,h*.26,d, g.species===S.SHADOW_REAPER?0x12111b:0xc6a281);if(g.species!==S.SHADOW_REAPER){box('nose',0,h*.8,d*.58,.12,.22,.16,0xa17d61);box('arms',0,h*.5,d*.55,w*1.1,.18,.18,def.color);}}
 else if(g.species===S.SNAKE){for(let i=0;i<5;i++)box('segment'+i,Math.sin(i)*.08,h*.5,(i-2)*d*.18,w,h,d*.23,def.color);}
 else if(g.species===S.SQUID){box('head',0,h*.7,0,w,h*.6,d,def.color);for(let i=0;i<8;i++){const a=i*Math.PI/4;box('leg'+i,Math.sin(a)*w*.38,h*.22,Math.cos(a)*d*.38,.12,h*.45,.12,def.color);}}
 else if(g.species===S.SLIME){box('body',0,h/2,0,w,h,d,def.color);box('core',0,h*.45,0,w*.55,h*.55,d*.55,0x5c8955);}
 else if(def.aquatic){box('body',0,h*.55,0,w,h*.65,d*.75,def.color);box('tail',0,h*.55,-d*.5,w*1.5,h*.8,.08,0xbd955f);box('fin',0,h*.95,0,.06,h*.4,d*.4,0xb77f43);}
 else if(def.bird||g.species===S.PENGUIN){box('body',0,h*.5,0,w*.8,h*.7,d*.7,def.color);box('head',0,h*.85,d*.25,w*.55,h*.38,d*.55,def.color);box('breast',0,h*.5,d*.36,w*.6,h*.5,.05,0xe9e5d9);box('beak',0,h*.81,d*.6,w*.27,h*.12,d*.3,0xd4a34b);for(const sign of [-1,1])box('wing'+sign,sign*w*.47,h*.5,0,w*.22,h*.5,d*.5,def.color);}
 else{box('body',0,h*.6,0,w*.9,h*.55,d*.8,def.color);box('head',0,h*.75,d*.48,w*.65,h*.45,d*.4,def.color);for(const sign of [-1,1])box('ear'+sign,sign*w*.23,h*.99,d*.5,w*.18,h*.2,d*.15,def.color);for(let i=0;i<4;i++)box('leg'+i,(i%2?1:-1)*w*.32,h*.2,(i<2?1:-1)*d*.3,w*.2,h*.4,d*.18,def.color);if(g.species===S.COW)box('patch',w*.456,h*.65,0,.01,h*.26,d*.4,0xe4dfd1);if(g.species===S.CAT||g.species===S.WOLF||g.species===S.RAT)box('tail',0,h*.6,-d*.65,w*.16,h*.15,d*.5,def.color);}
 for(const sign of [-1,1])box('eye'+sign,sign*w*.2,h*.8,d*.54,w*.1,h*.07,.035,g.species===S.SHADOW_REAPER?0xbbd9ff:0x1b2023,g.species===S.SHADOW_REAPER?0xbedcff:0);
 return true;
}
export function animateBetaCreature(g:EntityMeshGroup,speed:number,dt:number){if(!BETA_CREATURES[g.species])return false;g.animTime+=dt;for(let i=0;i<8;i++){const leg=g.parts['leg'+i];if(leg)leg.rotation.x=Math.sin(g.animTime*6+(i%2)*Math.PI)*Math.min(.5,speed*.25);}for(const sign of [-1,1]){const wing=g.parts['wing'+sign];if(wing)wing.rotation.z=Math.sin(g.animTime*5)*.08;const oar=g.parts['oar'+sign];if(oar)oar.rotation.y=Math.sin(g.animTime*4)*.3*Math.min(1,speed);}if(g.species===S.SLIME){g.scale.y=1+Math.sin(g.animTime*4)*.08;g.scale.x=g.scale.z=1-Math.sin(g.animTime*4)*.04;}return true;}
