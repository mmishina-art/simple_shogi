// 駒の見た目。五角形の木の駒に、漢字を書く。向き（相手の駒は上下さかさま）は CSS で変える。
import { KING, type Side, isPromoted } from './shogi';

// 添字は駒の種類。成り駒は 1 文字の略字にする（成香 = 杏、成桂 = 圭、成銀 = 全）
const FACES = ['', '歩', '香', '桂', '銀', '金', '角', '飛', '玉', 'と', '杏', '圭', '全', '馬', '龍'];

export function faceOf(kind: number, side: Side): string {
  return kind === KING && side === 1 ? '王' : FACES[kind];
}

/** 駒の要素。flip が true なら上下さかさま（向かい側の駒） */
export function pieceElement(kind: number, side: Side, flip: boolean): HTMLElement {
  const piece = document.createElement('span');
  piece.className = 'piece';
  if (isPromoted(kind) && kind !== KING) piece.classList.add('promoted');
  if (flip) piece.classList.add('flip');
  piece.dataset.kind = String(kind);
  const face = document.createElement('span');
  face.className = 'face';
  face.textContent = faceOf(kind, side);
  piece.append(face);
  return piece;
}
