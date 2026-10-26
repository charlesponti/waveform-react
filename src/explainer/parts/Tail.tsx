import { Cols, Eq, Part } from '../ui';

const TESTS: [string, string][] = [
  ['Exact columns', 'Feed audio in buffers of many sizes; the column count and edges match the sample count every time.'],
  ['A / √2', 'An in-band sine reads A/√2 in its spectrum band; the check uses 1 kHz.'],
  ['Band power', 'For the in-band 1 kHz test tone, band powers sum to its mean square; out-of-range frequencies are omitted.'],
  ['Aligned hops', 'Spectrum frame k and column k end on the same sample.'],
  ['No flicker', "A windowed loudness varies far less than a single column's on a steady tone."],
  ['Pitch map', "Each dot's pitch equals its longitude from the definition, the same on both sides."],
  ['Torn reads', 'A reader that is lapped by the writer retries and returns whole columns.'],
];
const SETTINGS: [string, string][] = [
  ['sample rate', "the microphone's, typically 48 kHz"], ['columns per second', '120'], ['loudness window', '25 ms, then 150 ms release'],
  ['spectrum', '2048-point FFT, 24 bands, 80 Hz to 8 kHz'], ['display tilt', '+3 dB per octave above 1 kHz'], ['decibel floor', '−60 dB loudness, −66 dB spectrum'],
  ['playhead delay', '60 ms'], ['history', '0.8 s across the sphere'], ['dots', '1,800, four depth layers'], ['spin', '0.12 rad/s, tipped 0.32 rad'],
];

const Table = ({ head, rows }: { head: [string, string]; rows: [string, string][] }) => (
  <div className="rvo-table"><table><thead><tr><th>{head[0]}</th><th>{head[1]}</th></tr></thead><tbody>{rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div>
);

export function Tests() {
  return (
    <Part id="tests" lead="Part 8" eyebrow="engineering" title="Proving the maths">
      <Cols even>
        <div>
          <p>The risk in a picture is that it looks plausible while being wrong. So each piece of maths has a test with a known answer, written from the definition and not from what the code happens to output.</p>
          <p>The test suites run on the Mac with synthetic signals and need no microphone.</p>
        </div>
        <Table head={['Property', 'How it is checked']} rows={TESTS} />
      </Cols>
    </Part>
  );
}

export function Perf() {
  return (
    <Part id="perf" lead="Part 9" eyebrow="engineering" title="Does it need Metal?">
      <Cols even>
        <div>
          <p>The orb is 1,800 dots. The work per frame is small: about eight table reads per dot, then a rotation and a circle. Two choices keep it cheap in SwiftUI's Canvas. Dots are sorted into four depth layers and each layer is a single path with a single fill, so there are four path fills instead of one fill per dot.</p>
          <p>A readout in the corner of the app shows the average draw time. The rule for going to Metal is written down before measuring:</p>
          <Eq>{`draw time > ~4 ms at 120 Hz, or dropped frames  →  Metal
(a 120 Hz frame is 8.3 ms; leave half of it for the system)`}</Eq>
          <p>Metal would give more direct control over GPU rendering and presentation, and could make more dots or effects practical. The actual throughput depends on the device and needs benchmarking.</p>
        </div>
        <div>
          <Table head={['Setting', 'Value in the app']} rows={SETTINGS} />
          <p className="rvo-note" style={{ marginTop: 12 }}>The demos on this page run the same core maths in JavaScript at 16 kHz with a 1024-point FFT and 80 Hz–7 kHz spectrum bands, so everything works in a browser.</p>
        </div>
      </Cols>
    </Part>
  );
}
