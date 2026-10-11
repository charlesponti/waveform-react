import { TAU } from './constants';

/** An in-place radix-2 FFT for a fixed size `n` (a power of two). */
export function makeFFT(n: number) {
  const cosT = new Float64Array(n / 2), sinT = new Float64Array(n / 2), rev = new Uint32Array(n);
  const bits = Math.log2(n) | 0;
  for (let i = 0; i < n / 2; i++) { cosT[i] = Math.cos((TAU * i) / n); sinT[i] = Math.sin((TAU * i) / n); }
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b); rev[i] = r; }
  return (re: Float64Array, im: Float64Array) => {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + half; j++, k += step) {
          const l = j + half;
          const tr = re[l] * cosT[k] + im[l] * sinT[k];
          const ti = im[l] * cosT[k] - re[l] * sinT[k];
          re[l] = re[j] - tr; im[l] = im[j] - ti; re[j] += tr; im[j] += ti;
        }
      }
    }
  };
}
