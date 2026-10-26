import { useMemo, useRef, useState } from 'react';
import { columns, type Columns } from '../../dsp/columns';
import { CPS, DUR, FLOOR_L, SR, TAU } from '../../dsp/constants';
import { mod, toDisp } from '../../dsp/math';
import { currentAnalysis, useCanvas, useLatest } from '../../hooks';
import { COLORS, fit, label } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Cols, Controls, Demo, Eq, Legend, Part, Range } from '../ui';

let toneCache: Float32Array | null = null;
/** A 120 Hz hum with a slow swell: one pitch period is 8.3 ms. */
const tone = () => (toneCache ??= Float32Array.from({ length: SR * DUR }, (_, i) => (0.5 + 0.3 * Math.sin(TAU * 0.6 * (i / SR))) * Math.sin(TAU * 120 * (i / SR))));

export function Loudness({ transport }: { transport: Transport }) {
  const [ms, setMs] = useState(2);
  const [release, setRelease] = useState(0.15);
  const flick = useMemo(() => { const cps = 1000 / ms; return { cps, a: columns(tone(), cps, 0, 0.0001), b: columns(tone(), cps, 0.025, 0.0001) }; }, [ms]);
  const f = useLatest(flick);
  const r = useLatest(release);
  const ball = useRef<{ key: string; c: Columns | null }>({ key: '', c: null });

  const flickRef = useCanvas((canvas, t) => {
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const span = 1.6, Y = (v: number) => h - 18 - (v / 0.8) * (h - 30), { cps, a, b } = f.current;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    [0, 0.2, 0.4, 0.6].forEach((v) => { ctx.beginPath(); ctx.moveTo(0, Y(v)); ctx.lineTo(w, Y(v)); ctx.stroke(); label(ctx, v.toFixed(1), 4, Y(v) - 3, COLORS.dim, 9); });
    const line = (fn: (tt: number) => number, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      for (let px = 0; px <= w; px++) { const y = Y(fn(t - span + (px / w) * span)); if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y); }
      ctx.stroke();
    };
    line((tt) => (0.5 + 0.3 * Math.sin(TAU * 0.6 * tt)) / Math.SQRT2, COLORS.faint, 2);
    line((tt) => a.rms[mod(Math.floor(tt * cps), a.n)], COLORS.amber, 1.5);
    line((tt) => b.rms[mod(Math.floor(tt * cps), b.n)], COLORS.mint, 2);
    label(ctx, 'a 120 Hz hum, one pitch period = 8.3 ms', 8, 12, COLORS.dim, 10);
  }, transport);

  const ballRef = useCanvas((canvas, t) => {
    const A = currentAnalysis(transport), key = `${A.name}:${r.current}`;
    if (ball.current.key !== key) ball.current = { key, c: columns(A.sig, CPS, 0.025, r.current) };
    const c = ball.current.c!;
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const split = w * 0.34, pad = 10, gh = h - 28;
    const gx = (a: number) => pad + a * (split - 2 * pad), gy = (v: number) => h - 18 - v * gh;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(pad, gy(1), split - 2 * pad, gh);
    ctx.lineWidth = 2; ctx.strokeStyle = COLORS.amber; ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(1)); ctx.stroke();
    ctx.strokeStyle = COLORS.mint; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const a = i / 100, x = gx(a), y = gy(toDisp(a, FLOOR_L)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    [0.01, 0.1].forEach((a) => {
      const y = gy(toDisp(a, FLOOR_L));
      ctx.fillStyle = COLORS.mint; ctx.beginPath(); ctx.arc(gx(a), y, 3.5, 0, TAU); ctx.fill();
      label(ctx, `${a} → ${Math.round(toDisp(a, FLOOR_L) * 100)}%`, gx(a) + 6, y - 6, COLORS.fg, 10);
    });
    label(ctx, 'amplitude', pad, h - 4, COLORS.dim, 10); label(ctx, 'height', pad + 2, 12, COLORS.dim, 10);
    const span = 1.6, X0 = split + 12, W = w - X0 - 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(X0, gy(1), W, gh);
    const trace = (arr: Float32Array, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      for (let px = 0; px <= W; px++) {
        const y = gy(toDisp(arr[mod(Math.floor((t - span + (px / W) * span) * CPS), c.n)], FLOOR_L));
        if (px) ctx.lineTo(X0 + px, y); else ctx.moveTo(X0 + px, y);
      }
      ctx.stroke();
    };
    trace(c.rms, '#4d6a64', 1.2); trace(c.level, COLORS.mint, 2.2);
    label(ctx, 'time', X0, h - 4, COLORS.dim, 10);
  }, transport);

  return (
    <Part id="loudness" lead="Part 3" eyebrow="maths" title="Loudness without flicker">
      <Cols>
        <div>
          <p>Root mean square is an effective amplitude that tracks average signal power, rather than just the biggest swing:</p>
          <Eq>{'rms = √( (x₁² + x₂² + … + xₙ²) / n )'}</Eq>
          <p>A voice at 120 Hz repeats every 8.3 ms. If a column is shorter than that, its rms depends on which part of the wave it landed on: near a crest it is high, near a zero crossing it is low. Neighbouring columns disagree and the orb shimmers, even though the voice is steady.</p>
          <p>The fix is to measure over a window of a few pitch periods. The builder keeps the last 25 ms of column sums and reports the rms of all of them. Drag the column length down and watch the amber line start to shake while the mint one holds still.</p>
          <p>Then the shape of the response. Instant attack, so a hit shows at once. A release with a time constant (150 ms by default), so a sound fades the way a meter needle does, not as a flash.</p>
          <Eq>{'level[k] = max( rms[k], level[k−1] · e^(−1 / (rate · release)) )'}</Eq>
          <p>Last, the scale. Speech can have a wide level range, so linear height can make a quiet word hard to see next to a loud one. Heights are decibels relative to full scale (dBFS):</p>
          <Eq>{`dB = 20 · log₁₀(amplitude)
height = clamp( (dB − floor) / −floor, 0, 1 )   «floor = −60 dB»`}</Eq>
        </div>
        <Demo>
          <canvas ref={flickRef} style={{ aspectRatio: '2.3/1' }} />
          <Controls><Range label="column length" value={ms} onChange={setMs} min={2} max={40} step={1} format={(v) => `${v} ms`} /></Controls>
          <Legend items={[[COLORS.amber, 'rms of one column'], [COLORS.mint, 'rms of the last 25 ms'], [COLORS.faint, 'true envelope']]} />
          <canvas ref={ballRef} style={{ aspectRatio: '2.3/1' }} />
          <Controls><Range label="release" value={release} onChange={setRelease} min={0.02} max={0.6} step={0.01} format={(v) => `${Math.round(v * 1000)} ms`} /></Controls>
          <div className="rvo-readout">Left: how amplitude becomes height. Right: the current sound, windowed rms (grey) and the level the orb uses (mint).</div>
        </Demo>
      </Cols>
    </Part>
  );
}
