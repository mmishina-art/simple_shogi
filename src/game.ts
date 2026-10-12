// 対局の記録（指し手・終局判定・棋譜の文字）。DOM に触れない。
import {
  KING,
  type Move,
  type Position,
  type Side,
  applyMove,
  canPromote,
  colOf,
  hasAnyLegalMove,
  initialPosition,
  isInCheck,
  isPromoted,
  legalMoves,
  positionKey,
  rowOf,
  sameMove,
} from './shogi';

export type EndReason = 'checkmate' | 'resign' | 'sennichite' | 'perpetual' | 'maxmoves';

export interface Result {
  /** 勝った側。引き分けは null */
  winner: Side | null;
  reason: EndReason;
}

export interface Game {
  pos: Position;
  moves: Move[];
  /** moves[i] を指したあとに王手になったか */
  checks: boolean[];
  /** 棋譜の文字（▲７六歩 など） */
  notes: string[];
  /** keys[i] = i 手目まで指したあとの局面（keys[0] は初期局面） */
  keys: string[];
  result: Result | null;
}

/** この手数まで進んだら引き分けにする（終わらない対局を防ぐ） */
export const MAX_MOVES = 400;

export function newGame(): Game {
  const pos = initialPosition();
  return { pos, moves: [], checks: [], notes: [], keys: [positionKey(pos)], result: null };
}

// ---- 棋譜の文字 ----
const KIND_NAMES = ['', '歩', '香', '桂', '銀', '金', '角', '飛', '玉', 'と', '成香', '成桂', '成銀', '馬', '龍'];
const FULL_DIGITS = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
const RANK_NAMES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 駒の名前。王は後手（盤の上側）だけ「王」と書く */
export function pieceName(kind: number, side: Side): string {
  return kind === KING && side === 1 ? '王' : KIND_NAMES[kind];
}

/** 盤の左端が 9 筋、一番上の段が 1 段 */
export const fileOf = (sq: number): number => 9 - colOf(sq);
export const rankOf = (sq: number): number => rowOf(sq) + 1;
export const squareName = (sq: number): string => `${fileOf(sq)}${RANK_NAMES[rankOf(sq)]}`;
const fullSquare = (sq: number): string => `${FULL_DIGITS[fileOf(sq)]}${RANK_NAMES[rankOf(sq)]}`;

export function formatMove(pos: Position, m: Move, prev: Move | null): string {
  const side = pos.turn;
  const mark = side === 0 ? '▲' : '△';
  const name = pieceName(m.kind, side);
  const where = prev && prev.to === m.to ? '同' : fullSquare(m.to);
  if (m.from < 0) {
    // 同じ駒を盤上から動かせる手があるときだけ「打」と書く
    const movable = legalMoves(pos).some((o) => o.from >= 0 && o.to === m.to && o.kind === m.kind);
    return `${mark}${where}${name}${movable ? '打' : ''}`;
  }
  // 同じ種類の駒が同じマスに動ける手があるときは、元のマスを添える
  const ambiguous = legalMoves(pos).some((o) => o.from >= 0 && o.from !== m.from && o.to === m.to && o.kind === m.kind);
  const origin = ambiguous ? `(${fileOf(m.from)}${rankOf(m.from)})` : '';
  const suffix = m.promote ? '成' : canPromote(m.kind) && !isPromoted(m.kind) && couldPromote(pos, m) ? '不成' : '';
  return `${mark}${where}${name}${suffix}${origin}`;
}

function couldPromote(pos: Position, m: Move): boolean {
  return legalMoves(pos).some((o) => o.from === m.from && o.to === m.to && o.promote);
}

// ---- 指す・終局判定 ----

/** 合法な手を 1 手指して、新しい対局を返す */
export function playMove(game: Game, m: Move): Game {
  const side = game.pos.turn;
  const prev = game.moves.length > 0 ? game.moves[game.moves.length - 1] : null;
  const note = formatMove(game.pos, m, prev);
  const pos = applyMove(game.pos, m);
  const check = isInCheck(pos.board, pos.turn);
  const key = positionKey(pos);
  const next: Game = {
    pos,
    moves: [...game.moves, m],
    checks: [...game.checks, check],
    notes: [...game.notes, note],
    keys: [...game.keys, key],
    result: null,
  };
  next.result = judge(next, side);
  return next;
}

function judge(game: Game, mover: Side): Result | null {
  if (!hasAnyLegalMove(game.pos)) return { winner: mover, reason: 'checkmate' };
  const n = game.moves.length;
  const key = game.keys[n];
  const first = game.keys.indexOf(key);
  if (game.keys.filter((k) => k === key).length >= 4) {
    // 同じ局面が 4 回目: 千日手。ただし片方だけが王手をかけ続けていたら、その側の負け（連続王手の千日手）。
    const sides: [boolean, boolean] = [true, true];
    for (let i = first; i < n; i++) {
      const s = Number(game.keys[i][0]) as Side;
      if (!game.checks[i]) sides[s] = false;
    }
    if (sides[0] && !sides[1]) return { winner: 1, reason: 'perpetual' };
    if (sides[1] && !sides[0]) return { winner: 0, reason: 'perpetual' };
    return { winner: null, reason: 'sennichite' };
  }
  if (n >= MAX_MOVES) return { winner: null, reason: 'maxmoves' };
  return null;
}

export function resign(game: Game, side: Side): Game {
  return { ...game, result: { winner: side === 0 ? 1 : 0, reason: 'resign' } };
}

/** 指し手の列から対局を作り直す。合法でない手があれば null */
export function gameFromMoves(moves: Move[]): Game | null {
  let game = newGame();
  for (const m of moves) {
    if (game.result) return null;
    if (!legalMoves(game.pos).some((o) => sameMove(o, m))) return null;
    game = playMove(game, m);
  }
  return game;
}

/** n 手目まで戻した対局 */
export function takeBack(game: Game, n: number): Game {
  return gameFromMoves(game.moves.slice(0, Math.max(0, game.moves.length - n))) ?? newGame();
}

// ---- 保存用の形 ----
export type SavedMove = [number, number, number, number];

export const encodeMoves = (moves: Move[]): SavedMove[] => moves.map((m) => [m.from, m.to, m.kind, m.promote ? 1 : 0]);

/** 保存された手を読み戻す。形がおかしければ null */
export function decodeMoves(raw: unknown): Move[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_MOVES) return null;
  const moves: Move[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 4 || !item.every((v) => Number.isInteger(v))) return null;
    const [from, to, kind, promote] = item as number[];
    moves.push({ from, to, kind, promote: promote === 1 });
  }
  return moves;
}

export function describeResult(result: Result, human: Side | null): { title: string; detail: string } {
  const sideName = (s: Side): string => (s === 0 ? '先手' : '後手');
  if (result.winner === null) {
    return { title: '引き分け', detail: result.reason === 'maxmoves' ? '手数が長くなりすぎたため、引き分けです' : '同じ形が4回くり返された（千日手）ため、引き分けです' };
  }
  const detail =
    result.reason === 'checkmate' ? '詰みです' : result.reason === 'resign' ? '投了しました' : '連続王手の千日手は、王手をかけ続けた側の負けです';
  if (human === null) return { title: `${sideName(result.winner)}の勝ち`, detail };
  return { title: result.winner === human ? '勝ち！' : '負け…', detail };
}
