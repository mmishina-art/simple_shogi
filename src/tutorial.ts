// 将棋のチュートリアル（レッスン）。DOM に触れない。
// 小さな盤の上で、実際に駒を動かしながら、動き方・取り方・成り・持ち駒・禁じ手・詰みを覚える。
import {
  BISHOP,
  GOLD,
  KING,
  KNIGHT,
  LANCE,
  PAWN,
  ROOK,
  SILVER,
  type Move,
  type Position,
  hasAnyLegalMove,
  initialPosition,
  isInCheck,
  makeCell,
} from './shogi';

/** 将棋の表記（筋・段）で、マスの番号を返す。例: squareOf(7, 6) = 7六 */
export const squareOf = (file: number, rank: number): number => (rank - 1) * 9 + (9 - file);

type Placed = [kind: number, file: number, rank: number];

interface Setup {
  /** あなた（先手・下側）の駒 */
  me: Placed[];
  /** 相手（後手・上側）の駒 */
  opp: Placed[];
  /** あなたの持ち駒 */
  hand?: number[];
}

/** 目標: この手を指せたらクリア */
export interface Goal {
  /** 動かす（打つ）先のマス */
  target: number;
  /** 動かす（打つ）駒の種類。成る前の種類 */
  kind?: number;
  /** 持ち駒を打つこと */
  drop?: boolean;
  /** 成ること */
  promote?: boolean;
  /** 詰ませること */
  mate?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  /** 説明（段落ごと） */
  text: string[];
  /** 「目標」の文。目標のない（読むだけの）レッスンは null */
  goalText: string | null;
  goal: Goal | null;
  /** まちがえたときのヒント */
  hint: string;
  /** 目標でない場所をタップしたとき、動かせないマスの理由を伝える（二歩など） */
  illegalHint?: string;
  /** できたときのひとこと */
  praise: string;
  setup: Setup | 'initial';
}

const S = squareOf;

export function buildPosition(setup: Setup | 'initial'): Position {
  if (setup === 'initial') return initialPosition();
  const pos: Position = { board: new Uint8Array(81), hands: [new Uint8Array(9), new Uint8Array(9)], turn: 0 };
  for (const [kind, file, rank] of setup.me) pos.board[S(file, rank)] = makeCell(kind, 0);
  for (const [kind, file, rank] of setup.opp) pos.board[S(file, rank)] = makeCell(kind, 1);
  for (const kind of setup.hand ?? []) pos.hands[0][kind]++;
  return pos;
}

/** その手が、目標を達成したか */
export function isGoal(goal: Goal, move: Move, next: Position): boolean {
  if (move.to !== goal.target) return false;
  if (goal.kind !== undefined && move.kind !== goal.kind) return false;
  if (goal.drop !== undefined && goal.drop !== move.from < 0) return false;
  if (goal.promote !== undefined && goal.promote !== move.promote) return false;
  if (goal.mate && !(isInCheck(next.board, 1) && !hasAnyLegalMove(next))) return false;
  return true;
}

// 目印にするための、あなたの玉と相手の王（動かさないので、はしに置く）
const MY_KING: Placed = [KING, 1, 9];
const OPP_KING: Placed = [KING, 1, 1];

export const LESSONS: Lesson[] = [
  {
    id: 'board',
    title: '盤と駒のみかた',
    text: [
      '将棋は、9×9のマスの盤で、2人が交代で1手ずつ指します。あなたは下側の「先手」です。',
      '駒は、五角形で、とがった方が進む向きです。上側の相手の駒は、さかさまに見えます。',
      'マスは、右から数える「筋」と、上から数える「段」で呼びます。たとえば、右上の角は「1一」です。',
      '勝ちは、相手の「王」を、逃げられない形(詰み)にすること。まずは、駒を1つタップして、動けるマスの印を見てみましょう。',
    ],
    goalText: null,
    goal: null,
    hint: '',
    praise: '動かせたね! 次のレッスンで、駒の動かし方を1つずつ覚えよう。',
    setup: 'initial',
  },
  {
    id: 'pawn',
    title: '歩(ふ)の動き',
    text: ['歩は、前に1マスだけ進めます。後ろや横には動けません。いちばん数が多い、将棋の「兵隊」です。', '駒をタップすると、動けるマスに印が出ます。点線のマスが、今回の目標です。'],
    goalText: '歩を、1マス前(5六)に進めよう',
    goal: { target: S(5, 6), kind: PAWN },
    hint: '歩は、前に1マスだけ。点線のマスをタップしてね。',
    praise: 'そのとおり! 歩は前に1マスずつ進みます。',
    setup: { me: [MY_KING, [PAWN, 5, 7]], opp: [OPP_KING] },
  },
  {
    id: 'lance',
    title: '香(きょう)の動き',
    text: ['香は、前にまっすぐ、何マスでも進めます。後ろには戻れません。', '進む先に相手の駒があれば、それを取ることができます(取ったマスで止まります)。'],
    goalText: '香で、前にいる相手の歩(5四)を取ろう',
    goal: { target: S(5, 4), kind: LANCE },
    hint: '香は、まっすぐ前に何マスでも進めるよ。',
    praise: 'いいね! 香は、遠くの駒も取れます。',
    setup: { me: [MY_KING, [LANCE, 5, 8]], opp: [OPP_KING, [PAWN, 5, 4]] },
  },
  {
    id: 'knight',
    title: '桂(けい)の動き',
    text: ['桂は、前に2マス、左右に1マス進んだ場所へ「跳び」ます。', '間に駒があっても、飛び越えられるのは、桂だけの特技です。ただし、前にしか進めません。'],
    goalText: '桂で、味方の歩を飛び越えて、相手の歩(4五)を取ろう',
    goal: { target: S(4, 5), kind: KNIGHT },
    hint: '桂は、前に2マス、横に1マス。味方の歩は飛び越えられるよ。',
    praise: 'お見事! 桂は、駒を飛び越えます。',
    setup: { me: [MY_KING, [KNIGHT, 5, 7], [PAWN, 5, 6]], opp: [OPP_KING, [PAWN, 4, 5]] },
  },
  {
    id: 'silver',
    title: '銀(ぎん)の動き',
    text: ['銀は、前と、斜め4方向に1マスずつ動けます。真横と真後ろには動けません。', '前に強く、斜め後ろにも下がれる、攻めと守りに使いやすい駒です。'],
    goalText: '銀で、斜め後ろにいる相手の金(6六)を取ろう',
    goal: { target: S(6, 6), kind: SILVER },
    hint: '銀は、斜め後ろにも動けるよ。',
    praise: 'そのとおり! 銀は、斜めに自由に動けます。',
    setup: { me: [MY_KING, [SILVER, 5, 5]], opp: [OPP_KING, [GOLD, 6, 6]] },
  },
  {
    id: 'gold',
    title: '金(きん)の動き',
    text: ['金は、前・横・真後ろと、斜め前に1マスずつ動けます。斜め後ろだけは動けません。', '守りの中心になる、頼れる駒です。'],
    goalText: '金で、真後ろにいる相手の銀(5六)を取ろう',
    goal: { target: S(5, 6), kind: GOLD },
    hint: '金は、真後ろにも動けるよ(銀は動けない)。',
    praise: 'いいね! 金は、後ろにも下がれます。',
    setup: { me: [MY_KING, [GOLD, 5, 5]], opp: [OPP_KING, [SILVER, 5, 6]] },
  },
  {
    id: 'bishop',
    title: '角(かく)の動き',
    text: ['角は、斜めに、何マスでも進めます。他の駒にぶつかるまで、まっすぐ行けます。', '最初の位置で、色が変わらない(同じ色のマスだけを動く)のも特徴です。'],
    goalText: '角で、遠くにいる相手の歩(4四)を取ろう',
    goal: { target: S(4, 4), kind: BISHOP },
    hint: '角は、斜めに何マスでも進めるよ。',
    praise: 'お見事! 角は、斜めの長い道を走れます。',
    setup: { me: [MY_KING, [BISHOP, 8, 8]], opp: [OPP_KING, [PAWN, 4, 4]] },
  },
  {
    id: 'rook',
    title: '飛(ひ)の動き',
    text: ['飛は、たて・よこに、何マスでも進めます。角と並んで、最も強い駒です。'],
    goalText: '飛で、前にいる相手の歩(5五)を取ろう',
    goal: { target: S(5, 5), kind: ROOK },
    hint: '飛は、たて・よこに何マスでも進めるよ。',
    praise: 'そのとおり! 飛は、たてよこに走ります。',
    setup: { me: [MY_KING, [ROOK, 5, 8]], opp: [OPP_KING, [PAWN, 5, 5]] },
  },
  {
    id: 'king',
    title: '玉(ぎょく)の動き',
    text: ['玉(相手側は「王」)は、全方向に1マスずつ動けます。', '玉は、取られたら負けです。だから、取られそうな場所(敵の駒の利き)には動けません。'],
    goalText: '玉を、斜め前(4八)に動かそう',
    goal: { target: S(4, 8), kind: KING },
    hint: '玉は、8方向に1マスずつ。点線のマスをタップしてね。',
    praise: 'いいね! 玉は、1マスずつ慎重に動きます。',
    setup: { me: [[KING, 5, 9]], opp: [[KING, 5, 1]] },
  },
  {
    id: 'capture',
    title: '駒を取る',
    text: ['自分の駒を、相手の駒があるマスに動かすと、その駒を取れます。', '取った駒は、あなたの「持ち駒」になります。持ち駒は、盤の下に並びます。'],
    goalText: '歩で、前にいる相手の歩(5五)を取ろう',
    goal: { target: S(5, 5), kind: PAWN },
    hint: '相手の駒がいるマスに、自分の駒を動かしてね。',
    praise: '取れたね! 取った駒は、あなたの持ち駒になりました。',
    setup: { me: [MY_KING, [PAWN, 5, 6]], opp: [OPP_KING, [PAWN, 5, 5]] },
  },
  {
    id: 'drop',
    title: '持ち駒を打つ',
    text: ['持ち駒は、自分の番に、盤の空いているマスに「打つ」ことができます(1手を使います)。', '盤の下の持ち駒をタップしてから、打ちたいマスをタップします。取られた駒は、味方の戦力として何度でも使えるのが、将棋の面白さです。'],
    goalText: '持ち駒の歩を、3五に打とう',
    goal: { target: S(3, 5), kind: PAWN, drop: true },
    hint: '下の持ち駒の「歩」をタップして、点線のマスをタップしてね。',
    praise: '打てたね! 持ち駒は、空いているどのマスにも打てます。',
    setup: { me: [MY_KING], opp: [OPP_KING], hand: [PAWN] },
  },
  {
    id: 'promote',
    title: '成る(なる)',
    text: ['相手の陣地(いちばん奥の3段)に入る・出る・中で動くとき、駒は「成る」ことができます。成ると、より強い動きになります。', '歩・香・桂・銀は「金」と同じ動きに、角は「馬」(角+玉の動き)、飛は「龍」(飛+玉の動き)になります。成った駒は、赤い字で書かれます。', '成るか成らないかは、あとから聞かれます。「成る」を選んでみましょう。'],
    goalText: '歩を、5三に進めて「成る」を選ぼう(と金になる)',
    goal: { target: S(5, 3), kind: PAWN, promote: true },
    hint: '「成りますか?」と聞かれたら、「成る」を選んでね。',
    praise: '成れたね! 歩が「と金」になりました。',
    setup: { me: [MY_KING, [PAWN, 5, 4]], opp: [OPP_KING] },
  },
  {
    id: 'rules',
    title: 'してはいけない手(禁じ手)',
    text: [
      '二歩: 自分の歩がある筋(たて)に、もう1枚の歩を打つことはできません。',
      '打ち歩詰め: 持ち駒の歩を打って、そのまま詰ませることはできません。',
      'ほかにも、動けなくなる場所(歩・香は最奥の段、桂は奥の2段)に打つことや、自分の玉を取られる形にする手は、指せません。',
      'いま、あなたの5筋には、歩があります。持ち駒の歩をタップして、打てる場所を見てみましょう。5筋は、印が出ません。',
    ],
    goalText: '持ち駒の歩を、二歩にならない6五に打とう',
    goal: { target: S(6, 5), kind: PAWN, drop: true },
    hint: '歩がある5筋には、歩を打てないよ。6五をタップしてね。',
    illegalHint: 'そこには打てません。同じ筋に自分の歩があると、二歩(にふ)という反則です。',
    praise: 'そのとおり! 二歩にならない場所に打てました。',
    setup: { me: [MY_KING, [PAWN, 5, 7]], opp: [OPP_KING], hand: [PAWN] },
  },
  {
    id: 'mate',
    title: '王手と詰み',
    text: ['相手の玉を取れる形にすることを「王手」といいます。王手をかけられたら、逃げるか、防がないといけません。', 'どう逃げても、王手を外せない形が「詰み」で、詰ませた方が勝ちです。', '相手の王は、右上の角にいます。2枚の飛を使って、詰ませてみましょう。'],
    goalText: '飛を3一に動かして、王を詰ませよう(「成る」「成らない」はどちらでも可)',
    goal: { target: S(3, 1), kind: ROOK, mate: true },
    hint: '王が逃げられなくなる場所を探そう。飛を3一に動かすと、1段目と2段目の両方をふさげるよ。',
    praise: '詰みです! 王が逃げ場を失いました。これで、あなたの勝ちです。',
    setup: { me: [[KING, 5, 9], [ROOK, 9, 2], [ROOK, 3, 3]], opp: [OPP_KING] },
  },
  {
    id: 'summary',
    title: 'まとめと、これから',
    text: [
      '駒の強さのめやす(大きいほど強い): 歩 1・香 3・桂 3・銀 5・金 6・角 8・飛 10。取る・取られるとき、損得を考えよう。',
      '同じ形が4回くり返されると「千日手」で引き分けです(王手をかけ続けていた側は負け)。',
      'ルールは、メニューの「ルールのまとめ」でも読めます。',
      'おめでとう! 基本のルールは、これで全部です。「自由対局」でCPUと指したり、「物語」で戦国の合戦を追体験したりしてみよう。',
    ],
    goalText: null,
    goal: null,
    hint: '',
    praise: 'チュートリアルはおしまい。楽しんでね!',
    setup: 'initial',
  },
];
