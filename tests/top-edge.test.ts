// 画面の上端（iPhone のぼかしの帯を避ける）の設定が、元に戻っていないこと
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'src/style.css'), 'utf8');

describe('画面の上端', () => {
  it('ステータスバーを不透明（black）にしている', () => {
    expect(html).toMatch(/name="apple-mobile-web-app-status-bar-style" content="black"/);
    expect(html).not.toMatch(/black-translucent/);
  });

  it('上端の余白は、安全領域 + 24px（--safe-top）以上にしている', () => {
    expect(css).toMatch(/--top-gap:\s*24px/);
    expect(css).toMatch(/--safe-top:\s*calc\(env\(safe-area-inset-top\) \+ var\(--top-gap\)\)/);
    // 安全領域だけ（余白なし）の上端の指定が残っていない
    expect(css).not.toMatch(/max\(\d+px, env\(safe-area-inset-top\)\)/);
  });

  it('画面の最小の高さは、上端の余白（--safe-top）の分を引いている（引き忘れると、画面がはみ出してスクロールする）', () => {
    expect(css).toMatch(/\.screen \{[^}]*min-height:\s*calc\(100dvh - max\(10px, var\(--safe-top\)\) - 20px\)/);
  });
});
