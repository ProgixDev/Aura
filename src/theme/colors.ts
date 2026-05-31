/**
 * Aura palette — extracted from the prototype CSS variables.
 * Sky, violet, sage, gold, pearl, mist, ink. Aurora gradient is the soul.
 */
export const colors = {
  sky: '#A8C8E8',
  sky2: '#86B0DA',
  violet: '#C4B0E8',
  violet2: '#A48BD8',
  sage: '#B8D4C2',
  sage2: '#8FBFA3',
  gold: '#E4C896',

  pearl: '#FBF9F6',
  mist: '#F3EFEA',
  line: '#ECE6DE',

  ink: '#2D2540',
  inkSoft: '#3D3650',
  muted: '#7B7290',

  white: '#FFFFFF',
  black: '#000000',

  // Tonal chip backgrounds
  chipSky: '#E1ECF7',
  chipSkyText: '#3D6394',
  chipViolet: '#EBE2F7',
  chipVioletText: '#6B4EA8',
  chipSage: '#DEEAE2',
  chipSageText: '#3F7556',
  chipGold: '#F4ECD9',
  chipGoldText: '#8A6A36',

  // Functional
  success: '#3F7556',
  warning: '#8A6A36',
  danger: '#B85C5C',

  // Translucent overlays
  inkAlpha06: 'rgba(45,37,64,0.06)',
  inkAlpha10: 'rgba(45,37,64,0.10)',
  inkAlpha85: 'rgba(45,37,64,0.85)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
  whiteAlpha85: 'rgba(255,255,255,0.85)',
  whiteAlpha92: 'rgba(255,255,255,0.92)',
} as const;

/**
 * Dark, moody aurora — deep ink → midnight violet → muted teal-sage.
 * Used as the new default hero / featured / confirmation background.
 * The previous pastel pairings are kept under *Light suffixes for
 * the few surfaces (e.g. educational teasers) that still want soft.
 */
export const auroraGradient = ['#1B1730', '#3B2A5C', '#264A56'] as const;
export const auroraGradientDeep = ['#0F0B1F', '#2A1F4A', '#1B3640'] as const;
export const auroraWarm = ['#3A2A1E', '#5A3F6E'] as const;
export const auroraSoft = ['#2A2440', '#1F3340'] as const;

// Light pastel variants — retained for soft tertiary surfaces.
export const auroraLight = ['#BBD4EE', '#CBB6EC', '#B6D6C2'] as const;
export const auroraSoftLight = ['#EBE2F7', '#DEEAE2'] as const;

export type ColorToken = keyof typeof colors;
