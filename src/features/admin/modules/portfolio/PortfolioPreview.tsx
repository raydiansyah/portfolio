import { ExternalLink, Eye, FolderGit2, Pencil } from 'lucide-react'
import { CATEGORY_LABELS } from './helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Portfolio } from '@/types/supabase'
import { formatViews } from './helpers'
import { Thumbnail } from './Thumbnail'

const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso)) : '—'

/** Read-only detail drawer for a project. */
export function PortfolioPreview({ item, onClose, onEdit }: { item: Portfolio | null; onClose: () => void; onEdit: (p: Portfolio) => void }) {
  return (
    <Sheet open={item !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        {item && (
          <>
            <SheetHeader className="border-b p-4 pr-12">
              <p className="hud-label text-muted-foreground">{CATEGORY_LABELS[item.category]}</p>
              <SheetTitle className="text-lg">{item.title}</SheetTitle>
              <SheetDescription>/{item.slug}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-5 p-4">
                <Thumbnail item={item} className="rounded-lg border" />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={item.status === 'published' ? 'secondary' : 'outline'}>{item.status === 'published' ? 'Published' : 'Draft'}</Badge>
                  {item.featured && <Badge variant="outline">Featured</Badge>}
                  <span className="inline-flex items-center gap-1"><Eye className="size-3.5" aria-hidden /> {formatViews(item.view_count)} views</span>
                  <span>· Published {fmtDate(item.published_at)}</span>
                </div>
                {item.summary && <p className="text-sm font-medium">{item.summary}</p>}
                {item.description && <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{item.description}</p>}
                {item.tech_stack.length > 0 && (
                  <section>
                    <h3 className="hud-label mb-2 text-muted-foreground">Tech stack</h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {item.tech_stack.map((t) => <li key={t}><Badge variant="outline" className="font-normal">{t}</Badge></li>)}
                    </ul>
                  </section>
                )}
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <dt>Created</dt><dd>{fmtDate(item.created_at)}</dd>
                  <dt>Updated</dt><dd>{fmtDate(item.updated_at)}</dd>
                </dl>
              </div>
            </ScrollArea>
            <SheetFooter className="flex-row flex-wrap border-t p-4">
              {item.live_url && (
                <Button variant="outline" asChild>
                  <a href={item.live_url} target="_blank" rel="noreferrer"><ExternalLink /> Live site</a>
                </Button>
              )}
              {item.repo_url && (
                <Button variant="outline" asChild>
                  <a href={item.repo_url} target="_blank" rel="noreferrer"><FolderGit2 /> Repository</a>
                </Button>
              )}
              <Button className="ml-auto" onClick={() => onEdit(item)}><Pencil /> Edit</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
