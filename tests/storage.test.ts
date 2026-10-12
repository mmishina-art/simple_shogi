import { beforeEach, describe, expect, it } from 'vitest';

// localStorage のかわりになる、かんたんな入れ物（node には localStorage がない）
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  },
});

const { importBackup, load, migrateStorage } = await import('../src/storage');
const { SCHEMA_VERSION, createBackup } = await import('../src/backup');

beforeEach(() => store.clear());

describe('保存データの移行（版 1 → 2: 物語の作り替え）', () => {
  it('古い版の、物語の進み具合と、物語の途中の対局を消す（効果音の設定は残す）', () => {
    store.set('simple-shogi-schema', '1');
    store.set('simple-shogi-cleared', '5');
    store.set('simple-shogi-sound', 'false');
    store.set('simple-shogi-game', JSON.stringify({ mode: 'cpu', level: 3, human: 0, chapter: 3, moves: [] }));
    migrateStorage();
    expect(load('cleared', -1)).toBe(0);
    expect(load('game', 'none')).toBeNull();
    expect(load('sound', true)).toBe(false);
    expect(load('schema', 0)).toBe(SCHEMA_VERSION);
  });

  it('自由対局の途中の対局は残す', () => {
    store.set('simple-shogi-schema', '1');
    store.set('simple-shogi-game', JSON.stringify({ mode: 'two', level: 0, human: 0, chapter: 0, moves: [[1, 2, 3, 0]] }));
    migrateStorage();
    expect(load<{ chapter: number } | null>('game', null)?.chapter).toBe(0);
  });

  it('新しい版のデータは、そのまま残す', () => {
    store.set('simple-shogi-schema', String(SCHEMA_VERSION));
    store.set('simple-shogi-cleared', '10');
    migrateStorage();
    expect(load('cleared', 0)).toBe(10);
  });

  it('古い版のバックアップを読み込んだときも、移行される', () => {
    const old = JSON.stringify({
      app: 'simple-shogi',
      schemaVersion: 1,
      exportedAt: '2026-10-12T00:00:00.000Z',
      data: { 'simple-shogi-schema': '1', 'simple-shogi-cleared': '8', 'simple-shogi-sound': 'false' },
    });
    importBackup(old);
    expect(load('cleared', -1)).toBe(0);
    expect(load('sound', true)).toBe(false);
  });

  it('今の版のバックアップは、そのまま戻る', () => {
    store.set('simple-shogi-schema', String(SCHEMA_VERSION));
    store.set('simple-shogi-cleared', '12');
    const text = createBackup(Object.fromEntries(store));
    store.clear();
    importBackup(text);
    expect(load('cleared', 0)).toBe(12);
  });
});
