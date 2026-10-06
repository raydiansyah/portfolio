import { Eye, EyeOff, MoreHorizontal, PanelRightOpen, Pencil, Star, Trash2, Globe } from 'lucide-react'
import { CATEGORY_LABELS } from './helpers'
import { useRef, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Portfolio } from '@/types/supabase'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { formatViews } from './helpers'
import { Thumbnail } from './Thumbnail'

interface Props {
  item: Portfolio
  onEdit: (p: Portfolio) => void
  onPreview: (p: Portfolio) => void
  onTogglePublish: (p: Portfolio) => void
  onDelete: (p: Portfolio) => void
}

const MAX_TECH = 4

function IconAction({ label, onClick, children, destructive }: { label: string; onClick?: () => void; children: ReactNode; destructive?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} className={destructive ? 'text-muted-foreground hover:text-destructive' : 'text-muted-foreground'}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function PortfolioCard({ item, onEdit, onPreview, onTogglePublish, onDelete }: Props) {
  // The desktop delete button owns the ConfirmDelete dialog; the mobile menu reuses it so the
  // alert is not unmounted together with the dropdown content.
  const deleteRef = useRef<HTMLButtonElement>(null)
  const published = item.status === 'published'
  const extra = item.tech_stack.length - MAX_TECH
  const publishLabel = published ? 'Unpublish' : 'Publish'

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors hover:border-foreground/20">
      <button
        type="button"
        onClick={() => onPreview(item)}
        className="relative block outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Preview ${item.title}`}
      >
        <Thumbnail item={item} />
        {item.featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-medium backdrop-blur">
            <Star className="size-3 fill-current" aria-hidden /> Featured
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="hud-label truncate text-muted-foreground">{CATEGORY_LABELS[item.category]}</span>
          <Badge variant={published ? 'secondary' : 'outline'} className={published ? '' : 'text-muted-foreground'}>
            {published ? 'Published' : 'Draft'}
          </Badge>
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight">{item.title}</h3>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{item.summary ?? 'No summary yet.'}</p>
        </div>

        <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
          {item.tech_stack.slice(0, MAX_TECH).map((t) => (
            <li key={t}><Badge variant="outline" className="font-normal">{t}</Badge></li>
          ))}
          {extra > 0 && <li><Badge variant="ghost" className="text-muted-foreground" title={item.tech_stack.slice(MAX_TECH).join(', ')}>+{extra}</Badge></li>}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <Eye className="size-3.5" aria-hidden />
            <span><span className="sr-only">Views: </span>{formatViews(item.view_count)}</span>
          </span>

          <div className="hidden items-center gap-0.5 md:flex">
            <IconAction label={`Edit ${item.title}`} onClick={() => onEdit(item)}><Pencil /></IconAction>
            <IconAction label="Preview" onClick={() => onPreview(item)}><PanelRightOpen /></IconAction>
            <IconAction label={publishLabel} onClick={() => onTogglePublish(item)}>{published ? <EyeOff /> : <Globe />}</IconAction>
            <ConfirmDelete title={`Delete “${item.title}”?`} description="The project and its thumbnail will be removed permanently." onConfirm={() => onDelete(item)}>
              <Button ref={deleteRef} variant="ghost" size="icon-sm" aria-label={`Delete ${item.title}`} className="text-muted-foreground hover:text-destructive">
                <Trash2 />
              </Button>
            </ConfirmDelete>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${item.title}`} className="md:hidden">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onEdit(item)}><Pencil /> Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onPreview(item)}><PanelRightOpen /> Preview</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onTogglePublish(item)}>{published ? <EyeOff /> : <Globe />} {publishLabel}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setTimeout(() => deleteRef.current?.click(), 0)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}
