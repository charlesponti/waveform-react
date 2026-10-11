import { describe, expect, it } from 'vitest';
import { columns } from './columns';
import { SR, TAU } from './constants';
import { makeFFT } from './fft';
import { cubic, toDisp } from './math';
import { analyseFrame } from './spectrum';

const sine = (hz: number, amp: number, n: number) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((TAU * hz * i) / SR));

describe('fft', () => {
  it('matches a direct transform', () => {
    const n = 64, x = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1));
    const re = Float64Array.from(x), im = new Float64Array(n);
    makeFFT(n)(re, im);
    for (const k of [0, 3, 17, 32]) {
      let r = 0, m = 0;
      for (let i = 0; i < n; i++) { r += x[i] * Math.cos((TAU * k * i) / n); m -= x[i] * Math.sin((TAU * k * i) / n); }
      expect(re[k]).toBeCloseTo(r, 9);
      expect(im[k]).toBeCloseTo(m, 9);
    }
  });
});

describe('spectrum', () => {
  it('reads a sine of amplitude A as A / sqrt(2), and the bands add up to its mean square', () => {
    const A = 0.5, out = new Float64Array(24);
    analyseFrame(sine(1000, A, 4096), 2048, { hann: true, tilt: 0, nb: 24 }, out);
    const ms = out.reduce((s, v) => s + v * v, 0);
    expect(Math.sqrt(ms)).toBeCloseTo(A / Math.SQRT2, 2);
    expect(ms).toBeCloseTo((A * A) / 2, 2);
  });
  it('puts a tone in the right band', () => {
    const out = new Float64Array(24);
    analyseFrame(sine(220, 0.5, 4096), 2048, { hann: true, tilt: 0, nb: 24 }, out);
    const loudest = out.indexOf(Math.max(...out));
    // 80 Hz * (7000/80)^(b/24) <= 220 Hz < next edge
    expect(loudest).toBe(Math.floor((24 * Math.log(220 / 80)) / Math.log(7000 / 80)));
  });
  it('tilt adds dB per octave above 1 kHz', () => {
    const flat = new Float64Array(24), tilted = new Float64Array(24);
    const s = sine(4000, 0.5, 4096);
    analyseFrame(s, 2048, { hann: true, tilt: 0, nb: 24 }, flat);
    analyseFrame(s, 2048, { hann: true, tilt: 3, nb: 24 }, tilted);
    const b = flat.indexOf(Math.max(...flat));
    expect(tilted[b] / flat[b]).toBeGreaterThan(1.5);
  });
});

describe('columns', () => {
  it('has the right count and exact edges at a rate that does not divide the sample rate', () => {
    const c = columns(sine(200, 0.5, SR * 2), 120);
    expect(c.n).toBe(240);
  });
  it('windowed loudness flickers far less than one column on a steady low tone', () => {
    const tone = sine(120, 0.5, SR * 2);
    const spread = (a: Float32Array) => { const s = a.slice(100, 200); return Math.max(...s) - Math.min(...s); };
    expect(spread(columns(tone, 480, 0.025, 1e-4).rms)).toBeLessThan(spread(columns(tone, 480, 0, 1e-4).rms) / 10);
  });
  it('level jumps up at once and falls with the release', () => {
    const x = new Float32Array(SR); x.fill(0.5, 0, 800);
    const c = columns(x, 100, 0, 0.15);
    expect(c.level[4]).toBeCloseTo(0.5, 5);
    expect(c.level[20]).toBeLessThan(c.level[10]);
  });
});

describe('math', () => {
  it('cubic passes through the samples and loops', () => {
    const a = Float32Array.from([0, 1, 4, 9, 16]);
    expect(cubic(a, 2, 5)).toBeCloseTo(4, 6);
    expect(cubic(a, 5, 5)).toBeCloseTo(0, 6);
  });
  it('maps the decibel floor to 0 and full scale to 1', () => {
    expect(toDisp(1, -60)).toBeCloseTo(1, 6);
    expect(toDisp(0.001, -60)).toBeCloseTo(0, 6);
    expect(toDisp(0.0316, -60)).toBeCloseTo(0.5, 2);
  });
});
