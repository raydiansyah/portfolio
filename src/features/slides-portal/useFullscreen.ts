import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Fullscreen API bound to one element. State is synced from
 * `fullscreenchange`, so Esc (handled natively by the browser) stays in sync.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false)
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled

  useEffect(() => {
    const sync = () => setActive(!!ref.current && document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [ref])

  const enter = useCallback(async () => {
    if (!supported || document.fullscreenElement) return
    try {
      await ref.current?.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      /* denied (e.g. not triggered by a user gesture) */
    }
  }, [ref, supported])

  const exit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
  }, [])

  const toggle = useCallback(() => (document.fullscreenElement ? exit() : enter()), [enter, exit])

  return { active, supported, enter, exit, toggle }
}
