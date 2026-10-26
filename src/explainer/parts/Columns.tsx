import { useMemo, useState } from 'react';
import { SR } from '../../dsp/constants';
import { mod } from '../../dsp/math';
import { currentAnalysis, useCanvas, useLatest } from '../../hooks';
import { COLORS, fit, label } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Code, Cols, Controls, Demo, Eq, Legend, Part, Range } from '../ui';

export function Columns({ transport }: { transport: Transport }) {
  const [cps, setCps] = useState(125);
  const [sr, setSr] = useState(44100);
  const o = useLatest({ cps });
  const ref = useCanvas((canvas, t) => {
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const A = currentAnalysis(transport), rate = o.current.cps, view = 800;
    const start = Math.floor(mod(t * SR * 0.3, A.sig.length - view - 4000)) + 2000;
    const xs = (i: number) => ((i - start) / view) * w, mid = h / 2, sc = h * 0.42;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    for (let k = Math.floor(start / (SR / rate)); ; k++) {
      const a = Math.round((k * SR) / rate), b = Math.round(((k + 1) * SR) / rate);
      if (a > start + view) break;
      let l = Infinity, hi = -Infinity, s = 0;
      for (let i = a; i < b; i++) { const v = A.sig[mod(i, A.sig.length)]; if (v < l) l = v; if (v > hi) hi = v; s += v * v; }
      const rms = Math.sqrt(s / (b - a)), x1 = xs(a), x2 = xs(b);
      ctx.fillStyle = 'rgba(94,234,212,0.16)'; ctx.fillRect(x1 + 1, mid - hi * sc, x2 - x1 - 2, (hi - l) * sc);
      ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x1 + 1, mid - rms * sc); ctx.lineTo(x2 - 1, mid - rms * sc); ctx.moveTo(x1 + 1, mid + rms * sc); ctx.lineTo(x2 - 1, mid + rms * sc); ctx.stroke();
      ctx.strokeStyle = 'rgba(94,234,212,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, h); ctx.stroke();
      if (x1 > 0 && x1 < w - 50) label(ctx, `${a}`, x1 + 3, h - 6, COLORS.dim, 10);
    }
    ctx.strokeStyle = COLORS.fg; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < view; i++) { const x = (i / view) * w, y = mid - A.sig[start + i] * sc; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    label(ctx, `edges at round(k · 16000 / ${rate})`, 8, 14, COLORS.dim, 10);
  }, transport);
  const calc = useMemo(() => {
    const spc = sr / cps, naive = Math.floor(spc);
    return { spc, naive, drift: 60 - (60 * cps * naive) / sr, edges: [1, 2, 3, 4].map((k) => Math.round((k * sr) / cps)) };
  }, [cps, sr]);
  return (
    <Part id="columns" lead="Part 2" eyebrow="maths and engineering" title="Cut time into exact columns">
      <Cols>
        <div>
          <p>The waveform and loudness path works on columns: fixed slices of time, each summarised by the lowest sample, the highest sample and the root mean square. Pitch has a separate Fourier path over rolling sample windows. The renderer consumes those summaries and never reads microphone samples itself.</p>
          <p>The edges have to be exact. A phone records at 44.1 or 48 kHz, and 120 columns a second does not divide 44,100. A column is 367.5 samples long. Truncate it to 367 and every column is a little short, so after a minute the picture has run ahead of the sound.</p>
          <Code>{`// the edge of column k is placed from the running sample count
static func edge(_ k: Int, _ sampleRate: Double, _ rate: Double) -> Int {
  Int((Double(k) * sampleRate / rate).rounded())
}`}</Code>
          <Eq>{`edge(k) = round( k · sampleRate / columnsPerSecond )
«no running sum of rounded lengths, so errors cannot add up»`}</Eq>
          <p>Buffers from the microphone do not line up with columns either. The builder takes whatever it is given (512 samples, 441, 1) and finishes a column wherever an edge falls inside the buffer. The three summaries come from single vDSP calls, so this is cheap enough for the audio thread.</p>
        </div>
        <Demo>
          <canvas ref={ref} style={{ aspectRatio: '2.2/1' }} />
          <Controls>
            <Range label="columns per second" value={cps} onChange={setCps} min={40} max={400} step={5} />
            <label>recorded at <select value={sr} onChange={(e) => setSr(+e.target.value)}><option value={44100}>44.1 kHz</option><option value={48000}>48 kHz</option></select></label>
          </Controls>
          <Legend items={[[COLORS.mint, 'lowest to highest sample'], [COLORS.amber, 'rms']]} />
          <div className="rvo-readout">
            At <b>{(sr / 1000).toFixed(1)} kHz</b> a column is <b>{calc.spc.toFixed(2)}</b> samples. Exact edges: {calc.edges.join(', ')} …<br />
            Truncating to {calc.naive} samples makes the picture finish a minute <b className="rvo-amber">{(calc.drift * 1000).toFixed(0)} ms</b> early.
          </div>
        </Demo>
      </Cols>
    </Part>
  );
}
