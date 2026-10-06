import { Eye, EyeOff, KeyRound, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { generatePin } from '../../data/slides'
import { codeStrength, fieldA11y } from './shared'

export type CodeMode = 'pin' | 'custom'

interface Props {
  mode: CodeMode
  onModeChange: (mode: CodeMode) => void
  code: string
  onCodeChange: (code: string) => void
  /** Editing a slide that already has a hashed code: empty input keeps it. */
  hasExistingCode: boolean
  error?: string | null
}

/** Access-code input for locked slides: generated 6-digit PIN or a custom code. */
export function AccessCodeField({ mode, onModeChange, code, onCodeChange, hasExistingCode, error }: Props) {
  const [visible, setVisible] = useState(mode === 'pin')
  const id = 'slide-access-code'
  const strength = mode === 'custom' && code ? codeStrength(code) : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">Access code</label>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={mode}
          onValueChange={(v) => {
            if (!v) return
            onModeChange(v as CodeMode)
            onCodeChange('')
          }}
          aria-label="Code type"
        >
          <ToggleGroupItem value="pin">6-digit PIN</ToggleGroupItem>
          <ToggleGroupItem value="custom">Custom code</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            {...fieldA11y(id, error)}
            type={visible ? 'text' : 'password'}
            inputMode={mode === 'pin' ? 'numeric' : 'text'}
            autoComplete="off"
            spellCheck={false}
            maxLength={mode === 'pin' ? 6 : 64}
            value={code}
            placeholder={hasExistingCode ? 'Leave empty to keep the current code' : mode === 'pin' ? '000000' : 'min. 6 characters'}
            onChange={(e) => onCodeChange(mode === 'pin' ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^A-Za-z0-9-]/g, ''))}
            className="h-9 pr-10 pl-8 font-mono tracking-wider"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide code' : 'Show code'}
            aria-pressed={visible}
            className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        {mode === 'pin' && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              onCodeChange(generatePin())
              setVisible(true)
            }}
          >
            <Shuffle aria-hidden />
            Generate PIN
          </Button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {strength ? (
            <>Strength: <span className={`font-medium ${strength.tone}`}>{strength.label}</span> · letters, digits and dashes, 6+ characters.</>
          ) : mode === 'pin' ? (
            'Easy to share by voice. Wrong attempts are rate-limited on the server.'
          ) : (
            'Letters, digits and dashes, at least 6 characters. Longer is safer.'
          )}
        </p>
      )}
      {code && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Copy this code now — it is stored hashed and won’t be shown again after saving.
        </p>
      )}
    </div>
  )
}
