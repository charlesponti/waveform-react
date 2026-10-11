import { useState } from 'react';
import { currentAnalysis, useCanvas, useLatest } from '../../hooks';
import { dotsFor } from '../../orb/dots';
import { drawOrb } from '../../orb/draw';
import type { Transport } from '../../transport';
import { Check, Cols, Controls, Demo, Eq, Part, Range } from '../ui';

export function Time({ transport }: { transport: Transport }) {
  const [hist, setHist] = useState(0.8);
  const [byAge, setByAge] = useState(true);
  const o = useLatest({ hist, byAge });
  const ref = useCanvas((canvas, t) => drawOrb(canvas, dotsFor(900), { analysis: currentAnalysis(transport), t, mode: 'loudness', history: o.current.hist, colorBy: o.current.byAge ? 'age' : null }), transport);
  return (
    <Part id="time" lead="Part 4" eyebrow="maths" title="Time on a sphere">
      <Cols>
        <div>
          <p>Dots need to sit evenly on a sphere, with no clumps at the poles and no visible rows. The Fibonacci lattice does that with one loop. Heights are evenly spaced, and each dot is turned by the golden angle from the one before.</p>
          <Eq>{`yᵢ = 1 − 2(i + ½) / N
θᵢ = i · π(3 − √5)       «≈ 137.5°, the golden angle»
(x, z) = √(1 − y²) · (cos θ, sin θ)`}</Eq>
          <p>Height gives age. The equator is the newest column and the poles are the oldest, so each new sound appears as a ring at the equator and spreads toward both poles as it ages:</p>
          <Eq>{`age = |asin y| / (π/2)          «0 at the equator, 1 at a pole»
column shown = playhead − age · history`}</Eq>
          <p>The history slider is how many seconds the sphere spans. The orb in the app uses 0.8.</p>
        </div>
        <Demo>
          <canvas ref={ref} style={{ aspectRatio: '1.15/1' }} />
          <Controls>
            <Range label="history" value={hist} onChange={setHist} min={0.3} max={2} step={0.05} format={(v) => `${v.toFixed(2)} s`} />
            <Check label="colour by age" checked={byAge} onChange={setByAge} />
          </Controls>
          <div className="rvo-readout">Mint is now. Violet is the oldest sound the sphere still shows. Loudness only here; the next parts add smoothness and pitch.</div>
        </Demo>
      </Cols>
    </Part>
  );
}
