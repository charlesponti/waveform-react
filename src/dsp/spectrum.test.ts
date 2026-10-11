import { describe, expect, it } from 'vitest';
import { FFT_N, HI_HZ, LO_HZ, SR, TAU } from './constants';
import { analyseFrame, bandsFor, hann } from './spectrum';

const sine = (hz: number, amp: number, n = 4096) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((TAU * hz * i) / SR));

describe('bandsFor', () => {
  it('has nb log-spaced bands from LO_HZ to HI_HZ and caches them', () => {
    const b = bandsFor(24);
    expect(b.edgesHz).toHaveLength(25);
    expect(b.edgesHz[0]).toBeCloseTo(LO_HZ, 9);
    expect(b.edgesHz[24]).toBeCloseTo(HI_HZ, 6);
    const ratios = b.edgesHz.slice(1).map((e, i) => e / b.edgesHz[i]);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(1e-9);
    expect(b.centre[0]).toBeCloseTo(Math.sqrt(b.edgesHz[0] * b.edgesHz[1]), 9);
    expect(b.bin[1]).toBeCloseTo((b.edgesHz[1] * FFT_N) / SR, 9);
    expect(bandsFor(24)).toBe(b);
    expect(bandsFor(12).edgesHz).toHaveLength(13);
  });
});

describe('analyseFrame', () => {
  const flat = { hann: true, tilt: 0, nb: 24 };
  it('reads amplitude A as A/sqrt(2) and the bands add up to the mean square', () => {
    const out = new Float64Array(24);
    analyseFrame(sine(1000, 0.5), 2048, flat, out);
    const ms = out.reduce((s, v) => s + v * v, 0);
    expect(ms).toBeCloseTo(0.125, 2);
  });
  it('without the window the same tone leaks into far bands', () => {
    const tapered = new Float64Array(24), square = new Float64Array(24);
    const s = sine(1013, 0.5);
    analyseFrame(s, 2048, flat, tapered);
    analyseFrame(s, 2048, { ...flat, hann: false }, square);
    const far = (a: Float64Array) => a[2] + a[3];
    expect(far(square)).toBeGreaterThan(far(tapered) * 3);
  });
  it('rectangular normalisation still gives A/sqrt(2) for a bin-centred tone', () => {
    const out = new Float64Array(24);
    analyseFrame(sine(15.625 * 64, 0.5), 2048, { hann: false, tilt: 0, nb: 24 }, out);
    expect(Math.sqrt(out.reduce((s, v) => s + v * v, 0))).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });
  it('tilt lifts bands above 1 kHz and lowers those below', () => {
    const f = new Float64Array(24), t = new Float64Array(24);
    const hi = sine(4000, 0.5), lo = sine(200, 0.5);
    analyseFrame(hi, 2048, flat, f); analyseFrame(hi, 2048, { ...flat, tilt: 3 }, t);
    expect(Math.max(...t) / Math.max(...f)).toBeGreaterThan(1.5);
    analyseFrame(lo, 2048, flat, f); analyseFrame(lo, 2048, { ...flat, tilt: 3 }, t);
    expect(Math.max(...t) / Math.max(...f)).toBeLessThan(0.7);
  });
  it('loops over the signal when the window reaches before its start', () => {
    const a = new Float64Array(24), b = new Float64Array(24);
    const s = sine(500, 0.4, 2048);
    analyseFrame(s, 100, flat, a);
    analyseFrame(s, 100 + 2048, flat, b);
    expect(Array.from(a)).toEqual(Array.from(b));
  });
  it('hann is a periodic window: zero at the start, one in the middle', () => {
    expect(hann[0]).toBe(0);
    expect(hann[FFT_N / 2]).toBeCloseTo(1, 12);
  });
});
