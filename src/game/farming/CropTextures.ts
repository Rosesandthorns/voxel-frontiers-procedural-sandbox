import { BlockType } from '../../types';
import { CROP_CONFIGS, CropConfig } from './CropTypes';
import { CROP_BLOCK_IDS, CROP_BLOCK_BUNDLES } from './CropBlocks';

// Fast color manipulation helpers
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const bigint = parseInt(c, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function setPx(buf: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number, a: number = 255) {
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return;
  const idx = (y * 32 + x) * 4;
  buf[idx] = Math.max(0, Math.min(255, Math.round(r)));
  buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
  buf[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
  buf[idx + 3] = Math.max(0, Math.min(255, Math.round(a)));
}

function drawCircle(buf: Uint8ClampedArray, cx: number, cy: number, radius: number, r: number, g: number, b: number) {
  const rSq = radius * radius;
  for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      const dSq = dx * dx + dy * dy;
      if (dSq <= rSq) {
        // Subtle sphere highlight
        const shade = 1.0 - (dx * 0.15 + dy * 0.15) / Math.max(1, radius);
        setPx(buf, cx + dx, cy + dy, r * shade, g * shade, b * shade, 255);
      }
    }
  }
}

// ── Generic Sprout Stage ──
export function generateSproutTexture(crop: CropConfig): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const stemG: [number, number, number] = [80, 180, 50];

  // Young green stem
  for (let y = 22; y <= 31; y++) {
    setPx(buf, 15, y, stemG[0] * 0.85, stemG[1] * 0.85, stemG[2] * 0.85, 255);
    setPx(buf, 16, y, stemG[0], stemG[1], stemG[2], 255);
  }

  // Small cotyledon leaves
  const leafColor: [number, number, number] = [120, 210, 60];
  // Left leaf
  setPx(buf, 14, 21, leafColor[0], leafColor[1], leafColor[2], 255);
  setPx(buf, 13, 20, leafColor[0], leafColor[1], leafColor[2], 255);
  setPx(buf, 12, 19, leafColor[0], leafColor[1], leafColor[2], 255);
  setPx(buf, 13, 19, leafColor[0] * 1.1, leafColor[1] * 1.1, leafColor[2] * 1.1, 255);

  // Right leaf
  setPx(buf, 17, 21, leafColor[0], leafColor[1], leafColor[2], 255);
  setPx(buf, 18, 20, leafColor[0], leafColor[1], leafColor[2], 255);
  setPx(buf, 19, 19, leafColor[0], leafColor[1], leafColor[2], 255);
  setPx(buf, 18, 19, leafColor[0] * 1.1, leafColor[1] * 1.1, leafColor[2] * 1.1, 255);

  // Tiny soil specks at base
  setPx(buf, 14, 31, 80, 50, 30, 255);
  setPx(buf, 17, 31, 90, 55, 35, 255);

  return buf;
}

// ── Generic Growing Stage ──
export function generateGrowingTexture(crop: CropConfig): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const stemG: [number, number, number] = [60, 160, 45];
  const leafG: [number, number, number] = [75, 185, 55];
  const highG: [number, number, number] = [115, 215, 75];

  // Upright developing stalk
  for (let y = 14; y <= 31; y++) {
    setPx(buf, 15, y, stemG[0] * 0.9, stemG[1] * 0.9, stemG[2] * 0.9, 255);
    setPx(buf, 16, y, stemG[0], stemG[1], stemG[2], 255);
  }

  // Tier 1 leaves (lower)
  for (let dx = -5; dx <= 5; dx++) {
    if (dx === 0) continue;
    const ly = 24 - Math.abs(dx);
    setPx(buf, 15 + dx, ly, leafG[0], leafG[1], leafG[2], 255);
    setPx(buf, 15 + dx, ly + 1, leafG[0] * 0.85, leafG[1] * 0.85, leafG[2] * 0.85, 255);
  }

  // Tier 2 leaves (mid)
  for (let dx = -6; dx <= 6; dx++) {
    if (dx === 0) continue;
    const ly = 18 - Math.floor(Math.abs(dx) * 0.8);
    setPx(buf, 15 + dx, ly, highG[0], highG[1], highG[2], 255);
    setPx(buf, 15 + dx, ly + 1, leafG[0], leafG[1], leafG[2], 255);
  }

  // Crown bud
  setPx(buf, 15, 13, highG[0], highG[1], highG[2], 255);
  setPx(buf, 16, 13, highG[0], highG[1], highG[2], 255);

  return buf;
}

// ── Generic Wilted Stage ──
export function generateWiltedTexture(crop: CropConfig): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const dryBrown: [number, number, number] = [115, 75, 40];
  const paleStraw: [number, number, number] = [145, 110, 65];

  // Drooping, curved brittle stem
  for (let y = 20; y <= 31; y++) {
    setPx(buf, 15, y, dryBrown[0], dryBrown[1], dryBrown[2], 255);
  }
  // Slumped head to the right
  setPx(buf, 16, 19, dryBrown[0], dryBrown[1], dryBrown[2], 255);
  setPx(buf, 17, 18, dryBrown[0], dryBrown[1], dryBrown[2], 255);
  setPx(buf, 18, 19, paleStraw[0], paleStraw[1], paleStraw[2], 255);
  setPx(buf, 19, 21, paleStraw[0], paleStraw[1], paleStraw[2], 255);
  setPx(buf, 20, 23, dryBrown[0], dryBrown[1], dryBrown[2], 255);

  // Shriveled dry leaf fragments
  setPx(buf, 12, 26, paleStraw[0], paleStraw[1], paleStraw[2], 255);
  setPx(buf, 13, 27, dryBrown[0], dryBrown[1], dryBrown[2], 255);
  setPx(buf, 18, 25, paleStraw[0], paleStraw[1], paleStraw[2], 255);
  setPx(buf, 19, 26, dryBrown[0], dryBrown[1], dryBrown[2], 255);

  return buf;
}

// ── Mature Stage (Unique per crop family) ──
export function generateMatureTexture(crop: CropConfig): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const [cr, cg, cb] = hexToRgb(crop.color);

  // 1. Root vegetables (Carrot, Radish, Potato, Turnip, Beet, Onion, Garlic, Parsnip, Rutabaga, Sweet Potato, Sugar Beet, Horseradish)
  if (
    crop.id === 'carrots' || crop.id === 'radishes' || crop.id === 'potatoes' ||
    crop.id === 'turnips' || crop.id === 'beets' || crop.id === 'onions' ||
    crop.id === 'garlic' || crop.id === 'parsnips' || crop.id === 'rutabaga' ||
    crop.id === 'sweet_potatoes' || crop.id === 'sugar_beets' || crop.id === 'horseradish'
  ) {
    // Lush feathery carrot/root greens on top
    const foliageG: [number, number, number] = [45, 145, 40];
    for (let x = 10; x <= 22; x++) {
      for (let y = 10; y <= 21; y++) {
        if ((x + y) % 2 === 0 || Math.sin(x * 1.5 + y) > 0.2) {
          setPx(buf, x, y, foliageG[0] * 1.1, foliageG[1] * 1.1, foliageG[2] * 1.1, 255);
        }
      }
    }
    // Main stalks connecting root to greens
    for (let y = 18; y <= 23; y++) {
      setPx(buf, 15, y, foliageG[0], foliageG[1], foliageG[2], 255);
      setPx(buf, 16, y, foliageG[0] * 0.9, foliageG[1] * 0.9, foliageG[2] * 0.9, 255);
    }
    // Plump crown of the root vegetable emerging from the soil
    drawCircle(buf, 15, 26, 4.5, cr, cg, cb);
    return buf;
  }

  // 2. Leafy greens & Brassicas (Cabbage, Lettuce, Spinach, Kale, Broccoli, Cauliflower, Brussels Sprouts)
  if (
    crop.id === 'cabbage' || crop.id === 'lettuce' || crop.id === 'spinach' ||
    crop.id === 'kale' || crop.id === 'broccoli' || crop.id === 'cauliflower' ||
    crop.id === 'brussels_sprouts' || crop.id === 'wild_sea_cabbage'
  ) {
    // Outer ruffled leaves
    drawCircle(buf, 16, 22, 10, 35, 120, 35);
    // Inner compact head or florets with crop tone
    drawCircle(buf, 16, 20, 6.5, cr, cg, cb);
    // Center highlight
    drawCircle(buf, 16, 19, 3, cr * 1.15, cg * 1.15, cb * 1.15);
    return buf;
  }

  // 3. Trellis Vines & Legumes (Tomatoes, Peas, Beans, Grapes, Hops, Cucumbers)
  if (
    crop.id === 'tomatoes' || crop.id === 'peas' || crop.id === 'beans' ||
    crop.id === 'grapes' || crop.id === 'hops' || crop.id === 'cucumbers'
  ) {
    // Wooden vine support stake
    for (let y = 4; y <= 31; y++) {
      setPx(buf, 15, y, 140, 100, 60, 255);
      setPx(buf, 16, y, 115, 80, 45, 255);
    }
    // Climbing green vine clusters
    for (let y = 8; y <= 28; y += 3) {
      drawCircle(buf, 15 + ((y % 6) - 3), y, 3.5, 45, 145, 40);
    }
    // Hanging clusters of produce
    if (crop.id === 'tomatoes') {
      drawCircle(buf, 12, 16, 2.5, cr, cg, cb);
      drawCircle(buf, 19, 21, 2.8, cr, cg, cb);
      drawCircle(buf, 13, 24, 2.5, cr, cg, cb);
    } else if (crop.id === 'grapes') {
      drawCircle(buf, 13, 19, 3.5, cr, cg, cb);
      drawCircle(buf, 18, 23, 3.2, cr, cg, cb);
    } else {
      drawCircle(buf, 13, 18, 2.5, cr, cg, cb);
      drawCircle(buf, 19, 22, 2.5, cr, cg, cb);
    }
    return buf;
  }

  // 4. Grains & Grasses (Wheat, Barley, Oats, Rye, Sorghum, Rice, Flax, Winter Grain)
  if (
    crop.id === 'wheat' || crop.id === 'barley' || crop.id === 'oats' ||
    crop.id === 'rye' || crop.id === 'sorghum' || crop.id === 'rice' ||
    crop.id === 'flax' || crop.id === 'winter_grain'
  ) {
    // Slender tall stalks
    const stalkColor: [number, number, number] = [180, 150, 60];
    for (let x of [13, 16, 19]) {
      for (let y = 10; y <= 31; y++) {
        setPx(buf, x, y, stalkColor[0], stalkColor[1], stalkColor[2], 255);
      }
    }
    // Full golden / grain seed heads at tops
    for (let y = 4; y <= 14; y++) {
      for (let x = 11; x <= 21; x++) {
        if ((x + y) % 2 === 0) {
          setPx(buf, x, y, cr, cg, cb, 255);
        }
      }
    }
    return buf;
  }

  // 5. Tall Stalks (Corn, Sugarcane, Sunflowers)
  if (crop.id === 'corn' || crop.id === 'sugarcane' || crop.id === 'sunflowers') {
    // Heavy thick stalk
    for (let y = 0; y <= 31; y++) {
      setPx(buf, 15, y, 70, 160, 45, 255);
      setPx(buf, 16, y, 90, 185, 55, 255);
      setPx(buf, 17, y, 60, 140, 35, 255);
    }
    // Broad arching side leaves
    for (let dy = 0; dy <= 4; dy++) {
      setPx(buf, 14 - dy * 2, 20 + dy, 65, 170, 45, 255);
      setPx(buf, 18 + dy * 2, 16 + dy, 65, 170, 45, 255);
    }
    // Golden corn ears or bloom
    if (crop.id === 'corn') {
      drawCircle(buf, 13, 16, 2.5, cr, cg, cb);
      drawCircle(buf, 19, 21, 2.5, cr, cg, cb);
    } else if (crop.id === 'sunflowers') {
      drawCircle(buf, 16, 8, 5, cr, cg, cb);
    }
    return buf;
  }

  // 6. Mushrooms
  if (crop.id === 'mushrooms') {
    // Pale mushroom stalks
    for (let y = 20; y <= 31; y++) {
      setPx(buf, 12, y, 220, 215, 200, 255);
      setPx(buf, 20, y, 220, 215, 200, 255);
    }
    // Smooth rounded mushroom caps
    drawCircle(buf, 12, 18, 5.5, cr, cg, cb);
    drawCircle(buf, 20, 19, 4.5, cr * 1.1, cg * 1.1, cb * 1.1);
    return buf;
  }

  // 7. Cactus Fruit
  if (crop.id === 'cactus_fruit') {
    // Cactus pad
    drawCircle(buf, 16, 20, 8, 45, 130, 50);
    // Spines
    setPx(buf, 12, 16, 240, 240, 200, 255);
    setPx(buf, 20, 17, 240, 240, 200, 255);
    setPx(buf, 16, 22, 240, 240, 200, 255);
    // Vibrant magenta/red fruit pear atop pad
    drawCircle(buf, 16, 11, 4, cr, cg, cb);
    return buf;
  }

  // 8. Berries & Large Gourds (Melons, Pumpkins, Zucchini, Blueberries, Strawberries, Cranberries, Fruit Trees, Peppers, Eggplant, Celery, Rhubarb, Asparagus)
  // Generous leafy foliage bush with prominent ripe fruit
  drawCircle(buf, 16, 20, 8.5, 45, 150, 45);
  // Main ripe produce
  drawCircle(buf, 16, 23, 5.5, cr, cg, cb);
  drawCircle(buf, 11, 19, 3.5, cr * 0.95, cg * 0.95, cb * 0.95);
  drawCircle(buf, 21, 18, 3.5, cr * 0.95, cg * 0.95, cb * 0.95);
  return buf;
}

// ── Garden Trellis Texture ──
export function generateTrellisTexture(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  const woodDark = [105, 75, 45];
  const woodLight = [145, 105, 65];

  // Outer framing posts (left, right, bottom, top)
  for (let y = 0; y < 32; y++) {
    // Left post
    setPx(buf, 0, y, woodDark[0], woodDark[1], woodDark[2], 255);
    setPx(buf, 1, y, woodLight[0], woodLight[1], woodLight[2], 255);
    setPx(buf, 2, y, woodDark[0], woodDark[1], woodDark[2], 255);
    // Right post
    setPx(buf, 29, y, woodDark[0], woodDark[1], woodDark[2], 255);
    setPx(buf, 30, y, woodLight[0], woodLight[1], woodLight[2], 255);
    setPx(buf, 31, y, woodDark[0], woodDark[1], woodDark[2], 255);
  }
  for (let x = 0; x < 32; x++) {
    // Top rail
    setPx(buf, x, 0, woodDark[0], woodDark[1], woodDark[2], 255);
    setPx(buf, x, 1, woodLight[0], woodLight[1], woodLight[2], 255);
    // Bottom rail
    setPx(buf, x, 30, woodLight[0], woodLight[1], woodLight[2], 255);
    setPx(buf, x, 31, woodDark[0], woodDark[1], woodDark[2], 255);
  }

  // Crisscross diagonal lattice slats
  for (let y = 2; y < 30; y++) {
    for (let x = 3; x < 29; x++) {
      const diag1 = (x + y) % 7 === 0;
      const diag2 = (x - y + 64) % 7 === 0;
      if (diag1 || diag2) {
        const isOverlap = diag1 && diag2;
        const color = isOverlap ? woodLight : woodDark;
        setPx(buf, x, y, color[0], color[1], color[2], 255);
      }
    }
  }

  return buf;
}

// ── Wild Sea Cabbage Texture ──
export function generateWildSeaCabbageTexture(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Hardy blue-green ruffled sea cliff leaves
  drawCircle(buf, 16, 22, 10, 40, 135, 90);
  drawCircle(buf, 16, 20, 7, 75, 175, 120);
  // Seaside yellow mustard flowers atop wild stems
  drawCircle(buf, 14, 11, 2.5, 250, 220, 60);
  drawCircle(buf, 18, 10, 2.5, 250, 220, 60);
  return buf;
}

// ── Tall Crop Tops (Corn, Sugarcane, Sunflowers) ──
export function generateCornTopTexture(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Upper stalk and golden tassel
  for (let y = 14; y <= 31; y++) {
    setPx(buf, 15, y, 70, 160, 45, 255);
    setPx(buf, 16, y, 90, 185, 55, 255);
  }
  // Delicate flowering tassel
  for (let dy = 0; dy <= 6; dy++) {
    setPx(buf, 15 - dy, 14 - dy, 240, 210, 60, 255);
    setPx(buf, 16 + dy, 14 - dy, 240, 210, 60, 255);
  }
  return buf;
}

export function generateSugarcaneTopTexture(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Tall upper cane with feather plume
  for (let y = 12; y <= 31; y++) {
    setPx(buf, 15, y, 70, 170, 60, 255);
    setPx(buf, 16, y, 95, 200, 80, 255);
  }
  // Arching cane fronds
  for (let i = 0; i < 6; i++) {
    setPx(buf, 15 - i * 2, 12 - i, 80, 185, 70, 255);
    setPx(buf, 16 + i * 2, 12 - i, 80, 185, 70, 255);
  }
  return buf;
}

export function generateSunflowerTopTexture(): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(32 * 32 * 4);
  // Sturdy stem
  for (let y = 18; y <= 31; y++) {
    setPx(buf, 15, y, 65, 140, 45, 255);
    setPx(buf, 16, y, 85, 165, 55, 255);
  }
  // Large radiant golden sunflower head
  drawCircle(buf, 16, 12, 9, 250, 195, 30);
  // Rich dark seed center
  drawCircle(buf, 16, 12, 4.5, 95, 55, 25);
  return buf;
}

// ── Seed Packet / Item Icon Generator ──
export function generateSeedIcon(crop: CropConfig): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const [cr, cg, cb] = hexToRgb(crop.color);

  // Craft paper seed packet
  ctx.fillStyle = '#d4b382';
  ctx.fillRect(6, 6, 20, 22);

  // Folded packet envelope flap
  ctx.fillStyle = '#b89360';
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(16, 14);
  ctx.lineTo(26, 6);
  ctx.fill();

  // Packet botanical emblem matching crop color
  ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
  ctx.beginPath();
  ctx.arc(16, 20, 4, 0, Math.PI * 2);
  ctx.fill();

  // Green seed leaf sprout
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(15, 13, 2, 4);

  return canvas.toDataURL();
}

// ── Food Produce Item Icon Generator ──
export function generateFoodIcon(crop: CropConfig): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const [cr, cg, cb] = hexToRgb(crop.color);

  // Pixel art produce illustration
  ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
  ctx.beginPath();
  ctx.arc(16, 17, 8, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(13, 14, 3, 0, Math.PI * 2);
  ctx.fill();

  // Green stem / calyx on top
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(15, 6, 2, 4);
  ctx.fillRect(13, 8, 6, 2);

  return canvas.toDataURL();
}

export function registerAllCropTextures(
  registerBlock32: (id: BlockType, topBuf: Uint8ClampedArray, sideBuf: Uint8ClampedArray, bottomBuf?: Uint8ClampedArray) => void
) {
  // 1. Garden Trellis
  const trellisBuf = generateTrellisTexture();
  registerBlock32(CROP_BLOCK_IDS.TRELLIS, trellisBuf, trellisBuf, trellisBuf);

  // 2. Wild Sea Cabbage
  const wildSeaCabbageBuf = generateWildSeaCabbageTexture();
  registerBlock32(CROP_BLOCK_IDS.WILD_SEA_CABBAGE, wildSeaCabbageBuf, wildSeaCabbageBuf);

  // 3. Tall crop tops
  const cornTopBuf = generateCornTopTexture();
  registerBlock32(CROP_BLOCK_IDS.CORN_TOP, cornTopBuf, cornTopBuf);

  const sugarcaneTopBuf = generateSugarcaneTopTexture();
  registerBlock32(CROP_BLOCK_IDS.SUGARCANE_TOP, sugarcaneTopBuf, sugarcaneTopBuf);

  const sunflowerTopBuf = generateSunflowerTopTexture();
  registerBlock32(CROP_BLOCK_IDS.SUNFLOWER_TOP, sunflowerTopBuf, sunflowerTopBuf);

  // 4. All 54 crops (sprout, growing, mature, wilted)
  CROP_CONFIGS.forEach(crop => {
    const bundle = CROP_BLOCK_BUNDLES.get(crop.id);
    if (!bundle) return;

    const sproutBuf = generateSproutTexture(crop);
    registerBlock32(bundle.sprout, sproutBuf, sproutBuf);

    const growingBuf = generateGrowingTexture(crop);
    registerBlock32(bundle.growing, growingBuf, growingBuf);

    const matureBuf = generateMatureTexture(crop);
    registerBlock32(bundle.mature, matureBuf, matureBuf);

    const wiltedBuf = generateWiltedTexture(crop);
    registerBlock32(bundle.wilted, wiltedBuf, wiltedBuf);
  });
}

