// 登場人物の顔のイラスト（SVG を自作）。色は style.css の .portrait 配下のクラスで決める。
import type { LookKind } from './story';

const BODY =
  '<path class="p-body" d="M6 150 L18 112 Q60 92 102 112 L114 150 Z"/>' +
  '<path class="p-trim" d="M44 104 L60 128 L76 104 L70 100 L60 114 L50 100 Z"/>' +
  '<circle class="p-trim" cx="60" cy="140" r="7"/>';
const NECK = '<rect class="p-skin" x="50" y="82" width="20" height="24"/>';
const HEAD = '<ellipse class="p-skin" cx="60" cy="60" rx="25" ry="29"/>';
const EYES = '<path class="p-line" fill="none" d="M43 58 q6 -4 12 0 M65 58 q6 -4 12 0"/><circle class="p-ink" cx="49" cy="59" r="1.8"/><circle class="p-ink" cx="71" cy="59" r="1.8"/>';
const BROWS = '<path class="p-line" fill="none" d="M42 51 q7 -4 14 0 M64 51 q7 -4 14 0"/>';
const FIERCE_BROWS = '<path class="p-line thick" fill="none" d="M40 53 L56 49 M80 53 L64 49"/>';
const MOUTH = '<path class="p-line" fill="none" d="M52 77 q8 4 16 0"/>';
const STERN_MOUTH = '<path class="p-line" fill="none" d="M52 79 h16"/>';

const KABUTO =
  '<path class="p-helm" d="M33 56 Q33 20 60 18 Q87 20 87 56 Q60 44 33 56 Z"/>' +
  '<path class="p-helm" d="M31 54 L22 80 L36 74 Z M89 54 L98 80 L84 74 Z"/>' +
  '<path class="p-trim" d="M34 52 Q60 40 86 52 L86 56 Q60 44 34 56 Z"/>';

const OVERLAYS: Record<LookKind, string> = {
  lord:
    '<path class="p-hair" d="M35 52 Q36 26 60 24 Q84 26 85 52 Q60 36 35 52 Z"/><ellipse class="p-hair" cx="60" cy="20" rx="7" ry="6"/>' +
    '<rect class="p-red" x="34" y="42" width="52" height="6" rx="3"/>' +
    BROWS + EYES + MOUTH,
  elder:
    '<path class="p-white" d="M35 52 Q36 28 60 26 Q84 28 85 52 Q60 40 35 52 Z"/><ellipse class="p-white" cx="60" cy="22" rx="6" ry="5"/>' +
    '<path class="p-white" d="M40 72 Q60 116 80 72 Q60 90 40 72 Z"/>' +
    '<path class="p-white" d="M42 50 q7 -5 14 0 M64 50 q7 -5 14 0" fill="none" stroke-width="3"/>' +
    EYES + '<path class="p-line" fill="none" d="M38 66 q2 3 5 3 M82 66 q-2 3 -5 3"/>',
  bandit:
    '<path class="p-hair" d="M32 56 L28 30 L42 40 L48 18 L60 36 L72 18 L78 40 L92 30 L88 56 Q60 42 32 56 Z"/>' +
    '<rect class="p-trim" x="33" y="44" width="54" height="7" rx="3"/>' +
    '<path class="p-hair" d="M40 72 Q60 96 80 72 Q74 82 60 84 Q46 82 40 72 Z"/>' +
    '<path class="p-line" fill="none" d="M72 48 L80 68"/>' +
    FIERCE_BROWS + EYES + STERN_MOUTH,
  monk:
    '<path class="p-trim" d="M34 100 Q60 124 86 100" fill="none" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"/>' +
    BROWS + EYES + MOUTH,
  woman:
    '<path class="p-hair" d="M30 60 Q28 18 60 16 Q92 18 90 60 L96 126 L78 118 L80 66 Q60 40 40 66 L42 118 L24 126 Z"/>' +
    '<path class="p-hair" d="M36 56 Q60 24 84 56 Q60 44 36 56 Z"/>' +
    '<rect class="p-red" x="34" y="40" width="52" height="5" rx="2.5"/><circle class="p-metal" cx="86" cy="26" r="5"/>' +
    BROWS + EYES + '<path class="p-red" d="M54 77 q6 4 12 0 q-6 -1 -12 0 Z"/>',
  strategist:
    '<path class="p-hair" d="M40 46 L46 2 L76 6 L82 46 Z"/><path class="p-trim" d="M40 44 h42 v5 h-42 Z"/>' +
    '<path class="p-hair" d="M50 70 q10 -4 20 0 M60 80 q0 14 -2 22" fill="none" stroke-width="2.5" stroke="currentColor"/>' +
    BROWS + EYES + MOUTH,
  ninja:
    '<path class="p-hair" d="M30 66 Q30 22 60 20 Q90 22 90 66 L92 96 Q60 108 28 96 Z"/>' +
    '<rect class="p-skin" x="38" y="50" width="44" height="14" rx="7"/>' +
    FIERCE_BROWS.replace('M40 53 L56 49 M80 53 L64 49', 'M41 52 L56 50 M79 52 L64 50') +
    '<path class="p-line" fill="none" d="M44 58 h10 M66 58 h10"/><circle class="p-ink" cx="50" cy="58" r="1.8"/><circle class="p-ink" cx="70" cy="58" r="1.8"/>',
  horns:
    KABUTO +
    '<path class="p-metal" d="M44 26 Q28 16 20 0 Q40 4 52 22 Z M76 26 Q92 16 100 0 Q80 4 68 22 Z"/>' +
    '<path class="p-hair" d="M46 72 Q60 76 74 72 Q60 70 46 72 Z"/>' +
    FIERCE_BROWS + EYES + STERN_MOUTH,
  moon:
    KABUTO +
    '<path class="p-metal" d="M38 20 Q60 -10 82 20 Q60 4 38 20 Z"/>' +
    '<path class="p-hair" d="M48 74 Q60 70 72 74 Q60 72 48 74 Z M60 80 q0 10 0 14" fill="none" stroke-width="2" stroke="currentColor"/>' +
    FIERCE_BROWS + EYES + STERN_MOUTH,
};

const NS = 'http://www.w3.org/2000/svg';

/** 顔のイラスト。色は CSS（.portrait の data-tone）で決まる。 */
export function portraitSvg(look: LookKind): SVGSVGElement {
  const markup = `<svg xmlns="${NS}" viewBox="0 0 120 150" aria-hidden="true" focusable="false">${BODY}${NECK}${HEAD}${OVERLAYS[look]}</svg>`;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
}
