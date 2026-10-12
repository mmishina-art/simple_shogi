// 物語の会話シーン。タップで次の台詞へ。「スキップ」で最後まで飛ばす。
import { portraitSvg } from './portrait';
import { type Line, type Place, characterOf } from './story';
import { byId, prefersReducedMotion } from './ui';

const CHAR_MS = 28;

export function runScene(lines: Line[], place: Place, placeName: string): Promise<void> {
  const root = byId('screen-scene');
  root.dataset.place = place;
  byId('scene-place').textContent = placeName;
  const box = byId('scene-box');
  const skip = byId('scene-skip');
  const portrait = byId('scene-portrait');
  const speaker = byId('scene-speaker');
  const text = byId('scene-text');
  const sr = byId('scene-sr');

  return new Promise((resolve) => {
    let index = 0;
    let timer = 0;
    let typing = false;

    const complete = (full: string): void => {
      window.clearInterval(timer);
      typing = false;
      text.textContent = full;
      box.classList.remove('typing');
    };

    const show = (): void => {
      const line = lines[index];
      const who = characterOf(line.who);
      root.classList.toggle('narration', !who);
      speaker.textContent = who ? who.name : '';
      speaker.hidden = !who;
      portrait.replaceChildren();
      portrait.hidden = !who;
      if (who) {
        portrait.dataset.tone = String(who.tone);
        portrait.append(portraitSvg(who.look));
      }
      sr.textContent = `${who ? `${who.name}: ` : ''}${line.text}`;
      window.clearInterval(timer);
      if (prefersReducedMotion()) {
        complete(line.text);
        return;
      }
      let n = 0;
      typing = true;
      box.classList.add('typing');
      text.textContent = '';
      timer = window.setInterval(() => {
        n++;
        text.textContent = line.text.slice(0, n);
        if (n >= line.text.length) complete(line.text);
      }, CHAR_MS);
    };

    const end = (): void => {
      window.clearInterval(timer);
      box.removeEventListener('click', next);
      skip.removeEventListener('click', end);
      resolve();
    };

    function next(): void {
      if (typing) {
        complete(lines[index].text);
        return;
      }
      index++;
      if (index >= lines.length) end();
      else show();
    }

    box.addEventListener('click', next);
    skip.addEventListener('click', end);
    show();
  });
}
