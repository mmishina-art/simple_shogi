// 対局画面。盤・持ち駒の表示、駒の選択と移動、CPU の手番、待った・投了・棋譜。
// ルールの判定は shogi.ts / game.ts に任せ、ここは DOM の操作だけを持つ。
import { chooseMove } from './ai';
import { type Game, type Result, describeResult, newGame, gameFromMoves, playMove, pieceName, resign, squareName, takeBack, fileOf } from './game';
import { pieceElement } from './pieces';
import { BISHOP, GOLD, KNIGHT, LANCE, PAWN, ROOK, SILVER, SQUARES, type Move, type Side, cellKind, cellSide, findKing, isInCheck, legalMoves } from './shogi';
import { playSound } from './sound';
import { askDialog, byId } from './ui';

export interface PlayConfig {
  mode: 'cpu' | 'two';
  /** CPU の強さ（1〜8） */
  level: number;
  /** CPU 対戦で、人間が持つ側 */
  human: Side;
  title: string;
  /** CPU 対戦での相手の名前 */
  opponentName: string;
  /** 途中から再開するときの指し手 */
  moves?: Move[];
  onMove(game: Game): void;
  onEnd(game: Game): void;
  onExit(): void;
}

type Selection = { kind: 'board'; sq: number } | { kind: 'hand'; piece: number } | null;

const HAND_ORDER = [ROOK, BISHOP, GOLD, SILVER, KNIGHT, LANCE, PAWN];
const RANKS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

let cfg: PlayConfig;
let game: Game = newGame();
let legal: Move[] = [];
let selection: Selection = null;
let thinking = false;
/** 古い CPU の思考結果や遅延処理を無効にするための番号 */
let token = 0;

const cells: HTMLButtonElement[] = [];
let boardEl: HTMLElement;

/** 画面の下側に置く手番（盤の向き）。CPU 戦は人間の側、ふたり対戦は先手 */
const viewSide = (): Side => (cfg.mode === 'cpu' ? cfg.human : 0);
const sqAt = (visual: number): number => (viewSide() === 0 ? visual : SQUARES - 1 - visual);
const isHumanSide = (side: Side): boolean => cfg.mode === 'two' || side === cfg.human;
const canAct = (): boolean => !game.result && !thinking && isHumanSide(game.pos.turn);
const sideName = (s: Side): string => (s === 0 ? '先手' : '後手');

export function initPlay(): void {
  boardEl = byId('board');
  for (let v = 0; v < SQUARES; v++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.visual = String(v);
    cell.addEventListener('click', () => onCell(sqAt(v)));
    boardEl.append(cell);
    cells.push(cell);
  }
  byId('btn-undo').addEventListener('click', undo);
  byId('btn-kifu').addEventListener('click', showKifu);
  byId('btn-resign').addEventListener('click', () => void confirmResign());
  byId('game-back').addEventListener('click', () => {
    stopPlay();
    cfg.onExit();
  });
}

/** CPU の思考や待ち時間を止める（画面を離れるとき） */
export function stopPlay(): void {
  token++;
  thinking = false;
}

export function currentGame(): Game {
  return game;
}

export function startPlay(config: PlayConfig): void {
  stopPlay();
  cfg = config;
  game = (config.moves && gameFromMoves(config.moves)) || newGame();
  selection = null;
  byId('game-title').textContent = config.title;
  buildLabels();
  refresh();
  maybeCpu();
}

function buildLabels(): void {
  const files = byId('file-labels');
  const ranks = byId('rank-labels');
  files.replaceChildren();
  ranks.replaceChildren();
  for (let v = 0; v < 9; v++) {
    const f = document.createElement('span');
    f.textContent = String(fileOf(sqAt(v)));
    files.append(f);
    const r = document.createElement('span');
    r.textContent = RANKS[sqAt(v * 9) / 9 | 0];
    ranks.append(r);
  }
}

// ---- 表示 ----

function destinations(): Move[] {
  if (!selection || !canAct()) return [];
  const sel = selection;
  return legal.filter((m) => (sel.kind === 'board' ? m.from === sel.sq : m.from < 0 && m.kind === sel.piece));
}

function refresh(): void {
  legal = game.result ? [] : legalMoves(game.pos);
  render();
}

function render(): void {
  const dests = destinations();
  const destSet = new Set(dests.map((m) => m.to));
  const last = game.moves.length > 0 ? game.moves[game.moves.length - 1] : null;
  const view = viewSide();
  const turn = game.pos.turn;
  const checkSq = !game.result && isInCheck(game.pos.board, turn) ? findKing(game.pos.board, turn) : -1;

  for (let v = 0; v < SQUARES; v++) {
    const sq = sqAt(v);
    const cell = cells[v];
    const code = game.pos.board[sq];
    const piece = code === 0 ? null : { kind: cellKind(code), side: cellSide(code) };
    if (piece) cell.replaceChildren(pieceElement(piece.kind, piece.side, piece.side !== view));
    else cell.replaceChildren();
    const isSel = selection?.kind === 'board' && selection.sq === sq;
    cell.classList.toggle('sel', isSel);
    cell.classList.toggle('dest', destSet.has(sq));
    cell.classList.toggle('cap', destSet.has(sq) && piece !== null);
    cell.classList.toggle('last', !!last && (last.to === sq || last.from === sq));
    cell.classList.toggle('check', sq === checkSq);
    const name = piece ? `${pieceName(piece.kind, piece.side)}(${sideName(piece.side)})` : '空き';
    cell.setAttribute('aria-label', `${squareName(sq)} ${name}${destSet.has(sq) ? ' 動かせる' : ''}`);
    cell.setAttribute('aria-pressed', String(isSel));
  }

  renderHand('top', view === 0 ? 1 : 0);
  renderHand('bottom', view);

  const bottomName = cfg.mode === 'cpu' ? 'あなた' : sideName(view);
  const topName = cfg.mode === 'cpu' ? cfg.opponentName : sideName(view === 0 ? 1 : 0);
  byId('name-bottom').textContent = `${view === 0 ? '☗' : '☖'} ${bottomName}`;
  byId('name-top').textContent = `${view === 0 ? '☖' : '☗'} ${topName}`;
  byId('panel-bottom').classList.toggle('active', !game.result && turn === view);
  byId('panel-top').classList.toggle('active', !game.result && turn !== view);

  byId('status').textContent = statusText(checkSq >= 0);
  (byId('btn-undo') as HTMLButtonElement).disabled = !canUndo();
  (byId('btn-resign') as HTMLButtonElement).disabled = !!game.result || thinking;
  (byId('btn-kifu') as HTMLButtonElement).disabled = game.moves.length === 0;
}

function renderHand(where: 'top' | 'bottom', side: Side): void {
  const el = byId(`hand-${where}`);
  el.replaceChildren();
  const hand = game.pos.hands[side];
  const flip = side !== viewSide();
  const interactive = canAct() && game.pos.turn === side;
  let any = false;
  for (const kind of HAND_ORDER) {
    const n = hand[kind];
    if (n === 0) continue;
    any = true;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hand-piece';
    b.disabled = !interactive;
    const selected = selection?.kind === 'hand' && selection.piece === kind && interactive;
    b.classList.toggle('sel', selected);
    b.setAttribute('aria-pressed', String(selected));
    b.setAttribute('aria-label', `持ち駒 ${pieceName(kind, side)} ${n}枚`);
    b.append(pieceElement(kind, side, flip));
    if (n > 1) {
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = String(n);
      b.append(count);
    }
    b.addEventListener('click', () => onHand(kind));
    el.append(b);
  }
  if (!any) {
    const none = document.createElement('span');
    none.className = 'hand-empty';
    none.textContent = '持ち駒なし';
    el.append(none);
  }
}

function statusText(inCheck: boolean): string {
  if (game.result) {
    const { title, detail } = describeResult(game.result, cfg.mode === 'cpu' ? cfg.human : null);
    return `${title} ${detail}`;
  }
  const last = game.notes.length > 0 ? `${game.notes[game.notes.length - 1]} ／ ` : '';
  const check = inCheck ? '王手！ ' : '';
  if (cfg.mode === 'cpu') return `${last}${check}${thinking ? `${cfg.opponentName}が考えています…` : game.pos.turn === cfg.human ? 'あなたの番です' : ''}`;
  return `${last}${check}${sideName(game.pos.turn)}の番です`;
}

// ---- 操作 ----

function onCell(sq: number): void {
  if (!canAct()) return;
  const dests = destinations().filter((m) => m.to === sq);
  if (dests.length > 0) {
    void choose(dests);
    return;
  }
  const code = game.pos.board[sq];
  if (code !== 0 && cellSide(code) === game.pos.turn) {
    const same = selection?.kind === 'board' && selection.sq === sq;
    selection = same ? null : { kind: 'board', sq };
    playSound('tap');
  } else {
    selection = null;
  }
  render();
}

function onHand(kind: number): void {
  if (!canAct()) return;
  const same = selection?.kind === 'hand' && selection.piece === kind;
  selection = same ? null : { kind: 'hand', piece: kind };
  playSound('tap');
  render();
}

/** 同じマスへの手が複数あるのは「成る / 成らない」のとき */
async function choose(candidates: Move[]): Promise<void> {
  let move = candidates[0];
  if (candidates.length > 1) {
    const answer = await askDialog(byId<HTMLDialogElement>('promote-dialog'));
    if (answer === '') return; // 取り消し
    move = candidates.find((m) => m.promote === (answer === 'yes')) ?? candidates[0];
  }
  commit(move);
}

function commit(move: Move): void {
  const captured = move.from >= 0 && game.pos.board[move.to] !== 0;
  game = playMove(game, move);
  selection = null;
  thinking = false;
  const last = game.checks[game.checks.length - 1];
  playSound(move.promote ? 'promote' : captured ? 'capture' : 'move');
  if (last && !game.result) window.setTimeout(() => playSound('check'), 160);
  refresh();
  cfg.onMove(game);
  if (game.result) finish(game.result);
  else maybeCpu();
}

function finish(result: Result): void {
  const myToken = ++token;
  const win = result.winner !== null && (cfg.mode === 'two' || result.winner === cfg.human);
  window.setTimeout(() => playSound(result.winner === null ? 'draw' : win ? 'win' : 'lose'), 250);
  // 最後の盤面を少し見せてから、結果を出す
  window.setTimeout(() => {
    if (myToken === token) cfg.onEnd(game);
  }, 900);
}

function maybeCpu(): void {
  if (cfg.mode !== 'cpu' || game.result || game.pos.turn === cfg.human) return;
  const myToken = ++token;
  thinking = true;
  render();
  // 「考え中」の表示を先に描画してから、重い計算を始める
  window.setTimeout(() => {
    if (myToken !== token) return;
    const move = chooseMove(game.pos, cfg.level);
    window.setTimeout(() => {
      if (myToken !== token) return;
      thinking = false;
      if (move) commit(move);
      else {
        refresh();
      }
    }, 250);
  }, 60);
}

// ---- 待った・投了・棋譜 ----

/** 戻したあとに人間の番になる手数（CPU 戦は 1 手か 2 手戻す） */
function undoCount(): number {
  const n = game.moves.length;
  if (cfg.mode === 'two') return n >= 1 ? 1 : 0;
  for (const back of [game.pos.turn === cfg.human ? 2 : 1, 1, 2]) {
    const remain = n - back;
    if (remain >= 0 && ((remain % 2 === 0 ? 0 : 1) as Side) === cfg.human) return back;
  }
  return 0;
}

function canUndo(): boolean {
  return !game.result && !thinking && undoCount() > 0;
}

function undo(): void {
  if (!canUndo()) return;
  token++;
  game = takeBack(game, undoCount());
  selection = null;
  playSound('tap');
  refresh();
  cfg.onMove(game);
  maybeCpu();
}

async function confirmResign(): Promise<void> {
  if (game.result || thinking) return;
  const who = cfg.mode === 'cpu' ? 'あなた' : sideName(game.pos.turn);
  const dialog = byId<HTMLDialogElement>('confirm-dialog');
  byId('confirm-text').textContent = `${who}は投了しますか？`;
  if ((await askDialog(dialog)) !== 'yes') return;
  if (game.result) return;
  game = resign(game, cfg.mode === 'cpu' ? cfg.human : game.pos.turn);
  selection = null;
  refresh();
  cfg.onMove(game);
  finish(game.result as Result);
}

function showKifu(): void {
  const list = byId('kifu-list');
  list.replaceChildren();
  for (const note of game.notes) {
    const li = document.createElement('li');
    li.textContent = note;
    list.append(li);
  }
  byId('kifu-empty').hidden = game.notes.length > 0;
  byId<HTMLDialogElement>('kifu-dialog').showModal();
}
