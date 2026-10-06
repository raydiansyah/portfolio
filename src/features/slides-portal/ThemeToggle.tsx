import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} className={className}>
      <Sun className={cn('hidden', theme === 'dark' && 'block')} aria-hidden />
      <Moon className={cn('hidden', theme === 'light' && 'block')} aria-hidden />
    </Button>
  )
}
