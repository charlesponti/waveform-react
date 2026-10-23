import type { CSSProperties } from 'react';
import { analysisFor, type Analysis } from '../analysis';
import { useCanvas, useLatest, useTransport } from '../hooks';
import { dotsFor } from '../orb/dots';
import { drawMap, drawOrb } from '../orb/draw';
import type { SignalName } from '../signals';
import { defaultTransport, type Transport } from '../transport';

export interface VoiceOrbProps {
  /** A built-in sound, or your own `analyse(samples)`. Omit to follow the shared transport's choice. */
  signal?: SignalName | Analysis;
  /** `spectrum` (pitch round the sphere, time down it) or `loudness` (time only). */
  mode?: 'spectrum' | 'loudness';
  /** Number of dots. */
  dots?: number;
  /** How far full-scale sound pushes a dot out, as a fraction of the radius. */
  gain?: number;
  /** Seconds of sound the sphere spans. */
  history?: number;
  /** 0 is a flat map, 1 is the sphere. */
  wrap?: number;
  /** Turn in radians a second; 0 holds it still. */
  spin?: number;
  colorBy?: 'age' | 'pitch' | null;
  /** The colour of the dots, as a CSS colour (hex). */
  tint?: string;
  /** Multiplies the size of every dot. */
  dotScale?: number;
  transport?: Transport;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

function useAnalysis(signal: VoiceOrbProps['signal'], transport: Transport): Analysis {
  const state = useTransport(transport);
  if (signal && typeof signal === 'object') return signal;
  return analysisFor(signal ?? state.signal);
}

/** A sphere of dots that listens: time runs from the equator to the poles, pitch runs round it. */
export function VoiceOrb({
  signal, mode = 'spectrum', dots = 1800, gain = 0.5, history = 0.8, wrap = 1, spin = 0.12, colorBy = null, tint, dotScale,
  transport = defaultTransport, className, style, 'aria-label': ariaLabel = 'An orb of dots that moves with the sound',
}: VoiceOrbProps) {
  const analysis = useAnalysis(signal, transport);
  const opts = useLatest({ analysis, mode, dots, gain, history, wrap, spin, colorBy, tint, dotScale });
  const ref = useCanvas((canvas, t) => {
    const o = opts.current;
    drawOrb(canvas, dotsFor(o.dots), { analysis: o.analysis, t, mode: o.mode, gain: o.gain, history: o.history, wrap: o.wrap, spin: o.spin, colorBy: o.colorBy, tint: o.tint, dotScale: o.dotScale });
  }, transport);
  return <canvas ref={ref} className={className} role="img" aria-label={ariaLabel} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', ...style }} />;
}

export interface SpectrumMapProps {
  signal?: SignalName | Analysis;
  history?: number;
  transport?: Transport;
  className?: string;
  style?: CSSProperties;
}

/** The orb's data laid flat: pitch across, time up, newest at the bottom. */
export function SpectrumMap({ signal, history = 0.8, transport = defaultTransport, className, style }: SpectrumMapProps) {
  const analysis = useAnalysis(signal, transport);
  const opts = useLatest({ analysis, history });
  const ref = useCanvas((canvas, t) => drawMap(canvas, opts.current.analysis, t, opts.current.history), transport);
  return <canvas ref={ref} className={className} role="img" aria-label="A spectrogram: pitch across, time up" style={{ display: 'block', width: '100%', aspectRatio: '2.1 / 1', ...style }} />;
}
