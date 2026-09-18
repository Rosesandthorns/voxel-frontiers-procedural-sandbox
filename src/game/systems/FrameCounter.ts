/**
 * Shared frame counter incremented by the game render loop.
 * PerfMonitor reads this to measure actual rendered frames per second
 * rather than its own RAF cadence.
 */
export const frameCounter = {
  count: 0,
  lastRenderTime: performance.now(),
};
