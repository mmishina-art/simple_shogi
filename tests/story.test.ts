import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHARACTERS, ENDING, chapterLabel, characterOf, type Line } from '../src/story';

const allLines = (): Line[] => [...CHAPTERS.flatMap((c) => [...c.intro, ...c.win, c.loseQuote]), ...ENDING];

describe('ストーリーのデータ', () => {
  it('8 話あり、番号が 1 から順に並ぶ', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('CPU の強さは話が進むほど強くなり、1〜8 に収まる', () => {
    const levels = CHAPTERS.map((c) => c.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(levels[0]).toBe(1);
    expect(levels[levels.length - 1]).toBe(8);
  });

  it('登場人物の id は重複せず、顔の色(tone)も重複しない', () => {
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tones = CHARACTERS.map((c) => c.tone);
    expect(new Set(tones).size).toBe(tones.length);
  });

  it('各話の相手は登場人物にいて、話ごとに別人', () => {
    for (const c of CHAPTERS) expect(characterOf(c.opponent), `話 ${c.id}`).toBeDefined();
    const opponents = CHAPTERS.map((c) => c.opponent);
    expect(new Set(opponents).size).toBe(opponents.length);
  });

  it('台詞の話し手は、登場人物か地の文(narr)で、文章が空でない', () => {
    for (const line of allLines()) {
      expect(line.who === 'narr' || characterOf(line.who) !== undefined, `話し手 ${line.who}`).toBe(true);
      expect(line.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('各話に、開始前・勝利後の会話と、負けたときのひとことがある', () => {
    for (const c of CHAPTERS) {
      expect(c.intro.length, `話 ${c.id} の開始前`).toBeGreaterThan(0);
      expect(c.win.length, `話 ${c.id} の勝利後`).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      // 負けたときのひとことは、対戦相手が話す
      expect(c.loseQuote.who).toBe(c.opponent);
    }
  });

  it('エンディングがある', () => {
    expect(ENDING.length).toBeGreaterThan(0);
  });

  it('話の番号は漢数字で表す', () => {
    expect(chapterLabel(1)).toBe('第一話');
    expect(chapterLabel(8)).toBe('第八話');
  });
});
