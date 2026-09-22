export interface ThemeColors {
  id: string
  label: string
  bg0: string
  bg1: string
  object: string
  targetFill: string
  targetStroke: string
  accent: string
  rail: string
}

export const themes: Record<string, ThemeColors> = {
  default: {
    id: 'default',
    label: 'DEFAULT',
    bg0: '#0b0d12',
    bg1: '#12161f',
    object: '#f2f4f8',
    targetFill: 'rgba(125, 255, 179, 0.12)',
    targetStroke: 'rgba(125, 255, 179, 0.85)',
    accent: '#7dffb3',
    rail: 'rgba(255,255,255,0.08)',
  },
  ember: {
    id: 'ember',
    label: 'EMBER',
    bg0: '#140c0a',
    bg1: '#1c1210',
    object: '#ffe8d6',
    targetFill: 'rgba(255, 140, 80, 0.14)',
    targetStroke: 'rgba(255, 150, 90, 0.9)',
    accent: '#ff8c50',
    rail: 'rgba(255,180,120,0.1)',
  },
  ice: {
    id: 'ice',
    label: 'ICE',
    bg0: '#0a1016',
    bg1: '#101820',
    object: '#e8f4ff',
    targetFill: 'rgba(120, 190, 255, 0.14)',
    targetStroke: 'rgba(140, 200, 255, 0.9)',
    accent: '#7ec8ff',
    rail: 'rgba(140,200,255,0.1)',
  },
  void: {
    id: 'void',
    label: 'VOID',
    bg0: '#050508',
    bg1: '#0c0c12',
    object: '#ffffff',
    targetFill: 'rgba(255,255,255,0.08)',
    targetStroke: 'rgba(255,255,255,0.7)',
    accent: '#ffffff',
    rail: 'rgba(255,255,255,0.06)',
  },
  signal: {
    id: 'signal',
    label: 'SIGNAL',
    bg0: '#0a120e',
    bg1: '#101a14',
    object: '#d8ffe8',
    targetFill: 'rgba(80, 255, 160, 0.12)',
    targetStroke: 'rgba(80, 255, 160, 0.95)',
    accent: '#50ffa0',
    rail: 'rgba(80,255,160,0.1)',
  },
}

export const defaultThemeId = 'default'

/** Override theme accent / target colors with a custom #rrggbb (or #rgb). */
export function withCustomAccent(
  theme: ThemeColors,
  accent: string | null | undefined,
): ThemeColors {
  if (!accent || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)) {
    return theme
  }
  const hex = expandHex(accent)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return {
    ...theme,
    accent: hex,
    targetFill: `rgba(${r}, ${g}, ${b}, 0.14)`,
    targetStroke: `rgba(${r}, ${g}, ${b}, 0.9)`,
  }
}

function expandHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
  }
  return hex.toLowerCase()
}
