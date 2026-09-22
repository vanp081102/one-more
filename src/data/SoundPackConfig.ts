export interface SoundPackDef {
  id: string
  label: string
  /** Frequency scale for release tones */
  pitchMul: number
  /** Waveform bias for accent hits */
  wave: OscillatorType
  /** Bed layer volume scale */
  bedMul: number
}

export const soundPacks: Record<string, SoundPackDef> = {
  default: {
    id: 'default',
    label: 'DEFAULT',
    pitchMul: 1,
    wave: 'sine',
    bedMul: 1,
  },
  crystal: {
    id: 'crystal',
    label: 'CRYSTAL',
    pitchMul: 1.25,
    wave: 'triangle',
    bedMul: 0.85,
  },
  soft: {
    id: 'soft',
    label: 'SOFT',
    pitchMul: 0.85,
    wave: 'sine',
    bedMul: 0.7,
  },
  punch: {
    id: 'punch',
    label: 'PUNCH',
    pitchMul: 0.95,
    wave: 'square',
    bedMul: 1.1,
  },
}

export const defaultSoundPackId = 'default'
