import assert from 'node:assert/strict';
import {RemoteMotion} from '../src/game/network/RemoteMotion';
const motion=new RemoteMotion();motion.add({x:20,y:80,z:0,yaw:Math.PI-.1,pitch:0},0);motion.add({x:21,y:80,z:0,yaw:-Math.PI+.1,pitch:.2},100);
assert.equal(motion.sample(150)!.x,20.5);assert.ok(Math.abs(motion.sample(150)!.yaw-Math.PI)<.01);
assert.equal(motion.sample(1000)!.x,22,'Extrapolation stops after 100ms');
motion.add({x:200,y:80,z:0,yaw:0,pitch:0},1100);assert.equal(motion.sample(1100)!.x,200,'Teleport resets interpolation');
console.log('Remote motion interpolation, short packet-loss extrapolation, yaw wrap and teleport handling passed.');
