import * as THREE from 'three';
import { EntitySpecies } from '../../types';
import { EntityMeshGroup } from './EntityModels';

/**
 * Creates a canvas-based pixel art texture with NearestFilter,
 * perfectly matching the 32x32 voxel aesthetic of the game.
 */
function createPixelTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Simple seeded hash for procedural pixel shading
function pHash(x: number, y: number, seed: number = 0): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

// ── Cache for Fox Materials ──────────────────────────────────────────────────
let foxMaterialsCache: {
  body: THREE.Material[];
  head: THREE.Material[];
  snout: THREE.Material[];
  ear: THREE.Material[];
  tail: THREE.Material[];
  leg: THREE.Material[];
} | null = null;

function getFoxMaterials() {
  if (foxMaterialsCache) return foxMaterialsCache;

  // 1. Fox Body (32x32)
  // [right, left, top, bottom, front, back]
  const texBodySide = createPixelTexture(32, 32, (ctx, w, h) => {
    // Upper 65% vibrant orange fur, lower 35% creamy underbelly
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 101);
        if (y > 20) {
          // Cream white belly with fur tufts
          ctx.fillStyle = n > 0.5 ? '#fffbeb' : '#fef3c7';
        } else if (y > 17) {
          // Blend fringe
          ctx.fillStyle = n > 0.4 ? '#f57c00' : '#fed7aa';
        } else {
          // Orange fur with subtle tonal variations
          ctx.fillStyle = n > 0.7 ? '#fb8c00' : n > 0.3 ? '#f57c00' : '#e65100';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyTop = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 102);
        const isSpine = x >= 13 && x <= 18;
        if (isSpine) {
          // Subtle darker russet spine stripe
          ctx.fillStyle = n > 0.5 ? '#d84315' : '#e65100';
        } else {
          ctx.fillStyle = n > 0.7 ? '#fb8c00' : n > 0.25 ? '#f57c00' : '#ef6c00';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyBottom = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 103);
        ctx.fillStyle = n > 0.6 ? '#ffffff' : n > 0.3 ? '#fffbeb' : '#fef3c7';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyFront = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 104);
        const isChestBib = x >= 8 && x <= 23 && y >= 6;
        if (isChestBib) {
          // Snowy white chest fur
          ctx.fillStyle = n > 0.5 ? '#ffffff' : '#f8fafc';
        } else {
          ctx.fillStyle = n > 0.5 ? '#f57c00' : '#e65100';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyBack = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 105);
        ctx.fillStyle = n > 0.6 ? '#fb8c00' : '#e65100';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matBody = [
    new THREE.MeshLambertMaterial({ map: texBodySide }), // right
    new THREE.MeshLambertMaterial({ map: texBodySide }), // left
    new THREE.MeshLambertMaterial({ map: texBodyTop }),  // top
    new THREE.MeshLambertMaterial({ map: texBodyBottom }), // bottom
    new THREE.MeshLambertMaterial({ map: texBodyFront }), // front (chest)
    new THREE.MeshLambertMaterial({ map: texBodyBack }),  // back
  ];

  // 2. Fox Head (32x32)
  const texHeadFront = createPixelTexture(32, 32, (ctx, w, h) => {
    // Base orange forehead & white cheek patches
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 106);
        const isCheekL = x < 10 && y >= 16;
        const isCheekR = x >= 22 && y >= 16;
        if (isCheekL || isCheekR) {
          ctx.fillStyle = n > 0.5 ? '#ffffff' : '#fef3c7';
        } else {
          ctx.fillStyle = n > 0.7 ? '#fb8c00' : n > 0.3 ? '#f57c00' : '#e65100';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Eyes (dark espresso with white reflection gleam pixel)
    // Left eye (x: 6..10, y: 12..15)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(6, 12, 5, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 12, 2, 2); // sparkle

    // Right eye (x: 21..25, y: 12..15)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(21, 12, 5, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, 12, 2, 2); // sparkle
  });

  const texHeadSides = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 107);
        const isLowerCheek = y >= 20;
        if (isLowerCheek) {
          ctx.fillStyle = n > 0.5 ? '#ffffff' : '#fef3c7';
        } else {
          ctx.fillStyle = n > 0.6 ? '#fb8c00' : '#f57c00';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texHeadCommon = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 108);
        ctx.fillStyle = n > 0.6 ? '#fb8c00' : '#f57c00';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matHead = [
    new THREE.MeshLambertMaterial({ map: texHeadSides }), // right
    new THREE.MeshLambertMaterial({ map: texHeadSides }), // left
    new THREE.MeshLambertMaterial({ map: texHeadCommon }), // top
    new THREE.MeshLambertMaterial({ map: texBodyBottom }), // bottom
    new THREE.MeshLambertMaterial({ map: texHeadFront }), // front (face)
    new THREE.MeshLambertMaterial({ map: texHeadCommon }), // back
  ];

  // 3. Fox Snout (16x16)
  const texSnoutFront = createPixelTexture(16, 16, (ctx, w, h) => {
    // Upper orange bridge, lower cream muzzle, black nose
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 109);
        ctx.fillStyle = y < 5 ? (n > 0.5 ? '#f57c00' : '#e65100') : '#ffffff';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Button nose leather
    ctx.fillStyle = '#18181b';
    ctx.fillRect(5, 3, 6, 4);
    // Dark mouth seam
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(7, 7, 2, 3);
    // Whisker dots
    ctx.fillStyle = '#52525b';
    ctx.fillRect(2, 8, 1, 1);
    ctx.fillRect(13, 8, 1, 1);
  });

  const texSnoutSide = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 110);
        ctx.fillStyle = y < 5 ? '#f57c00' : n > 0.5 ? '#ffffff' : '#fffbeb';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matSnout = [
    new THREE.MeshLambertMaterial({ map: texSnoutSide }),
    new THREE.MeshLambertMaterial({ map: texSnoutSide }),
    new THREE.MeshLambertMaterial({ map: texHeadCommon }),
    new THREE.MeshLambertMaterial({ map: texBodyBottom }),
    new THREE.MeshLambertMaterial({ map: texSnoutFront }),
    new THREE.MeshLambertMaterial({ map: texHeadCommon }),
  ];

  // 4. Fox Ears (16x16)
  const texEarFront = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const isBorder = x <= 1 || x >= 14 || y <= 2;
        if (isBorder) {
          ctx.fillStyle = '#261c16'; // dark espresso ear tips
        } else {
          ctx.fillStyle = y > 10 ? '#ffedd5' : '#fed7aa'; // soft inner fluff
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texEarBack = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 111);
        ctx.fillStyle = n > 0.5 ? '#261c16' : '#1c1917';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matEar = [
    new THREE.MeshLambertMaterial({ map: texEarBack }),
    new THREE.MeshLambertMaterial({ map: texEarBack }),
    new THREE.MeshLambertMaterial({ map: texEarBack }),
    new THREE.MeshLambertMaterial({ map: texEarBack }),
    new THREE.MeshLambertMaterial({ map: texEarFront }),
    new THREE.MeshLambertMaterial({ map: texEarBack }),
  ];

  // 5. Fox Tail (16x32)
  const texTailSide = createPixelTexture(16, 32, (ctx, w, h) => {
    // Proximal 65% orange, distal 35% snowy white tip
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 112);
        if (y > 21) {
          // Snowy white tail tip
          ctx.fillStyle = n > 0.6 ? '#ffffff' : n > 0.3 ? '#f8fafc' : '#f1f5f9';
        } else if (y > 18) {
          // Transition fringe
          ctx.fillStyle = n > 0.5 ? '#fed7aa' : '#f57c00';
        } else {
          // Fluffy orange tail base
          ctx.fillStyle = n > 0.6 ? '#fb8c00' : n > 0.3 ? '#f57c00' : '#e65100';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texTailTip = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 113);
        ctx.fillStyle = n > 0.5 ? '#ffffff' : '#f8fafc';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matTail = [
    new THREE.MeshLambertMaterial({ map: texTailSide }),
    new THREE.MeshLambertMaterial({ map: texTailSide }),
    new THREE.MeshLambertMaterial({ map: texTailSide }),
    new THREE.MeshLambertMaterial({ map: texTailSide }),
    new THREE.MeshLambertMaterial({ map: texHeadCommon }),
    new THREE.MeshLambertMaterial({ map: texTailTip }),
  ];

  // 6. Fox Legs (16x16)
  const texLeg = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 114);
        if (y >= 8) {
          // Classic black socks / espresso paws
          ctx.fillStyle = n > 0.6 ? '#291d17' : '#1c1917';
        } else {
          // Upper orange fur
          ctx.fillStyle = n > 0.6 ? '#fb8c00' : '#f57c00';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matLegSingle = new THREE.MeshLambertMaterial({ map: texLeg });
  const matLeg = [matLegSingle, matLegSingle, matLegSingle, matLegSingle, matLegSingle, matLegSingle];

  foxMaterialsCache = {
    body: matBody,
    head: matHead,
    snout: matSnout,
    ear: matEar,
    tail: matTail,
    leg: matLeg,
  };

  return foxMaterialsCache;
}

// ── Cache for Cardinal Materials ─────────────────────────────────────────────
let cardinalMaterialsCache: {
  body: THREE.Material[];
  head: THREE.Material[];
  crest: THREE.Material[];
  beak: THREE.Material[];
  wing: THREE.Material[];
  tail: THREE.Material[];
  leg: THREE.Material[];
} | null = null;

function getCardinalMaterials() {
  if (cardinalMaterialsCache) return cardinalMaterialsCache;

  // 1. Cardinal Body (32x32)
  const texBodySide = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 201);
        if (y < 10) {
          // Darker crimson back/spine
          ctx.fillStyle = n > 0.5 ? '#b91c1c' : '#991b1b';
        } else {
          // Brilliant scarlet red breast
          ctx.fillStyle = n > 0.7 ? '#ef4444' : n > 0.3 ? '#dc2626' : '#b91c1c';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyTop = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 202);
        ctx.fillStyle = n > 0.6 ? '#b91c1c' : '#991b1b';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyFront = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 203);
        ctx.fillStyle = n > 0.6 ? '#f87171' : n > 0.3 ? '#ef4444' : '#dc2626';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matBody = [
    new THREE.MeshLambertMaterial({ map: texBodySide }),
    new THREE.MeshLambertMaterial({ map: texBodySide }),
    new THREE.MeshLambertMaterial({ map: texBodyTop }),
    new THREE.MeshLambertMaterial({ map: texBodyTop }),
    new THREE.MeshLambertMaterial({ map: texBodyFront }),
    new THREE.MeshLambertMaterial({ map: texBodyTop }),
  ];

  // 2. Cardinal Head (32x32) with iconic black mask!
  const texHeadFront = createPixelTexture(32, 32, (ctx, w, h) => {
    // Crimson base
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 204);
        ctx.fillStyle = n > 0.6 ? '#ef4444' : '#dc2626';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Iconic Northern Cardinal jet-black facial mask (diamond/shield shape)
    for (let y = 10; y <= 28; y++) {
      const halfW = y < 18 ? (y - 8) : (30 - y);
      const minX = Math.max(4, 16 - halfW);
      const maxX = Math.min(28, 16 + halfW);
      for (let x = minX; x <= maxX; x++) {
        const n = pHash(x, y, 205);
        ctx.fillStyle = n > 0.3 ? '#18181b' : '#09090b';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Glossy dark eyes with bright white specular reflection
    // Left eye (x: 8..11, y: 13..15)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(8, 13, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 13, 1, 1);

    // Right eye (x: 20..23, y: 13..15)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(20, 13, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, 13, 1, 1);
  });

  const texHeadSides = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 206);
        // Forward face has black mask edge
        const isMaskEdge = x > 20 && y > 10 && y < 26;
        if (isMaskEdge) {
          ctx.fillStyle = '#18181b';
        } else {
          ctx.fillStyle = n > 0.6 ? '#ef4444' : '#dc2626';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texHeadTop = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 207);
        ctx.fillStyle = n > 0.5 ? '#ef4444' : '#dc2626';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matHead = [
    new THREE.MeshLambertMaterial({ map: texHeadSides }),
    new THREE.MeshLambertMaterial({ map: texHeadSides }),
    new THREE.MeshLambertMaterial({ map: texHeadTop }),
    new THREE.MeshLambertMaterial({ map: texHeadTop }),
    new THREE.MeshLambertMaterial({ map: texHeadFront }),
    new THREE.MeshLambertMaterial({ map: texHeadTop }),
  ];

  // 3. Cardinal Crest (16x16)
  const texCrest = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 208);
        ctx.fillStyle = y < 6 ? (n > 0.5 ? '#b91c1c' : '#991b1b') : (n > 0.5 ? '#ef4444' : '#dc2626');
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matCrestSingle = new THREE.MeshLambertMaterial({ map: texCrest });
  const matCrest = [matCrestSingle, matCrestSingle, matCrestSingle, matCrestSingle, matCrestSingle, matCrestSingle];

  // 4. Cardinal Beak (16x16)
  const texBeak = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const isSeam = y === 8;
        if (isSeam) {
          ctx.fillStyle = '#c2410c'; // dark seam
        } else {
          ctx.fillStyle = y < 8 ? '#f97316' : '#ea580c'; // coral-orange conical bill
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matBeakSingle = new THREE.MeshLambertMaterial({ map: texBeak });
  const matBeak = [matBeakSingle, matBeakSingle, matBeakSingle, matBeakSingle, matBeakSingle, matBeakSingle];

  // 5. Cardinal Wings (16x32)
  const texWingOuter = createPixelTexture(16, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 209);
        const isFlightQuill = (y % 4 === 0 && y > 10);
        if (isFlightQuill) {
          ctx.fillStyle = '#7f1d1d'; // dark ruby quill shadow
        } else if (y > 18) {
          ctx.fillStyle = n > 0.5 ? '#991b1b' : '#7f1d1d'; // primary flight feathers
        } else {
          ctx.fillStyle = n > 0.6 ? '#ef4444' : '#dc2626'; // covert feathers
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matWingSingle = new THREE.MeshLambertMaterial({ map: texWingOuter });
  const matWing = [matWingSingle, matWingSingle, matWingSingle, matWingSingle, matWingSingle, matWingSingle];

  // 6. Cardinal Tail (16x32)
  const texTail = createPixelTexture(16, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const isCenterQuill = x === 7 || x === 8;
        if (isCenterQuill) {
          ctx.fillStyle = '#7f1d1d';
        } else {
          ctx.fillStyle = y > 22 ? '#7f1d1d' : '#991b1b';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matTailSingle = new THREE.MeshLambertMaterial({ map: texTail });
  const matTail = [matTailSingle, matTailSingle, matTailSingle, matTailSingle, matTailSingle, matTailSingle];

  // 7. Cardinal Talons/Legs (8x16)
  const texLeg = createPixelTexture(8, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 210);
        ctx.fillStyle = n > 0.5 ? '#475569' : '#334155';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matLegSingle = new THREE.MeshLambertMaterial({ map: texLeg });
  const matLeg = [matLegSingle, matLegSingle, matLegSingle, matLegSingle, matLegSingle, matLegSingle];

  cardinalMaterialsCache = {
    body: matBody,
    head: matHead,
    crest: matCrest,
    beak: matBeak,
    wing: matWing,
    tail: matTail,
    leg: matLeg,
  };

  return cardinalMaterialsCache;
}

// ── Cache for Salmon Materials ───────────────────────────────────────────────
let salmonMaterialsCache: {
  body: THREE.Material[];
  head: THREE.Material[];
  tailFin: THREE.Material[];
  dorsalFin: THREE.Material[];
  pectoralFin: THREE.Material[];
} | null = null;

function getSalmonMaterials() {
  if (salmonMaterialsCache) return salmonMaterialsCache;

  // 1. Salmon Body (32x32) - Coral/salmon red scales with creamy silver belly
  const texBodySide = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 301);
        if (y > 22) {
          // Ventral pale silver-pink belly
          ctx.fillStyle = n > 0.6 ? '#fce7f3' : n > 0.3 ? '#fbcfe8' : '#fed7aa';
        } else if (y > 18) {
          // Gradient transition fringe
          ctx.fillStyle = n > 0.5 ? '#f472b6' : '#f87171';
        } else if (y < 4) {
          // Darker dorsal top ridge
          ctx.fillStyle = n > 0.5 ? '#364536' : '#4a5d4a';
        } else {
          // Rich salmon coral-red scales with subtle fleck sparkles
          if (n > 0.88) {
            ctx.fillStyle = '#fca5a5'; // scale gleam
          } else if (n > 0.45) {
            ctx.fillStyle = '#ef4444'; // rich salmon red
          } else {
            ctx.fillStyle = '#dc2626'; // deeper red scale contour
          }
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyTop = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 302);
        // Olive/slate dorsal spine typical of river salmon
        ctx.fillStyle = n > 0.6 ? '#4a5d4a' : n > 0.3 ? '#364536' : '#273427';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyBottom = createPixelTexture(32, 32, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 303);
        ctx.fillStyle = n > 0.6 ? '#fce7f3' : n > 0.3 ? '#fbcfe8' : '#fed7aa';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const texBodyCap = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 304);
        ctx.fillStyle = n > 0.5 ? '#ef4444' : '#dc2626';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const matBody = [
    new THREE.MeshLambertMaterial({ map: texBodySide }),
    new THREE.MeshLambertMaterial({ map: texBodySide }),
    new THREE.MeshLambertMaterial({ map: texBodyTop }),
    new THREE.MeshLambertMaterial({ map: texBodyBottom }),
    new THREE.MeshLambertMaterial({ map: texBodyCap }),
    new THREE.MeshLambertMaterial({ map: texBodyCap }),
  ];

  // 2. Salmon Head (16x16) - Olive-greenish grey with crisp dark eyes
  const texHeadSide = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 305);
        if (y > 11) {
          ctx.fillStyle = '#fbcfe8';
        } else {
          ctx.fillStyle = n > 0.6 ? '#566e53' : n > 0.3 ? '#455a43' : '#384a37';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Eye placement (dark pupil + white reflection highlight)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, 5, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 5, 1, 1);
  });

  const texHeadFront = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 306);
        ctx.fillStyle = n > 0.5 ? '#455a43' : '#384a37';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Dark mouth slit
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 11, 8, 2);
  });

  const matHead = [
    new THREE.MeshLambertMaterial({ map: texHeadSide }),
    new THREE.MeshLambertMaterial({ map: texHeadSide }),
    new THREE.MeshLambertMaterial({ map: texBodyTop }),
    new THREE.MeshLambertMaterial({ map: texBodyBottom }),
    new THREE.MeshLambertMaterial({ map: texHeadFront }),
    new THREE.MeshLambertMaterial({ map: texBodyCap }),
  ];

  // 3. Tail / Caudal Fin (16x16) - Deep ruby/salmon rays
  const texTailFin = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 307);
        ctx.fillStyle = n > 0.5 ? '#dc2626' : '#991b1b';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matTailSingle = new THREE.MeshLambertMaterial({ map: texTailFin });
  const matTailFin = [matTailSingle, matTailSingle, matTailSingle, matTailSingle, matTailSingle, matTailSingle];

  // 4. Dorsal Fin (16x16) - Olive/ruby rays
  const texDorsalFin = createPixelTexture(16, 16, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = pHash(x, y, 308);
        ctx.fillStyle = n > 0.5 ? '#991b1b' : '#364536';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matDorsalSingle = new THREE.MeshLambertMaterial({ map: texDorsalFin });
  const matDorsalFin = [matDorsalSingle, matDorsalSingle, matDorsalSingle, matDorsalSingle, matDorsalSingle, matDorsalSingle];

  // 5. Pectoral Fin (8x8)
  const texPectoral = createPixelTexture(8, 8, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const matPectoralSingle = new THREE.MeshLambertMaterial({ map: texPectoral });
  const matPectoralFin = [matPectoralSingle, matPectoralSingle, matPectoralSingle, matPectoralSingle, matPectoralSingle, matPectoralSingle];

  salmonMaterialsCache = {
    body: matBody,
    head: matHead,
    tailFin: matTailFin,
    dorsalFin: matDorsalFin,
    pectoralFin: matPectoralFin,
  };

  return salmonMaterialsCache;
}

// ── Model Builders ───────────────────────────────────────────────────────────

/**
 * 1. REDWOOD FOX (Orange Coated)
 * Boxy Minecraft-style mob with textured fur, head, snout, ears, bushy tail, and 4 paws.
 */
export function buildRedwoodFoxModel(g: EntityMeshGroup) {
  const mats = getFoxMaterials();

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.40, 0.88), mats.body);
  body.position.set(0, 0.48, 0);
  g.add(body);
  g.parts.body = body;

  // Head Pivot Group
  const head = new THREE.Group();
  head.position.set(0, 0.68, 0.44);

  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.38), mats.head);
  head.add(headBox);

  // Snout
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.24), mats.snout);
  snout.position.set(0, -0.06, 0.28);
  head.add(snout);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.12, 0.20, 0.08);
  const earL = new THREE.Mesh(earGeo, mats.ear);
  earL.position.set(-0.13, 0.22, -0.04);
  const earR = new THREE.Mesh(earGeo, mats.ear);
  earR.position.set(0.13, 0.22, -0.04);
  head.add(earL, earR);

  g.add(head);
  g.parts.head = head;

  // Bushy Tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.48, -0.44);

  const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.58), mats.tail);
  tailMesh.position.set(0, -0.04, -0.26);
  tailMesh.rotation.x = -0.3;
  tail.add(tailMesh);

  g.add(tail);
  g.parts.tail = tail;

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.13, 0.36, 0.13);
  const legFL = new THREE.Mesh(legGeo, mats.leg);
  legFL.position.set(-0.18, 0.18, 0.26);
  const legFR = new THREE.Mesh(legGeo, mats.leg);
  legFR.position.set(0.18, 0.18, 0.26);
  const legBL = new THREE.Mesh(legGeo, mats.leg);
  legBL.position.set(-0.18, 0.18, -0.26);
  const legBR = new THREE.Mesh(legGeo, mats.leg);
  legBR.position.set(0.18, 0.18, -0.26);

  g.add(legFL, legFR, legBL, legBR);
  g.parts.legFL = legFL;
  g.parts.legFR = legFR;
  g.parts.legBL = legBL;
  g.parts.legBR = legBR;
}

/**
 * 2. CARDINAL (Bird Species)
 * Boxy Minecraft-style songbird with vibrant scarlet coat, peaked crest,
 * black mask, coral beak, flapping wings, and tail feathers.
 */
export function buildCardinalModel(g: EntityMeshGroup) {
  const mats = getCardinalMaterials();

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.30, 0.42), mats.body);
  body.position.set(0, 0.30, 0);
  g.add(body);
  g.parts.body = body;

  // Head Pivot Group
  const head = new THREE.Group();
  head.position.set(0, 0.46, 0.16);

  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), mats.head);
  head.add(headBox);

  // Peaked Crest (Northern Cardinal iconic backwards-slanted crest)
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.18), mats.crest);
  crest.position.set(0, 0.15, -0.05);
  crest.rotation.x = -0.38;
  head.add(crest);

  // Beak
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.14), mats.beak);
  beak.position.set(0, -0.04, 0.16);
  head.add(beak);

  g.add(head);
  g.parts.head = head;

  // Wings (attached with shoulder pivots at top edge of body)
  const wingGeo = new THREE.BoxGeometry(0.06, 0.22, 0.36);
  // Left Wing Group for natural flapping pivot
  const wingLGroup = new THREE.Group();
  wingLGroup.position.set(-0.15, 0.38, 0);
  const wingLMesh = new THREE.Mesh(wingGeo, mats.wing);
  wingLMesh.position.set(0, -0.11, 0);
  wingLGroup.add(wingLMesh);

  // Right Wing Group
  const wingRGroup = new THREE.Group();
  wingRGroup.position.set(0.15, 0.38, 0);
  const wingRMesh = new THREE.Mesh(wingGeo, mats.wing);
  wingRMesh.position.set(0, -0.11, 0);
  wingRGroup.add(wingRMesh);

  g.add(wingLGroup, wingRGroup);
  g.parts.wingL = wingLGroup;
  g.parts.wingR = wingRGroup;

  // Tail Feathers
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.34), mats.tail);
  tail.position.set(0, 0.25, -0.30);
  tail.rotation.x = 0.20;
  g.add(tail);
  g.parts.tail = tail;

  // Legs / Talons
  const legGeo = new THREE.BoxGeometry(0.05, 0.18, 0.05);
  const legL = new THREE.Mesh(legGeo, mats.leg);
  legL.position.set(-0.08, 0.09, 0.02);
  const legR = new THREE.Mesh(legGeo, mats.leg);
  legR.position.set(0.08, 0.09, 0.02);

  g.add(legL, legR);
  g.parts.legL = legL;
  g.parts.legR = legR;
}

// ── Animation Handlers ───────────────────────────────────────────────────────

export function animateRedwoodFox(g: EntityMeshGroup, speed: number, delta: number) {
  const t = g.animTime;

  // 4-legged quadruped trot
  const legSwing = Math.sin(t * 4.2) * 0.65 * Math.min(1, speed + 0.15);
  if (g.parts.legFL) g.parts.legFL.rotation.x = legSwing;
  if (g.parts.legFR) g.parts.legFR.rotation.x = -legSwing;
  if (g.parts.legBL) g.parts.legBL.rotation.x = -legSwing;
  if (g.parts.legBR) g.parts.legBR.rotation.x = legSwing;

  // Natural bushy tail sway
  if (g.parts.tail) {
    g.parts.tail.rotation.y = Math.sin(t * 3.4) * 0.35;
    g.parts.tail.rotation.x = -0.28 + Math.sin(t * 2.0) * 0.08;
  }

  // Minecraft-style fox curious head tilt when stopped!
  if (g.parts.head) {
    if (speed < 0.25) {
      const tiltPhase = (t * 0.6) % 9;
      if (tiltPhase < 3.0) {
        g.parts.head.rotation.z = 0.32; // tilt right
        g.parts.head.rotation.y = 0.18;
      } else if (tiltPhase < 5.5) {
        g.parts.head.rotation.z = -0.28; // tilt left
        g.parts.head.rotation.y = -0.15;
      } else {
        g.parts.head.rotation.z = 0;
        g.parts.head.rotation.y = Math.sin(t * 0.8) * 0.12;
      }
    } else {
      g.parts.head.rotation.z = 0;
      g.parts.head.rotation.y = 0;
    }
  }
}

export function animateCardinal(g: EntityMeshGroup, speed: number, delta: number) {
  const t = g.animTime;
  const isFlying = g.userData?.isFlying ?? (speed > 1.8 || (g.position.y > (g.userData?.groundY ?? 0) + 1.2));

  if (isFlying) {
    // Rapid wing flapping in flight
    const flap = Math.sin(t * 22.0) * 0.95;
    if (g.parts.wingL) {
      g.parts.wingL.rotation.z = flap;
      g.parts.wingL.rotation.y = 0.2;
    }
    if (g.parts.wingR) {
      g.parts.wingR.rotation.z = -flap;
      g.parts.wingR.rotation.y = -0.2;
    }
    if (g.parts.tail) g.parts.tail.rotation.x = -0.12 + Math.sin(t * 4.0) * 0.1;
    // Tucked legs during flight
    if (g.parts.legL) g.parts.legL.rotation.x = 0.55;
    if (g.parts.legR) g.parts.legR.rotation.x = 0.55;
  } else {
    // Perched or ground hopping
    const hop = Math.sin(t * 6.0);
    if (g.parts.wingL) {
      g.parts.wingL.rotation.z = 0.05 + (hop > 0.6 ? Math.sin(t * 14.0) * 0.25 : 0);
      g.parts.wingL.rotation.y = 0;
    }
    if (g.parts.wingR) {
      g.parts.wingR.rotation.z = -0.05 - (hop > 0.6 ? Math.sin(t * 14.0) * 0.25 : 0);
      g.parts.wingR.rotation.y = 0;
    }
    if (g.parts.legL) g.parts.legL.rotation.x = Math.sin(t * 6.0) * 0.45 * Math.min(1, speed);
    if (g.parts.legR) g.parts.legR.rotation.x = -Math.sin(t * 6.0) * 0.45 * Math.min(1, speed);
    if (g.parts.tail) g.parts.tail.rotation.x = 0.22 + Math.sin(t * 3.0) * 0.08;
  }

  // Snappy bird head twitches
  if (g.parts.head) {
    const snapCycle = Math.floor(t * 1.6);
    const seed = (snapCycle * 19) % 11;
    if (seed < 3) {
      g.parts.head.rotation.y = 0.48; // look right
    } else if (seed < 6) {
      g.parts.head.rotation.y = -0.48; // look left
    } else {
      g.parts.head.rotation.y = 0;
    }
  }
}

/**
 * 3. SALMON (Freshwater River Fish)
 * Boxy Minecraft-style salmon with coral-red scaled flank, creamy silver underbelly,
 * olive-slate head and spine, swishing caudal tail fin, dorsal fin, and pectoral fins.
 */
export function buildSalmonModel(g: EntityMeshGroup) {
  const mats = getSalmonMaterials();

  // 1. Torso / Main Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.44), mats.body);
  body.position.set(0, 0.16, 0);
  g.add(body);
  g.parts.body = body;

  // 2. Head Pivot Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.16, 0.22);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.16), mats.head);
  headMesh.position.set(0, 0, 0.08);
  headGroup.add(headMesh);
  g.add(headGroup);
  g.parts.head = headGroup;

  // 3. Tail Swish Pivot Group (Pivot at rear of main body)
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.16, -0.22);

  // Rear body taper
  const tailBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.20), mats.body);
  tailBase.position.set(0, 0, -0.10);
  tailGroup.add(tailBase);

  // Caudal Tail Fin (distinctive vertical fish fin)
  const caudalFin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.22), mats.tailFin);
  caudalFin.position.set(0, 0, -0.24);
  tailGroup.add(caudalFin);

  g.add(tailGroup);
  g.parts.tail = tailGroup;

  // 4. Dorsal Fin
  const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.18), mats.dorsalFin);
  dorsalFin.position.set(0, 0.32, -0.06);
  dorsalFin.rotation.x = -0.25;
  g.add(dorsalFin);
  g.parts.dorsalFin = dorsalFin;

  // 5. Pectoral Fins (Left & Right)
  const finGeo = new THREE.BoxGeometry(0.02, 0.08, 0.14);
  const finL = new THREE.Mesh(finGeo, mats.pectoralFin);
  finL.position.set(-0.11, 0.10, 0.10);
  finL.rotation.z = 0.42;
  finL.rotation.y = 0.25;

  const finR = new THREE.Mesh(finGeo, mats.pectoralFin);
  finR.position.set(0.11, 0.10, 0.10);
  finR.rotation.z = -0.42;
  finR.rotation.y = -0.25;

  g.add(finL, finR);
  g.parts.finL = finL;
  g.parts.finR = finR;
}

export function animateSalmon(g: EntityMeshGroup, speed: number, delta: number) {
  const t = g.animTime;
  const inWater = g.userData?.inWater !== false;

  if (inWater) {
    // Normal smooth swimming in water
    const swimFreq = 11.0 + Math.min(speed * 4.5, 9.0);

    // Natural sinusoidal tail swish
    if (g.parts.tail) {
      g.parts.tail.rotation.y = Math.sin(t * swimFreq) * (0.35 + Math.min(speed * 0.2, 0.35));
    }

    // Body rhythmic sway and roll
    if (g.parts.body) {
      g.parts.body.rotation.y = Math.sin(t * swimFreq - 0.7) * 0.10;
      g.parts.body.rotation.z = Math.sin(t * (swimFreq * 0.5)) * 0.07;
    }

    // Pectoral fin gentle flutters
    if (g.parts.finL) {
      g.parts.finL.rotation.y = 0.25 + Math.sin(t * 8.0) * 0.2;
    }
    if (g.parts.finR) {
      g.parts.finR.rotation.y = -0.25 - Math.sin(t * 8.0) * 0.2;
    }
  } else {
    // Flopping on dry land!
    if (g.parts.body) {
      g.parts.body.rotation.z = 1.35; // Flopped over on side
      g.parts.body.rotation.y = Math.sin(t * 18.0) * 0.35;
    }
    if (g.parts.tail) {
      g.parts.tail.rotation.y = Math.sin(t * 26.0) * 0.75;
    }
  }
}

