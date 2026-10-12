// 将棋のルール。DOM に触れない。
// 盤は 81 マスの配列で、index = 段(0〜8、0 が盤の一番上) * 9 + 列(0〜8、0 が左端 = 9 筋)。
// 先手(0)は盤の下から上へ進む。駒は「種類 | 手番 << 4」の数で表し、0 は空きマス。

export type Side = 0 | 1;

export const PAWN = 1;
export const LANCE = 2;
export const KNIGHT = 3;
export const SILVER = 4;
export const GOLD = 5;
export const BISHOP = 6;
export const ROOK = 7;
export const KING = 8;

/** 成ったあとの種類（成れない駒は 0）。9 と金 / 10 成香 / 11 成桂 / 12 成銀 / 13 馬 / 14 龍 */
const PROMOTED = [0, 9, 10, 11, 12, 0, 13, 14, 0, 0, 0, 0, 0, 0, 0];
/** 成った駒を持ち駒にするときの元の種類 */
const BASE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 6, 7];

export const baseKind = (kind: number): number => BASE[kind];
export const canPromote = (kind: number): boolean => PROMOTED[kind] !== 0;
export const isPromoted = (kind: number): boolean => kind > KING;

export interface Move {
  /** 動かす前のマス。持ち駒を打つときは -1 */
  from: number;
  to: number;
  /** 動かす（打つ）駒の種類。成り駒が動くときは成り駒の種類 */
  kind: number;
  /** 成るか */
  promote: boolean;
}

export interface Position {
  board: Uint8Array;
  /** hands[手番][駒の種類 1〜7] = 枚数 */
  hands: [Uint8Array, Uint8Array];
  turn: Side;
}

export const SQUARES = 81;
export const rowOf = (sq: number): number => (sq / 9) | 0;
export const colOf = (sq: number): number => sq % 9;
export const cellKind = (cell: number): number => cell & 15;
export const cellSide = (cell: number): Side => (cell >> 4) as Side;
export const makeCell = (kind: number, side: Side): number => kind | (side << 4);

export function initialPosition(): Position {
  const board = new Uint8Array(SQUARES);
  const back = [LANCE, KNIGHT, SILVER, GOLD, KING, GOLD, SILVER, KNIGHT, LANCE];
  for (let c = 0; c < 9; c++) {
    board[c] = makeCell(back[c], 1);
    board[18 + c] = makeCell(PAWN, 1);
    board[54 + c] = makeCell(PAWN, 0);
    board[72 + c] = makeCell(back[c], 0);
  }
  // 飛は先手が 2 筋(右)、後手が 8 筋。角は先手が 8 筋、後手が 2 筋
  board[9 + 1] = makeCell(ROOK, 1);
  board[9 + 7] = makeCell(BISHOP, 1);
  board[63 + 1] = makeCell(BISHOP, 0);
  board[63 + 7] = makeCell(ROOK, 0);
  return { board, hands: [new Uint8Array(9), new Uint8Array(9)], turn: 0 };
}

export function clonePosition(pos: Position): Position {
  return { board: pos.board.slice(), hands: [pos.hands[0].slice(), pos.hands[1].slice()], turn: pos.turn };
}

// ---- 駒の動き（前方向が +、列は左が -） ----
type Dir = readonly [number, number];
const GOLD_STEPS: Dir[] = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [0, -1]];
const DIAGONALS: Dir[] = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
const ORTHOGONALS: Dir[] = [[0, 1], [0, -1], [-1, 0], [1, 0]];

const STEPS: Dir[][] = [];
const SLIDES: Dir[][] = [];
for (let k = 0; k <= 14; k++) {
  STEPS[k] = [];
  SLIDES[k] = [];
}
STEPS[PAWN] = [[0, 1]];
SLIDES[LANCE] = [[0, 1]];
STEPS[KNIGHT] = [[-1, 2], [1, 2]];
STEPS[SILVER] = [[-1, 1], [0, 1], [1, 1], [-1, -1], [1, -1]];
STEPS[GOLD] = GOLD_STEPS;
SLIDES[BISHOP] = DIAGONALS;
SLIDES[ROOK] = ORTHOGONALS;
STEPS[KING] = [...DIAGONALS, ...ORTHOGONALS];
for (const k of [9, 10, 11, 12]) STEPS[k] = GOLD_STEPS;
SLIDES[13] = DIAGONALS;
STEPS[13] = ORTHOGONALS;
SLIDES[14] = ORTHOGONALS;
STEPS[14] = DIAGONALS;

const inZone = (side: Side, row: number): boolean => (side === 0 ? row <= 2 : row >= 6);

/** その段に進むと、それ以上動けなくなる（= 必ず成る / 打てない）か */
function stuck(kind: number, side: Side, row: number): boolean {
  const ahead = side === 0 ? row : 8 - row; // 敵陣の奥から数えた段（0 が一番奥）
  if (kind === PAWN || kind === LANCE) return ahead === 0;
  if (kind === KNIGHT) return ahead <= 1;
  return false;
}

function pushBoardMoves(out: Move[], side: Side, from: number, to: number, kind: number): void {
  const toRow = rowOf(to);
  if (PROMOTED[kind] !== 0 && (inZone(side, toRow) || inZone(side, rowOf(from)))) {
    out.push({ from, to, kind, promote: true });
  }
  if (!stuck(kind, side, toRow)) out.push({ from, to, kind, promote: false });
}

/** 王手を放置してもよい「疑似合法手」。盤の動きと持ち駒を打つ手を、二歩を除いて作る。 */
export function pseudoMoves(board: Uint8Array, hands: [Uint8Array, Uint8Array], side: Side): Move[] {
  const out: Move[] = [];
  const fwd = side === 0 ? -1 : 1;
  const pawnCols: boolean[] = new Array<boolean>(9).fill(false);
  const pawnCell = makeCell(PAWN, side);
  for (let sq = 0; sq < SQUARES; sq++) {
    const cell = board[sq];
    if (cell === 0 || cellSide(cell) !== side) continue;
    const kind = cellKind(cell);
    if (cell === pawnCell) pawnCols[colOf(sq)] = true;
    const col = colOf(sq);
    const row = rowOf(sq);
    for (const [dc, df] of STEPS[kind]) {
      const c = col + dc;
      const r = row + df * fwd;
      if (c < 0 || c > 8 || r < 0 || r > 8) continue;
      const to = r * 9 + c;
      const target = board[to];
      if (target !== 0 && cellSide(target) === side) continue;
      pushBoardMoves(out, side, sq, to, kind);
    }
    for (const [dc, df] of SLIDES[kind]) {
      let c = col + dc;
      let r = row + df * fwd;
      while (c >= 0 && c <= 8 && r >= 0 && r <= 8) {
        const to = r * 9 + c;
        const target = board[to];
        if (target !== 0 && cellSide(target) === side) break;
        pushBoardMoves(out, side, sq, to, kind);
        if (target !== 0) break;
        c += dc;
        r += df * fwd;
      }
    }
  }
  const hand = hands[side];
  for (let kind = PAWN; kind <= ROOK; kind++) {
    if (hand[kind] === 0) continue;
    for (let to = 0; to < SQUARES; to++) {
      if (board[to] !== 0) continue;
      if (stuck(kind, side, rowOf(to))) continue;
      if (kind === PAWN && pawnCols[colOf(to)]) continue; // 二歩
      out.push({ from: -1, to, kind, promote: false });
    }
  }
  return out;
}

/** 盤を直接書き換えて手を指す。取った駒（なければ 0）を返す。unmakeMove で元に戻せる。 */
export function makeMove(board: Uint8Array, hands: [Uint8Array, Uint8Array], side: Side, m: Move): number {
  if (m.from < 0) {
    board[m.to] = makeCell(m.kind, side);
    hands[side][m.kind]--;
    return 0;
  }
  const captured = board[m.to];
  if (captured !== 0) hands[side][BASE[cellKind(captured)]]++;
  board[m.to] = makeCell(m.promote ? PROMOTED[m.kind] : m.kind, side);
  board[m.from] = 0;
  return captured;
}

export function unmakeMove(board: Uint8Array, hands: [Uint8Array, Uint8Array], side: Side, m: Move, captured: number): void {
  if (m.from < 0) {
    board[m.to] = 0;
    hands[side][m.kind]++;
    return;
  }
  board[m.from] = makeCell(m.kind, side);
  board[m.to] = captured;
  if (captured !== 0) hands[side][BASE[cellKind(captured)]]--;
}

/** sq のマスに by 側の駒が利いているか（sq から逆向きにたどって調べる） */
export function isAttacked(board: Uint8Array, sq: number, by: Side): boolean {
  const fwd = by === 0 ? -1 : 1;
  const col = colOf(sq);
  const row = rowOf(sq);
  for (let kind = PAWN; kind <= 14; kind++) {
    const mine = makeCell(kind, by);
    for (const [dc, df] of STEPS[kind]) {
      const c = col - dc;
      const r = row - df * fwd;
      if (c >= 0 && c <= 8 && r >= 0 && r <= 8 && board[r * 9 + c] === mine) return true;
    }
    for (const [dc, df] of SLIDES[kind]) {
      let c = col - dc;
      let r = row - df * fwd;
      while (c >= 0 && c <= 8 && r >= 0 && r <= 8) {
        const cell = board[r * 9 + c];
        if (cell !== 0) {
          if (cell === mine) return true;
          break;
        }
        c -= dc;
        r -= df * fwd;
      }
    }
  }
  return false;
}

export function findKing(board: Uint8Array, side: Side): number {
  const king = makeCell(KING, side);
  for (let sq = 0; sq < SQUARES; sq++) if (board[sq] === king) return sq;
  return -1;
}

export function isInCheck(board: Uint8Array, side: Side): boolean {
  const k = findKing(board, side);
  return k >= 0 && isAttacked(board, k, side === 0 ? 1 : 0);
}

const other = (side: Side): Side => (side === 0 ? 1 : 0);

/** 王手を外せる手が 1 つでもあるか（打ち歩詰めの判定には使わない = 相手の打ち歩詰めは考えない） */
function hasLegalMove(board: Uint8Array, hands: [Uint8Array, Uint8Array], side: Side): boolean {
  for (const m of pseudoMoves(board, hands, side)) {
    const captured = makeMove(board, hands, side, m);
    const ok = !isInCheck(board, side);
    unmakeMove(board, hands, side, m, captured);
    if (ok) return true;
  }
  return false;
}

/** 合法手（自玉を王手にしない・二歩でない・打ち歩詰めでない手）の一覧 */
export function legalMoves(pos: Position): Move[] {
  const side = pos.turn;
  const board = pos.board.slice();
  const hands: [Uint8Array, Uint8Array] = [pos.hands[0].slice(), pos.hands[1].slice()];
  const out: Move[] = [];
  for (const m of pseudoMoves(board, hands, side)) {
    const captured = makeMove(board, hands, side, m);
    let ok = !isInCheck(board, side);
    if (ok && m.from < 0 && m.kind === PAWN && isInCheck(board, other(side)) && !hasLegalMove(board, hands, other(side))) {
      ok = false; // 打ち歩詰め
    }
    unmakeMove(board, hands, side, m, captured);
    if (ok) out.push(m);
  }
  return out;
}

export function applyMove(pos: Position, m: Move): Position {
  const next = clonePosition(pos);
  makeMove(next.board, next.hands, pos.turn, m);
  next.turn = other(pos.turn);
  return next;
}

export const sameMove = (a: Move, b: Move): boolean => a.from === b.from && a.to === b.to && a.kind === b.kind && a.promote === b.promote;

/** 同じ局面かを比べるための文字列（盤・持ち駒・手番） */
export function positionKey(pos: Position): string {
  return `${pos.turn}|${String.fromCharCode(...pos.board)}|${pos.hands[0].join('')}|${pos.hands[1].join('')}`;
}

export function hasAnyLegalMove(pos: Position): boolean {
  return hasLegalMove(pos.board.slice(), [pos.hands[0].slice(), pos.hands[1].slice()], pos.turn);
}
