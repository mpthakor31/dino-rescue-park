// All sounds are generated with code (no audio files needed).
import { save } from './save.js';

let ctx = null;
let master, musicGain, sfxGain;
let musicTimer = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.55;
  sfxGain.connect(master);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);
  if (save.music) startMusic();
}

function tone(freq, dur, { type = 'sine', vol = 1, slide = 0, delay = 0, attack = 0.01, dest } = {}) {
  if (!ctx || !save.sound) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest || sfxGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.5, freq = 1200, delay = 0, q = 1 } = {}) {
  if (!ctx || !save.sound) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  src.start(t);
}

export const sfx = {
  tap: () => tone(660, 0.08, { type: 'triangle', vol: 0.5 }),
  pop: () => tone(400, 0.15, { type: 'sine', vol: 0.7, slide: 500 }),
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.18 }); tone(1319, 0.18, { type: 'square', vol: 0.18, delay: 0.07 }); },
  jump: () => tone(300, 0.25, { type: 'triangle', vol: 0.5, slide: 500 }),
  boing: () => tone(220, 0.35, { type: 'sine', vol: 0.8, slide: -120 }),
  crack: () => { noise(0.12, { vol: 0.8, freq: 2500, q: 2 }); tone(180, 0.1, { type: 'square', vol: 0.15 }); },
  chomp: () => { noise(0.08, { vol: 0.6, freq: 800 }); noise(0.08, { vol: 0.5, freq: 700, delay: 0.14 }); },
  bubble: () => tone(500 + Math.random() * 600, 0.12, { type: 'sine', vol: 0.35, slide: 400 }),
  giggle: () => { [0, 0.09, 0.18].forEach((d, i) => tone(700 + i * 120, 0.08, { type: 'triangle', vol: 0.35, delay: d, slide: 150 })); },
  roar: () => { tone(160, 0.5, { type: 'sawtooth', vol: 0.25, slide: 120 }); tone(240, 0.45, { type: 'square', vol: 0.08, slide: 80 }); },
  whoosh: () => noise(0.35, { vol: 0.4, freq: 600, q: 0.7 }),
  cheer: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.4, delay: i * 0.09 })); },
  levelUp: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.12, delay: i * 0.08 })); },
  snore: () => tone(110, 0.8, { type: 'sine', vol: 0.3, slide: 30, attack: 0.3 }),
};

// ---- Background music: cheerful pentatonic loop ----
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const MELODY = [0, 2, 4, 2, 5, 4, 2, 0, 3, 4, 5, 7, 5, 4, 2, -1, 0, 2, 4, 5, 7, 5, 4, 2, 4, 3, 2, 1, 0, -1, 0, -1];
const BASS = [0, 0, 5, 5, 3, 3, 4, 4];

function startMusic() {
  if (!ctx || musicTimer) return;
  let step = 0;
  let next = ctx.currentTime + 0.1;
  const beat = 0.23;
  musicTimer = setInterval(() => {
    while (next < ctx.currentTime + 0.4) {
      const m = MELODY[step % MELODY.length];
      if (m >= 0) {
        const f = 523.25 * Math.pow(2, SCALE[m] / 12);
        scheduleNote(f, beat * 0.9, next, 'triangle', 0.5);
      }
      if (step % 4 === 0) {
        const b = BASS[(step / 4) % BASS.length];
        scheduleNote(130.81 * Math.pow(2, SCALE[b] / 12), beat * 3.5, next, 'sine', 0.9);
      }
      if (step % 2 === 1) scheduleNote(2093, 0.03, next, 'square', 0.04);
      next += beat;
      step++;
    }
  }, 100);
}

function scheduleNote(freq, dur, t, type, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function setMusic(on) {
  save.music = on;
  if (!ctx) return;
  if (on) startMusic();
  else if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}

export function duckMusic(on) {
  if (!musicGain || !ctx) return;
  musicGain.gain.setTargetAtTime(on ? 0.0 : 0.16, ctx.currentTime, 0.1);
}
