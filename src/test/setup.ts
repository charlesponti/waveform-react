import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/* ---- a canvas that records what is drawn ---- */
export interface Call { name: string; args: unknown[] }
export interface RecordingContext { calls: Call[]; canvas: HTMLCanvasElement; [key: string]: unknown }
const contexts = new WeakMap<HTMLCanvasElement, RecordingContext>();

function makeContext(canvas: HTMLCanvasElement): RecordingContext {
  const calls: Call[] = [];
  const target: RecordingContext = { calls, canvas };
  return new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (prop === 'createImageData') return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      return (...args: unknown[]) => { calls.push({ name: prop, args }); };
    },
    set(t, prop: string, value) { t[prop] = value; calls.push({ name: `set:${prop}`, args: [value] }); return true; },
  });
}

/** The recording context of a canvas (created on first use, like the real one). */
export const ctxOf = (canvas: HTMLCanvasElement) => canvas.getContext('2d') as unknown as RecordingContext;
export const callsOf = (canvas: HTMLCanvasElement, name: string) => ctxOf(canvas).calls.filter((c) => c.name === name);

class FakePath2D {
  ops: string[] = [];
  moveTo() { this.ops.push('moveTo'); }
  arc() { this.ops.push('arc'); }
}

/* ---- visibility, frames, time, audio ---- */
// The scheduler makes one observer for the whole page, so its callback outlives each test.
const observerCallbacks: IntersectionObserverCallback[] = [];
class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) { observerCallbacks.push(cb); }
  observe() {}
  unobserve() {}
  disconnect() {}
}
/** Marks a canvas as on screen (or off it). */
export const setVisible = (target: Element, isIntersecting = true) =>
  observerCallbacks.forEach((cb) => cb([{ target, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));

let frames: FrameRequestCallback[] = [];
/** Runs the animation frames that are waiting, once. Returns how many ran. */
export function tick(times = 1) {
  let ran = 0;
  for (let i = 0; i < times; i++) { const due = frames; frames = []; due.forEach((cb) => cb(0)); ran += due.length; }
  return ran;
}

let nowSeconds = 1000;
/** The page clock (`performance.now`) in seconds. */
export const setNow = (s: number) => { nowSeconds = s; };
export const advance = (s: number) => { nowSeconds += s; };

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static throwOnCreate = false;
  currentTime = 50;
  outputLatency: number | undefined = 0.05;
  destination = {};
  sources: FakeSource[] = [];
  buffers: { copyToChannel: ReturnType<typeof vi.fn> }[] = [];
  resume = vi.fn(() => Promise.resolve());
  constructor() { if (FakeAudioContext.throwOnCreate) throw new Error('no audio'); FakeAudioContext.instances.push(this); }
  createGain() { return { gain: { value: 1 }, connect: vi.fn() }; }
  createBuffer() { const b = { copyToChannel: vi.fn() }; this.buffers.push(b); return b; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
}
export class FakeSource {
  buffer: unknown = null; loop = false; stopThrows = false;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn(() => { if (this.stopThrows) throw new Error('already stopped'); });
}

beforeEach(() => {
  frames = []; nowSeconds = 1000;
  FakeAudioContext.instances = []; FakeAudioContext.throwOnCreate = false;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('Path2D', FakePath2D);
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('devicePixelRatio', 2);
  vi.spyOn(performance, 'now').mockImplementation(() => nowSeconds * 1000);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let c = contexts.get(this);
    if (!c) { c = makeContext(this); contexts.set(this, c); }
    return c as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement['getContext']);
  vi.spyOn(HTMLCanvasElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
  vi.spyOn(HTMLCanvasElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
});

afterEach(() => {
  cleanup();
  // Let the shared animation loop notice that nothing is left to draw and stop.
  for (let i = 0; i < 3 && frames.length; i++) tick();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
