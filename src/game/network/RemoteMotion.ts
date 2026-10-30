export type Pose={x:number;y:number;z:number;yaw:number;pitch:number};
type Sample=Pose&{at:number};
const angle=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export class RemoteMotion {
 private samples:Sample[]=[];
 add(pose:Pose,at:number){const last=this.samples.at(-1);if(last&&Math.hypot(pose.x-last.x,pose.y-last.y,pose.z-last.z)>16)this.samples=[];this.samples.push({...pose,at});if(this.samples.length>12)this.samples.shift();}
 sample(now:number):Pose|undefined{
  if(!this.samples.length)return;
  const target=now-100;while(this.samples.length>2&&this.samples[1].at<=target)this.samples.shift();
  const a=this.samples[0],b=this.samples[1];if(!b||target<=a.at)return a;
  const span=Math.max(1,b.at-a.at),t=Math.min((target-a.at)/span,1+100/span);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,yaw:angle(a.yaw,b.yaw,Math.min(1,t)),pitch:a.pitch+(b.pitch-a.pitch)*Math.min(1,t)};
 }
}
