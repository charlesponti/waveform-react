import { describe, expect, it } from 'vitest';
import { TAU } from './constants';
import { makeFFT } from './fft';

describe('makeFFT', () => {
  for (const n of [2, 8, 64, 1024]) {
    it(`matches a direct transform for n = ${n}`, () => {
      const x = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 3));
      const re = Float64Array.from(x), im = new Float64Array(n);
      makeFFT(n)(re, im);
      for (const k of [0, 1, n >> 1, n - 1].filter((k) => k < n)) {
        let r = 0, m = 0;
        for (let i = 0; i < n; i++) { r += x[i] * Math.cos((TAU * k * i) / n); m -= x[i] * Math.sin((TAU * k * i) / n); }
        expect(re[k]).toBeCloseTo(r, 6);
        expect(im[k]).toBeCloseTo(m, 6);
      }
    });
  }
});
