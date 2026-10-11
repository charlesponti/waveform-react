import './explainer.css';
import { useTransport } from '../hooks';
import { VoiceOrb } from '../components/VoiceOrb';
import { defaultTransport, type Transport } from '../transport';
import { SignalPicker } from './Bar';
import { Columns } from './parts/Columns';
import { Finished } from './parts/Finished';
import { Loudness } from './parts/Loudness';
import { Naive } from './parts/Naive';
import { Pitch } from './parts/Pitch';
import { Ring } from './parts/Ring';
import { Smooth } from './parts/Smooth';
import { Perf, Tests } from './parts/Tail';
import { Time } from './parts/Time';

export interface OrbExplainerProps {
  /** Share a clock and choice of sound with other components; defaults to the global one. */
  transport?: Transport;
  /** Hide the sticky bar if you place `<SignalPicker />` yourself. */
  hideBar?: boolean;
  className?: string;
}

/** The whole interactive article: from the naive one-number orb to the maths and engineering of the real one. */
export function OrbExplainer({ transport = defaultTransport, hideBar, className }: OrbExplainerProps) {
  useTransport(transport);
  return (
    <div className={className ? `rvo ${className}` : 'rvo'}>
      {hideBar ? null : <SignalPicker transport={transport} />}
      <main>
        <section className="rvo-hero">
          <div>
            <span className="rvo-eyebrow">Waveform experiment <b>/</b> Swift, Accelerate, no Metal</span>
            <h1>An orb that <em>listens</em></h1>
            <p className="rvo-lede">Every dot is one moment of sound at one pitch. Hum, whistle or drum and different parts of the sphere move. This page builds it from the version that does not work to the one that does, with the maths and the engineering at each step.</p>
          </div>
          <div className="rvo-hero-orb"><VoiceOrb transport={transport} /></div>
          <p className="rvo-note rvo-center">Synthetic sounds, drawn the way the app draws a live microphone. Pick a different one in the bar above, and press Sound to hear it.</p>
        </section>
        <Naive transport={transport} />
        <Finished transport={transport} />
        <Columns transport={transport} />
        <Loudness transport={transport} />
        <Time transport={transport} />
        <Smooth transport={transport} />
        <Pitch transport={transport} />
        <Ring transport={transport} />
        <Tests />
        <Perf />
        <footer>
          <p>The Swift package is <code>WaveformCore</code> (columns, rings, clocks, spectrum, orb model) and <code>WaveformApp</code> (the SwiftUI views). The plain orb is tagged <code>orb-v1</code>; this one lives on the <code>spectrum-orb</code> branch. Next to try: a damped wave along the time axis, and Metal if the draw time asks for it.</p>
        </footer>
      </main>
    </div>
  );
}
