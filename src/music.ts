// BGM。music-data.ts の楽譜を、Web Audio で演奏する（音声ファイルは持たない）。
// 画面が変わると、曲をゆっくり切り替える。ブラウザは操作の前は音を出せないので、最初のタップで始まる。
import { audio, peekAudio } from './sound';
import { type LayerKind, type NoteEvent, type TrackName, TRACKS, parseScore, semitoneToHz } from './music-data';
import { load, save } from './storage';

export type { TrackName };

const LOOKAHEAD = 0.35; // この秒数先までの音を、あらかじめ予約しておく
const TICK_MS = 120;
const MASTER_VOLUME = 0.45;
const FADE_IN = 1.2;
const FADE_OUT = 0.6;

interface Prepared {
  bpm: number;
  root: number;
  steps: number;
  layers: { kind: LayerKind; volume: number; byStep: Map<number, NoteEvent> }[];
}

const prepared = new Map<TrackName, Prepared>();
function prepare(name: TrackName): Prepared {
  let p = prepared.get(name);
  if (!p) {
    const track = TRACKS[name];
    p = {
      bpm: track.bpm,
      root: track.root,
      steps: track.steps,
      layers: track.layers.map((l) => ({
        kind: l.kind,
        volume: l.volume,
        byStep: new Map(parseScore(l.score, l.kind === 'taiko').events.map((e) => [e.step, e])),
      })),
    };
    prepared.set(name, p);
  }
  return p;
}

let enabled = load('bgm', true);
let wanted: TrackName | null = null;
let master: GainNode | undefined;
let noise: AudioBuffer | undefined;
let timer = 0;
let current: { name: TrackName; gain: GainNode; step: number; next: number } | null = null;

export const isBgmOn = (): boolean => enabled;

export function setBgm(on: boolean): void {
  enabled = on;
  save('bgm', on);
  apply();
}

/** 曲を切り替える。null で止める（同じ曲なら何もしない） */
export function setTrack(name: TrackName | null): void {
  if (name === wanted) return;
  wanted = name;
  // テストが「どの曲が選ばれたか」を確認できるようにイベントを出す
  document.dispatchEvent(new CustomEvent('app:music', { detail: { track: name } }));
  apply();
}

function apply(): void {
  try {
    fadeOutCurrent();
    if (!enabled || wanted === null) return;
    const ac = audio();
    if (!master) {
      master = ac.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ac.destination);
    }
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.linearRampToValueAtTime(1, ac.currentTime + FADE_IN);
    gain.connect(master);
    current = { name: wanted, gain, step: 0, next: ac.currentTime + 0.15 };
    timer ||= window.setInterval(tick, TICK_MS);
  } catch {
    // 音が出せなくても続行する
  }
}

function fadeOutCurrent(): void {
  if (!current) return;
  const { gain } = current;
  current = null;
  try {
    const ac = audio();
    gain.gain.cancelScheduledValues(ac.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, ac.currentTime + FADE_OUT);
    window.setTimeout(() => gain.disconnect(), (FADE_OUT + 0.2) * 1000);
  } catch {
    gain.disconnect();
  }
}

function tick(): void {
  const ac = peekAudio();
  if (!current || !ac) return;
  if (ac.state !== 'running') {
    // まだ音が出せない（最初のタップ前）間は、曲を進めない
    current.next = ac.currentTime + 0.15;
    return;
  }
  const p = prepare(current.name);
  const stepSeconds = 60 / p.bpm / 2;
  while (current.next < ac.currentTime + LOOKAHEAD) {
    schedule(ac, p, current.step, current.next, stepSeconds, current.gain);
    current.next += stepSeconds;
    current.step = (current.step + 1) % p.steps;
  }
}

/** 曲を最初から seconds 秒ぶん、ac に予約する（OfflineAudioContext に書き出して、音量を測るのにも使う） */
export function renderTrack(ac: BaseAudioContext, name: TrackName, seconds: number, out: AudioNode = ac.destination): void {
  const p = prepare(name);
  const stepSeconds = 60 / p.bpm / 2;
  for (let i = 0; i * stepSeconds < seconds; i++) schedule(ac, p, i % p.steps, i * stepSeconds, stepSeconds, out);
}

function schedule(ac: BaseAudioContext, p: Prepared, step: number, at: number, stepSeconds: number, out: AudioNode): void {
  for (const layer of p.layers) {
    const e = layer.byStep.get(step);
    if (!e) continue;
    const seconds = e.length * stepSeconds;
    if (layer.kind === 'taiko') drum(ac, at, e.semitone === 0, layer.volume, out);
    else {
      const hz = semitoneToHz(p.root, e.semitone);
      if (layer.kind === 'koto') pluck(ac, at, hz, layer.volume, out);
      else if (layer.kind === 'flute') breath(ac, at, hz, seconds, layer.volume, out);
      else pad(ac, at, hz, seconds, layer.volume, out);
    }
  }
}

/** 琴: はじいた音（すぐ立ち上がり、ゆっくり消える） */
function pluck(ac: BaseAudioContext, at: number, hz: number, volume: number, out: AudioNode): void {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.3 * volume, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(hz * 9, at);
  filter.frequency.exponentialRampToValueAtTime(hz * 2, at + 0.5);
  filter.connect(gain).connect(out);
  for (const [type, mult, level] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sine', 3.01, 0.12]] as const) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = hz * mult;
    g.gain.value = level;
    osc.connect(g).connect(filter);
    osc.start(at);
    osc.stop(at + 1.5);
  }
}

/** 尺八風: ゆるやかに立ち上がり、かすかにゆれる長い音 */
function breath(ac: BaseAudioContext, at: number, hz: number, seconds: number, volume: number, out: AudioNode): void {
  const end = at + Math.max(seconds, 0.4);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.22 * volume, at + 0.12);
  gain.gain.setValueAtTime(0.22 * volume, end - 0.1);
  gain.gain.linearRampToValueAtTime(0.0001, end + 0.25);
  gain.connect(out);
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hz;
  const lfo = ac.createOscillator();
  const lfoDepth = ac.createGain();
  lfo.frequency.value = 5;
  lfoDepth.gain.value = 9; // セント
  lfo.connect(lfoDepth).connect(osc.detune);
  const air = ac.createOscillator();
  const airGain = ac.createGain();
  air.type = 'triangle';
  air.frequency.value = hz * 2;
  airGain.gain.value = 0.18;
  osc.connect(gain);
  air.connect(airGain).connect(gain);
  for (const o of [osc, lfo, air]) {
    o.start(at);
    o.stop(end + 0.3);
  }
}

/** 低くて長い、ゆっくり立ち上がる持続音 */
function pad(ac: BaseAudioContext, at: number, hz: number, seconds: number, volume: number, out: AudioNode): void {
  const end = at + seconds;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.18 * volume, at + 1);
  gain.gain.setValueAtTime(0.18 * volume, Math.max(at + 1, end - 1));
  gain.gain.linearRampToValueAtTime(0.0001, end + 0.5);
  gain.connect(out);
  for (const [type, detune] of [['sine', 0], ['triangle', 7]] as const) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(at);
    osc.stop(end + 0.6);
  }
}

/** 太鼓: 低い「ドン」と、高い「カッ」 */
function drum(ac: BaseAudioContext, at: number, don: boolean, volume: number, out: AudioNode): void {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime((don ? 0.6 : 0.25) * volume, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + (don ? 0.4 : 0.12));
  gain.connect(out);
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(don ? 130 : 220, at);
  osc.frequency.exponentialRampToValueAtTime(don ? 48 : 150, at + (don ? 0.3 : 0.1));
  osc.connect(gain);
  osc.start(at);
  osc.stop(at + 0.5);
  if (!don) {
    noise ??= makeNoise(ac);
    const src = ac.createBufferSource();
    src.buffer = noise;
    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2200;
    src.connect(band).connect(gain);
    src.start(at);
    src.stop(at + 0.1);
  }
}

function makeNoise(ac: BaseAudioContext): AudioBuffer {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.12), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// ---- ブラウザの決まりへの対応 ----

/** 最初のタップ・キー操作で、音を出せる状態にする */
function unlock(): void {
  try {
    void audio().resume();
  } catch {
    // 続行する
  }
}
for (const type of ['pointerdown', 'keydown'] as const) document.addEventListener(type, unlock, { passive: true });

// 画面が見えなくなったら音を止める（バックグラウンドで鳴らし続けない）
document.addEventListener('visibilitychange', () => {
  const ac = peekAudio();
  if (!ac) return;
  if (document.hidden) void ac.suspend();
  else void ac.resume();
});
