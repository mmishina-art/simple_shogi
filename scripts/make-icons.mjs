// アイコンを生成する（標準ライブラリのみ）: npm run icons
// 絵は、下の「図形のリスト」だけで決まる。同じリストから、SVG と PNG の両方を作る（PNG を直接編集しない）。
// 絵: タイトル画面のロゴと同じ「戦国 / 将棋」（右の列が戦国、左の列が将棋）。江戸紫の地に、うすい青海波。
// 文字の輪郭は icon-glyphs.mjs（Noto Serif JP Bold、OFL）。
// maskable は端末が外側を円や角丸で切り抜くため、大事な図柄（文字）を、中央の円（直径の 80%）に収める。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GLYPHS } from './icon-glyphs.mjs';

const SIZE = 512;

// ---- 色（絵だけで使う。アプリの画面の色は src/style.css）----
const C = {
  ground: '#43283a', // 江戸紫の地
  gold: '#d9b45e', // 「将棋」と、青海波の線
  cream: '#f1e6cf', // 「戦国」
  shadow: '#2a1624', // 文字のかげ
};
const WAVE_ALPHA = 0.08; // 青海波の濃さ（地に金を、この割合で混ぜる）

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const WAVE = mix(C.ground, C.gold, WAVE_ALPHA);

// ---- 図形のリスト（奥から手前の順）----
const shapes = [];
const poly = (pts, fill, clip) => shapes.push({ t: 'poly', pts, fill, clip });
const rect = (x, y, w, h, fill, clip) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, clip);
const circle = (cx, cy, r, fill, stroke, sw = 0, clip) => shapes.push({ t: 'circle', cx, cy, r, fill, stroke, sw, clip });
/** 文字など、穴のある形（contours のうち、重なる回数が奇数の所を塗る） */
const path = (contours, fill) => shapes.push({ t: 'path', contours, fill });

// 背景。maskable は少し縮めて描くので、画面の外まで広く塗る
rect(-512, -512, SIZE * 3, SIZE * 3, C.ground);

// 青海波（うろこ状の波）。全面に敷く
const SR = 44;
for (let row = -2; row < 26; row++) {
  const y = row * (SR / 2);
  for (let x = -SR * 3 + (((row % 2) + 2) % 2) * SR; x < SIZE + SR * 3; x += 2 * SR) {
    circle(x, y, SR, undefined, WAVE, 2.5);
    circle(x, y, SR * 0.7, undefined, WAVE, 2.5);
    circle(x, y, SR * 0.4, undefined, WAVE, 2.5);
  }
}

// 文字。右の列が「戦国」、左の列が「将棋」（ロゴと同じ並び）
const FS = 150; // 文字の大きさ
const GAP = 18; // 列のあいだ
const LINE = FS * 1.12; // 行の高さ
const left = (SIZE - (FS * 2 + GAP)) / 2;
const top = (SIZE - LINE * 2) / 2;
const place = (ch, col, row, fill, dx = 0, dy = 0) => {
  const ox = left + col * (FS + GAP) + dx;
  const oy = top + row * LINE + LINE / 2 + FS * 0.38 + dy; // 字の枠の中心が、行の中心にくる
  path(GLYPHS[ch].map((c) => c.map(([x, y]) => [ox + x * FS, oy + y * FS])), fill);
};
const layout = [['将', 0, 0, C.gold], ['棋', 0, 1, C.gold], ['戦', 1, 0, C.cream], ['国', 1, 1, C.cream]];
for (const [ch, col, row] of layout) place(ch, col, row, C.shadow, 0, 4); // かげ
for (const [ch, col, row, fill] of layout) place(ch, col, row, fill);

// ---- 描画 ----
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
  if (s.t === 'poly' || s.t === 'path') {
    const pts = s.t === 'poly' ? s.pts : s.contours.flat();
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    s.box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  } else {
    const e = s.r + pad;
    s.box = [s.cx - e, s.cy - e, s.cx + e, s.cy + e];
  }
  s.fillRgb = typeof s.fill === 'string' ? hex(s.fill) : null;
  s.strokeRgb = s.stroke ? hex(s.stroke) : null;
}

// 絵を 32×32 のマスに分け、各マスに「かかる図形」だけを（奥から手前の順で）覚えておく
const GRID = 32;
const CELL = SIZE / GRID;
const cells = Array.from({ length: GRID * GRID }, () => []);
for (const s of shapes) {
  const [x0, y0, x1, y1] = s.box;
  if (x1 < 0 || y1 < 0 || x0 > SIZE || y0 > SIZE) {
    // 画面の外まで広がる図形（背景）は、すべてのマスに入れる
    if (!(x0 <= 0 && y0 <= 0 && x1 >= SIZE && y1 >= SIZE)) continue;
  }
  const gx0 = Math.max(0, Math.floor(x0 / CELL)), gx1 = Math.min(GRID - 1, Math.floor(x1 / CELL));
  const gy0 = Math.max(0, Math.floor(y0 / CELL)), gy1 = Math.min(GRID - 1, Math.floor(y1 / CELL));
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) cells[gy * GRID + gx].push(s);
}

/** 絵の中の点 (x, y) の色（上に重なった図形が勝つ）。絵の外は、いちばん近いマスの色 */
function colorAt(x, y) {
  let rgb = [0, 0, 0];
  const gx = Math.min(GRID - 1, Math.max(0, Math.floor(x / CELL)));
  const gy = Math.min(GRID - 1, Math.max(0, Math.floor(y / CELL)));
  for (const s of cells[gy * GRID + gx]) {
    if (x < s.box[0] || x > s.box[2] || y < s.box[1] || y > s.box[3]) continue;
    if (s.clip && !inPoly(x, y, s.clip)) continue;
    const fillColor = () => (s.fillRgb ?? (s.fill ? gradAt(s.fill, y) : null));
    if (s.t === 'path') {
      if (s.contours.reduce((n, c) => n + (inPoly(x, y, c) ? 1 : 0), 0) % 2 === 1) rgb = fillColor();
    } else if (s.t === 'poly') {
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
function png(size, fullBleed, scale = 1) {
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
          const [cr, cg, cb] = colorAt(c + (x - c) / scale, c + (y - c) / scale);
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
      if (s.t === 'path') return `<path d="${s.contours.map((c) => 'M' + c.map((p) => p.map(f).join(',')).join('L') + 'Z').join('')}" fill-rule="evenodd"${common}/>`;
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
  'icon-maskable-512.png': png(512, true, 0.85), // 文字を円の中に収めるため、少し縮める
  // apple-touch-icon は iOS が角を丸めるので全面塗りにする
  'apple-touch-icon.png': png(180, true),
};
for (const [name, data] of Object.entries(files)) writeFileSync(new URL(name, out), data);
writeFileSync(new URL('icon.svg', out), svg());
console.log('icons generated:', [...Object.keys(files), 'icon.svg'].join(', '));
