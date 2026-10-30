// Share the available CPU budget between generation and meshing instead of each pool taking nearly every core.
export function workerBudget(cores = navigator.hardwareConcurrency || 4) {
 const total=Math.max(2,Math.min(8,Math.floor(cores)-2));
 const generation=Math.max(1,Math.floor(total/2));
 return {generation,meshing:total-generation};
}
