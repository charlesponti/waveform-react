import { describe, expect, it } from 'vitest';
import { columns } from './columns';
import { SR, TAU } from './constants';

const sine = (hz: number, amp: number, n: number) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((TAU * hz * i) / SR));

describe('columns', () => {
  it('has floor(length * rate / SR) columns', () => {
    expect(columns(sine(200, 0.5, SR * 2), 120).n).toBe(240);
    expect(columns(sine(200, 0.5, 1000), 125).n).toBe(7);
  });
  it('records the lowest, highest and rms of each exact slice', () => {
    const x = Float32Array.from({ length: 640 }, (_, i) => (i < 320 ? 0.5 : -0.25));
    const c = columns(x, 50, 0, 0.15); // 320 samples a column
    expect([c.lo[0], c.hi[0], c.rms[0]]).toEqual([0.5, 0.5, 0.5]);
    expect([c.lo[1], c.hi[1]]).toEqual([-0.25, -0.25]);
    expect(c.rms[1]).toBeCloseTo(0.25, 6);
  });
  it('places edges by rounding, so an odd rate leaves no drift', () => {
    // 16000 / 3 = 5333.33 samples: three columns must cover exactly one second.
    const x = new Float32Array(SR).fill(1);
    const c = columns(x, 3, 0, 0.1);
    expect(c.n).toBe(3);
    expect(Array.from(c.rms)).toEqual([1, 1, 1]);
  });
  it('windowed rms averages the last few blocks; a one-block window does not', () => {
    const x = new Float32Array(SR); x.fill(1, 0, 160);
    const one = columns(x, 100, 0, 0.1), win = columns(x, 100, 0.03, 0.1);
    expect(one.rms[1]).toBe(0);
    expect(win.rms[1]).toBeCloseTo(Math.sqrt(0.5), 6);
  });
  it('level attacks at once and releases with the time constant', () => {
    const x = new Float32Array(SR); x.fill(0.5, 0, 160);
    const c = columns(x, 100, 0, 0.15);
    expect(c.level[0]).toBeCloseTo(0.5, 6);
    expect(c.level[1]).toBeCloseTo(0.5 * Math.exp(-1 / 15), 6);
    expect(c.level[10]).toBeLessThan(c.level[1]);
  });
  it('a zero release still works', () => {
    const x = new Float32Array(SR).fill(0.5, 0, 160);
    const c = columns(x, 100, 0, 0);
    expect(c.level[1]).toBe(0);
  });
});
