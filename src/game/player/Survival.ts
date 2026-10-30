export interface SurvivalState {hunger:number;oxygen:number;lastAge?:number;drownTimer:number;starveTimer:number;cactusTimer:number;healTimer:number;fallPeak?:number;wasGrounded:boolean}
export class Survival {
 state:SurvivalState={hunger:100,oxygen:20,drownTimer:0,starveTimer:0,cactusTimer:0,healTimer:0,wasGrounded:true};
 restore(value?:Partial<SurvivalState>){if(!value)return;for(const key of ['hunger','oxygen','lastAge','drownTimer','starveTimer','cactusTimer','healTimer','fallPeak'] as const){const n=value[key];if(typeof n==='number'&&Number.isFinite(n))this.state[key]=Math.max(0,n);}this.state.hunger=Math.min(100,this.state.hunger);this.state.oxygen=Math.min(20,this.state.oxygen);this.state.wasGrounded=value.wasGrounded??true;}
 eat(amount:number){if(this.state.hunger>=100)return false;this.state.hunger=Math.min(100,this.state.hunger+Math.max(0,amount));return true;}
 tick(delta:number,input:{age:number;underwater:boolean;cactus:boolean;grounded:boolean;y:number;flying:boolean}){
  const s=this.state,dt=Math.max(0,Math.min(1,delta));let health=0;
  if(s.lastAge!==undefined){const days=Math.max(0,Math.max(0,input.age-3)-Math.max(0,s.lastAge-3));s.hunger=Math.max(0,s.hunger-days*45);}s.lastAge=Math.max(s.lastAge??input.age,input.age);
  if(input.underwater){const before=s.oxygen;s.oxygen=Math.max(0,before-dt);if(s.oxygen===0){s.drownTimer+=Math.max(0,dt-before);while(s.drownTimer>=2){health-=2;s.drownTimer-=2;}}}else{s.oxygen=Math.min(20,s.oxygen+dt*8);s.drownTimer=0;}
  if(s.hunger<=0){s.starveTimer+=dt;while(s.starveTimer>=4){health--;s.starveTimer-=4;}}else s.starveTimer=0;
  if(input.cactus){s.cactusTimer+=dt;while(s.cactusTimer>=1){health--;s.cactusTimer--;}}else s.cactusTimer=0;
  if(s.hunger>=95&&!input.underwater&&!input.cactus){s.healTimer+=dt;while(s.healTimer>=10){health++;s.healTimer-=10;}}else s.healTimer=0;
  if(input.flying||input.underwater){s.fallPeak=undefined;}else if(!input.grounded){s.fallPeak=Math.max(s.fallPeak??input.y,input.y);}else if(!s.wasGrounded&&s.fallPeak!==undefined){health-=Math.max(0,Math.floor(s.fallPeak-input.y-3));s.fallPeak=undefined;}
  s.wasGrounded=input.grounded;return health;
 }
 snapshot(){return {...this.state};}
 reset(){this.state={hunger:100,oxygen:20,drownTimer:0,starveTimer:0,cactusTimer:0,healTimer:0,wasGrounded:true};}
}
