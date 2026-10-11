import { DUR, SR, TAU } from './dsp/constants';
import { lerp, rng } from './dsp/math';

export type SignalName = 'vowels' | 'hum' | 'whistle' | 'arpeggio' | 'hiss' | 'drums';

export interface Signal {
  label: string;
  /** What to look for on the orb: a short bold lead-in, then the sentence. */
  look: { lead: string; text: string };
  make(): Float32Array;
}

const fade = (x: Float32Array) => {
  const n = Math.round(SR * 0.008);
  for (let i = 0; i < n; i++) { const g = i / n; x[i] *= g; x[x.length - 1 - i] *= g; }
  return x;
};
function normalise(x: Float32Array, peak = 0.8) {
  let m = 1e-9;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  const g = peak / m;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return fade(x);
}
const blank = () => new Float32Array(SR * DUR);

/** Eight seconds of synthetic sound at 16 kHz, each chosen to light a different part of the orb. */
export const SIGNALS: Record<SignalName, Signal> = {
  hum: {
    label: 'Hum',
    look: { lead: 'A low hum', text: 'glows on one side of the orb only: a fundamental near 110 Hz and two harmonics, stacked on the left of the map. Its slow swell breathes in and out, and its vibrato makes the glow wobble sideways a little.' },
    make() {
      const x = blank();
      let ph = 0;
      for (let i = 0; i < x.length; i++) {
        const t = i / SR, f = 110 + 4 * Math.sin(TAU * 5 * t) + 6 * Math.sin(TAU * 0.25 * t);
        ph += (TAU * f) / SR;
        const env = 0.62 + 0.38 * Math.sin(TAU * 0.5 * t - 1);
        x[i] = env * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph));
      }
      return normalise(x);
    },
  },
  whistle: {
    label: 'Whistle',
    look: { lead: 'A whistle', text: 'is one thin line, far round on the other side. Its pitch glides up and down, so the line slides across the sphere, and because older sound sits nearer the poles it leaves a curved trail behind it.' },
    make() {
      const x = blank();
      let ph = 0;
      for (let i = 0; i < x.length; i++) {
        const t = i / SR, f = 2300 + 900 * Math.sin(TAU * 0.25 * t);
        ph += (TAU * f) / SR;
        x[i] = (0.65 + 0.35 * Math.sin(TAU * 0.5 * t)) * Math.sin(ph);
      }
      return normalise(x);
    },
  },
  arpeggio: {
    label: 'Arpeggio',
    look: { lead: 'A plucked arpeggio', text: 'climbs the pitch axis one note at a time. Each note lights a new spot and then fades from the equator outwards, so on the map the notes make a diagonal staircase, and on the orb a spiral of rings.' },
    make() {
      const x = blank(), notes = [196, 392, 784, 1568];
      for (let bar = 0; bar < DUR / 2; bar++) {
        notes.forEach((f, n) => {
          const start = Math.round((bar * 2 + n * 0.5) * SR), len = Math.round(0.9 * SR);
          for (let i = 0; i < len && start + i < x.length; i++) {
            const t = i / SR, env = Math.min(1, t / 0.005) * Math.exp(-t / 0.28);
            x[start + i] += env * (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t));
          }
        });
      }
      return normalise(x);
    },
  },
  hiss: {
    label: 'Hiss',
    look: { lead: 'An "sss"', text: 'is noise, and noise has every pitch at once, mostly high. The whole high side of the orb lights together, as a wide band round the sphere, and then it all goes dark in the gap before the next one.' },
    make() {
      const x = blank(), r = rng(7);
      let prev = 0;
      for (let i = 0; i < x.length; i++) {
        const n = r() * 2 - 1, d = n - prev;
        prev = n;
        const t = i / SR, u = (t % 1) / 0.45;
        x[i] = d * (u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0);
      }
      return normalise(x);
    },
  },
  drums: {
    label: 'Drums',
    look: { lead: 'A drum loop', text: 'uses all three zones. The kick is a low blob, the snare is a short burst across the middle that the hat tops with a bright ring high up, and each hit is a ring at the equator that spreads out to the poles as it ages.' },
    make() {
      const x = blank(), r = rng(3);
      const add = (t0: number, len: number, fn: (t: number) => number) => {
        const s = Math.round(t0 * SR);
        for (let i = 0; i < Math.round(len * SR) && s + i < x.length; i++) x[s + i] += fn(i / SR);
      };
      for (let bar = 0; bar < DUR / 2; bar++) {
        const b = bar * 2;
        [0, 1].forEach((k) => add(b + k, 0.35, (t) => Math.exp(-t / 0.11) * Math.sin(TAU * (45 + 90 * Math.exp(-t / 0.04)) * t) * 1.1));
        [0.5, 1.5].forEach((k) => add(b + k, 0.25, (t) => Math.exp(-t / 0.07) * ((r() * 2 - 1) * 0.7 + 0.5 * Math.sin(TAU * 190 * t))));
        for (let h = 0; h < 8; h++) add(b + h * 0.25 + 0.125, 0.06, (t) => Math.exp(-t / 0.014) * (r() * 2 - 1) * 0.35);
      }
      let prev = 0;
      for (let i = 0; i < x.length; i++) { const hp = x[i] - 0.995 * prev; prev = x[i]; x[i] = x[i] * 0.85 + hp * 0.15; }
      return normalise(x);
    },
  },
  vowels: {
    label: 'Vowels',
    look: { lead: 'A voice', text: 'is a buzz at a steady pitch, shaped by two resonances that move as the mouth changes shape, "ah" to "ee" to "oo". They show as two bright bumps that slide along the pitch axis, with the buzz\'s harmonics as fine ridges under them.' },
    make() {
      const x = blank(), count = x.length, block = 160;
      const targets = [[700, 1200], [300, 2300], [320, 800], [700, 1200]];
      const res = (f: number, c: number, w: number) => 1 / (1 + Math.pow((f - c) / w, 2));
      const ph = new Float64Array(60), gains = new Float64Array(60);
      for (let start = 0; start < count; start += block) {
        const t = start / SR, pos = (t * 0.55) % 3, idx = Math.floor(pos), mix = pos - idx;
        const f1 = lerp(targets[idx][0], targets[idx + 1][0], mix), f2 = lerp(targets[idx][1], targets[idx + 1][1], mix);
        const pitch = 118 + 22 * Math.sin(TAU * 0.6 * t) + 8 * Math.sin(TAU * 3.1 * t);
        const nh = Math.min(59, Math.floor(7000 / pitch));
        for (let h = 1; h <= nh; h++) gains[h] = (res(pitch * h, f1, 110) + 0.7 * res(pitch * h, f2, 180)) / Math.sqrt(h);
        for (let i = start; i < Math.min(count, start + block); i++) {
          const tt = i / SR, p = 118 + 22 * Math.sin(TAU * 0.6 * tt) + 8 * Math.sin(TAU * 3.1 * tt);
          let s = 0;
          for (let h = 1; h <= nh; h++) { ph[h] += (TAU * p * h) / SR; s += gains[h] * Math.sin(ph[h]); }
          const syl = Math.pow(Math.max(0, Math.sin(TAU * 3.2 * tt)), 1.2);
          const word = 0.5 + 0.5 * Math.sin(TAU * 0.45 * tt - 0.5);
          x[i] = s * syl * (word > 0.3 ? 1 : 0) * (0.5 + 0.5 * word);
        }
      }
      return normalise(x);
    },
  },
};

export const SIGNAL_ORDER: SignalName[] = ['vowels', 'hum', 'whistle', 'arpeggio', 'hiss', 'drums'];
