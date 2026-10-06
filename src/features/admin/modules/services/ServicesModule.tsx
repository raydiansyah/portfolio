import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react'
import { createElement, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Service } from '@/types/supabase'
import { createService, deleteService, listServices, updateService } from '../../data/repo'
import { useAdminStore } from '../../store'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { ServiceDialog, type ServiceValues } from './ServiceDialog'
import { iconFor } from './serviceIcons'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

function ServiceIcon({ name }: { name: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background">
      {createElement(iconFor(name), { className: 'size-4', 'aria-hidden': true })}
    </span>
  )
}

export default function ServicesModule() {
  const { data, error, reload, setData } = useResource(listServices)
  const [dialog, setDialog] = useState<{ open: boolean; target: Service | null; key: number }>({ open: false, target: null, key: 0 })

  const openDialog = (target: Service | null) => setDialog((d) => ({ open: true, target, key: d.key + 1 }))
  const patchLocal = (id: string, patch: Partial<Service>) => setData((rows) => rows?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? rows)

  const toggleActive = async (s: Service, is_active: boolean) => {
    patchLocal(s.id, { is_active }) // optimistic
    try {
      await updateService(s.id, { is_active })
      toast.success(`${s.name} ${is_active ? 'activated' : 'deactivated'}`)
    } catch (e) {
      patchLocal(s.id, { is_active: !is_active })
      toast.error(errMsg(e))
    }
  }

  const submit = async (values: ServiceValues) => {
    try {
      if (dialog.target) {
        const row = await updateService(dialog.target.id, values)
        patchLocal(row.id, row)
        toast.success('Service updated')
      } else {
        const order_index = (data ?? []).reduce((m, s) => Math.max(m, s.order_index + 1), 0)
        const row = await createService({ ...values, order_index })
        setData((rows) => [...(rows ?? []), row])
        toast.success('Service created')
        void useAdminStore.getState().refresh()
      }
      setDialog((d) => ({ ...d, open: false }))
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const remove = async (s: Service) => {
    try {
      await deleteService(s.id)
      setData((rows) => rows?.filter((r) => r.id !== s.id) ?? rows)
      toast.success(`Deleted ${s.name}`)
      void useAdminStore.getState().refresh()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const actions = (s: Service) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => openDialog(s)}>
        <Pencil aria-hidden />
      </Button>
      <ConfirmDelete title={`Delete “${s.name}”?`} onConfirm={() => void remove(s)}>
        <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} className="hover:text-destructive">
          <Trash2 aria-hidden />
        </Button>
      </ConfirmDelete>
    </div>
  )

  const statusSwitch = (s: Service) => (
    <Switch checked={s.is_active} onCheckedChange={(v) => void toggleActive(s, v)} aria-label={`${s.name} active`} />
  )

  const tier = (s: Service) => s.tier && <Badge variant="outline" className="capitalize">{s.tier}</Badge>

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Content"
        title="Layanan"
        description="Services offered on the public site. Inactive services stay hidden."
        actions={<Button onClick={() => openDialog(null)}><Plus aria-hidden />New service</Button>}
      />

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 p-4 text-sm">
          <span>Could not load services: {error.message}</span>
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </div>
      ) : !data ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading services">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No services yet"
          description="Add what you offer so visitors know how to work with you."
          action={<Button onClick={() => openDialog(null)}><Plus aria-hidden />New service</Button>}
        />
      ) : (
        <>
          <div className="hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14"><span className="sr-only">Icon</span></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price / Tier</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id} className={s.is_active ? undefined : 'text-muted-foreground'}>
                    <TableCell><ServiceIcon name={s.icon} /></TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="max-w-sm"><p className="line-clamp-2 whitespace-normal text-muted-foreground">{s.description ?? '—'}</p></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="tabular-nums">{s.price_label ?? '—'}</span>
                        {tier(s)}
                      </div>
                    </TableCell>
                    <TableCell>{statusSwitch(s)}</TableCell>
                    <TableCell>{actions(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {data.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <ServiceIcon name={s.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{s.description ?? 'No description'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular-nums">{s.price_label ?? '—'}</span>
                  {tier(s)}
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    {statusSwitch(s)}
                    <span aria-hidden>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </label>
                  {actions(s)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ServiceDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        service={dialog.target}
        onSubmit={submit}
      />
    </div>
  )
}
