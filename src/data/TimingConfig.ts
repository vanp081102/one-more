export interface TimingConfig {
  /** Absolute delta below this = ULTRA */
  ultraMs: number
  perfectMs: number
  greatMs: number
  goodMs: number
  /** Ignore releases shorter than this (accidental taps) */
  minHoldMs: number
}

export const defaultTimingConfig: TimingConfig = {
  ultraMs: 15,
  perfectMs: 40,
  greatMs: 80,
  goodMs: 120,
  minHoldMs: 50,
}
