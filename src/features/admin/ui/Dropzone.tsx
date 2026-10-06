import { FileUp, ImageIcon, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** Comma-separated accept list, e.g. "image/*" or ".pdf,.pptx,.zip". */
  accept: string
  /** Max size in MB. */
  maxMb: number
  label: string
  hint?: string
  /** Current preview URL (image) or file name. */
  preview?: string | null
  previewKind?: 'image' | 'file'
  onFile: (file: File) => void
  onClear?: () => void
  className?: string
  /** Fixed preview box height keeps layout stable (CLS 0). */
  aspect?: 'square' | 'wide'
}

/** Drag-and-drop / click-to-pick upload zone with validation and a fixed-size preview. */
export function Dropzone({ accept, maxMb, label, hint, preview, previewKind = 'image', onFile, onClear, className, aspect = 'wide' }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accepts = (file: File) => {
    const rules = accept.split(',').map((r) => r.trim().toLowerCase())
    const name = file.name.toLowerCase()
    return rules.some((r) => (r.endsWith('/*') ? file.type.startsWith(r.slice(0, -1)) : r.startsWith('.') ? name.endsWith(r) : file.type === r))
  }

  const take = (file?: File | null) => {
    if (!file) return
    if (!accepts(file)) return setError(`Unsupported file type. Allowed: ${accept}`)
    if (file.size > maxMb * 1024 * 1024) return setError(`File is larger than ${maxMb} MB.`)
    setError(null)
    onFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files?.[0])
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="hud-label text-muted-foreground">{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex items-center gap-4 rounded-lg border border-dashed p-4 transition-colors',
          over ? 'border-ring bg-accent/50' : 'hover:bg-accent/30',
        )}
      >
        <div className={cn('grid shrink-0 place-items-center overflow-hidden rounded-md border bg-muted', aspect === 'square' ? 'size-16' : 'h-16 w-28')}>
          {preview && previewKind === 'image' ? (
            <img src={preview} alt="" className="size-full object-cover" width={112} height={64} />
          ) : preview ? (
            <FileUp className="size-5 text-muted-foreground" aria-hidden />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <button type="button" onClick={() => input.current?.click()} className="font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {preview ? 'Replace file' : 'Choose a file'}
          </button>
          <span className="text-muted-foreground"> or drag it here</span>
          <p className="truncate text-xs text-muted-foreground">{preview && previewKind === 'file' ? preview : hint ?? `Max ${maxMb} MB`}</p>
        </div>
        {preview && onClear && (
          <button type="button" onClick={onClear} aria-label="Remove file" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        )}
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            take(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
