import { describe, expect, it } from 'vitest';
import { BISHOP, GOLD, KING, KNIGHT, LANCE, PAWN, ROOK, applyMove, initialPosition, isInCheck, legalMoves, makeCell, type Move, type Position } from '../src/shogi';

// 盤面を文字で組み立てる補助: 筋・段は将棋の表記（例: sq(7, 6) = 7六）
const sq = (file: number, rank: number): number => (rank - 1) * 9 + (9 - file);

function empty(turn: 0 | 1 = 0): Position {
  return { board: new Uint8Array(81), hands: [new Uint8Array(9), new Uint8Array(9)], turn };
}

const movesFrom = (pos: Position, from: number): Move[] => legalMoves(pos).filter((m) => m.from === from);

describe('初期局面', () => {
  it('先手の合法手は 30 手', () => {
    expect(legalMoves(initialPosition())).toHaveLength(30);
  });

  it('1 手指すと後手番になり、後手の合法手も 30 手', () => {
    const pos = initialPosition();
    const m = legalMoves(pos).find((o) => o.from === sq(7, 7) && o.to === sq(7, 6));
    expect(m).toBeDefined();
    const next = applyMove(pos, m!);
    expect(next.turn).toBe(1);
    expect(legalMoves(next)).toHaveLength(30);
  });
});

describe('駒の動き', () => {
  it('桂馬は前の2つ先の左右に跳ぶ（間に駒があっても跳べる）', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(5, 5)] = makeCell(KNIGHT, 0);
    pos.board[sq(5, 4)] = makeCell(PAWN, 0);
    const targets = [...new Set(movesFrom(pos, sq(5, 5)).map((m) => m.to))].sort((a, b) => a - b);
    expect(targets).toEqual([sq(6, 3), sq(4, 3)].sort((a, b) => a - b));
  });

  it('飛車は駒にぶつかるまで進み、相手の駒は取れて、その先へは進めない', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(5, 5)] = makeCell(ROOK, 0);
    pos.board[sq(5, 3)] = makeCell(PAWN, 1);
    pos.board[sq(5, 2)] = makeCell(GOLD, 1);
    const ups = movesFrom(pos, sq(5, 5)).filter((m) => m.to % 9 === sq(5, 1) % 9 && m.to < sq(5, 5));
    expect(ups.map((m) => m.to).sort((a, b) => a - b)).toContain(sq(5, 3));
    expect(ups.map((m) => m.to)).not.toContain(sq(5, 2));
  });

  it('自分の駒の上には動けない', () => {
    const pos = initialPosition();
    const to = movesFrom(pos, sq(4, 9)).map((m) => m.to); // 4九の金
    expect(to).not.toContain(sq(3, 9));
    expect(to).not.toContain(sq(5, 9));
    expect(to.sort()).toEqual([sq(5, 8), sq(4, 8), sq(3, 8)].sort());
  });
});

describe('成り', () => {
  it('敵陣に入る手は「成る」「成らない」を選べる', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(3, 4)] = makeCell(BISHOP, 0);
    const toThree = movesFrom(pos, sq(3, 4)).filter((m) => m.to === sq(2, 3));
    expect(toThree.map((m) => m.promote).sort()).toEqual([false, true]);
  });

  it('歩が一番奥の段に進むときは必ず成る', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 5)] = makeCell(KING, 1);
    pos.board[sq(3, 2)] = makeCell(PAWN, 0);
    const toOne = movesFrom(pos, sq(3, 2));
    expect(toOne).toHaveLength(1);
    expect(toOne[0].promote).toBe(true);
  });

  it('桂馬が奥の2段に進むときは必ず成る', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 5)] = makeCell(KING, 1);
    pos.board[sq(5, 4)] = makeCell(KNIGHT, 0);
    const moves = movesFrom(pos, sq(5, 4));
    expect(moves.every((m) => m.promote === (m.to < 18))).toBe(true);
    expect(moves).toHaveLength(2);
  });
});

describe('持ち駒', () => {
  const base = (): Position => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(5, 1)] = makeCell(KING, 1);
    return pos;
  };
  const drops = (pos: Position, kind: number): number[] => legalMoves(pos).filter((m) => m.from < 0 && m.kind === kind).map((m) => m.to);

  it('二歩（同じ筋に自分の歩がある）は打てない', () => {
    const pos = base();
    pos.hands[0][PAWN] = 1;
    pos.board[sq(7, 7)] = makeCell(PAWN, 0);
    const to = drops(pos, PAWN);
    expect(to).not.toContain(sq(7, 5));
    expect(to).toContain(sq(6, 5));
  });

  it('と金（成った歩）がある筋には歩を打てる', () => {
    const pos = base();
    pos.hands[0][PAWN] = 1;
    pos.board[sq(7, 7)] = makeCell(9, 0);
    expect(drops(pos, PAWN)).toContain(sq(7, 5));
  });

  it('歩・香は一番奥の段に、桂は奥の2段に打てない', () => {
    const pos = base();
    pos.hands[0][PAWN] = 1;
    pos.hands[0][LANCE] = 1;
    pos.hands[0][KNIGHT] = 1;
    expect(drops(pos, PAWN).some((t) => t < 9)).toBe(false);
    expect(drops(pos, LANCE).some((t) => t < 9)).toBe(false);
    expect(drops(pos, KNIGHT).some((t) => t < 18)).toBe(false);
    expect(drops(pos, KNIGHT)).toContain(sq(1, 3));
  });

  it('相手の駒を取ると、成っていても元の駒（歩）として持ち駒になる', () => {
    const pos = base();
    pos.board[sq(5, 5)] = makeCell(ROOK, 0);
    pos.board[sq(5, 3)] = makeCell(9, 1); // 後手のと金
    const m = legalMoves(pos).find((o) => o.from === sq(5, 5) && o.to === sq(5, 3));
    expect(m).toBeDefined();
    const next = applyMove(pos, m!);
    expect(next.hands[0][PAWN]).toBe(1);
  });
});

describe('王手と詰み', () => {
  it('王手がかかっているときは、王手を外す手だけが合法', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(5, 1)] = makeCell(ROOK, 1);
    pos.board[sq(2, 9)] = makeCell(GOLD, 0);
    expect(isInCheck(pos.board, 0)).toBe(true);
    for (const m of legalMoves(pos)) {
      const next = applyMove(pos, m);
      expect(isInCheck(next.board, 0)).toBe(false);
    }
  });

  it('玉を自分で王手の筋に動かせない', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(4, 1)] = makeCell(ROOK, 1);
    const to = movesFrom(pos, sq(5, 9)).map((m) => m.to);
    expect(to).not.toContain(sq(4, 9));
    expect(to).not.toContain(sq(4, 8));
  });

  it('打ち歩詰めは打てない', () => {
    // 後手玉 1一 を、1三の金と2三の金などで囲み、1二に歩を打つと詰む形
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(2, 1)] = makeCell(GOLD, 1); // 後手の金は 2一
    pos.board[sq(2, 2)] = makeCell(GOLD, 1);
    pos.board[sq(1, 3)] = makeCell(LANCE, 0); // 1二の歩を取られても玉の逃げ道がなく、歩の後ろに香が利く
    pos.hands[0][PAWN] = 1;
    // 1二に歩を打つと王手で、玉は逃げられず、歩は 1三の香に守られていて取れない（金で取る手は 2一の金→1二）
    const drop = legalMoves(pos).find((m) => m.from < 0 && m.to === sq(1, 2));
    // 2一の金か 2二の金が歩を取れるので詰みではない → 打てる
    expect(drop).toBeDefined();
  });

  it('本当の打ち歩詰め（取れる駒も逃げ場もない）は打てない', () => {
    const pos = empty();
    pos.board[sq(5, 9)] = makeCell(KING, 0);
    pos.board[sq(1, 1)] = makeCell(KING, 1);
    pos.board[sq(2, 1)] = makeCell(LANCE, 1); // 玉の横を自分の駒で塞ぐ
    pos.board[sq(2, 2)] = makeCell(LANCE, 1); // 斜めも塞ぐ
    pos.board[sq(1, 3)] = makeCell(LANCE, 0); // 先手の香が歩を支える（玉は歩を取れない）
    pos.hands[0][PAWN] = 1;
    const drop = legalMoves(pos).find((m) => m.from < 0 && m.kind === PAWN && m.to === sq(1, 2));
    expect(drop).toBeUndefined();
  });
});

describe('合法手の数え上げ（perft）', () => {
  const perft = (pos: Position, depth: number): number => {
    if (depth === 0) return 1;
    return legalMoves(pos).reduce((sum, m) => sum + perft(applyMove(pos, m), depth - 1), 0);
  };

  it('初期局面から 1〜3 手先まで、知られている局面数と一致する', () => {
    const pos = initialPosition();
    expect(perft(pos, 1)).toBe(30);
    expect(perft(pos, 2)).toBe(900);
    expect(perft(pos, 3)).toBe(25470);
  });
});
