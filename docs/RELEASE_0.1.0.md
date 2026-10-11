# @thecharlesponti/waveform-react 0.1.0

First release: the orb as React components, plus the interactive explainer.

## What's in it

- `<VoiceOrb />`: pitch round the sphere, time down it, loudness pushing dots out. Props for mode, dots, gain, history, wrap, spin and colour.
- `<SpectrumMap />`: the same data laid flat.
- `<SignalPicker />` and `Transport`: one shared clock and choice of sound; with sound on, the audio clock drives every picture.
- `<OrbExplainer />`: the full article, from the one-number orb that does not work to the maths and engineering of the real one. Import `style.css` once.
- `analyse(samples)` to use your own 16 kHz mono sound; `columns`, `analyseFrame` and `bandsFor` for the maths.

## Quality

- 112 tests; 100% statements, branches, functions and lines, enforced in CI and before every publish.
- ESM only, with types. React 18 or newer.

## Install

```bash
npm i @thecharlesponti/waveform-react
```

## Not yet

A live microphone input. The orb reads precomputed analysis of looping sounds.

See the [README](https://github.com/charlesponti/waveform-react#readme) and the [live demo](https://charlesponti.github.io/voice-orb/).
