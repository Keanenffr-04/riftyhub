import type { ThemePref } from './preferences'

export type ResolvedTheme = 'dark' | 'light'

/** Browser toolbar colour (the theme-color meta tag) for each theme. */
export const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#0c0c10', light: '#f6f6fa' }

/** "system" follows the device setting; the other two are fixed. */
export const resolveTheme = (pref: ThemePref, systemPrefersLight: boolean): ResolvedTheme =>
  pref === 'system' ? (systemPrefersLight ? 'light' : 'dark') : pref

export interface ChartPalette {
  accent: string
  axis: string
  grid: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  other: string
  cursor: string
}

/** Charts are drawn by Recharts with plain colour values, so they get their own copy of each theme's colours. */
export const CHART_PALETTES: Record<ResolvedTheme, ChartPalette> = {
  dark: { accent: '#8b5cf6', axis: '#8d8d9c', grid: '#26262f', tooltipBg: '#1a1a22', tooltipBorder: '#34343f', tooltipText: '#ececf2', other: '#4b4b59', cursor: 'rgba(139,92,246,0.08)' },
  light: { accent: '#7c3aed', axis: '#5e5e70', grid: '#e0e0ea', tooltipBg: '#ffffff', tooltipBorder: '#c9c9d8', tooltipText: '#17171f', other: '#9a9aab', cursor: 'rgba(124,58,237,0.08)' },
}
