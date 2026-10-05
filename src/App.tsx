import { useEffect, useState } from 'react'
import HarborSection from '@/features/harbor/HarborSection'

/** Initial theme mirrors the inline script in index.html (stored choice, else OS preference). */
function initialDark() {
  try {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
  } catch {
    /* storage unavailable */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches
}

export default function App() {
  const [isDark, setIsDark] = useState(initialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#11161d' : '#d2dce1')
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {
      /* storage unavailable */
    }
  }, [isDark])

  return <HarborSection isDark={isDark} onToggleTheme={() => setIsDark((d) => !d)} />
}
