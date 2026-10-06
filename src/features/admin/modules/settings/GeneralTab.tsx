import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STORAGE_BUCKETS, type Settings } from '@/types/supabase'
import { uploadPublicFile } from '../../data/repo'
import { Dropzone } from '../../ui/Dropzone'
import { SaveBar } from './SaveBar'
import { useSettingsSection } from './useSettingsSection'

const KEYS = ['site_name', 'logo_url', 'favicon_url'] as const

export function GeneralTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const id = useId()
  const { draft, set, pristine, saving, save, reset } = useSettingsSection(settings, KEYS, onSaved)
  const [uploading, setUploading] = useState<'logo_url' | 'favicon_url' | null>(null)
  const nameError = draft.site_name.trim() ? null : 'Site name is required.'

  const upload = async (key: 'logo_url' | 'favicon_url', file: File) => {
    setUploading(key)
    try {
      set(key, await uploadPublicFile(STORAGE_BUCKETS.branding, key === 'logo_url' ? 'logo' : 'favicon', file))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  return (
    <form
      className="flex max-w-2xl flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (nameError) return toast.error(nameError)
        void save('General settings')
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Site name *</Label>
        <Input
          id={`${id}-name`}
          value={draft.site_name}
          onChange={(e) => set('site_name', e.target.value)}
          aria-invalid={!!nameError || undefined}
          aria-describedby={nameError ? `${id}-name-err` : undefined}
        />
        {nameError && <p id={`${id}-name-err`} className="text-xs text-destructive">{nameError}</p>}
      </div>
      <Dropzone
        label="Logo"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        maxMb={2}
        hint={uploading === 'logo_url' ? 'Uploading…' : 'SVG or PNG, transparent background, max 2 MB'}
        preview={draft.logo_url}
        onFile={(f) => void upload('logo_url', f)}
        onClear={() => set('logo_url', null)}
      />
      <Dropzone
        label="Favicon"
        accept="image/png,image/svg+xml,image/x-icon,.ico"
        maxMb={1}
        aspect="square"
        hint={uploading === 'favicon_url' ? 'Uploading…' : 'Square 512×512 PNG/SVG or .ico, max 1 MB'}
        preview={draft.favicon_url}
        onFile={(f) => void upload('favicon_url', f)}
        onClear={() => set('favicon_url', null)}
      />
      <SaveBar pristine={pristine} saving={saving} busy={!!uploading} onReset={reset} label="General" />
    </form>
  )
}
