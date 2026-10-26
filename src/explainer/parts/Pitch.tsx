import { useRef, useState } from 'react';
import { FFT_N, FLOOR_S, HI_HZ, LO_HZ, SR, TAU } from '../../dsp/constants';
import { mod, toDisp } from '../../dsp/math';
import { analyseFrame, hann } from '../../dsp/spectrum';
import { currentAnalysis, useCanvas, useLatest } from '../../hooks';
import { COLORS, fit, label } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Check, Cols, Controls, Demo, Eq, Part, Range } from '../ui';

export function Pitch({ transport }: { transport: Transport }) {
  const [useHann, setUseHann] = useState(true);
  const [tilt, setTilt] = useState(3);
  const [nb, setNb] = useState(24);
  const [check, setCheck] = useState<{ max: number; ms: number } | null>(null);
  const o = useLatest({ hann: useHann, tilt, nb });
  const out = useRef(new Float64Array(48));

  const ref = useCanvas((canvas, t) => {
    const A = currentAnalysis(transport), { ctx, w, h } = fit(canvas), opt = o.current;
    ctx.clearRect(0, 0, w, h);
    const end = Math.floor(t * SR), topH = h * 0.36, mid = topH / 2 + 4, sc = topH * 0.42;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    const s = (n: number) => A.sig[mod(end - FFT_N + n, A.sig.length)];
    const line = (fn: (n: number) => number, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      for (let px = 0; px < w; px++) { const y = mid - fn(Math.floor((px / w) * FFT_N)) * sc; if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y); }
      ctx.stroke();
    };
    line(s, 'rgba(214,229,224,0.3)', 1);
    if (opt.hann) line((n) => s(n) * hann[n], COLORS.mint, 1.4);
    label(ctx, `the last 64 ms${opt.hann ? ', through a Hann window' : ', cut off square'}`, 8, 13, COLORS.dim, 10);
    const v = analyseFrame(A.sig, end, opt, out.current);
    const base = h - 22, ph = base - topH - 16, bw = w / opt.nb;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let q = 0; q <= 1; q += 0.25) { ctx.beginPath(); ctx.moveTo(0, base - q * ph); ctx.lineTo(w, base - q * ph); ctx.stroke(); }
    for (let b = 0; b < opt.nb; b++) {
      const d = toDisp(v[b], FLOOR_S), bh = d * ph;
      ctx.fillStyle = `rgba(94,234,212,${0.35 + 0.65 * d})`; ctx.fillRect(b * bw + 1.5, base - bh, bw - 3, bh);
    }
    [100, 300, 1000, 3000].forEach((f) => label(ctx, f >= 1000 ? `${f / 1000}k` : `${f}`, (Math.log(f / LO_HZ) / Math.log(HI_HZ / LO_HZ)) * opt.nb * bw, h - 6, COLORS.dim, 10, 'center'));
    label(ctx, 'Hz, log scale: every band the same musical width', w - 6, h - 6, COLORS.dim, 10, 'right');
  }, transport);

  const runCheck = () => {
    const A = 0.5, x = Float32Array.from({ length: 4096 }, (_, i) => A * Math.sin((TAU * 1000 * i) / SR));
    const bands = new Float64Array(24);
    analyseFrame(x, 2048, { hann: true, tilt: 0, nb: 24 }, bands);
    let ms = 0, max = 0;
    bands.forEach((b) => { ms += b * b; max = Math.max(max, b); });
    setCheck({ max, ms });
  };

  return (
    <Part id="pitch" lead="Part 6" eyebrow="maths" title="Pitch: a spectrum every column">
      <Cols>
        <div>
          <p>For each column the last <code>N</code> samples go through a Hann window and a Fourier transform. A window is needed because the transform treats the slice as one period of a repeating signal. Cut a tone off sharply and the seam leaks energy across nearby frequency bins. Switch the window off on the right to see the skirts.</p>
          <Eq>{'w[n] = ½ − ½ cos(2πn / N)'}</Eq>
          <p>The numbers are scaled so they mean something. For an in-band sine whose energy sits within one band, the band value is calibrated to A/√2, its rms; the check below uses a 1 kHz sine. With Σw² the sum of squared window weights and X the transform:</p>
          <Eq>{`power[k] = 2 · |X[k]|² / (N · Σw²)
band power = Σ power[k] over the bins inside the band
band value = √(band power)         «a sine A gives A / √2»`}</Eq>
          <p>Bands are 24 steps on a log scale, so each is the same musical width (a little over three semitones). The browser demo covers 80 Hz to 7 kHz; the iOS app uses 80 Hz to 8 kHz. The implementation treats each FFT bin's power as spread uniformly across its width, so it counts a bin in proportion to the part covered by a band edge. In the 1 kHz test, the band powers sum to the tone's mean square; frequencies outside the configured range are omitted.</p>
          <p>Speech spectra often fall by roughly 6 dB per octave or more, so the top bands can sit near silence. A display tilt adds <code>tilt</code> dB per octave above 1 kHz. Set it to 0 to show the calibrated, untilted band levels.</p>
          <p>One more detail: a window of <code>N</code> samples describes the moment half a window ago. The orb reads the spectrum <code>N/2</code> samples later than the loudness, so a vowel's pitch and its volume line up.</p>
        </div>
        <Demo>
          <canvas ref={ref} style={{ aspectRatio: '1.55/1' }} />
          <Controls>
            <Check label="Hann window" checked={useHann} onChange={setUseHann} />
            <Range label="tilt" value={tilt} onChange={setTilt} min={0} max={6} step={0.5} format={(v) => `${v} dB/oct`} />
            <Range label="bands" value={nb} onChange={setNb} min={8} max={48} step={1} />
          </Controls>
          <Controls><button onClick={runCheck}>Check the scaling</button></Controls>
          <div className="rvo-readout">
            {check
              ? <>Sine, amplitude 0.5, 1 kHz, tilt 0.<br />Loudest band: <b>{check.max.toFixed(3)}</b> (A/√2 = 0.354). Bands' squares add to <b>{check.ms.toFixed(4)}</b> (mean square = 0.1250).</>
              : 'A sine of amplitude 0.5 should read 0.354 and have mean square 0.125.'}
          </div>
        </Demo>
      </Cols>
    </Part>
  );
}
