export interface Dots {
  n: number;
  ux: Float32Array; uy: Float32Array; uz: Float32Array;
  /** 0 at the equator (the newest sound) to 1 at a pole. */
  age: Float32Array;
  /** 0 on one meridian to 1 on the opposite one, the same either way round. */
  pitch: Float32Array;
  /** The same dot on the flat map. */
  fx: Float32Array; fy: Float32Array;
}

const cache = new Map<number, Dots>();

/** `n` dots on a Fibonacci lattice: evenly spaced heights, each turned a golden angle from the last. */
export function dotsFor(n: number): Dots {
  const hit = cache.get(n);
  if (hit) return hit;
  const d: Dots = {
    n, ux: new Float32Array(n), uy: new Float32Array(n), uz: new Float32Array(n),
    age: new Float32Array(n), pitch: new Float32Array(n), fx: new Float32Array(n), fy: new Float32Array(n),
  };
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = golden * i;
    d.ux[i] = Math.cos(a) * r; d.uy[i] = y; d.uz[i] = Math.sin(a) * r;
    const lat = Math.asin(y), lon = Math.atan2(Math.sin(a), Math.cos(a));
    d.age[i] = Math.abs(lat) / (Math.PI / 2);
    d.pitch[i] = Math.abs(lon) / Math.PI;
    d.fx[i] = (lon / Math.PI) * 1.35;
    d.fy[i] = (lat / (Math.PI / 2)) * 0.95;
  }
  cache.set(n, d);
  return d;
}
