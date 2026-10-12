// アイコンを生成する（標準ライブラリのみ）: npm run icons
// 色・形はここを書き換えて再実行する。PNG を直接編集しない。
// maskable は端末が外側を円や角丸で切り抜くため、図柄を中央 60% に収める。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

// 墨色の地に、金色の将棋の駒（五角形）と朱色の日の丸
const BG = [0x16, 0x11, 0x0d];
const FG = [0xd2, 0xac, 0x62];
const SUN = [0xa8, 0x2f, 0x24];
// 駒の形（中心が原点、一辺を 1 としたときの座標。y は下向き）
const PIECE = [[0, -0.5], [0.36, -0.2], [0.46, 0.5], [-0.46, 0.5], [-0.36, -0.2]];
const SUN_AT = { x: 0, y: 0.14, r: 0.17 };

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function crc32(buf) {
  let c;
  const table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// size: 一辺(px) / figure: 図柄の大きさ(一辺に対する割合) / fullBleed: 背景を全面に塗る
function png(size, figure, fullBleed) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const c = size / 2;
  const unit = size * figure;
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      // 角丸の背景（fullBleed のときは全面）
      const dx = Math.max(Math.abs(x - c) - (c - radius), 0);
      const dy = Math.max(Math.abs(y - c) - (c - radius), 0);
      const inBg = fullBleed || dx * dx + dy * dy <= radius * radius;
      // 図柄: 中央の駒と、その中の日の丸
      const ux = (x - c) / unit;
      const uy = (y - c) / unit;
      const inFg = inPolygon(ux, uy, PIECE);
      const inSun = (ux - SUN_AT.x) ** 2 + (uy - SUN_AT.y) ** 2 <= SUN_AT.r ** 2;
      const px = inSun ? SUN : inFg ? FG : BG;
      const o = row + 1 + x * 4;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
      raw[o + 3] = inBg ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
const files = {
  'icon-192.png': png(192, 0.7, false),
  'icon-512.png': png(512, 0.7, false),
  'icon-maskable-512.png': png(512, 0.6, true),
  // apple-touch-icon は iOS が角を丸めるので全面塗りにする
  'apple-touch-icon.png': png(180, 0.7, true),
};
for (const [name, data] of Object.entries(files)) writeFileSync(new URL(name, out), data);

const u = 512 * 0.7;
const points = PIECE.map(([x, y]) => `${(256 + x * u).toFixed(1)},${(256 + y * u).toFixed(1)}`).join(' ');
const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
writeFileSync(
  new URL('icon.svg', out),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${hex(BG)}"/><polygon points="${points}" fill="${hex(FG)}"/><circle cx="${256 + SUN_AT.x * u}" cy="${(256 + SUN_AT.y * u).toFixed(1)}" r="${(SUN_AT.r * u).toFixed(1)}" fill="${hex(SUN)}"/></svg>\n`,
);
console.log('icons generated:', [...Object.keys(files), 'icon.svg'].join(', '));
