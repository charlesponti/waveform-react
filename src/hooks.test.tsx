import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { currentAnalysis, setHtml, useCanvas, useLatest, useTransport } from './hooks';
import { setVisible, tick } from './test/setup';
import { Transport } from './transport';

describe('useTransport', () => {
  it('re-renders when the transport changes', () => {
    const t = new Transport();
    const { result } = renderHook(() => useTransport(t));
    expect(result.current.signal).toBe('vowels');
    act(() => t.setSignal('hiss'));
    expect(result.current.signal).toBe('hiss');
  });
  it('defaults to the shared transport', () => {
    const { result } = renderHook(() => useTransport());
    expect(result.current).toHaveProperty('audio');
  });
});

describe('currentAnalysis', () => {
  it('is the analysis of the chosen sound', () => {
    const t = new Transport();
    t.setSignal('whistle');
    expect(currentAnalysis(t).name).toBe('whistle');
  });
});

describe('useLatest', () => {
  it('always holds the newest value', () => {
    const { result, rerender } = renderHook(({ v }) => useLatest(v), { initialProps: { v: 1 } });
    rerender({ v: 2 });
    expect(result.current.current).toBe(2);
  });
});

describe('useCanvas', () => {
  const Probe = ({ draw, t }: { draw: (c: HTMLCanvasElement, s: number) => void; t: Transport }) => <canvas data-testid="c" ref={useCanvas(draw, t)} />;
  it('draws the canvas every frame while it is visible, with the newest draw function', () => {
    const t = new Transport(), first = vi.fn(), second = vi.fn();
    const { getByTestId, rerender } = render(<Probe draw={first} t={t} />);
    const c = getByTestId('c') as HTMLCanvasElement;
    setVisible(c);
    tick();
    expect(first).toHaveBeenCalledTimes(1);
    rerender(<Probe draw={second} t={t} />);
    tick();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
  it('uses the shared transport by default and stops drawing after unmount', () => {
    const draw = vi.fn();
    const Default = () => <canvas data-testid="d" ref={useCanvas(draw)} />;
    const { getByTestId, unmount } = render(<Default />);
    setVisible(getByTestId('d'));
    tick();
    expect(draw).toHaveBeenCalledTimes(1);
    unmount();
    tick();
    expect(draw).toHaveBeenCalledTimes(1);
  });
  it('does nothing when the canvas is never attached', () => {
    const Unattached = () => { useCanvas(vi.fn()); return null; };
    expect(() => render(<Unattached />)).not.toThrow();
  });
});

describe('setHtml', () => {
  it('writes markup only when it changed, and ignores an empty ref', () => {
    const el = document.createElement('div');
    setHtml({ current: el }, '<b>1</b>');
    const before = el.firstChild;
    setHtml({ current: el }, '<b>1</b>');
    expect(el.firstChild).toBe(before);
    setHtml({ current: el }, '<b>2</b>');
    expect(el.textContent).toBe('2');
    expect(() => setHtml({ current: null }, 'x')).not.toThrow();
  });
});
