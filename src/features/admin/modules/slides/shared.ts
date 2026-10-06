import { FileCode2, FileText, Presentation, type LucideIcon } from 'lucide-react'
import type { SlideFileType, SlideModule } from '@/types/supabase'

export type ModuleFilter = SlideModule | 'all'
export type FormatFilter = SlideFileType | 'all'

export const MODULE_LABELS: Record<SlideModule, string> = {
  materi_kuliah: 'Materi Kuliah',
  presentasi_klien: 'Presentasi Klien',
  workshop: 'Workshop',
}

export const MODULES = Object.keys(MODULE_LABELS) as SlideModule[]

export const FORMATS: Record<SlideFileType, { short: string; long: string; icon: LucideIcon; accept: string; maxMb: number; hint: string }> = {
  html: { short: 'HTML', long: 'HTML Presentation', icon: FileCode2, accept: '.zip,.html', maxMb: 50, hint: 'Bundle (.zip with index.html) or a single .html' },
  pdf: { short: 'PDF', long: 'PDF Document', icon: FileText, accept: '.pdf', maxMb: 50, hint: 'PDF up to 50 MB' },
  ppt: { short: 'PPT', long: 'PPT / PowerPoint', icon: Presentation, accept: '.pptx,.ppt', maxMb: 100, hint: '.pptx or .ppt up to 100 MB' },
}

export const FILE_TYPES = Object.keys(FORMATS) as SlideFileType[]

export const SLUG_RE = /^[a-z0-9-]+$/
export const PIN_RE = /^\d{6}$/
export const CUSTOM_CODE_RE = /^[A-Za-z0-9-]{6,}$/

/** "Materi Kuliah: React 101" -> "materi-kuliah-react-101" */
export function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Rough strength hint for custom access codes (PINs are always "fair": short but rate-limited server-side). */
export function codeStrength(code: string): { label: 'Weak' | 'Fair' | 'Strong'; tone: string } {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /-/].filter((r) => r.test(code)).length
  if (code.length >= 10 && classes >= 3) return { label: 'Strong', tone: 'text-emerald-700 dark:text-emerald-400' }
  if (code.length >= 8 && classes >= 2) return { label: 'Fair', tone: 'text-amber-700 dark:text-amber-400' }
  return { label: 'Weak', tone: 'text-destructive' }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** a11y wiring for an input + its inline error message. */
export function fieldA11y(id: string, error?: string | null) {
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined }
}
