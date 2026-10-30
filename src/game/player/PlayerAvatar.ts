import * as THREE from 'three';
const UNIT=1.8/32;
// Standard modern 64-unit atlas, rendered at twice the pixel density (128 x 128).
export const SKIN_PARTS = {
 head:[0,0,8,8,8], body:[16,16,8,12,4], rightArm:[40,16,4,12,4],
 leftArm:[32,48,4,12,4],rightLeg:[0,16,4,12,4],leftLeg:[16,48,4,12,4]
} as const;
function box(texture:THREE.Texture, part:readonly number[], inflate=0, transparent=false) {
 const [u,v,w,h,d]=part;
 const geometry=new THREE.BoxGeometry(w*UNIT+inflate,h*UNIT+inflate,d*UNIT+inflate);
 const uv=geometry.getAttribute('uv');
 // BoxGeometry order: right, left, top, bottom, front (+Z), back (-Z).
 const faces=[[u,v+d,d,h],[u+d+w,v+d,d,h],[u+d,v,w,d],[u+d+w,v,w,d],[u+d,v+d,w,h],[u+2*d+w,v+d,w,h]];
 faces.forEach(([x,y,width,height],i)=>{
  const coords=[[x,y],[x+width,y],[x,y+height],[x+width,y+height]];
  coords.forEach(([px,py],j)=>uv.setXY(i*4+j,px/64,1-py/64));
 });
 const material=new THREE.MeshLambertMaterial({map:texture,transparent,alphaTest:transparent ? .05 : 0});
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;
 return mesh;
}
export class PlayerAvatar {
 readonly root=new THREE.Group();
 readonly head=new THREE.Group();
 readonly rightArm=new THREE.Group();readonly leftArm=new THREE.Group();
 readonly rightLeg=new THREE.Group();readonly leftLeg=new THREE.Group();
 private phase=0;
 constructor(readonly texture:THREE.Texture){
  const attach=(group:THREE.Group,part:readonly number[],overlay:readonly number[],offset:number)=>{
   const base=box(texture,part);base.position.y=offset;group.add(base);
   const layer=box(texture,overlay,part===SKIN_PARTS.head ? .025 : .012,true);layer.position.y=offset;group.add(layer);
   this.root.add(group);
  };
  attach(this.head,SKIN_PARTS.head,[32,0,8,8,8],4*UNIT);this.head.position.y=24*UNIT;
  const torso=new THREE.Group();attach(torso,SKIN_PARTS.body,[16,32,8,12,4],-6*UNIT);torso.position.y=24*UNIT;
  attach(this.rightArm,SKIN_PARTS.rightArm,[40,32,4,12,4],-6*UNIT);this.rightArm.position.set(-6*UNIT,24*UNIT,0);
  attach(this.leftArm,SKIN_PARTS.leftArm,[48,48,4,12,4],-6*UNIT);this.leftArm.position.set(6*UNIT,24*UNIT,0);
  attach(this.rightLeg,SKIN_PARTS.rightLeg,[0,32,4,12,4],-6*UNIT);this.rightLeg.position.set(-2*UNIT,12*UNIT,0);
  attach(this.leftLeg,SKIN_PARTS.leftLeg,[0,48,4,12,4],-6*UNIT);this.leftLeg.position.set(2*UNIT,12*UNIT,0);
 }
 update(x:number,y:number,z:number,yaw:number,pitch:number,speed:number,delta:number){
  this.root.position.set(x,y,z);this.root.rotation.y=yaw+Math.PI;this.head.rotation.x=-pitch;
  this.phase+=delta*Math.min(speed,8)*2.4;
  const swing=Math.sin(this.phase)*Math.min(speed/5,1)*.65;
  this.rightLeg.rotation.x=swing;this.leftLeg.rotation.x=-swing;
  this.rightArm.rotation.x=-swing;this.leftArm.rotation.x=swing;
 }
 dispose(){this.root.removeFromParent();this.root.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}});this.texture.dispose();}
}
