/**
 * ChunkWorkerPool
 *
 * Spawns N Web Worker threads (default: hardwareConcurrency - 1, min 2, max 6).
 * Each worker runs a full WorldGenerator on its own OS thread.
 *
 * API:
 *   pool.request(cx, cz) → Promise<WorkerChunkResult>
 *   pool.destroy()
 *
 * The pool uses a simple round-robin free-list — if all workers are busy the
 * request is queued and dispatched as soon as a worker becomes free.
 */

import { BiomeType } from '../../types';

export interface WorkerChunkResult {
  cx: number;
  cz: number;
  voxels: Uint16Array;
  maxY: number;
  biome: BiomeType;
  subBiomeName: string;
  subBiomeId: string;
  isSicklyWater: boolean;
}

interface PendingRequest {
  cx: number;
  cz: number;
  id: number;
  priority: number;
  resolve: (result: WorkerChunkResult) => void;
}

interface WorkerState {
  worker: Worker;
  busy: boolean;
}

export class ChunkWorkerPool {
  private workers: WorkerState[] = [];
  private queue: PendingRequest[] = [];
  private inflight: Map<number, PendingRequest> = new Map();
  private nextId = 0;

  constructor(seed: number) {
    // Use as many threads as available minus 1 for the main thread, clamped 2-6
    const count = Math.max(2, Math.min(6, (navigator.hardwareConcurrency ?? 4) - 1));

    for (let i = 0; i < count; i++) {
      // Vite handles the ?worker import at build time
      const worker = new Worker(
        new URL('./ChunkWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.addEventListener('message', (e: MessageEvent) => this._onMessage(e));
      worker.postMessage({ type: 'init', seed });

      this.workers.push({ worker, busy: false });
    }
  }

  /** Asynchronously generate a chunk on a background thread. */
  public request(cx: number, cz: number, priority: number = 0): Promise<WorkerChunkResult> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      const pending: PendingRequest = { cx, cz, id, priority, resolve };

      const free = this.workers.find(w => !w.busy);
      if (free) {
        this._dispatch(free, pending);
      } else {
        this.queue.push(pending);
      }
    });
  }

  /** Re-sort queued requests by updated player position and drop requests outside unload radius. */
  public reprioritizeAndPrune(
    pcx: number,
    pcz: number,
    r: number,
    rUnloadSq: number,
    moveDirX: number,
    moveDirZ: number
  ): string[] {
    if (this.queue.length === 0) return [];
    const prunedKeys: string[] = [];
    const kept: PendingRequest[] = [];

    for (let i = 0; i < this.queue.length; i++) {
      const req = this.queue[i];
      const dx = req.cx - pcx;
      const dz = req.cz - pcz;
      const distSq = dx * dx + dz * dz;
      if (distSq > rUnloadSq) {
        prunedKeys.push(`${req.cx},${req.cz}`);
        continue;
      }
      const d = Math.sqrt(distSq) || 0.01;
      const dot = (dx * moveDirX + dz * moveDirZ) / d;
      const isVisible = distSq <= r * r + 1;
      req.priority = (isVisible ? -100 : 50) + d - dot * 3.5;
      kept.push(req);
    }

    kept.sort((a, b) => a.priority - b.priority);
    this.queue = kept;
    return prunedKeys;
  }

  /** Cancel any queued (not yet dispatched) request for this chunk. */
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

  // ── Private ────────────────────────────────────────────────────────────────

  private _dispatch(ws: WorkerState, req: PendingRequest): void {
    ws.busy = true;
    this.inflight.set(req.id, req);
    ws.worker.postMessage({ type: 'generate', cx: req.cx, cz: req.cz, id: req.id });
  }

  private _onMessage(e: MessageEvent): void {
    const { id, cx, cz, voxels, maxY, biome, subBiomeName, subBiomeId, isSicklyWater } = e.data;

    // Find which worker sent this and mark it free
    const workerState = this.workers.find(
      ws => ws.worker === (e.target as Worker)
    );
    if (workerState) workerState.busy = false;

    // Resolve the waiting promise
    const pending = this.inflight.get(id);
    if (pending) {
      this.inflight.delete(id);
      pending.resolve({ cx, cz, voxels, maxY, biome, subBiomeName, subBiomeId, isSicklyWater });
    }

    // Dispatch next queued item if any
    if (this.queue.length > 0 && workerState && !workerState.busy) {
      const next = this.queue.shift()!;
      this._dispatch(workerState, next);
    }
  }
}
