import { BlockType } from '../../types';

// Fast seeded hash functions and noise for 32x32 pixel art textures
function hash(x: number, y: number, seed: number = 0): number {
  const val = Math.sin(x * 127.1 + y * 311.7 + seed * 43.3) * 43758.5453123;
  return val - Math.floor(val);
}

function smoothNoise(x: number, y: number, scale: number, seed: number = 0): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = sx - x0;
  const fy = sy - y0;

  // Smoothstep curves
  const wx = fx * fx * (3 - 2 * fx);
  const wy = fy * fy * (3 - 2 * fy);

  const n00 = hash(x0, y0, seed);
  const n10 = hash(x1, y0, seed);
  const n01 = hash(x0, y1, seed);
  const n11 = hash(x1, y1, seed);

  const nx0 = n00 * (1 - wx) + n10 * wx;
  const nx1 = n01 * (1 - wx) + n11 * wx;
  return nx0 * (1 - wy) + nx1 * wy;
}

function fbm(x: number, y: number, octaves: number, scale: number, seed: number = 0): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  let totalAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, scale, seed + i * 17) * amp;
    totalAmp += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val / totalAmp;
}

export function setPx(buf: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number, a: number = 255) {
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return;
  const idx = (y * 32 + x) * 4;
  buf[idx] = Math.max(0, Math.min(255, Math.round(r)));
  buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
  buf[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
  buf[idx + 3] = Math.max(0, Math.min(255, Math.round(a)));
}

export function blendPx(buf: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number, a: number = 255) {
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return;
  const idx = (y * 32 + x) * 4;
  const alpha = a / 255;
  const invAlpha = 1 - alpha;
  buf[idx] = Math.round(r * alpha + buf[idx] * invAlpha);
  buf[idx + 1] = Math.round(g * alpha + buf[idx + 1] * invAlpha);
  buf[idx + 2] = Math.round(b * alpha + buf[idx + 2] * invAlpha);
  buf[idx + 3] = Math.min(255, Math.round(buf[idx + 3] + a * (1 - buf[idx + 3] / 255)));
}

export function getPx(buf: Uint8ClampedArray, x: number, y: number): [number, number, number, number] {
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return [0, 0, 0, 0];
  const idx = (y * 32 + x) * 4;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// -------------------------------------------------------------
// 1. ORE GENERATORS (Embedded directly into Stone pixels)
// -------------------------------------------------------------

export function generateIronOre(stonePixels: Uint8ClampedArray): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(stonePixels);
  // Multi-cluster metallic nodules with specular highlights and dark crevice shadow
  const clusters = [
    { cx: 9, cy: 8, rx: 4, ry: 3 },
    { cx: 21, cy: 11, rx: 5, ry: 4 },
    { cx: 13, cy: 22, rx: 5, ry: 3 },
    { cx: 24, cy: 23, rx: 3, ry: 3 }
  ];

  for (const c of clusters) {
    for (let dy = -c.ry - 1; dy <= c.ry + 1; dy++) {
      for (let dx = -c.rx - 1; dx <= c.rx + 1; dx++) {
        const x = c.cx + dx;
        const y = c.cy + dy;
        if (x < 0 || x >= 32 || y < 0 || y >= 32) continue;

        const dNorm = (dx * dx) / (c.rx * c.rx) + (dy * dy) / (c.ry * c.ry);
        const n = hash(x, y, 71);
        if (dNorm < 1.05 + (n - 0.5) * 0.4) {
          // Deep drop shadow around bottom/right edges
          if (dx >= c.rx - 1 || dy >= c.ry - 1 || dNorm > 0.85) {
            setPx(buf, x, y, 68, 55, 48); // Deep shadow rim
          } else if (dx <= -c.rx + 1 && dy <= -c.ry + 1 && n > 0.3) {
            setPx(buf, x, y, 235, 208, 188); // Specular highlight glint
          } else if (n > 0.65) {
            setPx(buf, x, y, 214, 175, 148); // Light iron midtone
          } else if (n > 0.3) {
            setPx(buf, x, y, 184, 146, 120); // Standard iron tone
          } else {
            setPx(buf, x, y, 140, 107, 86);  // Darker iron facet
          }
        }
      }
    }
  }
  return buf;
}

export function generateGoldOre(stonePixels: Uint8ClampedArray): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(stonePixels);
  const clusters = [
    { cx: 8, cy: 12, rx: 4, ry: 3 },
    { cx: 22, cy: 9, rx: 4, ry: 4 },
    { cx: 16, cy: 20, rx: 5, ry: 3 },
    { cx: 25, cy: 22, rx: 3, ry: 3 }
  ];

  for (const c of clusters) {
    for (let dy = -c.ry - 1; dy <= c.ry + 1; dy++) {
      for (let dx = -c.rx - 1; dx <= c.rx + 1; dx++) {
        const x = c.cx + dx;
        const y = c.cy + dy;
        if (x < 0 || x >= 32 || y < 0 || y >= 32) continue;

        const dNorm = (dx * dx) / (c.rx * c.rx) + (dy * dy) / (c.ry * c.ry);
        const n = hash(x, y, 93);
        if (dNorm < 1.0 + (n - 0.5) * 0.45) {
          if (dx >= c.rx - 1 || dy >= c.ry - 1 || dNorm > 0.82) {
            setPx(buf, x, y, 82, 58, 14); // Deep amber shadow
          } else if (dx <= -c.rx + 2 && dy <= -c.ry + 2 && n > 0.35) {
            setPx(buf, x, y, 255, 248, 160); // Brilliant gold highlight
          } else if (n > 0.6) {
            setPx(buf, x, y, 255, 215, 30);  // Pure bright gold
          } else if (n > 0.25) {
            setPx(buf, x, y, 224, 168, 18);  // Rich gold nugget
          } else {
            setPx(buf, x, y, 166, 118, 10);  // Darker gold body
          }
        }
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 2. LEAVES & FOLIAGE
// -------------------------------------------------------------

export function generateLeaves(palette: {
  shadow: [number, number, number];
  dark: [number, number, number];
  mid: [number, number, number];
  light: [number, number, number];
  highlight: [number, number, number];
  accent?: [number, number, number];
}, seed: number = 42, density: number = 0.88): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      // Cellular leaf cluster pattern
      const f = fbm(x, y, 3, 6, seed);
      const micro = hash(x, y, seed + 10);
      const val = f * 0.7 + micro * 0.3;

      // Cutout gaps for natural sunlit canopy holes
      const gapNoise = hash(Math.floor(x / 2), Math.floor(y / 2), seed + 99);
      if (gapNoise < (1 - density) && val < 0.35) {
        setPx(buf, x, y, 0, 0, 0, 0); // Transparent canopy gap
        continue;
      }

      if (val < 0.25) {
        setPx(buf, x, y, palette.shadow[0], palette.shadow[1], palette.shadow[2], 255);
      } else if (val < 0.45) {
        setPx(buf, x, y, palette.dark[0], palette.dark[1], palette.dark[2], 255);
      } else if (val < 0.72) {
        setPx(buf, x, y, palette.mid[0], palette.mid[1], palette.mid[2], 255);
      } else if (val < 0.88) {
        setPx(buf, x, y, palette.light[0], palette.light[1], palette.light[2], 255);
      } else {
        if (palette.accent && hash(x, y, seed + 50) > 0.6) {
          setPx(buf, x, y, palette.accent[0], palette.accent[1], palette.accent[2], 255);
        } else {
          setPx(buf, x, y, palette.highlight[0], palette.highlight[1], palette.highlight[2], 255);
        }
      }
    }
  }
  return buf;
}

export function generateOakLeaves(): Uint8ClampedArray {
  // Matches the exact lush vibrant green of the user's grass top!
  return generateLeaves({
    shadow: [29, 59, 12],     // #1d3b0c deep underside
    dark: [46, 99, 20],       // #2e6314 shaded foliage
    mid: [79, 167, 49],       // #4fa731 user grass midtone
    light: [98, 199, 60],     // #62c73c sunlit leaf blade
    highlight: [135, 224, 82] // #87e052 golden leaf edge
  }, 12, 0.90);
}

// -------------------------------------------------------------
// 3. WOOD LOGS (Bark side & Concentric rings top)
// -------------------------------------------------------------

export function generateLogSide(
  barkDark: [number, number, number],
  barkMid: [number, number, number],
  barkLight: [number, number, number],
  moss?: [number, number, number],
  seed: number = 33
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      // Vertical grain furrows with horizontal bark break offsets
      const furrow = Math.sin((x + hash(0, Math.floor(y / 4), seed) * 2) * 0.78);
      const grain = fbm(x * 2.2, y * 0.35, 3, 8, seed);
      const micro = hash(x, y, seed + 5);

      const val = furrow * 0.35 + grain * 0.45 + micro * 0.2;

      let r: number, g: number, b: number;
      if (val < 0.28) {
        // Deep shadow furrow
        r = barkDark[0] * 0.85;
        g = barkDark[1] * 0.85;
        b = barkDark[2] * 0.85;
      } else if (val < 0.52) {
        r = barkDark[0];
        g = barkDark[1];
        b = barkDark[2];
      } else if (val < 0.78) {
        r = barkMid[0];
        g = barkMid[1];
        b = barkMid[2];
      } else {
        r = barkLight[0];
        g = barkLight[1];
        b = barkLight[2];
      }

      // Optional climbing moss/lichen patches
      if (moss && (fbm(x, y, 2, 9, seed + 80) > 0.68)) {
        r = r * 0.3 + moss[0] * 0.7;
        g = g * 0.3 + moss[1] * 0.7;
        b = b * 0.3 + moss[2] * 0.7;
      }

      setPx(buf, x, y, r, g, b, 255);
    }
  }
  return buf;
}

export function generateLogTop(
  barkEdge: [number, number, number],
  woodLight: [number, number, number],
  woodDark: [number, number, number],
  heartwood: [number, number, number],
  seed: number = 44
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const cx = 15.5;
  const cy = 15.5;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Outer protective bark ring (dist > 13.5)
      if (dist >= 13.2 + (hash(x, y, seed) - 0.5) * 1.5) {
        const n = hash(x, y, seed + 1);
        const f = 0.7 + n * 0.4;
        setPx(buf, x, y, barkEdge[0] * f, barkEdge[1] * f, barkEdge[2] * f, 255);
        continue;
      }

      // Concentric annual tree rings with medullary rays
      const ringWarp = Math.sin(angle * 6 + seed) * 0.5;
      const effectiveDist = dist + ringWarp;
      const ringFactor = (Math.sin(effectiveDist * 1.85) + 1) * 0.5; // 0..1
      const micro = (hash(x, y, seed + 20) - 0.5) * 0.15;

      let r: number, g: number, b: number;
      if (dist < 3.2) {
        // Dark center heartwood core
        r = heartwood[0];
        g = heartwood[1];
        b = heartwood[2];
      } else {
        const t = Math.max(0, Math.min(1, ringFactor + micro));
        r = woodDark[0] * (1 - t) + woodLight[0] * t;
        g = woodDark[1] * (1 - t) + woodLight[1] * t;
        b = woodDark[2] * (1 - t) + woodLight[2] * t;
      }

      // Fine radial wood rays
      if (Math.abs(Math.sin(angle * 12)) < 0.08 && dist > 3.5) {
        r *= 0.88;
        g *= 0.88;
        b *= 0.88;
      }

      setPx(buf, x, y, r, g, b, 255);
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 4. SAND & SANDSTONE
// -------------------------------------------------------------

export function generateSand(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Warm golden sunlit desert sand with micro-ripples and fine crystalline grains
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const ripple = Math.sin((x * 0.4 + y * 0.6) + smoothNoise(x, y, 6, 7) * 3);
      const grain = hash(x, y, 101);
      const val = ripple * 0.3 + grain * 0.7;

      let r: number, g: number, b: number;
      if (val > 0.82) {
        r = 238; g = 214; b = 152; // Golden highlight speck
      } else if (val > 0.55) {
        r = 224; g = 192; b = 132; // Sunlit dune crest
      } else if (val > 0.28) {
        r = 208; g = 173; b = 114; // Base sand loam
      } else {
        r = 188; g = 150; b = 96;  // Ripple trough shadow
      }
      setPx(buf, x, y, r, g, b, 255);
    }
  }
  return buf;
}

export function generateSandstone(face: 'top' | 'side' | 'bottom'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  if (face === 'top') {
    // Smoothed chiseled sandstone paving with clean beveled edge
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const isBevelTop = y <= 1 || x <= 1;
        const isBevelBottom = y >= 30 || x >= 30;
        const grain = hash(x, y, 88);

        let r = 215 + (grain - 0.5) * 16;
        let g = 182 + (grain - 0.5) * 14;
        let b = 125 + (grain - 0.5) * 12;

        if (isBevelTop) {
          r += 22; g += 20; b += 15;
        } else if (isBevelBottom) {
          r -= 30; g -= 28; b -= 22;
        }
        setPx(buf, x, y, r, g, b, 255);
      }
    }
  } else if (face === 'bottom') {
    return generateSand();
  } else {
    // Side face: 3 horizontal sedimentary stone strata with chiseled hieroglyphic band
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const grain = hash(x, y, 202);
        let r = 205 + (grain - 0.5) * 16;
        let g = 172 + (grain - 0.5) * 14;
        let b = 116 + (grain - 0.5) * 12;

        // Stratum joint lines at y = 10, y = 21
        if (y === 10 || y === 21) {
          r -= 45; g -= 40; b -= 32; // Chiseled cleft groove
        } else if (y === 11 || y === 22) {
          r += 18; g += 16; b += 12; // Light catching lower ledge
        }

        // Decorative relief glyphs in middle stratum (y 12..19)
        if (y >= 13 && y <= 18 && (x % 8 === 2 || x % 8 === 5 || (y === 15 && x % 8 > 1 && x % 8 < 6))) {
          r -= 32; g -= 28; b -= 22; // Chiseled relief indent
        }

        // Top bevel highlight
        if (y === 0) { r += 24; g += 22; b += 16; }
        setPx(buf, x, y, r, g, b, 255);
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 5. GLASS
// -------------------------------------------------------------

export function generateGlass(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Clean frame + translucent diagonal specular sheen lines
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const isOuterBorder = x === 0 || x === 31 || y === 0 || y === 31;
      const isInnerBorder = x === 1 || x === 30 || y === 1 || y === 30;

      if (isOuterBorder) {
        setPx(buf, x, y, 148, 163, 184, 255); // Slate metallic frame edge
      } else if (isInnerBorder) {
        setPx(buf, x, y, 226, 232, 240, 255); // Bright beveled inner frame
      } else {
        // Specular sheen diagonal lines across pane
        const diag1 = Math.abs(x - y + 10);
        const diag2 = Math.abs(x - y - 8);
        if (diag1 <= 1) {
          setPx(buf, x, y, 255, 255, 255, 140); // Soft specular reflection
        } else if (diag2 <= 0.6 && x > 14 && y < 24) {
          setPx(buf, x, y, 255, 255, 255, 180); // Bright glint streak
        } else {
          setPx(buf, x, y, 0, 0, 0, 0); // 100% transparent interior!
        }
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 6. OBSIDIAN, MAGMA ROCK, BASALT, VOID STONE
// -------------------------------------------------------------

export function generateObsidian(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Deep midnight purple-black volcanic glass with sharp conchoidal fracture facets
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const facet = Math.sin(x * 0.45 + y * 0.3) * Math.cos(x * 0.25 - y * 0.5);
      const grain = hash(x, y, 55);
      const val = facet * 0.6 + grain * 0.4;

      if (val > 0.65) {
        setPx(buf, x, y, 78, 62, 118, 255); // Glossy violet highlight
      } else if (val > 0.35) {
        setPx(buf, x, y, 42, 33, 68, 255);  // Deep obsidian purple
      } else if (val > 0.0) {
        setPx(buf, x, y, 24, 18, 42, 255);  // Dark violet-black
      } else {
        setPx(buf, x, y, 12, 9, 22, 255);   // Midnight black cleft
      }
    }
  }
  return buf;
}

export function generateMagmaRock(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Cracked basalt rock with glowing orange/yellow lava veins
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const vein = Math.abs(Math.sin(x * 0.32 + fbm(x, y, 2, 4, 12) * 3) * Math.sin(y * 0.35));
      const micro = hash(x, y, 77);

      if (vein < 0.12) {
        setPx(buf, x, y, 255, 245, 150, 255); // Burning core yellow
      } else if (vein < 0.22) {
        setPx(buf, x, y, 255, 140, 20, 255);  // Molten orange
      } else if (vein < 0.32) {
        setPx(buf, x, y, 200, 40, 10, 255);   // Cooling crimson magma
      } else {
        // Scorched basalt crust
        const b = 38 + (micro - 0.5) * 16;
        setPx(buf, x, y, b + 6, b, b + 4, 255);
      }
    }
  }
  return buf;
}

export function generateBasalt(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  if (face === 'top') {
    // Hexagonal columnar jointing facets
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const d = fbm(x, y, 2, 6, 88);
        const b = 58 + Math.round((d - 0.5) * 24);
        setPx(buf, x, y, b + 2, b + 2, b + 6, 255);
      }
    }
  } else {
    // Vertical columnar chiseled striations
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const col = Math.sin(x * 0.65) * 0.4 + fbm(x * 2, y * 0.4, 2, 8, 44) * 0.6;
        const b = 48 + Math.round(col * 30);
        setPx(buf, x, y, b, b, b + 4, 255);
      }
    }
  }
  return buf;
}

export function generateVoidStone(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const rift = fbm(x, y, 3, 5, 99);
      const star = hash(x, y, 888);

      if (star > 0.96) {
        setPx(buf, x, y, 220, 200, 255, 255); // Astral stardust speck
      } else if (rift > 0.68) {
        setPx(buf, x, y, 124, 75, 215, 255);  // Glowing purple dimensional rift
      } else if (rift > 0.48) {
        setPx(buf, x, y, 68, 38, 125, 255);   // Midnight void purple
      } else if (rift > 0.28) {
        setPx(buf, x, y, 30, 20, 58, 255);    // Dark astral basalt
      } else {
        setPx(buf, x, y, 16, 11, 32, 255);    // Abyssal black
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 7. MYCELIUM & AETHER GRASS (Built on Dirt side & Stone)
// -------------------------------------------------------------

export function generateMycelium(face: 'top' | 'side', dirtSidePixels: Uint8ClampedArray): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  if (face === 'top') {
    // Velvety purple-gray spore crust
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const n = fbm(x, y, 3, 6, 61);
        const spore = hash(x, y, 102);

        if (spore > 0.92) {
          setPx(buf, x, y, 225, 185, 245, 255); // Luminous spore speck
        } else if (n > 0.68) {
          setPx(buf, x, y, 145, 118, 165, 255); // Light fungal velvet
        } else if (n > 0.38) {
          setPx(buf, x, y, 112, 88, 130, 255);  // Mid mycelium violet
        } else {
          setPx(buf, x, y, 82, 62, 98, 255);    // Deep mycelium shadow
        }
      }
    }
  } else {
    // Side face: User's dirt with dripping purple fungal mycelium overhang!
    buf.set(dirtSidePixels);
    for (let x = 0; x < 32; x++) {
      // Overhang depth between 4 and 8 pixels with organic teeth
      const depth = 4 + Math.round(Math.sin(x * 0.7) * 2 + hash(x, 0, 77) * 2.5);
      for (let y = 0; y < depth; y++) {
        const n = hash(x, y, 88);
        if (y === depth - 1) {
          setPx(buf, x, y, 82, 62, 98, 255); // Dark tip fringe
        } else if (n > 0.6) {
          setPx(buf, x, y, 145, 118, 165, 255);
        } else {
          setPx(buf, x, y, 112, 88, 130, 255);
        }
      }
    }
  }
  return buf;
}

export function generateAetherGrass(face: 'top' | 'side', dirtSidePixels: Uint8ClampedArray): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  if (face === 'top') {
    // Luminous celestial azure/cyan glowing grass top
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const n = fbm(x, y, 3, 5, 108);
        const glint = hash(x, y, 555);

        if (glint > 0.94) {
          setPx(buf, x, y, 220, 250, 255, 255); // Celestial diamond glint
        } else if (n > 0.7) {
          setPx(buf, x, y, 90, 230, 255, 255);  // Glowing cyan highlight
        } else if (n > 0.4) {
          setPx(buf, x, y, 20, 175, 220, 255);  // Vibrant azure blade
        } else {
          setPx(buf, x, y, 8, 120, 165, 255);   // Deep celestial shadow
        }
      }
    }
  } else {
    // Side: Dirt with glowing cyan grass overhang fringe
    buf.set(dirtSidePixels);
    for (let x = 0; x < 32; x++) {
      const depth = 4 + Math.round(Math.sin(x * 0.65) * 2 + hash(x, 0, 22) * 2.5);
      for (let y = 0; y < depth; y++) {
        const n = hash(x, y, 99);
        if (y === depth - 1) {
          setPx(buf, x, y, 8, 120, 165, 255);
        } else if (n > 0.5) {
          setPx(buf, x, y, 90, 230, 255, 255);
        } else {
          setPx(buf, x, y, 20, 175, 220, 255);
        }
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 8. ANCIENT BRICK & MASONRY
// -------------------------------------------------------------

export function generateAncientBrick(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Cut ashlar stone masonry matching user's stone palette with beveled mortar seams and creeping moss
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const rowIndex = Math.floor(y / 8); // 4 rows of bricks (each 8px tall)
      const isMortarY = y % 8 === 0;

      // Staggered vertical joints
      const xOffset = (rowIndex % 2 === 0) ? 0 : 8;
      const isMortarX = (x + xOffset) % 16 === 0;

      const isMortar = isMortarY || isMortarX;
      const micro = hash(x, y, 404);

      if (isMortar) {
        // Deep carved mortar line with subtle moss
        const isMossy = (x + y * 2) % 9 === 0;
        if (isMossy) {
          setPx(buf, x, y, 54, 92, 42, 255); // Creeping moss in mortar
        } else {
          setPx(buf, x, y, 55, 55, 58, 255); // Deep mortar groove
        }
      } else {
        // Brick body with beveled top/left highlight and bottom/right shadow
        const isBevelLight = (y % 8 === 1) || ((x + xOffset) % 16 === 1);
        const isBevelDark = (y % 8 === 7) || ((x + xOffset) % 16 === 15);

        let baseGray = 138 + Math.round((micro - 0.5) * 20);
        if (isBevelLight) baseGray += 24;
        if (isBevelDark) baseGray -= 28;

        setPx(buf, x, y, baseGray, baseGray, baseGray + 2, 255);
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 9. WATER (Sunlit Tropical Pool Caustics - Seamless 8-Frame Loop) & LAVA
// -------------------------------------------------------------

export const WATER_FRAME_COUNT = 8;

const WATER_CAUSTIC_SEEDS = [
  { x: 5.5,  y: 5.0,  amp: 1.1, phi: 0.0 },
  { x: 17.0, y: 3.5,  amp: 1.3, phi: 1.5 },
  { x: 27.5, y: 6.5,  amp: 1.0, phi: 3.1 },
  { x: 10.0, y: 13.5, amp: 1.2, phi: 4.6 },
  { x: 22.0, y: 14.0, amp: 1.1, phi: 0.8 },
  { x: 3.5,  y: 21.0, amp: 1.4, phi: 2.3 },
  { x: 15.5, y: 22.5, amp: 1.1, phi: 3.9 },
  { x: 28.0, y: 21.5, amp: 1.2, phi: 5.4 },
  { x: 8.5,  y: 28.5, amp: 1.3, phi: 1.1 },
  { x: 21.5, y: 28.0, amp: 1.1, phi: 2.7 },
  { x: 13.5, y: 8.5,  amp: 0.9, phi: 3.7 },
  { x: 25.0, y: 27.0, amp: 1.1, phi: 4.9 },
];

function torusDist32(x1: number, y1: number, x2: number, y2: number): number {
  let dx = Math.abs(x1 - x2);
  if (dx > 16) dx = 32 - dx;
  let dy = Math.abs(y1 - y2);
  if (dy > 16) dy = 32 - dy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateWaterFrame(frameIndex: number, totalFrames: number = WATER_FRAME_COUNT): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const TWO_PI = Math.PI * 2;
  const t = ((frameIndex % totalFrames) / totalFrames) * TWO_PI;

  // Gentle closed-orbit seed movement ensuring perfect seamless looping
  const currentSeeds = WATER_CAUSTIC_SEEDS.map(s => {
    let sx = ((s.x + s.amp * Math.cos(t + s.phi)) % 32 + 32) % 32;
    let sy = ((s.y + s.amp * Math.sin(t + s.phi)) % 32 + 32) % 32;
    return { x: sx, y: sy };
  });

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const u = (x / 32) * TWO_PI;
      const v = (y / 32) * TWO_PI;

      // Smooth periodic toroidal domain warping
      const wx = ((x + 1.4 * Math.sin(v + t * 0.7) + 0.7 * Math.cos(2 * u - t * 0.4)) % 32 + 32) % 32;
      const wy = ((y + 1.4 * Math.cos(u + t * 0.7) + 0.7 * Math.sin(2 * v - t * 0.4)) % 32 + 32) % 32;

      let d1 = 999, d2 = 999, d3 = 999;
      for (let k = 0; k < currentSeeds.length; k++) {
        const cs = currentSeeds[k];
        const d = torusDist32(wx, wy, cs.x, cs.y);
        if (d < d1) {
          d3 = d2;
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d3 = d2;
          d2 = d;
        } else if (d < d3) {
          d3 = d;
        }
      }

      // Caustic distance metrics
      const diff = d2 - d1;      // Distance to cell wall
      const junction = d3 - d2;  // Distance where multiple cells converge into light pools

      let r: number, g: number, b: number;

      // Stylized sunlit pool caustic hierarchy with greatly restrained white highlights
      if (diff < 0.16 || (diff < 0.28 && junction < 0.38)) {
        // Delicate crisp white crest glint & sharp focal junction node (~4% of pixels)
        r = 232; g = 252; b = 255;
      } else if (diff < 0.72 || (diff < 1.15 && junction < 0.75)) {
        // Sunlit pale aqua caustic ribbon (soft cyan, not blinding white)
        r = 142; g = 228; b = 255;
      } else if (diff < 1.65) {
        // Electric cyan caustic outer border
        r = 72; g = 196; b = 250;
      } else if (d1 < 3.2) {
        // Clear tropical cerulean water body
        r = 34; g = 162; b = 244;
      } else {
        // Deep rich azure cell interior
        r = 20; g = 132; b = 228;
      }

      setPx(buf, x, y, r, g, b, 215); // Translucent water alpha
    }
  }
  return buf;
}

export function generateWaterFrames(): Uint8ClampedArray[] {
  const frames: Uint8ClampedArray[] = [];
  for (let f = 0; f < WATER_FRAME_COUNT; f++) {
    frames.push(generateWaterFrame(f, WATER_FRAME_COUNT));
  }
  return frames;
}

export function generateWater(): Uint8ClampedArray {
  return generateWaterFrame(0, WATER_FRAME_COUNT);
}

export function generateLava(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Molten magma convection cells with white-yellow heat centers and dark crust flecks
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const flow = fbm(x, y, 3, 5, 666);
      const crust = hash(x, y, 444);

      if (crust > 0.92) {
        setPx(buf, x, y, 45, 12, 12, 255);   // Cooling dark basalt crust fleck
      } else if (flow > 0.72) {
        setPx(buf, x, y, 255, 255, 190, 255); // Intense white-yellow thermal hotspot
      } else if (flow > 0.45) {
        setPx(buf, x, y, 255, 175, 20, 255);  // Radiant golden orange
      } else if (flow > 0.22) {
        setPx(buf, x, y, 235, 75, 12, 255);   // Molten orange-red
      } else {
        setPx(buf, x, y, 185, 25, 8, 255);    // Deep viscous crimson magma
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 10. PACKED ICE & SNOW
// -------------------------------------------------------------

export function generatePackedIce(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const TWO_PI = Math.PI * 2;

  // Luminous crystalline glacial ice:
  // Pristine azure crystal body, smooth multi-angle facet planes,
  // delicate hairline frost cleavage veins, and subtle sparkling sub-surface depth.
  // 100% seamlessly tiling across 32x32 blocks with zero harsh spots or non-tiling cuts.
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const u = (x / 32) * TWO_PI;
      const v = (y / 32) * TWO_PI;

      // 1. Crystalline plane facets (seamless periodic harmonics)
      const facet1 = Math.sin(u * 2 + v);
      const facet2 = Math.cos(u - v * 2 + 1.3);
      const facet3 = Math.sin(u * 3 - v * 3 + 2.4) * 0.35;
      const facet4 = Math.cos(2 * u + 3 * v) * 0.25;
      const facetNorm = (facet1 * 0.35 + facet2 * 0.35 + facet3 + facet4 + 1.0) * 0.5;

      // 2. Seamless hairline crystalline cleavage veins
      const crack1 = Math.abs(Math.sin(u * 2 + v * 3 + Math.cos(u - v)));
      const crack2 = Math.abs(Math.cos(u * 3 - v * 2 + Math.sin(u + v)));
      const isCleavageCore = crack1 < 0.08 || crack2 < 0.07;
      const isCleavageGlow = !isCleavageCore && (crack1 < 0.22 || crack2 < 0.18);

      // 3. Subtle sub-surface frost crystals
      const frost = hash(x, y, 92);

      let r = 128 + Math.round(facetNorm * 52); // 128 -> 180
      let g = 196 + Math.round(facetNorm * 38); // 196 -> 234
      let b = 236 + Math.round(facetNorm * 18); // 236 -> 254

      if (isCleavageCore) {
        // Bright frosty cleavage core
        r = 238; g = 250; b = 255;
      } else if (isCleavageGlow) {
        // Soft prism refraction halo along the cleavage
        r = Math.min(255, r + 38);
        g = Math.min(255, g + 28);
        b = Math.min(255, b + 15);
      } else if (frost > 0.88 && facetNorm > 0.55) {
        // Micro sparkling ice crystal glint
        r = Math.min(255, r + 22);
        g = Math.min(255, g + 18);
        b = 255;
      }

      setPx(buf, x, y, r, g, b, 255);
    }
  }
  return buf;
}

export function generateSnow(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Soft winter powdery snow with subtle wind scoops and sparkling diamond flakes
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const scoop = Math.sin((x + y) * 0.25) * 0.2 + fbm(x, y, 2, 8, 303) * 0.8;
      const sparkle = hash(x, y, 777);

      if (sparkle > 0.95) {
        setPx(buf, x, y, 255, 255, 255, 255); // Diamond ice sparkle
      } else if (scoop > 0.65) {
        setPx(buf, x, y, 250, 252, 255, 255); // Bright powdery crest
      } else if (scoop > 0.35) {
        setPx(buf, x, y, 235, 242, 250, 255); // Crisp clean snow
      } else {
        setPx(buf, x, y, 212, 226, 240, 255); // Gentle soft blue-gray shadow
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 11. CHEST, LANTERN, CLOUD, BEACON
// -------------------------------------------------------------

export function generateChest(face: 'top' | 'side' | 'front'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Rich oak timber planks matching oak log palette with heavy wrought-iron straps & silver lock
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const isCornerBracket = (x < 3 && y < 3) || (x > 28 && y < 3) || (x < 3 && y > 28) || (x > 28 && y > 28);
      const isIronBorder = x === 0 || x === 31 || y === 0 || y === 31 || isCornerBracket;
      const isCenterLatch = (face === 'front') && (x >= 13 && x <= 18 && y >= 11 && y <= 19);

      if (isCenterLatch) {
        // Silver lock clasp
        if (x >= 14 && x <= 17 && y >= 13 && y <= 17) {
          if (x === 15 && y === 15) {
            setPx(buf, x, y, 25, 25, 28, 255); // Keyhole
          } else {
            setPx(buf, x, y, 245, 245, 250, 255); // Silver latch highlight
          }
        } else {
          setPx(buf, x, y, 65, 68, 75, 255); // Lock plate backing
        }
      } else if (isIronBorder) {
        // Dark wrought-iron strapping with rivets
        const isRivet = (x === 2 || x === 29) && (y === 8 || y === 16 || y === 24);
        if (isRivet) {
          setPx(buf, x, y, 160, 165, 175, 255); // Rivet glint
        } else {
          setPx(buf, x, y, 45, 48, 55, 255);    // Wrought iron
        }
      } else {
        // Oak wood planking
        const plankGrain = Math.sin(x * 1.5) * 0.2 + hash(x, y, 123) * 0.3;
        const baseR = 155 + Math.round(plankGrain * 35);
        const baseG = 115 + Math.round(plankGrain * 25);
        const baseB = 68 + Math.round(plankGrain * 15);
        setPx(buf, x, y, baseR, baseG, baseB, 255);
      }
    }
  }
  return buf;
}

export function generateLantern(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  if (face === 'top') {
    // Wrought iron lantern cap with central ring
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dist = Math.hypot(x - 15.5, y - 15.5);
        if (dist > 14) {
          setPx(buf, x, y, 0, 0, 0, 0); // Cutout perimeter
        } else if (dist > 12) {
          setPx(buf, x, y, 42, 44, 48, 255); // Iron edge
        } else if (dist < 4) {
          setPx(buf, x, y, (dist < 2) ? 20 : 120, (dist < 2) ? 20 : 125, (dist < 2) ? 25 : 135, 255); // Ring
        } else {
          setPx(buf, x, y, 62, 65, 72, 255); // Cap surface
        }
      }
    }
  } else {
    // Ornate cage with glass panes and glowing warm lantern flame core inside
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const isCap = y <= 5;
        const isBase = y >= 27;
        const isPillar = x <= 5 || x >= 26;

        if (isCap || isBase || isPillar) {
          setPx(buf, x, y, 48, 52, 58, 255); // Iron frame
        } else {
          // Glass pane with glowing flame
          const flameDist = Math.hypot(x - 15.5, y - 16.5);
          if (flameDist < 4) {
            setPx(buf, x, y, 255, 255, 200, 255); // White-yellow flame center
          } else if (flameDist < 7) {
            setPx(buf, x, y, 255, 175, 40, 255);  // Radiant golden aura
          } else if (flameDist < 10) {
            setPx(buf, x, y, 245, 105, 20, 255);  // Warm amber glow
          } else {
            setPx(buf, x, y, 160, 120, 70, 200);  // Translucent lantern glass
          }
        }
      }
    }
  }
  return buf;
}

export function generateCloud(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Volumetric puffy cloud with soft periwinkle ambient shading
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const puff = fbm(x, y, 2, 7, 777);
      if (puff > 0.65) {
        setPx(buf, x, y, 255, 255, 255, 240); // Brilliant sunlit white cloud crest
      } else if (puff > 0.35) {
        setPx(buf, x, y, 242, 246, 255, 235); // Soft white body
      } else {
        setPx(buf, x, y, 218, 226, 245, 225); // Periwinkle cloud shadow
      }
    }
  }
  return buf;
}

export function generateBeacon(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const isBase = y >= 26;
      if (isBase) {
        setPx(buf, x, y, 32, 24, 48, 255); // Obsidian plinth
      } else {
        const coreDist = Math.hypot(x - 15.5, y - 13.5);
        if (coreDist < 5) {
          setPx(buf, x, y, 255, 255, 255, 255); // Core celestial nexus
        } else if (coreDist < 8) {
          setPx(buf, x, y, 140, 235, 255, 255); // Cyan plasma aura
        } else if (x === 1 || x === 30 || y === 1) {
          setPx(buf, x, y, 160, 230, 255, 255); // Diamond crystal frame
        } else {
          setPx(buf, x, y, 80, 190, 240, 160);  // Refractive field
        }
      }
    }
  }
  return buf;
}

export function generateCrystalBlock(tint: [number, number, number] = [120, 220, 255]): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Faceted crystal block
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const facet = Math.sin(x * 0.4 + y * 0.3) * Math.sin(x * 0.2 - y * 0.5);
      const isEdge = x === 0 || x === 31 || y === 0 || y === 31;
      const b = 0.75 + facet * 0.25;

      if (isEdge) {
        setPx(buf, x, y, Math.min(255, tint[0] * 1.3), Math.min(255, tint[1] * 1.3), Math.min(255, tint[2] * 1.3), 255);
      } else {
        setPx(buf, x, y, tint[0] * b, tint[1] * b, tint[2] * b, 220);
      }
    }
  }
  return buf;
}

export function generateCoralBlock(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Porous calcified marine reef with organic cellular chambers
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const cell = Math.sin(x * 0.6) * Math.sin(y * 0.6) + hash(x, y, 81) * 0.4;
      if (cell > 0.45) {
        setPx(buf, x, y, 255, 115, 145, 255); // Vibrant coral pink
      } else if (cell > 0.15) {
        setPx(buf, x, y, 235, 75, 110, 255);  // Coral magenta
      } else {
        setPx(buf, x, y, 185, 45, 80, 255);   // Porous reef chamber shadow
      }
    }
  }
  return buf;
}

export function generateAbyssalCrimsonVent(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Dark abyssal basalt rock with deep glowing crimson volcanic fissures
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const fissure = Math.abs(Math.sin(x * 0.35 + fbm(x, y, 2, 4, 91) * 3));
      if (fissure < 0.12) {
        setPx(buf, x, y, 255, 85, 120, 255); // Glowing thermal vent core
      } else if (fissure < 0.25) {
        setPx(buf, x, y, 200, 25, 55, 255);  // Radiant crimson
      } else {
        const b = 28 + Math.round(hash(x, y, 99) * 16);
        setPx(buf, x, y, b + 6, b, b + 2, 255); // Abyssal trench rock
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// 12. VINES (Flat wall climber) & CROSS-QUAD BOTANICAL FLORA
// -------------------------------------------------------------

export function generateVine(variation: number = 0): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4); // Clear 100% transparent initially

  // Realistic 32x32 climbing ivy against the wall:
  // Central twisted woody runner stems branching organically
  const stems = [
    { startX: 15, endX: 13, startY: 0, endY: 31 },
    { startX: 14, endX: 6, startY: 8, endY: 28 },
    { startX: 14, endX: 25, startY: 6, endY: 30 }
  ];

  for (const s of stems) {
    for (let y = s.startY; y <= s.endY; y++) {
      const t = (y - s.startY) / (s.endY - s.startY);
      const curX = Math.round(s.startX * (1 - t) + s.endX * t + Math.sin(y * 0.45 + variation) * 1.5);
      setPx(buf, curX, y, 65, 48, 30, 255);     // Woody vine runner
      setPx(buf, curX + 1, y, 35, 95, 30, 255); // Clinging green bark
    }
  }

  // Clustered heart-shaped emerald leaves along the runners
  const leafNodes = [
    { x: 14, y: 4, size: 3 },
    { x: 19, y: 9, size: 4 },
    { x: 9, y: 12, size: 4 },
    { x: 23, y: 16, size: 3 },
    { x: 13, y: 18, size: 4 },
    { x: 6, y: 22, size: 4 },
    { x: 25, y: 24, size: 3 },
    { x: 16, y: 26, size: 4 },
    { x: 10, y: 29, size: 3 }
  ];

  for (const leaf of leafNodes) {
    for (let dy = -leaf.size; dy <= leaf.size; dy++) {
      for (let dx = -leaf.size; dx <= leaf.size; dx++) {
        const lx = leaf.x + dx;
        const ly = leaf.y + dy;
        const dist = Math.hypot(dx, dy);
        if (dist <= leaf.size && lx >= 0 && lx < 32 && ly >= 0 && ly < 32) {
          if (dy === leaf.size || dx === leaf.size) {
            setPx(buf, lx, ly, 22, 68, 22, 255);  // Leaf underside shadow
          } else if (dy < 0 && dx < 0) {
            setPx(buf, lx, ly, 115, 215, 75, 255); // Sunlit leaf highlight
          } else {
            setPx(buf, lx, ly, 55, 165, 45, 255);  // Rich emerald leaf blade
          }
        }
      }
    }
  }

  return buf;
}

// -------------------------------------------------------------
// 13. CACTI
// -------------------------------------------------------------

export function generateSaguaroCactus(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  if (face === 'top') {
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dist = Math.hypot(x - 15.5, y - 15.5);
        if (dist < 3) {
          setPx(buf, x, y, 240, 220, 160, 255); // Golden apex areole
        } else {
          const angle = Math.atan2(y - 15.5, x - 15.5);
          const rib = Math.sin(angle * 8);
          const g = 110 + Math.round(rib * 30);
          setPx(buf, x, y, 40, g, 35, 255);
        }
      }
    }
  } else {
    // Accordion vertical ribs with spine areoles
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const rib = Math.sin(x * 0.78);
        const isSpine = (x % 4 === 2) && (y % 6 === 3);

        if (isSpine) {
          setPx(buf, x, y, 250, 240, 180, 255); // Sharp pale spine
        } else if (rib > 0.4) {
          setPx(buf, x, y, 75, 175, 55, 255);  // Rib crest highlight
        } else if (rib > -0.4) {
          setPx(buf, x, y, 50, 135, 40, 255);  // Succulent green flesh
        } else {
          setPx(buf, x, y, 28, 85, 24, 255);   // Deep rib furrow shadow
        }
      }
    }
  }
  return buf;
}

export function generateBarrelCactus(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const cx = 15.5;
  const cy = 21.0;
  const rx = 10.5;
  const ry = 9.5;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const distSq = dx * dx + dy * dy;

      if (distSq <= 1.0 && y <= 31) {
        const angle = Math.asin(Math.max(-0.999, Math.min(0.999, dx)));
        const rib = Math.sin(angle * 7);
        const sphereShade = 1.0 - (distSq * 0.35) - (dy * 0.2);
        const ribShade = rib * 0.3;
        const totalFactor = Math.max(0.35, Math.min(1.35, sphereShade + ribShade));

        let r = Math.round(55 * totalFactor);
        let g = Math.round(145 * totalFactor);
        let b = Math.round(45 * totalFactor);

        if (rib > 0.5) {
          r = Math.min(255, r + 45);
          g = Math.min(255, g + 35);
          b = Math.max(20, b - 10);
        } else if (rib < -0.4) {
          r = Math.max(20, r - 25);
          g = Math.max(55, g - 40);
          b = Math.max(15, b - 20);
        }

        setPx(buf, x, y, r, g, b, 255);
      }
    }
  }

  const spineAreoles = [
    { x: 15, y: 14 }, { x: 16, y: 19 }, { x: 15, y: 24 }, { x: 16, y: 28 },
    { x: 12, y: 15 }, { x: 11, y: 20 }, { x: 12, y: 25 },
    { x: 19, y: 15 }, { x: 20, y: 20 }, { x: 19, y: 25 },
    { x: 8, y: 17 }, { x: 7, y: 22 }, { x: 8, y: 27 },
    { x: 23, y: 17 }, { x: 24, y: 22 }, { x: 23, y: 27 },
    { x: 5, y: 21 }, { x: 26, y: 21 }
  ];

  for (const { x, y } of spineAreoles) {
    if (x >= 0 && x < 32 && y >= 0 && y < 32 && buf[(y * 32 + x) * 4 + 3] > 0) {
      setPx(buf, x, y, 255, 235, 145, 255);
      const needles = [
        { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
      ];
      for (const { dx, dy } of needles) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 32 && ny >= 0 && ny < 32) {
          setPx(buf, nx, ny, 250, 205, 85, 255);
        }
      }
    }
  }

  const rimSpines = [
    { x: 4, y: 21 }, { x: 4, y: 18 }, { x: 5, y: 15 }, { x: 6, y: 25 },
    { x: 27, y: 21 }, { x: 27, y: 18 }, { x: 26, y: 15 }, { x: 25, y: 25 }
  ];
  for (const { x, y } of rimSpines) {
    setPx(buf, x, y, 255, 220, 110, 255);
  }

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const wx = Math.round(cx + dx);
      const wy = 12 + dy;
      if ((dx * dx) + (dy * dy * 4) <= 16) {
        setPx(buf, wx, wy, 245, 240, 215, 255);
      }
    }
  }

  const flowers = [
    { cx: 15.5, cy: 9, r: 3.5 },
    { cx: 11.5, cy: 11, r: 2.8 },
    { cx: 19.5, cy: 11, r: 2.8 }
  ];

  for (const fl of flowers) {
    for (let dy = -fl.r - 1; dy <= fl.r + 1; dy++) {
      for (let dx = -fl.r - 1; dx <= fl.r + 1; dx++) {
        const dist = Math.hypot(dx, dy);
        const px = Math.round(fl.cx + dx);
        const py = Math.round(fl.cy + dy);
        if (px < 0 || px >= 32 || py < 0 || py >= 32) continue;

        if (dist <= 1.0) {
          setPx(buf, px, py, 230, 95, 20, 255);
        } else if (dist <= 1.8) {
          setPx(buf, px, py, 255, 175, 25, 255);
        } else if (dist <= fl.r) {
          if (dy < 0) {
            setPx(buf, px, py, 255, 245, 130, 255);
          } else {
            setPx(buf, px, py, 250, 215, 35, 255);
          }
        }
      }
    }
  }

  return buf;
}

export function generatePricklyPear(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  function drawPad(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    angleDeg: number,
    baseR: number,
    baseG: number,
    baseB: number
  ) {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * cos + dy * sin) / rx;
        const v = (-dx * sin + dy * cos) / ry;
        const distSq = u * u + v * v;

        if (distSq <= 1.0) {
          let r = baseR;
          let g = baseG;
          let b = baseB;

          if (distSq > 0.72) {
            if (v < -0.2 || u < -0.2) {
              r = Math.min(255, r + 45);
              g = Math.min(255, g + 45);
              b = Math.min(255, b + 25);
            } else {
              r = Math.max(15, r - 25);
              g = Math.max(45, g - 35);
              b = Math.max(15, b - 20);
            }
          } else {
            const speck = hash(x, y, 42);
            r = Math.round(r * (0.92 + speck * 0.16));
            g = Math.round(g * (0.92 + speck * 0.16));
            b = Math.round(b * (0.92 + speck * 0.16));
          }

          setPx(buf, x, y, r, g, b, 255);
        }
      }
    }
  }

  drawPad(15.5, 25.5, 5.5, 6.5, 0, 48, 125, 42);
  drawPad(9.5, 16.5, 6.0, 7.5, -25, 55, 145, 50);
  drawPad(21.5, 15.0, 6.2, 7.8, 20, 52, 142, 48);
  drawPad(18.5, 6.5, 4.5, 5.5, -10, 65, 165, 58);

  const areoles = [
    { x: 13, y: 24 }, { x: 18, y: 25 }, { x: 15, y: 28 },
    { x: 7, y: 14 }, { x: 11, y: 13 }, { x: 6, y: 18 }, { x: 10, y: 19 }, { x: 13, y: 17 },
    { x: 19, y: 12 }, { x: 23, y: 11 }, { x: 21, y: 16 }, { x: 25, y: 16 }, { x: 22, y: 20 },
    { x: 16, y: 6 }, { x: 19, y: 5 }, { x: 21, y: 8 }, { x: 18, y: 9 }
  ];

  for (const { x, y } of areoles) {
    if (buf[(y * 32 + x) * 4 + 3] > 0) {
      setPx(buf, x, y, 245, 238, 205, 255);
      if (x > 0 && hash(x, y, 101) > 0.4) {
        setPx(buf, x - 1, y - 1, 235, 225, 180, 255);
      }
      if (x < 31 && hash(x, y, 202) > 0.4) {
        setPx(buf, x + 1, y - 1, 235, 225, 180, 255);
      }
    }
  }

  function drawTuna(cx: number, cy: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px < 0 || px >= 32 || py < 0 || py >= 32) continue;
        const dist = Math.hypot(dx, dy);
        if (dist <= 2.1) {
          if (dx <= 0 && dy <= 0) {
            setPx(buf, px, py, 250, 80, 135, 255);
          } else if (dist > 1.4) {
            setPx(buf, px, py, 155, 15, 55, 255);
          } else {
            setPx(buf, px, py, 215, 30, 85, 255);
          }
        }
      }
    }
    if (cy - 3 >= 0 && cx >= 0 && cx < 32) {
      setPx(buf, cx, cy - 3, 255, 215, 80, 255);
    }
  }

  drawTuna(5, 12);
  drawTuna(11, 8);
  drawTuna(26, 11);
  drawTuna(18, 1);

  return buf;
}

export function generateFloweringTorchCactus(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const cx = 15.5;

  for (let y = 10; y < 32; y++) {
    const taper = 0.85 + ((y - 10) / 22) * 0.15;
    const halfWidth = 5.2 * taper;

    for (let dx = -Math.ceil(halfWidth); dx <= Math.ceil(halfWidth); dx++) {
      const px = Math.round(cx + dx);
      if (px < 0 || px >= 32) continue;

      const normX = dx / halfWidth;
      if (Math.abs(normX) <= 1.0) {
        const rib = Math.sin(normX * Math.PI * 2.5);
        const cylinderShade = Math.sqrt(Math.max(0, 1.0 - normX * normX));
        const ribShade = rib * 0.28;
        const total = Math.max(0.3, Math.min(1.4, cylinderShade + ribShade));

        let r = Math.round(35 * total);
        let g = Math.round(135 * total);
        let b = Math.round(48 * total);

        if (rib > 0.4) {
          r = Math.min(255, r + 40);
          g = Math.min(255, g + 45);
          b = Math.min(255, b + 20);
        } else if (rib < -0.4) {
          r = Math.max(15, r - 20);
          g = Math.max(45, g - 40);
          b = Math.max(18, b - 20);
        }

        setPx(buf, px, y, r, g, b, 255);
      }
    }
  }

  for (let dy = -2; dy <= 0; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const px = Math.round(cx + dx);
      const py = 10 + dy;
      if (px >= 0 && px < 32 && py >= 0 && py < 32) {
        if ((dx * dx) / 16 + (dy * dy) / 4 <= 1.0) {
          setPx(buf, px, py, 60, 155, 65, 255);
        }
      }
    }
  }

  for (let y = 12; y < 31; y += 4) {
    const spineOffsets = [-4, -1, 2, 4];
    for (const off of spineOffsets) {
      const sx = Math.round(cx + off);
      if (sx >= 0 && sx < 32 && buf[(y * 32 + sx) * 4 + 3] > 0) {
        setPx(buf, sx, y, 250, 245, 215, 255);
        const dir = off < 0 ? -1 : 1;
        const tx = sx + dir;
        if (tx >= 0 && tx < 32) {
          setPx(buf, tx, y, 235, 225, 175, 255);
        }
      }
    }
  }

  const bloomCenter = { x: 15.5, y: 5.5 };

  for (let y = 7; y <= 10; y++) {
    const w = 1.5 + (10 - y) * 0.8;
    for (let dx = -w; dx <= w; dx++) {
      const px = Math.round(cx + dx);
      if (px >= 0 && px < 32) {
        setPx(buf, px, y, 205, 30, 60, 255);
      }
    }
  }

  for (let dy = -5; dy <= 3; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      const dist = Math.hypot(dx, dy * 1.3);
      const px = Math.round(bloomCenter.x + dx);
      const py = Math.round(bloomCenter.y + dy);
      if (px < 0 || px >= 32 || py < 0 || py >= 32) continue;

      if (dist <= 7.5) {
        const angle = Math.atan2(dy, dx);
        const petalRay = Math.sin(angle * 8);

        if (dist < 2.0) {
          setPx(buf, px, py, 255, 245, 120, 255);
        } else if (dist < 3.5) {
          setPx(buf, px, py, 255, 160, 30, 255);
        } else if (dist <= 6.2 || petalRay > 0.2) {
          if (dy < -2) {
            setPx(buf, px, py, 255, 75, 45, 255);
          } else {
            setPx(buf, px, py, 225, 25, 70, 255);
          }
        }
      }
    }
  }

  const stamens = [
    { dx: 0, dy: -2 }, { dx: -1, dy: -3 }, { dx: 1, dy: -3 },
    { dx: -2, dy: -1 }, { dx: 2, dy: -1 }
  ];
  for (const st of stamens) {
    const px = Math.round(bloomCenter.x + st.dx);
    const py = Math.round(bloomCenter.y + st.dy);
    if (px >= 0 && px < 32 && py >= 0 && py < 32) {
      setPx(buf, px, py, 255, 255, 190, 255);
    }
  }

  return buf;
}

// -------------------------------------------------------------
// 14. BOTANICAL CROSS-QUAD PLANTS
// -------------------------------------------------------------

export function generateFlowerCross(
  stemColor: [number, number, number],
  petalColor: [number, number, number],
  petalHighlight: [number, number, number],
  centerColor: [number, number, number],
  flowerRadius: number = 6,
  centerY: number = 10
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  // Sturdy vertical stem from bottom to center
  for (let y = centerY; y < 32; y++) {
    for (let x = 14; x <= 16; x++) {
      setPx(buf, x, y, stemColor[0], stemColor[1], stemColor[2], 255);
    }
  }

  // Leaves along stem
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -6; dx <= -1; dx++) {
      setPx(buf, 14 + dx, 22 + dy, stemColor[0] * 1.1, stemColor[1] * 1.1, stemColor[2] * 1.1, 255);
    }
    for (let dx = 1; dx <= 6; dx++) {
      setPx(buf, 16 + dx, 25 + dy, stemColor[0] * 1.1, stemColor[1] * 1.1, stemColor[2] * 1.1, 255);
    }
  }

  // Flower blossom
  const cx = 15.5;
  const cy = centerY;
  for (let dy = -flowerRadius - 1; dy <= flowerRadius + 1; dy++) {
    for (let dx = -flowerRadius - 1; dx <= flowerRadius + 1; dx++) {
      const dist = Math.hypot(dx, dy);
      const px = Math.round(cx + dx);
      const py = Math.round(cy + dy);
      if (px < 0 || px >= 32 || py < 0 || py >= 32) continue;

      if (dist < 2.5) {
        setPx(buf, px, py, centerColor[0], centerColor[1], centerColor[2], 255); // Core pistil/stamen
      } else if (dist <= flowerRadius) {
        if (dy < 0) {
          setPx(buf, px, py, petalHighlight[0], petalHighlight[1], petalHighlight[2], 255);
        } else {
          setPx(buf, px, py, petalColor[0], petalColor[1], petalColor[2], 255);
        }
      }
    }
  }

  return buf;
}

export function generateFern(
  stemDark: [number, number, number],
  frondMid: [number, number, number],
  frondLight: [number, number, number]
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  // Arching central rachis stem
  for (let y = 4; y < 32; y++) {
    setPx(buf, 15, y, stemDark[0], stemDark[1], stemDark[2], 255);
    setPx(buf, 16, y, stemDark[0], stemDark[1], stemDark[2], 255);
  }

  // Pinnate leaf fronds branching outwards in elegant arch
  for (let y = 6; y < 30; y += 2) {
    const maxWidth = Math.min(13, Math.round((32 - y) * 0.7));
    for (let dx = 1; dx <= maxWidth; dx++) {
      const isTip = dx === maxWidth;
      const c = isTip ? frondLight : frondMid;
      setPx(buf, 15 - dx, y - Math.round(dx * 0.25), c[0], c[1], c[2], 255);
      setPx(buf, 16 + dx, y - Math.round(dx * 0.25), c[0], c[1], c[2], 255);
    }
  }

  return buf;
}

export function generateLilypad(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const cx = 15.5;
  const cy = 15.5;

  // Circular pad with a radial notch cleft at angle 0
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Notch cut
      if (Math.abs(angle) < 0.22 && dist > 2) continue;

      if (dist <= 14) {
        if (dist >= 13) {
          setPx(buf, x, y, 32, 105, 38, 255);  // Leaf edge rim
        } else if (dist < 4) {
          setPx(buf, x, y, 245, 230, 140, 255); // Central flower bud
        } else {
          const vein = Math.sin(angle * 7);
          const g = 145 + Math.round(vein * 20);
          setPx(buf, x, y, 45, g, 42, 255);   // Emerald lilypad blade
        }
      }
    }
  }
  return buf;
}

export function generateMushroomCross(
  capColor: [number, number, number],
  spotColor?: [number, number, number]
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  // Pale stalk
  for (let y = 14; y < 32; y++) {
    for (let x = 13; x <= 18; x++) {
      const shadow = (x === 13 || x === 18) ? 0.8 : 1.0;
      setPx(buf, x, y, 220 * shadow, 212 * shadow, 195 * shadow, 255);
    }
  }

  // Domed cap
  for (let y = 4; y <= 16; y++) {
    const rx = Math.round(Math.sin(((y - 4) / 12) * Math.PI) * 11);
    for (let dx = -rx; dx <= rx; dx++) {
      const px = 15 + dx;
      const isSpot = spotColor && (hash(px, y, 17) > 0.72);
      if (isSpot) {
        setPx(buf, px, y, spotColor[0], spotColor[1], spotColor[2], 255);
      } else {
        const sh = y < 8 ? 1.15 : 0.85;
        setPx(buf, px, y, capColor[0] * sh, capColor[1] * sh, capColor[2] * sh, 255);
      }
    }
  }

  return buf;
}

// -------------------------------------------------------------
// 15. SPECIALIZED BLOCKS & REMAINING BOTANICALS
// -------------------------------------------------------------

export function generateGlowShroomBlock(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Deep midnight navy mycelium with luminous turquoise-cyan glowing bioluminescent pores
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const spot = Math.hypot((x % 8) - 4, (y % 8) - 4);
      if (spot < 2.0) {
        setPx(buf, x, y, 90, 240, 255, 255); // Glowing cyan bioluminescent center
      } else if (spot < 3.2) {
        setPx(buf, x, y, 20, 140, 190, 255); // Turquoise aura
      } else {
        const n = hash(x, y, 52);
        const b = 24 + Math.round(n * 14);
        setPx(buf, x, y, b - 8, b + 6, b + 24, 255); // Deep navy cap
      }
    }
  }
  return buf;
}

export function generateAmethystCluster(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Geometric crystalline violet geode clusters
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const crystal = Math.abs(Math.sin(x * 0.5 + y * 0.35) * Math.cos(x * 0.35 - y * 0.5));
      const isTip = (x % 7 === 3) && (y % 7 === 2);
      if (isTip) {
        setPx(buf, x, y, 245, 200, 255, 255); // Specular violet glint
      } else if (crystal > 0.65) {
        setPx(buf, x, y, 195, 105, 240, 255); // Vibrant magenta-violet facet
      } else if (crystal > 0.3) {
        setPx(buf, x, y, 135, 60, 185, 255);  // Deep royal amethyst
      } else {
        setPx(buf, x, y, 75, 30, 115, 255);   // Crystalline shadow cleft
      }
    }
  }
  return buf;
}

export function generateCrimsonTendril(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Sinuous deep-sea bioluminescent tendril
  for (let y = 0; y < 32; y++) {
    const cx = 15.5 + Math.sin(y * 0.25) * 5;
    for (let dx = -2; dx <= 2; dx++) {
      const px = Math.round(cx + dx);
      if (px >= 0 && px < 32) {
        const isNode = y % 7 === 0;
        if (isNode) {
          setPx(buf, px, y, 255, 80, 120, 255); // Glowing bioluminescent nodule
        } else {
          setPx(buf, px, y, 175, 20, 50, 255);  // Crimson fleshy frond
        }
      }
    }
  }
  return buf;
}

export function generateBloodKelp(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Ghostly pale stalk with glowing red vascular pods
  for (let y = 0; y < 32; y++) {
    const cx = 15.5 + Math.sin(y * 0.2) * 3;
    for (let dx = -2; dx <= 2; dx++) {
      const px = Math.round(cx + dx);
      if (px >= 0 && px < 32) {
        const isBloodPod = (y === 8 || y === 20) && Math.abs(dx) <= 2;
        if (isBloodPod) {
          setPx(buf, px, y, 240, 30, 40, 255); // Glowing blood sac
        } else {
          setPx(buf, px, y, 215, 225, 220, 220); // Translucent pale stalk
        }
      }
    }
  }
  return buf;
}

export function generatePalmLog(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  if (face === 'top') {
    // Tropical fibrous pith core
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dist = Math.hypot(x - 15.5, y - 15.5);
        if (dist > 13.5) {
          setPx(buf, x, y, 85, 60, 40, 255); // Bark edge
        } else {
          const speck = hash(x, y, 31);
          const f = 0.8 + speck * 0.4;
          setPx(buf, x, y, 190 * f, 160 * f, 110 * f, 255);
        }
      }
    }
  } else {
    // Horizontal overlapping leaf-scar plates
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const ring = y % 8;
        const grain = hash(x, y, 92);
        let r = 135; let g = 100; let b = 65;
        if (ring === 0) {
          r = 65; g = 45; b = 28; // Deep shadow under plate
        } else if (ring === 1) {
          r = 165; g = 130; b = 85; // Plate edge highlight
        }
        setPx(buf, x, y, r + (grain - 0.5) * 16, g + (grain - 0.5) * 14, b + (grain - 0.5) * 10, 255);
      }
    }
  }
  return buf;
}

export function generatePalmLeaves(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  // Generates a lush, thick tropical palm frond block with broad overlapping pinnate leaflets,
  // prominent fibrous frond stems, rich emerald-to-lime shading, and ~18% natural canopy gaps.
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      // 1. Primary and secondary arching frond stems (rachis)
      const stemDist1 = Math.abs(x - y);
      const stemDist2 = Math.abs(x + y - 31);
      const isStem1 = stemDist1 <= 1;
      const isStem2 = stemDist2 <= 1;

      // Leaflet angle coordinate along and across the fronds
      const leafletWave1 = Math.sin((x + y) * 0.95);
      const leafletWave2 = Math.sin((x - y) * 0.95);

      // Distance from the nearest frond axis
      const frondDist = Math.min(stemDist1, stemDist2);

      // 2. Natural canopy cutout gaps:
      // Keep ~82% solid foliage, only opening small natural slits between leaflet clusters
      const edgeCutout = (
        (frondDist > 10 && (x < 2 || x > 29 || y < 2 || y > 29)) ||
        (frondDist > 8 && ((x % 7 === 0 && y % 5 === 0) || (x % 5 === 0 && y % 7 === 0))) ||
        (frondDist > 9 && leafletWave1 > 0.70 && leafletWave2 > 0.70)
      );

      if (edgeCutout) {
        setPx(buf, x, y, 0, 0, 0, 0); // Natural tropical canopy slit
        continue;
      }

      // 3. Shading and detailing for thick, lush palm foliage
      if (isStem1 || isStem2) {
        // Frond central rachis / woody spine
        const stemGlint = (x + y) % 4 === 0;
        if (stemGlint) {
          setPx(buf, x, y, 138, 204, 68, 255); // Warm golden-lime stem glint
        } else {
          setPx(buf, x, y, 102, 172, 48, 255); // Fibrous tropical palm stem
        }
      } else {
        // Pinnate leaflet blades
        const leafletPos = (x + y) % 3; // 0: furrow shadow, 1: mid-blade, 2: sunlit crest
        const noiseVal = hash(x, y, 88);

        // Gradient from center spine to leaflet tips
        const tipProximity = frondDist / 10; // 0 at stem, 1 near tip

        if (leafletPos === 0 || (frondDist > 6 && noiseVal < 0.20)) {
          // Deep underside shadow between overlapping leaflet blades
          setPx(buf, x, y, 24, 72, 18, 255); // Deep jungle shadow
        } else if (leafletPos === 1) {
          if (tipProximity > 0.6) {
            setPx(buf, x, y, 58, 158, 42, 255); // Lush emerald
          } else {
            setPx(buf, x, y, 38, 114, 28, 255); // Rich forest green midtone
          }
        } else {
          // Sunlit leaflet crest & tip
          if (tipProximity > 0.65 || noiseVal > 0.75) {
            setPx(buf, x, y, 142, 226, 78, 255); // Golden-lime sunlit tip
          } else {
            setPx(buf, x, y, 88, 192, 56, 255);  // Vibrant sun-drenched palm blade
          }
        }
      }
    }
  }
  return buf;
}

export function generateEverfrostLog(face: 'top' | 'side'): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  if (face === 'top') {
    return generateLogTop([55, 68, 75], [195, 220, 230], [130, 155, 168], [95, 120, 130], 909);
  } else {
    // Frosted slate-blue bark with snow dust in furrows
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const furrow = Math.sin(x * 0.78 + hash(0, Math.floor(y / 4), 909) * 2);
        const grain = fbm(x * 2.2, y * 0.35, 3, 8, 909);
        const val = furrow * 0.4 + grain * 0.6;

        if (val < 0.22) {
          setPx(buf, x, y, 225, 245, 255, 255); // Snow dust trapped in furrow!
        } else if (val < 0.5) {
          setPx(buf, x, y, 55, 75, 88, 255);   // Slate-teal bark shadow
        } else if (val < 0.78) {
          setPx(buf, x, y, 85, 110, 125, 255); // Frosted timber midtone
        } else {
          setPx(buf, x, y, 140, 175, 195, 255); // Ice glaze highlight
        }
      }
    }
  }
  return buf;
}

export function generateIcicle(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Translucent hanging sharp stalactites
  const icicles = [
    { x: 7, len: 26 },
    { x: 15, len: 31 },
    { x: 23, len: 22 },
    { x: 29, len: 16 }
  ];

  for (const ic of icicles) {
    for (let y = 0; y <= ic.len; y++) {
      const taper = Math.max(0, Math.round((1 - y / ic.len) * 3));
      for (let dx = -taper; dx <= taper; dx++) {
        const px = ic.x + dx;
        if (px >= 0 && px < 32) {
          if (dx === 0 && y === ic.len) {
            setPx(buf, px, y, 255, 255, 255, 255); // Drip tip highlight
          } else if (dx <= 0) {
            setPx(buf, px, y, 200, 235, 255, 210); // Glacial refraction
          } else {
            setPx(buf, px, y, 110, 185, 235, 190); // Shadowed ice
          }
        }
      }
    }
  }
  return buf;
}

export function generateFrostLichen(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Spreading frost dendrites
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dendrite = fbm(x, y, 3, 5, 414);
      if (dendrite > 0.65) {
        setPx(buf, x, y, 245, 252, 255, 240); // White frost edge
      } else if (dendrite > 0.45) {
        setPx(buf, x, y, 160, 220, 245, 200); // Pale cyan lichen body
      } else {
        setPx(buf, x, y, 0, 0, 0, 0); // Cutout
      }
    }
  }
  return buf;
}

export function generateReed(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Wetland cattails with slender green stems and brown cylindrical seedheads
  const stalks = [9, 16, 23];
  for (const sx of stalks) {
    for (let y = 6; y < 32; y++) {
      if (y >= 8 && y <= 17) {
        // Brown cattail seedhead
        setPx(buf, sx - 1, y, 110, 65, 35, 255);
        setPx(buf, sx, y, 135, 82, 45, 255);
        setPx(buf, sx + 1, y, 85, 48, 25, 255);
      } else {
        // Slender reed stem
        setPx(buf, sx, y, 65, 145, 45, 255);
      }
    }
  }
  return buf;
}

export function generateSeaweed(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Wavy underwater kelp ribbons
  for (let y = 0; y < 32; y++) {
    const wave = Math.sin(y * 0.28) * 4;
    for (let dx = -2; dx <= 2; dx++) {
      const px = Math.round(15.5 + wave + dx);
      if (px >= 0 && px < 32) {
        if (dx === 2) {
          setPx(buf, px, y, 25, 75, 40, 230);
        } else if (dx === -2) {
          setPx(buf, px, y, 95, 195, 80, 240);
        } else {
          setPx(buf, px, y, 48, 145, 60, 235);
        }
      }
    }
  }
  return buf;
}

// -------------------------------------------------------------
// BUSH & SHRUB BLOCK GENERATION (Full 32x32 Voxel Cube Blocks)
// -------------------------------------------------------------

function stampBerry(
  buf: Uint8ClampedArray,
  cx: number,
  cy: number,
  mid: [number, number, number],
  hi: [number, number, number],
  sh: [number, number, number]
) {
  for (let dy = -1; dy <= 2; dy++) {
    for (let dx = -1; dx <= 2; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= 32 || py < 0 || py >= 32) continue;
      const dist = Math.hypot(dx - 0.5, dy - 0.5);
      if (dist <= 1.6) {
        if (dx <= 0 && dy <= 0) {
          setPx(buf, px, py, hi[0], hi[1], hi[2], 255); // Specular gleam
        } else if (dist > 1.1) {
          setPx(buf, px, py, sh[0], sh[1], sh[2], 255); // Sphere shadow
        } else {
          setPx(buf, px, py, mid[0], mid[1], mid[2], 255); // Berry flesh
        }
      }
    }
  }
}

function stampRose(buf: Uint8ClampedArray, cx: number, cy: number, radius: number) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= 32 || py < 0 || py >= 32) continue;
      const dist = Math.hypot(dx, dy);
      if (dist <= radius) {
        const angle = Math.atan2(dy, dx);
        const spiral = Math.sin(angle * 3 + dist * 1.5);
        if (dist < 1.2) {
          setPx(buf, px, py, 140, 10, 25, 255); // Dark velvety rose core
        } else if (spiral > 0.4 || dist === radius) {
          setPx(buf, px, py, 250, 75, 95, 255); // Bright crimson petal rim
        } else {
          setPx(buf, px, py, 205, 20, 45, 255); // Deep red velvety petal
        }
      }
    }
  }
}

function stampBlossom(
  buf: Uint8ClampedArray,
  cx: number,
  cy: number,
  petal: [number, number, number],
  hi: [number, number, number],
  center: [number, number, number]
) {
  const petals = [
    [0, 0], [0, -2], [0, 2], [-2, 0], [2, 0],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ];
  for (const [dx, dy] of petals) {
    const px = cx + dx;
    const py = cy + dy;
    if (px >= 0 && px < 32 && py >= 0 && py < 32) {
      if (dx === 0 && dy === 0) {
        setPx(buf, px, py, center[0], center[1], center[2], 255);
      } else if (dy < 0) {
        setPx(buf, px, py, hi[0], hi[1], hi[2], 255);
      } else {
        setPx(buf, px, py, petal[0], petal[1], petal[2], 255);
      }
    }
  }
}

function stampThorn(buf: Uint8ClampedArray, x: number, y: number, dx: number, dy: number) {
  if (x >= 0 && x < 32 && y >= 0 && y < 32) {
    setPx(buf, x, y, 115, 88, 55, 255); // Thorn base
  }
  const tx = x + dx;
  const ty = y + dy;
  if (tx >= 0 && tx < 32 && ty >= 0 && ty < 32) {
    setPx(buf, tx, ty, 230, 215, 175, 255); // Sharp pale thorn tip
  }
}

export type BushType =
  | 'berry'
  | 'thorn'
  | 'verdant'
  | 'golden_bloom'
  | 'rosebush'
  | 'withered'
  | 'ashen'
  | 'sickly_briar'
  | 'arctic_fruit'
  | 'liana_bush';

export function generateBushBlock(type: BushType): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  // Palette configuration based on bush archetype
  let leafShadow: [number, number, number];
  let leafDark: [number, number, number];
  let leafMid: [number, number, number];
  let leafLight: [number, number, number];
  let twigColor: [number, number, number] = [88, 58, 35];
  let seed = 101;

  switch (type) {
    case 'berry':
      leafShadow = [18, 55, 22];
      leafDark = [32, 92, 38];
      leafMid = [52, 142, 58];
      leafLight = [95, 195, 78];
      seed = 202;
      break;
    case 'thorn':
      leafShadow = [35, 42, 28];
      leafDark = [58, 68, 42];
      leafMid = [85, 98, 62];
      leafLight = [125, 138, 92];
      twigColor = [95, 72, 48];
      seed = 303;
      break;
    case 'verdant':
      leafShadow = [15, 62, 25];
      leafDark = [28, 115, 45];
      leafMid = [48, 168, 65];
      leafLight = [92, 215, 88];
      seed = 404;
      break;
    case 'golden_bloom':
      leafShadow = [22, 60, 24];
      leafDark = [38, 105, 42];
      leafMid = [62, 155, 58];
      leafLight = [105, 205, 82];
      seed = 505;
      break;
    case 'rosebush':
      leafShadow = [12, 48, 20];
      leafDark = [22, 85, 35];
      leafMid = [42, 135, 52];
      leafLight = [78, 185, 68];
      twigColor = [75, 45, 28];
      seed = 606;
      break;
    case 'withered':
      leafShadow = [25, 22, 20];
      leafDark = [45, 40, 36];
      leafMid = [72, 64, 58];
      leafLight = [105, 95, 85];
      twigColor = [55, 48, 42];
      seed = 707;
      break;
    case 'ashen':
      leafShadow = [48, 48, 52];
      leafDark = [82, 85, 90];
      leafMid = [125, 128, 135];
      leafLight = [172, 175, 182];
      twigColor = [72, 75, 80];
      seed = 808;
      break;
    case 'sickly_briar':
      leafShadow = [32, 22, 38];
      leafDark = [58, 42, 68];
      leafMid = [92, 70, 105];
      leafLight = [135, 108, 148];
      twigColor = [62, 45, 60];
      seed = 909;
      break;
    case 'arctic_fruit':
      leafShadow = [15, 52, 68];
      leafDark = [28, 92, 115];
      leafMid = [48, 142, 165];
      leafLight = [85, 195, 215];
      twigColor = [45, 68, 82];
      seed = 1010;
      break;
    case 'liana_bush':
      leafShadow = [18, 50, 20];
      leafDark = [32, 95, 38];
      leafMid = [55, 148, 52];
      leafLight = [102, 198, 75];
      twigColor = [95, 55, 30];
      seed = 1111;
      break;
  }

  // 1. Generate full 32x32 interwoven foliage canopy
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = fbm(x, y, 3, 5, seed);
      const micro = hash(x, y, seed + 1);

      // Sparse natural leaf perforation (small see-through gaps between leaf clusters, like oak leaves)
      const isPerforation = (n < 0.16) && (micro < 0.6);
      if (isPerforation) {
        setPx(buf, x, y, 0, 0, 0, 0);
        continue;
      }

      // Shading based on clustered leaf lobes
      if (n > 0.72) {
        setPx(buf, x, y, leafLight[0], leafLight[1], leafLight[2], 255);
      } else if (n > 0.44) {
        setPx(buf, x, y, leafMid[0], leafMid[1], leafMid[2], 255);
      } else if (n > 0.26) {
        setPx(buf, x, y, leafDark[0], leafDark[1], leafDark[2], 255);
      } else {
        setPx(buf, x, y, leafShadow[0], leafShadow[1], leafShadow[2], 255);
      }
    }
  }

  // 2. Weave woody branches & thorny twigs across the bush block
  const twigs: Array<{ x0: number; y0: number; x1: number; y1: number }> = [
    { x0: 16, y0: 31, x1: 14, y1: 18 },
    { x0: 14, y0: 18, x1: 7, y1: 10 },
    { x0: 14, y0: 18, x1: 24, y1: 9 },
    { x0: 7, y0: 10, x1: 3, y1: 4 },
    { x0: 24, y0: 9, x1: 28, y1: 3 },
    { x0: 16, y0: 22, x1: 25, y1: 20 },
    { x0: 14, y0: 25, x1: 6, y1: 23 }
  ];

  for (const t of twigs) {
    const steps = Math.max(Math.abs(t.x1 - t.x0), Math.abs(t.y1 - t.y0));
    for (let s = 0; s <= steps; s++) {
      const px = Math.round(t.x0 + (t.x1 - t.x0) * (s / steps));
      const py = Math.round(t.y0 + (t.y1 - t.y0) * (s / steps));
      if (px >= 0 && px < 32 && py >= 0 && py < 32) {
        const barkShade = (s % 2 === 0) ? 1.1 : 0.9;
        setPx(
          buf, px, py,
          Math.min(255, Math.round(twigColor[0] * barkShade)),
          Math.min(255, Math.round(twigColor[1] * barkShade)),
          Math.min(255, Math.round(twigColor[2] * barkShade)),
          255
        );
      }
    }
  }

  // 3. Stamp archetype features (berries, roses, thorns, blossoms, arctic fruits, etc.)
  if (type === 'berry') {
    const berrySpots = [
      { x: 8, y: 12 }, { x: 10, y: 14 }, { x: 7, y: 15 },
      { x: 22, y: 8 }, { x: 24, y: 10 },
      { x: 18, y: 22 }, { x: 20, y: 24 }, { x: 17, y: 25 },
      { x: 6, y: 26 }, { x: 26, y: 19 }, { x: 13, y: 6 }
    ];
    for (const b of berrySpots) {
      stampBerry(buf, b.x, b.y, [235, 32, 45], [255, 110, 120], [145, 15, 25]);
    }
  } else if (type === 'rosebush') {
    const roseSpots = [
      { x: 9, y: 10, r: 4 },
      { x: 22, y: 14, r: 4 },
      { x: 13, y: 24, r: 3 },
      { x: 25, y: 25, r: 3 },
      { x: 6, y: 21, r: 2 }
    ];
    for (const r of roseSpots) {
      stampRose(buf, r.x, r.y, r.r);
    }
  } else if (type === 'golden_bloom') {
    const bloomSpots = [
      { x: 8, y: 8 }, { x: 22, y: 11 }, { x: 15, y: 17 },
      { x: 7, y: 23 }, { x: 24, y: 22 }, { x: 18, y: 7 },
      { x: 27, y: 5 }, { x: 12, y: 28 }
    ];
    for (const bl of bloomSpots) {
      stampBlossom(buf, bl.x, bl.y, [255, 215, 25], [255, 245, 130], [210, 120, 15]);
    }
  } else if (type === 'thorn') {
    const thornTips = [
      { x: 8, y: 8, dx: -2, dy: -2 },
      { x: 25, y: 7, dx: 2, dy: -2 },
      { x: 12, y: 19, dx: -2, dy: 1 },
      { x: 21, y: 21, dx: 2, dy: 1 },
      { x: 5, y: 22, dx: -2, dy: -1 },
      { x: 27, y: 18, dx: 2, dy: -1 }
    ];
    for (const th of thornTips) {
      stampThorn(buf, th.x, th.y, th.dx, th.dy);
    }
  } else if (type === 'arctic_fruit') {
    const arcticBerries = [
      { x: 9, y: 11 }, { x: 11, y: 13 },
      { x: 21, y: 9 }, { x: 23, y: 11 },
      { x: 15, y: 22 }, { x: 17, y: 24 },
      { x: 25, y: 23 }, { x: 7, y: 25 }
    ];
    for (const ab of arcticBerries) {
      stampBerry(buf, ab.x, ab.y, [48, 205, 255], [215, 250, 255], [15, 115, 175]);
    }
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (hash(x, y, 777) > 0.94 && buf[(y * 32 + x) * 4 + 3] > 0) {
          setPx(buf, x, y, 225, 248, 255, 255);
        }
      }
    }
  } else if (type === 'liana_bush') {
    const rfBerries = [
      { x: 10, y: 14 }, { x: 22, y: 9 }, { x: 16, y: 24 }, { x: 26, y: 21 }
    ];
    for (const rfb of rfBerries) {
      stampBerry(buf, rfb.x, rfb.y, [245, 125, 25], [255, 200, 75], [180, 65, 10]);
    }
    for (let y = 6; y < 28; y++) {
      const vx = Math.round(15.5 + Math.sin(y * 0.4) * 4);
      setPx(buf, vx, y, 85, 125, 45, 255);
      setPx(buf, vx + 1, y, 115, 165, 55, 255);
    }
  }

  return buf;
}

export function generateBush(leafColor: [number, number, number], berryColor?: [number, number, number]): Uint8ClampedArray {
  // Backwards-compatible redirect to full 32x32 bush block
  if (berryColor && berryColor[0] > 200) {
    return generateBushBlock('berry');
  }
  return generateBushBlock('verdant');
}

export function generateFloraBlock(id: BlockType): Uint8ClampedArray {
  switch (id) {
    case BlockType.JADELEAF_FERN:
      return generateFern([20, 75, 30], [45, 155, 60], [105, 215, 110]);
    case BlockType.GIANT_FERN:
      return generateFern([16, 58, 22], [35, 125, 45], [82, 185, 92]);
    case BlockType.FROST_FERN:
      return generateFern([25, 75, 95], [65, 155, 185], [165, 230, 255]);
    case BlockType.SUNFLOWER:
      return generateFlowerCross([45, 125, 35], [245, 185, 20], [255, 225, 80], [85, 48, 20], 8, 9);
    case BlockType.ROSEBUSH:
      return generateBushBlock('rosebush');
    case BlockType.ORO_FLOWER:
      return generateFlowerCross([45, 125, 35], [255, 140, 15], [255, 195, 50], [255, 245, 120], 6, 11);
    case BlockType.BELL_LILY:
      return generateFlowerCross([40, 115, 35], [215, 65, 160], [250, 125, 210], [255, 240, 160], 5, 10);
    case BlockType.CYRO_LILY:
      return generateFlowerCross([35, 110, 75], [65, 185, 235], [165, 235, 255], [240, 255, 255], 5, 10);
    case BlockType.SNOWDROP:
      return generateFlowerCross([40, 110, 55], [235, 245, 255], [255, 255, 255], [180, 235, 200], 4, 8);
    case BlockType.PALE_GHOST_FLOWER:
      return generateFlowerCross([45, 55, 75], [175, 195, 235], [225, 235, 255], [255, 255, 255], 5, 10);
    case BlockType.ORCHID:
      return generateFlowerCross([35, 105, 40], [235, 85, 180], [255, 155, 220], [255, 235, 95], 6, 10);
    case BlockType.HELICONIA:
      return generateFlowerCross([30, 95, 35], [240, 45, 30], [255, 200, 30], [255, 240, 50], 7, 10);
    case BlockType.PITCHER_PLANT:
      return generateFlowerCross([35, 105, 40], [165, 35, 45], [205, 180, 55], [85, 20, 25], 6, 14);
    case BlockType.WINTERCREST:
      return generateFlowerCross([35, 85, 95], [195, 175, 245], [235, 225, 255], [255, 245, 160], 5, 10);
    case BlockType.LILYPAD:
      return generateLilypad();
    case BlockType.WATER_REED:
    case BlockType.MARSHROOT:
      return generateReed();
    case BlockType.DRIED_SEAWEED:
    case BlockType.SMALL_KELP:
    case BlockType.SEAGRASS:
    case BlockType.WATER_ALGAE:
    case BlockType.TALL_KELP:
      return generateSeaweed();
    case BlockType.BERRY_BUSH:
      return generateBushBlock('berry');
    case BlockType.THORN_BUSH:
      return generateBushBlock('thorn');
    case BlockType.VERDANT_SHRUB:
      return generateBushBlock('verdant');
    case BlockType.GOLDEN_BLOOM_BUSH:
      return generateBushBlock('golden_bloom');
    case BlockType.WITHERED_SHRUB:
      return generateBushBlock('withered');
    case BlockType.ASHEN_BRUSH:
      return generateBushBlock('ashen');
    case BlockType.SICKLY_BRIAR:
      return generateBushBlock('sickly_briar');
    case BlockType.ARCTIC_FRUIT:
      return generateBushBlock('arctic_fruit');
    case BlockType.LIANA_BUSH:
      return generateBushBlock('liana_bush');
    case BlockType.DEATH_CAP_MUSHROOM:
      return generateMushroomCross([55, 42, 65], [235, 215, 255]);
    case BlockType.JUNGLE_MUSHROOM:
      return generateMushroomCross([205, 65, 30], [255, 225, 110]);
    case BlockType.ICICLE:
      return generateIcicle();
    case BlockType.FROST_LICHEN:
      return generateFrostLichen();
    case BlockType.VINE:
      return generateVine();
    case BlockType.CRIMSON_TENDRIL:
      return generateCrimsonTendril();
    case BlockType.BLOOD_KELP:
      return generateBloodKelp();
    case BlockType.BARREL_CACTUS:
      return generateBarrelCactus();
    case BlockType.PRICKLY_PEAR:
      return generatePricklyPear();
    case BlockType.FLOWERING_TORCH_CACTUS:
      return generateFloweringTorchCactus();
    default:
      return generateBushBlock('verdant');
  }
}

export function generatePlanks32(
  base: [number, number, number],
  seed: number = 42
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const [br, bg, bb] = base;

  for (let y = 0; y < 32; y++) {
    const plankIdx = Math.floor(y / 8);
    const inPlankY = y % 8;
    const isHorizontalBorder = inPlankY === 0;
    const isHighlight = inPlankY === 1;

    // Staggered vertical seams
    const seamX = (plankIdx * 11 + 7) % 28 + 2;

    for (let x = 0; x < 32; x++) {
      const isVerticalSeam = x === seamX;
      const grain = (smoothNoise(x * 1.5, y * 0.4, 6, seed + plankIdx * 19) - 0.5) * 28;
      const plankTint = ((plankIdx % 2 === 0 ? 1 : -1) * 6);

      let r = br + grain + plankTint;
      let g = bg + grain + plankTint;
      let b = bb + grain + plankTint;

      if (isHorizontalBorder || isVerticalSeam) {
        r *= 0.62;
        g *= 0.62;
        b *= 0.62;
      } else if (isHighlight) {
        r = Math.min(255, r * 1.15);
        g = Math.min(255, g * 1.15);
        b = Math.min(255, b * 1.15);
      }

      // Nails near seams
      if ((x === seamX - 2 || x === seamX + 2) && (inPlankY === 2 || inPlankY === 6)) {
        r *= 0.45;
        g *= 0.45;
        b *= 0.45;
      }

      setPx(buf, x, y, r, g, b, 255);
    }
  }
  return buf;
}

export function generateToolCrafterTop32(): Uint8ClampedArray {
  const buf = generatePlanks32([145, 110, 75], 88);

  // Metal corner brackets (4 corners)
  const drawCorner = (startX: number, startY: number, dx: number, dy: number) => {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        if (i < 3 || j < 3) {
          const x = startX + i * dx;
          const y = startY + j * dy;
          setPx(buf, x, y, 70, 75, 85, 255);
        }
      }
    }
    // Brass rivets
    setPx(buf, startX + 1 * dx, startY + 1 * dy, 200, 180, 100, 255);
  };

  drawCorner(0, 0, 1, 1);
  drawCorner(31, 0, -1, 1);
  drawCorner(0, 31, 1, -1);
  drawCorner(31, 31, -1, -1);

  // Crossed tools (hammer and pickaxe silhouette) in center
  for (let d = -6; d <= 6; d++) {
    const cx = 16 + d;
    const cy1 = 16 + d;
    const cy2 = 16 - d;
    setPx(buf, cx, cy1, 45, 48, 55, 255);
    setPx(buf, cx, cy2, 45, 48, 55, 255);
  }
  // Hammer head
  for (let hx = 20; hx <= 24; hx++) {
    for (let hy = 8; hy <= 12; hy++) {
      setPx(buf, hx, hy, 180, 185, 195, 255);
    }
  }
  // Pickaxe head
  setPx(buf, 8, 8, 175, 180, 190, 255);
  setPx(buf, 9, 7, 185, 190, 200, 255);
  setPx(buf, 10, 8, 175, 180, 190, 255);

  return buf;
}

export function generateToolCrafterSide32(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  for (let y = 0; y < 32; y++) {
    const isMetalBand = (y >= 4 && y <= 7) || (y >= 24 && y <= 27);
    const isBandHighlight = y === 4 || y === 24;
    const isBandShadow = y === 7 || y === 27;

    for (let x = 0; x < 32; x++) {
      if (isMetalBand) {
        let r = 85;
        let g = 90;
        let b = 100;
        if (isBandHighlight) {
          r = 135; g = 140; b = 150;
        } else if (isBandShadow) {
          r = 50; g = 55; b = 60;
        }
        // Rivets every 6 pixels
        if ((x % 6 === 2) && (y === 5 || y === 6 || y === 25 || y === 26)) {
          r = 210; g = 190; b = 120; // brass rivet
        }
        setPx(buf, x, y, r, g, b, 255);
      } else {
        // Vertical wood planks
        const plankX = Math.floor(x / 8);
        const inPlankX = x % 8;
        const isSeam = inPlankX === 0;
        const grain = (smoothNoise(x * 0.4, y * 1.5, 6, 92 + plankX * 13) - 0.5) * 24;
        let r = 130 + grain;
        let g = 95 + grain;
        let b = 65 + grain;
        if (isSeam) {
          r *= 0.6; g *= 0.6; b *= 0.6;
        }
        setPx(buf, x, y, r, g, b, 255);
      }
    }
  }
  return buf;
}

export function generateTinOre32(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);

  // Stone base
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = (smoothNoise(x, y, 4, 331) - 0.5) * 36;
      setPx(buf, x, y, 120 + n, 120 + n, 122 + n, 255);
    }
  }

  // Tin flecks (silvery bluish metallic crystals)
  const oreSpots = [
    { cx: 8, cy: 9, r: 4 },
    { cx: 22, cy: 12, r: 5 },
    { cx: 14, cy: 23, r: 4 },
    { cx: 25, cy: 26, r: 3 }
  ];

  for (const spot of oreSpots) {
    for (let dy = -spot.r; dy <= spot.r; dy++) {
      for (let dx = -spot.r; dx <= spot.r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= spot.r) {
          const px = spot.cx + dx;
          const py = spot.cy + dy;
          const shiny = (dx + dy) < 0;
          let r = shiny ? 210 : 160;
          let g = shiny ? 225 : 175;
          let b = shiny ? 235 : 185;
          setPx(buf, px, py, r, g, b, 255);
        }
      }
    }
  }

  return buf;
}



