import { describe, expect, it } from 'vitest';
import { ARCS, CHAPTERS, CHARACTERS, arcOf, chapterLabel, characterOf, type Line } from '../src/story';

const arcChapters = (id: string) => CHAPTERS.filter((c) => c.arc === id);
const allLines = (): Line[] => [
  ...CHAPTERS.flatMap((c) => [...c.intro, ...c.win, c.loseQuote]),
  ...ARCS.flatMap((a) => a.epilogue),
];

describe('ストーリーの構成', () => {
  it('信長編・秀吉編・家康編の 3 編で、各 8 話、全 24 話', () => {
    expect(ARCS.map((a) => a.id)).toEqual(['nobunaga', 'hideyoshi', 'ieyasu']);
    expect(CHAPTERS).toHaveLength(24);
    for (const arc of ARCS) expect(arcChapters(arc.id)).toHaveLength(8);
  });

  it('話の通し番号は 1〜24 で、編ごとの番号は 1〜8', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    for (const arc of ARCS) expect(arcChapters(arc.id).map((c) => c.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('編の first / last が、話の番号と合っている（連続していて、編の順に並ぶ）', () => {
    for (const arc of ARCS) {
      const ids = arcChapters(arc.id).map((c) => c.id);
      expect(arc.first).toBe(ids[0]);
      expect(arc.last).toBe(ids[ids.length - 1]);
    }
    expect(ARCS[1].first).toBe(ARCS[0].last + 1);
    expect(ARCS[2].first).toBe(ARCS[1].last + 1);
  });

  it('CPU の強さは、全体を通して 1 → 8 に、だんだん強くなる（弱くはならない）', () => {
    const levels = CHAPTERS.map((c) => c.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(levels[0]).toBe(1);
    expect(levels[levels.length - 1]).toBe(8);
    // 次の編の最初の話は、前の編の最後の話より、弱くならない
    for (const [i, arc] of ARCS.entries()) if (i > 0) expect(CHAPTERS[arc.first - 1].level).toBeGreaterThanOrEqual(CHAPTERS[arc.first - 2].level);
  });

  it('編の主人公は登場人物にいる', () => {
    for (const arc of ARCS) expect(characterOf(arc.hero), arc.name).toBeDefined();
  });
});

describe('歴史のデータ', () => {
  it('どの話にも、年・場所・歴史メモ・勝利後の会話がある', () => {
    for (const c of CHAPTERS) {
      expect(c.year, `話 ${c.id}`).toMatch(/^1[56]\d\d年$/);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.placeName.length).toBeGreaterThan(0);
      expect(c.memo.length, `話 ${c.id} の歴史メモ`).toBeGreaterThan(0);
      expect(c.intro.length, `話 ${c.id} の開始前`).toBeGreaterThan(0);
      expect(c.win.length, `話 ${c.id} の勝利後`).toBeGreaterThan(0);
      for (const m of c.memo) expect(m.trim().length).toBeGreaterThan(10);
    }
  });

  it('編の中で、年は古い順に並ぶ', () => {
    for (const arc of ARCS) {
      const years = arcChapters(arc.id).map((c) => Number.parseInt(c.year, 10));
      expect([...years].sort((a, b) => a - b), arc.name).toEqual(years);
    }
  });

  it('編の期間の年が、各話の年と合っている（信長編は 1556〜1582 年、など）', () => {
    const range = (id: string): [number, number] => {
      const years = arcChapters(id).map((c) => Number.parseInt(c.year, 10));
      return [years[0], years[years.length - 1]];
    };
    expect(range('nobunaga')).toEqual([1556, 1582]);
    expect(range('hideyoshi')).toEqual([1578, 1590]);
    expect(range('ieyasu')).toEqual([1563, 1615]);
  });

  it('有名な合戦が、正しい年で入っている', () => {
    const yearOf = (title: string, arc: string): string | undefined => arcChapters(arc).find((c) => c.title === title)?.year;
    expect(yearOf('桶狭間の奇襲', 'nobunaga')).toBe('1560年');
    expect(yearOf('長篠の戦い', 'nobunaga')).toBe('1575年');
    expect(yearOf('本能寺の変', 'nobunaga')).toBe('1582年');
    expect(yearOf('山崎の戦い', 'hideyoshi')).toBe('1582年');
    expect(yearOf('賤ヶ岳の戦い', 'hideyoshi')).toBe('1583年');
    expect(yearOf('小田原征伐', 'hideyoshi')).toBe('1590年');
    expect(yearOf('関ヶ原の戦い', 'ieyasu')).toBe('1600年');
    expect(yearOf('大坂冬の陣', 'ieyasu')).toBe('1614年');
    expect(yearOf('大坂夏の陣', 'ieyasu')).toBe('1615年');
  });

  it('対戦相手は、実際にその合戦で戦った武将で、1 つの編の中で重ならない', () => {
    const opponents = (id: string): string[] => arcChapters(id).map((c) => c.opponent);
    for (const arc of ARCS) {
      const ids = opponents(arc.id);
      expect(new Set(ids).size, arc.name).toBe(ids.length);
      for (const id of ids) expect(characterOf(id), id).toBeDefined();
      // 主人公本人とは戦わない
      expect(ids).not.toContain(arc.hero);
    }
    expect(opponents('nobunaga')[1]).toBe('yoshimoto'); // 桶狭間
    expect(opponents('nobunaga')[7]).toBe('mitsuhide'); // 本能寺
    expect(opponents('hideyoshi')[3]).toBe('mitsuhide'); // 山崎
    expect(opponents('hideyoshi')[4]).toBe('katsuie'); // 賤ヶ岳
    expect(opponents('ieyasu')[5]).toBe('mitsunari'); // 関ヶ原
    expect(opponents('ieyasu')[6]).toBe('nobushige'); // 大坂冬の陣（真田丸）
  });

  it('各編の最後の話は決戦（強敵の曲）', () => {
    for (const arc of ARCS) expect(CHAPTERS[arc.last - 1].boss, arc.name).toBe(true);
  });
});

describe('登場人物と台詞', () => {
  it('登場人物の id・声の高さ・顔の色は、重ならない', () => {
    for (const key of ['id', 'voice', 'tone'] as const) {
      const values = CHARACTERS.map((c) => c[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it('台詞の話し手は、登場人物か、地の文(narr)で、文章が空でない', () => {
    for (const line of allLines()) {
      expect(line.who === 'narr' || characterOf(line.who) !== undefined, `話し手 ${line.who}`).toBe(true);
      expect(line.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('負けたときのひとことは、対戦相手が話す', () => {
    for (const c of CHAPTERS) expect(c.loseQuote.who, `話 ${c.id}`).toBe(c.opponent);
  });

  it('台詞に出てくる人物は、その話の主人公か対戦相手だけ（関係のない人物は話さない）', () => {
    for (const c of CHAPTERS) {
      const hero = arcOf(c).hero;
      for (const line of [...c.intro, ...c.win]) {
        if (line.who === 'narr') continue;
        expect([hero, c.opponent], `話 ${c.id}: ${line.who}`).toContain(line.who);
      }
    }
  });

  it('対局中のセリフが、全話にそろっている（空でなく、長すぎない）', () => {
    for (const c of CHAPTERS) {
      const t = c.talk;
      expect(t, `話 ${c.id}`).toBeDefined();
      const lines = [t.start, ...t.capture, ...t.lost, ...t.check, ...t.checked, ...t.mid];
      for (const line of lines) {
        expect(line.trim().length, `話 ${c.id}`).toBeGreaterThan(0);
        expect(line.length, `話 ${c.id}: ${line}`).toBeLessThanOrEqual(60);
      }
      for (const key of ['capture', 'lost', 'check', 'checked', 'mid'] as const) expect(t[key].length, `話 ${c.id} の ${key}`).toBeGreaterThan(0);
      expect(t.mid.length, `話 ${c.id} の mid`).toBeGreaterThanOrEqual(2);
    }
  });

  it('セリフは、その話の対戦相手の逸話にふれている（キーワード）', () => {
    const keyword = (id: number): string => ({ 2: '麿', 5: '風', 6: '騎馬', 7: '門徒', 8: '桔梗', 13: '鬼柴田', 15: '釣り野伏せ', 18: '魚鱗', 21: '愛', 22: '大一大万大吉', 23: '真田' })[id] ?? '';
    for (const c of CHAPTERS) {
      const k = keyword(c.id);
      if (!k) continue;
      const lines = [c.talk.start, ...c.talk.capture, ...c.talk.lost, ...c.talk.check, ...c.talk.checked, ...c.talk.mid].join('');
      expect(lines, `話 ${c.id}`).toContain(k);
    }
  });

  it('各編に、最後の語りがある', () => {
    for (const arc of ARCS) expect(arc.epilogue.length).toBeGreaterThan(0);
  });

  it('話の番号は漢数字で表す', () => {
    expect(chapterLabel(1)).toBe('第一話');
    expect(chapterLabel(8)).toBe('第八話');
  });
});
