export const CHUNK_W = 16;
export const CHUNK_H = 160;
export const CHUNK_D = 16;
export const SEA_LEVEL = 100;

export interface CubeFaceDef {
  dir: [number, number, number];
  type: 'top' | 'bottom' | 'side';
  corners: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
}

export const CUBE_FACES: CubeFaceDef[] = [
  { dir: [0, 1, 0], type: 'top', corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], type: 'bottom', corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], type: 'side', corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], type: 'side', corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 0, 1], type: 'side', corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], type: 'side', corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }
];
