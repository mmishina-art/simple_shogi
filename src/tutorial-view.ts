// チュートリアルの画面。小さな練習盤で、レッスンの目標を達成するまで、駒を動かす。
// ルールの判定は shogi.ts に、レッスンの中身と目標の判定は tutorial.ts に任せ、ここは DOM の操作だけを持つ。
import { pieceElement } from './pieces';
import { pieceName, squareName } from './game';
import { BISHOP, GOLD, KNIGHT, LANCE, PAWN, ROOK, SILVER, SQUARES, type Move, type Position, applyMove, cellKind, cellSide, legalMoves } from './shogi';
import { playSound } from './sound';
import { LESSONS, type Lesson, buildPosition, isGoal } from './tutorial';
import { askDialog, byId } from './ui';

const HAND_ORDER = [ROOK, BISHOP, GOLD, SILVER, KNIGHT, LANCE, PAWN];
const RANKS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export interface TutorialHooks {
  /** レッスンをクリアしたとき（一覧の「できた」の印を保存する） */
  onDone(index: number): void;
  /** 一覧にもどる */
  onList(): void;
}

type Selection = { kind: 'board'; sq: number } | { kind: 'hand'; piece: number } | null;

let hooks: TutorialHooks;
let index = 0;
let lesson: Lesson = LESSONS[0];
let pos: Position = buildPosition(LESSONS[0].setup);
let legal: Move[] = [];
let selection: Selection = null;
let done = false;
/** 間違えたあと、盤をもとにもどすまでの間は、操作を受けつけない */
let busy = false;
let resetTimer = 0;
const cells: HTMLButtonElement[] = [];

export const lessonCount = (): number => LESSONS.length;

export function initTutorial(h: TutorialHooks): void {
  hooks = h;
  const board = byId('lesson-board');
  for (let sq = 0; sq < SQUARES; sq++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.addEventListener('click', () => void onCell(sq));
    board.append(cell);
    cells.push(cell);
  }
  const files = byId('lesson-file-labels');
  const ranks = byId('lesson-rank-labels');
  for (let i = 0; i < 9; i++) {
    const f = document.createElement('span');
    f.textContent = String(9 - i);
    files.append(f);
    const r = document.createElement('span');
    r.textContent = RANKS[i];
    ranks.append(r);
  }
  byId('lesson-reset').addEventListener('click', () => {
    playSound('tap');
    resetBoard('もういちど、やってみよう。');
  });
  byId('lesson-prev').addEventListener('click', () => open(index - 1));
  byId('lesson-next').addEventListener('click', () => {
    if (index === LESSONS.length - 1) h.onList();
    else open(index + 1);
  });
  byId('lesson-back').addEventListener('click', () => {
    window.clearTimeout(resetTimer);
    h.onList();
  });
}

/** レッスンを開く */
export function openLesson(i: number): void {
  open(i);
}

function open(i: number): void {
  if (i < 0 || i >= LESSONS.length) return;
  window.clearTimeout(resetTimer);
  index = i;
  lesson = LESSONS[i];
  done = lesson.goal === null;
  if (done) hooks.onDone(i);
  byId('lesson-title').textContent = `${i + 1}/${LESSONS.length} ${lesson.title}`;
  const text = byId('lesson-text');
  text.replaceChildren(
    ...lesson.text.map((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      return p;
    }),
  );
  const goal = byId('lesson-goal');
  goal.textContent = lesson.goalText ? `🎯 目標: ${lesson.goalText}` : '';
  goal.hidden = lesson.goalText === null;
  (byId('lesson-prev') as HTMLButtonElement).disabled = i === 0;
  byId('lesson-next').textContent = i === LESSONS.length - 1 ? 'おわる' : 'つぎへ';
  resetBoard(done ? '駒をタップして、動かしてみよう。' : '駒をタップして、目標のマス(点線)に動かそう。');
  window.scrollTo(0, 0);
}

function resetBoard(message: string): void {
  window.clearTimeout(resetTimer);
  pos = buildPosition(lesson.setup);
  selection = null;
  busy = false;
  if (lesson.goal !== null) done = false;
  render(message);
}

function destinations(): Move[] {
  if (!selection) return [];
  const sel = selection;
  return legal.filter((m) => (sel.kind === 'board' ? m.from === sel.sq : m.from < 0 && m.kind === sel.piece));
}

function render(message?: string): void {
  legal = legalMoves(pos);
  const dests = new Set(destinations().map((m) => m.to));
  const target = lesson.goal?.target ?? -1;
  for (let sq = 0; sq < SQUARES; sq++) {
    const cell = cells[sq];
    const code = pos.board[sq];
    if (code === 0) cell.replaceChildren();
    else cell.replaceChildren(pieceElement(cellKind(code), cellSide(code), cellSide(code) === 1));
    const isSel = selection?.kind === 'board' && selection.sq === sq;
    cell.classList.toggle('sel', isSel);
    cell.classList.toggle('dest', dests.has(sq));
    cell.classList.toggle('cap', dests.has(sq) && code !== 0);
    cell.classList.toggle('goal', sq === target && !done);
    const name = code === 0 ? '空き' : `${pieceName(cellKind(code), cellSide(code))}(${cellSide(code) === 0 ? '先手' : '後手'})`;
    cell.setAttribute('aria-label', `${squareName(sq)} ${name}${dests.has(sq) ? ' 動かせる' : ''}${sq === target && !done ? ' 目標のマス' : ''}`);
    cell.setAttribute('aria-pressed', String(isSel));
  }
  renderHand();
  if (message !== undefined) byId('lesson-status').textContent = message;
  byId('lesson-next').classList.toggle('primary', done);
}

function renderHand(): void {
  const el = byId('lesson-hand');
  el.replaceChildren();
  let any = false;
  for (const kind of HAND_ORDER) {
    const n = pos.hands[0][kind];
    if (n === 0) continue;
    any = true;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hand-piece';
    const selected = selection?.kind === 'hand' && selection.piece === kind;
    b.classList.toggle('sel', selected);
    b.setAttribute('aria-pressed', String(selected));
    b.setAttribute('aria-label', `持ち駒 ${pieceName(kind, 0)} ${n}枚`);
    b.append(pieceElement(kind, 0, false));
    if (n > 1) {
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = String(n);
      b.append(count);
    }
    b.addEventListener('click', () => {
      if (busy || done) return;
      selection = selected ? null : { kind: 'hand', piece: kind };
      playSound('tap');
      render(selection ? '打ちたい空きマスをタップしよう。' : '');
    });
    el.append(b);
  }
  if (!any) {
    const none = document.createElement('span');
    none.className = 'hand-empty';
    none.textContent = 'なし';
    el.append(none);
  }
  // 持ち駒の欄は、持ち駒があるとき（そのレッスンで持ち駒を使うとき）だけ出す
  const startsWithHand = lesson.setup !== 'initial' && (lesson.setup.hand?.length ?? 0) > 0;
  byId('lesson-hand-panel').hidden = !any && !startsWithHand;
}

async function onCell(sq: number): Promise<void> {
  if (busy || (done && lesson.goal !== null)) return;
  const moves = destinations().filter((m) => m.to === sq);
  if (moves.length > 0) {
    let move = moves[0];
    if (moves.length > 1) {
      const answer = await askDialog(byId<HTMLDialogElement>('promote-dialog'));
      if (answer === '') return;
      move = moves.find((m) => m.promote === (answer === 'yes')) ?? moves[0];
    }
    play(move);
    return;
  }
  const code = pos.board[sq];
  if (code !== 0 && cellSide(code) === 0) {
    const same = selection?.kind === 'board' && selection.sq === sq;
    selection = same ? null : { kind: 'board', sq };
    playSound('tap');
    render(selection ? '光っているマスが、動かせる場所です。' : '');
    return;
  }
  // 動かせないマスをタップしたとき: 理由を伝える
  if (selection && lesson.illegalHint && selection.kind === 'hand') {
    render(lesson.illegalHint);
    return;
  }
  selection = null;
  render('');
}

function play(move: Move): void {
  const captured = move.from >= 0 && pos.board[move.to] !== 0;
  const next = applyMove(pos, move);
  const reached = lesson.goal !== null && isGoal(lesson.goal, move, next);
  playSound(move.promote ? 'promote' : captured ? 'capture' : 'move');
  pos = next;
  selection = null;
  if (lesson.goal === null) {
    // 読むだけのレッスン: 自由に動かしてよい（手番は、いつもあなたのまま）
    pos.turn = 0;
    render('動かせたね! ほかの駒も、ためしてみよう。');
    return;
  }
  if (reached) {
    done = true;
    hooks.onDone(index);
    window.setTimeout(() => playSound('check'), 150);
    render(`✓ ${lesson.praise}`);
    return;
  }
  // 目標とちがう手: 動きは見せて、すこしあとにもどす
  busy = true;
  render(`ちがうよ。${lesson.hint}`);
  resetTimer = window.setTimeout(() => resetBoard(`もういちど。${lesson.hint}`), 1800);
}

export function lessonDone(): boolean {
  return done;
}
