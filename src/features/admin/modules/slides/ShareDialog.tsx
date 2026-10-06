import { Check, Copy, Download, Lock, MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Slide } from '@/types/supabase'
import { getModule } from '../../data/modules'
import { shareUrl } from '../../data/slides'
import { copyText } from './shared'

interface Props {
  slide: Slide | null
  onClose: () => void
}

export function ShareDialog({ slide, onClose }: Props) {
  return (
    <Dialog open={slide !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {slide && <ShareBody key={slide.id} slide={slide} />}
      </DialogContent>
    </Dialog>
  )
}

/** The access code belongs to the slide's module; it is loaded when the dialog opens. */
type CodeState = { value: string; expires: string | null } | null

function ShareBody({ slide }: { slide: Slide }) {
  const url = shareUrl(slide.slug)
  const [qr, setQr] = useState<string | null>(null)
  const [code, setCode] = useState<CodeState>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  // qrcode (~25 kB) is only fetched once a share dialog is actually opened.
  useEffect(() => {
    let alive = true
    import('qrcode')
      .then((mod) => {
        const api = (mod as unknown as { default?: typeof mod }).default ?? mod
        return api.toDataURL(url, { margin: 1, width: 240 })
      })
      .then((data) => alive && setQr(data))
      .catch(() => alive && toast.error('Could not generate the QR code.'))
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!slide.is_protected || !slide.module_id) return
    let alive = true
    getModule(slide.module_id)
      .then((m) => alive && m?.access_code && setCode({ value: m.access_code, expires: m.access_expires_at }))
      .catch(() => alive && toast.error('Could not load the access code.'))
    return () => {
      alive = false
    }
  }, [slide.is_protected, slide.module_id])

  const copy = async (text: string, what: string) => {
    if (!(await copyText(text))) return toast.error('Clipboard is unavailable. Select the text and copy it manually.')
    setCopied(what)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 2000)
  }

  const invitation = () =>
    [`You're invited to view “${slide.title}”.`, '', `Link: ${url}`, code ? `Access code: ${code.value}` : null, '', 'The code is personal — please don’t forward it.']
      .filter((l) => l !== null)
      .join('\n')

  const fileName = `qr-${slide.slug}.png`

  return (
    <>
      <DialogHeader>
        <DialogTitle>Share “{slide.title}”</DialogTitle>
        <DialogDescription>{slide.is_protected ? 'Viewers need the link and the access code.' : 'Anyone with this link can view the slide.'}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="share-url" className="text-sm font-medium">Shareable link</label>
        <Input id="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border bg-white p-4 dark:bg-white/95">
        <div className="size-[240px] max-w-full">
          {qr ? (
            <img src={qr} alt={`QR code for ${url}`} width={240} height={240} className="size-full" />
          ) : (
            <Skeleton className="size-full rounded-md bg-neutral-200" aria-label="Generating QR code" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <Button type="button" size="lg" onClick={() => void copy(url, 'link')}>
          {copied === 'link' ? <Check aria-hidden /> : <Copy aria-hidden />}
          Copy shareable link
        </Button>
        {qr ? (
          <Button variant="outline" size="lg" asChild>
            <a href={qr} download={fileName}>
              <Download aria-hidden />
              Download QR
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="lg" disabled>
            <Download aria-hidden />
            Download QR
          </Button>
        )}
      </div>

      {slide.is_protected && (
        <section className="flex flex-col gap-2 rounded-lg border p-3" aria-labelledby="share-code-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="share-code-heading" className="flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-4 text-muted-foreground" aria-hidden />
              Access code
            </h3>
          </div>
          {code ? (
            <>
              <div className="flex items-center gap-2">
                <output className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-lg tracking-[0.2em] tabular-nums" aria-label="Access code">
                  {code.value}
                </output>
                <Button type="button" variant="outline" size="icon-lg" onClick={() => void copy(code.value, 'code')} aria-label="Copy access code">
                  {copied === 'code' ? <Check aria-hidden /> : <Copy aria-hidden />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Shared by every slide in this module{code.expires ? ` · valid until ${new Date(code.expires).toLocaleDateString()}` : ''}. Change it in Modules.
              </p>
              <Button type="button" variant="secondary" className="self-start" onClick={() => void copy(invitation(), 'invitation')}>
                {copied === 'invitation' ? <Check aria-hidden /> : <MessageSquareText aria-hidden />}
                Copy invitation
              </Button>
            </>
          ) : (
            <Skeleton className="h-11 rounded-md" aria-label="Loading access code" />
          )}
        </section>
      )}

      <p className="sr-only" aria-live="polite" role="status">
        {copied === 'link' ? 'Link copied' : copied === 'code' ? 'Access code copied' : copied === 'invitation' ? 'Invitation copied' : ''}
      </p>
    </>
  )
}
