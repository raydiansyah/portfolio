import type { Settings } from '@/types/supabase'
import { MarkdownEditor } from './MarkdownEditor'
import { SaveBar } from './SaveBar'
import { useSettingsSection } from './useSettingsSection'

const KEYS = ['terms_md', 'privacy_md'] as const

export function PoliciesTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { draft, set, pristine, saving, save, reset } = useSettingsSection(settings, KEYS, onSaved)
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault()
        void save('Terms & Privacy')
      }}
    >
      <div className="grid gap-8 xl:grid-cols-2">
        <MarkdownEditor label="Terms of Service" value={draft.terms_md ?? ''} onChange={(v) => set('terms_md', v || null)} />
        <MarkdownEditor label="Privacy Policy" value={draft.privacy_md ?? ''} onChange={(v) => set('privacy_md', v || null)} />
      </div>
      <SaveBar pristine={pristine} saving={saving} onReset={reset} label="Policies" />
    </form>
  )
}
