import { useId } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Settings } from '@/types/supabase'
import { SaveBar } from './SaveBar'
import { useSettingsSection } from './useSettingsSection'

const KEYS = ['legal_entity_name', 'legal_entity_type', 'legal_registration_number', 'legal_address', 'legal_email'] as const
const ENTITY_TYPES = ['Perorangan', 'CV', 'PT', 'Yayasan']

export function LegalTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const id = useId()
  const { draft, set, pristine, saving, save, reset } = useSettingsSection(settings, KEYS, onSaved)
  const emailError = draft.legal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.legal_email) ? 'Enter a valid email address.' : null
  const text = (k: (typeof KEYS)[number]) => ({
    id: `${id}-${k}`,
    value: draft[k] ?? '',
    onChange: (e: { target: { value: string } }) => set(k, e.target.value.trim() ? e.target.value : null),
  })

  return (
    <form
      className="grid max-w-2xl gap-6 sm:grid-cols-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (emailError) return toast.error(emailError)
        void save('Legal details')
      }}
    >
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${id}-legal_entity_name`}>Legal entity name</Label>
        <Input {...text('legal_entity_name')} placeholder="e.g. PT Abati Digital Nusantara" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-type`}>Entity type</Label>
        <Select value={draft.legal_entity_type ?? undefined} onValueChange={(v) => set('legal_entity_type', v)}>
          <SelectTrigger id={`${id}-type`} className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-legal_registration_number`}>Registration no. (NIB / NPWP)</Label>
        <Input {...text('legal_registration_number')} inputMode="numeric" className="font-mono" />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${id}-legal_address`}>Registered address</Label>
        <Textarea {...text('legal_address')} rows={3} />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${id}-legal_email`}>Legal contact email</Label>
        <Input
          {...text('legal_email')}
          type="email"
          aria-invalid={!!emailError || undefined}
          aria-describedby={emailError ? `${id}-email-err` : undefined}
        />
        {emailError && <p id={`${id}-email-err`} className="text-xs text-destructive">{emailError}</p>}
      </div>
      <div className="sm:col-span-2">
        <SaveBar pristine={pristine} saving={saving} onReset={reset} label="Legal" />
      </div>
    </form>
  )
}
