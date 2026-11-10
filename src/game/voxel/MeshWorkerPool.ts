import { workerBudget } from './WorkerBudget';
import { copyMeshBorder } from './MeshBorders';
/**
 * MeshWorkerPool
 *
 * Spawns N Web Worker threads to run ChunkMesher in the background.
 * Offloads CPU-intensive geometry computation from the main animation frame.
 */

import { BlockType } from '../../types';

export interface MeshResult {
  type: 'mesh';
  id: number;
  cx: number;
  cz: number;
  solidPositions: Float32Array;
  solidNormals: Float32Array;
  solidUVs: Float32Array;
  solidColors: Float32Array;
  solidIndices: Uint32Array;
  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterUVs: Float32Array;
  waterColors: Float32Array;
  waterIndices: Uint32Array;
}

interface PendingMeshRequest {
  id: number;
  cx: number;
  cz: number;
  voxels: Uint16Array;
  waterValues?: Uint8Array;
  vertical?:{below:Uint16Array;above:Uint16Array};
  maxY: number;
  isSicklyWater: boolean;
  neighborNegX?: Uint16Array;
  neighborPosX?: Uint16Array;
  neighborNegZ?: Uint16Array;
  neighborPosZ?: Uint16Array;
  resolve: (result: MeshResult) => void;
  reject: (err: Error) => void;
  // Started at dispatch, not at request: waiting in the queue can legitimately
  // take a while when hundreds of chunks are loading.
  timeoutId?: ReturnType<typeof setTimeout>;
  worker?: WorkerState;
}

interface WorkerState {
  worker: Worker;
  busy: boolean;
  // Request id currently running on this worker (for error recovery).
  currentId?: number;
}

// A mesh request that never comes back used to strand its chunk forever: no
// error path and no timeout meant the chunk stayed in inflightMeshKeys and
// every later edit only set needsRemesh, so the chunk's mesh never updated
// again for the session. 60s is far above any real mesh time (ms to a few
// seconds even on slow hardware) and only fires when a worker is truly stuck.
const MESH_REQUEST_TIMEOUT_MS = 60000;

export class MeshWorkerPool {
  private workers: WorkerState[] = [];
  private queue: PendingMeshRequest[] = [];
  private inflight: Map<number, PendingMeshRequest> = new Map();
  private nextId = 0;
  private uvMapEntries: Array<[BlockType, any]>;

  constructor(uvMap: Map<BlockType, any>) {
    const count = workerBudget().meshing;
    this.uvMapEntries = Array.from(uvMap.entries());

    for (let i = 0; i < count; i++) {
      this.workers.push(this._spawnWorker());
    }
  }

  private _spawnWorker(): WorkerState {
    const worker = new Worker(
      new URL('./MeshWorker.ts', import.meta.url),
      { type: 'module' }
    );
    const state: WorkerState = { worker, busy: false };
    worker.addEventListener('message', (e: MessageEvent) => this._onMessage(e));
    worker.addEventListener('error', () => this._onWorkerError(state));
    worker.postMessage({ type: 'init', uvMap: this.uvMapEntries });
    return state;
  }

  public request(
    cx: number,
    cz: number,
    voxels: Uint16Array,
    maxY: number,
    isSicklyWater: boolean,
    neighborNegX?: Uint16Array,
    neighborPosX?: Uint16Array,
    neighborNegZ?: Uint16Array,
    neighborPosZ?: Uint16Array,
    waterValues?: Uint8Array,
    vertical?:{below:Uint16Array;above:Uint16Array}
  ): Promise<MeshResult> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const pending: PendingMeshRequest = {
        id,
        cx,
        cz,
        voxels,
        waterValues,vertical,
        maxY,
        isSicklyWater,
        neighborNegX,
        neighborPosX,
        neighborNegZ,
        neighborPosZ,
        resolve,
        reject
      };

      const free = this.workers.find(w => !w.busy);
      if (free) {
        this._dispatch(free, pending);
      } else {
        this.queue.push(pending);
      }
    });
  }

  public hasFreeWorker(): boolean {
    return this.workers.some(w => !w.busy);
  }

  public freeWorkerCount(): number {
    let c = 0;
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workers[i].busy) c++;
    }
    return c;
  }

  public cancel(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    this.queue = this.queue.filter(p => `${p.cx},${p.cz}` !== key);
  }

  public destroy(): void {
    for (const req of this.inflight.values()) {
      if (req.timeoutId !== undefined) clearTimeout(req.timeoutId);
    }
    for (const ws of this.workers) ws.worker.terminate();
    this.workers = [];
    this.queue = [];
    this.inflight.clear();
  }

  private _dispatch(ws: WorkerState, req: PendingMeshRequest): void {
    ws.busy = true;
    ws.currentId = req.id;
    req.worker = ws;
    this.inflight.set(req.id, req);
    req.timeoutId = setTimeout(() => this._failRequest(req, `timed out after ${MESH_REQUEST_TIMEOUT_MS / 1000}s`), MESH_REQUEST_TIMEOUT_MS);
    const voxels=req.voxels.slice(),waterValues=req.waterValues?.slice();
    const neighborNegX=copyMeshBorder(req.neighborNegX,'x',15),neighborPosX=copyMeshBorder(req.neighborPosX,'x',0);
    const neighborNegZ=copyMeshBorder(req.neighborNegZ,'z',15),neighborPosZ=copyMeshBorder(req.neighborPosZ,'z',0);
    const transfer=[voxels,waterValues,neighborNegX,neighborPosX,neighborNegZ,neighborPosZ].filter(Boolean).map(array=>array!.buffer);
    ws.worker.postMessage({
      type: 'mesh',vertical:req.vertical,
      id: req.id,
      cx: req.cx,
      cz: req.cz,
      voxels,
      waterValues,
      maxY: req.maxY,
      isSicklyWater: req.isSicklyWater,
      neighborNegX,
      neighborPosX,
      neighborNegZ,
      neighborPosZ
    },transfer);
  }

  private _onMessage(e: MessageEvent): void {
    const result = e.data as MeshResult;
    const workerState = this.workers.find(
      ws => ws.worker === (e.target as Worker)
    );
    if (workerState) {
      workerState.busy = false;
      if (workerState.currentId === result.id) workerState.currentId = undefined;
    }

    const pending = this.inflight.get(result.id);
    if (pending) {
      this.inflight.delete(result.id);
      if (pending.timeoutId !== undefined) {
        clearTimeout(pending.timeoutId);
        pending.timeoutId = undefined;
      }
      pending.worker = undefined;
      pending.resolve(result);
    }

    if (this.queue.length > 0 && workerState && !workerState.busy) {
      const next = this.queue.shift()!;
      this._dispatch(workerState, next);
    }
  }

  private _onWorkerError(ws: WorkerState): void {
    // A worker threw (uncaught exception in the mesher) or crashed. Its
    // in-flight request would otherwise never resolve, stranding the chunk.
    const req = ws.currentId !== undefined ? this.inflight.get(ws.currentId) : undefined;
    if (req) {
      this._failRequest(req, 'worker error');
    } else {
      this._respawnWorker(ws);
    }
  }

  private _failRequest(req: PendingMeshRequest, reason: string): void {
    if (req.timeoutId !== undefined) {
      clearTimeout(req.timeoutId);
      req.timeoutId = undefined;
    }
    this.inflight.delete(req.id);
    this.queue = this.queue.filter(p => p !== req);
    const ws = req.worker;
    req.worker = undefined;
    // Replace the worker slot so a dead or stuck worker cannot take the pool
    // down with it; the caller re-queues the chunk (VoxelWorld retries a few
    // times, then leaves the chunk's current mesh in place).
    if (ws) this._respawnWorker(ws);
    req.reject(new Error(`Mesh worker request ${req.id} failed: ${reason}`));
  }

  private _respawnWorker(ws: WorkerState): void {
    const idx = this.workers.indexOf(ws);
    try { ws.worker.terminate(); } catch { /* already dead */ }
    const fresh = this._spawnWorker();
    if (idx >= 0) this.workers[idx] = fresh;
    else this.workers.push(fresh);
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this._dispatch(fresh, next);
    }
  }
}
