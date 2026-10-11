import { useState } from 'react';
import { useCanvas, useLatest, currentAnalysis, useTransport } from '../../hooks';
import { dotsFor } from '../../orb/dots';
import { drawMap, drawOrb } from '../../orb/draw';
import { SIGNALS } from '../../signals';
import type { Transport } from '../../transport';
import { Check, Cols, Controls, Demo, Part } from '../ui';

export function Finished({ transport }: { transport: Transport }) {
  const { signal } = useTransport(transport);
  const [wrap, setWrap] = useState(1);
  const [byPitch, setByPitch] = useState(false);
  const o = useLatest({ wrap, byPitch });
  const orb = useCanvas((canvas, t) => drawOrb(canvas, dotsFor(1800), { analysis: currentAnalysis(transport), t, mode: 'spectrum', wrap: o.current.wrap, colorBy: o.current.byPitch ? 'pitch' : null }), transport);
  const map = useCanvas((canvas, t) => drawMap(canvas, currentAnalysis(transport), t, 0.8), transport);
  const look = SIGNALS[signal].look;
  return (
    <Part id="finished" lead="The result" eyebrow="what the finished orb does" title="A spectrogram wrapped round a sphere">
      <Cols>
        <div>
          <p>Where a dot sits down the sphere is time: the equator is the newest sound, and each moment ripples toward both poles as it ages. Where a dot sits round the sphere is pitch: low on one meridian, high on the opposite one. How far a dot is pushed out, and how large it is drawn, is how loud that pitch was at that moment.</p>
          <p>The map on the right is the same data laid flat. Drag the slider to wrap it up.</p>
          <div className="rvo-look"><b>{look.lead}</b> {look.text}</div>
          <Controls>
            <label>Flat <input type="range" min={0} max={1} step={0.01} value={wrap} aria-label="Wrap the map into a sphere" onChange={(e) => setWrap(+e.target.value)} /> Orb</label>
            <Check label="colour by pitch" checked={byPitch} onChange={setByPitch} />
          </Controls>
        </div>
        <Demo>
          <canvas ref={orb} style={{ aspectRatio: '1.25/1' }} />
          <canvas ref={map} style={{ aspectRatio: '2.1/1' }} />
          <div className="rvo-readout">Bottom of the map: the newest sound. Top: 0.8 seconds ago. Left to right: 80 Hz to 7 kHz on a log scale, which is also front to back round the orb.</div>
        </Demo>
      </Cols>
    </Part>
  );
}
