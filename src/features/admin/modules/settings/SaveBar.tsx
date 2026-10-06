import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Footer row shared by settings tabs: Discard + Save, disabled while pristine. */
export function SaveBar({ pristine, saving, busy, onReset, label }: { pristine: boolean; saving: boolean; busy?: boolean; onReset: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-6">
      <Button type="button" variant="ghost" disabled={pristine || saving} onClick={onReset}>Discard</Button>
      <Button type="submit" disabled={pristine || saving || busy}>
        {saving && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
        {saving ? 'Saving…' : `Save ${label.toLowerCase()}`}
      </Button>
    </div>
  )
}
