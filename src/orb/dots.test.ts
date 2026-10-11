import { describe, expect, it } from 'vitest';
import { dotsFor } from './dots';

describe('dotsFor', () => {
  const d = dotsFor(600);
  it('puts every dot on the unit sphere', () => {
    for (let i = 0; i < d.n; i++) expect(Math.hypot(d.ux[i], d.uy[i], d.uz[i])).toBeCloseTo(1, 5);
  });
  it('spreads heights evenly and gives age 0 at the equator and 1 at the poles', () => {
    expect(d.uy[0]).toBeGreaterThan(0.99);
    expect(d.uy[d.n - 1]).toBeLessThan(-0.99);
    expect(d.age[0]).toBeGreaterThan(0.95);
    expect(Math.min(...d.age)).toBeLessThan(0.01);
    expect(Math.max(...d.age)).toBeLessThanOrEqual(1);
  });
  it('maps longitude to a pitch of 0..1 that is the same on both sides', () => {
    expect(Math.min(...d.pitch)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...d.pitch)).toBeLessThanOrEqual(1);
    for (let i = 0; i < d.n; i++) expect(d.pitch[i]).toBeCloseTo(Math.abs(Math.atan2(d.uz[i], d.ux[i])) / Math.PI, 5);
  });
  it('lays the same dots out flat, wider than tall', () => {
    expect(Math.max(...d.fx)).toBeLessThanOrEqual(1.35);
    expect(Math.max(...d.fy)).toBeLessThanOrEqual(0.95);
  });
  it('caches by count', () => {
    expect(dotsFor(600)).toBe(d);
    expect(dotsFor(601)).not.toBe(d);
  });
});
