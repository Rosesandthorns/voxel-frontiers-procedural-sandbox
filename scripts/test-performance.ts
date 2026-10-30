import {ChunkWorkerPool} from '../src/game/voxel/ChunkWorkerPool';
import {VoxelWorld} from '../src/game/voxel/VoxelWorld';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {Chunk} from '../src/game/voxel/Chunk';
import {ChunkStore,encodeRuns,snapshotChunk} from '../src/game/voxel/ChunkStore';
import {copyMeshBorder} from '../src/game/voxel/MeshBorders';
import {workerBudget} from '../src/game/voxel/WorkerBudget';
import {BlockEdits} from '../src/game/voxel/BlockEdits';
import {BlockType,BiomeType} from '../src/types';
const require=createRequire(import.meta.url);const codec=require('../desktop/chunk-codec.cjs');
const chunk=new Chunk(-1,0,BiomeType.VERDANT_PLAINS);
chunk.setBlock(2,90,3,BlockType.STONE);let revision=chunk.saveRevision;chunk.setBlock(2,90,3,BlockType.STONE);assert.equal(chunk.saveRevision,revision);chunk.setWaterValue(2,90,3,5);assert.equal(chunk.saveRevision,revision+1);
for(let i=0;i<chunk.voxels.length;i++)chunk.voxels[i]=i%451;
for(const axis of ['x','z'] as const)for(const edge of [0,15]){const border=copyMeshBorder(chunk.voxels,axis,edge)!;assert.equal(border.byteLength,5120);for(let y=0;y<160;y++)for(let i=0;i<16;i++)assert.equal(border[i+y*16],chunk.voxels[(axis==='x'?edge+i*16:i+edge*16)+y*256]);}
assert.deepEqual(codec.encodeRuns(chunk.voxels),encodeRuns(chunk.voxels));assert.deepEqual(codec.decodeRuns(encodeRuns(chunk.voxels),Uint16Array),chunk.voxels);
for(const cores of [2,4,8,16,32]){const b=workerBudget(cores);assert.ok(b.generation>=1&&b.meshing>=1);assert.ok(b.generation+b.meshing<=Math.max(2,cores-2));}
const edits=new BlockEdits();edits.set('-1,50,-1',BlockType.DIRT);edits.set('16,50,16',BlockType.STONE);assert.deepEqual([...edits.forChunk(-1,-1)],[['-1,50,-1',BlockType.DIRT]]);edits.delete('-1,50,-1');assert.equal([...edits.forChunk(-1,-1)].length,0);edits.clear();assert.equal([...edits.forChunk(1,1)].length,0);
let writes=0;let complete:()=>void=()=>{};const disk=new Map();
(globalThis as any).window={desktop:{store(action:string,data:string){if(action==='chunkList')return '[]';if(action==='chunkWrite'){writes++;const p=JSON.parse(data);disk.set(p.key,p.value);return true;}},chunks(action:string,data:any){if(action==='write')return new Promise(resolve=>{complete=()=>resolve(true);});return Promise.resolve(null);}}};
const store=new ChunkStore();assert.equal(store.save(chunk,2),true);assert.equal(writes,1);assert.equal(store.save(chunk,2),true);assert.equal(writes,1,'Clean chunk should not be rewritten');
chunk.setBlock(2,90,3,BlockType.OAK_WOOD);store.queue(chunk,2);store.process();chunk.setBlock(2,90,3,BlockType.GLASS);assert.equal(store.save(chunk,2),true);assert.equal(writes,2);complete();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(store.flush(),true);assert.equal(writes,2,'Old background completion must not invalidate the newer checkpoint');
const saved=disk.get('-1,0');assert.deepEqual(saved.blocks,snapshotChunk(chunk,2).blocks);
console.log('Dirty-save deduplication, async checkpoint ordering, compact mesh borders, codec compatibility and worker budgets passed.');

// A replacement chunk must not inherit geometry from an older chunk with the same coordinates.
const oldChunk=new Chunk(0,0,BiomeType.VERDANT_PLAINS),newChunk=new Chunk(0,0,BiomeType.VERDANT_PLAINS);
let finishMesh:(value:any)=>void=()=>{};let free=true;
const world:any=Object.assign(Object.create(VoxelWorld.prototype),{isDestroyed:false,pendingMeshKeys:new Set(['0,0']),urgentMeshKeys:new Set(),inflightMeshKeys:new Set(),completedMeshMap:new Map(),meshKeys:new Set(),currentChunkCX:0,currentChunkCZ:0,chunks:new Map([['0,0',oldChunk]]),meshPool:{hasFreeWorker:()=>free,request:()=>{free=false;return new Promise(resolve=>{finishMesh=resolve;});}}});
world._pumpMeshQueue();world.chunks.set('0,0',newChunk);const emptyMesh:any={};for(const kind of ['solid','water'])for(const suffix of ['Positions','Normals','UVs','Colors','Indices'])emptyMesh[kind+suffix]=suffix==='Indices'?new Uint32Array():new Float32Array();finishMesh(emptyMesh);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(world.completedMeshMap.size,0);assert.equal(world.pendingMeshKeys.has('0,0'),true);
world.completedMeshMap.set('0,0',{chunk:oldChunk,result:{},revision:oldChunk.saveRevision,neighbors:Array.from({length:4},()=>({chunk:null,revision:-1}))});world._applyMeshResult=()=>{throw new Error('Stale mesh was uploaded');};world._drainCompletedMeshes(2);assert.equal(world.completedMeshMap.size,0);
console.log('Stale mesh results are discarded and replacement chunks are scheduled.');

// An edit made while the same chunk is being meshed must reject that stale result too.
free=true;newChunk.setBlock(1,90,1,BlockType.STONE);world.pendingMeshKeys=new Set(['0,0']);world.inflightMeshKeys=new Set();world.completedMeshMap=new Map();world.chunks.set('0,0',newChunk);world._pumpMeshQueue();newChunk.setBlock(1,90,1,BlockType.AIR);world.enqueueMesh(newChunk,true);finishMesh(emptyMesh);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(world.completedMeshMap.size,0,'Pre-break geometry must never be uploaded');assert.equal(world.pendingMeshKeys.has('0,0'),true,'Edited chunk is immediately scheduled with fresh voxels');

// A result that completed just before a placement/break still has to be rejected at upload time.
let applied=0;world._applyMeshResult=()=>applied++;world.pendingMeshKeys=new Set();world.completedMeshMap=new Map();world.inflightMeshKeys=new Set();const beforeEdit=newChunk.saveRevision;world.completedMeshMap.set('0,0',{chunk:newChunk,result:emptyMesh,revision:beforeEdit,neighbors:Array.from({length:4},()=>({chunk:null,revision:-1}))});newChunk.setBlock(2,90,2,BlockType.STONE);world._drainCompletedMeshes(2);assert.equal(applied,0,'A completed pre-placement mesh cannot hide the placed block');assert.equal(world.pendingMeshKeys.has('0,0'),true);world.completedMeshMap.clear();world.pendingMeshKeys.clear();const neighbor=new Chunk(1,0,BiomeType.VERDANT_PLAINS);world.chunks.set('1,0',neighbor);world.completedMeshMap.set('0,0',{chunk:newChunk,result:emptyMesh,revision:newChunk.saveRevision,neighbors:[{chunk:null,revision:-1},{chunk:neighbor,revision:neighbor.saveRevision},{chunk:null,revision:-1},{chunk:null,revision:-1}]});neighbor.setBlock(0,90,2,BlockType.STONE);world._drainCompletedMeshes(2);assert.equal(applied,0,'A stale border mesh cannot hide a neighboring edge edit');assert.equal(world.pendingMeshKeys.has('0,0'),true);

// A stationary guest must continue scheduling missing terrain after a failed transfer.
let rescheduled=0;
const remote:any=Object.assign(Object.create(VoxelWorld.prototype),{isRemote:true,remoteRetryClock:-1000,lastLoadedCX:0,lastLoadedCZ:0,lastLoadedDist:3,chunks:new Map(),_requestChunkFromWorker:()=>{},_dispatchRing:()=>rescheduled++,_enforceChunkLimit:()=>{}});
remote.updateChunksAround(8,8,3);assert.equal(rescheduled,1);remote.updateChunksAround(8,8,3);assert.equal(rescheduled,1,'Do not flood the connection each frame');remote.remoteRetryClock=-1000;remote.updateChunksAround(8,8,3);assert.equal(rescheduled,2,'Retry while still standing in the same chunk');
const saturated:any=Object.assign(Object.create(VoxelWorld.prototype),{isRemote:true,chunks:new Map(),inflightKeys:new Set(['0,0','0,1','1,0','1,1']),chunkRetryAt:new Map()});
saturated._requestChunkFromWorker(3,3);assert.equal(saturated.inflightKeys.size,4,'Bound downloads so old distant chunks cannot fill an unbounded FIFO');
console.log('Stationary remote terrain retries, sweep throttling and network concurrency budget passed.');

// Host-camera pruning must not strand promises serving a distant guest.
const hostPool:any=Object.assign(Object.create(ChunkWorkerPool.prototype),{queue:[{cx:300,cz:300,id:1,priority:-200,retainForGuest:true},{cx:301,cz:300,id:2,priority:10}]});
assert.deepEqual(hostPool.reprioritizeAndPrune(0,0,3,64,0,1),['301,300']);assert.equal(hostPool.queue.length,1);hostPool.cancel(300,300);assert.equal(hostPool.queue.length,1,'Host synchronous loads cannot cancel a guest request');
let generated=0,finishGuest:(value:any)=>void=()=>{};
const guestWorld:any=Object.assign(Object.create(VoxelWorld.prototype),{guestSnapshots:new Map(),buildNetworkSnapshot:()=>{generated++;return new Promise(resolve=>finishGuest=resolve);}});
const first=guestWorld.networkSnapshot(200,200),second=guestWorld.networkSnapshot(200,200);assert.equal(first,second);assert.equal(generated,1);finishGuest({format:1});await first;assert.equal(guestWorld.guestSnapshots.size,0);
console.log('Guest terrain survives host-camera pruning/cancellation, and duplicate guest requests share generation.');

// Unloading geometry must not erase voxel arrays retained by an unfinished save.
const unloadChunk=new Chunk(5,5,BiomeType.VERDANT_PLAINS);unloadChunk.setBlock(1,90,1,1);
let retained:any;const unloadWorld:any=Object.assign(Object.create(VoxelWorld.prototype),{urgentMeshKeys:new Set(),chunkVersions:{'5,5':4},chunkStore:{queue:(chunk:any)=>{retained=chunk;}},scene:{remove:()=>{}}});
unloadWorld._disposeChunk(unloadChunk);assert.equal(retained.getBlock(1,90,1),1);assert.ok(retained.voxels.length>0,'Pending save retains valid terrain after unload');
console.log('Chunk unload preserves voxel buffers still referenced by pending saves.');
