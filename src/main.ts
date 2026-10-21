import './style.css';
import { type Game, type SavedMove, decodeMoves, describeResult, encodeMoves, gameFromMoves } from './game';
import { setupInstallGuide } from './install';
import { isBgmOn, setBgm, setTrack, type TrackName } from './music';
import { initPlay, startPlay } from './play';
import { LESSONS } from './tutorial';
import { initTutorial, lessonCount, openLesson } from './tutorial-view';
import { setupUpdateBanner } from './pwa';
import { runScene } from './scene';
import type { Side } from './shogi';
import { isSoundOn, playSound, setSound } from './sound';
import { exportBackup, importBackup, load, migrateStorage, requestPersist, save } from './storage';
import { ARCS, CHAPTERS, type Arc, type Chapter, arcOf, chapterLabel, characterOf } from './story';
import { byId } from './ui';

migrateStorage();

type ScreenName = 'title' | 'story' | 'free' | 'game' | 'scene' | 'lessons' | 'lesson';

interface Launch {
  mode: 'cpu' | 'two';
  level: number;
  human: Side;
  /** 物語の話の番号（1〜）。自由対局は 0 */
  chapter: number;
}

interface SavedGame extends Launch {
  moves: SavedMove[];
}

const FREE_LEVELS: Record<number, string> = { 2: 'やさしい', 4: 'ふつう', 6: 'つよい', 8: '達人' };
/** ?debug=1 を付けて開くと、物語の全話が最初から選べる（確認用） */
const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

/** 画面ごとの BGM（対局と会話は、始めるときに別に決める） */
const SCREEN_TRACK: Partial<Record<ScreenName, TrackName>> = { title: 'title', story: 'map', free: 'map', lessons: 'map', lesson: 'map' };

function show(name: ScreenName): void {
  const track = SCREEN_TRACK[name];
  if (track) setTrack(track);
  document.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
    el.hidden = el.id !== `screen-${name}`;
  });
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
}

// ---- 保存 ----

function loadSavedGame(): { launch: Launch; game: Game } | null {
  const saved = load<SavedGame | null>('game', null);
  if (!saved || typeof saved !== 'object') return null;
  const moves = decodeMoves(saved.moves);
  if (!moves || moves.length === 0) return null;
  if ((saved.mode !== 'cpu' && saved.mode !== 'two') || (saved.human !== 0 && saved.human !== 1)) return null;
  if (saved.chapter < 0 || saved.chapter > CHAPTERS.length || !Number.isInteger(saved.chapter)) return null;
  const game = gameFromMoves(moves);
  if (!game || game.result) return null;
  return { launch: { mode: saved.mode, level: Number(saved.level) || 1, human: saved.human, chapter: saved.chapter }, game };
}

function persist(launch: Launch, game: Game): void {
  if (game.result) save('game', null);
  else save('game', { ...launch, moves: encodeMoves(game.moves) } satisfies SavedGame);
}

const clearedCount = (): number => Math.min(Math.max(Number(load('cleared', 0)) || 0, 0), CHAPTERS.length);

function markCleared(chapter: number): void {
  if (chapter > Number(load('cleared', 0))) save('cleared', chapter);
}

// ---- タイトル ----

function showTitle(): void {
  byId('menu-continue').hidden = loadSavedGame() === null;
  show('title');
}

byId('menu-continue').addEventListener('click', () => {
  playSound('tap');
  const saved = loadSavedGame();
  if (!saved) return showTitle();
  void launch(saved.launch, saved.game);
});
byId('menu-story').addEventListener('click', () => {
  playSound('tap');
  showStory();
});
byId('menu-free').addEventListener('click', () => {
  playSound('tap');
  show('free');
});
byId('menu-rules').addEventListener('click', () => {
  playSound('tap');
  showLessons();
});
byId('menu-settings').addEventListener('click', () => byId<HTMLDialogElement>('settings-dialog').showModal());

document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => {
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
});

// ---- チュートリアル ----

/** できたレッスンの番号（保存されている） */
const doneLessons = (): number[] => {
  const raw = load<unknown>('tutorial', []);
  return Array.isArray(raw) ? raw.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < lessonCount()) : [];
};

function showLessons(): void {
  const done = new Set(doneLessons());
  const list = byId('lesson-list');
  list.replaceChildren();
  LESSONS.forEach(({ title }, i) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter';
    const parts: [string, string][] = [
      ['ch-num', `レッスン ${i + 1}`],
      ['ch-title', title],
      ['ch-meta', ''],
      ['ch-state', done.has(i) ? '済' : ''],
    ];
    for (const [cls, text] of parts) {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      button.append(span);
    }
    button.setAttribute('aria-label', `レッスン ${i + 1} ${title}${done.has(i) ? ' できた' : ''}`);
    button.addEventListener('click', () => {
      playSound('tap');
      show('lesson');
      openLesson(i);
    });
    li.append(button);
    list.append(li);
  });
  show('lessons');
}

initTutorial({
  onDone: (i) => {
    const done = new Set(doneLessons());
    if (!done.has(i)) save('tutorial', [...done, i].sort((a, b) => a - b));
  },
  onList: showLessons,
});
byId('lessons-back').addEventListener('click', showTitle);
byId('lessons-rules').addEventListener('click', () => byId<HTMLDialogElement>('rules-dialog').showModal());

// ---- 物語 ----

/** いま選んでいる編（話の選択画面） */
let selectedArc: Arc = ARCS[0];
/** 話の選択画面の上に、いちど出すお知らせ（「秀吉編が開きました」など） */
let storyNotice = '';

const arcUnlocked = (arc: Arc, cleared: number): boolean => DEBUG || arc.first <= cleared + 1;

/** 話の選択画面。arc を渡すと、その編を開く。省略すると、まだクリアしていない最初の編を開く。 */
function showStory(arc?: Arc): void {
  const cleared = clearedCount();
  selectedArc = arc ?? ARCS.find((a) => cleared < a.last) ?? ARCS[ARCS.length - 1];

  const tabs = byId('arc-tabs');
  tabs.replaceChildren();
  for (const a of ARCS) {
    const open = arcUnlocked(a, cleared);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'arc-tab';
    tab.disabled = !open;
    tab.setAttribute('aria-pressed', String(a.id === selectedArc.id));
    tab.textContent = open ? a.name : `🔒 ${a.name}`;
    if (!open) tab.setAttribute('aria-label', `${a.name} (前の編をクリアすると開きます)`);
    tab.addEventListener('click', () => {
      playSound('tap');
      showStory(a);
    });
    tabs.append(tab);
  }

  const done = CHAPTERS.filter((c) => c.arc === selectedArc.id && c.id <= cleared).length;
  const hero = characterOf(selectedArc.hero);
  byId('arc-summary').textContent = `${hero?.name ?? ''}(${selectedArc.period})。${selectedArc.summary} ${done}/${selectedArc.last - selectedArc.first + 1} 話クリア`;
  const notice = byId('story-notice');
  notice.textContent = storyNotice;
  notice.hidden = storyNotice === '';
  storyNotice = '';

  const list = byId('chapter-list');
  list.replaceChildren();
  for (const chapter of CHAPTERS.filter((c) => c.arc === selectedArc.id)) {
    const unlocked = DEBUG || chapter.id <= cleared + 1;
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter';
    button.disabled = !unlocked;
    const opponent = characterOf(chapter.opponent);
    const parts: [string, string][] = [
      ['ch-num', `${chapterLabel(chapter.no)} ・ ${unlocked ? chapter.year : '？？？？年'}`],
      ['ch-title', unlocked ? chapter.title : '？？？'],
      ['ch-meta', unlocked ? `${opponent?.name ?? ''} ・ ${chapter.placeName}` : 'まだ開いていません'],
      ['ch-state', chapter.id <= cleared ? '済' : unlocked ? '' : '🔒'],
    ];
    for (const [cls, text] of parts) {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      button.append(span);
    }
    if (chapter.id <= cleared) button.setAttribute('aria-label', `${chapterLabel(chapter.no)} ${chapter.title} クリア済み`);
    button.addEventListener('click', () => void playChapter(chapter));
    li.append(button);
    list.append(li);
  }
  show('story');
}

async function playChapter(chapter: Chapter): Promise<void> {
  playSound('tap');
  show('scene');
  await runScene(chapter.intro, chapter.place, chapter.placeName);
  await launch({ mode: 'cpu', level: chapter.level, human: 0, chapter: chapter.id });
}

byId('story-back').addEventListener('click', showTitle);

// ---- 自由対局 ----

const freeForm = byId<HTMLFormElement>('free-form');
const picked = (name: string): string => (freeForm.elements.namedItem(name) as RadioNodeList).value;

freeForm.addEventListener('change', () => {
  const two = picked('opponent') === 'two';
  byId('free-level').hidden = two;
  byId('free-side').hidden = two;
});
freeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  playSound('tap');
  if (picked('opponent') === 'two') {
    void launch({ mode: 'two', level: 0, human: 0, chapter: 0 });
    return;
  }
  const side = picked('side');
  const human: Side = side === 'random' ? (Math.random() < 0.5 ? 0 : 1) : side === '1' ? 1 : 0;
  void launch({ mode: 'cpu', level: Number(picked('level')), human, chapter: 0 });
});
byId('free-back').addEventListener('click', showTitle);

// ---- 対局 ----

function launch(config: Launch, resume?: Game): void {
  const chapter = config.chapter > 0 ? CHAPTERS[config.chapter - 1] : null;
  const opponent = chapter ? characterOf(chapter.opponent) : undefined;
  const opponentName = opponent?.name ?? 'CPU';
  const title = chapter
    ? `${arcOf(chapter).short}${chapterLabel(chapter.no)}`
    : config.mode === 'two'
      ? 'ふたりで対局'
      : `CPU対局(${FREE_LEVELS[config.level] ?? config.level})`;
  show('game');
  setTrack(chapter?.boss ? 'boss' : 'game');
  startPlay({
    mode: config.mode,
    level: config.level,
    human: config.human,
    title,
    opponentName,
    talk: chapter?.talk,
    opponentFace: opponent ? { art: opponent.art, tone: opponent.tone } : undefined,
    opponentVoice: opponent?.voice,
    moves: resume?.moves,
    onMove: (game) => persist(config, game),
    onEnd: (game) => void onGameEnd(config, chapter, game),
    onExit: showTitle,
  });
}

async function onGameEnd(config: Launch, chapter: Chapter | null, game: Game): Promise<void> {
  const result = game.result;
  if (!result) return;
  const human = config.mode === 'cpu' ? config.human : null;
  const { title, detail } = describeResult(result, human);
  const won = result.winner === config.human && config.mode === 'cpu';
  if (chapter && won) markCleared(chapter.id);

  byId('result-title').textContent = title;
  byId('result-detail').textContent = detail;
  const quote = byId('result-quote');
  const primary = byId('result-primary');
  const secondary = byId('result-secondary');
  quote.hidden = true;

  let again = 'もう一局';
  let back = 'メニューへ';
  if (chapter) {
    back = '話の選択へ';
    if (won) again = 'つづきを見る(歴史メモ)';
    else {
      again = 'もう一度';
      const q = chapter.loseQuote;
      quote.textContent = `${characterOf(q.who)?.name ?? ''}「${q.text}」`;
      quote.hidden = false;
    }
  }
  primary.textContent = again;
  secondary.textContent = back;

  const dialog = byId<HTMLDialogElement>('result-dialog');
  const listeners = new AbortController();
  const choice = await new Promise<'again' | 'back' | 'close'>((resolve) => {
    const { signal } = listeners;
    primary.addEventListener('click', () => resolve('again'), { signal });
    secondary.addEventListener('click', () => resolve('back'), { signal });
    dialog.addEventListener('close', () => resolve('close'), { signal });
    dialog.showModal();
  });
  listeners.abort();
  if (dialog.open) dialog.close();

  if (choice === 'close') return; // 盤を見返す
  if (chapter && won) {
    const arc = arcOf(chapter);
    if (choice === 'again') {
      show('scene');
      const memo = chapter.memo.map((text) => ({ who: 'memo', text }));
      await runScene([...chapter.win, ...memo], chapter.place, chapter.placeName);
      if (chapter.id === arc.last) await runScene(arc.epilogue, 'castle', arc.name);
    }
    // 編をクリアしたら、次の編が開く
    const next = chapter.id === arc.last ? ARCS[ARCS.indexOf(arc) + 1] : undefined;
    if (next) storyNotice = `${arc.name}をクリア! ${next.name}が開きました。`;
    else if (chapter.id === CHAPTERS.length) storyNotice = '全 24 話クリア! 戦国三英雄の物語を、最後まで見とどけました。';
    showStory(next ?? arc);
    return;
  }
  if (choice === 'again') void launch(config);
  else if (chapter) showStory(arcOf(chapter));
  else showTitle();
}

// ---- せってい（効果音・バックアップ） ----

function renderSound(): void {
  document.querySelectorAll<HTMLElement>('.sound-toggle').forEach((el) => {
    el.textContent = `${isSoundOn() ? '🔊' : '🔇'}${el.classList.contains('wide') ? ' 効果音・しゃべり声' : ''}`;
    el.setAttribute('aria-pressed', String(isSoundOn()));
  });
  document.querySelectorAll<HTMLElement>('.bgm-toggle').forEach((el) => {
    el.textContent = `🎵${el.classList.contains('wide') ? ' BGM' : ''}`;
    el.classList.toggle('off', !isBgmOn());
    el.setAttribute('aria-pressed', String(isBgmOn()));
  });
}
document.querySelectorAll<HTMLElement>('.bgm-toggle').forEach((el) =>
  el.addEventListener('click', () => {
    setBgm(!isBgmOn());
    playSound('tap');
    renderSound();
  }),
);
document.querySelectorAll<HTMLElement>('.sound-toggle').forEach((el) =>
  el.addEventListener('click', () => {
    setSound(!isSoundOn());
    playSound('tap');
    renderSound();
  }),
);

byId('backup-export').addEventListener('click', () => {
  const blob = new Blob([exportBackup()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${__APP_ID__}-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
byId<HTMLInputElement>('backup-import').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const message = byId('backup-message');
  try {
    const n = importBackup(await file.text());
    message.textContent = `${n} 件の記録を読み込みました`;
    showTitle();
  } catch (err) {
    message.textContent = err instanceof Error ? err.message : '読み込めませんでした';
  }
  input.value = '';
});

// ---- 起動 ----

byId('version').textContent = __APP_VERSION__;
requestPersist();
setupUpdateBanner(byId('update-banner'), byId('update-button'));
setupInstallGuide(byId<HTMLButtonElement>('install-open'), byId<HTMLDialogElement>('install-dialog'), byId<HTMLButtonElement>('install-now'));
initPlay();
renderSound();
showTitle();

// ここまで来たら起動成功（public/boot.js が見ている）
window.__appStarted = true;
