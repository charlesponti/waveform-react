import { describe, expect, it } from 'vitest';
import * as api from './index';

describe('public API', () => {
  it('exports exactly what the README documents', () => {
    expect(Object.keys(api).sort()).toEqual([
      'CPS', 'DUR', 'FFT_N', 'HI_HZ', 'LO_HZ', 'NB', 'OrbExplainer', 'SIGNALS', 'SIGNAL_ORDER', 'SR', 'SignalPicker', 'SpectrumMap',
      'Transport', 'VoiceOrb', 'analyse', 'analyseFrame', 'analysisFor', 'bandsFor', 'columns', 'defaultTransport', 'useTransport',
    ]);
  });
});
