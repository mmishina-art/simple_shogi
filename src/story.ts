// ストーリーモード「葦原の乱」のデータ。登場人物・各話の会話・対戦相手の強さ。
// すべて架空の物語で、実在の人物・団体とは関係ありません。

/** 顔のイラストの種類（描き分けは portrait.ts） */
export type LookKind = 'lord' | 'elder' | 'bandit' | 'monk' | 'woman' | 'strategist' | 'ninja' | 'horns' | 'moon';

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

export interface Line {
  /** 話す人の id。'narr' は地の文 */
  who: string;
  text: string;
}

export type Place = 'castle' | 'pass' | 'temple' | 'plain' | 'strategy' | 'night' | 'fortress' | 'tenka';

export interface Chapter {
  id: number;
  title: string;
  place: Place;
  placeName: string;
  /** 対戦相手の id */
  opponent: string;
  /** CPU の強さ（1〜8） */
  level: number;
  intro: Line[];
  /** 勝ったあとの会話 */
  win: Line[];
  /** 負けたときの相手のひとこと */
  loseQuote: Line;
}

export const CHARACTERS: Character[] = [
  { id: 'touma', name: '葦原 灯馬', title: '葦原家の若き当主', look: 'lord', voice: 220, tone: 1 },
  { id: 'genzai', name: '伊吹 玄斎', title: '葦原家の家老', look: 'elder', voice: 150, tone: 2 },
  { id: 'onikuma', name: '鬼熊', title: '峠の山賊の頭', look: 'bandit', voice: 105, tone: 3 },
  { id: 'enkai', name: '円海', title: '法泉寺の僧兵', look: 'monk', voice: 135, tone: 4 },
  { id: 'kaede', name: '楓', title: '霧生家の女武者', look: 'woman', voice: 330, tone: 5 },
  { id: 'soun', name: '静馬 宗雲', title: '名高い軍師', look: 'strategist', voice: 185, tone: 6 },
  { id: 'kagemaru', name: '影丸', title: '伊賀の忍びの頭', look: 'ninja', voice: 125, tone: 7 },
  { id: 'yoshikage', name: '黒羽 義景', title: '北嶺の覇王', look: 'horns', voice: 98, tone: 8 },
  { id: 'hidetsugu', name: '天城 秀嗣', title: '天下人', look: 'moon', voice: 118, tone: 9 },
];

export const characterOf = (id: string): Character | undefined => CHARACTERS.find((c) => c.id === id);

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: '稽古',
    place: 'castle',
    placeName: '葦原城',
    opponent: 'genzai',
    level: 1,
    intro: [
      { who: 'narr', text: '時は戦国。応仁の乱より百年あまり、日ノ本は群雄が入り乱れ、戦の火は絶えることがなかった。' },
      { who: 'narr', text: 'そんな世に、ただ一つ、古くから守られてきた約束がある。「盤上の定め」。' },
      { who: 'narr', text: '領地も同盟も、ときには和睦さえも、将棋の一局で決める習わしである。盤は戦場の縮図、駒は兵。国と民の血を流さぬための、先人の知恵であった。' },
      { who: 'narr', text: 'ところが、その約束を踏みにじる者が現れた。北嶺の覇王・黒羽義景。ひとたび兵を挙げ、小国・葦原を攻め落としたのだ。' },
      { who: 'genzai', text: '灯馬さま。お父上、頼孝さまは、最後まで盤上の定めを信じておられました。' },
      { who: 'touma', text: '……わかっている、玄斎。城は焼かれたが、民はまだ生きている。父上の志を、俺が継ぐ。' },
      { who: 'genzai', text: 'ならば、まずはこの老いぼれと一局。腕を確かめさせていただきましょう。手加減は無用ですぞ。' },
    ],
    win: [
      { who: 'genzai', text: 'お見事……！ いつのまに、これほどの手を。お父上の面影が見えましたぞ。' },
      { who: 'touma', text: '玄斎の教えのおかげだ。さあ、旅に出よう。味方を集め、黒羽を止める。' },
      { who: 'genzai', text: 'はっ。まずは街道の峠へ。ですが、あそこには山賊が居座っておりまする。' },
    ],
    loseQuote: { who: 'genzai', text: 'まだまだ、若。駒の動きを一つずつ思い出しなされ。' },
  },
  {
    id: 2,
    title: '峠の関所',
    place: 'pass',
    placeName: '鬼ヶ峠',
    opponent: 'onikuma',
    level: 2,
    intro: [
      { who: 'narr', text: '街道の峠には、勝手に関所を構えた山賊がいた。' },
      { who: 'onikuma', text: 'おう、止まれ止まれ！ ここを通りたきゃ、通行料を置いていきな。金か、でなきゃ命だ。' },
      { who: 'touma', text: '金はない。だが、盤上の定めなら受けて立つ。一局指して、俺が勝ったら通してもらう。' },
      { who: 'onikuma', text: 'ぶははっ、盤上の定めだと？ 黒羽の野郎が破って以来、そんなもん守る奴ぁいねえよ。……だが面白え、乗ってやる！' },
    ],
    win: [
      { who: 'onikuma', text: 'ま、参った……。力でも駒でも、この鬼熊が負けるとはな。' },
      { who: 'touma', text: '約束通り、通してもらう。' },
      { who: 'onikuma', text: '待ちな、若造。気に入った。この先の法泉寺に、俺の昔なじみの坊主がいる。俺の名を出せば、話くらいは聞いてくれるだろうよ。' },
    ],
    loseQuote: { who: 'onikuma', text: 'がっはっは！ 出直してきな、若造！' },
  },
  {
    id: 3,
    title: '法泉寺の問答',
    place: 'temple',
    placeName: '法泉寺',
    opponent: 'enkai',
    level: 3,
    intro: [
      { who: 'narr', text: '山深い古寺・法泉寺。そこには、寺を守る僧兵たちが暮らしていた。' },
      { who: 'enkai', text: '鬼熊の名を出す者とは、お主か。ここは仏の庭、軽々しく兵を借りに来る場所ではない。' },
      { who: 'touma', text: '兵を借りに来たのではない。黒羽は、盤上の定めを破って民を傷つけた。この寺の僧は、それを黙って見ているのか。' },
      { who: 'enkai', text: '……口は達者なようじゃ。ならば拙僧と一局。駒の動かし方に、お主の心が出る。' },
    ],
    win: [
      { who: 'enkai', text: '焦らず、欲張らず、それでいて退かぬ。……迷いのない良い指し回しじゃった。' },
      { who: 'enkai', text: '寺の僧兵は貸せぬ。じゃが、この寺に伝わる情報なら授けよう。黒羽は北の砦に兵を集めておる。南の霧生家を、背後から襲うつもりじゃ。' },
      { who: 'touma', text: '霧生家……。ならば、先に会いに行かねば。' },
    ],
    loseQuote: { who: 'enkai', text: '南無……。心を静めて、もう一度参られよ。' },
  },
  {
    id: 4,
    title: '霧生の女武者',
    place: 'plain',
    placeName: '霧生の野',
    opponent: 'kaede',
    level: 4,
    intro: [
      { who: 'narr', text: '霧の立ちこめる南の野。霧生家の若き女武者・楓が、見慣れぬ旅人に刀の柄をかけた。' },
      { who: 'kaede', text: '何者だ。名を名乗れ。黒羽の使いなら、ここで斬る。' },
      { who: 'touma', text: '葦原灯馬。黒羽に城を焼かれた者だ。あなたたちが次に狙われると、伝えに来た。' },
      { who: 'kaede', text: '……葦原の。証を立てよ。刀ではなく、盤で。我らは盤上でしか、人を信じぬ。' },
    ],
    win: [
      { who: 'kaede', text: '負けた。……疑って悪かった。あなたの指す手は、嘘をつかぬ手だ。' },
      { who: 'kaede', text: '霧生家は葦原と同盟を結ぼう。我が一族の兵、あなたに預ける。だが気をつけて。黒羽の陰には、恐るべき軍師がいる。' },
      { who: 'touma', text: '軍師……。静馬宗雲だな。' },
    ],
    loseQuote: { who: 'kaede', text: 'この程度では、黒羽には届かない。もう一局だ。' },
  },
  {
    id: 5,
    title: '軍師の罠',
    place: 'strategy',
    placeName: '評定の間',
    opponent: 'soun',
    level: 5,
    intro: [
      { who: 'narr', text: '霧生家の城に、黒羽方の使者として一人の男が訪れた。名高い軍師・静馬宗雲である。' },
      { who: 'soun', text: 'これはこれは、葦原の若君。黒羽さまは寛大にも、降伏すれば命だけは助けると仰せです。' },
      { who: 'touma', text: '断る。降伏など、父上が許さない。' },
      { who: 'soun', text: 'ふふ、ならば盤上でお決めになりますか。私は一手先ではなく、十手先の駒を動かします。……さて、見抜けますかな。' },
    ],
    win: [
      { who: 'soun', text: '……罠を見破られたか。十手先を見るとは、若君もたいした御仁だ。' },
      { who: 'soun', text: '一つ教えて差し上げよう。黒羽さまは今宵、あなたの寝首をかく手を打たれた。伊賀の忍びを放ったのです。' },
      { who: 'touma', text: '何だと……！' },
    ],
    loseQuote: { who: 'soun', text: '駒は、動かす前に勝負が決まるもの。出直しなされ。' },
  },
  {
    id: 6,
    title: '月夜の忍び',
    place: 'night',
    placeName: '霧生城 月夜の庭',
    opponent: 'kagemaru',
    level: 6,
    intro: [
      { who: 'narr', text: '月のない夜。灯馬の寝所に、音もなく黒い影が降りた。' },
      { who: 'kagemaru', text: '……動くな。その首、黒羽さまの命により頂戴する。' },
      { who: 'touma', text: '刀を抜く前に聞け。お前たち忍びは、金で動くのだろう。ならば、盤上の定めを知っているはずだ。' },
      { who: 'kagemaru', text: '……（息を呑む）なるほど、肝の据わった小僧。よかろう、一局だ。負ければ、お前の首は夜明けまでに頂く。' },
    ],
    win: [
      { who: 'kagemaru', text: '影の動きを読むとは……。我が主は、お前を侮りすぎたようだ。' },
      { who: 'kagemaru', text: '約束は約束。今夜は退こう。……ひとつ、礼に教えてやる。黒羽は北嶺の本城で、お前を待っている。' },
      { who: 'touma', text: '決着をつけに行く。父上の仇として。' },
    ],
    loseQuote: { who: 'kagemaru', text: '……遅い。影は、すでに背後にいる。' },
  },
  {
    id: 7,
    title: '北嶺の覇王',
    place: 'fortress',
    placeName: '北嶺城',
    opponent: 'yoshikage',
    level: 7,
    intro: [
      { who: 'narr', text: '雪をいただく北嶺の城。灯馬は味方の旗とともに、巨大な城門の前に立った。' },
      { who: 'yoshikage', text: 'ほう、よく来たな、葦原の小倅。頼孝の最期は、見事であったぞ。' },
      { who: 'touma', text: '黒羽義景。盤上の定めを破ったその口で、父上の名を語るな。' },
      { who: 'yoshikage', text: '定めだと？ 弱き者の言い訳よ。……だが、お前がそれほど言うなら受けてやろう。俺に勝てたなら、軍を退いてやる。' },
      { who: 'touma', text: '二言はないな。' },
    ],
    win: [
      { who: 'yoshikage', text: '……馬鹿な。この俺が、盤上で……。' },
      { who: 'yoshikage', text: '見事だ、灯馬。約束だ、兵は退く。……だが覚えておけ。この乱世を真に終わらせんとする男が、まだ上にいる。' },
      { who: 'touma', text: '天下人……天城秀嗣。' },
      { who: 'yoshikage', text: '奴は盤上の定めなど、とうに信じておらぬ。行くなら覚悟して行け。' },
    ],
    loseQuote: { who: 'yoshikage', text: 'ふん、その程度で俺に挑んだのか。' },
  },
  {
    id: 8,
    title: '天下一番',
    place: 'tenka',
    placeName: '天守閣',
    opponent: 'hidetsugu',
    level: 8,
    intro: [
      { who: 'narr', text: '天下統一まであと一歩。都の天守に座す男、天城秀嗣が、静かに灯馬を迎えた。' },
      { who: 'hidetsugu', text: '葦原の若き当主。黒羽を盤上で破ったそうだな。……面白い。その腕、見せてもらおう。' },
      { who: 'touma', text: '天下を取るのに、これ以上の血は要らない。俺が勝ったら、すべての領主に盤上の定めを守らせる。' },
      { who: 'hidetsugu', text: '甘いな。人は力でしかまとまらぬ。……だが、お前の盤が本物なら、この秀嗣も認めよう。さあ、天下一番の一局を始めようか。' },
    ],
    win: [
      { who: 'hidetsugu', text: '……見事。力ではなく、一手一手の積み重ねが、これほどの重さを持つとは。' },
      { who: 'hidetsugu', text: '負けは負けだ。天城秀嗣、盤上の定めに従おう。……灯馬、お前が決めよ。この国のかたちを。' },
    ],
    loseQuote: { who: 'hidetsugu', text: '天下は、まだ遠いな。もう一度、挑んでみせよ。' },
  },
];

export const ENDING: Line[] = [
  { who: 'narr', text: '天城秀嗣は兵を退き、日ノ本の諸侯は、再び「盤上の定め」を守ることを誓った。' },
  { who: 'narr', text: '灯馬は城に戻り、焼け跡に新しい葦原の城を築いた。そこには、民も、鬼熊も、円海も、楓も、そして玄斎の笑顔もあった。' },
  { who: 'genzai', text: '灯馬さま。お父上も、きっと天から喜んでおられますぞ。' },
  { who: 'touma', text: '戦を終わらせたのは、刀ではなく、一手一手を重ねる心だった。……父上、俺は、これからも盤に向かうよ。' },
  { who: 'narr', text: 'こうして乱世は終わりを告げ、盤の音が響く、穏やかな時代が始まった。―― 完 ――' },
];

/** 章の番号を漢数字にする（第一話 など） */
export function chapterLabel(n: number): string {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return `第${digits[n] ?? String(n)}話`;
}
