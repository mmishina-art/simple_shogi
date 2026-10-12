import { expect, test, type Page } from '@playwright/test';

// 乱数は固定する（CPU の「うっかり」や、おまかせの手番が毎回同じになる）
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
});

// CPU(弱い)との対局を機械で指させた記録。先手の勝ちで、最後の 1 手(▲同龍 6一→5一)で詰む。
// この記録から最後の 1 手を除いた局面を保存しておき、詰ませて勝つところまでを確かめる。
const ALMOST_WON = [[57,48,1,0],[23,32,1,0],[62,53,1,0],[5,15,5,0],[61,52,1,0],[10,14,7,0],[58,49,1,0],[8,17,2,0],[54,45,1,0],[26,35,1,0],[55,46,1,0],[19,28,1,0],[77,68,5,0],[21,30,1,0],[79,62,3,0],[14,12,7,0],[56,47,1,0],[3,13,5,0],[59,50,1,0],[15,14,5,0],[68,58,5,0],[6,15,4,0],[49,40,1,0],[22,31,1,0],[40,31,1,0],[12,9,7,0],[52,43,1,0],[14,22,5,0],[31,22,1,0],[13,22,5,0],[-1,19,5,0],[-1,40,1,0],[19,9,5,0],[0,9,2,0],[-1,19,7,0],[40,49,1,0],[19,1,7,0],[49,58,1,1],[1,2,7,1],[-1,3,5,0],[-1,12,4,0],[4,5,8,0],[2,3,14,0],[-1,4,5,0]];

const RANKS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 将棋の表記（筋・段）でマスを指す。盤の向きによらず、aria-label で探す */
const cell = (page: Page, file: number, rank: number) => page.locator(`.cell[aria-label^="${file}${RANKS[rank]} "]`);

async function move(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  await cell(page, ...from).click();
  await cell(page, ...to).click();
}

async function startTwoPlayers(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '自由対局' }).click();
  await page.getByText('ふたりで', { exact: true }).click();
  await page.getByRole('button', { name: '対局開始' }).click();
  await expect(page.locator('#screen-game')).toBeVisible();
}

test('最初の画面に、メニュー・バージョン・インストール方法の入口がある', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /物語/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '自由対局' })).toBeVisible();
  await expect(page.locator('#version')).toHaveText(/^\d+\.\d+\.\d+$/);
  await expect(page.getByRole('button', { name: /インストールする方法/ })).toBeVisible();
  // 保存された対局がないうちは「つづきから」は出ない
  await expect(page.locator('#menu-continue')).toBeHidden();
});

test('最初の画面からインストール方法を開ける（使っている端末の説明が開いている）', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /インストールする方法/ }).click();
  const dialog = page.locator('#install-dialog');
  await expect(dialog).toBeVisible();
  // Pixel 7 のプロファイルなので Android の説明が開いている
  await expect(dialog.locator('details[data-platform="android"]')).toHaveJSProperty('open', true);
  await expect(dialog.locator('details[data-platform="ios"]')).toHaveJSProperty('open', false);
  await expect(dialog.getByText('ホーム画面に追加', { exact: false }).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'とじる' }).click();
  await expect(dialog).toBeHidden();
});

test('将棋のあそびかたを開ける', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '将棋のあそびかた' }).click();
  await expect(page.locator('#rules-dialog')).toBeVisible();
  await expect(page.locator('#rules-dialog')).toContainText('二歩');
  await page.locator('#rules-dialog').getByRole('button', { name: 'とじる' }).click();
  await expect(page.locator('#rules-dialog')).toBeHidden();
});

test('ふたり対戦: 駒を選ぶと動かせるマスが示され、動かすと相手の番になり、棋譜に残る', async ({ page }) => {
  await startTwoPlayers(page);
  await expect(cell(page, 7, 7)).toHaveAttribute('aria-label', '7七 歩(先手)');
  await cell(page, 7, 7).click();
  await expect(cell(page, 7, 6)).toHaveClass(/dest/);
  await expect(cell(page, 7, 5)).not.toHaveClass(/dest/);
  await cell(page, 7, 6).click();
  await expect(cell(page, 7, 6)).toHaveAttribute('aria-label', '7六 歩(先手)');
  await expect(page.locator('#status')).toContainText('後手の番です');
  await expect(page.locator('#status')).toContainText('▲７六歩');
  await page.getByRole('button', { name: '棋譜' }).click();
  await expect(page.locator('#kifu-list li')).toHaveText(['▲７六歩']);
});

test('動けない駒・相手の駒を選んでも、何も起きない', async ({ page }) => {
  await startTwoPlayers(page);
  await cell(page, 8, 9).click(); // 桂は、動ける場所がない
  await expect(page.locator('.cell.dest')).toHaveCount(0);
  await cell(page, 7, 3).click(); // 後手の駒は、先手の番では選べない
  await expect(page.locator('.cell.dest')).toHaveCount(0);
});

test('角で相手の角を取るとき「成る / 成らない」を聞かれ、取った駒は持ち駒になって打てる', async ({ page }) => {
  await startTwoPlayers(page);
  await move(page, [7, 7], [7, 6]);
  await move(page, [3, 3], [3, 4]);
  await move(page, [8, 8], [2, 2]);
  const dialog = page.locator('#promote-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '成る' }).click();
  await expect(cell(page, 2, 2)).toHaveAttribute('aria-label', '2二 馬(先手)');
  await expect(page.locator('#status')).toContainText('▲２二角成');

  await move(page, [3, 1], [2, 2]); // 後手が銀で馬を取る
  // 先手は持ち駒の角を打てる
  const hand = page.locator('#hand-bottom').getByRole('button', { name: '持ち駒 角 1枚' });
  await expect(hand).toBeEnabled();
  await hand.click();
  await expect(cell(page, 5, 5)).toHaveClass(/dest/);
  await cell(page, 5, 5).click();
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-label', '5五 角(先手)');
  await expect(page.locator('#status')).toContainText('▲５五角');
});

test('持ち駒は、空いているマスにだけ打てる', async ({ page }) => {
  await startTwoPlayers(page);
  // 角を交換して、先手の持ち駒を角にする
  await move(page, [7, 7], [7, 6]);
  await move(page, [3, 3], [3, 4]);
  await move(page, [8, 8], [2, 2]);
  await page.locator('#promote-dialog').getByRole('button', { name: '成らない' }).click();
  await move(page, [3, 1], [2, 2]);
  await page.locator('#hand-bottom').getByRole('button', { name: '持ち駒 角 1枚' }).click();
  await expect(cell(page, 7, 7)).toHaveClass(/dest/); // 空いた 7七 には打てる
  await expect(cell(page, 9, 7)).not.toHaveClass(/dest/); // 駒のあるマスには打てない
});

test('投了すると結果が出て、もう一局できる', async ({ page }) => {
  await startTwoPlayers(page);
  await page.getByRole('button', { name: '投了' }).click();
  await expect(page.locator('#confirm-text')).toHaveText('先手は投了しますか？');
  await page.locator('#confirm-dialog').getByRole('button', { name: 'はい' }).click();
  const result = page.locator('#result-dialog');
  await expect(result).toBeVisible();
  await expect(result.locator('#result-title')).toHaveText('後手の勝ち');
  await result.getByRole('button', { name: 'もう一局' }).click();
  await expect(page.locator('#status')).toContainText('先手の番です');
  await expect(cell(page, 7, 7)).toHaveAttribute('aria-label', '7七 歩(先手)');
});

test('待った（ふたり対戦）で1手戻せる', async ({ page }) => {
  await startTwoPlayers(page);
  await expect(page.getByRole('button', { name: '待った' })).toBeDisabled();
  await move(page, [7, 7], [7, 6]);
  await page.getByRole('button', { name: '待った' }).click();
  await expect(cell(page, 7, 7)).toHaveAttribute('aria-label', '7七 歩(先手)');
  await expect(page.locator('#status')).toContainText('先手の番です');
});

test('CPU 対戦: こちらが指すと CPU も指し、また自分の番になる。待ったで自分の番に戻せる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '自由対局' }).click();
  await page.getByText('やさしい', { exact: true }).click();
  await page.getByRole('button', { name: '対局開始' }).click();
  await expect(page.locator('#status')).toContainText('あなたの番です');
  await move(page, [7, 7], [7, 6]);
  await expect(page.locator('#status')).toContainText('考えています');
  await expect(page.locator('#status')).toContainText('あなたの番です', { timeout: 10_000 });
  await page.getByRole('button', { name: '棋譜' }).click();
  await expect(page.locator('#kifu-list li')).toHaveCount(2);
  await page.locator('#kifu-dialog').getByRole('button', { name: 'とじる' }).click();

  await page.getByRole('button', { name: '待った' }).click();
  await expect(cell(page, 7, 7)).toHaveAttribute('aria-label', '7七 歩(先手)');
  await expect(page.getByRole('button', { name: '棋譜' })).toBeDisabled(); // 棋譜は空
});

test('後手を選ぶと盤が回り、自分の駒が下にくる（CPU が先に指す）', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '自由対局' }).click();
  await page.getByText('やさしい', { exact: true }).click();
  await page.getByText('後手(上)').click();
  await page.getByRole('button', { name: '対局開始' }).click();
  await expect(page.locator('#status')).toContainText('あなたの番です', { timeout: 10_000 });
  // 画面の左上のマスは 1 筋・九段（盤を回しているので）
  await expect(page.locator('.cell').first()).toHaveAttribute('aria-label', /^1九 /);
  await expect(page.locator('.file-labels span').first()).toHaveText('1');
  await expect(page.locator('#name-bottom')).toContainText('あなた');
});

test('対局は自動で保存され、タイトルの「つづきから」で再開できる', async ({ page }) => {
  await startTwoPlayers(page);
  await move(page, [7, 7], [7, 6]);
  await page.getByRole('button', { name: /もどる/ }).click();
  await expect(page.locator('#screen-title')).toBeVisible();
  await page.reload();
  const cont = page.getByRole('button', { name: 'つづきから' });
  await expect(cont).toBeVisible();
  await cont.click();
  await expect(cell(page, 7, 6)).toHaveAttribute('aria-label', '7六 歩(先手)');
  await expect(page.locator('#status')).toContainText('後手の番です');
});

test('物語: 最初は第一話だけが選べ、会話のあと対局が始まる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  const chapters = page.locator('.chapter');
  await expect(chapters).toHaveCount(8);
  await expect(chapters.nth(0)).toBeEnabled();
  await expect(chapters.nth(1)).toBeDisabled();

  await chapters.nth(0).click();
  const box = page.locator('#scene-box');
  await expect(page.locator('#screen-scene')).toBeVisible();
  await expect(page.locator('#scene-text')).toContainText('時は戦国');
  // 会話を最後まで進める（reducedMotion のため、文字は一度に出る）
  for (let i = 0; i < 40 && (await page.locator('#screen-scene').isVisible()); i++) await box.click();
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#game-title')).toHaveText('第一話 稽古');
  await expect(page.locator('#name-top')).toContainText('伊吹 玄斎');
});

test('物語: 会話は「スキップ」で飛ばせる。?debug=1 では全話が選べる', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(8);
  await page.locator('.chapter').nth(7).click();
  await expect(page.locator('#scene-speaker')).toBeHidden(); // 最初は地の文
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#game-title')).toHaveText('第八話 天下一番');
});

test('物語: 負けると相手のひとことが出て、次の話は開かない', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.chapter').nth(0).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await page.getByRole('button', { name: '投了' }).click();
  await page.locator('#confirm-dialog').getByRole('button', { name: 'はい' }).click();
  const result = page.locator('#result-dialog');
  await expect(result.locator('#result-title')).toHaveText('負け…');
  await expect(result.locator('#result-quote')).toContainText('伊吹 玄斎');
  await result.getByRole('button', { name: '話の選択へ' }).click();
  await expect(page.locator('.chapter').nth(1)).toBeDisabled();
});

async function saveAlmostWon(page: Page, chapter: number): Promise<void> {
  await page.addInitScript(
    ([moves, chapterId]) => {
      if (localStorage.getItem('simple-shogi-game')) return;
      localStorage.setItem('simple-shogi-game', JSON.stringify({ mode: 'cpu', level: 1, human: 0, chapter: chapterId, moves }));
    },
    [ALMOST_WON, chapter] as const,
  );
}

test('物語: 詰ませて勝つと、勝利の会話のあと次の話が開く', async ({ page }) => {
  await saveAlmostWon(page, 1);
  await page.goto('/');
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.locator('#game-title')).toHaveText('第一話 稽古');
  await expect(page.locator('#status')).toContainText('あなたの番です');
  await move(page, [6, 1], [5, 1]); // ▲同龍 で詰み
  const result = page.locator('#result-dialog');
  await expect(result.locator('#result-title')).toHaveText('勝ち！', { timeout: 10_000 });
  await expect(result.locator('#result-detail')).toHaveText('詰みです');
  // 終わった対局は、つづきから再開できない
  await result.getByRole('button', { name: 'つづきを見る' }).click();
  await expect(page.locator('#scene-text')).toContainText('お見事');
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#screen-story')).toBeVisible();
  await expect(page.locator('.chapter').nth(0)).toContainText('済');
  await expect(page.locator('.chapter').nth(1)).toBeEnabled();
  await expect(page.locator('.chapter').nth(2)).toBeDisabled();
  await page.getByRole('button', { name: /もどる/ }).click();
  await expect(page.locator('#menu-continue')).toBeHidden();
});

test('物語: 最終話に勝つと、エンディングが流れる', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-shogi-cleared', '7'));
  await saveAlmostWon(page, 8);
  await page.goto('/');
  await page.getByRole('button', { name: 'つづきから' }).click();
  await move(page, [6, 1], [5, 1]);
  await expect(page.locator('#result-title')).toHaveText('勝ち！', { timeout: 10_000 });
  await page.getByRole('button', { name: 'つづきを見る' }).click();
  await expect(page.locator('#scene-text')).toContainText('見事');
  await page.getByRole('button', { name: 'スキップ' }).click(); // 勝利の会話を飛ばす → エンディング
  await expect(page.locator('#scene-text')).toContainText('盤上の定め');
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(8);
  await expect(page.locator('.chapter').nth(7)).toContainText('済');
});

test('物語の進み具合は保存され、クリア済みの次の話が選べる', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-shogi-cleared', '3'));
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(4);
  await expect(page.locator('.chapter').nth(2)).toContainText('済');
});

test('音のオン/オフを切り替えられ、駒を動かすと音のイベントが出る', async ({ page }) => {
  await startTwoPlayers(page);
  await page.evaluate(() => {
    (window as unknown as { __sounds: string[] }).__sounds = [];
    document.addEventListener('app:sound', (e) => (window as unknown as { __sounds: string[] }).__sounds.push((e as CustomEvent).detail.name));
  });
  await move(page, [7, 7], [7, 6]);
  expect(await page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)).toContain('move');

  const toggle = page.locator('#screen-game .sound-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => ((window as unknown as { __sounds: string[] }).__sounds = []));
  await move(page, [3, 3], [3, 4]);
  expect(await page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)).toEqual([]);
});

test('manifest と Service Worker が使える', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const registered = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  expect(registered).toBe(true);
});

test('更新バナーは通常は隠れている', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#update-banner')).toBeHidden();
});

test('記録をファイルに書き出し、消えたあとに読み込んで戻せる', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('simple-shogi-cleared')) localStorage.setItem('simple-shogi-cleared', '2');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'せってい' }).click();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'ファイルに書き出す' }).click()]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(path, 'utf8');
  expect(JSON.parse(text).data['simple-shogi-cleared']).toBe('2');
  await page.locator('#settings-dialog').getByRole('button', { name: 'とじる' }).click();

  // 記録を消す → 読み込んで戻す
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('simple-shogi-cleared', '0');
  });
  await page.reload();
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(1);
  await page.getByRole('button', { name: /もどる/ }).click();

  await page.getByRole('button', { name: 'せってい' }).click();
  await page.locator('#backup-import').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#backup-message')).toContainText('読み込みました');
  await page.locator('#settings-dialog').getByRole('button', { name: 'とじる' }).click();
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(3);
});

test('おかしいバックアップファイルは、理由を表示して読み込まない', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'せってい' }).click();
  await page.locator('#backup-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"other"}') });
  await expect(page.locator('#backup-message')).toContainText('このアプリのバックアップではありません');
});

test('起動できないときは「なおす」ボタンが出て、押すと起動できる（記録は消えない）', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __bootWaitMs: number }).__bootWaitMs = 500;
    // 1回目の自動修復は済んだことにして、ボタンが出る側の動きを確かめる
    sessionStorage.setItem('simple-shogi:repaired-at', String(Date.now()));
    if (!localStorage.getItem('simple-shogi-cleared')) localStorage.setItem('simple-shogi-cleared', '4');
  });
  // メインのスクリプトが読み込めない状況を作る
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot-error')).toBeVisible();

  await page.unroute('**/assets/*.js');
  await page.getByRole('button', { name: 'なおす' }).click();
  await expect(page.getByRole('button', { name: /物語/ })).toBeVisible();
  await expect(page.locator('#boot-error')).toBeHidden();
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(5);
});
