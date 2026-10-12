// CPU の思考ルーチン。駒の価値と少しの形の良し悪しで評価し、α-β 法で先読みする。
// 時間がかかりすぎないよう、持ち時間の中で深さを 1 手ずつ増やす（反復深化）。
import {
  GOLD,
  KING,
  PAWN,
  SILVER,
  SQUARES,
  type Move,
  type Position,
  type Side,
  cellKind,
  cellSide,
  colOf,
  isInCheck,
  legalMoves,
  makeMove,
  pseudoMoves,
  rowOf,
  unmakeMove,
} from './shogi';

export interface AiLevel {
  /** 先読みする手数の上限 */
  depth: number;
  /** 考える時間の上限(ミリ秒) */
  ms: number;
  /** 評価にまぜる「うっかり」の大きさ（歩 = 100）。大きいほど弱い */
  noise: number;
  /** 駒の取り合いの先まで読むか */
  quiet: boolean;
}

/** 1〜8。ストーリーは話が進むほど強く、自由対局は 2 / 4 / 6 / 8 */
export const LEVELS: AiLevel[] = [
  { depth: 1, ms: 200, noise: 500, quiet: false },
  { depth: 1, ms: 200, noise: 180, quiet: false },
  { depth: 2, ms: 500, noise: 150, quiet: false },
  { depth: 2, ms: 700, noise: 50, quiet: true },
  { depth: 3, ms: 900, noise: 30, quiet: true },
  { depth: 3, ms: 1200, noise: 0, quiet: true },
  { depth: 4, ms: 1500, noise: 0, quiet: true },
  { depth: 5, ms: 2200, noise: 0, quiet: true },
];

export const levelOf = (n: number): AiLevel => LEVELS[Math.min(Math.max(Math.round(n), 1), LEVELS.length) - 1];

// 駒の価値（歩 = 100）。添字は駒の種類
const VALUE = [0, 100, 430, 450, 640, 690, 890, 1040, 0, 420, 630, 640, 670, 1150, 1300];
const HAND_VALUE = [0, 110, 470, 490, 690, 740, 960, 1120, 0];
const MATE = 100000;
const INF = 1000000;

function evaluate(board: Uint8Array, hands: [Uint8Array, Uint8Array], side: Side): number {
  let score = 0;
  const kings: number[] = [-1, -1];
  for (let sq = 0; sq < SQUARES; sq++) {
    const cell = board[sq];
    if (cell === 0) continue;
    const kind = cellKind(cell);
    const s = cellSide(cell);
    const progress = s === 0 ? 8 - rowOf(sq) : rowOf(sq);
    let v = VALUE[kind];
    if (kind === PAWN) v += progress * 5;
    else if (kind === KING) kings[s] = sq;
    score += s === side ? v : -v;
  }
  for (let kind = PAWN; kind <= 7; kind++) {
    score += (hands[side][kind] - hands[side === 0 ? 1 : 0][kind]) * HAND_VALUE[kind];
  }
  // 玉の近くに金銀がいると安全
  for (const s of [0, 1] as Side[]) {
    const k = kings[s];
    if (k < 0) continue;
    let guard = 0;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = rowOf(k) + dr;
        const c = colOf(k) + dc;
        if (r < 0 || r > 8 || c < 0 || c > 8) continue;
        const cell = board[r * 9 + c];
        if (cell !== 0 && cellSide(cell) === s && (cellKind(cell) === GOLD || cellKind(cell) === SILVER)) guard++;
      }
    }
    const progress = s === 0 ? 8 - rowOf(k) : rowOf(k);
    const safety = guard * 14 - progress * 8;
    score += s === side ? safety : -safety;
  }
  return score;
}

class Search {
  nodes = 0;
  aborted = false;
  constructor(
    readonly board: Uint8Array,
    readonly hands: [Uint8Array, Uint8Array],
    readonly deadline: number,
    readonly quiet: boolean,
  ) {}

  private tick(): void {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.aborted = true;
  }

  private order(moves: Move[]): Move[] {
    const keyOf = (m: Move): number => {
      const target = this.board[m.to];
      let k = 0;
      if (target !== 0) k += 10000 + VALUE[cellKind(target)] * 10 - VALUE[m.kind];
      if (m.promote) k += 800;
      return k;
    };
    return moves
      .map((m) => [keyOf(m), m] as const)
      .sort((a, b) => b[0] - a[0])
      .map(([, m]) => m);
  }

  /** side の立場での評価値（大きいほど良い） */
  negamax(side: Side, depth: number, alpha: number, beta: number, ply: number): number {
    this.tick();
    if (this.aborted) return 0;
    if (depth <= 0) return this.quiet ? this.quiescence(side, alpha, beta, 3) : evaluate(this.board, this.hands, side);
    const opp: Side = side === 0 ? 1 : 0;
    let legal = 0;
    for (const m of this.order(pseudoMoves(this.board, this.hands, side))) {
      const captured = makeMove(this.board, this.hands, side, m);
      if (isInCheck(this.board, side)) {
        unmakeMove(this.board, this.hands, side, m, captured);
        continue;
      }
      legal++;
      const score = -this.negamax(opp, depth - 1, -beta, -alpha, ply + 1);
      unmakeMove(this.board, this.hands, side, m, captured);
      if (this.aborted) return 0;
      if (score > alpha) alpha = score;
      if (alpha >= beta) return alpha;
    }
    // 動ける手がない = 詰み（将棋では動けないのも負け）
    return legal === 0 ? -(MATE - ply) : alpha;
  }

  /** 駒の取り合いが落ち着くまで読む */
  private quiescence(side: Side, alpha: number, beta: number, left: number): number {
    this.tick();
    if (this.aborted) return 0;
    const stand = evaluate(this.board, this.hands, side);
    if (left <= 0 || stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const opp: Side = side === 0 ? 1 : 0;
    const captures = pseudoMoves(this.board, this.hands, side).filter((m) => m.from >= 0 && this.board[m.to] !== 0);
    for (const m of this.order(captures)) {
      const captured = makeMove(this.board, this.hands, side, m);
      if (isInCheck(this.board, side)) {
        unmakeMove(this.board, this.hands, side, m, captured);
        continue;
      }
      const score = -this.quiescence(opp, -beta, -alpha, left - 1);
      unmakeMove(this.board, this.hands, side, m, captured);
      if (this.aborted) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }
}

/** 次の一手を選ぶ。指せる手がなければ null */
export function chooseMove(pos: Position, level: number, rng: () => number = Math.random): Move | null {
  const roots = legalMoves(pos);
  if (roots.length === 0) return null;
  if (roots.length === 1) return roots[0];
  const cfg = levelOf(level);
  const side = pos.turn;
  const opp: Side = side === 0 ? 1 : 0;
  const board = pos.board.slice();
  const hands: [Uint8Array, Uint8Array] = [pos.hands[0].slice(), pos.hands[1].slice()];
  const deadline = Date.now() + cfg.ms;

  let scored: { move: Move; score: number }[] = roots.map((move) => ({ move, score: 0 }));
  for (let depth = 1; depth <= cfg.depth; depth++) {
    const search = new Search(board, hands, deadline, cfg.quiet);
    const round: { move: Move; score: number }[] = [];
    let alpha = -INF;
    for (const { move } of scored) {
      const captured = makeMove(board, hands, side, move);
      // 「うっかり」を入れる弱い段階は、全部の手を同じ条件で評価する（枝刈りで差が見えなくならないように）
      const window = cfg.noise > 0 ? -INF : alpha;
      const score = -search.negamax(opp, depth - 1, -INF, -window, 1);
      unmakeMove(board, hands, side, move, captured);
      if (search.aborted) break;
      round.push({ move, score });
      if (score > alpha) alpha = score;
    }
    if (search.aborted) break; // 途中までしか読めなかった深さは使わない
    round.sort((a, b) => b.score - a.score);
    scored = round;
    if (round[0].score >= MATE - 100) break; // 詰みが見えたらそれで決まり
  }

  let best = scored[0];
  let bestValue = -Infinity;
  for (const s of scored) {
    const value = s.score + rng() * cfg.noise;
    if (value > bestValue) {
      bestValue = value;
      best = s;
    }
  }
  return best.move;
}
