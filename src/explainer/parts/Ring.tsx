import { useRef } from 'react';
import { TAU } from '../../dsp/constants';
import { setHtml, useCanvas } from '../../hooks';
import { COLORS, fit, label } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Code, Cols, Controls, Demo, Part, Readout } from '../ui';

const CAP = 16;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function Ring({ transport }: { transport: Transport }) {
  const out = useRef<HTMLDivElement>(null);
  const rg = useRef({ w: 0, nextW: 0, burst: 0, phase: 'idle', end: 0, real: 0, p: 0, since: 0, msg: 'idle', clean: 0, retries: 0, last: 0 });
  const ref = useCanvas((canvas, t) => {
    const s = rg.current, dt = Math.min(0.1, Math.max(0, t - s.last));
    s.last = t;
    const startCopy = () => { s.phase = 'copy'; s.end = s.w; s.real = Math.min(8, s.end); s.p = 0; s.msg = `acquire load: written = ${s.end}`; };
    if (!transport.getState().paused) {
      s.nextW -= dt;
      while (s.nextW <= 0) { s.w++; s.nextW += s.burst > 0 ? 0.05 : 0.32; if (s.burst > 0) s.burst--; }
      if (s.phase === 'idle') { s.since += dt; if (s.since > 1.6) startCopy(); }
      else if (s.phase === 'copy') {
        s.p += dt / 1.5;
        if (s.p >= 1) {
          if (s.w - (s.end - s.real) > CAP) { s.retries++; s.msg = `written is now ${s.w}: the writer lapped the copy, so copy again`; s.phase = 'torn'; }
          else { s.clean++; s.msg = `written is ${s.w}: copy is whole, return it`; s.phase = 'done'; }
          s.since = 0;
        }
      } else {
        s.since += dt;
        if (s.since > 0.9) { const wasTorn = s.phase === 'torn'; s.phase = 'idle'; s.since = 0; if (wasTorn) startCopy(); }
      }
    }
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2 - 4, R = Math.min(w, h) * 0.36, r0 = R * 0.62;
    const ang = (i: number) => -Math.PI / 2 + ((i + 0.5) / CAP) * TAU;
    for (let i = 0; i < CAP; i++) {
      const latest = s.w - 1 - mod(s.w - 1 - i, CAP);
      const a0 = ang(i) - TAU / CAP / 2 + 0.02, a1 = ang(i) + TAU / CAP / 2 - 0.02;
      let inCopy = false;
      if (s.phase !== 'idle') for (let j = 0; j < s.real; j++) if (mod(s.end - s.real + j, CAP) === i && (s.phase !== 'copy' || j < s.p * s.real)) inCopy = true;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath();
      ctx.fillStyle = latest < 0 ? '#0c1b19' : inCopy ? (s.phase === 'torn' ? 'rgba(251,113,133,0.75)' : 'rgba(94,234,212,0.85)') : 'rgba(94,234,212,0.18)';
      ctx.fill();
      if (latest >= 0) { const m = (R + r0) / 2; label(ctx, `${latest}`, cx + Math.cos(ang(i)) * m, cy + Math.sin(ang(i)) * m + 3, inCopy ? '#04201c' : COLORS.dim, 10, 'center'); }
    }
    const wa = ang(mod(s.w, CAP));
    ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(cx + Math.cos(wa) * (r0 - 4), cy + Math.sin(wa) * (r0 - 4)); ctx.lineTo(cx + Math.cos(wa) * (R + 10), cy + Math.sin(wa) * (R + 10)); ctx.stroke();
    label(ctx, 'next write', cx + Math.cos(wa) * (R + 14), cy + Math.sin(wa) * (R + 14), COLORS.amber, 10, Math.cos(wa) > 0 ? 'left' : 'right');
    label(ctx, 'audio thread', cx, cy - 6, COLORS.amber, 11, 'center');
    label(ctx, 'writes, then publishes', cx, cy + 9, COLORS.dim, 10, 'center');
    label(ctx, 'screen thread copies the newest 8', cx, cy + 24, COLORS.mint, 10, 'center');
    setHtml(out, `slots: <b>${CAP}</b> (a power of two) · written: <b>${s.w}</b> · clean copies: <b>${s.clean}</b> · retries: <b class="rvo-amber">${s.retries}</b><br>${s.msg}`);
  }, transport);

  return (
    <Part id="ring" lead="Part 7" eyebrow="engineering" title="Two threads, no lock">
      <Cols>
        <div>
          <p>The microphone callback runs on a real-time thread with a deadline of a few milliseconds. It must never wait for the screen, take a lock, allocate memory, or print. The screen thread has to read what it wrote.</p>
          <p>The answer is a ring: a fixed array and one counter. The audio thread writes into the slot, then publishes the new count with a release store. The screen thread loads the count with an acquire load, so it can never see a slot that is still being filled.</p>
          <Code>{`func append(_ column: Column) {            // audio thread only
  let index = written.load(ordering: .relaxed)
  slots[index & mask] = column
  written.store(index + 1, ordering: .releasing)
}

func snapshot(...) {                       // screen thread only
  while true {
    let end = written.load(ordering: .acquiring)
    copy the newest n slots
    // the writer lapped us mid-copy? throw it away and copy again
    if written.load(ordering: .acquiring) - (end - real) <= capacity { return }
  }
}`}</Code>
          <p>The size is a power of two, so wrapping is a bitwise and instead of a modulo. The retry means what is drawn is never a mixture of old and new. Press the button to force the writer to lap the reader and watch the copy start again.</p>
        </div>
        <Demo>
          <canvas ref={ref} style={{ aspectRatio: '1.45/1' }} />
          <Controls><button onClick={() => { rg.current.burst = 20; }}>Lap the reader</button></Controls>
          <Readout r={out} />
        </Demo>
      </Cols>
    </Part>
  );
}
