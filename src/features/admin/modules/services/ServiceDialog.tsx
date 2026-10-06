import { Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Service } from '@/types/supabase'
import { SERVICE_ICONS } from './serviceIcons'

export type ServiceValues = Pick<Service, 'icon' | 'name' | 'description' | 'price_label' | 'tier' | 'is_active'>

const EMPTY: ServiceValues = { icon: 'Globe', name: '', description: null, price_label: null, tier: null, is_active: true }
const TIERS = ['basic', 'pro', 'enterprise'] as const
const NO_TIER = 'none'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSubmit: (values: ServiceValues) => Promise<void>
}

/** Create/edit dialog. Mount with a `key` per target so the draft resets between services. */
export function ServiceDialog({ open, onOpenChange, service, onSubmit }: Props) {
  const id = useId()
  const [v, setV] = useState<ServiceValues>(() =>
    service ? { icon: service.icon, name: service.name, description: service.description, price_label: service.price_label, tier: service.tier, is_active: service.is_active } : EMPTY,
  )
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const nameError = touched && !v.name.trim() ? 'Name is required.' : null
  const set = <K extends keyof ServiceValues>(k: K, val: ServiceValues[K]) => setV((p) => ({ ...p, [k]: val }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!v.name.trim()) return
    setSaving(true)
    try {
      await onSubmit({ ...v, name: v.name.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{service ? 'Edit service' : 'New service'}</DialogTitle>
            <DialogDescription>Shown in the Layanan section of the public site.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-icon`}>Icon</Label>
              <Select value={v.icon} onValueChange={(x) => set('icon', x)}>
                <SelectTrigger id={`${id}-icon`} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_ICONS).map(([name, Icon]) => (
                    <SelectItem key={name} value={name}>
                      <Icon aria-hidden />
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-name`}>Name *</Label>
              <Input
                id={`${id}-name`}
                value={v.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={!!nameError || undefined}
                aria-describedby={nameError ? `${id}-name-err` : undefined}
                autoFocus
              />
              {nameError && <p id={`${id}-name-err`} className="text-xs text-destructive">{nameError}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-desc`}>Description</Label>
            <Textarea id={`${id}-desc`} rows={3} value={v.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-price`}>Price label</Label>
              <Input id={`${id}-price`} placeholder="Mulai Rp 5 jt" value={v.price_label ?? ''} onChange={(e) => set('price_label', e.target.value || null)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-tier`}>Tier</Label>
              <Select value={v.tier ?? NO_TIER} onValueChange={(x) => set('tier', x === NO_TIER ? null : (x as ServiceValues['tier']))}>
                <SelectTrigger id={`${id}-tier`} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TIER}>No tier</SelectItem>
                  {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <Label htmlFor={`${id}-active`} className="flex flex-col items-start gap-0.5">
              <span>Active</span>
              <span className="text-xs font-normal text-muted-foreground">Inactive services are hidden from the public site.</span>
            </Label>
            <Switch id={`${id}-active`} checked={v.is_active} onCheckedChange={(x) => set('is_active', x)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
              {service ? 'Save changes' : 'Create service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
