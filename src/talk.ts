// 対局中の、対戦相手のセリフを選ぶ。DOM に触れない。
import type { Talk } from './story-types';

export interface TalkEvent {
  /** 指したのは、対戦相手(CPU)か */
  byOpponent: boolean;
  /** 駒を取ったか */
  capture: boolean;
  /** 王手になったか（指された側の玉に） */
  check: boolean;
  /** 何手目か（この手を含む） */
  ply: number;
}

/** 王手以外のセリフは、前のセリフからこの手数以上あける（しゃべりすぎない） */
export const MIN_GAP = 4;
/** 王手のセリフは、これだけあける */
export const MIN_GAP_CHECK = 2;
/** 対局が進んだセリフ(mid)を出す手数の間隔 */
export const MID_EVERY = 12;

const pick = (lines: string[], rng: () => number): string | null => (lines.length === 0 ? null : lines[Math.floor(rng() * lines.length) % lines.length]);

/** 今の手に対して話すセリフ。話さないときは null */
export function chooseTalk(talk: Talk, ev: TalkEvent, lastTalkPly: number, rng: () => number = Math.random): string | null {
  const gap = ev.ply - lastTalkPly;
  if (ev.check) return gap >= MIN_GAP_CHECK ? pick(ev.byOpponent ? talk.check : talk.checked, rng) : null;
  if (gap < MIN_GAP) return null;
  if (ev.capture) return pick(ev.byOpponent ? talk.capture : talk.lost, rng);
  if (ev.ply % MID_EVERY === 0) return talk.mid.length === 0 ? null : talk.mid[(ev.ply / MID_EVERY - 1) % talk.mid.length];
  return null;
}
