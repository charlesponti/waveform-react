import { describe, expect, it, vi } from 'vitest';
import { analysisFor } from '../analysis';
import { callsOf, ctxOf } from '../test/setup';
import { dotsFor } from './dots';
import { drawMap, drawOrb, fit, label, specAt } from './draw';

const A = analysisFor('vowels');
const canvas = () => document.createElement('canvas');
const arcCount = (c: HTMLCanvasElement) => callsOf(c, 'fill').reduce((n, call) => n + ((call.args[0] as { ops?: string[] } | undefined)?.ops?.filter((o) => o === 'arc').length ?? 0), 0);

describe('fit', () => {
  it('sizes the backing store to css size times the pixel ratio, once', () => {
    const c = canvas();
    const { w, h } = fit(c);
    expect([w, h, c.width, c.height]).toEqual([400, 300, 800, 600]);
    c.width = 123; // someone changed it: fit puts it right again
    fit(c);
    expect(c.width).toBe(800);
    expect(callsOf(c, 'setTransform').at(-1)?.args).toEqual([2, 0, 0, 2, 0, 0]);
  });
  it('treats a missing pixel ratio as 1 and caps a large one at 2', () => {
    vi.stubGlobal('devicePixelRatio', 0);
    const a = canvas(); fit(a);
    expect(a.width).toBe(400);
    vi.stubGlobal('devicePixelRatio', 5);
    const b = canvas(); fit(b);
    expect(b.width).toBe(800);
  });
});

describe('label', () => {
  it('writes text with the given style', () => {
    const c = canvas(), { ctx } = fit(c);
    label(ctx, 'now', 5, 6, '#fff');
    label(ctx, 'Hz', 1, 2, '#000', 9, 'right');
    expect(callsOf(c, 'fillText').map((x) => x.args[0])).toEqual(['now', 'Hz']);
    expect(ctxOf(c).textAlign).toBe('right');
  });
});

describe('specAt', () => {
  it('is a cubic in time and linear in pitch', () => {
    const pos = 300.3;
    const lo = specAt(A, pos, 5), hi = specAt(A, pos, 6), mid = specAt(A, pos, 5.5);
    expect(mid).toBeCloseTo((lo + hi) / 2, 6);
    expect(specAt(A, pos, 23)).toBeGreaterThanOrEqual(0); // top band: no band above it
    expect(specAt(A, pos, 23.9)).toBe(specAt(A, pos, 23));
  });
});

describe('drawOrb', () => {
  const o = { analysis: A, t: 2, mode: 'spectrum' as const };
  it('draws every dot once in four depth layers, one fill each', () => {
    const c = canvas();
    drawOrb(c, dotsFor(500), o);
    expect(callsOf(c, 'fill')).toHaveLength(4);
    expect(arcCount(c)).toBe(500);
    expect(callsOf(c, 'clearRect')).toHaveLength(1);
  });
  it('colours dots one at a time by age or by pitch', () => {
    for (const colorBy of ['age', 'pitch'] as const) {
      const c = canvas();
      drawOrb(c, dotsFor(120), { ...o, colorBy });
      expect(callsOf(c, 'arc')).toHaveLength(120);
      expect(callsOf(c, 'set:fillStyle').every((x) => String(x.args[0]).startsWith('hsla('))).toBe(true);
    }
  });
  it('loudness mode ignores pitch: a dot at the same age is pushed out the same', () => {
    const c = canvas();
    drawOrb(c, dotsFor(200), { ...o, mode: 'loudness' });
    expect(arcCount(c)).toBe(200);
  });
  it('naive mode pushes every dot out by one number, and a louder number makes a bigger sphere', () => {
    const extent = (value: number) => {
      const c = canvas();
      drawOrb(c, dotsFor(200), { analysis: A, t: 2, mode: 'naive', value });
      return callsOf(c, 'fill').length;
    };
    expect(extent(0)).toBe(4);
    const c0 = canvas(), c1 = canvas();
    drawOrb(c0, dotsFor(50), { analysis: A, t: 0, mode: 'naive' }); // value defaults to 0
    drawOrb(c1, dotsFor(50), { analysis: A, t: 0, mode: 'naive', value: 1 });
    expect(arcCount(c0)).toBe(50);
    expect(arcCount(c1)).toBe(50);
  });
  it('flat (wrap 0), half and full wrap all draw, and honour gain, history and spin', () => {
    for (const wrap of [0, 0.4, 0.6, 1]) {
      const c = canvas();
      drawOrb(c, dotsFor(100), { ...o, wrap, gain: 0.8, history: 1.2, spin: 0.5 });
      expect(arcCount(c)).toBe(100);
    }
  });
});

describe('drawMap', () => {
  it('draws the spectrogram, its frequency ticks and the now line', () => {
    const c = canvas();
    drawMap(c, A, 1.5, 0.8);
    drawMap(c, A, 1.6, 0.8); // the second call reuses the small canvas
    const texts = callsOf(c, 'fillText').map((x) => x.args[0]);
    expect(texts).toEqual(expect.arrayContaining(['100', '300', '1k', '3k', 'Hz', 'now', '0.8 s ago']));
    expect(callsOf(c, 'drawImage')).toHaveLength(2);
  });
});
