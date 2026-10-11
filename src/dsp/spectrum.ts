import { FFT_N, HI_HZ, LO_HZ, SR, TAU } from './constants';
import { makeFFT } from './fft';
import { mod } from './math';

const fft = makeFFT(FFT_N);
export const hann = Float64Array.from({ length: FFT_N }, (_, n) => 0.5 - 0.5 * Math.cos((TAU * n) / FFT_N));
const sumW2 = hann.reduce((a, w) => a + w * w, 0);
const re = new Float64Array(FFT_N), im = new Float64Array(FFT_N);
const power = new Float64Array(FFT_N / 2), cum = new Float64Array(FFT_N / 2 + 1);

export interface Bands { edgesHz: number[]; bin: number[]; centre: number[] }
const bandCache = new Map<number, Bands>();

/** `nb` bands evenly spaced on a log scale from 80 Hz to 7 kHz, with their edges in FFT bins. */
export function bandsFor(nb: number): Bands {
  const hit = bandCache.get(nb);
  if (hit) return hit;
  const edgesHz = Array.from({ length: nb + 1 }, (_, i) => LO_HZ * Math.pow(HI_HZ / LO_HZ, i / nb));
  const bands = {
    edgesHz,
    bin: edgesHz.map((f) => (f * FFT_N) / SR),
    centre: Array.from({ length: nb }, (_, b) => Math.sqrt(edgesHz[b] * edgesHz[b + 1])),
  };
  bandCache.set(nb, bands);
  return bands;
}

export interface SpectrumOptions {
  /** Taper the slice with a Hann window (default). Off, a tone leaks across every band. */
  hann: boolean;
  /** Display tilt in dB per octave above 1 kHz; 0 is flat and exact. */
  tilt: number;
  /** Number of log-spaced bands. */
  nb: number;
}

/**
 * Linear rms per band for the FFT_N samples ending at `end`, looping over `sig`.
 * A pure tone of amplitude A reads A / sqrt(2) in its band when `tilt` is 0.
 */
export function analyseFrame(sig: ArrayLike<number>, end: number, o: SpectrumOptions, out: Float64Array) {
  const len = sig.length, half = FFT_N / 2;
  for (let n = 0; n < FFT_N; n++) {
    const x = sig[mod(end - FFT_N + n, len)];
    re[n] = o.hann ? x * hann[n] : x;
    im[n] = 0;
  }
  fft(re, im);
  const norm = 2 / (FFT_N * (o.hann ? sumW2 : FFT_N));
  power[0] = 0;
  for (let k = 1; k < half; k++) power[k] = (re[k] * re[k] + im[k] * im[k]) * norm;
  cum[0] = 0;
  for (let k = 0; k < half; k++) cum[k + 1] = cum[k] + power[k];
  // Power below bin coordinate x, where bin k spans k - 0.5 to k + 0.5.
  const cumTo = (x: number) => {
    const u = Math.max(0, x + 0.5), i = Math.min(half - 1, Math.floor(u));
    return cum[i] + power[i] * Math.min(1, u - i);
  };
  const { bin, centre } = bandsFor(o.nb);
  for (let b = 0; b < o.nb; b++) {
    const p = Math.max(0, cumTo(bin[b + 1]) - cumTo(bin[b]));
    out[b] = Math.sqrt(p * Math.pow(10, (o.tilt * Math.log2(centre[b] / 1000)) / 10));
  }
  return out;
}
