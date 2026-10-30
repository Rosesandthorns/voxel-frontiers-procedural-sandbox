import {BiomeType,BlockType} from '../../types';
import type {BiomeParameters,VerdantSubBiomeDef} from './SubBiomeTypes';
function hash(x:number,z:number,seed:number){let h=Math.imul(x,374761393)^Math.imul(z,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
const base:VerdantSubBiomeDef={id:'mountain',name:'High Ranges',description:'Long ridgelines and weathered summits.',category:'verdant',mainBiome:BiomeType.BOREAL_PEAKS,accentColor:'#a2aca0',baseHeightOffset:0,heightVariation:1,weirdnessScale:0,surfaceBlock:BlockType.STONE,subSurfaceBlock:BlockType.STONE,waterLevel:100,treeFrequency:0,flowerFrequency:0,tallGrassFrequency:0};
export const MOUNTAIN_BIOMES={
 normal:{...base,id:'high_ranges',name:'High Ranges'},
 snowy:{...base,id:'snowy_ranges',name:'Snowbound Ranges',surfaceBlock:BlockType.SNOW,isArctic:true,accentColor:'#dce6e6'},
 desert:{...base,id:'desert_ranges',name:'Sandstone Ranges',surfaceBlock:BlockType.SANDSTONE,subSurfaceBlock:BlockType.SANDSTONE,isDesert:true,accentColor:'#b78e65'},
 cloud:{...base,id:'cloud_cedar_grove',name:'Cloud Cedar Grove',surfaceBlock:BlockType.GRASS,subSurfaceBlock:BlockType.DIRT,treeFrequency:.009,treeTypeOverride:'cloud_cedar' as const,flowerFrequency:.05,accentColor:'#92bca5'},
 amber:{...base,id:'amber_summit',name:'Amber Summit',surfaceBlock:BlockType.GRASS,subSurfaceBlock:BlockType.DIRT,treeFrequency:.007,treeTypeOverride:'amber_pine' as const,flowerFrequency:.07,accentColor:'#c3a56c'}
};
/** Sparse elongated provinces, continuous across chunk boundaries. No new mountains near spawn. */
export function mountainAt(x:number,z:number,seed:number,params:BiomeParameters,generation=3,sampleClimate?:(x:number,z:number)=>BiomeParameters){
 if(params.continentalness<.02||Math.hypot(x,z)<220)return null;
 const size=3072,cx=Math.floor(x/size),cz=Math.floor(z/size);let strength=0,province=0,crest=0,peaks=0,rangeX=0,rangeZ=0,rangeId='';
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
  const a=cx+dx,b=cz+dz;if(hash(a,b,seed+4101)>.34)continue;
  const px=(a+.15+hash(a,b,seed+4102)*.7)*size,pz=(b+.15+hash(a,b,seed+4103)*.7)*size;
  const angle=hash(a,b,seed+4104)*Math.PI,co=Math.cos(angle),si=Math.sin(angle),rx=x-px,rz=z-pz;
  const along=rx*co+rz*si,across=-rx*si+rz*co;
  const length=700+hash(a,b,seed+4105)*650,width=190+hash(a,b,seed+4106)*180;
  const curve=Math.sin(along*.003+hash(a,b,seed)*6)*width*.35;
  const edge=1-Math.hypot(along/length,(across-curve)/width);
  const value=smooth(edge*1.7)*smooth((params.continentalness-.02)/.12);
  if(value>strength){strength=value;rangeX=px;rangeZ=pz;rangeId=`${a},${b}`;province=hash(a,b,seed+4107);crest=Math.max(0,1-Math.abs(across-curve)/width);const phase=hash(a,b,seed+4108)*6.28;peaks=Math.pow(.5+.5*Math.sin(along*.011+phase+Math.sin(along*.003)*1.5),2);}
 }
 if(strength<.001)return null;
 const ridge=.78+.22*Math.cos(x*.014+Math.sin(z*.009)*2);
 const lift=generation<4?strength*(30+ridge*18):Math.pow(strength,1.15)*(28+Math.pow(crest,2.2)*(125+peaks*165)+20*(.5+.5*Math.sin(x*.027+Math.sin(z*.019)*2)));
 // A range owns its climate: local temperature bands must never repaint half a mountain.
 const temperature=generation<4?params.temperature:sampleClimate?sampleClimate(rangeX,rangeZ).temperature:(hash(Math.floor(rangeX),Math.floor(rangeZ),seed+4110)-.5);
 const variant=temperature<-.18?'snowy':temperature>.38?'desert':'normal';
 let biome:VerdantSubBiomeDef=MOUNTAIN_BIOMES[variant];
 if(biome===MOUNTAIN_BIOMES.normal&&strength>.68&&province>.55)biome=province>.79?MOUNTAIN_BIOMES.cloud:MOUNTAIN_BIOMES.amber;
 return {strength,lift,biome,variant,rangeId};
}
