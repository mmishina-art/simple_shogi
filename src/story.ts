// ストーリーモード「戦国三英雄伝」のデータ。信長編・秀吉編・家康編（各 8 話、全 24 話）。
// 実際の歴史にもとづく。合戦の相手は、その合戦で戦った武将。細部に諸説あるものは、各話の文章に「諸説あり」と書く。
// 将棋の対局は、合戦を追体験するための演出で、勝敗は史実とは限らない（史実との違いは「歴史メモ」で説明する）。
import { HIDEYOSHI, HIDEYOSHI_EPILOGUE } from './story-data/hideyoshi';
import { IEYASU, IEYASU_EPILOGUE } from './story-data/ieyasu';
import { NOBUNAGA, NOBUNAGA_EPILOGUE } from './story-data/nobunaga';
import { HIDEYOSHI_TALK, IEYASU_TALK, NOBUNAGA_TALK } from './story-data/talk';
import type { ChapterData, Line, LookKind, Place, Talk } from './story-types';

export type { ChapterData, Line, LookKind, Place, Talk };

export interface Character {
  id: string;
  name: string;
  /** 肩書き */
  title: string;
  look: LookKind;
  /** しゃべり声の基準の高さ(Hz)。低いほど渋い声 */
  voice: number;
  /** 色の組み合わせ（style.css の data-tone） */
  tone: number;
}

export type ArcId = 'nobunaga' | 'hideyoshi' | 'ieyasu';

export interface Arc {
  id: ArcId;
  /** 編の名前 */
  name: string;
  /** 短い名前（対局画面の題に使う） */
  short: string;
  /** 主人公（プレイヤー）の id */
  hero: string;
  /** 主人公の生きた年 */
  period: string;
  summary: string;
  /** この編の最初の話の番号 */
  first: number;
  /** この編の最後の話の番号 */
  last: number;
  /** 最後の話に勝ったあとの語り */
  epilogue: Line[];
}

export interface Chapter extends ChapterData {
  /** 対局中の、対戦相手のセリフ */
  talk: Talk;
  /** 全体の通し番号（1〜24） */
  id: number;
  arc: ArcId;
  /** 編の中での番号（1〜8） */
  no: number;
  /** CPU の強さ（1〜8）。話が進むほど強くなる */
  level: number;
}

export const CHARACTERS: Character[] = [
  { id: 'nobunaga', name: '織田信長', title: '尾張の大名', look: 'horns', voice: 112, tone: 1 },
  { id: 'nobukatsu', name: '織田信勝', title: '信長の弟', look: 'lord', voice: 210, tone: 2 },
  { id: 'yoshimoto', name: '今川義元', title: '駿河の大大名', look: 'noble', voice: 160, tone: 3 },
  { id: 'tatsuoki', name: '斎藤龍興', title: '美濃の大名', look: 'lord', voice: 230, tone: 4 },
  { id: 'nagamasa', name: '浅井長政', title: '近江の大名', look: 'samurai', voice: 150, tone: 5 },
  { id: 'shingen', name: '武田信玄', title: '甲斐の虎', look: 'whitemane', voice: 100, tone: 6 },
  { id: 'katsuyori', name: '武田勝頼', title: '信玄の四男', look: 'moon', voice: 130, tone: 7 },
  { id: 'kennyo', name: '顕如', title: '石山本願寺の法主', look: 'monk', voice: 140, tone: 8 },
  { id: 'mitsuhide', name: '明智光秀', title: '織田家の重臣', look: 'strategist', voice: 175, tone: 9 },
  { id: 'hideyoshi', name: '羽柴(豊臣)秀吉', title: '織田家の家臣、のち天下人', look: 'lord', voice: 240, tone: 10 },
  { id: 'nagaharu', name: '別所長治', title: '三木城の城主', look: 'lord', voice: 250, tone: 11 },
  { id: 'tsuneie', name: '吉川経家', title: '鳥取城の守将', look: 'samurai', voice: 135, tone: 12 },
  { id: 'munekiyo', name: '清水宗治', title: '高松城の城主', look: 'elder', voice: 145, tone: 13 },
  { id: 'katsuie', name: '柴田勝家', title: '織田家の筆頭家老', look: 'bandit', voice: 108, tone: 14 },
  { id: 'ieyasu', name: '徳川家康', title: '三河の大名', look: 'samurai', voice: 165, tone: 15 },
  { id: 'yoshihisa', name: '島津義久', title: '薩摩の大名', look: 'samurai', voice: 120, tone: 16 },
  { id: 'ujimasa', name: '北条氏政', title: '小田原の大名', look: 'noble', voice: 155, tone: 17 },
  { id: 'masanobu', name: '本多正信', title: '家康の家臣', look: 'strategist', voice: 185, tone: 18 },
  { id: 'kanetsugu', name: '直江兼続', title: '上杉家の重臣', look: 'moon', voice: 170, tone: 19 },
  { id: 'mitsunari', name: '石田三成', title: '豊臣家の奉行', look: 'strategist', voice: 200, tone: 20 },
  { id: 'nobushige', name: '真田信繁', title: '大坂城の武将', look: 'horns', voice: 190, tone: 21 },
  { id: 'hideyori', name: '豊臣秀頼', title: '秀吉の子', look: 'lord', voice: 215, tone: 22 },
];

export const characterOf = (id: string): Character | undefined => CHARACTERS.find((c) => c.id === id);

const PER_ARC = 8;

export const ARCS: Arc[] = [
  {
    id: 'nobunaga',
    name: '信長編',
    short: '信長編',
    hero: 'nobunaga',
    period: '1534〜1582年',
    summary: '尾張の「うつけ」から、天下布武をかかげて、天下統一に迫った織田信長。',
    first: 1,
    last: PER_ARC,
    epilogue: NOBUNAGA_EPILOGUE,
  },
  {
    id: 'hideyoshi',
    name: '秀吉編',
    short: '秀吉編',
    hero: 'hideyoshi',
    period: '1537〜1598年',
    summary: '農民の子から出世して、信長のあとを継ぎ、天下を統一した豊臣秀吉。',
    first: PER_ARC + 1,
    last: PER_ARC * 2,
    epilogue: HIDEYOSHI_EPILOGUE,
  },
  {
    id: 'ieyasu',
    name: '家康編',
    short: '家康編',
    hero: 'ieyasu',
    period: '1543〜1616年',
    summary: '人質の時代から、長くがまんして、江戸幕府を開いた徳川家康。',
    first: PER_ARC * 2 + 1,
    last: PER_ARC * 3,
    epilogue: IEYASU_EPILOGUE,
  },
];

const DATA: [ArcId, ChapterData[], Talk[]][] = [
  ['nobunaga', NOBUNAGA, NOBUNAGA_TALK],
  ['hideyoshi', HIDEYOSHI, HIDEYOSHI_TALK],
  ['ieyasu', IEYASU, IEYASU_TALK],
];

/** 全 24 話。CPU の強さは、全体を通して 1 → 8 に、だんだん強くなる（3 話ごとに 1 段階） */
export const CHAPTERS: Chapter[] = DATA.flatMap(([arc, list, talks], a) =>
  list.map((data, i) => {
    const id = a * PER_ARC + i + 1;
    return { ...data, talk: talks[i], id, arc, no: i + 1, level: Math.ceil(id / 3) };
  }),
);

export const arcOf = (chapter: Chapter): Arc => ARCS.find((a) => a.id === chapter.arc) as Arc;

/** 話の番号を漢数字にする（第一話 など） */
export function chapterLabel(no: number): string {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return `第${digits[no] ?? String(no)}話`;
}
