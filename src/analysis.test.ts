import { describe, expect, it } from 'vitest';
import { analyse, analysisFor } from './analysis';
import { CPS, NB, SR, TAU } from './dsp/constants';

describe('analyse', () => {
  const sig = Float32Array.from({ length: SR * 2 }, (_, i) => 0.5 * Math.sin((TAU * 440 * i) / SR));
  const a = analyse(sig, 'tone');
  it('has one column and one spectrum frame per 1/125 s', () => {
    expect(a.name).toBe('tone');
    expect(a.n).toBe(2 * CPS);
    expect(a.rms).toHaveLength(a.n);
    expect(a.spec).toHaveLength(a.n * NB);
  });
  it('puts everything on a 0..1 display scale', () => {
    for (const arr of [a.lvl, a.pk, a.spec]) expect(arr.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(a.lvl[100]).toBeGreaterThan(0.8);
    expect(a.pk[100]).toBeGreaterThan(0.8);
    expect(Math.max(...a.spec.slice(100 * NB, 101 * NB))).toBeGreaterThan(0.7);
  });
  it('names a signal "custom" by default and handles a signal shorter than a second', () => {
    expect(analyse(new Float32Array(1600)).name).toBe('custom');
  });
});

describe('analysisFor', () => {
  it('analyses a built-in sound once', () => {
    const first = analysisFor('hum');
    expect(first.name).toBe('hum');
    expect(analysisFor('hum')).toBe(first);
  });
});
