'use client';

import type { Lang } from '@/game/i18n';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export type Sfx = 'night' | 'day' | 'turn' | 'vote' | 'death' | 'end';

/** 以 WebAudio 即時合成的簡單音效，不需要任何音檔 */
export function sfx(kind: Sfx) {
  switch (kind) {
    case 'night':
      tone(196, 0, 1.6, 'sine', 0.22);
      tone(98, 0, 2.2, 'sine', 0.2);
      tone(293.7, 0.25, 1.4, 'triangle', 0.08);
      break;
    case 'day':
      tone(523.3, 0, 0.5, 'triangle', 0.14);
      tone(659.3, 0.14, 0.5, 'triangle', 0.14);
      tone(784, 0.28, 0.9, 'triangle', 0.16);
      break;
    case 'turn':
      tone(880, 0, 0.18, 'sine', 0.16);
      tone(1318.5, 0.12, 0.35, 'sine', 0.14);
      break;
    case 'vote':
      tone(440, 0, 0.12, 'square', 0.06);
      tone(440, 0.18, 0.12, 'square', 0.06);
      break;
    case 'death':
      tone(220, 0, 1.2, 'sawtooth', 0.08, 55);
      break;
    case 'end':
      tone(392, 0, 0.4, 'triangle', 0.14);
      tone(523.3, 0.2, 0.4, 'triangle', 0.14);
      tone(659.3, 0.4, 0.4, 'triangle', 0.14);
      tone(784, 0.6, 1.2, 'triangle', 0.18);
      break;
  }
}

/** 法官語音：使用瀏覽器內建的語音合成朗讀旁白 */
export function speak(text: string, lang: Lang) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice =
      lang === 'en'
        ? (voices.find((v) => /en[-_]US/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)))
        : (voices.find((v) => /zh[-_]TW/i.test(v.lang)) ??
          voices.find((v) => /zh[-_]HK/i.test(v.lang)) ??
          voices.find((v) => /^zh/i.test(v.lang)));
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (lang === 'en' ? 'en-US' : 'zh-TW');
    u.rate = 1.02;
    u.pitch = 0.85;
    u.volume = 0.9;
    synth.speak(u);
  } catch {
    // 不支援語音合成時靜默略過
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // 忽略
  }
}
