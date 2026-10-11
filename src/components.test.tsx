import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { analyse } from './analysis';
import { SpectrumMap, VoiceOrb } from './components/VoiceOrb';
import { SignalPicker } from './explainer/Bar';
import { callsOf, FakeAudioContext, setVisible, tick } from './test/setup';
import { Transport } from './transport';

const drawn = (c: HTMLCanvasElement) => { setVisible(c); tick(); };

describe('VoiceOrb', () => {
  it('draws 1800 dots by default, and describes itself', () => {
    render(<VoiceOrb transport={new Transport()} />);
    const c = screen.getByRole('img') as HTMLCanvasElement;
    expect(c.getAttribute('aria-label')).toMatch(/orb of dots/);
    drawn(c);
    expect(callsOf(c, 'fill')).toHaveLength(4);
  });
  it('follows the transport when no signal is given, and a named signal when it is', () => {
    const t = new Transport();
    const { rerender } = render(<VoiceOrb transport={t} aria-label="orb" dots={50} />);
    act(() => t.setSignal('hiss'));
    drawn(screen.getByLabelText('orb') as HTMLCanvasElement);
    rerender(<VoiceOrb transport={t} aria-label="orb" signal="hum" dots={50} />);
    drawn(screen.getByLabelText('orb') as HTMLCanvasElement);
  });
  it('accepts your own analysis and options', () => {
    const custom = analyse(new Float32Array(16000));
    render(<VoiceOrb signal={custom} mode="loudness" colorBy="age" wrap={0.5} spin={0} gain={1} history={1} dots={30} className="x" style={{ width: 100 }} transport={new Transport()} />);
    const c = screen.getByRole('img') as HTMLCanvasElement;
    expect(c.className).toBe('x');
    expect(c.style.width).toBe('100px');
    drawn(c);
    expect(callsOf(c, 'arc')).toHaveLength(30);
  });
  it('uses the shared transport by default', () => {
    render(<VoiceOrb dots={10} />);
    drawn(screen.getByRole('img') as HTMLCanvasElement);
  });
});

describe('SpectrumMap', () => {
  it('draws the map for the transport signal or a given one', () => {
    const t = new Transport();
    const { rerender } = render(<SpectrumMap transport={t} />);
    const c = screen.getByRole('img') as HTMLCanvasElement;
    drawn(c);
    expect(callsOf(c, 'fillText').some((x) => x.args[0] === 'now')).toBe(true);
    rerender(<SpectrumMap transport={t} signal="drums" history={1.2} className="m" style={{ height: 50 }} />);
    expect(c.className).toBe('m');
    drawn(c);
    expect(callsOf(c, 'fillText').some((x) => x.args[0] === '1.2 s ago')).toBe(true);
  });
  it('uses the shared transport by default', () => {
    render(<SpectrumMap />);
    drawn(screen.getByRole('img') as HTMLCanvasElement);
  });
});

describe('SignalPicker', () => {
  it('chooses a signal, toggles sound and pauses', () => {
    const t = new Transport();
    render(<SignalPicker transport={t} className="bar2" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hiss' }));
    expect(t.getState().signal).toBe('hiss');
    expect(screen.getByRole('button', { name: 'Hiss' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Sound off' }));
    expect(t.getState().audio).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sound on' }));
    expect(t.getState().audio).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(t.getState().paused).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(t.getState().paused).toBe(false);
  });
  it('says so when audio is not available, and uses the shared transport by default', () => {
    FakeAudioContext.throwOnCreate = true;
    const t = new Transport();
    const { unmount } = render(<SignalPicker transport={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sound off' }));
    expect(screen.getByRole('button', { name: 'No audio here' })).toBeTruthy();
    unmount();
    render(<SignalPicker />);
    expect(screen.getByRole('button', { name: 'Vowels' })).toBeTruthy();
  });
});
