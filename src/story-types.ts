// ストーリーのデータの型。

/** 顔のイラストの種類（描き分けは portrait.ts） */
export type LookKind = 'lord' | 'elder' | 'bandit' | 'monk' | 'woman' | 'strategist' | 'ninja' | 'horns' | 'moon' | 'samurai' | 'noble' | 'whitemane';

export interface Line {
  /** 話す人の id。'narr' は地の文、'memo' は歴史メモ */
  who: string;
  text: string;
}

export type Place = 'castle' | 'pass' | 'temple' | 'plain' | 'strategy' | 'night' | 'fortress' | 'tenka' | 'battlefield';

/** 1 話ぶんのデータ（番号・強さ・所属する編は story.ts で決める） */
export interface ChapterData {
  /** 話のタイトル（合戦の名前など） */
  title: string;
  /** 合戦のあった年（「1560年」の形） */
  year: string;
  place: Place;
  placeName: string;
  /** 対戦相手の id */
  opponent: string;
  /** 決戦（強敵の曲を使う） */
  boss?: boolean;
  /** 対局の前の会話（史実の背景の説明） */
  intro: Line[];
  /** 勝ったあとの会話 */
  win: Line[];
  /** 歴史メモ（勝ったあとに、学びとして読む） */
  memo: string[];
  /** 負けたときの相手のひとこと（相手が話す） */
  loseQuote: Line;
}

/** 対局中に、対戦相手が話すセリフ（その人物の実際のエピソードや逸話にもとづく） */
export interface Talk {
  /** 対局の始まり */
  start: string;
  /** 相手(CPU)が、こちらの駒を取ったとき */
  capture: string[];
  /** こちらが、相手の駒を取ったとき */
  lost: string[];
  /** 相手が、こちらの玉に王手をかけたとき */
  check: string[];
  /** こちらが、相手の玉に王手をかけたとき */
  checked: string[];
  /** 対局が進んだとき（しばらくおきに、順番に） */
  mid: string[];
}
