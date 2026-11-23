import { useCallback, useSyncExternalStore } from 'react'
import { preferencesStore, usePreferences } from './usePreferences'
import { CHART_PALETTES, THEME_COLORS, resolveTheme, type ChartPalette, type ResolvedTheme } from '../utils/theme'

const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : null

const current = (): ResolvedTheme => resolveTheme(preferencesStore.get().theme, !!query?.matches)

// The theme is applied to the page itself as soon as the app loads, and whenever the preference or the device setting changes.
function applyTheme() {
  if (typeof document === 'undefined') return
  const theme = current()
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}
applyTheme()
preferencesStore.subscribe(applyTheme)
query?.addEventListener('change', applyTheme)

function subscribe(listener: () => void) {
  const stop = preferencesStore.subscribe(listener)
  query?.addEventListener('change', listener)
  return () => {
    stop()
    query?.removeEventListener('change', listener)
  }
}

/** The theme actually showing right now ("dark" or "light"), even when the preference is "system". */
export const useResolvedTheme = (): ResolvedTheme => useSyncExternalStore(subscribe, current, current)

export const useChartPalette = (): ChartPalette => CHART_PALETTES[useResolvedTheme()]

/** For the quick switch button: flips between dark and light. */
export function useThemeToggle() {
  const resolved = useResolvedTheme()
  const { update } = usePreferences()
  const next: ResolvedTheme = resolved === 'dark' ? 'light' : 'dark'
  const toggle = useCallback(() => update({ theme: next }), [update, next])
  return { resolved, next, toggle }
}
