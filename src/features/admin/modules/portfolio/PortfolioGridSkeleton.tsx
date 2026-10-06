import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors PortfolioCard dimensions so the grid does not shift when data arrives. */
export function PortfolioGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-16 rounded-full" /></div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-1.5">{[14, 18, 12].map((w) => <Skeleton key={w} className="h-5 rounded-full" style={{ width: `${w * 4}px` }} />)}</div>
            <div className="flex items-center justify-between border-t pt-3"><Skeleton className="h-4 w-12" /><Skeleton className="h-7 w-28" /></div>
          </div>
        </li>
      ))}
    </ul>
  )
}
