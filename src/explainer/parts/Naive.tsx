import { useRef } from 'react';
import { CPS, SR } from '../../dsp/constants';
import { mod } from '../../dsp/math';
import { currentAnalysis, useCanvas } from '../../hooks';
import { dotsFor } from '../../orb/dots';
import { COLORS, drawOrb, fit } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Code, Cols, Demo, Legend, Part } from '../ui';

const CHUNK = 640; // 40 ms of audio at 16 kHz

export function Naive({ transport }: { transport: Transport }) {
  const sim = useRef({ hist: [] as { t: number; v: number }[], chunk: -1, value: 0, signal: '' });
  const orb = useCanvas((canvas, t) => {
    const s = sim.current, A = currentAnalysis(transport);
    if (s.signal !== A.name) { s.signal = A.name; s.hist.length = 0; }
    const chunk = Math.floor((t * SR) / CHUNK);
    if (chunk !== s.chunk) {
      s.chunk = chunk;
      let m = 0;
      for (let i = chunk * CHUNK - CHUNK; i < chunk * CHUNK; i++) m = Math.max(m, Math.abs(A.sig[mod(i, A.sig.length)]));
      s.value = m;
    }
    s.hist.push({ t, v: s.value });
    while (s.hist.length && s.hist[0].t < t - 1.6) s.hist.shift();
    drawOrb(canvas, dotsFor(900), { analysis: A, t, mode: 'naive', value: s.value });
  }, transport);
  const scope = useCanvas((canvas, t) => {
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const A = currentAnalysis(transport), span = 1.6;
    const X = (tt: number) => ((tt - (t - span)) / span) * w, Y = (v: number) => h - 6 - v * (h - 12);
    ctx.strokeStyle = COLORS.faint; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let px = 0; px <= w; px += 2) {
      const tt = t - span + (px / w) * span, v = Math.min(1, A.rms[Math.floor(mod(tt * CPS - 0.5, A.n))] * 1.4);
      if (px) ctx.lineTo(px, Y(v)); else ctx.moveTo(px, Y(v));
    }
    ctx.stroke();
    ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 2; ctx.beginPath();
    sim.current.hist.forEach((p, i) => { if (i) ctx.lineTo(X(p.t), Y(p.v)); else ctx.moveTo(X(p.t), Y(p.v)); });
    ctx.stroke();
  }, transport);
  return (
    <Part id="naive" first lead="Start here" eyebrow="the obvious version" title="One number, one sphere">
      <Cols>
        <div>
          <p>A sphere of dots. Measure how loud the sound is right now. Push every dot out by that amount. It takes about ten lines and it does react to sound.</p>
          <Code>{`// every audio buffer
let loudness = buffer.map(abs).max()   // 0...1

// every screen frame
for dot in dots {
  dot.radius = 1 + 0.5 * loudness
}`}</Code>
          <p>Try the Arpeggio, then the Hiss, then the Vowels. They are very different sounds and the orb does the same thing for all of them: it breathes. It cannot say which pitch, it has no memory of what came before, and the amber line on the right moves in steps.</p>
        </div>
        <Demo>
          <canvas ref={orb} style={{ aspectRatio: '1.35/1' }} />
          <canvas ref={scope} style={{ aspectRatio: '4.2/1' }} />
          <Legend items={[[COLORS.amber, 'the one number the orb uses'], [COLORS.faint, 'what the sound really did']]} />
          <div className="rvo-readout">The steps are audio buffers arriving (40 ms here, 10 to 20 ms on a phone) while the screen draws at 60 or 120 Hz.</div>
        </Demo>
      </Cols>
      <div className="rvo-problems">
        <a className="rvo-problem" href="#columns"><b>Drift</b><span>Which samples belong to which frame? Round the wrong way and the picture slowly slides off the sound.</span><em>Part 2, exact columns</em></a>
        <a className="rvo-problem" href="#loudness"><b>Flicker</b><span>The peak of a few milliseconds depends on where in a pitch wave you happened to land.</span><em>Part 3, loudness</em></a>
        <a className="rvo-problem" href="#time"><b>No memory</b><span>Only "now" is drawn. A sound that just ended is gone.</span><em>Part 4, time on a sphere</em></a>
        <a className="rvo-problem" href="#smooth"><b>Stair-steps</b><span>Audio arrives on its own schedule and the screen draws on another.</span><em>Part 5, playhead</em></a>
        <a className="rvo-problem" href="#pitch"><b>One number</b><span>A hum, a whistle and a hiss can be equally loud. The sphere cannot tell them apart.</span><em>Part 6, pitch</em></a>
        <a className="rvo-problem" href="#ring"><b>Two threads</b><span>The audio thread may not wait for the screen, and the screen must not read half-written data.</span><em>Part 7, lock-free ring</em></a>
      </div>
    </Part>
  );
}
