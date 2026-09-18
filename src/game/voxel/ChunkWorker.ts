/**
 * ChunkWorker — runs entirely on a dedicated OS thread.
 *
 * Protocol:
 *   Main → Worker:  { type: 'init',     seed: number }
 *   Main → Worker:  { type: 'generate', cx: number, cz: number, id: number }
 *   Worker → Main: { type: 'chunk',     cx, cz, id, voxels: Uint8Array (transferred),
 *                                       maxY, biome, subBiomeName, subBiomeId, isSicklyWater }
 */

import { WorldGenerator } from './WorldGenerator';
import { BlockType } from '../../types';

let generator: WorldGenerator | null = null;

// Vite exposes the worker context — self is the DedicatedWorkerGlobalScope
const ctx = self as unknown as Worker;

ctx.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data as
    | { type: 'init'; seed: number }
    | { type: 'generate'; cx: number; cz: number; id: number };

  if (msg.type === 'init') {
    generator = new WorldGenerator(msg.seed);
    return;
  }

  if (msg.type === 'generate' && generator) {
    const { cx, cz, id } = msg;
    // Generate with an empty modified-blocks map — the main thread holds those
    const chunk = generator.generateChunk(cx, cz, new Map<string, BlockType>());

    // Transfer the voxel buffer (zero-copy) back to the main thread
    const voxelsCopy = chunk.voxels.slice();
    ctx.postMessage(
      {
        type: 'chunk',
        cx,
        cz,
        id,
        voxels: voxelsCopy,
        maxY: chunk.maxY,
        biome: chunk.biome,
        subBiomeName: chunk.subBiomeName,
        subBiomeId: chunk.subBiomeId,
        isSicklyWater: chunk.isSicklyWater,
      },
      [voxelsCopy.buffer]
    );
  }
});
