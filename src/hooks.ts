import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { analysisFor, type Analysis } from './analysis';
import { register } from './scheduler';
import { defaultTransport, type Transport, type TransportState } from './transport';

/** The shared transport's state (chosen sound, playing, paused), re-rendering on change. */
export function useTransport(transport: Transport = defaultTransport): TransportState {
  return useSyncExternalStore(transport.subscribe, transport.getState, transport.getServerState);
}

/** The analysis of the sound the transport has chosen. */
export const currentAnalysis = (transport: Transport): Analysis => analysisFor(transport.getState().signal);

/** Keeps the newest value in a ref, so a draw function registered once always sees current props and state. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** A canvas that `draw` paints every animation frame while it is visible. */
export function useCanvas(draw: (canvas: HTMLCanvasElement, t: number) => void, transport: Transport = defaultTransport) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useLatest(draw);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return register(canvas, (c, t) => latest.current(c, t), transport);
  }, [transport, latest]);
  return ref;
}

/** Writes markup built only from numbers into an element, without re-rendering React. */
export function setHtml(ref: RefObject<HTMLElement | null>, html: string) {
  if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html;
}
