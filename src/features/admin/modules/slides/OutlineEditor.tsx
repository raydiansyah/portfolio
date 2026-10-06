import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface OutlineRow {
  key: string
  title: string
  page: string
}

/** Optional table of contents: rows of { title, page }. Empty-title rows are dropped on save. */
export function OutlineEditor({ rows, onChange, error }: { rows: OutlineRow[]; onChange: (rows: OutlineRow[]) => void; error?: string | null }) {
  const patch = (key: string, next: Partial<OutlineRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...next } : r)))
  const add = () => {
    const last = Number(rows.at(-1)?.page) || 0
    onChange([...rows, { key: crypto.randomUUID(), title: '', page: String(last + 1) }])
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? 'slide-outline-error' : undefined}>
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
        Outline <span className="text-xs font-normal text-muted-foreground">optional</span>
      </legend>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Add chapters so viewers can jump to a page.</p>}
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-center gap-2">
            <Input
              value={row.title}
              onChange={(e) => patch(row.key, { title: e.target.value })}
              placeholder={`Section ${i + 1}`}
              aria-label={`Outline item ${i + 1} title`}
              className="h-9 flex-1"
            />
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={row.page}
              onChange={(e) => patch(row.key, { page: e.target.value })}
              aria-label={`Outline item ${i + 1} page`}
              className="h-9 w-20 tabular-nums"
            />
            <Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove outline item ${i + 1}`} onClick={() => onChange(rows.filter((r) => r.key !== row.key))}>
              <X aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}>
        <Plus aria-hidden />
        Add section
      </Button>
      {error && <p id="slide-outline-error" role="alert" className="text-xs text-destructive">{error}</p>}
    </fieldset>
  )
}
