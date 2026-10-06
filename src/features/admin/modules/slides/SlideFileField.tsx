import { useState } from 'react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SlideFileType } from '@/types/supabase'
import { uploadSlideFile } from '../../data/slides'
import { Dropzone } from '../../ui/Dropzone'
import { FILE_TYPES, FORMATS } from './shared'

interface Props {
  fileType: SlideFileType
  onFileTypeChange: (t: SlideFileType) => void
  slug: string
  /** Uploaded storage path (empty when none). */
  fileName: string
  onUploaded: (path: string, name: string) => void
  onClear: () => void
  fileError?: string | null
  onBusyChange: (busy: boolean) => void
}

/** Format picker (HTML / PDF) + upload zone (to R2). */
export function SlideFileField(p: Props) {
  const [progress, setProgress] = useState<number | null>(null)
  const fmt = FORMATS[p.fileType]

  const upload = async (file: File) => {
    setProgress(0)
    p.onBusyChange(true)
    try {
      const res = await uploadSlideFile(p.slug || 'untitled', file, (v) => setProgress(Math.round(v * 100)))
      p.onUploaded(res.path, file.name)
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setProgress(null)
      p.onBusyChange(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span id="slide-format-label" className="text-sm font-medium">Format</span>
        <ToggleGroup
          type="single"
          spacing={2}
          value={p.fileType}
          onValueChange={(v) => v && p.onFileTypeChange(v as SlideFileType)}
          aria-labelledby="slide-format-label"
          className="grid w-full grid-cols-2"
        >
          {FILE_TYPES.map((t) => {
            const Icon = FORMATS[t].icon
            return (
              <ToggleGroupItem
                key={t}
                value={t}
                variant="outline"
                className="h-auto flex-col gap-1 py-3 data-[state=on]:border-foreground data-[state=on]:bg-muted"
              >
                <Icon className="size-5" aria-hidden />
                <span className="text-xs font-medium">{FORMATS[t].short}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
          <Dropzone
            key={p.fileType}
            accept={fmt.accept}
            maxMb={fmt.maxMb}
            label={`${fmt.long} file`}
            hint={fmt.hint}
            preview={p.fileName || null}
            previewKind="file"
            onFile={(f) => void upload(f)}
            onClear={p.onClear}
          />
          {progress !== null && (
            <div className="flex items-center gap-3" role="status" aria-live="polite">
              <Progress value={progress} aria-label="Upload progress" className="h-1.5" />
              <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{progress}%</span>
            </div>
          )}
          {p.fileError && <p role="alert" className="text-xs text-destructive">{p.fileError}</p>}
      </div>
    </div>
  )
}
