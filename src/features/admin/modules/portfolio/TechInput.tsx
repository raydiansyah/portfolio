import { X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'

/** Chip input: Enter or comma commits a tag, Backspace on an empty field removes the last one. */
export function TechInput({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const next = raw.split(',').map((s) => s.trim()).filter(Boolean)
    const merged = [...value]
    for (const t of next) if (!merged.some((m) => m.toLowerCase() === t.toLowerCase())) merged.push(t)
    if (merged.length !== value.length) onChange(merged)
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
      {value.map((t) => (
        <Badge key={t} variant="secondary" className="gap-1 pr-1 font-normal">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== t))}
            aria-label={`Remove ${t}`}
            className="grid size-4 place-items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => (e.target.value.includes(',') ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length ? '' : 'React, TypeScript…'}
        aria-describedby={`${id}-hint`}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <span id={`${id}-hint`} className="sr-only">Press Enter or comma to add. Backspace removes the last item.</span>
    </div>
  )
}
