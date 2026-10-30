import * as T from 'three';
import type {EntityMeshGroup} from './EntityModels';
/** One closed, chamfered gel surface: no overlapping transparent box layers. */
function gelGeometry(width:number,height:number,depth:number){
 const levels=[[0,.78],[height*.12,1],[height*.75,1],[height*.94,.83],[height,.63]],positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(const [y,scale]of levels){const w=width*scale/2,d=depth*scale/2,c=Math.min(w,d)*.24;for(const [x,z]of [[-w+c,-d],[w-c,-d],[w,-d+c],[w,d-c],[w-c,d],[-w+c,d],[-w,d-c],[-w,-d+c]]){positions.push(x,y,z);uv.push(x/width+.5,y/height);}}
 for(let layer=0;layer<levels.length-1;layer++)for(let i=0;i<8;i++){const a=layer*8+i,b=layer*8+(i+1)%8,c=b+8,d=a+8;indices.push(a,d,b,b,d,c);}
 for(let i=1;i<7;i++){indices.push(0,i,i+1);const top=(levels.length-1)*8;indices.push(top,top+i+1,top+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(x+y*32)*4,n=((x>>2)*13+(y>>2)*7)%11,v=239+n;pixels[i]=v;pixels[i+1]=v;pixels[i+2]=v;pixels[i+3]=255;}
const texture=new T.DataTexture(pixels,32,32,T.RGBAFormat);texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestMipmapLinearFilter;texture.generateMipmaps=true;texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
export function setSlimePalette(g:EntityMeshGroup,color:number){const body=g.parts.body as T.Mesh,core=g.parts.core as T.Mesh;if(body)(body.material as T.MeshPhongMaterial).color.setHex(color);if(core)(core.material as T.MeshPhongMaterial).color.setHex(color).multiplyScalar(.55);g.userData.slimeColor=color;}
export function buildSlime(g:EntityMeshGroup){
 const body=new T.Mesh(gelGeometry(.8,.68,.8),new T.MeshPhongMaterial({map:texture,color:0x80b967,transparent:true,opacity:.68,depthWrite:false,shininess:65,specular:0x88a68c,flatShading:true}));body.renderOrder=2;g.add(body);g.parts.body=body;
 const core=new T.Mesh(gelGeometry(.43,.36,.42),new T.MeshPhongMaterial({map:texture,color:0x4f773b,shininess:30,flatShading:true}));core.position.set(0,.13,-.045);g.add(core);g.parts.core=core;
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:number,opacity=1)=>{const material=new T.MeshBasicMaterial({map:texture,color,transparent:opacity<1,opacity,depthWrite:opacity===1});const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.renderOrder=3;g.add(mesh);g.parts[name]=mesh;return mesh;};
 for(const sign of [-1,1]){box('eye'+sign,sign*.145,.37,.406,.071,.1,.016,0x1c3030);box('eyeShine'+sign,sign*.145-.014,.395,.417,.022,.025,.006,0xd8eee3);}
 box('mouth',0,.255,.409,.058,.09,.014,0x1a302d);box('mouthMiddle',0,.255,.411,.082,.052,.014,0x1a302d);box('mouthInner',0,.225,.421,.03,.012,.004,0x5b7970);
 box('shine0',-.23,.49,.406,.075,.035,.005,0xe1f9df,.48);box('shine1',-.276,.445,.406,.032,.06,.005,0xe1f9df,.35);box('shine2',-.17,.535,.394,.035,.035,.005,0xe1f9df,.3);
 for(let i=0;i<3;i++){const bubble=box('bubble'+i,(i-1)*.13,.2+i*.085,.23+i*.02,.045,.045,.045,0xd3ecc5,.24);bubble.renderOrder=1;}
 setSlimePalette(g,0x80b967);return true;
}
export function animateSlime(g:EntityMeshGroup,dt:number){g.animTime+=dt;const vy=Number(g.userData.verticalVelocity)||0;let target=1+Math.sin(g.animTime*2.2)*.022;if(vy>1)target=1.12;else if(vy<-.5)target=.94;if(g.userData.wasAirborne&&Math.abs(vy)<.1)g.userData.landedAt=g.animTime;g.userData.wasAirborne=Math.abs(vy)>.5;const since=g.animTime-(g.userData.landedAt??-10);if(since<.22)target=.83+since/.22*.17;const sy=T.MathUtils.lerp(g.scale.y,target,Math.min(1,dt*14));g.scale.set(1/Math.sqrt(sy),sy,1/Math.sqrt(sy));const core=g.parts.core;if(core)core.position.y=.13+Math.sin(g.animTime*1.8)*.008;for(let i=0;i<3;i++){const p=g.parts['bubble'+i];if(p)p.position.y=.2+i*.085+Math.sin(g.animTime*1.4+i)*.018;}return true;}
