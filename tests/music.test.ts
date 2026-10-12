import { describe, expect, it } from 'vitest';
import { TRACKS, parseScore, semitoneToHz, voiceFrequency, type TrackName } from '../src/music-data';
import { CHARACTERS } from '../src/story';

describe('楽譜の読み取り', () => {
  it('数字は音、. は休み、_ は前の音を伸ばす', () => {
    const { events, steps } = parseScore('0 . 7 _ _ 12');
    expect(steps).toBe(6);
    expect(events).toEqual([
      { step: 0, semitone: 0, length: 1 },
      { step: 2, semitone: 7, length: 3 },
      { step: 5, semitone: 12, length: 1 },
    ]);
  });

  it('x*n で くり返し、| は読み飛ばす', () => {
    const { events, steps } = parseScore('-12 _*3 | 5 .*2');
    expect(steps).toBe(7);
    expect(events).toEqual([
      { step: 0, semitone: -12, length: 4 },
      { step: 4, semitone: 5, length: 1 },
    ]);
  });

  it('休みをはさんだ _ は、前の音につながらない', () => {
    expect(parseScore('0 . _').events).toEqual([{ step: 0, semitone: 0, length: 1 }]);
  });

  it('太鼓は D（ドン）と k（カッ）', () => {
    expect(parseScore('D . k', true).events).toEqual([
      { step: 0, semitone: 0, length: 1 },
      { step: 2, semitone: 1, length: 1 },
    ]);
  });

  it('半音 12 で 1 オクターブ上がる', () => {
    expect(semitoneToHz(100, 12)).toBeCloseTo(200);
    expect(semitoneToHz(100, -12)).toBeCloseTo(50);
  });
});

describe('BGM のデータ', () => {
  const names = Object.keys(TRACKS) as TrackName[];

  it('画面ごとの 6 曲がある', () => {
    expect(names.sort()).toEqual(['boss', 'game', 'map', 'scene', 'tension', 'title']);
  });

  it.each(names)('%s: すべての層が曲の長さと同じで、音が 1 つ以上ある', (name) => {
    const track = TRACKS[name];
    expect(track.bpm).toBeGreaterThanOrEqual(40);
    expect(track.bpm).toBeLessThanOrEqual(160);
    expect(track.layers.length).toBeGreaterThan(0);
    for (const layer of track.layers) {
      const { events, steps } = parseScore(layer.score, layer.kind === 'taiko');
      expect(steps, `${name} の ${layer.kind}`).toBe(track.steps);
      expect(events.length, `${name} の ${layer.kind}`).toBeGreaterThan(0);
      expect(layer.volume).toBeGreaterThan(0);
      expect(layer.volume).toBeLessThanOrEqual(1);
      for (const e of events) expect(e.step + e.length).toBeLessThanOrEqual(track.steps);
    }
  });

  it('対局の曲は、会話の曲より速く、強敵の曲がいちばん速い', () => {
    expect(TRACKS.game.bpm).toBeGreaterThan(TRACKS.scene.bpm);
    expect(TRACKS.boss.bpm).toBeGreaterThan(TRACKS.game.bpm);
  });
});

describe('しゃべり声', () => {
  it('句読点・空白・記号は鳴らさない', () => {
    for (const c of ['、', '。', ' ', '！', '？', '「', '…', 'ー']) expect(voiceFrequency(200, c), c).toBeNull();
  });

  it('文字は、基準の高さの 1 倍〜2 倍の範囲で鳴る', () => {
    for (const c of '時は戦国あいうえおアイウエオ') {
      const hz = voiceFrequency(200, c);
      expect(hz).not.toBeNull();
      expect(hz!).toBeGreaterThanOrEqual(200);
      expect(hz!).toBeLessThan(400);
    }
  });

  it('同じ文字は同じ高さ（毎回ちがう音にならない）', () => {
    expect(voiceFrequency(200, '戦')).toBe(voiceFrequency(200, '戦'));
  });

  it('人物ごとに声の高さが違い、女性は高く、敵の大将は低い', () => {
    const voices = CHARACTERS.map((c) => c.voice);
    expect(new Set(voices).size).toBe(voices.length);
    const by = (id: string): number => CHARACTERS.find((c) => c.id === id)!.voice;
    expect(by('kaede')).toBeGreaterThan(by('touma'));
    expect(by('yoshikage')).toBeLessThan(by('genzai'));
  });
});
