import {buildSlime,animateSlime} from './SlimeModel';
import * as T from 'three';
import {EntitySpecies as S} from '../../types';
import {BETA_CREATURES} from './BetaCreatures';
import type {EntityMeshGroup} from './EntityModels';
import {creaturePixels} from './CreatureTextures';
const textures=new Map<string,T.DataTexture>();
function texture(species:S,name:string,color:number){const part=name.replace(/-?\d+$/,''),key=species+':'+part+':'+color;let tex=textures.get(key);if(!tex){tex=new T.DataTexture(creaturePixels(species,part,color),32,32,T.RGBAFormat);tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestMipmapLinearFilter;tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=true;tex.needsUpdate=true;textures.set(key,tex);}return tex;}
// Villager job outfits — MODELS ONLY. No jobs, AI, trading or spawning is
// wired to these; the variant is picked only by the caller of
// EntityModelFactory.createEntityModel (gallery/preview for now). The
// default villager (no variant) is unchanged. There is no job system in
// the game to reuse, so these six are new: Guard is the village guard,
// distinct from the separate Fortress Keeper species.
export type VillagerVariant='farmer'|'blacksmith'|'librarian'|'cleric'|'trader'|'guard';
export const VILLAGER_VARIANTS:VillagerVariant[]=['farmer','blacksmith','librarian','cleric','trader','guard'];
interface VillagerOutfit{body:number;robe:number;hat:number;belt:number;legs:number;hatW:number;hatH:number}
const VILLAGER_OUTFITS:Record<VillagerVariant,VillagerOutfit>={
 // Wide straw hat + green tunic + apron.
 farmer:{body:0x5a7a3a,robe:0x6b5a35,hat:0xd9b95c,belt:0x6b4f35,legs:0x5a4a35,hatW:1.15,hatH:.06},
 // Dark leather apron + flat cap, soot-dark tones.
 blacksmith:{body:0x4a4440,robe:0x3a3230,hat:0x2e2622,belt:0x2a2320,legs:0x3a3230,hatW:.75,hatH:.07},
 // Long blue robe + tall pointed hat + gold sash + spectacles.
 librarian:{body:0x4a5a7a,robe:0x3f4a68,hat:0x3f4a68,belt:0x8a6a2e,legs:0x3a4256,hatW:.55,hatH:.07},
 // White robe + purple sash + tall white mitre.
 cleric:{body:0xe8e2d0,robe:0xefe9d8,hat:0xe8e2d0,belt:0x7a5aa0,legs:0xcfc8b2,hatW:.6,hatH:.08},
 // Colourful cloak + wide-brim hat with a feather + satchel.
 trader:{body:0x7a3a6a,robe:0x5a2a52,hat:0x8a5a2e,belt:0x6b4f35,legs:0x4a3230,hatW:1.1,hatH:.06},
 // Steel helm with a red plume + tabard + shoulder pads.
 guard:{body:0x6a7078,robe:0x565c66,hat:0x8a9098,belt:0x2a2e33,legs:0x3a3e44,hatW:.75,hatH:.10},
};
export function buildBetaCreature(g:EntityMeshGroup){const def=BETA_CREATURES[g.species];if(!def)return false;if(g.species===S.SLIME)return buildSlime(g);const [w,h,d]=def.size;
 const villagerOutfit=g.species===S.VILLAGER&&g.villagerVariant?VILLAGER_OUTFITS[g.villagerVariant]:undefined;
 const box=(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,emissive=0)=>{const mesh=new T.Mesh(new T.BoxGeometry(sx,sy,sz),new T.MeshLambertMaterial({color:g.species===S.SLIME&&name==='body'?color:0xffffff,map:texture(g.species,name,g.species===S.SLIME&&name==='body'?0xffffff:color),emissive,transparent:g.species===S.SLIME&&name==='body',depthWrite:!(g.species===S.SLIME&&name==='body'),opacity:g.species===S.SLIME&&name==='body'?.78:1}));mesh.position.set(x,y,z);g.add(mesh);g.parts[name]=mesh;return mesh;};
 if(g.species===S.BOAT){box('hull',0,.12,0,w,.18,d,def.color);box('left',-w/2,.33,0,.12,.38,d,def.color);box('right',w/2,.33,0,.12,.38,d,def.color);box('front',0,.33,d/2,w,.38,.12,def.color);box('back',0,.33,-d/2,w,.38,.12,def.color);box('seat',0,.24,0,w*.7,.06,d*.5,0x7d5f3d);for(const sign of [-1,1])box('oar'+sign,sign*.9,.4,0,.12,.08,1.2,0xc6a36d);return true;}
 if(g.species===S.VILLAGER||g.species===S.FORTRESS_KEEPER||g.species===S.SHADOW_REAPER){box('body',0,h*.45,0,w*.8,h*.6,d*.8,villagerOutfit?.body??def.color);box('head',0,h*.85,0,w*.85,h*.26,d, g.species===S.SHADOW_REAPER?0x12111b:0xc6a281);if(g.species!==S.SHADOW_REAPER){box('nose',0,h*.8,d*.58,.12,.22,.16,0xa17d61);box('arms',0,h*.5,d*.55,w*1.1,.18,.18,villagerOutfit?.body??def.color);}if(g.species===S.SHADOW_REAPER){box('hood',0,h*.99,0,w*.9,h*.12,d*.9,0x1e1a33);box('cloak',0,h*.18,0,w*.9,h*.36,d*.9,0x1e1a33);}else{box('hat',0,h*1.0,0,w*(villagerOutfit?.hatW??.7),h*(villagerOutfit?.hatH??.08),d*(villagerOutfit?.hatW??.7),villagerOutfit?.hat??(g.species===S.FORTRESS_KEEPER?0x4a5560:0x6b4f35));box('robe',0,h*.16,0,w*.86,h*.32,d*.86,villagerOutfit?.robe??(g.species===S.FORTRESS_KEEPER?0x4a5560:0x7a6248));}}
 else if(g.species===S.SNAKE){
  // Slim serpentine snake: 9 short overlapping segments (not 5 stepped
  // boxes), gradual taper, thin tail, gentle S-curve in the resting pose,
  // and the neck rising to a raised, slimmer head — no more straight log.
  const segW=[.28,.36,.48,.60,.68,.64,.56,.48,.40],segH=[.30,.38,.48,.58,.62,.58,.50,.44,.38];
  for(let i=0;i<9;i++){const curveX=Math.sin(i*.6)*.055,rise=i>=7?(i-6)*h*.07:0;
   const seg=box('segment'+i,curveX,h*.50+rise,(i-4)*d*.105,w*segW[i],h*segH[i],d*.14,def.color);
   seg.userData.baseX=curveX;seg.userData.baseRotY=Math.cos(i*.6)*.16;seg.rotation.y=seg.userData.baseRotY;
   // Pale belly, parented to the segment so it slithers with it.
   const belly=new T.Mesh(new T.BoxGeometry(w*segW[i]*.7,.02,d*.14*.8),new T.MeshLambertMaterial({color:0xffffff,map:texture(g.species,'belly',0xd8cdb2)}));belly.position.set(0,-h*segH[i]/2+.008,0);seg.add(belly);}
  // Forked tongue: a short base plus two angled red prongs, at the raised head.
  box('tongue',0,h*.60,d*.60,.035,.018,.10,0xc25a4a);
  for(const sgn of [-1,1]){const tip=box('tongueTip'+sgn,sgn*.022,h*.60,d*.67,.022,.016,.12,0xc25a4a);tip.rotation.y=sgn*.28;}
 }
 else if(g.species===S.SQUID){box('head',0,h*.7,0,w,h*.6,d,def.color);box('beak',0,h*.42,d*.3,.14,.12,.1,0x2b2118);for(let i=0;i<8;i++){const a=i*Math.PI/4;box('leg'+i,Math.sin(a)*w*.38,h*.22,Math.cos(a)*d*.38,.12,h*.45,.12,def.color);}}
 else if(g.species===S.TROPICAL_FISH){
  // Minecraft-style tropical fish: a thin, tall, laterally-compressed disc,
  // not a thick slab. Thin side-to-side, tall top-to-bottom, with thin flat
  // fins and a big fan tail. Blue/orange band texture is kept.
  box('body',0,h*.55,0,w*.32,h*.85,d*.48,def.color);
  box('head',0,h*.56,d*.20,w*.30,h*.72,d*.24,def.color);
  box('snout',0,h*.52,d*.36,w*.24,h*.42,d*.08,def.color);
  box('tailBase',0,h*.55,-d*.30,w*.22,h*.45,d*.18,def.color);
  box('belly',0,h*.24,0,w*.28,h*.14,d*.40,0xd8cdb2);
  const tail=box('tail',0,h*.55,-d*.50,w*.08,h*.60,.04,0xeab352);
  // Fan tail: two thin lobes angled apart, parented to the tail so they wag with it.
  for(const sgn of [-1,1]){const lobe=new T.Mesh(new T.BoxGeometry(.04,h*.42,d*.20),new T.MeshLambertMaterial({color:0xffffff,map:texture(g.species,'tail',0xeab352)}));lobe.position.set(0,sgn*h*.20,-.05);lobe.rotation.x=-sgn*.45;tail.add(lobe);}
  // Tall, thin dorsal fin on top.
  box('fin',0,h*.98,-d*.02,w*.05,h*.32,d*.28,0x3f8fa6);
  for(const sign of [-1,1])box('fin'+sign,sign*w*.20,h*.45,d*.06,.03,h*.20,d*.20,0x3f8fa6);
 }
 else if(def.aquatic){
  // Streamlined fish: a thick mid-body tapering to a small head and a narrow
  // tail, instead of one flat slab for the whole body.
  box('body',0,h*.55,-d*.04,w*.85,h*.5,d*.42,def.color);
  box('head',0,h*.56,d*.26,w*.6,h*.4,d*.26,def.color);
  box('snout',0,h*.53,d*.42,w*.38,h*.26,d*.12,def.color);
  box('tailBase',0,h*.55,-d*.32,w*.48,h*.3,d*.22,def.color);
  box('belly',0,h*.34,d*.02,w*.66,h*.16,d*.5,0xd8cdb2);
  const tail=box('tail',0,h*.55,-d*.52,w*.38,h*.5,.05,0xbd955f);
  // Forked caudal fin: two lobes angled apart, parented to the tail so they wag with it.
  for(const sgn of [-1,1]){const lobe=new T.Mesh(new T.BoxGeometry(w*.3,h*.3,.04),new T.MeshLambertMaterial({color:0xffffff,map:texture(g.species,'tail',0xbd955f)}));lobe.position.set(0,sgn*h*.2,-.05);lobe.rotation.x=-sgn*.45;tail.add(lobe);}
  box('fin',0,h*.9,-d*.04,.05,h*.32,d*.3,0xb77f43);
  for(const sign of [-1,1])box('fin'+sign,sign*w*.5,h*.42,d*.08,.16,h*.14,d*.22,0xb77f43);
 }
 else if(def.bird||g.species===S.PENGUIN){box('body',0,h*.5,0,w*.8,h*.7,d*.7,def.color);box('head',0,h*.85,d*.25,w*.55,h*.38,d*.55,def.color);box('breast',0,h*.5,d*.36,w*.6,h*.5,.05,0xe9e5d9);box('beak',0,h*.81,d*.6,w*.27,h*.12,d*.3,0xd4a34b);box('tail',0,h*.42,-d*.5,w*.42,h*.07,d*.5,def.color);for(const sign of [-1,1])box('wing'+sign,sign*w*.47,h*.5,0,w*.22,h*.5,d*.5,def.color);if(g.species===S.PENGUIN)box('belly',0,h*.42,d*.3,w*.6,h*.45,.06,0xe9e5d9);}
 else{box('body',0,h*.58,0,w*.9,h*.58,d*.8,def.color);box('head',0,h*.78,d*.48,w*.65,h*.45,d*.4,def.color);for(const sign of [-1,1])box('ear'+sign,sign*w*.23,h*1.02,d*.5,w*.18,h*.22,d*.15,def.color);for(let i=0;i<4;i++)box('leg'+i,(i%2?1:-1)*w*.32,h*.21,(i<2?1:-1)*d*.3,w*.22,h*.42,d*.2,def.color);if(g.species===S.COW)box('patch',w*.456,h*.65,0,.01,h*.26,d*.4,0xe4dfd1);if(g.species===S.CAT||g.species===S.WOLF||g.species===S.RAT)box('tail',0,h*.6,-d*.65,w*.16,h*.15,d*.5,def.color);if(g.species===S.COW||g.species===S.PIG||g.species===S.SHEEP)box('tail',0,h*.62,-d*.55,w*.1,h*.3,.08,def.color);if(g.species===S.SHEEP)box('wool',0,h*.82,0,w*.98,h*.3,d*.88,0xe8e2cf);if(g.species===S.WOLF||g.species===S.CAT)box('chest',0,h*.5,d*.42,w*.55,h*.4,.06,0xe8e0d0);if(g.species===S.COW)box('udder',0,h*.3,0,w*.32,h*.14,d*.32,0xd8a0a0);}
 if(g.species===S.VILLAGER||g.species===S.FORTRESS_KEEPER){for(const sign of [-1,1]){box('leg'+(sign===-1?0:1),sign*w*.22,h*.12,0,w*.3,h*.24,d*.65,villagerOutfit?.legs??0x51483b);box('brow'+sign,sign*w*.2,h*.94,d*.514,w*.23,h*.025,.025,0x4b3c30);}box('belt',0,h*.34,d*.43,w*.82,h*.07,.03,villagerOutfit?.belt??0x514632);}
 // Job-outfit extras: each variant gets a distinct hat shape on top of the
 // 'hat' brim above, plus its own clothing piece(s) — not just a recolour.
 if(g.species===S.VILLAGER&&villagerOutfit&&g.villagerVariant){switch(g.villagerVariant){
  case 'farmer':box('hatTop',0,h*1.06,0,w*.45,h*.10,d*.45,0xc9a94a);box('apron',0,h*.22,d*.43,w*.5,h*.28,.03,0xd8cdb2);break;
  case 'blacksmith':box('capBrim',0,h*.97,d*.42,w*.5,h*.04,.18,0x2e2622);box('apron',0,h*.22,d*.43,w*.55,h*.30,.03,0x241e1a);break;
  case 'librarian':box('hatTop',0,h*1.10,0,w*.4,h*.16,d*.4,0x3f4a68);box('sash',0,h*.45,d*.43,w*.7,h*.08,.03,0xc9a94a);box('glasses',0,h*.90,d*.52,w*.6,h*.025,.02,0x1b2023);break;
  case 'cleric':box('hatTop',0,h*1.10,0,w*.45,h*.16,d*.4,0xe8e2d0);box('mitreBand',0,h*1.04,d*.42,w*.47,h*.05,.03,0x7a5aa0);box('sash',0,h*.45,d*.43,w*.7,h*.08,.03,0x7a5aa0);break;
  case 'trader':box('hatTop',0,h*1.05,0,w*.5,h*.09,d*.5,0x8a5a2e);{const feather=box('feather',w*.42,h*1.06,0,.03,h*.16,d*.12,0xc25a4a);feather.rotation.z=-.5;}box('satchel',w*.45,h*.28,d*.15,w*.2,h*.18,d*.22,0x6b4f35);break;
  case 'guard':box('helmPoint',0,h*1.08,0,w*.3,h*.08,d*.3,0x8a9098);box('plume',0,h*1.16,0,.05,h*.14,.12,0xb03a2e);box('tabard',0,h*.4,d*.43,w*.55,h*.34,.03,0x9a3a2e);for(const sign of [-1,1])box('shoulder'+sign,sign*w*.48,h*.68,0,w*.22,h*.08,d*.6,0x8a9098);break;
 }}
 if(g.species===S.SNAKE)box('head',0,h*.64,d*.47,w*.85,h*.55,d*.22,def.color);
 if([S.COW,S.PIG,S.SHEEP,S.WOLF,S.CAT,S.RAT].includes(g.species)){const snout=g.species===S.PIG?0xca8d91:g.species===S.SHEEP?0x8c8071:0x8d8274;box('muzzle',0,h*.68,d*.68,w*.45,h*.2,d*.23,snout);if(g.species===S.COW)for(const sign of [-1,1])box('horn'+sign,sign*w*.29,h*1.06,d*.45,w*.09,h*.16,d*.1,0xc8bf9e);for(let i=0;i<4;i++)box('hoof'+i,(i%2?1:-1)*w*.32,h*.04,(i<2?1:-1)*d*.3,w*.23,h*.08,d*.22,0x514a41);}
 if(def.bird||g.species===S.PENGUIN)for(const sign of [-1,1])box('foot'+sign,sign*w*.22,h*.045,d*.16,w*.3,h*.09,d*.4,0xbc934e);
 const head=g.parts.head as T.Mesh<T.BoxGeometry>|undefined,faceZ=head?head.position.z+head.geometry.parameters.depth/2:d/2,eyeY=head?head.position.y+head.geometry.parameters.height*.12:h*.65;
 for(const sign of [-1,1]){if(def.aquatic&&g.species!==S.SQUID){const eye=box('eye'+sign,sign*w*.34,h*.62,d*.38,w*.15,h*.16,.012,0x172126);eye.rotation.y=sign*Math.PI/2;}else{box('eye'+sign,sign*w*.2,eyeY,faceZ+.008,w*.12,h*.055,.02,g.species===S.SHADOW_REAPER?0xbbd9ff:0x1b2023,g.species===S.SHADOW_REAPER?0xbedcff:0);box('eyeShine'+sign,sign*w*.2-w*.03,eyeY+h*.02,faceZ+.02,w*.035,h*.02,.006,0xffffff);}}
 // Snake eyes belong on the sides of the wide flat head, not the front face.
 if(g.species===S.SNAKE&&head){const halfW=head.geometry.parameters.width/2;for(const sign of [-1,1]){const eye=g.parts['eye'+sign] as T.Mesh<T.BoxGeometry>|undefined;if(eye){eye.position.set(sign*(halfW+.006),eyeY,head.position.z);eye.rotation.y=sign*Math.PI/2;}const shine=g.parts['eyeShine'+sign] as T.Mesh<T.BoxGeometry>|undefined;if(shine){shine.position.set(sign*(halfW+.012),eyeY+h*.02,head.position.z);shine.rotation.y=sign*Math.PI/2;}}}
 // Tropical fish eyes belong on the sides of the thin disc body.
 if(g.species===S.TROPICAL_FISH){for(const sign of [-1,1]){const eye=g.parts['eye'+sign] as T.Mesh<T.BoxGeometry>|undefined;if(eye){eye.position.set(sign*(w*.16+.008),h*.62,d*.30);eye.rotation.y=sign*Math.PI/2;}}}
 // Grazers get a real head pivot (head + eyes + muzzle + ears + horns move together)
 // so the grazing head-down pose reads as one animal, not floating parts.
 if([S.COW,S.PIG,S.SHEEP].includes(g.species)&&head){const pivot=new T.Group();pivot.position.copy(head.position);for(const name of ['head','eye-1','eye1','eyeShine-1','eyeShine1','muzzle','ear-1','ear1','horn-1','horn1']){const part=g.parts[name];if(!part)continue;g.remove(part);part.position.sub(pivot.position);pivot.add(part);g.parts[name]=part;}g.add(pivot);g.parts.head=pivot;}
 // Move limb pivots to their attachment points; feet no longer orbit the limb center.
 for(const name of Object.keys(g.parts))if(/^leg\d|^wing|^tail$/.test(name)){const mesh=g.parts[name] as T.Mesh<T.BoxGeometry>;if(!mesh.isMesh)continue;const pivot=new T.Group();pivot.position.copy(mesh.position);if(name.startsWith('leg')){const half=mesh.geometry.parameters.height/2;pivot.position.y+=half;mesh.position.set(0,-half,0);}else mesh.position.set(0,0,0);g.remove(mesh);pivot.add(mesh);g.add(pivot);g.parts[name]=pivot;}

 for(let i=0;i<4;i++){const hoof=g.parts['hoof'+i],leg=g.parts['leg'+i];if(hoof&&leg){g.remove(hoof);hoof.position.sub(leg.position);leg.add(hoof);}}
 return true;
}
export function animateBetaCreature(g:EntityMeshGroup,speed:number,dt:number){if(!BETA_CREATURES[g.species])return false;if(g.species===S.SLIME)return animateSlime(g,dt);g.animTime+=dt;const moving=Math.min(1,speed/1.2),phase=g.animTime*(g.species===S.PENGUIN?7:5);for(let i=0;i<8;i++){const leg=g.parts['leg'+i];if(leg)leg.rotation.x=Math.sin(phase+(i===0||i===3?0:Math.PI))*.42*moving;}for(const sign of [-1,1]){const wing=g.parts['wing'+sign];if(wing)wing.rotation.z=sign*(g.userData.isFlying?(1.05+Math.sin(g.animTime*10)*.45):(.07+Math.sin(g.animTime*3)*.04));const oar=g.parts['oar'+sign];if(oar)oar.rotation.y=Math.sin(g.animTime*4)*.3*moving;}const tail=g.parts.tail;if(tail)tail.rotation.y=Math.sin(g.animTime*3)*.17*(moving>.1?1.4:1);if(g.species===S.SNAKE)for(let i=0;i<9;i++){const segment=g.parts['segment'+i];if(segment){const baseX=(segment as T.Object3D).userData.baseX as number|undefined??0;segment.position.x=baseX+Math.sin(phase-i*.5)*.04*moving;}}if(g.species===S.COD||g.species===S.TROPICAL_FISH){const fin=g.parts.tail;if(fin)fin.rotation.y=Math.sin(phase*2)*.3*moving;for(const sign of [-1,1]){const pf=g.parts['fin'+sign];if(pf)pf.rotation.y=sign*Math.sin(g.animTime*4)*.18;}}
 // Grazing: grazers lower the whole head pivot while they eat; otherwise it rests level.
 const head=g.parts.head;if(head){const grazing=!!g.userData.grazing;const target=grazing?.5:0;head.rotation.x+=(target-head.rotation.x)*Math.min(1,dt*6);}
 // Penguin waddle: a gentle side-to-side roll while walking.
 if(g.species===S.PENGUIN){const body=g.parts.body;if(body)body.rotation.z=Math.sin(phase)*.07*moving;}
 return true;}
