// アイコンを生成する（標準ライブラリのみ）: npm run icons
// 絵は、下の「図形のリスト」だけで決まる。同じリストから、SVG と PNG の両方を作る（PNG を直接編集しない）。
// 絵: 藍色の海(青海波)の上に、大きな将棋の駒。駒の面に、夕暮れの天守(城)と月を描く。
// maskable は端末が外側を円や角丸で切り抜くため、大事な図柄(駒)を、中央の円(直径の 80%)に収める。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZE = 512;

// ---- 色（絵だけで使う。アプリの画面の色は src/style.css）----
const C = {
  seaTop: '#1f3a74', // 藍色の海
  seaBottom: '#3b66aa',
  seaWaveFill: '#284a86',
  seaWaveLine: '#4a76b8',
  shadow: '#13264d',
  wood: '#f2dca6', // 駒の木の色
  woodEdge: '#5b3715',
  skyTop: '#26376a', // 駒の面の、夕暮れの空
  skyMid: '#4a5f94',
  skyLow: '#e8b97a',
  moon: '#f7f0d8',
  star: '#f4ecd0',
  wall: '#f6eed6', // 白い壁
  roof: '#141f45',
  stone: '#1c2750',
  window: '#f5c35f', // あかりのついた窓
  gold: '#e7b94c',
  waveFill: '#1d3a73',
  waveLine: '#6a8cc6',
};

// ---- 図形のリスト（奥から手前の順）----
const shapes = [];
const poly = (pts, fill, clip) => shapes.push({ t: 'poly', pts, fill, clip });
const rect = (x, y, w, h, fill, clip) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, clip);
const circle = (cx, cy, r, fill, stroke, sw = 0, clip) => shapes.push({ t: 'circle', cx, cy, r, fill, stroke, sw, clip });

/** 縦のグラデーション（fill に渡す）。y0 〜 y1 の間で、色が変わる */
const grad = (id, y0, y1, stops) => ({ id, y0, y1, stops });

// 背景: 藍色の海。下のほうに、うすい青海波
const SEA = grad('sea', 0, SIZE, [[0, C.seaTop], [1, C.seaBottom]]);
rect(0, 0, SIZE, SIZE, SEA);
const SR = 40;
for (let row = 0; row < 8; row++) {
  const y = 330 + row * (SR / 2);
  for (let x = -SR + (row % 2) * SR; x < SIZE + 2 * SR; x += 2 * SR) {
    circle(x, y, SR, C.seaWaveFill, C.seaWaveLine, 3);
    circle(x, y, SR * 0.7, undefined, C.seaWaveLine, 3);
    circle(x, y, SR * 0.4, undefined, C.seaWaveLine, 3);
  }
}

// 将棋の駒（五角形）。中心が原点、高さを 1 としたときの形
const U = 290;
const CY = 262;
const piecePts = (scale, dx = 0, dy = 0) =>
  [[0, -0.5], [0.36, -0.2], [0.46, 0.5], [-0.46, 0.5], [-0.36, -0.2]].map(([x, y]) => [SIZE / 2 + x * U * scale + dx, CY + y * U * scale + dy]);
poly(piecePts(1, 8, 10), C.shadow); // かげ
shapes.push({ t: 'poly', pts: piecePts(1), fill: C.wood, stroke: C.woodEdge, sw: 6 }); // 駒の木の面
const INSET = piecePts(0.82); // 駒の面の、絵をはめこむ窓
const SKY = grad('sky', 143, 381, [[0, C.skyTop], [0.4, C.skyMid], [0.8, C.skyLow], [1, C.skyLow]]);
poly(INSET, SKY, INSET);

// 窓の中の絵: 天守と月、足もとの青海波（元の 512 の絵を 0.7 倍にして、窓の中に収める）
const X = (x) => 256 + (x - 256) * 0.7;
const Y = (y) => 186 + (y - 150) * 0.7;
const P = (pts) => pts.map(([x, y]) => [X(x), Y(y)]);
const polyS = (pts, fill) => poly(P(pts), fill, INSET);
const rectS = (x, y, w, h, fill) => polyS([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill);

circle(256, 178, 14, C.moon, undefined, 0, INSET); // 天守の上に、まるい月
for (const [x, y, r] of [[226, 196, 1.6], [288, 200, 1.6], [240, 168, 1.4]]) circle(x, y, r, C.star, undefined, 0, INSET);

polyS([[140, 400], [372, 400], [354, 332], [158, 332]], C.stone); // 石垣
rectS(180, 300, 152, 34, C.wall); // 一重目の壁
rectS(204, 250, 104, 30, C.wall); // 二重目の壁
rectS(226, 204, 60, 22, C.wall); // 三重目の壁
polyS([[130, 308], [382, 308], [348, 276], [164, 276]], C.roof); // 一重目の屋根
polyS([[176, 254], [336, 254], [312, 224], [200, 224]], C.roof); // 二重目の屋根
polyS([[204, 208], [308, 208], [286, 178], [226, 178]], C.roof); // 三重目の屋根
polyS([[230, 178], [256, 150], [282, 178]], C.roof); // 最上の屋根のむね
polyS([[222, 178], [206, 160], [210, 180]], C.gold); // しゃちほこ(左)
polyS([[290, 178], [306, 160], [302, 180]], C.gold); // しゃちほこ(右)
for (const x of [190, 230, 282, 322]) rectS(x - 7, 316, 14, 14, C.window);
for (const x of [232, 280]) rectS(x - 6, 260, 12, 12, C.window);
rectS(250, 210, 12, 12, C.window);

const WR = 17;
for (let row = 0; row < 5; row++) {
  const y = 362 + row * (WR / 2);
  for (let x = 130 + (row % 2) * WR; x < 390; x += 2 * WR) {
    circle(x, y, WR, C.waveFill, C.waveLine, 2, INSET);
    circle(x, y, WR * 0.7, undefined, C.waveLine, 2, INSET);
  }
}
// 窓のわく（線だけ）
shapes.push({ t: 'poly', pts: INSET, fill: undefined, stroke: C.woodEdge, sw: 3 });

// ---- 描画 ----
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function gradAt(g, y) {
  const t = Math.min(Math.max((y - g.y0) / (g.y1 - g.y0), 0), 1);
  for (let i = 1; i < g.stops.length; i++) {
    const [t1, c1] = g.stops[i];
    const [t0, c0] = g.stops[i - 1];
    if (t <= t1) return lerp(hex(c0), hex(c1), (t - t0) / (t1 - t0 || 1));
  }
  return hex(g.stops[g.stops.length - 1][1]);
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

/** 点 (x, y) と、線分 a-b の距離 */
function distToSegment(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.min(Math.max(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0), 1);
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

// 図形ごとの外接の箱（見るべき図形を絞って、速くする）
for (const s of shapes) {
  const pad = (s.sw ?? 0) / 2 + 1;
  if (s.t === 'poly') {
    const xs = s.pts.map((p) => p[0]);
    const ys = s.pts.map((p) => p[1]);
    s.box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  } else {
    const e = s.r + pad;
    s.box = [s.cx - e, s.cy - e, s.cx + e, s.cy + e];
  }
  s.fillRgb = typeof s.fill === 'string' ? hex(s.fill) : null;
  s.strokeRgb = s.stroke ? hex(s.stroke) : null;
}

/** 絵の中の点 (x, y) の色（上に重なった図形が勝つ） */
function colorAt(x, y) {
  let rgb = [0, 0, 0];
  for (const s of shapes) {
    if (x < s.box[0] || x > s.box[2] || y < s.box[1] || y > s.box[3]) continue;
    if (s.clip && !inPoly(x, y, s.clip)) continue;
    const fillColor = () => (s.fillRgb ?? (s.fill ? gradAt(s.fill, y) : null));
    if (s.t === 'poly') {
      const fill = s.fill && inPoly(x, y, s.pts) ? fillColor() : null;
      if (fill) rgb = fill;
      if (s.strokeRgb && s.sw) {
        for (let i = 0; i < s.pts.length; i++) {
          if (distToSegment(x, y, s.pts[i], s.pts[(i + 1) % s.pts.length]) <= s.sw / 2) rgb = s.strokeRgb;
        }
      }
    } else {
      const d = Math.hypot(x - s.cx, y - s.cy);
      if (s.fill && d <= s.r) rgb = fillColor();
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
  const grads = new Map();
  const fillAttr = (s) => {
    if (!s.fill) return ' fill="none"';
    if (typeof s.fill === 'string') return ` fill="${s.fill}"`;
    grads.set(s.fill.id, s.fill);
    return ` fill="url(#${s.fill.id})"`;
  };
  const strokeAttr = (s) => (s.stroke && s.sw ? ` stroke="${s.stroke}" stroke-width="${s.sw}" stroke-linejoin="round"` : '');
  const clips = new Map();
  const clipAttr = (s) => {
    if (!s.clip) return '';
    const id = `c${clips.size}`;
    const key = JSON.stringify(s.clip);
    if (!clips.has(key)) clips.set(key, { id, pts: s.clip });
    return ` clip-path="url(#${clips.get(key).id})"`;
  };
  const body = shapes
    .map((s) => {
      const common = `${fillAttr(s)}${strokeAttr(s)}${clipAttr(s)}`;
      if (s.t === 'poly') return `<polygon points="${s.pts.map((p) => p.map(f).join(',')).join(' ')}"${common}/>`;
      return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}"${common}/>`;
    })
    .join('');
  const defs =
    [...grads.values()]
      .map((g) => `<linearGradient id="${g.id}" gradientUnits="userSpaceOnUse" x1="0" y1="${g.y0}" x2="0" y2="${g.y1}">${g.stops.map(([t, col]) => `<stop offset="${t}" stop-color="${col}"/>`).join('')}</linearGradient>`)
      .join('') +
    [...clips.values()].map((c) => `<clipPath id="${c.id}"><polygon points="${c.pts.map((p) => p.map(f).join(',')).join(' ')}"/></clipPath>`).join('') +
    `<clipPath id="round"><rect width="${SIZE}" height="${SIZE}" rx="112"/></clipPath>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><defs>${defs}</defs><g clip-path="url(#round)">${body}</g></svg>\n`;
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
