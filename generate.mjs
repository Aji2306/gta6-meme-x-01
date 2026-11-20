import fs from 'node:fs';
import zlib from 'node:zlib';

const WIDTH = 1024;
const HEIGHT = 1024;

// Simple CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return ~c >>> 0;
}

function encodePNG(width, height, rgba) {
  const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const temp = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(temp), 0);
    return Buffer.concat([len, temp, crcBuf]);
  };

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const rowSize = width * 4;
  const filtered = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (rowSize + 1)] = 0; // filter type 0
    rgba.copy(filtered, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }

  const compressed = zlib.deflateSync(filtered, { level: 6 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
}

// Pixel buffer
const img = Buffer.alloc(WIDTH * HEIGHT * 4);

// Fill background: Vice City synthwave gradient (dark purple to vibrant orange/magenta)
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const idx = (y * WIDTH + x) * 4;
    const p = y / HEIGHT;
    // Gradient from dark navy/purple to warm magenta/orange
    const r = Math.floor(20 + p * 120);
    const g = Math.floor(10 + p * 30);
    const b = Math.floor(40 + (1 - p) * 100);
    img[idx] = r;
    img[idx + 1] = g;
    img[idx + 2] = b;
    img[idx + 3] = 255;
  }
}

// Drawing helpers
function setPixel(x, y, r, g, b, a = 255) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= WIDTH || iy < 0 || iy >= HEIGHT) return;
  const idx = (iy * WIDTH + ix) * 4;
  const alpha = a / 255;
  const invAlpha = 1 - alpha;
  img[idx] = Math.round(alpha * r + invAlpha * img[idx]);
  img[idx + 1] = Math.round(alpha * g + invAlpha * img[idx + 1]);
  img[idx + 2] = Math.round(alpha * b + invAlpha * img[idx + 2]);
  img[idx + 3] = 255;
}

function fillRect(x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(x, y, r, g, b);
    }
  }
}

function fillCircle(cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(x, y, r, g, b);
      }
    }
  }
}

// Simple font bitmap for uppercase letters and numbers & punctuation
const FONT = {
  'A': [0x60, 0x90, 0xf0, 0x90, 0x90],
  'B': [0xe0, 0x90, 0xe0, 0x90, 0xe0],
  'C': [0x70, 0x80, 0x80, 0x80, 0x70],
  'D': [0xe0, 0x90, 0x90, 0x90, 0xe0],
  'E': [0xf0, 0x80, 0xf0, 0x80, 0xf0],
  'F': [0xf0, 0x80, 0xf0, 0x80, 0x80],
  'G': [0x70, 0x80, 0xb0, 0x90, 0x70],
  'H': [0x90, 0x90, 0xf0, 0x90, 0x90],
  'I': [0xe0, 0x40, 0x40, 0x40, 0xe0],
  'J': [0x70, 0x20, 0x20, 0x90, 0x60],
  'K': [0x90, 0xa0, 0xc0, 0xa0, 0x90],
  'L': [0x80, 0x80, 0x80, 0x80, 0xf0],
  'M': [0x90, 0xf0, 0xf0, 0x90, 0x90],
  'N': [0x90, 0xd0, 0xb0, 0x90, 0x90],
  'O': [0x60, 0x90, 0x90, 0x90, 0x60],
  'P': [0xe0, 0x90, 0xe0, 0x80, 0x80],
  'Q': [0x60, 0x90, 0x90, 0xa0, 0x50],
  'R': [0xe0, 0x90, 0xe0, 0xa0, 0x90],
  'S': [0x70, 0x80, 0x70, 0x10, 0xe0],
  'T': [0xf0, 0x40, 0x40, 0x40, 0x40],
  'U': [0x90, 0x90, 0x90, 0x90, 0x60],
  'V': [0x90, 0x90, 0x90, 0x60, 0x40],
  'W': [0x90, 0x90, 0xf0, 0xf0, 0x90],
  'X': [0x90, 0x60, 0x40, 0x60, 0x90],
  'Y': [0x90, 0x90, 0x60, 0x40, 0x40],
  'Z': [0xf0, 0x20, 0x40, 0x80, 0xf0],
  '0': [0x60, 0x90, 0x90, 0x90, 0x60],
  '1': [0x40, 0xc0, 0x40, 0x40, 0xe0],
  '2': [0x60, 0x90, 0x20, 0x40, 0xf0],
  '3': [0xe0, 0x20, 0x60, 0x20, 0xe0],
  '4': [0x90, 0x90, 0xf0, 0x10, 0x10],
  '5': [0xf0, 0x80, 0xf0, 0x10, 0xf0],
  '6': [0x60, 0x80, 0xf0, 0x90, 0x60],
  '7': [0xf0, 0x10, 0x20, 0x40, 0x40],
  '8': [0x60, 0x90, 0x60, 0x90, 0x60],
  '9': [0x60, 0x90, 0x70, 0x10, 0x60],
  '.': [0x00, 0x00, 0x00, 0x00, 0x40],
  '-': [0x00, 0x00, 0xf0, 0x00, 0x00],
  ':': [0x00, 0x40, 0x00, 0x40, 0x00],
  '!': [0x40, 0x40, 0x40, 0x00, 0x40],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00]
};

function drawText(str, startX, startY, scale = 4, r = 255, g = 255, b = 255) {
  let cx = startX;
  const upper = str.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const glyph = FONT[char] || FONT[' '];
    for (let gy = 0; gy < 5; gy++) {
      const row = glyph[gy];
      for (let gx = 0; gx < 4; gx++) {
        if ((row & (1 << (7 - gx))) !== 0) {
          fillRect(cx + gx * scale, startY + gy * scale, scale, scale, r, g, b);
        }
      }
    }
    cx += 5 * scale;
  }
}

// Draw make.fun ghost mascot
// Mascot: WHITE GHOST with THICK BLACK OUTLINE, TWO BLACK FOUR-POINTED SPARKLE EYES, ROUND LITTLE HAND, HOLDING A MAGENTA COIN WITH A WHITE STAR (on magenta disc).
function drawGhost(cx, cy, scale = 1.0) {
  // Bounding box approximation for ghost centered at (cx, cy)
  const baseW = 140 * scale;
  const baseH = 180 * scale;
  const x0 = Math.round(cx - baseW / 2);
  const y0 = Math.round(cy - baseH / 2);

  // Thick black outline / shadow layer first
  // Head dome and body
  fillCircle(cx, y0 + 60 * scale, 72 * scale, 0, 0, 0);
  fillRect(x0 + 10 * scale, y0 + 60 * scale, 120 * scale, 110 * scale, 0, 0, 0);

  // White inner body
  fillCircle(cx, y0 + 60 * scale, 64 * scale, 255, 255, 255);
  fillRect(x0 + 18 * scale, y0 + 60 * scale, 104 * scale, 105 * scale, 255, 255, 255);

  // Wavy bottom skirt
  fillCircle(cx - 35 * scale, y0 + 165 * scale, 22 * scale, 255, 255, 255);
  fillCircle(cx, y0 + 168 * scale, 22 * scale, 255, 255, 255);
  fillCircle(cx + 35 * scale, y0 + 165 * scale, 22 * scale, 255, 255, 255);

  // Sparkle eyes (two black four-pointed sparkle eyes)
  // Left sparkle eye at cx - 25, cy - 10
  const drawSparkle = (ex, ey) => {
    fillRect(ex - 4 * scale, ey - 12 * scale, 8 * scale, 24 * scale, 0, 0, 0);
    fillRect(ex - 12 * scale, ey - 4 * scale, 24 * scale, 8 * scale, 0, 0, 0);
  };
  drawSparkle(cx - 25 * scale, cy - 10 * scale);
  drawSparkle(cx + 25 * scale, cy - 10 * scale);

  // Round little hand holding magenta coin
  fillCircle(cx - 50 * scale, cy + 30 * scale, 16 * scale, 0, 0, 0);
  fillCircle(cx - 50 * scale, cy + 30 * scale, 12 * scale, 255, 255, 255);

  // Magenta disc / coin with white star
  fillCircle(cx - 75 * scale, cy + 45 * scale, 32 * scale, 200, 0, 150);
  fillCircle(cx - 75 * scale, cy + 45 * scale, 26 * scale, 230, 0, 180);
  // White star on coin
  fillRect(cx - 78 * scale, cy + 25 * scale, 6 * scale, 40 * scale, 255, 255, 255);
  fillRect(cx - 95 * scale, cy + 42 * scale, 40 * scale, 6 * scale, 255, 255, 255);
}

// Draw scene elements: A calendar showing 2013 -> 2026, and "GTA VI LAUNCH WEEK"
fillRect(80, 80, 864, 220, 15, 10, 30); // Header box
drawText("GTA VI LAUNCH WEEK", 110, 110, 6, 255, 255, 0);
drawText("13 YEARS LATER...", 110, 190, 5, 255, 100, 200);

// Draw retro grid floor
for (let y = 700; y < HEIGHT; y += 40) {
  fillRect(0, y, WIDTH, 4, 150, 0, 150);
}
for (let x = 0; x < WIDTH; x += 80) {
  // Diagonal perspective lines from center bottom
  // simple vertical lines for now
  fillRect(x, 700, 4, 324, 150, 0, 150);
}

// Ghost waiting in line
drawGhost(512, 550, 2.3);

// Footer banner
fillRect(40, 860, 944, 120, 40, 10, 50);
drawText("MAKE.FUN: EARN REAL MONEY!", 70, 895, 4, 0, 255, 255);

// Encode and save
const pngBuffer = encodePNG(WIDTH, HEIGHT, img);
fs.writeFileSync('meme.png', pngBuffer);
console.log('meme.png generated successfully, size:', pngBuffer.length);
