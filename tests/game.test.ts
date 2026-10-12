import { describe, expect, it } from 'vitest';
import { decodeMoves, describeResult, encodeMoves, gameFromMoves, newGame, playMove, resign, takeBack, type Game } from '../src/game';
import { KING, PAWN, ROOK, legalMoves, makeCell, type Move } from '../src/shogi';

const sq = (file: number, rank: number): number => (rank - 1) * 9 + (9 - file);

function play(game: Game, from: [number, number] | null, to: [number, number], opt: { kind?: number; promote?: boolean } = {}): Game {
  const f = from ? sq(from[0], from[1]) : -1;
  const t = sq(to[0], to[1]);
  const m = legalMoves(game.pos).find((o) => o.from === f && o.to === t && (opt.kind === undefined || o.kind === opt.kind) && o.promote === (opt.promote ?? false));
  if (!m) throw new Error(`not legal: ${String(from)} -> ${String(to)}`);
  return playMove(game, m);
}

describe('棋譜の文字', () => {
  it('▲７六歩 → △３四歩 → ▲２二角成', () => {
    let g = newGame();
    g = play(g, [7, 7], [7, 6]);
    g = play(g, [3, 3], [3, 4]);
    g = play(g, [8, 8], [2, 2], { promote: true });
    expect(g.notes).toEqual(['▲７六歩', '△３四歩', '▲２二角成']);
  });

  it('直前の手と同じマスに指すときは「同」と書く', () => {
    let g = newGame();
    g = play(g, [7, 7], [7, 6]);
    g = play(g, [3, 3], [3, 4]);
    g = play(g, [8, 8], [2, 2], { promote: true });
    g = play(g, [3, 1], [2, 2]);
    expect(g.notes[3]).toBe('△同銀');
  });
});

describe('終局', () => {
  it('投了すると相手の勝ち', () => {
    const g = resign(newGame(), 0);
    expect(g.result).toEqual({ winner: 1, reason: 'resign' });
  });

  it('頭金などで詰むと、指した側の勝ち（詰み）', () => {
    // 先手の飛車2枚（段で押さえる・端から王手）で、後手玉を詰ます
    const g0 = newGame();
    g0.pos.board.fill(0);
    g0.pos.board[sq(5, 9)] = makeCell(KING, 0);
    g0.pos.board[sq(1, 1)] = makeCell(KING, 1);
    g0.pos.board[sq(9, 2)] = makeCell(ROOK, 0);
    g0.pos.board[sq(3, 3)] = makeCell(ROOK, 0);
    const m = legalMoves(g0.pos).find((o) => o.from === sq(3, 3) && o.to === sq(3, 1) && !o.promote);
    expect(m).toBeDefined();
    const g1 = playMove(g0, m!);
    expect(g1.checks[0]).toBe(true);
    expect(g1.result).toEqual({ winner: 0, reason: 'checkmate' });
  });

  it('同じ局面が 4 回くり返されると千日手（引き分け）', () => {
    let g = newGame();
    for (let i = 0; i < 3; i++) {
      g = play(g, [2, 8], [3, 8]);
      g = play(g, [8, 2], [7, 2]);
      g = play(g, [3, 8], [2, 8]);
      g = play(g, [7, 2], [8, 2]);
    }
    expect(g.result).toEqual({ winner: null, reason: 'sennichite' });
  });
});

describe('保存と巻き戻し', () => {
  it('手の列を保存形にして、読み戻せる', () => {
    let g = newGame();
    g = play(g, [7, 7], [7, 6]);
    g = play(g, [3, 3], [3, 4]);
    const back = decodeMoves(JSON.parse(JSON.stringify(encodeMoves(g.moves))));
    expect(back).toEqual(g.moves);
    const again = gameFromMoves(back as Move[]);
    expect(again?.notes).toEqual(g.notes);
  });

  it('おかしい保存データは読み込まない', () => {
    expect(decodeMoves('x')).toBeNull();
    expect(decodeMoves([[1, 2, 3]])).toBeNull();
    expect(decodeMoves([[1, 2, 3, 'a']])).toBeNull();
    expect(gameFromMoves([{ from: 0, to: 80, kind: PAWN, promote: false }])).toBeNull();
  });

  it('n 手戻す', () => {
    let g = newGame();
    g = play(g, [7, 7], [7, 6]);
    g = play(g, [3, 3], [3, 4]);
    const t = takeBack(g, 2);
    expect(t.moves).toHaveLength(0);
    expect(t.pos.turn).toBe(0);
  });
});

describe('結果の文言', () => {
  it('自分が勝ったか負けたかを伝える', () => {
    expect(describeResult({ winner: 0, reason: 'checkmate' }, 0).title).toBe('勝ち！');
    expect(describeResult({ winner: 0, reason: 'checkmate' }, 1).title).toBe('負け…');
    expect(describeResult({ winner: null, reason: 'sennichite' }, 0).title).toBe('引き分け');
    expect(describeResult({ winner: 1, reason: 'resign' }, null).title).toBe('後手の勝ち');
  });
});
