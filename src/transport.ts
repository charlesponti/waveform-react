import { analysisFor } from './analysis';
import { DUR, SR } from './dsp/constants';
import { mod } from './dsp/math';
import type { SignalName } from './signals';

export interface TransportState {
  signal: SignalName;
  /** Playing through the speakers; the audio clock then drives every picture. */
  audio: boolean;
  paused: boolean;
  /** True after a failed attempt to start audio. */
  unavailable: boolean;
}

/**
 * One clock and one choice of sound, shared by every orb and demo that uses it.
 *
 * With sound off the time is the page's own clock. With sound on it is the audio context's clock minus its
 * output latency, so the picture matches what comes out of the speakers.
 */
export class Transport {
  private t0 = typeof performance === 'undefined' ? 0 : performance.now() / 1000;
  private frozen: number | null = null;
  private ctx: AudioContext | null = null;
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private bufs = new Map<SignalName, AudioBuffer>();
  private listeners = new Set<() => void>();
  private snapshot: TransportState = { signal: 'vowels', audio: false, paused: false, unavailable: false };

  getState = (): TransportState => this.snapshot;
  getServerState = (): TransportState => this.snapshot;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(patch: Partial<TransportState>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach((l) => l()); }

  private latency() { return (this.ctx && this.ctx.outputLatency) || 0.02; }
  private clockNow() { return this.snapshot.audio && this.ctx ? this.ctx.currentTime - this.latency() : performance.now() / 1000; }

  /** Seconds since the start, on the clock in use. Unwrapped; the signals loop every 8 s. */
  t(): number { return this.frozen !== null ? this.frozen : this.clockNow() - this.t0; }

  setSignal(name: SignalName) {
    if (name === this.snapshot.signal) return;
    this.set({ signal: name });
    if (this.snapshot.audio) this.startSource();
  }

  setPaused(on: boolean) {
    if (on === this.snapshot.paused) return;
    if (on) { this.frozen = this.t(); if (this.snapshot.audio) this.setSound(false); this.set({ paused: true }); }
    else { this.t0 = this.clockNow() - (this.frozen ?? 0); this.frozen = null; this.set({ paused: false }); }
  }

  /** Starts or stops playback. Call it from a user gesture. Returns false when the browser has no audio. */
  setSound(on: boolean): boolean {
    const cur = this.t();
    if (on) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = this.ctx ?? new Ctx();
        if (!this.gain) { this.gain = this.ctx.createGain(); this.gain.gain.value = 0.5; this.gain.connect(this.ctx.destination); }
        void this.ctx.resume();
      } catch { this.set({ unavailable: true }); return false; }
      this.frozen = null;
      this.snapshot = { ...this.snapshot, audio: true, paused: false, unavailable: false };
      this.t0 = this.ctx.currentTime - this.latency() - cur;
      this.startSource();
      this.set({});
    } else {
      this.stopSource();
      this.snapshot = { ...this.snapshot, audio: false };
      this.t0 = performance.now() / 1000 - cur;
      this.set({});
    }
    return true;
  }

  private startSource() {
    this.stopSource();
    if (!this.ctx || !this.gain) return;
    const name = this.snapshot.signal;
    let buf = this.bufs.get(name);
    if (!buf) {
      buf = this.ctx.createBuffer(1, SR * DUR, SR);
      buf.copyToChannel(analysisFor(name).sig as Float32Array<ArrayBuffer>, 0);
      this.bufs.set(name, buf);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.connect(this.gain);
    src.start(0, mod(this.t(), DUR));
    this.src = src;
  }

  private stopSource() {
    if (!this.src) return;
    try { this.src.stop(); } catch { /* already stopped */ }
    this.src.disconnect();
    this.src = null;
  }
}

/** The transport that components use when none is passed in. */
export const defaultTransport = new Transport();
