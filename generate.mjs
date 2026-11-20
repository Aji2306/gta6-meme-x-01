import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const size = 1024;
const pixels = Buffer.alloc(size * size * 4);
const ink = [24, 24, 35];
const paper = [255, 244, 219];
const pink = [234, 42, 127];
const amber = [255, 190, 73];
const plum = [62, 33, 69];

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = 255;
}

function rect(x, y, w, h, color) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) setPixel(col, row, color);
}

function ellipse(cx, cy, rx, ry, color) {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setPixel(x, y, color);
}

function polygon(points, color) {
  const ys = points.map(([, y]) => y);
  for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
    const cuts = [];
    for (let index = 0; index < points.length; index++) {
      const [ax, ay] = points[index];
      const [bx, by] = points[(index + 1) % points.length];
      if ((ay <= y && y < by) || (by <= y && y < ay))
        cuts.push(ax + (y - ay) * (bx - ax) / (by - ay));
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length; i += 2)
      for (let x = Math.ceil(cuts[i]); x < cuts[i + 1]; x++) setPixel(x, y, color);
  }
}

function star(x, y, radius, color, tips = 5) {
  const points = Array.from({ length: tips * 2 }, (_, index) => {
    const angle = Math.PI * (index / tips - 0.5);
    const length = index % 2 ? radius * 0.42 : radius;
    return [Math.round(x + Math.cos(angle) * length), Math.round(y + Math.sin(angle) * length)];
  });
  polygon(points, color);
}

// Each hexadecimal digit pair encodes one row of a five-pixel glyph.
const glyphs = {
  A:'0e11111f111111', B:'1e11111e11111e', C:'0f10101010100f',
  D:'1e11111111111e', E:'1f10101e10101f', F:'1f10101e101010',
  G:'0e11101711110e', H:'1111111f111111', I:'1f04040404041f',
  J:'0702020212120c', K:'11121418141211', L:'1010101010101f',
  M:'111b1515111111', N:'11191915131311', O:'0e11111111110e',
  P:'1e11111e101010', Q:'0e11111115120d', R:'1e11111e141211',
  S:'0f10100e01011e', T:'1f040404040404', U:'1111111111110e',
  V:'11111111110a04', W:'11111115151b11', X:'11110a040a1111',
  Y:'11110a04040404', Z:'1f01020408101f', '6':'0e10101e11110e',
  '!':'04040404040004', '.':'00000000000004', ' ':'00000000000000',
  m:'00001a15151515', a:'00000e010f110f', k:'10101214181412',
  e:'00000e111f100f', f:'0609081c080808', u:'0000111111110f', n:'00001e11111111',
};

function label(message, x, y, scale, color) {
  for (const char of message) {
    const rows = glyphs[char];
    if (!rows) throw new Error(`Missing glyph: ${char}`);
    for (let row = 0; row < 7; row++) {
      const mask = Number.parseInt(rows.slice(row * 2, row * 2 + 2), 16);
      for (let col = 0; col < 5; col++)
        if (mask & (16 >> col)) rect(x + col * scale, y + row * scale, scale, scale, color);
    }
    x += 6 * scale;
  }
}

rect(0, 0, size, size, plum);
for (let y = 12; y < size; y += 16)
  for (let x = 12; x < size; x += 16) rect(x, y, 2, 2, [103, 54, 104]);

// A bank alert card over a dotted backdrop.
rect(74, 92, 896, 864, ink);
rect(60, 76, 896, 864, ink);
rect(68, 84, 880, 848, paper);
rect(68, 84, 880, 86, amber);
rect(68, 164, 880, 6, ink);
label('VICE CITY BANK', 104, 113, 5, ink);
label('ALERT', 758, 113, 5, ink);

rect(104, 201, 740, 76, [255, 222, 228]);
rect(104, 201, 8, 76, pink);
label('GTA VI PREORDER', 130, 211, 8, ink);
rect(104, 300, 808, 4, ink);
label('YOUR WALLET', 104, 348, 11, ink);
label('IS WANTED', 104, 443, 14, ink);

rect(104, 582, 808, 182, ink);
label('WANTED LEVEL', 133, 613, 4, paper);
for (let index = 0; index < 5; index++) star(171 + index * 95, 704, 36, amber);

// The bank's ghost mascot and its last coin.
const white = [255, 255, 255];
ellipse(766, 671, 76, 79, ink);
polygon([[690, 667], [841, 667], [861, 766], [832, 784], [795, 765],
  [760, 788], [725, 768], [690, 789], [677, 773]], ink);
ellipse(766, 673, 67, 70, white);
polygon([[699, 668], [833, 668], [850, 761], [831, 773], [795, 755],
  [761, 778], [726, 757], [690, 778], [686, 771]], white);
star(737, 668, 15, ink, 4);
star(782, 662, 19, ink, 4);
ellipse(761, 698, 7, 10, ink);
ellipse(842, 712, 44, 45, ink);
ellipse(842, 712, 36, 37, pink);
star(842, 712, 24, white);
ellipse(811, 741, 17, 15, ink);
ellipse(809, 740, 10, 8, white);

label('make.fun', 104, 834, 9, ink);
rect(542, 831, 370, 78, plum);
label('BALANCE WASTED', 555, 852, 4, paper);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8; // Bits per channel
header[9] = 6; // RGBA

const widthBytes = size * 4;
const scanlines = Buffer.alloc((widthBytes + 1) * size);
for (let y = 0; y < size; y++)
  pixels.copy(scanlines, y * (widthBytes + 1) + 1, y * widthBytes, (y + 1) * widthBytes);

writeFileSync(new URL('./meme.png', import.meta.url), Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(scanlines, { level: 9 })),
  chunk('IEND'),
]));
