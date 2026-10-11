/** The analysis the page and the components run: 16 kHz audio, 125 columns a second. */
export const SR = 16000;
export const CPS = 125;
export const HOP = SR / CPS;
export const FFT_N = 1024;
export const NB = 24;
export const LO_HZ = 80;
export const HI_HZ = 7000;
export const DUR = 8;
export const TAU = Math.PI * 2;
export const FLOOR_L = -60;
export const FLOOR_S = -66;
/** A window of FFT_N samples describes the moment half a window ago; the orb reads the spectrum this many columns later. */
export const SPEC_DELAY = (FFT_N / 2 / SR) * CPS - 0.5;
