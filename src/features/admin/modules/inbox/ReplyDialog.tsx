import { Loader2, Send } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Inbox } from '@/types/supabase'
import { quoteReply } from './helpers'

interface Props {
  message: Inbox | null
  onClose: () => void
  /** Resolves when sent; rejects to keep the dialog open. */
  onSend: (m: Inbox, body: string) => Promise<void>
}

function ReplyForm({ message, onClose, onSend }: Props & { message: Inbox }) {
  const id = useId()
  const [body, setBody] = useState(() => quoteReply(message))
  const [sending, setSending] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)

  // Caret on the empty line after the greeting rather than after the quoted text.
  useEffect(() => {
    const el = area.current
    if (!el) return
    const pos = el.value.indexOf('\n\n') + 2
    el.setSelectionRange(pos, pos)
    el.scrollTop = 0
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      await onSend(message, body)
    } catch {
      // Error toast is raised by the caller; keep the draft so nothing is lost.
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>Pesan</Label>
        <Textarea
          id={id}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          ref={area}
          className="max-h-[50dvh] min-h-48 font-mono text-[13px] leading-relaxed"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Batal</Button>
        <Button type="submit" disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Kirim balasan
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ReplyDialog({ message, onClose, onSend }: Props) {
  return (
    <Dialog open={message !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Balas pesan</DialogTitle>
          <DialogDescription className="truncate">
            {message ? `Ke ${message.sender_name} <${message.sender_email}> · Re: ${message.subject}` : ''}
          </DialogDescription>
        </DialogHeader>
        {message && <ReplyForm message={message} onClose={onClose} onSend={onSend} />}
      </DialogContent>
    </Dialog>
  )
}
