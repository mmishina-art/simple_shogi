// localStorage は使えない環境（プライベートブラウズなど）でもアプリが動くよう、必ず try/catch で囲む。
// 保存キー名を変えると利用者の記録が消える。変えるときは移行処理を書くこと。

import { SCHEMA_VERSION, createBackup, parseBackup } from './backup';

const PREFIX = 'simple-shogi';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}-${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(`${PREFIX}-${key}`, JSON.stringify(value));
  } catch {
    // 保存できなくても続行する
  }
}

// ブラウザに「保存データを消さないで」と頼む（消されにくくなる）
export function requestPersist(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}

// ---- 保存データの版番号と移行 ----

/** 保存データの形が変わったときの移行処理。from → from+1 の変換を、ここに足していく。 */
function migrate(from: number): void {
  // 版 1 → 2: 物語を「葦原の乱」から「信長・秀吉・家康編」に作り替えた。話の番号の意味が変わったので、
  // 物語の進み具合と、物語の途中の対局は引き継がない（自由対局の途中の対局と、設定は残す）。
  if (from < 2) {
    save('cleared', 0);
    const game = load<{ chapter?: number } | null>('game', null);
    if (game && typeof game === 'object' && Number(game.chapter) > 0) save('game', null);
  }
}

/** 起動時に一度呼ぶ。保存されている形の版が古ければ、移行してから版番号を書き直す。 */
export function migrateStorage(): void {
  const stored = load<number>('schema', 0);
  if (stored < SCHEMA_VERSION) {
    migrate(stored);
    save('schema', SCHEMA_VERSION);
  }
}

// ---- バックアップ ----

/** このアプリの保存データを、ファイルの中身（JSON の文字列）にする */
export function exportBackup(): string {
  const data: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${PREFIX}-`)) data[key] = localStorage.getItem(key) ?? '';
    }
  } catch {
    // 読めなければ空のバックアップになる
  }
  return createBackup(data);
}

/** バックアップの中身を保存する。おかしいファイルは例外（理由つき）で止める。保存した件数を返す。 */
export function importBackup(text: string): number {
  const data = parseBackup(text);
  const keys = Object.keys(data).filter((k) => k.startsWith(`${PREFIX}-`));
  for (const key of keys) localStorage.setItem(key, data[key]);
  // 古い版のファイルを読み込んだときは、保存の形を今の版にそろえる
  migrateStorage();
  return keys.length;
}
