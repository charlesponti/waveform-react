import { describe, expect, it, vi } from 'vitest';
import { FakeAudioContext, advance } from './test/setup';
import { DUR } from './dsp/constants';
import { Transport } from './transport';

const lastCtx = () => FakeAudioContext.instances[FakeAudioContext.instances.length - 1];

describe('Transport with sound off', () => {
  it('starts on vowels, not playing, not paused', () => {
    expect(new Transport().getState()).toEqual({ signal: 'vowels', audio: false, paused: false, unavailable: false });
    const t = new Transport();
    expect(t.getServerState()).toBe(t.getState());
  });
  it('keeps time on the page clock', () => {
    const t = new Transport();
    advance(2.5);
    expect(t.t()).toBeCloseTo(2.5, 6);
  });
  it('notifies subscribers when the signal changes, once, and not when it stays the same', () => {
    const t = new Transport(), seen = vi.fn();
    const off = t.subscribe(seen);
    t.setSignal('hum'); t.setSignal('hum');
    expect(seen).toHaveBeenCalledTimes(1);
    expect(t.getState().signal).toBe('hum');
    off(); t.setSignal('hiss');
    expect(seen).toHaveBeenCalledTimes(1);
  });
  it('pauses and resumes without losing or gaining time', () => {
    const t = new Transport();
    advance(1);
    t.setPaused(true);
    t.setPaused(true); // already paused: nothing happens
    advance(10);
    expect(t.t()).toBeCloseTo(1, 6);
    expect(t.getState().paused).toBe(true);
    t.setPaused(false);
    t.setPaused(false);
    advance(0.5);
    expect(t.t()).toBeCloseTo(1.5, 6);
    expect(t.getState().paused).toBe(false);
  });
  it('turning sound off when it is already off just keeps time', () => {
    const t = new Transport();
    advance(1);
    expect(t.setSound(false)).toBe(true);
    expect(t.t()).toBeCloseTo(1, 6);
  });
});

describe('Transport with sound on', () => {
  it('plays the signal from the current position, on the audio clock minus latency', () => {
    const t = new Transport();
    advance(3);
    expect(t.setSound(true)).toBe(true);
    const ctx = lastCtx(), src = ctx.sources[0];
    expect(t.getState().audio).toBe(true);
    expect(src.loop).toBe(true);
    expect(src.start).toHaveBeenCalledWith(0, expect.closeTo(3 % DUR, 6));
    expect(ctx.resume).toHaveBeenCalled();
    expect(t.t()).toBeCloseTo(3, 6);
    ctx.currentTime += 1;
    expect(t.t()).toBeCloseTo(4, 6);
  });
  it('uses a default latency when the browser reports none', () => {
    const t = new Transport();
    t.setSound(true);
    const ctx = lastCtx();
    ctx.outputLatency = undefined;
    t.setSignal('hum'); // restarts the source and reads the latency
    expect(t.t()).toBeCloseTo(ctx.currentTime - 0.02 - (ctx.currentTime - 0.05 - 0), 1);
  });
  it('reuses the context and the decoded buffer, and restarts the source when the signal changes', () => {
    const t = new Transport();
    t.setSound(true);
    const ctx = lastCtx();
    t.setSignal('hum');
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources[0].stop).toHaveBeenCalled();
    expect(ctx.sources[0].disconnect).toHaveBeenCalled();
    expect(ctx.buffers).toHaveLength(2); // vowels, then hum
    t.setSound(false);
    t.setSound(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(ctx.buffers).toHaveLength(2); // hum was decoded once and reused
    t.setSignal('vowels');
    t.setSignal('hum');
    expect(ctx.buffers).toHaveLength(2);
  });
  it('turning sound off stops the source and goes back to the page clock without a jump', () => {
    const t = new Transport();
    advance(2);
    t.setSound(true);
    const ctx = lastCtx();
    ctx.currentTime += 1;
    t.setSound(false);
    expect(ctx.sources[0].stop).toHaveBeenCalled();
    expect(t.getState().audio).toBe(false);
    expect(t.t()).toBeCloseTo(3, 6);
    advance(1);
    expect(t.t()).toBeCloseTo(4, 6);
  });
  it('shrugs off a source that has already stopped', () => {
    const t = new Transport();
    t.setSound(true);
    lastCtx().sources[0].stopThrows = true;
    expect(() => t.setSound(false)).not.toThrow();
  });
  it('pausing turns sound off, and playing again unpauses', () => {
    const t = new Transport();
    t.setSound(true);
    t.setPaused(true);
    expect(t.getState()).toMatchObject({ audio: false, paused: true });
    t.setSound(true);
    expect(t.getState()).toMatchObject({ audio: true, paused: false });
  });
  it('falls back to webkitAudioContext', () => {
    vi.stubGlobal('AudioContext', undefined);
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = FakeAudioContext;
    const t = new Transport();
    expect(t.setSound(true)).toBe(true);
    delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  });
  it('reports unavailable when audio cannot start', () => {
    FakeAudioContext.throwOnCreate = true;
    const t = new Transport();
    expect(t.setSound(true)).toBe(false);
    expect(t.getState()).toMatchObject({ audio: false, unavailable: true });
    FakeAudioContext.throwOnCreate = false;
    expect(t.setSound(true)).toBe(true);
    expect(t.getState().unavailable).toBe(false);
  });
  it('has a usable clock when `performance` does not exist yet (server rendering)', () => {
    vi.stubGlobal('performance', undefined);
    const t = new Transport();
    vi.unstubAllGlobals();
    expect(t.getState().signal).toBe('vowels');
  });
});
