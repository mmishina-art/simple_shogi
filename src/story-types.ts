// ストーリーのデータの型。

/** 人物の絵の設定。部品の組み合わせと、家紋・小道具で、人物ごとの味を出す（描き方は portrait.ts） */
export type GearKind = 'topknot' | 'chasen' | 'sohatsu' | 'bald' | 'eboshi' | 'kabuto';
export type CrestKind = 'none' | 'horns' | 'moon' | 'kuwagata' | 'tuft' | 'ai' | 'sun';
export type BodyKind = 'kamishimo' | 'armor' | 'robe' | 'noble' | 'cape';
export type EyesKind = 'calm' | 'sharp' | 'closed' | 'wide' | 'heavy';
export type BrowsKind = 'thin' | 'thick' | 'angry' | 'arched';
export type MouthKind = 'smile' | 'flat' | 'frown' | 'grin';
export type BeardKind = 'none' | 'mustache' | 'goatee' | 'full';
/** 家紋 */
export type EmblemKind = 'mokko' | 'aoi' | 'kikyo' | 'rokumon' | 'ai' | 'kiri' | 'dai' | 'uroko' | 'bishi' | 'bars' | 'cross' | 'kikkou' | 'ring';
export type ExtraKind = 'scar' | 'bigears' | 'wrinkles' | 'whiteface' | 'dotbrows' | 'blush' | 'juzu';

export interface Art {
  gear: GearKind;
  /** 兜の前立て（gear が kabuto のとき） */
  crest?: CrestKind;
  body: BodyKind;
  eyes: EyesKind;
  brows: BrowsKind;
  mouth: MouthKind;
  beard: BeardKind;
  emblem: EmblemKind;
  face?: 'round' | 'lean';
  /** 髪とひげの色（既定は黒） */
  hair?: 'black' | 'white';
  extras?: ExtraKind[];
  /** 背中の小道具: 千成瓢箪 / 風林火山の旗 */
  banner?: 'gourd' | 'furinkazan';
}

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
