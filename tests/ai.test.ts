import { describe, expect, it } from 'vitest';
import { chooseMove, levelOf, LEVELS } from '../src/ai';
import { GOLD, KING, ROOK, PAWN, applyMove, initialPosition, legalMoves, makeCell, type Position } from '../src/shogi';

const sq = (file: number, rank: number): number => (rank - 1) * 9 + (9 - file);
const empty = (): Position => ({ board: new Uint8Array(81), hands: [new Uint8Array(9), new Uint8Array(9)], turn: 0 });

describe('CPU', () => {
  it('強さは 8 段階あり、強いほど深く読む', () => {
    expect(LEVELS).toHaveLength(8);
    expect(levelOf(8).depth).toBeGreaterThan(levelOf(1).depth);
    expect(levelOf(99)).toBe(LEVELS[7]);
    expect(levelOf(0)).toBe(LEVELS[0]);
  });

  it('初期局面でも、いつも合法手を返す', () => {
    for (const level of [1, 4, 6]) {
      const pos = initialPosition();
      const m = chooseMove(pos, level, () => 0.5);
      expect(m).not.toBeNull();
      expect(legalMoves(pos).some((o) => o.from === m!.from && o.to === m!.to && o.promote === m!.promote)).toBe(true);
    }
  });

  it('一手で詰ませられるなら詰ませる（強い段階）', () => {
    // 後手玉 1一、先手の飛が 9二 と 3三。3三→3一 で詰み
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(9, 2)] = makeCell(ROOK, 0);
    pos.board[sq(3, 3)] = makeCell(ROOK, 0);
    const m = chooseMove(pos, 6, () => 0.5)!;
    expect(legalMoves(applyMove(pos, m))).toHaveLength(0);
  });

  it('ただで取れる駒は取る（強い段階）', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(5, 5)] = makeCell(ROOK, 0);
    pos.board[sq(5, 2)] = makeCell(GOLD, 1); // 守りのない金
    const m = chooseMove(pos, 5, () => 0.5)!;
    expect(m.to).toBe(sq(5, 2));
  });

  it('取られそうな駒を、ただで取られる場所に動かさない（ふつう以上）', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(5, 5)] = makeCell(ROOK, 0);
    pos.board[sq(5, 1)] = makeCell(ROOK, 1);
    pos.board[sq(7, 5)] = makeCell(PAWN, 1);
    const m = chooseMove(pos, 4, () => 0.5)!;
    const after = applyMove(pos, m);
    // 指したあとに、先手の飛車がただで取られる形になっていない
    const lost = legalMoves(after).some((o) => o.to === m.to && after.board[o.to] !== 0 && m.kind === ROOK && m.from >= 0 && !legalMoves(applyMove(after, o)).some((r) => r.to === o.to));
    expect(lost).toBe(false);
  });
});
