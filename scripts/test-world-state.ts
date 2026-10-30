import assert from 'node:assert/strict';
import {SeasonWeatherSystem} from '../src/game/environment/SeasonWeatherSystem';
import {Season,WeatherType,EntitySpecies} from '../src/types';
import {EntityManager} from '../src/game/entities/EntityManager';

const weather=new SeasonWeatherSystem();
weather.restore({season:Season.WINTER,dayInSeason:6,totalDays:27,currentWeather:WeatherType.SNOWSTORM,targetWeather:WeatherType.EVERSNOW,weatherBlend:.42,weatherDurationDays:1.2,weatherProgressDays:.7,lastTimeOfDay:.93,snowAccumulateTimer:3,lightningTimer:4});
const snapshot=JSON.parse(JSON.stringify(weather.snapshot()));
const restored=new SeasonWeatherSystem();restored.restore(snapshot);
assert.deepEqual(restored.snapshot(),snapshot);
restored.update(0,.93,null as any,null as any);
assert.equal(restored.totalDays,27,'Restoring at night must not count a new day');
restored.update(.1,.01,null as any,null as any);
assert.equal(restored.totalDays,28,'Midnight still advances the restored calendar');

// Exercise save/restore with a lightweight scene adapter; rendering is covered by the desktop smoke test.
const manager=Object.create(EntityManager.prototype) as EntityManager;
Object.assign(manager,{entities:new Map(),dormant:new Map(),betaChunks:new Set(),spawnedChunks:new Set(['1,2']),spawnedRiverChunks:new Set(['3,4']),wildlifeSpawnTimer:2});
manager.spawnEntity=function(species,x,y,z){const id='temporary';this.entities.set(id,{state:{id,species,x,y,z,uniqueData:{}} as any,mesh:{rotation:{y:0}} as any});return id;};
const state={id:'pet-1',species:EntitySpecies.REDWOOD_FOX,x:20,y:80,z:40,vx:0,vy:0,vz:0,rotationY:1,pitch:0,health:7,maxHealth:15,isHostile:false,isTamed:true,isRidden:true,customTimer:8,targetPos:{x:21,y:80,z:40},uniqueData:{owner:'test',hunger:3},lastInteractionTime:2};
manager.restoreState({states:[state],spawnedChunks:['1,2'],spawnedRiverChunks:['3,4'],wildlifeSpawnTimer:2});
const saved=manager.saveState();assert.equal(saved.states[0].health,7);assert.equal(saved.states[0].isTamed,true);assert.equal(saved.states[0].isRidden,false);assert.deepEqual(saved.states[0].uniqueData,state.uniqueData);assert.deepEqual(saved.spawnedChunks,['1,2']);
console.log('Weather schedule, midnight/calendar continuity, seasons, mob health/taming/AI state and spawn-history persistence passed.');
