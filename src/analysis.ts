import { columns } from './dsp/columns';
import { CPS, FLOOR_L, FLOOR_S, HOP, NB } from './dsp/constants';
import { analyseFrame } from './dsp/spectrum';
import { toDisp } from './dsp/math';
import { SIGNALS, type SignalName } from './signals';

/** Everything the orb reads, precomputed from a looping signal: 125 columns and a 24-band spectrum a second. */
export interface Analysis {
  name: string;
  /** The samples, mono, 16 kHz. */
  sig: Float32Array;
  /** Number of columns (one per 1/125 s). */
  n: number;
  /** Windowed loudness per column, linear. */
  rms: Float32Array;
  /** Loudness with instant attack and a 150 ms release, linear. */
  level: Float32Array;
  /** `level` on the decibel scale, 0..1. */
  lvl: Float32Array;
  /** Peak per column on the decibel scale, 0..1. */
  pk: Float32Array;
  /** Spectrum on the decibel scale, 0..1, `NB` values per column. */
  spec: Float32Array;
}

/** Analyses a mono 16 kHz signal that the orb will loop. */
export function analyse(sig: Float32Array, name = 'custom'): Analysis {
  const c = columns(sig, CPS, 0.025, 0.15);
  const spec = new Float32Array(c.n * NB), tmp = new Float64Array(NB);
  const o = { hann: true, tilt: 3, nb: NB };
  for (let k = 0; k < c.n; k++) {
    analyseFrame(sig, Math.round((k + 1) * HOP), o, tmp);
    for (let b = 0; b < NB; b++) spec[k * NB + b] = toDisp(tmp[b], FLOOR_S);
  }
  return {
    name, sig, n: c.n, rms: c.rms, level: c.level,
    lvl: Float32Array.from(c.level, (v) => toDisp(v, FLOOR_L)),
    pk: Float32Array.from(c.lo, (v, k) => toDisp(Math.max(Math.abs(v), Math.abs(c.hi[k])), FLOOR_L)),
    spec,
  };
}

const cache = new Map<SignalName, Analysis>();

/** The analysis of one of the built-in sounds, made once. */
export function analysisFor(name: SignalName): Analysis {
  let a = cache.get(name);
  if (!a) { a = analyse(SIGNALS[name].make(), name); cache.set(name, a); }
  return a;
}
