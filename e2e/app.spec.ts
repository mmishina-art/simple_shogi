import { expect, test, type Page } from '@playwright/test';

// 乱数は固定する（CPU の「うっかり」や、おまかせの手番が毎回同じになる）
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
    // 保存データは今の版(2)として始める（古い版からの移行は、移行のテストで確かめる）
    if (!localStorage.getItem('simple-shogi-schema')) localStorage.setItem('simple-shogi-schema', '2');
  });
});

// CPU(弱い)との対局を機械で指させた記録。先手の勝ちで、最後の 1 手(▲同龍 6一→5一)で詰む。
// この記録から最後の 1 手を除いた局面を保存しておき、詰ませて勝つところまでを確かめる。
const ALMOST_WON = [[57,48,1,0],[23,32,1,0],[62,53,1,0],[5,15,5,0],[61,52,1,0],[10,14,7,0],[58,49,1,0],[8,17,2,0],[54,45,1,0],[26,35,1,0],[55,46,1,0],[19,28,1,0],[77,68,5,0],[21,30,1,0],[79,62,3,0],[14,12,7,0],[56,47,1,0],[3,13,5,0],[59,50,1,0],[15,14,5,0],[68,58,5,0],[6,15,4,0],[49,40,1,0],[22,31,1,0],[40,31,1,0],[12,9,7,0],[52,43,1,0],[14,22,5,0],[31,22,1,0],[13,22,5,0],[-1,19,5,0],[-1,40,1,0],[19,9,5,0],[0,9,2,0],[-1,19,7,0],[40,49,1,0],[19,1,7,0],[49,58,1,1],[1,2,7,1],[-1,3,5,0],[-1,12,4,0],[4,5,8,0],[2,3,14,0],[-1,4,5,0]];

const RANKS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 将棋の表記（筋・段）でマスを指す。盤の向きによらず、aria-label で探す */
const cell = (page: Page, file: number, rank: number) => page.locator(`#board .cell[aria-label^="${file}${RANKS[rank]} "]`);

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

/** どの BGM が選ばれたかを、app:music イベントで記録する */
async function recordMusic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __tracks: string[] };
    w.__tracks = [];
    document.addEventListener('app:music', (e) => w.__tracks.push(String((e as CustomEvent).detail.track)));
  });
}
const tracks = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __tracks: string[] }).__tracks);

test('画面ごとに BGM が切り替わる（タイトル → 話の選択 → 会話 → 対局）', async ({ page }) => {
  await recordMusic(page);
  await page.goto('/');
  await expect.poll(() => tracks(page)).toEqual(['title']);
  await page.getByRole('button', { name: /物語/ }).click();
  await expect.poll(() => tracks(page)).toEqual(['title', 'map']);
  await page.locator('.chapter').nth(0).click();
  await expect.poll(() => tracks(page)).toEqual(['title', 'map', 'scene']);
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect.poll(() => tracks(page)).toEqual(['title', 'map', 'scene', 'game']);
  await page.getByRole('button', { name: /もどる/ }).click();
  await expect.poll(() => tracks(page)).toEqual(['title', 'map', 'scene', 'game', 'title']);
});

test('戦場の会話は緊張感のある曲、決戦の対局は強敵の曲、ふつうの対局は対局の曲', async ({ page }) => {
  await recordMusic(page);
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.chapter').nth(0).click(); // 信長編 第一話: 尾張の統一（ふつうの対局）
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect.poll(() => tracks(page)).toEqual(['title', 'map', 'scene', 'game']);
  await page.getByRole('button', { name: /もどる/ }).click();
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.chapter').nth(5).click(); // 信長編 第六話: 長篠の戦い（戦場・決戦）
  await expect.poll(async () => (await tracks(page)).slice(-1)[0]).toBe('tension');
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect.poll(async () => (await tracks(page)).slice(-1)[0]).toBe('boss');
});

test('対局が終わると BGM が止まる（勝敗の音が聞こえるように）', async ({ page }) => {
  await recordMusic(page);
  await startTwoPlayers(page);
  await expect.poll(() => tracks(page)).toContain('map');
  await page.getByRole('button', { name: '投了' }).click();
  await page.locator('#confirm-dialog').getByRole('button', { name: 'はい' }).click();
  await expect.poll(async () => (await tracks(page)).slice(-1)[0]).toBe('null');
});

test('BGM は、せっていで切れて、設定が残る', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'せってい' }).click();
  const toggle = page.locator('#settings-dialog .bgm-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.getByRole('button', { name: 'せってい' }).click();
  await expect(page.locator('#settings-dialog .bgm-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test.describe('しゃべり声（文字が出るアニメーションを動かして確かめる）', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('人物が話しているときだけ声が鳴り、地の文では鳴らない', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const w = window as unknown as { __voices: number[] };
      w.__voices = [];
      document.addEventListener('app:sound', (e) => {
        const d = (e as CustomEvent).detail;
        if (d.name === 'voice') w.__voices.push(d.frequency);
      });
    });
    const voices = (): Promise<number[]> => page.evaluate(() => (window as unknown as { __voices: number[] }).__voices);
    await page.getByRole('button', { name: /物語/ }).click();
    await page.locator('.chapter').nth(0).click();
    // 最初は地の文（ナレーション）: 文字が出きるまで待っても、声は鳴らない
    await expect(page.locator('#scene-speaker')).toBeHidden();
    await expect(page.locator('#scene-text')).toContainText('戦国時代');
    await page.waitForTimeout(600);
    expect(await voices()).toEqual([]);

    // 人物（信長）の台詞まで進める
    const box = page.locator('#scene-box');
    for (let i = 0; i < 30 && (await page.locator('#scene-speaker').isHidden()); i++) await box.click();
    await expect(page.locator('#scene-speaker')).toHaveText('織田信長');
    // 人物の絵（家紋つき）が描かれている
    await expect(page.locator('#scene-portrait svg')).toBeVisible();
    await expect(page.locator('#scene-portrait svg text, #scene-portrait svg circle').first()).toBeAttached();
    await expect.poll(async () => (await voices()).length, { timeout: 5000 }).toBeGreaterThan(2);
    // 信長の声の高さ（基準 112Hz の 1〜2 倍）で鳴っている
    for (const hz of await voices()) {
      expect(hz).toBeGreaterThanOrEqual(112);
      expect(hz).toBeLessThan(224);
    }
  });

  test('効果音を切ると、声も鳴らない', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('simple-shogi-sound', 'false'));
    await page.goto('/');
    await page.evaluate(() => {
      const w = window as unknown as { __voices: number };
      w.__voices = 0;
      document.addEventListener('app:sound', () => w.__voices++);
    });
    await page.getByRole('button', { name: /物語/ }).click();
    await page.locator('.chapter').nth(0).click();
    const box = page.locator('#scene-box');
    for (let i = 0; i < 30 && (await page.locator('#scene-speaker').isHidden()); i++) await box.click();
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (window as unknown as { __voices: number }).__voices)).toBe(0);
  });
});

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

test('将棋のあそびかた(練習)から、ルールのまとめを開ける', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /将棋のあそびかた/ }).click();
  await expect(page.locator('#screen-lessons')).toBeVisible();
  await page.getByRole('button', { name: /ルールのまとめ/ }).click();
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

test('動かしたマスと元のマスが区別でき、駒の移動が分かる', async ({ page }) => {
  await startTwoPlayers(page);
  await cell(page, 7, 7).click();
  await cell(page, 7, 6).click();
  await expect(cell(page, 7, 7)).toHaveClass(/last-from/);
  await expect(cell(page, 7, 6)).toHaveClass(/last-to/);
  await expect(cell(page, 7, 6)).not.toHaveClass(/last-from/);
});

test.describe('駒のアニメーション（動かして確かめる）', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('駒は元のマスからすべり、取られた駒はその場でうすれて消える', async ({ page }) => {
    await startTwoPlayers(page);
    await page.evaluate(() => {
      const w = window as unknown as { __slides: { dx: string }[] };
      w.__slides = [];
      const original = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        const frames = keyframes as Keyframe[];
        if (frames.length === 2 && typeof frames[0].transform === 'string') w.__slides.push({ dx: frames[0].transform });
        return original.call(this, keyframes, options);
      };
    });
    await cell(page, 7, 7).click();
    await cell(page, 7, 6).click();
    const slides = await page.evaluate(() => (window as unknown as { __slides: { dx: string }[] }).__slides);
    expect(slides).toHaveLength(1);
    // 7七 → 7六 は、まっすぐ上へ 1 マス（横のずれはなく、縦に動く）
    expect(slides[0].dx).toMatch(/^translate\(0px, [0-9.]+px\)/);
  });
});

test('CPU が考えている間も、盤の位置がずれない（文字が出入りしても、画面が動かない）', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.chapter').nth(0).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#screen-game')).toBeVisible();
  const boardTop = () => page.locator('#board').evaluate((el) => Math.round(el.getBoundingClientRect().top));
  const before = await boardTop();
  await cell(page, 7, 7).click();
  await cell(page, 7, 6).click();
  await expect(page.locator('#status')).toContainText('考えています');
  expect(await boardTop()).toBe(before);
  await expect(page.locator('#status')).toContainText('あなたの番です', { timeout: 10_000 });
  expect(await boardTop()).toBe(before);
});

for (const [name, size] of [['標準のスマホ', { width: 412, height: 915 }], ['iPhone SE の大きさ', { width: 320, height: 568 }], ['背の低い画面', { width: 390, height: 600 }]] as const) {
  test(`対局中は、画面がスクロールせず、盤・手駒・ボタンが 1 画面に収まる（${name}）`, async ({ page }) => {
    await page.setViewportSize(size);
    await startTwoPlayers(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    expect(overflow).toBeLessThanOrEqual(0);
    const bottom = await page.locator('#btn-resign').evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
    expect(bottom).toBeLessThanOrEqual(size.height);
    // 盤は正方形で、9 マスが画面の幅に収まる
    const box = await page.locator('#board').boundingBox();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
  });
}

test('対局中は、画面をドラッグしても動かない（ピンチ拡大は許可、ほかの画面は動かせる）', async ({ page }) => {
  await page.goto('/');
  const style = () => page.evaluate(() => { const s = getComputedStyle(document.body); return { position: s.position, overflow: s.overflow, touchAction: s.touchAction }; });
  expect((await style()).position).not.toBe('fixed'); // タイトルなどは、今までどおり
  await page.getByRole('button', { name: '自由対局' }).click();
  await page.getByText('ふたりで', { exact: true }).click();
  await page.getByRole('button', { name: '対局開始' }).click();
  await expect(page.locator('#screen-game')).toBeVisible();
  const game = await style();
  expect(game.position).toBe('fixed');
  expect(game.overflow).toBe('hidden');
  expect(game.touchAction).toBe('pinch-zoom'); // 指 1 本のドラッグは止め、ピンチ拡大は許可する
  // 対局を出れば、画面は元どおり動かせる
  await page.getByRole('button', { name: /もどる/ }).click();
  await expect(page.locator('#screen-game')).toBeHidden();
  expect((await style()).position).not.toBe('fixed');
});

test('動けない駒・相手の駒を選んでも、何も起きない', async ({ page }) => {
  await startTwoPlayers(page);
  await cell(page, 8, 9).click(); // 桂は、動ける場所がない
  await expect(page.locator('#board .cell.dest')).toHaveCount(0);
  await cell(page, 7, 3).click(); // 後手の駒は、先手の番では選べない
  await expect(page.locator('#board .cell.dest')).toHaveCount(0);
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
  await expect(page.locator('#board .cell').first()).toHaveAttribute('aria-label', /^1九 /);
  await expect(page.locator('#file-labels span').first()).toHaveText('1');
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

test('物語: 最初は信長編の第一話だけが選べ、会話のあと対局が始まる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  const tabs = page.locator('.arc-tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(tabs.nth(1)).toBeDisabled(); // 秀吉編は、信長編をクリアするまで開かない
  await expect(tabs.nth(2)).toBeDisabled();
  const chapters = page.locator('.chapter');
  await expect(chapters).toHaveCount(8);
  await expect(chapters.nth(0)).toBeEnabled();
  await expect(chapters.nth(0)).toContainText('1556年');
  await expect(chapters.nth(1)).toBeDisabled();

  await chapters.nth(0).click();
  const box = page.locator('#scene-box');
  await expect(page.locator('#screen-scene')).toBeVisible();
  await expect(page.locator('#scene-text')).toContainText('戦国時代');
  // 会話を最後まで進める（reducedMotion のため、文字は一度に出る）
  for (let i = 0; i < 40 && (await page.locator('#screen-scene').isVisible()); i++) await box.click();
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#game-title')).toHaveText('信長編第一話');
  await expect(page.locator('#name-top')).toContainText('織田信勝');
});

test('物語: 会話は「スキップ」で飛ばせる。?debug=1 では全編・全話が選べる', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.arc-tab:enabled')).toHaveCount(3);
  await expect(page.locator('.chapter:enabled')).toHaveCount(8);
  await page.locator('.chapter').nth(7).click();
  await expect(page.locator('#scene-speaker')).toBeHidden(); // 最初は地の文
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#game-title')).toHaveText('信長編第八話');
  await expect(page.locator('#name-top')).toContainText('明智光秀');

  await page.getByRole('button', { name: /もどる/ }).click();
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.arc-tab').nth(2).click();
  await expect(page.locator('.arc-tab').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.chapter').nth(5).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#game-title')).toHaveText('家康編第六話');
  await expect(page.locator('#name-top')).toContainText('石田三成'); // 関ヶ原
});

test('物語の対局では、対戦相手が史実にそったセリフを話す。自由対局では話さない', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.chapter').nth(1).isDisabled(); // 第一話だけ
  await page.locator('.chapter').nth(0).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  const speech = page.locator('#opp-speech');
  await expect(speech).toBeVisible();
  await expect(speech).toContainText('織田信勝');
  await expect(speech).toContainText('大うつけ'); // 最初のひとこと
  await expect(page.locator('#avatar-top svg')).toBeVisible(); // 相手の顔の絵
  await expect(page.locator('#avatar-bottom svg')).toBeVisible(); // 自分は、その編の主人公（信長編なので信長）の顔の絵
  await expect(page.locator('#status .sr-only')).toHaveText(/あなたの番です/); // 「だれの番か」は、読み上げ用に隠して持つ
  await page.getByRole('button', { name: /もどる/ }).click();
  await page.getByRole('button', { name: '自由対局' }).click();
  await page.getByRole('button', { name: '対局開始' }).click();
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#opp-speech')).toBeHidden();
  await expect(page.locator('#avatar-top')).toBeHidden(); // 自由対局には、顔の絵がない
  await expect(page.locator('#avatar-bottom')).toBeHidden();
});

test('対戦中に、王手をかけられると、相手がセリフで反応する', async ({ page }) => {
  // 物語の第二話（桶狭間・今川義元）。角で歩を取って王手をかけると、「王手された」セリフが出る
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: /物語/ }).click();
  await page.locator('.chapter').nth(1).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#opp-speech')).toContainText('海道一の弓取り');
  await move(page, [7, 7], [7, 6]);
  await expect(page.locator('#status')).toContainText('あなたの番です', { timeout: 15_000 });
  await move(page, [8, 8], [3, 3]); // 角で後手の歩を取り、同時に玉(5一)に王手をかける
  await page.locator('#promote-dialog').getByRole('button', { name: '成らない' }).click();
  await expect(page.locator('#opp-speech')).toContainText('今川義元');
  await expect(page.locator('#opp-speech')).toContainText('麿に王手とは、無礼な');
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
  await expect(result.locator('#result-quote')).toContainText('織田信勝');
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

test('物語: 詰ませて勝つと、勝利の会話と歴史メモのあと、次の話が開く', async ({ page }) => {
  await saveAlmostWon(page, 1);
  await page.goto('/');
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.locator('#game-title')).toHaveText('信長編第一話');
  await expect(page.locator('#status')).toContainText('あなたの番です');
  await move(page, [6, 1], [5, 1]); // ▲同龍 で詰み
  const result = page.locator('#result-dialog');
  await expect(result.locator('#result-title')).toHaveText('勝ち！', { timeout: 10_000 });
  await expect(result.locator('#result-detail')).toHaveText('詰みです');
  await result.getByRole('button', { name: /つづきを見る/ }).click();
  await expect(page.locator('#scene-text')).toContainText('兄上の勝ち');
  // 会話のあとに、歴史メモが出る
  const box = page.locator('#scene-box');
  for (let i = 0; i < 10 && (await page.locator('#scene-speaker').innerText()) !== '歴史メモ'; i++) await box.click();
  await expect(page.locator('#scene-speaker')).toHaveText('歴史メモ');
  await expect(page.locator('#scene-text')).toContainText('稲生');
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#screen-story')).toBeVisible();
  await expect(page.locator('.chapter').nth(0)).toContainText('済');
  await expect(page.locator('.chapter').nth(1)).toBeEnabled();
  await expect(page.locator('.chapter').nth(2)).toBeDisabled();
  await page.getByRole('button', { name: /もどる/ }).click();
  await expect(page.locator('#menu-continue')).toBeHidden();
});

test('物語: 編の最後の話に勝つと、語りのあと、次の編が開く', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-shogi-cleared', '7'));
  await saveAlmostWon(page, 8);
  await page.goto('/');
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.locator('#game-title')).toHaveText('信長編第八話');
  await move(page, [6, 1], [5, 1]);
  await expect(page.locator('#result-title')).toHaveText('勝ち！', { timeout: 10_000 });
  await page.getByRole('button', { name: /つづきを見る/ }).click();
  await page.getByRole('button', { name: 'スキップ' }).click(); // 勝利の会話と歴史メモを飛ばす → 編の最後の語り
  await expect(page.locator('#scene-text')).toContainText('もしも');
  await page.getByRole('button', { name: 'スキップ' }).click();
  // 秀吉編が開き、その編が選ばれた状態になる
  await expect(page.locator('#story-notice')).toContainText('秀吉編が開きました');
  await expect(page.locator('.arc-tab').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.arc-tab').nth(1)).toBeEnabled();
  await expect(page.locator('.arc-tab').nth(2)).toBeDisabled();
  await expect(page.locator('.chapter:enabled')).toHaveCount(1);
  await expect(page.locator('.chapter').nth(0)).toContainText('1578年');
  await page.locator('.arc-tab').nth(0).click();
  await expect(page.locator('.chapter').nth(7)).toContainText('済');
});

test('物語: 最後の話(家康編 第八話)に勝つと、全話クリアのお知らせが出る', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-shogi-cleared', '23'));
  await saveAlmostWon(page, 24);
  await page.goto('/');
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.locator('#game-title')).toHaveText('家康編第八話');
  await move(page, [6, 1], [5, 1]);
  await expect(page.locator('#result-title')).toHaveText('勝ち！', { timeout: 10_000 });
  await page.getByRole('button', { name: /つづきを見る/ }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#scene-text')).toContainText('一国一城令');
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.locator('#story-notice')).toContainText('全 24 話クリア');
  await expect(page.locator('.arc-tab').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.chapter').nth(7)).toContainText('済');
});

test('物語: 信長編をクリアしていれば、話の選択は秀吉編から始まる', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-shogi-cleared', '8'));
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.arc-tab').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.arc-tab').nth(2)).toBeDisabled();
  await expect(page.locator('#arc-summary')).toContainText('豊臣秀吉');
  await expect(page.locator('.chapter:enabled')).toHaveCount(1);
});

test('古い版（葦原の乱）の物語の記録は引き継がれず、設定は残る', async ({ page }) => {
  await page.addInitScript(() => {
    // 最初の 1 回だけ、古い版の保存データを置く
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('simple-shogi-schema', '1');
    localStorage.setItem('simple-shogi-cleared', '5');
    localStorage.setItem('simple-shogi-sound', 'false');
    localStorage.setItem('simple-shogi-game', JSON.stringify({ mode: 'cpu', level: 3, human: 0, chapter: 3, moves: [[57, 48, 1, 0]] }));
  });
  await page.goto('/');
  await expect(page.locator('#menu-continue')).toBeHidden(); // 物語の途中の対局は消えている
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.chapter:enabled')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('simple-shogi-sound'))).toBe('false');
  expect(await page.evaluate(() => localStorage.getItem('simple-shogi-schema'))).toBe('2');
});

test('物語の進み具合は保存され、クリア済みの次の話が選べる', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-shogi-cleared', '3'));
  await page.goto('/');
  await page.getByRole('button', { name: /物語/ }).click();
  await expect(page.locator('.arc-tab').nth(1)).toBeDisabled();
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

// 読み込みの失敗を確実に作るため、このテストだけ Service Worker を無効にする
test.describe('起動失敗の復旧', () => {
  test.use({ serviceWorkers: 'block' });

  test('起動できないときは「なおす」ボタンが出て、押すと起動できる（記録と、ほかのアプリのキャッシュは消えない）', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __bootWaitMs: number }).__bootWaitMs = 500;
      // 1回目の自動修復は済んだことにして、ボタンが出る側の動きを確かめる
      sessionStorage.setItem('simple-shogi:repaired-at', String(Date.now()));
      if (!localStorage.getItem('simple-shogi-cleared')) localStorage.setItem('simple-shogi-cleared', '4');
    });
    // 同じサイトにある、ほかのアプリのキャッシュ（なおすときに消えてはいけない）を用意する
    await page.goto('/');
    await page.evaluate(async () => { await caches.open('other-app-v1'); });
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
    // このアプリのキャッシュだけが作り直され、ほかのアプリのキャッシュは残っている
    expect(await page.evaluate(() => caches.has('other-app-v1'))).toBe(true);
  });
});

// ---- チュートリアル ----
const lessonCell = (page: Page, file: number, rank: number) => page.locator(`#lesson-board .cell[aria-label^="${file}${RANKS[rank]} "]`);

async function openLesson(page: Page, index: number): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /将棋のあそびかた/ }).click();
  await page.locator('#lesson-list .chapter').nth(index).click();
  await expect(page.locator('#screen-lesson')).toBeVisible();
}

test('チュートリアル: 15 のレッスンが並び、最初は何も「済」ではない', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /将棋のあそびかた/ }).click();
  await expect(page.locator('#lesson-list .chapter')).toHaveCount(15);
  await expect(page.locator('#lesson-list .chapter').nth(1)).toContainText('歩');
  await expect(page.locator('#lesson-list .ch-state:not(:empty)')).toHaveCount(0);
});

// 駒の動き・取るレッスンは、[レッスン番号, 動かす駒のマス, 目標のマス]
const MOVE_LESSONS: [number, [number, number], [number, number]][] = [
  [1, [5, 7], [5, 6]], // 歩
  [2, [5, 8], [5, 4]], // 香
  [3, [5, 7], [4, 5]], // 桂（歩を飛び越える）
  [4, [5, 5], [6, 6]], // 銀（斜め後ろ）
  [5, [5, 5], [5, 6]], // 金（真後ろ）
  [6, [8, 8], [4, 4]], // 角
  [7, [5, 8], [5, 5]], // 飛
  [8, [5, 9], [4, 8]], // 玉
  [9, [5, 6], [5, 5]], // 取る
];
for (const [index, from, to] of MOVE_LESSONS) {
  test(`チュートリアル: レッスン ${index + 1} の目標を達成できる`, async ({ page }) => {
    await openLesson(page, index);
    await expect(page.locator('#lesson-goal')).toContainText('目標');
    await expect(lessonCell(page, ...to)).toHaveClass(/goal/); // 目標のマスに、点線の印
    await lessonCell(page, ...from).click();
    await expect(lessonCell(page, ...to)).toHaveClass(/dest/);
    await lessonCell(page, ...to).click();
    await expect(page.locator('#lesson-status')).toContainText('✓');
    await expect(page.locator('#lesson-next')).toHaveClass(/primary/);
  });
}

test('チュートリアル: 目標とちがう手を指すと、ヒントが出て、盤がもとにもどる', async ({ page }) => {
  await openLesson(page, 2); // 香
  await lessonCell(page, 5, 8).click();
  await lessonCell(page, 5, 6).click(); // 5四の歩を取らずに、途中で止まる
  await expect(page.locator('#lesson-status')).toContainText('ちがうよ');
  await expect(page.locator('#lesson-status')).toContainText('香は');
  await expect(page.locator('#lesson-status')).toContainText('もういちど', { timeout: 5000 });
  await expect(lessonCell(page, 5, 8)).toHaveAttribute('aria-label', '5八 香(先手)');
});

test('チュートリアル: 「やりなおす」で、盤がもとにもどる', async ({ page }) => {
  await openLesson(page, 1);
  await lessonCell(page, 5, 7).click();
  await lessonCell(page, 5, 6).click();
  await expect(page.locator('#lesson-status')).toContainText('✓');
  await page.getByRole('button', { name: 'やりなおす' }).click();
  await expect(lessonCell(page, 5, 7)).toHaveAttribute('aria-label', '5七 歩(先手)');
});

test('チュートリアル: 成るレッスンでは「成る」を選ぶと達成、「成らない」だとヒント', async ({ page }) => {
  await openLesson(page, 11);
  await lessonCell(page, 5, 4).click();
  await lessonCell(page, 5, 3).click();
  await page.locator('#promote-dialog').getByRole('button', { name: '成らない' }).click();
  await expect(page.locator('#lesson-status')).toContainText('ちがうよ');
  await expect(page.locator('#lesson-status')).toContainText('もういちど', { timeout: 5000 });
  await lessonCell(page, 5, 4).click();
  await lessonCell(page, 5, 3).click();
  await page.locator('#promote-dialog').getByRole('button', { name: '成る' }).click();
  await expect(page.locator('#lesson-status')).toContainText('✓');
  await expect(lessonCell(page, 5, 3)).toHaveAttribute('aria-label', /と\(先手\)/);
});

test('チュートリアル: 持ち駒を打つレッスン', async ({ page }) => {
  await openLesson(page, 10);
  await expect(page.locator('#lesson-hand-panel')).toBeVisible();
  await page.getByRole('button', { name: '持ち駒 歩 1枚' }).click();
  await expect(lessonCell(page, 3, 5)).toHaveClass(/dest/);
  await lessonCell(page, 3, 5).click();
  await expect(page.locator('#lesson-status')).toContainText('✓');
  await expect(lessonCell(page, 3, 5)).toHaveAttribute('aria-label', '3五 歩(先手)');
});

test('チュートリアル: 二歩になるマスには打てず、理由が表示される', async ({ page }) => {
  await openLesson(page, 12);
  await page.getByRole('button', { name: '持ち駒 歩 1枚' }).click();
  await expect(lessonCell(page, 5, 5)).not.toHaveClass(/dest/); // 5筋は二歩
  await expect(lessonCell(page, 6, 5)).toHaveClass(/dest/);
  await lessonCell(page, 5, 5).click();
  await expect(page.locator('#lesson-status')).toContainText('二歩');
  await lessonCell(page, 6, 5).click();
  await expect(page.locator('#lesson-status')).toContainText('✓');
});

test('チュートリアル: 詰みのレッスン（飛を3一に動かして詰ませる）', async ({ page }) => {
  await openLesson(page, 13);
  await lessonCell(page, 3, 3).click();
  await lessonCell(page, 3, 1).click();
  await page.locator('#promote-dialog').getByRole('button', { name: '成らない' }).click();
  await expect(page.locator('#lesson-status')).toContainText('詰みです');
});

test('チュートリアル: 読むだけのレッスンでは、自由に動かせて、前後のレッスンに移れる。できたレッスンは保存される', async ({ page }) => {
  await openLesson(page, 0);
  await expect(page.locator('#lesson-title')).toContainText('1/15');
  await expect(page.getByRole('button', { name: 'まえへ' })).toBeDisabled();
  await move2(page, [7, 7], [7, 6]);
  await expect(page.locator('#lesson-status')).toContainText('動かせたね');
  await page.getByRole('button', { name: 'つぎへ' }).click();
  await expect(page.locator('#lesson-title')).toContainText('2/15');
  await page.getByRole('button', { name: 'まえへ' }).click();
  await expect(page.locator('#lesson-title')).toContainText('1/15');
  await page.getByRole('button', { name: /一覧へ/ }).click();
  await expect(page.locator('#lesson-list .chapter').nth(0)).toContainText('済');
  await page.reload();
  await page.getByRole('button', { name: /将棋のあそびかた/ }).click();
  await expect(page.locator('#lesson-list .chapter').nth(0)).toContainText('済');
});

test('チュートリアル: 最後のレッスンの「おわる」で、一覧にもどる', async ({ page }) => {
  await openLesson(page, 14);
  await expect(page.locator('#lesson-title')).toContainText('15/15');
  await page.getByRole('button', { name: 'おわる' }).click();
  await expect(page.locator('#screen-lessons')).toBeVisible();
  await expect(page.locator('#lesson-list .chapter').nth(14)).toContainText('済');
});

async function move2(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  await lessonCell(page, ...from).click();
  await lessonCell(page, ...to).click();
}
