import { describe, expect, it } from 'vitest';
import { MID_EVERY, MIN_GAP, MIN_GAP_CHECK, chooseTalk } from '../src/talk';
import type { Talk } from '../src/story-types';

const talk: Talk = {
  start: 'はじめ',
  capture: ['取った1', '取った2'],
  lost: ['取られた1', '取られた2'],
  check: ['王手した'],
  checked: ['王手された'],
  mid: ['中盤1', '中盤2'],
};
const first = (): number => 0;
const ev = (o: Partial<{ byOpponent: boolean; capture: boolean; check: boolean; ply: number }> = {}) => ({ byOpponent: true, capture: false, check: false, ply: 10, ...o });

describe('対戦相手のセリフを選ぶ', () => {
  it('ふつうの手では話さない', () => {
    expect(chooseTalk(talk, ev(), 0, first)).toBeNull();
  });

  it('相手が駒を取ったら「取った」、こちらが取ったら「取られた」のセリフ', () => {
    expect(chooseTalk(talk, ev({ capture: true, byOpponent: true }), 0, first)).toBe('取った1');
    expect(chooseTalk(talk, ev({ capture: true, byOpponent: false }), 0, first)).toBe('取られた1');
  });

  it('乱数でセリフが選ばれる（範囲を超えない）', () => {
    expect(chooseTalk(talk, ev({ capture: true }), 0, () => 0.99)).toBe('取った2');
    expect(chooseTalk(talk, ev({ capture: true }), 0, () => 1)).toBe('取った1');
  });

  it('王手をかけたとき・かけられたときのセリフ（王手は取る手より優先）', () => {
    expect(chooseTalk(talk, ev({ check: true, byOpponent: true, capture: true }), 0, first)).toBe('王手した');
    expect(chooseTalk(talk, ev({ check: true, byOpponent: false }), 0, first)).toBe('王手された');
  });

  it('前に話してから間もないときは、話さない（王手は間隔が短い）', () => {
    expect(chooseTalk(talk, ev({ capture: true, ply: 10 }), 10 - MIN_GAP + 1, first)).toBeNull();
    expect(chooseTalk(talk, ev({ capture: true, ply: 10 }), 10 - MIN_GAP, first)).not.toBeNull();
    expect(chooseTalk(talk, ev({ check: true, ply: 10 }), 10 - MIN_GAP_CHECK + 1, first)).toBeNull();
    expect(chooseTalk(talk, ev({ check: true, ply: 10 }), 10 - MIN_GAP_CHECK, first)).not.toBeNull();
  });

  it('一定の手数ごとに、対局が進んだセリフを順番に話す', () => {
    expect(chooseTalk(talk, ev({ ply: MID_EVERY }), 0, first)).toBe('中盤1');
    expect(chooseTalk(talk, ev({ ply: MID_EVERY * 2 }), 0, first)).toBe('中盤2');
    expect(chooseTalk(talk, ev({ ply: MID_EVERY * 3 }), 0, first)).toBe('中盤1');
    expect(chooseTalk(talk, ev({ ply: MID_EVERY + 1 }), 0, first)).toBeNull();
  });

  it('セリフが空の種類は、話さない', () => {
    const empty: Talk = { ...talk, capture: [], mid: [] };
    expect(chooseTalk(empty, ev({ capture: true }), 0, first)).toBeNull();
    expect(chooseTalk(empty, ev({ ply: MID_EVERY }), 0, first)).toBeNull();
  });
});
