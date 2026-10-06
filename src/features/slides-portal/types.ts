import type { SlideAccessGrant, SlideModule } from '@/types/supabase'

/** Contract between the Viewer shell and the lazy format-specific viewers. */
export interface FormatViewerProps {
  grant: SlideAccessGrant
  /** Current slide, 1-based. */
  page: number
  /** Report the real page count once known (null = unknown, nav hidden). */
  onPageCount: (count: number | null) => void
  /** Deck-driven navigation (e.g. arrow keys inside an iframe). 1-based. */
  onPageChange: (page: number) => void
  presentation: boolean
  onTogglePresentation: () => void
}

export const MODULE_LABEL: Record<SlideModule, string> = {
  materi_kuliah: 'Course material',
  presentasi_klien: 'Client presentation',
  workshop: 'Workshop',
}

/** Highest page referenced by the outline — fallback count for decks without the postMessage protocol. */
export const outlinePages = (grant: SlideAccessGrant) =>
  grant.slide.page_count ?? Math.max(1, ...grant.slide.outline.map((o) => o.page))

/** Presenter zoom range (stage scale). */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 3
export const ZOOM_STEP = 0.25
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z / ZOOM_STEP) * ZOOM_STEP))
