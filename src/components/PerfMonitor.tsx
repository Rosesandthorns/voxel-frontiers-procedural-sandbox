import React, { useEffect, useRef, useState } from 'react';
import { frameCounter } from '../game/systems/FrameCounter';

interface PerfStats {
  fps: number;
  frameMs: number;
  heapUsedMB: number;
  heapTotalMB: number;
  heapPct: number;
}

function fpsColor(fps: number): string {
  if (fps >= 55) return '#4ade80';
  if (fps >= 40) return '#facc15';
  if (fps >= 25) return '#fb923c';
  return '#f87171';
}

export const PerfMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerfStats>({
    fps: 0, frameMs: 0, heapUsedMB: 0, heapTotalMB: 0, heapPct: 0,
  });

  const lastCountRef = useRef(0);
  const lastTimeRef  = useRef(performance.now());

  useEffect(() => {
    // Sample on a 500ms interval — completely decoupled from RAF.
    // FPS = frames rendered by game loop / elapsed seconds.
    const id = setInterval(() => {
      const now     = performance.now();
      const elapsed = (now - lastTimeRef.current) / 1000;
      const frames  = frameCounter.count - lastCountRef.current;

      lastCountRef.current = frameCounter.count;
      lastTimeRef.current  = now;

      const fps     = elapsed > 0 ? Math.round(frames / elapsed) : 0;
      const frameMs = elapsed > 0 && frames > 0
        ? Math.round((elapsed / frames) * 1000 * 10) / 10
        : 0;

      const mem = (performance as any).memory;
      const heapUsedMB  = mem ? Math.round(mem.usedJSHeapSize   / 1048576) : 0;
      const heapTotalMB = mem ? Math.round(mem.jsHeapSizeLimit   / 1048576) : 0;
      const heapPct     = heapTotalMB > 0
        ? Math.round((heapUsedMB / heapTotalMB) * 100)
        : 0;

      setStats({ fps, frameMs, heapUsedMB, heapTotalMB, heapPct });
    }, 500);

    return () => clearInterval(id);
  }, []);

  const heapColor =
    stats.heapPct > 85 ? '#f87171' :
    stats.heapPct > 60 ? '#fb923c' :
    stats.heapPct > 35 ? '#facc15' : '#4ade80';

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-1.5 shadow-xl backdrop-blur-md text-[11px] font-mono select-none">
      {/* FPS */}
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-400">FPS</span>
        <span className="font-bold text-sm" style={{ color: fpsColor(stats.fps) }}>
          {stats.fps}
        </span>
        <span className="text-zinc-600">({stats.frameMs}ms)</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Heap */}
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-400">MEM</span>
        <span className="font-bold" style={{ color: heapColor }}>
          {stats.heapUsedMB} MB
        </span>
        {stats.heapTotalMB > 0 && (
          <>
            <span className="text-zinc-600">/ {stats.heapTotalMB} MB</span>
            <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.heapPct}%`, backgroundColor: heapColor }}
              />
            </div>
            <span className="text-zinc-500">{stats.heapPct}%</span>
          </>
        )}
      </div>
    </div>
  );
};
