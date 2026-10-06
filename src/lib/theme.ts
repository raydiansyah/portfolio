import { useCallback, useSyncExternalStore } from 'react'

/**
 * App-wide light/dark theme (no next-themes in a Vite SPA). The inline script
 * in index.html applies the stored class before first paint, so there is no
 * flash; this hook only reads/toggles that class and persists the choice.
 */

export type Theme = 'light' | 'dark'

const read = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#11161d' : '#d2dce1')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    /* storage unavailable */
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as Theme)
  const toggle = useCallback(() => setTheme(read() === 'dark' ? 'light' : 'dark'), [])
  return { theme, setTheme, toggle }
}
