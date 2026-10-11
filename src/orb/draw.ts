import type { Analysis } from '../analysis';
import { CPS, HI_HZ, LO_HZ, NB, SPEC_DELAY, TAU } from '../dsp/constants';
import { clamp, cubic, lerp } from '../dsp/math';
import type { Dots } from './dots';

export const COLORS = { mint: '#5eead4', amber: '#ffb454', violet: '#a78bfa', dim: '#7f9a93', line: '#17312d', fg: '#d6e5e0', faint: '#2a4a44' };

/** Sizes the canvas backing store to its CSS size and device pixel ratio, and returns a context in CSS pixels. */
export function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export function label(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, size = 11, align: CanvasTextAlign = 'left') {
  ctx.font = `400 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

/** The spectrum at a fractional column and a fractional band: a cubic over time, linear over pitch. */
export function specAt(a: Analysis, pos: number, bf: number) {
  const b0 = Math.min(NB - 1, Math.floor(bf)), b1 = Math.min(NB - 1, b0 + 1), bt = bf - b0;
  const v0 = cubic(a.spec, pos, a.n, NB, b0);
  return bt === 0 ? v0 : lerp(v0, cubic(a.spec, pos, a.n, NB, b1), bt);
}

export type OrbMode = 'spectrum' | 'loudness' | 'naive';

export interface OrbOptions {
  analysis: Analysis;
  /** Seconds on the transport's clock. */
  t: number;
  mode: OrbMode;
  /** For `naive`: the one number every dot is pushed out by. */
  value?: number;
  /** 0 is the flat map, 1 is the sphere. */
  wrap?: number;
  /** How far a full-scale sound pushes a dot out, as a fraction of the radius. */
  gain?: number;
  /** Seconds of sound the sphere spans. */
  history?: number;
  /** Turn in radians a second. */
  spin?: number;
  colorBy?: 'age' | 'pitch' | null;
}

/**
 * Draws the orb. Latitude is time (the equator is now), longitude is pitch, and a dot is pushed out and
 * enlarged by how loud that pitch was then. Dots are batched into four depth layers, so the plain version
 * costs four fills instead of one per dot.
 */
export function drawOrb(canvas: HTMLCanvasElement, dd: Dots, o: OrbOptions) {
  const { ctx, w, h } = fit(canvas);
  ctx.clearRect(0, 0, w, h);
  const wrap = o.wrap ?? 1, gain = o.gain ?? 0.5, A = o.analysis;
  const H = (o.history ?? 0.8) * CPS;
  const ph = o.t * CPS - 0.5 + (o.mode === 'spectrum' ? SPEC_DELAY : 0);
  const spinA = (o.spin ?? 0.12) * o.t * wrap;
  const tip = lerp(0.55, 0.32, wrap);
  const sy = Math.sin(spinA), cy = Math.cos(spinA), sx = Math.sin(tip), cx = Math.cos(tip);
  const ext = lerp(1.45, 1 + gain, wrap) * 1.04;
  const R = Math.min(w, h) / 2 / ext, k = Math.min(w, h) / 360;
  const x0 = w / 2, y0 = h / 2;
  const layers = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  for (let i = 0; i < dd.n; i++) {
    let v: number;
    if (o.mode === 'spectrum') v = specAt(A, ph - dd.age[i] * H, dd.pitch[i] * (NB - 1));
    else if (o.mode === 'loudness') v = cubic(A.lvl, ph - dd.age[i] * H, A.n);
    else v = o.value ?? 0;
    const out = gain * v, ux = dd.ux[i], uy = dd.uy[i], uz = dd.uz[i];
    const px = lerp(dd.fx[i], ux, wrap) + lerp(0, ux, wrap) * out;
    const py = lerp(dd.fy[i], uy, wrap) + lerp(0, uy, wrap) * out;
    const pz = lerp(0, uz, wrap) + lerp(1, uz, wrap) * out;
    const x1 = px * cy + pz * sy, z1 = -px * sy + pz * cy;
    const y2 = py * cx - z1 * sx, z2 = py * sx + z1 * cx;
    const depth = clamp((z2 / (wrap > 0.5 ? 1 : 1.2) + 1) / 2, 0, 1);
    const size = (o.mode === 'naive' ? 1.3 : 1 + 2.8 * v) * (0.75 + 0.25 * depth) * k;
    const X = x0 + x1 * R, Y = y0 - y2 * R;
    if (o.colorBy) {
      const hue = o.colorBy === 'age' ? lerp(172, 275, dd.age[i]) : lerp(28, 285, dd.pitch[i]);
      ctx.fillStyle = `hsla(${hue},85%,${o.colorBy === 'age' ? lerp(66, 60, dd.age[i]) : 62}%,${0.25 + 0.75 * depth})`;
      ctx.beginPath(); ctx.arc(X, Y, size, 0, TAU); ctx.fill();
    } else {
      const layer = layers[Math.min(3, Math.floor(depth * 4))];
      layer.moveTo(X + size, Y);
      layer.arc(X, Y, size, 0, TAU);
    }
  }
  if (!o.colorBy) {
    const alphas = [0.18, 0.4, 0.7, 1];
    layers.forEach((p, i) => { ctx.fillStyle = `rgba(94,234,212,${alphas[i]})`; ctx.fill(p); });
  }
}

let mapLow: HTMLCanvasElement | null = null;
let mapImg: ImageData | null = null;
const pitchX = (f: number, w: number) => (Math.log(f / LO_HZ) / Math.log(HI_HZ / LO_HZ)) * w;

/** The spectrogram behind the orb, laid flat: pitch across, time up, newest at the bottom. */
export function drawMap(canvas: HTMLCanvasElement, A: Analysis, t: number, hist: number) {
  if (!mapLow) { mapLow = document.createElement('canvas'); mapLow.width = 120; mapLow.height = 72; mapImg = mapLow.getContext('2d')!.createImageData(120, 72); }
  const img = mapImg!, d = img.data;
  const { ctx, w, h } = fit(canvas);
  const ph = t * CPS - 0.5 + SPEC_DELAY, H = hist * CPS;
  for (let yy = 0; yy < 72; yy++) {
    const age = 1 - yy / 71;
    for (let xx = 0; xx < 120; xx++) {
      const g = Math.pow(specAt(A, ph - age * H, (xx / 119) * (NB - 1)), 1.15), i = (yy * 120 + xx) * 4;
      d[i] = 6 + 88 * g; d[i + 1] = 11 + 223 * g; d[i + 2] = 11 + 201 * g; d[i + 3] = 255;
    }
  }
  mapLow.getContext('2d')!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const left = 8, right = w - 8, top = 8, bottom = h - 24, mw = right - left, mh = bottom - top;
  ctx.drawImage(mapLow, left, top, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  [100, 300, 1000, 3000].forEach((f) => {
    const x = left + pitchX(f, mw);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    label(ctx, f >= 1000 ? `${f / 1000}k` : `${f}`, x, h - 8, COLORS.dim, 10, 'center');
  });
  label(ctx, 'Hz', left + mw - 2, h - 8, COLORS.dim, 10, 'right');
  ctx.strokeStyle = 'rgba(255,180,84,0.6)'; ctx.beginPath(); ctx.moveTo(left, bottom - 0.5); ctx.lineTo(right, bottom - 0.5); ctx.stroke();
  label(ctx, 'now', left + 6, bottom - 6, COLORS.amber, 10);
  label(ctx, `${hist.toFixed(1)} s ago`, left + 6, top + 13, COLORS.dim, 10);
}
