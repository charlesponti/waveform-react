export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Decibels relative to full scale, mapped so `floor` dB is 0 and 0 dB is 1. */
export const toDisp = (v: number, floor: number) => clamp((20 * Math.log10(Math.max(v, 1e-9)) - floor) / -floor, 0, 1);

/** A small seeded random generator (mulberry32), so the synthetic sounds are the same every time. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom through p1 (t = 0) and p2 (t = 1), shaped by the points either side. */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Reads `arr` (a looping series, `stride` values per step) at a fractional position with a cubic, never below 0. */
export function cubic(arr: ArrayLike<number>, pos: number, n: number, stride = 1, off = 0) {
  const i = Math.floor(pos), t = pos - i;
  const v = catmullRom(
    arr[mod(i - 1, n) * stride + off], arr[mod(i, n) * stride + off],
    arr[mod(i + 1, n) * stride + off], arr[mod(i + 2, n) * stride + off], t,
  );
  return v > 0 ? v : 0;
}
