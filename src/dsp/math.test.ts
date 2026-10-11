import { describe, expect, it } from 'vitest';
import { catmullRom, clamp, cubic, lerp, mod, rng, toDisp } from './math';

describe('math', () => {
  it('clamp, lerp and mod', () => {
    expect([clamp(-1, 0, 1), clamp(0.5, 0, 1), clamp(2, 0, 1)]).toEqual([0, 0.5, 1]);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect([mod(-1, 5), mod(5, 5), mod(7, 5)]).toEqual([4, 0, 2]);
  });
  it('rng is deterministic, in [0, 1) and differs by seed', () => {
    const a = rng(5), b = rng(5), c = rng(6);
    const xs = Array.from({ length: 50 }, a);
    expect(xs).toEqual(Array.from({ length: 50 }, b));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(xs[0]).not.toBe(c());
  });
  it('catmullRom passes through p1 and p2', () => {
    expect(catmullRom(0, 1, 2, 3, 0)).toBeCloseTo(1, 12);
    expect(catmullRom(0, 1, 2, 3, 1)).toBeCloseTo(2, 12);
    expect(catmullRom(0, 1, 2, 3, 0.5)).toBeCloseTo(1.5, 12);
  });
  it('cubic wraps around the ends and never goes below zero', () => {
    const a = Float32Array.from([0, 1, 4, 9, 16]);
    expect(cubic(a, 2, 5)).toBeCloseTo(4, 6);
    expect(cubic(a, -1, 5)).toBeCloseTo(16, 6);
    expect(cubic(Float32Array.from([1, 0, 0, 1]), 1.5, 4)).toBe(0); // the curve dips below 0, clipped
  });
  it('cubic reads one value per step when stride is 1 and a strided column otherwise', () => {
    const two = Float32Array.from([1, 10, 2, 20, 3, 30, 4, 40]);
    expect(cubic(two, 1, 4, 2, 1)).toBeCloseTo(20, 6);
    expect(cubic(two, 1, 4, 2, 0)).toBeCloseTo(2, 6);
  });
  it('toDisp maps dB to 0..1 and clamps both ends', () => {
    expect(toDisp(1, -60)).toBeCloseTo(1, 9);
    expect(toDisp(10, -60)).toBe(1);
    expect(toDisp(0, -60)).toBe(0);
    expect(toDisp(0.001, -60)).toBeCloseTo(0, 9);
    expect(toDisp(0.0316228, -60)).toBeCloseTo(0.5, 3);
    expect(toDisp(0.0316228, -66)).toBeGreaterThan(0.5);
  });
});
