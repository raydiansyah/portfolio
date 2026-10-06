/**
 * Supabase schema types for the admin dashboard and the public slide portal.
 *
 * 1:1 with the migrations mirrored in `supabase/schema/` (applied to the live
 * `raydiansyah` project on 2026-10-06). Shape follows `supabase gen types` so
 * `createClient<Database>()` gets typed `.from()` calls; regenerate with
 * `supabase gen types typescript --linked > src/types/supabase.ts` after the
 * migration is applied.
 *
 * Storage buckets (see STORAGE_BUCKETS): `avatars`, `branding`, `portfolio-media`,
 * `skill-icons` (public) and `slides` (private, served via signed URLs only).
 */

export type Timestamp = string // ISO 8601 (timestamptz)
export type UUID = string

export type PublishStatus = 'draft' | 'published'
export type SlideFileType = 'html' | 'pdf' | 'ppt'
export type SlideModule = 'materi_kuliah' | 'presentasi_klien' | 'workshop'
export type InboxStatus = 'unread' | 'read' | 'archived'
export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'design' | 'teaching' | 'other'

export interface SocialLinks {
  github?: string
  linkedin?: string
  instagram?: string
  x?: string
  website?: string
}

/** profiles — one row per admin (id = auth.users.id). */
export interface Profile {
  id: UUID
  full_name: string
  headline: string | null
  bio: string | null
  avatar_url: string | null // storage: avatars/{id}/...
  email: string | null
  phone: string | null
  location: string | null
  social_links: SocialLinks
  updated_at: Timestamp
}

/** settings — single row (id = 1). */
export interface Settings {
  id: number
  site_name: string
  logo_url: string | null // storage: branding/logo.*
  favicon_url: string | null
  legal_entity_name: string | null
  legal_entity_type: string | null // e.g. "Perorangan", "CV", "PT"
  legal_registration_number: string | null // NIB / NPWP
  legal_address: string | null
  legal_email: string | null
  terms_md: string | null
  privacy_md: string | null
  updated_at: Timestamp
}

/** portfolios */
export interface Portfolio {
  id: UUID
  slug: string
  title: string
  category: string
  summary: string | null
  description: string | null
  thumbnail_url: string | null // storage: portfolio-media/...
  tech_stack: string[]
  live_url: string | null
  repo_url: string | null
  status: PublishStatus
  featured: boolean
  view_count: number
  order_index: number
  published_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

/** services */
export interface Service {
  id: UUID
  icon: string // lucide icon name
  name: string
  description: string | null
  price_label: string | null // "Mulai Rp 5 jt", "Custom"
  tier: 'basic' | 'pro' | 'enterprise' | null
  is_active: boolean
  order_index: number
  created_at: Timestamp
  updated_at: Timestamp
}

/** inboxes — contact form submissions (insert-only for anon via RLS). */
export interface Inbox {
  id: UUID
  sender_name: string
  sender_email: string
  subject: string
  body: string
  status: InboxStatus
  is_important: boolean
  replied_at: Timestamp | null
  created_at: Timestamp
}

/** skills */
export interface Skill {
  id: UUID
  name: string
  category: SkillCategory
  level: number // 0..100
  icon_url: string | null // storage: skill-icons/...
  order_index: number
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * slides — `access_code` stores a bcrypt hash (pgcrypto `crypt()`), never the
 * plain code. Public clients cannot select this table; they call the
 * `verify_slide_access` RPC which returns metadata + a short-lived signed URL.
 */
export interface Slide {
  id: UUID
  slug: string
  title: string
  description: string | null
  presenter: string | null
  file_type: SlideFileType
  /** Storage path inside the private `slides` bucket, or an external embed URL (Google Slides). */
  file_url: string
  page_count: number | null
  outline: SlideOutlineItem[]
  access_code: string | null
  is_protected: boolean
  module_category: SlideModule
  order_index: number
  allow_download: boolean
  is_active: boolean
  created_at: Timestamp
  updated_at: Timestamp
}

export interface SlideOutlineItem {
  title: string
  page: number
}

/** slide_access_logs — one row per successful access (written by the RPC, not by clients). */
export interface SlideAccessLog {
  id: UUID
  slide_id: UUID
  accessed_at: Timestamp
  ip_hash: string | null // sha256 of IP + daily salt, never the raw IP
  user_agent: string | null
  referrer: string | null
}

/** Result of `rpc('verify_slide_access', { p_slug, p_code })`. */
export interface SlideAccessGrant {
  slide: Omit<Slide, 'access_code'>
  signed_url: string
  expires_in: number // seconds
}

/** Public-safe projection used by the gate before access is granted. */
export type PublicSlideMeta = Pick<Slide, 'slug' | 'title' | 'description' | 'presenter' | 'file_type' | 'is_protected' | 'module_category'>

type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>
type Generated = 'id' | 'created_at' | 'updated_at'

interface TableDef<Row, Ins, Upd = Partial<Ins>> {
  Row: Row
  Insert: Ins
  Update: Upd
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, Insert<Profile, 'updated_at'>>
      settings: TableDef<Settings, Insert<Settings, 'id' | 'updated_at'>>
      portfolios: TableDef<Portfolio, Insert<Portfolio, Generated | 'view_count' | 'published_at'>>
      services: TableDef<Service, Insert<Service, Generated>>
      inboxes: TableDef<Inbox, Insert<Inbox, 'id' | 'created_at' | 'status' | 'is_important' | 'replied_at'>>
      skills: TableDef<Skill, Insert<Skill, Generated>>
      slides: TableDef<Slide, Insert<Slide, Generated | 'page_count' | 'outline'>>
      slide_access_logs: TableDef<SlideAccessLog, Insert<SlideAccessLog, 'id' | 'accessed_at'>>
    }
    Views: Record<string, never>
    Functions: {
      verify_slide_access: { Args: { p_slug: string; p_code: string | null }; Returns: SlideAccessGrant | null }
      get_public_slide: { Args: { p_slug: string }; Returns: PublicSlideMeta | null }
      set_slide_access_code: { Args: { p_slide_id: UUID; p_code: string | null }; Returns: undefined }
    }
    Enums: {
      publish_status: PublishStatus
      slide_file_type: SlideFileType
      slide_module: SlideModule
      inbox_status: InboxStatus
      skill_category: SkillCategory
    }
    CompositeTypes: Record<string, never>
  }
}

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  branding: 'branding',
  portfolioMedia: 'portfolio-media',
  skillIcons: 'skill-icons',
  slides: 'slides', // private
} as const
