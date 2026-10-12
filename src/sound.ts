// 効果音は Web Audio で合成する（音声ファイルは持たない）。オン/オフ設定は必ず用意する。
import { load, save } from './storage';

export type SoundName = 'tap' | 'move' | 'capture' | 'check' | 'promote' | 'win' | 'lose' | 'draw' | 'voice';

let ctx: AudioContext | undefined;
let enabled = load('sound', true);

export const isSoundOn = (): boolean => enabled;

export function setSound(on: boolean): void {
  enabled = on;
  save('sound', on);
}

/** すでに作ってあれば、その AudioContext（作らない・resume しない） */
export const peekAudio = (): AudioContext | undefined => ctx;

/** 効果音と BGM で共有する AudioContext */
export function audio(): AudioContext {
  ctx ??= new AudioContext();
  // iPhone では操作のあとに resume が必要
  void ctx.resume();
  return ctx;
}

/** 木の駒を盤に打つ「パチッ」という音 */
function clack(ac: AudioContext, at: number, strength: number): void {
  const length = Math.floor(ac.sampleRate * 0.05);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.18));
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1700;
  band.Q.value = 0.9;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.5 * strength, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  noise.connect(band).connect(gain).connect(ac.destination);
  noise.start(at);
  tone(ac, at, 190, 0.09, 0.22 * strength, 'sine');
}

function tone(ac: AudioContext, at: number, frequency: number, seconds: number, volume: number, type: OscillatorType = 'triangle'): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + seconds);
}

// 都節(みやこぶし)風の音階: ミ ファ ラ シ ド
const SCALE = [659.25, 698.46, 880, 987.77, 1046.5];

export function playSound(name: SoundName): void {
  if (!enabled) return;
  try {
    const ac = audio();
    const t = ac.currentTime;
    switch (name) {
      case 'tap':
        tone(ac, t, 520, 0.06, 0.06, 'sine');
        break;
      case 'move':
        clack(ac, t, 1);
        break;
      case 'capture':
        clack(ac, t, 1.3);
        clack(ac, t + 0.09, 0.8);
        break;
      case 'promote':
        clack(ac, t, 1);
        tone(ac, t + 0.08, SCALE[2], 0.25, 0.08);
        tone(ac, t + 0.16, SCALE[4], 0.35, 0.08);
        break;
      case 'check':
        tone(ac, t, 330, 0.7, 0.14, 'sine');
        tone(ac, t, 660, 0.5, 0.05, 'sine');
        break;
      case 'win':
        [0, 1, 2, 3, 4].forEach((i) => tone(ac, t + i * 0.16, SCALE[i], 0.6, 0.1));
        tone(ac, t + 0.9, SCALE[4] * 2, 0.9, 0.08);
        break;
      case 'lose':
        [4, 3, 2, 0].forEach((s, i) => tone(ac, t + i * 0.22, SCALE[s] / 2, 0.7, 0.1));
        break;
      case 'draw':
        tone(ac, t, SCALE[2], 0.5, 0.09);
        tone(ac, t + 0.25, SCALE[0], 0.7, 0.09);
        break;
    }
    // テストが「どの音が鳴ったか」を確認できるようにイベントを出す
    document.dispatchEvent(new CustomEvent('app:sound', { detail: { name } }));
  } catch {
    // 音が出せなくても続行する
  }
}

/** 台詞の 1 文字ぶんの「しゃべり声」（短い「ぽ」）。frequency は voiceFrequency() で決める。 */
export function playVoice(frequency: number): void {
  if (!enabled) return;
  try {
    const ac = audio();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency * 1.06, t);
    osc.frequency.exponentialRampToValueAtTime(frequency, t + 0.05);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(filter).connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.08);
    document.dispatchEvent(new CustomEvent('app:sound', { detail: { name: 'voice' satisfies SoundName, frequency } }));
  } catch {
    // 音が出せなくても続行する
  }
}
