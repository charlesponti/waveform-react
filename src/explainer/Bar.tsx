import { useTransport } from '../hooks';
import { SIGNALS, SIGNAL_ORDER } from '../signals';
import { defaultTransport, type Transport } from '../transport';

/** Chips to choose the sound, plus Sound and Pause buttons, for the shared transport. */
export function SignalPicker({ transport = defaultTransport, className }: { transport?: Transport; className?: string }) {
  const s = useTransport(transport);
  return (
    <div className={className ? `rvo-bar ${className}` : 'rvo-bar'}>
      <span className="rvo-brand">Signal</span>
      <div className="rvo-chips" role="group" aria-label="Choose a sound">
        {SIGNAL_ORDER.map((n) => <button key={n} aria-pressed={s.signal === n} onClick={() => transport.setSignal(n)}>{SIGNALS[n].label}</button>)}
      </div>
      <span className="rvo-spacer" />
      <button aria-pressed={s.audio} title="Play the signal through your speakers, and let the audio clock drive the pictures"
        onClick={() => transport.setSound(!s.audio)}>
        {s.unavailable ? 'No audio here' : s.audio ? 'Sound on' : 'Sound off'}
      </button>
      <button aria-pressed={s.paused} onClick={() => transport.setPaused(!s.paused)}>{s.paused ? 'Resume' : 'Pause'}</button>
    </div>
  );
}
