import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrbExplainer } from './OrbExplainer';
import { advance, callsOf, setVisible, tick } from '../test/setup';
import { Transport } from '../transport';

const mount = (props: Partial<React.ComponentProps<typeof OrbExplainer>> = {}) => {
  const t = new Transport();
  const utils = render(<OrbExplainer transport={t} {...props} />);
  return { t, ...utils };
};
const canvases = () => [...document.querySelectorAll('canvas')] as HTMLCanvasElement[];
const showAll = () => canvases().forEach((c) => setVisible(c));
const run = (frames: number, dt = 0.016) => { for (let i = 0; i < frames; i++) { advance(dt); tick(); } };
const range = (name: RegExp | string, section?: string) => within(section ? (document.querySelector(`#${section}`) as HTMLElement) : document.body).getByLabelText(name) as HTMLInputElement;
const setRange = (el: HTMLInputElement, v: number) => fireEvent.change(el, { target: { value: String(v) } });
const canvasAfter = (id: string) => document.querySelector(`#${id}`)!.querySelectorAll('canvas');

describe('OrbExplainer', () => {
  it('renders every part, with a hero orb, and takes a class', () => {
    const { container } = mount({ className: 'mine' });
    expect(container.firstElementChild?.className).toBe('rvo mine');
    expect(container.querySelectorAll('.rvo-part')).toHaveLength(10);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('An orb that listens');
    expect(screen.getByRole('button', { name: 'Vowels' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /orb of dots/ })).toBeTruthy();
  });
  it('can hide the bar, and uses the shared transport when none is passed', () => {
    const { container } = render(<OrbExplainer hideBar />);
    expect(container.querySelector('.rvo-bar')).toBeNull();
    expect(container.firstElementChild?.className).toBe('rvo');
  });
  it('re-renders the look when another sound is chosen', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Whistle' }));
    expect(document.querySelector('.rvo-look')?.textContent).toMatch(/whistle/i);
  });
  it('draws every canvas without errors', () => {
    mount();
    showAll();
    run(5);
    for (const c of canvases()) expect(ctxCalls(c)).toBeGreaterThan(0);
  });
});
const ctxCalls = (c: HTMLCanvasElement) => callsOf(c, 'clearRect').length + callsOf(c, 'drawImage').length;

describe('Naive', () => {
  it('steps with audio chunks, forgets when the sound changes and drops old history', () => {
    const { t } = mount();
    showAll();
    run(6, 0.05);
    const [orb, scope] = canvasAfter('naive');
    expect(callsOf(orb, 'fill').length).toBeGreaterThan(0);
    expect(callsOf(scope, 'stroke').length).toBeGreaterThan(0);
    act(() => t.setSignal('hiss'));
    run(40, 0.05); // more than 1.6 s of history
    expect(callsOf(scope, 'lineTo').length).toBeGreaterThan(10);
  });
});

describe('Finished', () => {
  it('wraps the map into a sphere and colours by pitch', () => {
    mount();
    showAll();
    run(2);
    const [orb] = canvasAfter('finished');
    const before = callsOf(orb, 'arc').length;
    setRange(range('Wrap the map into a sphere'), 0);
    fireEvent.click(screen.getByLabelText('colour by pitch'));
    run(2);
    expect(callsOf(orb, 'arc').length).toBeGreaterThan(before);
    fireEvent.click(screen.getByLabelText('colour by pitch'));
    run(1);
  });
});

describe('Columns', () => {
  it('shows exact edges and the drift from truncating, for each sample rate', () => {
    mount();
    showAll();
    run(3, 0.3);
    const readout = () => document.querySelector('#columns .rvo-readout')!.textContent!;
    expect(readout()).toMatch(/352\.80/);
    expect(readout()).toMatch(/136 ms/);
    fireEvent.change(screen.getByLabelText(/recorded at/), { target: { value: '48000' } });
    expect(readout()).toMatch(/384\.00/);
    expect(readout()).toMatch(/0 ms/);
    setRange(range(/^columns per second/, 'columns'), 40);
    run(2, 0.3);
    expect(readout()).toMatch(/1200\.00/);
    setRange(range(/^columns per second/, 'columns'), 400);
    run(2, 0.3);
    expect(readout()).toMatch(/120\.00/);
  });
});

describe('Loudness', () => {
  it('shows flicker shrink and the release change', () => {
    const { t } = mount();
    showAll();
    run(3);
    setRange(range(/^column length/), 20);
    expect(screen.getByText('20 ms')).toBeTruthy();
    setRange(range(/^release/), 0.3);
    expect(screen.getByText('300 ms')).toBeTruthy();
    run(3);
    act(() => t.setSignal('drums'));
    run(3);
    const [flick, ball] = canvasAfter('loudness');
    expect(callsOf(flick, 'stroke').length).toBeGreaterThan(5);
    expect(callsOf(ball, 'fillText').some((c) => c.args[0] === 'amplitude')).toBe(true);
  });
});

describe('Time', () => {
  it('changes the history and colour', () => {
    mount();
    showAll();
    run(2);
    setRange(range(/^history/), 1.5);
    expect(screen.getByText('1.50 s')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('colour by age'));
    run(2);
    const [orb] = canvasAfter('time');
    expect(callsOf(orb, 'fill').length).toBeGreaterThan(0);
  });
});

describe('Smooth', () => {
  it('reads the columns four ways, with and without noisy and smoothed frame times', () => {
    const { t } = mount();
    showAll();
    run(4);
    const readout = () => document.querySelector('#smooth .rvo-readout')!.textContent!;
    expect(readout()).toBe('');
    run(20);
    expect(readout()).toMatch(/roughness \d/);
    for (const name of [/newest column/, /nearest/, /linear/, /cubic/]) { fireEvent.click(screen.getByLabelText(name)); run(10); }
    fireEvent.click(screen.getByLabelText('noisy frame times'));
    fireEvent.click(screen.getByLabelText('smooth them (PLL)'));
    run(10);
    setRange(range(/^columns per second/, 'smooth'), 100);
    run(5);
    advance(2); // a long pause: the loop starts again from the new time
    fireEvent.click(screen.getByLabelText('smooth them (PLL)'));
    run(5, 0.4);
    act(() => t.setPaused(true));
    run(3);
    act(() => t.setPaused(false));
    act(() => t.setSignal('whistle'));
    run(5);
  });
});

describe('Pitch', () => {
  it('toggles the window, the tilt and the bands, and checks the scaling', () => {
    mount();
    showAll();
    run(2);
    const [canvas] = canvasAfter('pitch');
    expect(callsOf(canvas, 'fillText').some((c) => /through a Hann window/.test(String(c.args[0])))).toBe(true);
    fireEvent.click(screen.getByLabelText('Hann window'));
    run(1);
    expect(callsOf(canvas, 'fillText').some((c) => /cut off square/.test(String(c.args[0])))).toBe(true);
    setRange(range(/^tilt/), 6);
    expect(screen.getByText('6 dB/oct')).toBeTruthy();
    setRange(range(/^bands/), 12);
    run(1);
    expect(screen.getByText(/should read 0.354/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check the scaling' }));
    expect(document.querySelector('#pitch .rvo-readout')!.textContent).toMatch(/0\.354/);
    expect(document.querySelector('#pitch .rvo-readout')!.textContent).toMatch(/0\.1250/);
  });
});

describe('Ring', () => {
  it('copies cleanly, and retries when the writer laps the reader', () => {
    const { t } = mount();
    showAll();
    const out = () => document.querySelector('#ring .rvo-readout')!.textContent!;
    for (let i = 0; i < 400 && !/copy is whole/.test(out()); i++) run(1, 0.1);
    expect(out()).toMatch(/clean copies: 1/);
    for (let i = 0; i < 100 && !/acquire load/.test(out()); i++) run(1, 0.1);
    fireEvent.click(screen.getByRole('button', { name: 'Lap the reader' }));
    for (let i = 0; i < 100 && !/lapped/.test(out()); i++) run(1, 0.1);
    expect(out()).toMatch(/lapped the copy/);
    expect(out()).toMatch(/retries: 1/);
    for (let i = 0; i < 100 && !/clean copies: 2/.test(out()); i++) run(1, 0.1);
    expect(out()).toMatch(/clean copies: 2/);
    act(() => t.setPaused(true));
    const frozen = out();
    run(5, 0.1);
    expect(out()).toBe(frozen);
  });
});
