// 登場人物の絵（SVG を自作）。写実ではなく、太い墨の線と、平らな色で描く、浮世絵や木版画のような絵。
// 部品（頭・兜・体・目・まゆ・口・ひげ）の組み合わせと、家紋・小道具で、人物ごとの味を出す。
// 線はわずかにゆがめて、筆で描いたような手ざわりにする。色は style.css の .portrait 配下のクラスで決める。
import type { Art, CrestKind, EmblemKind } from './story-types';

const NS = 'http://www.w3.org/2000/svg';

// ---- 顔の形 ----
const FACE_PATH = {
  round: 'M48 78 Q47 44 80 44 Q113 44 112 78 Q114 114 80 126 Q46 114 48 78Z',
  lean: 'M51 78 Q50 44 80 44 Q110 44 109 78 Q108 106 80 128 Q52 106 51 78Z',
};

// ---- 家紋（半径 10 ほどの大きさで、原点を中心に描く） ----
const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 9.5 : 4.6;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}Z`;
})();
const HEART = 'M0 -1 C-6 -7 -10 2 0 9 C10 2 6 -7 0 -1Z';

const EMBLEMS: Record<EmblemKind, string> = {
  ring: '<circle class="p-line" r="8.5"/><circle class="p-ink" r="2.6"/>',
  mokko:
    '<circle class="p-line" r="9"/><ellipse class="p-ink" rx="3" ry="7"/><ellipse class="p-ink" rx="3" ry="7" transform="rotate(90)"/>' +
    '<ellipse class="p-ink" rx="2.4" ry="6" transform="rotate(45)"/><ellipse class="p-ink" rx="2.4" ry="6" transform="rotate(135)"/>',
  aoi: [0, 120, 240].map((a) => `<path class="p-ink" d="${HEART}" transform="rotate(${a}) translate(0 -3.5) scale(.55)"/>`).join('') + '<circle class="p-line" r="10"/>',
  kikyo: `<path class="p-line" d="${STAR}"/><circle class="p-ink" r="1.8"/>`,
  rokumon: [-6, 0, 6].flatMap((x) => [-4.5, 4.5].map((y) => `<circle class="p-line thin" cx="${x}" cy="${y}" r="2.6"/>`)).join(''),
  ai: '<text class="p-text" y="5.5" text-anchor="middle" font-size="16">愛</text>',
  dai: '<text class="p-text" y="5.5" text-anchor="middle" font-size="16">大</text>',
  kiri:
    '<ellipse class="p-ink" cy="-5" rx="2" ry="3.6" transform="rotate(-24 0 -2)"/><ellipse class="p-ink" cy="-5" rx="2.2" ry="4"/><ellipse class="p-ink" cy="-5" rx="2" ry="3.6" transform="rotate(24 0 -2)"/>' +
    '<ellipse class="p-ink" cx="-5.5" cy="3" rx="2" ry="4" transform="rotate(55 -5.5 3)"/><ellipse class="p-ink" cx="5.5" cy="3" rx="2" ry="4" transform="rotate(-55 5.5 3)"/><path class="p-line thin" d="M0 -1 V9"/>',
  uroko: '<path class="p-ink" d="M0 -9 L5 -1 L-5 -1Z M-5 9 L-10 1 L0 1Z M5 9 L10 1 L0 1Z"/>',
  bishi: '<path class="p-line" d="M0 -9.5 L9.5 0 L0 9.5 L-9.5 0Z"/><path class="p-ink" d="M0 -4 L4 0 L0 4 L-4 0Z"/>',
  bars: '<circle class="p-line" r="9"/><rect class="p-ink" x="-9" y="-4.5" width="18" height="2.6"/><rect class="p-ink" x="-9" y="1.5" width="18" height="2.6"/>',
  cross: '<circle class="p-line" r="9"/><path class="p-line" d="M-9 0 H9 M0 -9 V9"/>',
  kikkou: '<path class="p-line" d="M0 -9.5 L8.2 -4.7 V4.7 L0 9.5 L-8.2 4.7 V-4.7Z"/><circle class="p-ink" r="2.4"/>',
};

const emblem = (kind: EmblemKind, x: number, y: number, scale = 1): string => `<g transform="translate(${x} ${y}) scale(${scale})">${EMBLEMS[kind]}</g>`;

// ---- 体 ----
function body(art: Art): string {
  const mon = `<circle class="p-white" cx="80" cy="184" r="13.5"/>${emblem(art.emblem, 80, 184, 1.1)}`;
  const collar = '<path class="p-white" d="M62 136 L80 170 L98 136 L91 132 L80 150 L69 132Z"/><path class="p-trim" d="M58 134 L80 176 L102 134 L97 131 L80 160 L63 131Z"/>';
  switch (art.body) {
    case 'armor':
      return (
        '<path class="p-body" d="M6 200 L12 152 Q40 138 80 142 Q120 138 148 152 L154 200Z"/>' +
        '<path class="p-body dark" d="M12 152 L52 144 L56 200 L6 200Z M148 152 L108 144 L104 200 L154 200Z"/>' +
        [158, 170, 182, 194].map((y) => `<path class="p-line thin trim" d="M${10 + (y - 158) * 0.1} ${y} L54 ${y - 8}M${150 - (y - 158) * 0.1} ${y} L106 ${y - 8}"/>`).join('') +
        '<ellipse class="p-trim" cx="80" cy="140" rx="27" ry="9"/>' +
        collar +
        mon
      );
    case 'robe':
      return (
        '<path class="p-body" d="M8 200 Q14 150 80 144 Q146 150 152 200Z"/>' +
        '<path class="p-trim" d="M54 148 L112 200 L96 200 L48 158Z"/>' +
        '<path class="p-white" d="M64 140 L80 164 L96 140 L90 136 L80 150 L70 136Z"/>' +
        '<circle class="p-trim" cx="112" cy="188" r="0.01"/>'
      );
    case 'noble':
      return (
        '<path class="p-body" d="M0 200 L8 152 Q44 136 80 142 Q116 136 152 152 L160 200Z"/>' +
        '<path class="p-body dark" d="M8 152 L40 148 L30 200 L0 200Z M152 152 L120 148 L130 200 L160 200Z"/>' +
        '<path class="p-line thin trim" d="M20 160 L16 200 M140 160 L144 200"/>' +
        collar +
        mon
      );
    case 'cape':
      return (
        '<path class="p-cape" d="M26 154 L16 108 Q42 128 62 138Z M134 154 L144 108 Q118 128 98 138Z"/>' +
        '<path class="p-body" d="M6 200 L12 152 Q40 138 80 142 Q120 138 148 152 L154 200Z"/>' +
        '<path class="p-cape" d="M6 200 L12 152 Q34 140 58 140 L52 200Z M154 200 L148 152 Q126 140 102 140 L108 200Z"/>' +
        collar +
        mon +
        '<circle class="p-metal" cx="80" cy="141" r="4.5"/>'
      );
    default:
      return (
        '<path class="p-body" d="M8 200 L14 152 Q40 136 80 142 Q120 136 146 152 L152 200Z"/>' +
        '<path class="p-body dark" d="M14 152 L46 146 L38 200 L8 200Z M146 152 L114 146 L122 200 L152 200Z"/>' +
        collar +
        mon
      );
  }
}

// ---- 顔の部品 ----
function eyes(kind: Art['eyes']): string {
  switch (kind) {
    case 'sharp':
      return '<path class="p-line" d="M57 86 L75 80 M103 86 L85 80"/><circle class="p-ink" cx="68" cy="84" r="2.2"/><circle class="p-ink" cx="92" cy="84" r="2.2"/>';
    case 'closed':
      return '<path class="p-line" d="M58 80 Q66 87 74 80 M86 80 Q94 87 102 80"/>';
    case 'wide':
      return '<circle class="p-white" cx="66" cy="82" r="5"/><circle class="p-white" cx="94" cy="82" r="5"/><circle class="p-line thin" cx="66" cy="82" r="5"/><circle class="p-line thin" cx="94" cy="82" r="5"/><circle class="p-ink" cx="67" cy="83" r="2.4"/><circle class="p-ink" cx="93" cy="83" r="2.4"/>';
    case 'heavy':
      return '<path class="p-line" d="M57 83 Q66 77 75 83 M85 83 Q94 77 103 83"/><path class="p-line thin" d="M60 88 H72 M88 88 H100"/><circle class="p-ink" cx="66" cy="84" r="1.8"/><circle class="p-ink" cx="94" cy="84" r="1.8"/>';
    default:
      return '<path class="p-line" d="M57 83 Q66 76 75 83 M85 83 Q94 76 103 83"/><circle class="p-ink" cx="66" cy="84" r="2"/><circle class="p-ink" cx="94" cy="84" r="2"/>';
  }
}

function brows(kind: Art['brows'], hair: string): string {
  const c = `p-line ${hair}`;
  switch (kind) {
    case 'thick':
      return `<path class="${c} bold" d="M56 71 Q66 66 77 69 M104 71 Q94 66 83 69"/>`;
    case 'angry':
      return `<path class="${c} bold" d="M55 65 L78 73 M105 65 L82 73"/>`;
    case 'arched':
      return `<path class="${c}" d="M57 72 Q66 60 77 68 M103 72 Q94 60 83 68"/>`;
    default:
      return `<path class="${c}" d="M57 71 Q66 66 77 69 M103 71 Q94 66 83 69"/>`;
  }
}

function mouth(kind: Art['mouth']): string {
  switch (kind) {
    case 'smile':
      return '<path class="p-line" d="M68 107 Q80 116 92 107"/>';
    case 'frown':
      return '<path class="p-line" d="M68 112 Q80 104 92 112"/>';
    case 'grin':
      return '<path class="p-ink" d="M63 103 Q80 122 97 103 Q80 109 63 103Z"/><path class="p-line white" d="M70 107 Q80 112 90 107"/>';
    default:
      return '<path class="p-line" d="M70 109 H90"/>';
  }
}

function beard(kind: Art['beard'], hair: string): string {
  const c = `p-hair ${hair}`;
  switch (kind) {
    case 'mustache':
      return `<path class="${c}" d="M62 101 Q71 95 80 100 Q89 95 98 101 Q89 105 80 103 Q71 105 62 101Z"/>`;
    case 'goatee':
      return `<path class="${c}" d="M72 113 Q80 134 88 113 Q80 118 72 113Z"/><path class="${c}" d="M66 102 Q73 98 80 101 Q87 98 94 102 Q87 104 80 103 Q73 104 66 102Z"/>`;
    case 'full':
      return `<path class="${c}" d="M49 90 Q50 134 80 136 Q110 134 111 90 Q104 120 80 120 Q56 120 49 90Z"/><path class="${c}" d="M62 101 Q71 96 80 100 Q89 96 98 101 Q89 105 80 103 Q71 105 62 101Z"/>`;
    default:
      return '';
  }
}

// ---- 頭 ----
const hairClass = (art: Art): string => (art.hair === 'white' ? 'p-white' : 'p-hair');

function capHair(art: Art): string {
  return `<path class="${hairClass(art)}" d="M48 78 Q46 40 80 38 Q114 40 112 78 Q104 58 80 56 Q56 58 48 78Z"/>`;
}

const CRESTS: Record<CrestKind, string> = {
  none: '',
  horns: '<path class="p-metal" d="M60 44 Q38 40 40 8 Q50 30 70 36Z M100 44 Q122 40 120 8 Q110 30 90 36Z"/><path class="p-metal" d="M44 22 L34 18 M116 22 L126 18"/>',
  moon: '<path class="p-metal" d="M56 40 Q80 -8 104 40 Q80 18 56 40Z"/>',
  kuwagata: '<path class="p-metal" d="M76 42 Q64 14 46 10 Q62 24 70 44Z M84 42 Q96 14 114 10 Q98 24 90 44Z"/>',
  tuft: '<path class="p-white" d="M44 40 Q54 4 80 -2 Q106 4 116 40 Q80 20 44 40Z"/><path class="p-white" d="M40 62 Q20 100 38 116 L46 84Z M120 62 Q140 100 122 116 L114 84Z"/>',
  ai: '<circle class="p-metal" cx="80" cy="30" r="10.5"/><text class="p-text" x="80" y="35.5" text-anchor="middle" font-size="14">愛</text>',
  sun: '<circle class="p-red" cx="80" cy="28" r="9"/>',
};

function gear(art: Art): string {
  switch (art.gear) {
    case 'topknot':
      return capHair(art) + `<ellipse class="${hairClass(art)}" cx="80" cy="34" rx="8" ry="10"/><rect class="p-red" x="73" y="42" width="14" height="5" rx="2"/>`;
    case 'chasen':
      // 茶筅まげ: 髪を高く結い上げ、先を筆のように立てる
      return capHair(art) + `<path class="${hairClass(art)}" d="M74 42 Q70 14 94 6 Q92 22 90 44Z"/><rect class="p-red" x="72" y="40" width="20" height="5" rx="2" transform="rotate(-12 82 42)"/>`;
    case 'sohatsu':
      return capHair(art) + '<path class="p-red" d="M49 66 Q80 52 111 66 L111 71 Q80 57 49 71Z"/>';
    case 'bald':
      return '<ellipse class="p-white" cx="80" cy="52" rx="14" ry="5" opacity="0.4"/>';
    case 'eboshi':
      return '<path class="p-hair" d="M52 68 Q52 14 80 8 Q108 14 108 68 Q80 58 52 68Z"/><path class="p-trim" d="M52 62 Q80 52 108 62 L108 68 Q80 58 52 68Z"/>';
    default:
      return (
        // 兜の鉢、まびさし、しころ(首を守る部分)
        '<path class="p-helm" d="M46 70 L34 108 L54 98Z M114 70 L126 108 L106 98Z"/>' +
        '<path class="p-helm" d="M46 72 Q44 32 80 28 Q116 32 114 72 Q80 56 46 72Z"/>' +
        '<path class="p-trim" d="M45 66 Q80 50 115 66 L115 72 Q80 56 45 72Z"/>' +
        CRESTS[art.crest ?? 'none']
      );
  }
}

// ---- 小道具 ----
function banner(kind: NonNullable<Art['banner']>): string {
  if (kind === 'gourd') {
    // 千成瓢箪（秀吉の馬印）
    return (
      '<path class="p-line thin" d="M136 16 V150"/><path class="p-line thin" d="M136 22 Q126 34 128 40"/>' +
      '<path class="p-metal" d="M128 36 q-9 0 -9 9 q0 6 5 9 q-8 4 -8 13 q0 13 12 13 q12 0 12 -13 q0 -9 -8 -13 q5 -3 5 -9 q0 -9 -9 -9Z"/>'
    );
  }
  // 風林火山の旗（武田信玄）
  return (
    '<path class="p-line thin" d="M142 12 V158"/><rect class="p-red" x="124" y="20" width="18" height="84"/>' +
    ['風', '林', '火', '山'].map((c, i) => `<text class="p-text white" x="133" y="${37 + i * 20}" text-anchor="middle" font-size="15">${c}</text>`).join('')
  );
}

// ---- 顔のおまけ ----
function extras(art: Art): string {
  const e = art.extras ?? [];
  let out = '';
  if (e.includes('wrinkles')) out += '<path class="p-line thin" d="M56 96 q4 5 9 3 M104 96 q-4 5 -9 3 M68 58 H92 M70 62 H90"/>';
  if (e.includes('scar')) out += '<path class="p-line" d="M97 62 L105 94"/><path class="p-line thin" d="M95 72 L102 70 M97 82 L104 80"/>';
  if (e.includes('blush')) out += '<ellipse class="p-red" cx="60" cy="98" rx="6" ry="4" opacity="0.22"/><ellipse class="p-red" cx="100" cy="98" rx="6" ry="4" opacity="0.22"/>';
  if (e.includes('juzu')) out += '<path class="p-trim juzu" d="M52 148 Q80 190 108 148"/>';
  return out;
}

/** 人物の絵（SVG）。色は CSS（.portrait の data-tone）で決まる。 */
export function portraitSvg(art: Art): SVGSVGElement {
  const hair = art.hair === 'white' ? 'white' : '';
  const extra = art.extras ?? [];
  const facePath = FACE_PATH[art.face ?? 'round'];
  const earSize = extra.includes('bigears') ? { rx: 9, ry: 13 } : { rx: 5, ry: 9 };
  // 影は、右のほほから、あごにかけての三日月だけ（顔が縦に割れて見えないように）
  const faceShade = `<path class="p-shade" d="M112 80 Q114 114 80 126 Q104 110 101 84Z"/>`;
  const features =
    (extra.includes('whiteface') ? `<path class="p-white" d="${facePath}" opacity="0.6"/>` : '') +
    (extra.includes('dotbrows') ? '<circle class="p-ink" cx="66" cy="68" r="3.4"/><circle class="p-ink" cx="94" cy="68" r="3.4"/>' : brows(art.brows, hair)) +
    eyes(art.eyes) +
    '<path class="p-line thin" d="M80 88 Q76 99 82 100"/>' +
    mouth(art.mouth);
  const behind = art.gear === 'sohatsu' ? `<path class="${hairClass(art)}" d="M50 78 Q42 118 56 146 L66 108Z M110 78 Q118 118 104 146 L94 108Z"/>` : '';
  const markup =
    `<svg xmlns="${NS}" viewBox="0 -16 160 216" aria-hidden="true" focusable="false">` +
    // 筆で描いたような、わずかなゆがみ
    '<defs><filter id="wobble" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter></defs>' +
    // 背景: 大きな日輪と、墨でひとなでした輪
    '<circle class="p-halo" cx="80" cy="88" r="66"/><path class="p-brush" d="M22 96 A60 60 0 1 1 42 142"/>' +
    '<g filter="url(#wobble)">' +
    (art.banner ? banner(art.banner) : '') +
    behind +
    body(art) +
    '<path class="p-skin" d="M67 116 L67 140 Q80 150 93 140 L93 116Z"/>' +
    `<ellipse class="p-skin" cx="48" cy="86" rx="${earSize.rx}" ry="${earSize.ry}"/><ellipse class="p-skin" cx="112" cy="86" rx="${earSize.rx}" ry="${earSize.ry}"/>` +
    `<path class="p-skin" d="${facePath}"/>` +
    faceShade +
    features +
    extras(art) +
    beard(art.beard, hair) +
    gear(art) +
    '</g></svg>';
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
}
