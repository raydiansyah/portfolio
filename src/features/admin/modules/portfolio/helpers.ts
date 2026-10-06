import { useEffect, useState } from 'react'
import type { Portfolio, PortfolioCategory, PublishStatus } from '@/types/supabase'

export type SortKey = 'latest' | 'popular' | 'az'
export type StatusFilter = 'all' | PublishStatus

export const SORT_LABELS: Record<SortKey, string> = { latest: 'Terbaru', popular: 'Populer', az: 'A–Z' }
export const SLUG_RE = /^[a-z0-9-]+$/

export function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function initials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : title.slice(0, 2)).toUpperCase()
}

/** Deterministic hue from a string so placeholder tints stay stable between renders. */
export function tintHue(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

export function categoryCounts(rows: Portfolio[]) {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

const dateOf = (p: Portfolio) => p.published_at ?? p.created_at

export interface PortfolioQuery {
  category: string | null
  status: StatusFilter
  search: string
  sort: SortKey
}

export function applyQuery(rows: Portfolio[], q: PortfolioQuery) {
  const needle = q.search.trim().toLowerCase()
  const filtered = rows.filter((p) => {
    if (q.category && p.category !== q.category) return false
    if (q.status !== 'all' && p.status !== q.status) return false
    if (!needle) return true
    const hay = [p.title, p.summary ?? '', ...p.tech_stack].join(' ').toLowerCase()
    return hay.includes(needle)
  })
  const sorted = [...filtered]
  if (q.sort === 'latest') sorted.sort((a, b) => dateOf(b).localeCompare(dateOf(a)))
  else if (q.sort === 'popular') sorted.sort((a, b) => b.view_count - a.view_count)
  else sorted.sort((a, b) => a.title.localeCompare(b.title))
  return sorted
}

/** Returns `value` after it has been stable for `ms`. */
export function useDebounced<T>(value: T, ms = 200) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export const formatViews = (n: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(n)

/** `portofolio.kategori` values (shared with raydiansyah.com). */
export const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  'aplikasi-web': 'Web App',
  website: 'Website',
  'company-profile': 'Company Profile',
}
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as PortfolioCategory[]
