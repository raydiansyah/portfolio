import { Bold, Code, Heading2, Italic, Link2, List, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

type Render = (md: string) => string

// Loaded once, only when a Preview is first opened — keeps marked/dompurify out of the module chunk.
let renderer: Promise<Render> | null = null
function loadRenderer() {
  renderer ??= Promise.all([import('marked'), import('dompurify')]).then(([{ marked }, { default: purify }]) =>
    (md: string) => purify.sanitize(marked.parse(md, { async: false, gfm: true, breaks: true })),
  )
  return renderer
}

interface Action {
  label: string
  icon: LucideIcon
  /** Wrap the selection (before/after) or prefix each selected line. */
  apply: (sel: string) => { text: string; select?: [number, number] }
}

const wrap = (before: string, after: string, fallback: string): Action['apply'] => (sel) => {
  const inner = sel || fallback
  return { text: `${before}${inner}${after}`, select: [before.length, before.length + inner.length] }
}
const prefix = (p: string, fallback: string): Action['apply'] => (sel) => {
  const text = (sel || fallback).split('\n').map((l) => `${p}${l}`).join('\n')
  return { text, select: [p.length, text.length] }
}

const ACTIONS: Action[] = [
  { label: 'Bold', icon: Bold, apply: wrap('**', '**', 'bold text') },
  { label: 'Italic', icon: Italic, apply: wrap('_', '_', 'italic text') },
  { label: 'Heading', icon: Heading2, apply: prefix('## ', 'Heading') },
  { label: 'Bulleted list', icon: List, apply: prefix('- ', 'List item') },
  {
    label: 'Link',
    icon: Link2,
    apply: (sel) => {
      const label = sel || 'link text'
      return { text: `[${label}](https://)`, select: [label.length + 3, label.length + 11] }
    },
  },
  { label: 'Code', icon: Code, apply: (sel) => (sel.includes('\n') ? wrap('```\n', '\n```', '')(sel) : wrap('`', '`', 'code')(sel)) },
]

const PREVIEW_CLS = cn(
  'h-80 overflow-auto rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed',
  '[&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold',
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_a]:text-lantern [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]',
  '[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
)

/** Lightweight Markdown editor: toolbar inserts syntax at the cursor; Preview renders sanitized HTML. */
export function MarkdownEditor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  const area = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [render, setRender] = useState<Render | null>(null)

  useEffect(() => {
    if (mode !== 'preview' || render) return
    let alive = true
    void loadRenderer().then((fn) => alive && setRender(() => fn))
    return () => {
      alive = false
    }
  }, [mode, render])

  const run = (action: Action) => {
    const el = area.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end } = el
    const { text, select } = action.apply(value.slice(start, end))
    onChange(value.slice(0, start) + text + value.slice(end))
    // Restore focus/selection after React commits the new value.
    requestAnimationFrame(() => {
      el.focus()
      if (select) el.setSelectionRange(start + select[0], start + select[1])
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={mode}
          onValueChange={(v) => v && setMode(v as 'write' | 'preview')}
          aria-label={`${label} editor mode`}
        >
          <ToggleGroupItem value="write">Write</ToggleGroupItem>
          <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === 'write' ? (
        <>
          <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-1">
            {ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => run(a)}
                aria-label={a.label}
                title={a.label}
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a.icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>
          <textarea
            id={id}
            ref={area}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck
            className="h-80 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </>
      ) : (
        <>
          {/* Keeps the toolbar row height so switching modes does not shift layout. */}
          <p className="flex h-8 items-center text-xs text-muted-foreground">Preview — rendered as visitors will see it.</p>
          {render ? (
            value.trim() ? (
              <div className={PREVIEW_CLS} dangerouslySetInnerHTML={{ __html: render(value) }} />
            ) : (
              <div className={cn(PREVIEW_CLS, 'text-muted-foreground')}>Nothing to preview yet.</div>
            )
          ) : (
            <div className="flex h-80 flex-col gap-3 rounded-lg border p-4" aria-busy="true" aria-label="Loading preview">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
