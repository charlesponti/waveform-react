# @thecharlesponti/waveform-react

The React half of Waveform (the iOS half is [waveform-ios](https://github.com/charlesponti/waveform-ios)).

A sphere of dots that listens. Time runs from the equator to the poles, pitch runs round it, and loudness pushes
each dot out. Also in the box: the whole interactive explainer of the maths behind it, as one component.

```bash
npm i @thecharlesponti/waveform-react
```

```tsx
import { VoiceOrb } from '@thecharlesponti/waveform-react';

<VoiceOrb signal="vowels" style={{ width: 360 }} />
```

## Components

| Component | What it is |
| --- | --- |
| `<VoiceOrb />` | The orb. Props: `signal`, `mode` (`spectrum` or `loudness`), `dots`, `gain`, `history`, `wrap`, `spin`, `colorBy`, `transport`. |
| `<SpectrumMap />` | The same data laid flat: pitch across, time up. |
| `<OrbExplainer />` | The full article, from the naive one-number orb to the maths and engineering of the real one. Import `@thecharlesponti/waveform-react/style.css` once. |
| `<SignalPicker />` | Chips plus Sound and Pause buttons for a transport. Included in `OrbExplainer`; use it alone to drive your own orbs. |

```tsx
import { OrbExplainer } from '@thecharlesponti/waveform-react';
import '@thecharlesponti/waveform-react/style.css';

export default () => <OrbExplainer />;
```

## Your own sound

`signal` takes one of the built-in names (`vowels`, `hum`, `whistle`, `arpeggio`, `hiss`, `drums`) or an analysis of
your own mono, 16 kHz samples, which the orb loops:

```tsx
import { analyse, VoiceOrb } from '@thecharlesponti/waveform-react';

const analysis = useMemo(() => analyse(samples /* Float32Array, 16 kHz */), [samples]);
<VoiceOrb signal={analysis} />
```

`analyse` costs about 60 ms for eight seconds of audio. The orb reads the analysis; it does not hear a live
microphone yet (see below).

## One clock

Every orb and demo reads time from a `Transport`. With sound off it is the page clock. `transport.setSound(true)`
(from a click) plays the signal and switches every picture to the audio clock minus the output latency, so what you
see matches what you hear. Pass your own `new Transport()` to keep a group of orbs separate.

## Fonts

The explainer's CSS is scoped under `.rvo` and uses IBM Plex Sans, IBM Plex Mono and Instrument Serif if you load
them. Without them it falls back to system fonts; override `--display`, `--body` and `--mono` on `.rvo` to change them.

## Maths

`columns`, `analyseFrame` and `bandsFor` are exported and tested: a sine of amplitude A reads A/√2 in its band,
the band powers add up to the signal's mean square, column edges are `round(k · sampleRate / rate)`.

## Not yet

- A live microphone input. That needs an AudioWorklet feeding the same column and spectrum builders; the page runs the
  maths offline on synthetic sounds.
- Respecting `prefers-reduced-motion` beyond the spin.

## Develop

```bash
npm run dev          # the explainer in a Vite dev server
npm test             # all tests
npm run coverage     # tests with a 100% coverage gate
npm run build        # dist/ with types and style.css
npm run build:demo   # a static site in demo-dist/
```
