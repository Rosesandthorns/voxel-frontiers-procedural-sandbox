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
  voxels: Uint8Array;
  maxY: number;
  isSicklyWater: boolean;
  neighborNegX?: Uint8Array;
  neighborPosX?: Uint8Array;
  neighborNegZ?: Uint8Array;
  neighborPosZ?: Uint8Array;
  resolve: (result: MeshResult) => void;
}

interface WorkerState {
  worker: Worker;
  busy: boolean;
}

export class MeshWorkerPool {
  private workers: WorkerState[] = [];
  private queue: PendingMeshRequest[] = [];
  private inflight: Map<number, PendingMeshRequest> = new Map();
  private nextId = 0;

  constructor(uvMap: Map<BlockType, any>) {
    const count = Math.max(2, Math.min(6, (navigator.hardwareConcurrency ?? 4) - 1));
    const uvMapEntries = Array.from(uvMap.entries());

    for (let i = 0; i < count; i++) {
      const worker = new Worker(
        new URL('./MeshWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.addEventListener('message', (e: MessageEvent) => this._onMessage(e));
      worker.postMessage({ type: 'init', uvMap: uvMapEntries });

      this.workers.push({ worker, busy: false });
    }
  }

  public request(
    cx: number,
    cz: number,
    voxels: Uint8Array,
    maxY: number,
    isSicklyWater: boolean,
    neighborNegX?: Uint8Array,
    neighborPosX?: Uint8Array,
    neighborNegZ?: Uint8Array,
    neighborPosZ?: Uint8Array
  ): Promise<MeshResult> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      const pending: PendingMeshRequest = {
        id,
        cx,
        cz,
        voxels,
        maxY,
        isSicklyWater,
        neighborNegX,
        neighborPosX,
        neighborNegZ,
        neighborPosZ,
        resolve
      };

      const free = this.workers.find(w => !w.busy);
      if (free) {
        this._dispatch(free, pending);
      } else {
        this.queue.push(pending);
      }
    });
  }

  public cancel(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    this.queue = this.queue.filter(p => `${p.cx},${p.cz}` !== key);
  }

  public destroy(): void {
    for (const ws of this.workers) ws.worker.terminate();
    this.workers = [];
    this.queue = [];
    this.inflight.clear();
  }

  private _dispatch(ws: WorkerState, req: PendingMeshRequest): void {
    ws.busy = true;
    this.inflight.set(req.id, req);
    ws.worker.postMessage({
      type: 'mesh',
      id: req.id,
      cx: req.cx,
      cz: req.cz,
      voxels: req.voxels,
      maxY: req.maxY,
      isSicklyWater: req.isSicklyWater,
      neighborNegX: req.neighborNegX,
      neighborPosX: req.neighborPosX,
      neighborNegZ: req.neighborNegZ,
      neighborPosZ: req.neighborPosZ
    });
  }

  private _onMessage(e: MessageEvent): void {
    const result = e.data as MeshResult;
    const workerState = this.workers.find(
      ws => ws.worker === (e.target as Worker)
    );
    if (workerState) workerState.busy = false;

    const pending = this.inflight.get(result.id);
    if (pending) {
      this.inflight.delete(result.id);
      pending.resolve(result);
    }

    if (this.queue.length > 0 && workerState && !workerState.busy) {
      const next = this.queue.shift()!;
      this._dispatch(workerState, next);
    }
  }
}
