import { Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Slide } from '@/types/supabase'
import { FORMATS } from '../slides/shared'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Slides not in this module (null while loading). */
  candidates: Slide[] | null
  /** Module titles by id, to warn when a slide moves out of another module. */
  moduleTitles: Record<string, string>
  onAdd: (ids: string[]) => Promise<void>
}

/** Pick existing slides to file under the current module. */
export function AddSlidesDialog({ open, onOpenChange, candidates, moduleTitles, onAdd }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
        {open && <Picker candidates={candidates} moduleTitles={moduleTitles} onAdd={onAdd} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Picker({ candidates, moduleTitles, onAdd, onCancel }: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (candidates ?? []).filter((s) => !q || s.title.toLowerCase().includes(q) || s.slug.includes(q))
  }, [candidates, query])

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async () => {
    setSaving(true)
    try {
      await onAdd([...picked])
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add slides</DialogTitle>
        <DialogDescription>Selected decks are appended to the end of this module.</DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search slides" aria-label="Search slides" className="pl-9" />
      </div>

      <ul className="-mx-1 min-h-40 flex-1 overflow-y-auto px-1" aria-label="Available slides">
        {candidates === null &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="py-1.5"><Skeleton className="h-12 w-full" /></li>
          ))}
        {candidates !== null && rows.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            {candidates.length === 0 ? 'Every slide is already in this module.' : 'No slides match your search.'}
          </li>
        )}
        {rows.map((s) => {
          const fmt = FORMATS[s.file_type]
          const from = s.module_id ? moduleTitles[s.module_id] : null
          return (
            <li key={s.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <Checkbox checked={picked.has(s.id)} onCheckedChange={() => toggle(s.id)} aria-label={`Select ${s.title}`} />
                <fmt.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">{s.title}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">/{s.slug}</span>
                </span>
                {from && <Badge variant="outline" className="shrink-0 font-normal">moves from {from}</Badge>}
              </label>
            </li>
          )
        })}
      </ul>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={picked.size === 0 || saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          Add {picked.size || ''} {picked.size === 1 ? 'slide' : 'slides'}
        </Button>
      </DialogFooter>
    </>
  )
}
