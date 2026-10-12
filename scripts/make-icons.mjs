// アイコンを生成する（標準ライブラリのみ）: npm run icons
// 絵は、下の「図形のリスト」だけで決まる。同じリストから、SVG と PNG の両方を作る（PNG を直接編集しない）。
// 絵: 夕暮れの空にうかぶ天守(城)と、青海波(せいがいは)の波もよう。
// maskable は端末が外側を円や角丸で切り抜くため、大事な図柄(城と月)を中央 60% に収める。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZE = 512;

// ---- 色（絵だけで使う。アプリの画面の色は src/style.css）----
const C = {
  skyTop: '#1f2f5c', // 藍
  skyMid: '#4a5f94',
  skyLow: '#e8b97a', // 夕焼けの地平線
  moon: '#f7f0d8',
  star: '#f4ecd0',
  wall: '#f3ead2', // 白い壁
  roof: '#141f45',
  stone: '#1c2750',
  window: '#f5c35f', // あかりのついた窓
  gold: '#e7b94c',
  waveFill: '#1d3a73',
  waveLine: '#6a8cc6',
};

// ---- 図形のリスト（奥から手前の順）----
const shapes = [];
const rect = (x, y, w, h, fill) => shapes.push({ t: 'poly', pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill });
const poly = (pts, fill) => shapes.push({ t: 'poly', pts, fill });
const circle = (cx, cy, r, fill, stroke, sw = 0) => shapes.push({ t: 'circle', cx, cy, r, fill, stroke, sw });

// 空: 上が藍、地平線に向かって夕焼け（グラデーションは別扱い）
const SKY_STOPS = [[0, C.skyTop], [0.38, C.skyMid], [0.66, C.skyLow], [1, C.skyLow]];

// 月と星
circle(352, 140, 25, C.moon);
for (const [x, y, r] of [[96, 96, 2.6], [150, 150, 2], [212, 78, 2.2], [78, 196, 2], [428, 214, 2.2], [300, 70, 1.8], [408, 92, 1.8]]) circle(x, y, r, C.star);

// 天守（石垣 → 一重目 → 二重目 → 三重目）
poly([[140, 400], [372, 400], [354, 332], [158, 332]], C.stone); // 石垣
rect(180, 300, 152, 34, C.wall); // 一重目の壁
rect(204, 250, 104, 30, C.wall); // 二重目の壁
rect(226, 204, 60, 22, C.wall); // 三重目の壁
poly([[130, 308], [382, 308], [348, 276], [164, 276]], C.roof); // 一重目の屋根
poly([[176, 254], [336, 254], [312, 224], [200, 224]], C.roof); // 二重目の屋根
poly([[204, 208], [308, 208], [286, 178], [226, 178]], C.roof); // 三重目の屋根
poly([[230, 178], [256, 150], [282, 178]], C.roof); // 最上の屋根のむね
poly([[222, 178], [206, 160], [210, 180]], C.gold); // しゃちほこ(左)
poly([[290, 178], [306, 160], [302, 180]], C.gold); // しゃちほこ(右)
for (const x of [190, 230, 282, 322]) rect(x - 7, 316, 14, 14, C.window); // 一重目の窓
for (const x of [232, 280]) rect(x - 6, 260, 12, 12, C.window); // 二重目の窓
rect(250, 210, 12, 12, C.window); // 三重目の窓

// 青海波: 同じ大きさの円が、半分ずつずれて重なる。上の段から先に描き、手前の段が上に重なる
const R = 36;
for (let row = 0; row < 10; row++) {
  const y = 404 + row * (R / 2);
  for (let x = -R + (row % 2) * R; x < SIZE + 2 * R; x += 2 * R) {
    circle(x, y, R, C.waveFill, C.waveLine, 3);
    circle(x, y, R * 0.72, undefined, C.waveLine, 3);
    circle(x, y, R * 0.44, undefined, C.waveLine, 3);
  }
}

// ---- 描画 ----
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function skyAt(v) {
  const t = v / SIZE;
  for (let i = 1; i < SKY_STOPS.length; i++) {
    const [t1, c1] = SKY_STOPS[i];
    const [t0, c0] = SKY_STOPS[i - 1];
    if (t <= t1) return lerp(hex(c0), hex(c1), (t - t0) / (t1 - t0 || 1));
  }
  return hex(SKY_STOPS[SKY_STOPS.length - 1][1]);
}

function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 図形ごとの外接の箱（見るべき図形を絞って、速くする）
for (const s of shapes) {
  if (s.t === 'poly') {
    const xs = s.pts.map((p) => p[0]);
    const ys = s.pts.map((p) => p[1]);
    s.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    s.rgb = hex(s.fill);
  } else {
    const e = s.r + s.sw / 2;
    s.box = [s.cx - e, s.cy - e, s.cx + e, s.cy + e];
    s.fillRgb = s.fill && hex(s.fill);
    s.strokeRgb = s.stroke && hex(s.stroke);
  }
}

/** 絵の中の点 (x, y) の色 */
function colorAt(x, y) {
  let rgb = skyAt(y);
  for (const s of shapes) {
    if (x < s.box[0] || x > s.box[2] || y < s.box[1] || y > s.box[3]) continue;
    if (s.t === 'poly') {
      if (inPoly(x, y, s.pts)) rgb = s.rgb;
    } else {
      const d = Math.hypot(x - s.cx, y - s.cy);
      if (s.fillRgb && d <= s.r) rgb = s.fillRgb;
      if (s.strokeRgb && Math.abs(d - s.r) <= s.sw / 2) rgb = s.strokeRgb;
    }
  }
  return rgb;
}

// ---- PNG ----
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

const SS = 3; // 1 ピクセルを 3×3 に分けて平均する（ギザギザをなめらかにする）

// size: 一辺(px) / fullBleed: 背景を全面に塗る（false のときは角丸で、外側は透明）
function png(size, fullBleed) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const k = SIZE / size;
  const radius = SIZE * 0.22;
  const c = SIZE / 2;
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    raw[row] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) * k;
          const y = (py + (sy + 0.5) / SS) * k;
          const dx = Math.max(Math.abs(x - c) - (c - radius), 0);
          const dy = Math.max(Math.abs(y - c) - (c - radius), 0);
          if (!fullBleed && dx * dx + dy * dy > radius * radius) continue;
          const [cr, cg, cb] = colorAt(x, y);
          r += cr; g += cg; b += cb; a++;
        }
      }
      const o = row + 1 + px * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / (SS * SS)) * 255);
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

// ---- SVG（同じ図形のリストから作る）----
const f = (n) => Number(n.toFixed(1));
function svg() {
  const stops = SKY_STOPS.map(([t, col]) => `<stop offset="${t}" stop-color="${col}"/>`).join('');
  const body = shapes
    .map((s) => {
      if (s.t === 'poly') return `<polygon points="${s.pts.map((p) => p.join(',')).join(' ')}" fill="${s.fill}"/>`;
      const fill = s.fill ? ` fill="${s.fill}"` : ' fill="none"';
      const stroke = s.stroke && s.sw ? ` stroke="${s.stroke}" stroke-width="${s.sw}"` : '';
      return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}"${fill}${stroke}/>`;
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><clipPath id="round"><rect width="${SIZE}" height="${SIZE}" rx="112"/></clipPath></defs>` +
    `<g clip-path="url(#round)"><rect width="${SIZE}" height="${SIZE}" fill="url(#sky)"/>${body}</g></svg>\n`
  );
}

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
const files = {
  'icon-192.png': png(192, false),
  'icon-512.png': png(512, false),
  'icon-maskable-512.png': png(512, true),
  // apple-touch-icon は iOS が角を丸めるので全面塗りにする
  'apple-touch-icon.png': png(180, true),
};
for (const [name, data] of Object.entries(files)) writeFileSync(new URL(name, out), data);
writeFileSync(new URL('icon.svg', out), svg());
console.log('icons generated:', [...Object.keys(files), 'icon.svg'].join(', '));
