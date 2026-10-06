import { useState } from 'react'
import { toast } from 'sonner'
import type { Settings } from '@/types/supabase'
import { updateSettings } from '../../data/repo'

/** Local draft for a subset of settings columns; saves only those keys. */
export function useSettingsSection<K extends keyof Settings>(settings: Settings, keys: readonly K[], onSaved: (row: Settings) => void) {
  const pick = (s: Settings) => Object.fromEntries(keys.map((k) => [k, s[k]])) as Pick<Settings, K>
  const [saved, setSaved] = useState(() => pick(settings))
  const [draft, setDraft] = useState(saved)
  const [saving, setSaving] = useState(false)

  const pristine = keys.every((k) => draft[k] === saved[k])
  const set = <F extends K>(k: F, v: Settings[F]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async (label: string) => {
    setSaving(true)
    try {
      const row = await updateSettings(draft)
      const next = pick(row)
      setSaved(next)
      setDraft(next)
      onSaved(row)
      toast.success(`${label} saved`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Could not save ${label.toLowerCase()}`)
    } finally {
      setSaving(false)
    }
  }

  return { draft, set, pristine, saving, save, reset: () => setDraft(saved) }
}
