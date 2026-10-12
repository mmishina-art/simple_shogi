// BGM の楽譜と、しゃべり声の音程。DOM にも Web Audio にも触れない（tests/ で検査できる）。
// 曲はすべてこのアプリのために作った自作。和の音階（陽音階 / 都節音階）で、Web Audio で演奏する。

export type TrackName = 'title' | 'map' | 'scene' | 'tension' | 'game' | 'boss';

export type LayerKind = 'koto' | 'flute' | 'drone' | 'taiko';

export interface Layer {
  kind: LayerKind;
  /** 音量（0〜1） */
  volume: number;
  /**
   * 1 ステップ(8 分音符)ごとの記号を空白で区切って書く。「|」は小節の区切りで、読み飛ばす。
   *  ・数字: 根音からの半音の数（音を出す。-12 は 1 オクターブ下）
   *  ・_ : 前の音を伸ばす   ・. : 休み   ・x*n : x を n 回くり返す
   *  ・太鼓だけ: D = 低い「ドン」, k = 高い「カッ」
   */
  score: string;
}

export interface Track {
  bpm: number;
  /** 根音の周波数(Hz) */
  root: number;
  /** ループの長さ（ステップ数）。すべての層がこの長さ */
  steps: number;
  layers: Layer[];
}

export interface NoteEvent {
  step: number;
  /** 根音からの半音の数。太鼓は 0=ドン 1=カッ */
  semitone: number;
  /** 伸ばすステップ数 */
  length: number;
}

/** 楽譜の文字を、音の並びにする。長さ（ステップ数）も返す。 */
export function parseScore(score: string, taiko = false): { events: NoteEvent[]; steps: number } {
  const tokens: string[] = [];
  for (const raw of score.split(/\s+/)) {
    if (raw === '' || raw === '|') continue;
    const m = /^(.+)\*(\d+)$/.exec(raw);
    const [symbol, count] = m ? [m[1], Number(m[2])] : [raw, 1];
    for (let i = 0; i < count; i++) tokens.push(symbol);
  }
  const events: NoteEvent[] = [];
  tokens.forEach((t, step) => {
    if (t === '.') return;
    if (t === '_') {
      const last = events[events.length - 1];
      if (last && last.step + last.length === step) last.length++;
      return;
    }
    if (taiko) {
      if (t === 'D' || t === 'k') events.push({ step, semitone: t === 'D' ? 0 : 1, length: 1 });
      return;
    }
    const semitone = Number(t);
    if (Number.isFinite(semitone)) events.push({ step, semitone, length: 1 });
  });
  return { events, steps: tokens.length };
}

export const semitoneToHz = (root: number, semitone: number): number => root * 2 ** (semitone / 12);

const D3 = 146.83;
const E3 = 164.81;

// 陽音階（D: 0 2 5 7 9）= 明るく静かな和の響き。都節音階（E: 0 1 5 7 8）= 緊張感のある響き
export const TRACKS: Record<TrackName, Track> = {
  // タイトル: ゆったりした琴の分散和音と、尺八風の長い旋律
  title: {
    bpm: 60,
    root: D3,
    steps: 32,
    layers: [
      { kind: 'koto', volume: 0.5, score: '0 . 7 . 12 . 7 . | -3 . 5 . 9 . 5 . | -5 . 2 . 7 . 2 . | -7 . 0 . 5 . 0 .' },
      { kind: 'flute', volume: 0.4, score: '14 _*3 12 _*3 | 9 _*5 7 _ | 9 _*3 12 _*3 | 7 _*7' },
      { kind: 'drone', volume: 0.3, score: '-12 _*15 | -17 _*15' },
    ],
  },
  // 話の選択・自由対局の設定: 穏やかな旅の曲
  map: {
    bpm: 84,
    root: D3,
    steps: 32,
    layers: [
      { kind: 'koto', volume: 0.45, score: '0 . 5 . 7 . 5 . | 2 . 7 . 9 . 7 . | -3 . 2 . 5 . 2 . | -5 . 0 . 7 . 5 .' },
      { kind: 'flute', volume: 0.3, score: '. . 12 _ 14 _ . . | 17 _ _ _ 14 _ 12 _ | . . 9 _ 12 _ . . | 14 _ _ _ _ _ . .' },
      { kind: 'taiko', volume: 0.25, score: 'k . . . . . . . | . . . . k . . . | k . . . . . . . | . . . . k . k .' },
    ],
  },
  // 会話: ほとんど音を置かない、静かな曲
  scene: {
    bpm: 54,
    root: D3,
    steps: 32,
    layers: [
      { kind: 'koto', volume: 0.4, score: '0 . . . 7 . . . | -3 . . . 5 . . . | -5 . . . 2 . . . | -7 . . . 0 . . .' },
      { kind: 'flute', volume: 0.25, score: '. . . . . . 14 _ | _ _ . . . . . . | . . . . 12 _ _ _ | 9 _ _ _ _ _ . .' },
      { kind: 'drone', volume: 0.3, score: '-12 _*15 | -14 _*15' },
    ],
  },
  // 夜・軍議・敵の城・天守の会話: 低くて不穏な曲
  tension: {
    bpm: 64,
    root: E3,
    steps: 32,
    layers: [
      { kind: 'drone', volume: 0.4, score: '-24 _*15 | -23 _*15' },
      { kind: 'koto', volume: 0.45, score: '0 . . 1 . . 5 . | 0 . . 1 . . 8 . | -5 . . -4 . . 0 . | 1 . . 0 . . -4 .' },
      { kind: 'taiko', volume: 0.35, score: 'D . . . . . . . | . . . . . . . . | D . . . . . . . | . . . . . . k .' },
    ],
  },
  // 対局: 太鼓が静かに刻む、集中の曲
  game: {
    bpm: 100,
    root: D3,
    steps: 32,
    layers: [
      { kind: 'koto', volume: 0.45, score: '0 . 7 . 5 . 7 . | 0 . 7 . 9 . 7 . | -3 . 5 . 7 . 5 . | -5 . 2 . 5 . 7 .' },
      { kind: 'flute', volume: 0.25, score: '. . . . . . 14 _ | 12 _ 9 _ 7 _ . . | . . . . 12 _ 14 _ | 17 _ _ _ 14 _ . .' },
      { kind: 'taiko', volume: 0.35, score: 'D . . . k . k . | D . . . k . . . | D . . . k . k . | D . . k . . k .' },
    ],
  },
  // 強敵との対局（第七話・第八話）: 速くて力強い曲
  boss: {
    bpm: 126,
    root: E3,
    steps: 32,
    layers: [
      { kind: 'koto', volume: 0.5, score: '0 0 1 . 0 . 7 . | 0 0 1 . 0 . 8 . | -5 -5 -4 . -5 . 2 . | -7 -7 -5 . 0 . 1 .' },
      { kind: 'flute', volume: 0.35, score: '12 _ 13 _ 12 _ 8 _ | 7 _ _ _ 5 _ 7 _ | 8 _ 12 _ 13 _ 17 _ | 13 _ _ _ 12 _ . .' },
      { kind: 'taiko', volume: 0.5, score: 'D . k . D D k . | D . k . D . k k | D . k . D D k . | D D k . D k D k' },
      { kind: 'drone', volume: 0.25, score: '-24 _*15 | -19 _*15' },
    ],
  },
};

// ---- しゃべり声 ----
// 台詞の文字に合わせて「ぽ・ぽ・ぽ」と鳴らす。高さは文字ごとに少しずつ変わり、人物ごとに基準の高さが違う。
const RATIOS = [1, 1.12, 1.26, 1.5, 1.68];
const SILENT = /[\s、。，．,.!?！？…「」『』（）()ー〜～・]/;

/** その文字を読み上げるときの音の高さ(Hz)。鳴らさない文字(句読点など)は null。 */
export function voiceFrequency(base: number, char: string): number | null {
  if (char === '' || SILENT.test(char)) return null;
  return base * RATIOS[char.codePointAt(0)! % RATIOS.length];
}
