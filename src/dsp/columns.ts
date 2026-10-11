import { SR } from './constants';

export interface Columns { n: number; lo: Float32Array; hi: Float32Array; rms: Float32Array; level: Float32Array }

/**
 * Cuts `sig` into `cps` columns a second. Edges are exact (`round(k * SR / cps)`), `rms` is measured over the
 * last `win` seconds and `level` has instant attack and a `rel`-second release.
 */
export function columns(sig: ArrayLike<number>, cps: number, win = 0.025, rel = 0.15): Columns {
  const n = Math.floor((sig.length * cps) / SR);
  const lo = new Float32Array(n), hi = new Float32Array(n), rms = new Float32Array(n), level = new Float32Array(n);
  const wb = Math.max(1, Math.round(win * cps)), sq = new Float64Array(wb), cnt = new Int32Array(wb);
  const decay = Math.exp(-1 / (cps * Math.max(rel, 1e-6)));
  let a = 0, lv = 0;
  for (let k = 0; k < n; k++) {
    const b = Math.round(((k + 1) * SR) / cps);
    let l = Infinity, h = -Infinity, s = 0;
    for (let i = a; i < b; i++) { const v = sig[i]; if (v < l) l = v; if (v > h) h = v; s += v * v; }
    sq[k % wb] = s; cnt[k % wb] = b - a;
    let ss = 0, cc = 0;
    for (let j = 0; j < wb; j++) { ss += sq[j]; cc += cnt[j]; }
    const r = Math.sqrt(ss / Math.max(1, cc));
    lv = Math.max(r, lv * decay);
    lo[k] = l; hi[k] = h; rms[k] = r; level[k] = lv; a = b;
  }
  return { n, lo, hi, rms, level };
}
