import { describe, expect, it } from 'vitest';
import { DUR, SR } from './dsp/constants';
import { analyseFrame, bandsFor } from './dsp/spectrum';
import { SIGNAL_ORDER, SIGNALS, type SignalName } from './signals';

const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const bandOfPeak = (name: SignalName, at: number) => {
  const out = new Float64Array(24);
  analyseFrame(SIGNALS[name].make(), Math.round(at * SR), { hann: true, tilt: 0, nb: 24 }, out);
  return out.indexOf(Math.max(...out));
};
const bandOfHz = (hz: number) => { const e = bandsFor(24).edgesHz; return e.findIndex((v, i) => hz >= v && hz < e[i + 1]); };

describe('signals', () => {
  it('lists every signal once, each with a label and a look', () => {
    expect(new Set(SIGNAL_ORDER).size).toBe(6);
    for (const n of SIGNAL_ORDER) { expect(SIGNALS[n].label).toBeTruthy(); expect(SIGNALS[n].look.lead).toBeTruthy(); expect(SIGNALS[n].look.text).toBeTruthy(); }
  });
  for (const name of SIGNAL_ORDER) {
    it(`${name}: eight seconds, peak 0.8, faded ends, the same every time`, () => {
      const a = SIGNALS[name].make(), b = SIGNALS[name].make();
      expect(a).toHaveLength(SR * DUR);
      expect(peak(a)).toBeCloseTo(0.8, 5);
      expect(Math.abs(a[0])).toBe(0);
      expect(Math.abs(a[a.length - 1])).toBeLessThan(0.01);
      expect(Array.from(a.slice(0, 2000))).toEqual(Array.from(b.slice(0, 2000)));
    });
  }
  it('a hum sits in the low bands', () => { expect(bandOfPeak('hum', 3)).toBeLessThanOrEqual(bandOfHz(450)); });
  it('a whistle sits in the high bands', () => { expect(bandOfPeak('whistle', 3)).toBeGreaterThanOrEqual(bandOfHz(1200)); });
  it('the arpeggio starts on G3 (196 Hz)', () => { expect(Math.abs(bandOfPeak('arpeggio', 0.25) - bandOfHz(196))).toBeLessThanOrEqual(1); });
  it('a hiss lights the high side and is silent between bursts', () => {
    expect(bandOfPeak('hiss', 0.3)).toBeGreaterThanOrEqual(bandOfHz(2500));
    const x = SIGNALS.hiss.make();
    expect(peak(x.slice(Math.round(0.6 * SR), Math.round(0.95 * SR)))).toBeLessThan(1e-6);
  });
  it('drums hit on the beat and are quiet just before it', () => {
    const x = SIGNALS.drums.make();
    expect(peak(x.slice(0, 800))).toBeGreaterThan(0.3);
  });
  it('vowels are gated into words with silence between', () => {
    const x = SIGNALS.vowels.make();
    let silent = 0;
    for (let i = 0; i < x.length; i += 160) if (peak(x.slice(i, i + 160)) < 1e-6) silent++;
    expect(silent).toBeGreaterThan(20);
  });
});
