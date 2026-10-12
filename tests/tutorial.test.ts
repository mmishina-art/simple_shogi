import { describe, expect, it } from 'vitest';
import { LESSONS, buildPosition, isGoal, squareOf } from '../src/tutorial';
import { KING, PAWN, applyMove, legalMoves, makeCell, type Move } from '../src/shogi';

const goalLessons = LESSONS.filter((l) => l.goal !== null);
const solutions = (id: string): Move[] => {
  const lesson = LESSONS.find((l) => l.id === id)!;
  const pos = buildPosition(lesson.setup);
  return legalMoves(pos).filter((m) => isGoal(lesson.goal!, m, applyMove(pos, m)));
};

describe('チュートリアルのレッスン', () => {
  it('15 レッスンあり、id が重複しない', () => {
    expect(LESSONS).toHaveLength(15);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('どのレッスンにも、題・説明・できたときのひとことがある', () => {
    for (const l of LESSONS) {
      expect(l.title.length, l.id).toBeGreaterThan(0);
      expect(l.text.length, l.id).toBeGreaterThan(0);
      expect(l.praise.length, l.id).toBeGreaterThan(0);
    }
  });

  it('目標のあるレッスンには、目標の文とヒントがある。目標のないレッスンは読むだけ', () => {
    for (const l of LESSONS) {
      if (l.goal) {
        expect(l.goalText, l.id).toBeTruthy();
        expect(l.hint.length, l.id).toBeGreaterThan(0);
      } else {
        expect(l.goalText, l.id).toBeNull();
      }
    }
  });

  it('駒の動き・取る・打つ・成る・禁じ手・詰みの、全部のレッスンがある', () => {
    const ids = LESSONS.map((l) => l.id);
    for (const id of ['pawn', 'lance', 'knight', 'silver', 'gold', 'bishop', 'rook', 'king', 'capture', 'drop', 'promote', 'rules', 'mate']) {
      expect(ids, id).toContain(id);
    }
  });

  it.each(goalLessons.map((l) => l.id))('%s: 合法手の中に、目標を達成する手がちょうど存在する', (id) => {
    expect(solutions(id).length).toBeGreaterThan(0);
  });

  it.each(goalLessons.map((l) => l.id))('%s: 目標でない合法手もある（まちがえられる）', (id) => {
    const lesson = LESSONS.find((l) => l.id === id)!;
    const pos = buildPosition(lesson.setup);
    const wrong = legalMoves(pos).filter((m) => !isGoal(lesson.goal!, m, applyMove(pos, m)));
    // 玉だけのレッスン以外は、目標以外の動きがある
    if (id !== 'king' && id !== 'drop' && id !== 'promote') expect(wrong.length, id).toBeGreaterThan(0);
  });

  it('どのレッスンの盤にも、両方の玉(王)がある', () => {
    for (const l of LESSONS) {
      const board = buildPosition(l.setup).board;
      expect(board.includes(makeCell(KING, 0)), l.id).toBe(true);
      expect(board.includes(makeCell(KING, 1)), l.id).toBe(true);
    }
  });

  it('動きのレッスンは、その駒で、目標のマスに動ける', () => {
    expect(solutions('pawn')).toHaveLength(1);
    expect(solutions('knight').every((m) => m.kind === 3)).toBe(true);
    expect(solutions('silver')[0].to).toBe(squareOf(6, 6));
  });

  it('成るレッスン: 「成る」手だけが目標で、「成らない」手は目標にならない', () => {
    const lesson = LESSONS.find((l) => l.id === 'promote')!;
    const pos = buildPosition(lesson.setup);
    const toGoal = legalMoves(pos).filter((m) => m.to === lesson.goal!.target);
    expect(toGoal.map((m) => m.promote).sort()).toEqual([false, true]);
    expect(solutions('promote').every((m) => m.promote)).toBe(true);
  });

  it('打つレッスン: 持ち駒を打つ手だけが目標（盤上の駒を動かしても達成しない）', () => {
    expect(solutions('drop').every((m) => m.from < 0)).toBe(true);
    expect(buildPosition(LESSONS.find((l) => l.id === 'drop')!.setup).hands[0][PAWN]).toBe(1);
  });

  it('二歩のレッスン: 5筋には歩を打てず、6五には打てる', () => {
    const lesson = LESSONS.find((l) => l.id === 'rules')!;
    const drops = legalMoves(buildPosition(lesson.setup)).filter((m) => m.from < 0).map((m) => m.to);
    expect(drops).not.toContain(squareOf(5, 5));
    expect(drops).not.toContain(squareOf(5, 1 + 1));
    expect(drops).toContain(squareOf(6, 5));
    expect(lesson.illegalHint).toContain('二歩');
  });

  it('詰みのレッスン: 3一に飛を動かすと詰みになる（成る・成らないのどちらでも）', () => {
    const sols = solutions('mate');
    expect(sols.length).toBe(2);
    expect(sols.map((m) => m.promote).sort()).toEqual([false, true]);
  });

  it('詰みでない手は、目標にならない', () => {
    const lesson = LESSONS.find((l) => l.id === 'mate')!;
    const pos = buildPosition(lesson.setup);
    const other = legalMoves(pos).find((m) => m.to !== lesson.goal!.target)!;
    expect(isGoal(lesson.goal!, other, applyMove(pos, other))).toBe(false);
  });
});
