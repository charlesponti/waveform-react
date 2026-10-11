import { useRef, useState } from 'react';
import { columns } from '../../dsp/columns';
import { CPS, FLOOR_L, TAU } from '../../dsp/constants';
import { cubic, lerp, mod, rng, toDisp } from '../../dsp/math';
import { currentAnalysis, setHtml, useCanvas, useLatest } from '../../hooks';
import { COLORS, fit } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Check, Code, Cols, Controls, Demo, Eq, Legend, Part, Range, Readout } from '../ui';

type Mode = 'latest' | 'nearest' | 'linear' | 'cubic';
const MODES: [Mode, string][] = [['latest', 'newest column'], ['nearest', 'nearest'], ['linear', 'linear'], ['cubic', 'cubic']];

export function Smooth({ transport }: { transport: Transport }) {
  const [mode, setMode] = useState<Mode>('cubic');
  const [cps, setCps] = useState(40);
  const [jit, setJit] = useState(true);
  const [pll, setPll] = useState(true);
  const o = useLatest({ mode, cps, jit, pll });
  const rough = useRef<HTMLDivElement>(null);
  const sim = useRef({ hist: [] as { t: number; v: number; truth: number }[], phase: NaN, period: 1 / 60, key: '', L: null as { n: number; d: Float32Array } | null, rnd: rng(11), signal: '' });

  const ref = useCanvas((canvas, t) => {
    const s = sim.current, A = currentAnalysis(transport), { mode, cps, jit, pll } = o.current;
    if (s.signal !== A.name) { s.signal = A.name; s.hist.length = 0; }
    const key = `${A.name}:${cps}`;
    if (s.key !== key) { s.key = key; const c = columns(A.sig, cps, 0.025, 0.15); s.L = { n: c.n, d: Float32Array.from(c.level, (v) => toDisp(v, FLOOR_L)) }; }
    const L = s.L!, latency = 0.06;
    if (!transport.getState().paused) {
      const m = t + (jit ? (s.rnd() - 0.5) * 0.008 : 0);
      let ph = m;
      if (pll) {
        // A phase-locked loop on the frame times, as in the Swift FrameClock.
        if (Number.isNaN(s.phase) || m - s.phase >= 0.5) s.phase = m;
        else {
          const predicted = s.phase + s.period, err = Math.max(-s.period, Math.min(2 * s.period, m - predicted));
          s.period += 0.01 * err; s.phase = predicted + 0.15 * err;
        }
        ph = s.phase;
      }
      let v: number;
      if (mode === 'latest') {
        const tb = Math.floor((t - 0.004 * s.rnd()) / 0.0107) * 0.0107;
        v = L.d[mod(Math.floor(tb * cps) - 1, L.n)];
      } else {
        const pos = (ph - latency) * cps - 0.5;
        if (mode === 'nearest') v = L.d[mod(Math.round(pos), L.n)];
        else if (mode === 'linear') { const i = Math.floor(pos); v = lerp(L.d[mod(i, L.n)], L.d[mod(i + 1, L.n)], pos - i); }
        else v = cubic(L.d, pos, L.n);
      }
      s.hist.push({ t, v, truth: cubic(A.lvl, (t - (mode === 'latest' ? 0 : latency)) * CPS - 0.5, A.n) });
    }
    const span = 0.7;
    while (s.hist.length && s.hist[0].t < t - span) s.hist.shift();
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const X = (tt: number) => ((tt - (t - span)) / span) * w, Y = (val: number) => h - 14 - val * (h - 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    for (let q = 0; q <= 1; q += 0.25) { ctx.beginPath(); ctx.moveTo(0, Y(q)); ctx.lineTo(w, Y(q)); ctx.stroke(); }
    ctx.strokeStyle = COLORS.faint; ctx.lineWidth = 3; ctx.beginPath();
    s.hist.forEach((p, i) => { if (i) ctx.lineTo(X(p.t), Y(p.truth)); else ctx.moveTo(X(p.t), Y(p.truth)); });
    ctx.stroke();
    ctx.strokeStyle = COLORS.mint; ctx.lineWidth = 1.6; ctx.beginPath();
    s.hist.forEach((p, i) => { if (i) ctx.lineTo(X(p.t), Y(p.v)); else ctx.moveTo(X(p.t), Y(p.v)); });
    ctx.stroke();
    ctx.fillStyle = COLORS.mint;
    s.hist.forEach((p) => { ctx.beginPath(); ctx.arc(X(p.t), Y(p.v), 1.8, 0, TAU); ctx.fill(); });
    const hs = s.hist, n = hs.length;
    if (n > 8) {
      let sum = 0;
      for (let i = 2; i < n; i++) { const d2 = hs[i].v - 2 * hs[i - 1].v + hs[i - 2].v; sum += d2 * d2; }
      setHtml(rough, `roughness <b>${(Math.sqrt(sum / (n - 2)) * 100).toFixed(2)}</b> (lower is smoother). Each dot is one screen frame.`);
    }
  }, transport);

  return (
    <Part id="smooth" lead="Part 5" eyebrow="maths and engineering" title="A playhead on the audio clock">
      <Cols>
        <div>
          <p>A screen frame should not ask "what is the newest column?". Columns appear when the audio thread is scheduled, which jitters, so the newest column is a moving, stepping target. Instead the audio thread tells a shared clock when each buffer started, and the screen asks "where in the stream is now, minus a fixed delay?"</p>
          <Code>{`// StreamClock: smooth the offset between audio time and host time
smoothed += gain * (raw - smoothed)       // gain = 0.02

// Playhead: draw a fixed moment behind the audio
position = min(newest - 1,
               streamTime(hostNow - latency) * rate - 0.5)`}</Code>
          <p>The latency (60 ms) covers the audio buffer, the time to finish a column, and the one column of look-ahead the interpolation needs.</p>
          <p>The system also reports frame times with a millisecond or two of noise. Used raw, that noise becomes shake. A phase-locked loop follows the steady beat of the frames:</p>
          <Code>{`predicted = phase + period
error = clamp(measured - predicted, -period, 2 * period)
period += 0.01 * error
phase  = predicted + 0.15 * error`}</Code>
          <p>Last, the playhead lands between two columns. Reading the nearest one gives steps. Linear gives a corner at every column. Catmull-Rom runs a cubic through the four neighbours, so the value and its slope are both continuous:</p>
          <Eq>{'p(t) = ½ · [ 2p₁ + (p₂ − p₀)t + (2p₀ − 5p₁ + 4p₂ − p₃)t² + (3p₁ − p₀ − 3p₂ + p₃)t³ ]'}</Eq>
        </div>
        <Demo>
          <canvas ref={ref} style={{ aspectRatio: '2/1' }} />
          <Controls role="radiogroup" label="How the screen reads the columns">
            {MODES.map(([m, text]) => <label key={m}><input type="radio" name="rvo-read" checked={mode === m} onChange={() => setMode(m)} /> {text}</label>)}
          </Controls>
          <Controls>
            <Range label="columns per second" value={cps} onChange={setCps} min={15} max={125} step={5} />
            <Check label="noisy frame times" checked={jit} onChange={setJit} />
            <Check label="smooth them (PLL)" checked={pll} onChange={setPll} />
          </Controls>
          <Legend items={[[COLORS.mint, 'drawn each frame'], [COLORS.faint, 'what the sound did']]} />
          <Readout r={rough} />
        </Demo>
      </Cols>
    </Part>
  );
}
