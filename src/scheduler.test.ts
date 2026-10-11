import { describe, expect, it, vi } from 'vitest';
import { register } from './scheduler';
import { setVisible, tick } from './test/setup';
import { Transport } from './transport';

const canvas = () => document.createElement('canvas');

describe('scheduler', () => {
  it('draws only canvases that are visible, with the transport time', () => {
    const t = new Transport(), a = canvas(), b = canvas();
    const drawA = vi.fn(), drawB = vi.fn();
    const offA = register(a, drawA, t), offB = register(b, drawB, t);
    tick();
    expect(drawA).not.toHaveBeenCalled();
    setVisible(a);
    tick();
    expect(drawA).toHaveBeenCalledWith(a, expect.any(Number));
    expect(drawB).not.toHaveBeenCalled();
    setVisible(a, false);
    drawA.mockClear();
    tick();
    expect(drawA).not.toHaveBeenCalled();
    offA(); offB();
  });
  it('ignores visibility news about elements it does not know', () => {
    const t = new Transport(), a = canvas();
    const off = register(a, vi.fn(), t);
    expect(() => setVisible(canvas())).not.toThrow();
    off(); tick();
  });
  it('logs a draw error and keeps drawing the others', () => {
    const t = new Transport(), a = canvas(), b = canvas();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = vi.fn();
    const offA = register(a, () => { throw new Error('boom'); }, t), offB = register(b, good, t);
    setVisible(a); setVisible(b);
    tick();
    expect(err).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
    offA(); offB();
  });
  it('stops the loop when the last canvas leaves, and starts it again for the next', () => {
    const t = new Transport(), a = canvas();
    const off = register(a, vi.fn(), t);
    expect(tick()).toBe(1);
    off();
    expect(tick()).toBe(1); // one last frame notices nothing is left
    expect(tick()).toBe(0);
    const draw = vi.fn();
    const off2 = register(a, draw, t);
    setVisible(a);
    expect(tick()).toBe(1);
    expect(draw).toHaveBeenCalled();
    off2();
  });
  it('does not start a second loop while one is running', () => {
    const t = new Transport(), a = canvas(), b = canvas();
    const offA = register(a, vi.fn(), t), offB = register(b, vi.fn(), t);
    expect(tick()).toBe(1);
    offA(); offB();
  });
});
