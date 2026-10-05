import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function makeCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  return table;
}
const crcTable = makeCRC32Table();
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.slice(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}
function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);
  const raw = Buffer.alloc(height * (1 + width * 4));
  let srcPos = 0, dstPos = 0;
  for (let y = 0; y < height; y++) {
    raw[dstPos++] = 0;
    rgbaBuffer.copy(raw, dstPos, srcPos, srcPos + width * 4);
    dstPos += width * 4;
    srcPos += width * 4;
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function hexToRgba(hex) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

class PixelCanvas {
  constructor(w = 32, h = 32) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 4, 0);
  }
  set(x, y, hex) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h || !hex) return;
    const rgba = hexToRgba(hex);
    const idx = (y * this.w + x) * 4;
    this.buf[idx] = rgba[0];
    this.buf[idx + 1] = rgba[1];
    this.buf[idx + 2] = rgba[2];
    this.buf[idx + 3] = rgba[3];
  }
  toPNG() {
    return encodePNG(this.w, this.h, this.buf);
  }
}

const woodHandle = '#663931';
const darkHandle = '#45283c';

/**
 * Creates an upright, vertical tool sprite representing a Hoe.
 * Matches WoodenAxe, StoneAxe, IronPickaxe, etc.:
 * - Straight vertical wooden handle at x=15..16 down to y=28
 * - Handle accents at x=14, 17, and cap at y=9
 * - Upright Hoe Head mounted across the top with a curved neck and downward blade
 */
function createHoeTool(palette) {
  const cv = new PixelCanvas(32, 32);

  // 1. Vertical Wooden Handle (Columns 15 & 16)
  for (let y = 15; y <= 28; y++) {
    cv.set(15, y, woodHandle);
    cv.set(16, y, woodHandle);
  }
  // Bottom handle cap
  cv.set(15, 29, darkHandle);
  cv.set(16, 29, darkHandle);

  // Handle shaft through head
  for (let y = 10; y <= 13; y++) {
    cv.set(15, y, woodHandle);
    cv.set(16, y, woodHandle);
  }
  // Top tip of shaft protruding through eye
  cv.set(15, 9, darkHandle);
  cv.set(16, 9, darkHandle);

  // Collar accents on shaft
  cv.set(14, 10, darkHandle);
  cv.set(17, 10, darkHandle);
  cv.set(14, 14, darkHandle);
  cv.set(17, 14, darkHandle);

  // 2. Hoe Head Mount & Blade
  const O = palette.outline;
  const B = palette.body;
  const H = palette.highlight;
  const S = palette.specular || palette.highlight;

  // Row 10: Top cross-bar / neck
  // Left back-spur:
  cv.set(12, 10, O);
  cv.set(13, 10, H);
  cv.set(14, 10, B);
  // Forward neck (right):
  cv.set(17, 10, O);
  cv.set(18, 10, H);
  cv.set(19, 10, H);
  cv.set(20, 10, H);
  cv.set(21, 10, O);

  // Row 11: Cross-bar main body
  // Left back-spur:
  cv.set(12, 11, O);
  cv.set(13, 11, B);
  cv.set(14, 11, O);
  // Forward neck & curved shoulder:
  cv.set(17, 11, B);
  cv.set(18, 11, B);
  cv.set(19, 11, B);
  cv.set(20, 11, H);
  cv.set(21, 11, O);

  // Row 12: Curve downward into blade
  cv.set(18, 12, O);
  cv.set(19, 12, B);
  cv.set(20, 12, H);
  cv.set(21, 12, O);

  // Row 13: Downward blade body
  cv.set(18, 13, O);
  cv.set(19, 13, B);
  cv.set(20, 13, H);
  cv.set(21, 13, O);

  // Row 14: Downward blade body
  cv.set(18, 14, O);
  cv.set(19, 14, B);
  cv.set(20, 14, H);
  cv.set(21, 14, O);

  // Row 15: Downward blade body
  cv.set(18, 15, O);
  cv.set(19, 15, B);
  cv.set(20, 15, H);
  cv.set(21, 15, O);

  // Row 16: Blade flares for cutting width
  cv.set(18, 16, O);
  cv.set(19, 16, B);
  cv.set(20, 16, H);
  cv.set(21, 16, H);
  cv.set(22, 16, O);

  // Row 17: Sharpened cutting edge bevel
  cv.set(18, 17, O);
  cv.set(19, 17, S);
  cv.set(20, 17, S);
  cv.set(21, 17, S);
  cv.set(22, 17, O);

  // Row 18: Blade bottom bevel outline
  cv.set(19, 18, O);
  cv.set(20, 18, O);
  cv.set(21, 18, O);
  cv.set(22, 18, O);

  return cv;
}

/**
 * Creates the standalone forged/knapped tool head for hoes.
 * Matches StoneAxeHead, IronAxeHead, StonePickaxeHead:
 * - Crisp dark silhouette outline
 * - Shaded layered interior
 * - Sized for knapping / forging workbench display and crafting
 */
function createHoeHead(headPalette) {
  const cv = new PixelCanvas(32, 32);

  const BDR = headPalette.border;
  const DRK = headPalette.dark;
  const MID = headPalette.mid;
  const LIT = headPalette.light;
  const HIG = headPalette.highlight;

  // Row 8: Top border of cross-neck
  for (let x = 11; x <= 20; x++) cv.set(x, 8, BDR);

  // Row 9: Upper cross-bar
  cv.set(9, 9, BDR);
  cv.set(10, 9, BDR);
  for (let x = 11; x <= 20; x++) cv.set(x, 9, HIG);
  cv.set(21, 9, BDR);
  cv.set(22, 9, BDR);

  // Row 10: Mid cross-bar with socket eye outline
  cv.set(8, 10, BDR);
  for (let x = 9; x <= 13; x++) cv.set(x, 10, LIT);
  // Socket eye opening (handle hole)
  cv.set(14, 10, BDR);
  cv.set(15, 10, DRK);
  cv.set(16, 10, DRK);
  cv.set(17, 10, BDR);
  for (let x = 18; x <= 21; x++) cv.set(x, 10, LIT);
  cv.set(22, 10, HIG);
  cv.set(23, 10, BDR);

  // Row 11: Lower cross-bar
  cv.set(8, 11, BDR);
  for (let x = 9; x <= 13; x++) cv.set(x, 11, MID);
  cv.set(14, 11, BDR);
  cv.set(15, 11, DRK);
  cv.set(16, 11, DRK);
  cv.set(17, 11, BDR);
  for (let x = 18; x <= 21; x++) cv.set(x, 11, MID);
  cv.set(22, 11, LIT);
  cv.set(23, 11, BDR);

  // Row 12: Bottom border of rear spur, curve of neck turning down
  for (let x = 8; x <= 14; x++) cv.set(x, 12, BDR);
  cv.set(17, 12, BDR);
  cv.set(18, 12, DRK);
  cv.set(19, 12, MID);
  cv.set(20, 12, LIT);
  cv.set(21, 12, LIT);
  cv.set(22, 12, HIG);
  cv.set(23, 12, BDR);

  // Row 13: Downward blade shaft
  cv.set(18, 13, BDR);
  cv.set(19, 13, DRK);
  cv.set(20, 13, MID);
  cv.set(21, 13, LIT);
  cv.set(22, 13, HIG);
  cv.set(23, 13, BDR);

  // Row 14
  cv.set(18, 14, BDR);
  cv.set(19, 14, DRK);
  cv.set(20, 14, MID);
  cv.set(21, 14, LIT);
  cv.set(22, 14, HIG);
  cv.set(23, 14, BDR);

  // Row 15
  cv.set(18, 15, BDR);
  cv.set(19, 15, DRK);
  cv.set(20, 15, MID);
  cv.set(21, 15, LIT);
  cv.set(22, 15, HIG);
  cv.set(23, 15, BDR);

  // Row 16
  cv.set(18, 16, BDR);
  cv.set(19, 16, DRK);
  cv.set(20, 16, MID);
  cv.set(21, 16, LIT);
  cv.set(22, 16, HIG);
  cv.set(23, 16, BDR);

  // Row 17
  cv.set(18, 17, BDR);
  cv.set(19, 17, DRK);
  cv.set(20, 17, MID);
  cv.set(21, 17, LIT);
  cv.set(22, 17, HIG);
  cv.set(23, 17, BDR);

  // Row 18: Blade widens slightly towards cutting bevel
  cv.set(17, 18, BDR);
  cv.set(18, 18, DRK);
  cv.set(19, 18, DRK);
  cv.set(20, 18, MID);
  cv.set(21, 18, LIT);
  cv.set(22, 18, HIG);
  cv.set(23, 18, BDR);

  // Row 19: Blade flare
  cv.set(17, 19, BDR);
  cv.set(18, 19, DRK);
  cv.set(19, 19, MID);
  cv.set(20, 19, MID);
  cv.set(21, 19, LIT);
  cv.set(22, 19, HIG);
  cv.set(23, 19, BDR);

  // Row 20: Cutting edge zone
  cv.set(17, 20, BDR);
  cv.set(18, 20, MID);
  cv.set(19, 20, LIT);
  cv.set(20, 20, HIG);
  cv.set(21, 20, HIG);
  cv.set(22, 20, HIG);
  cv.set(23, 20, BDR);

  // Row 21: Sharpened edge
  cv.set(17, 21, BDR);
  cv.set(18, 21, HIG);
  cv.set(19, 21, HIG);
  cv.set(20, 21, HIG);
  cv.set(21, 21, HIG);
  cv.set(22, 21, HIG);
  cv.set(23, 21, BDR);

  // Row 22: Bottom edge border
  for (let x = 17; x <= 23; x++) cv.set(x, 22, BDR);

  return cv;
}

// -------------------------------------------------------------
// Material Palettes
// -------------------------------------------------------------

// Tool Palettes (for full tool sprites: handle + head)
const TOOL_PALETTES = {
  Wooden: {
    outline: '#45283c',
    body: '#663931',
    highlight: '#8f563b',
    specular: '#8f563b'
  },
  Stone: {
    outline: '#595652',
    body: '#696a6a',
    highlight: '#696a6a',
    specular: '#696a6a'
  },
  Tin: {
    outline: '#897466',
    body: '#da8b55',
    highlight: '#da8b55',
    specular: '#ffffff'
  },
  Iron: {
    outline: '#b5b5b5',
    body: '#ffffff',
    highlight: '#ffffff',
    specular: '#ffffff'
  },
  Gold: {
    outline: '#fbf236',
    body: '#e3e1aa',
    highlight: '#e3e1aa',
    specular: '#ffffff'
  },
  Ice: {
    outline: '#3f3f74',
    body: '#ffd7c3',
    highlight: '#ffffff',
    specular: '#ffffff'
  },
  CrystalizedCoral: {
    outline: '#ac3232',
    body: '#76428a',
    highlight: '#ac328a',
    specular: '#ffb4cd'
  },
  Abbysal: {
    outline: '#000000',
    body: '#000000',
    highlight: '#ac3232',
    specular: '#f02d41'
  }
};

// Tool Head Palettes (for standalone forged/knapped head sprites)
const HEAD_PALETTES = {
  Stone: {
    border: '#1c1917',
    dark: '#44403c',
    mid: '#78716c',
    light: '#a8a29e',
    highlight: '#d6d3d1'
  },
  Tin: {
    border: '#0c4a6e',
    dark: '#0369a1',
    mid: '#38bdf8',
    light: '#bae6fd',
    highlight: '#f0f9ff'
  },
  Iron: {
    border: '#0f172a',
    dark: '#334155',
    mid: '#64748b',
    light: '#94a3b8',
    highlight: '#e2e8f0'
  },
  Gold: {
    border: '#713f12',
    dark: '#a16207',
    mid: '#eab308',
    light: '#facc15',
    highlight: '#fef08a'
  },
  Ice: {
    border: '#1e3a8a',
    dark: '#0284c7',
    mid: '#38bdf8',
    light: '#bae6fd',
    highlight: '#e0f2fe'
  },
  CrystalizedCoral: {
    border: '#831843',
    dark: '#be185d',
    mid: '#f43f5e',
    light: '#ec4899',
    highlight: '#fbcfe8'
  },
  Abbysal: {
    border: '#18181b',
    dark: '#374151',
    mid: '#7c3aed',
    light: '#c084fc',
    highlight: '#f02d41'
  }
};

// Output directories
const dirs = ['./public/ItemSprites', './ItemSprites'];
dirs.forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function savePNG(filename, pngBuffer) {
  for (const d of dirs) {
    const fullPath = path.join(d, filename);
    fs.writeFileSync(fullPath, pngBuffer);
    console.log(`Saved ${fullPath} (${pngBuffer.length} bytes)`);
  }
}

// Generate Hoes
console.log('--- Generating Hoe Tools ---');
for (const [mat, pal] of Object.entries(TOOL_PALETTES)) {
  const cv = createHoeTool(pal);
  const buf = cv.toPNG();
  savePNG(`${mat}Hoe.png`, buf);
  if (mat === 'Gold') {
    // Also save GoldenHoe.png for consistency with GoldenAxe
    savePNG('GoldenHoe.png', buf);
  }
}

// Generate Hoe Heads
console.log('--- Generating Hoe Heads ---');
for (const [mat, pal] of Object.entries(HEAD_PALETTES)) {
  const cv = createHoeHead(pal);
  const buf = cv.toPNG();
  savePNG(`${mat}HoeHead.png`, buf);
}

console.log('All hoes and hoe heads retextured successfully!');
