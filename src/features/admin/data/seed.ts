import { PROFILE, PROJECTS, SERVICES, ABOUT } from '@/features/harbor/data/content'
import type {
  Inbox, Portfolio, Profile, Service, Settings, Skill, Slide, SlideAccessLog, SkillCategory,
} from '@/types/supabase'

/** Mock seed rows. Content is borrowed from the public harbor so both sides tell the same story. */

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const id = (prefix: string, n: number) => `00000000-0000-4000-8000-${prefix}${String(n).padStart(12 - prefix.length, '0')}`

export const SEED_PROFILE: Profile = {
  id: id('a', 1),
  full_name: PROFILE.name,
  headline: PROFILE.role,
  bio: ABOUT.paragraphs[0],
  avatar_url: null,
  email: PROFILE.email,
  phone: null,
  location: PROFILE.location,
  social_links: { github: PROFILE.links.github, linkedin: PROFILE.links.linkedin },
  updated_at: day(3),
}

export const SEED_SETTINGS: Settings = {
  id: 1,
  site_name: 'Ray Diansyah — Harbor',
  logo_url: null,
  favicon_url: null,
  legal_entity_name: PROFILE.name,
  legal_entity_type: 'Perorangan',
  legal_registration_number: null,
  legal_address: PROFILE.location,
  legal_email: PROFILE.email,
  terms_md: '# Terms & Conditions\n\nPlaceholder — replace with your terms.',
  privacy_md: '# Privacy Policy\n\nPlaceholder — describe what data the contact form collects and how long it is kept.',
  updated_at: day(10),
}

const CATEGORY: Record<string, string> = {
  'Interactive Learning Platform': 'Web',
  'Certification Platform': 'Web',
  'Omnichannel Commerce': 'Web',
  'Management Platform': 'Web',
  'Mobile Application': 'Mobile',
  'IT Training': 'Training',
  'Open Source': 'Open Source',
}

export const SEED_PORTFOLIOS: Portfolio[] = PROJECTS.map((p, i) => ({
  id: id('b', i + 1),
  slug: p.id,
  title: p.title,
  category: CATEGORY[p.category] ?? 'Web',
  summary: p.summary,
  description: p.description,
  thumbnail_url: null,
  tech_stack: p.stack,
  live_url: p.liveUrl ?? null,
  repo_url: p.repoUrl ?? null,
  status: i === 5 ? 'draft' : 'published',
  featured: p.featured,
  view_count: [412, 296, 233, 180, 95, 40, 61][i] ?? 10,
  order_index: i,
  published_at: i === 5 ? null : day(30 + i * 20),
  created_at: day(60 + i * 20),
  updated_at: day(2 + i),
}))

const SERVICE_ICONS = ['Globe', 'Sparkles', 'GraduationCap', 'Compass']
const SERVICE_PRICES = ['Mulai Rp 15 jt', 'Mulai Rp 8 jt', 'Rp 2,5 jt / hari', 'Rp 750 rb / jam']
const SERVICE_TIERS: Service['tier'][] = ['pro', 'pro', 'basic', 'enterprise']

export const SEED_SERVICES: Service[] = SERVICES.map((s, i) => ({
  id: id('c', i + 1),
  icon: SERVICE_ICONS[i],
  name: s.title,
  description: s.summary,
  price_label: SERVICE_PRICES[i],
  tier: SERVICE_TIERS[i],
  is_active: i !== 3,
  order_index: i,
  created_at: day(90),
  updated_at: day(7),
}))

const SKILL_CATEGORY: Record<string, SkillCategory> = {
  TypeScript: 'frontend', React: 'frontend', 'Next.js': 'frontend', 'Three.js': 'frontend',
  Laravel: 'backend', 'Node.js': 'backend', MySQL: 'backend', PostgreSQL: 'backend', Docker: 'devops',
}
const SKILL_LEVEL = [92, 90, 85, 88, 82, 80, 78, 70, 65]

export const SEED_SKILLS: Skill[] = [
  ...ABOUT.stack.map((name, i) => ({
    id: id('d', i + 1),
    name,
    category: SKILL_CATEGORY[name] ?? ('other' as SkillCategory),
    level: SKILL_LEVEL[i] ?? 60,
    icon_url: null,
    order_index: i,
    created_at: day(120),
    updated_at: day(12),
  })),
  { id: id('d', 50), name: 'Curriculum Design', category: 'teaching', level: 90, icon_url: null, order_index: 50, created_at: day(120), updated_at: day(12) },
  { id: id('d', 51), name: 'Figma', category: 'design', level: 68, icon_url: null, order_index: 51, created_at: day(120), updated_at: day(12) },
]

export const SEED_INBOX: Inbox[] = [
  { id: id('e', 1), sender_name: 'Nadia Putri', sender_email: 'nadia@example.com', subject: 'Workshop React untuk tim internal', body: 'Halo Mas Ray,\n\nKami tertarik mengadakan workshop React 2 hari untuk 15 developer. Apakah ada slot bulan depan?\n\nSalam,\nNadia', status: 'unread', is_important: true, replied_at: null, created_at: day(0.2) },
  { id: id('e', 2), sender_name: 'Budi Santoso', sender_email: 'budi@example.com', subject: 'Penawaran pembuatan LMS', body: 'Kami butuh LMS sederhana untuk 300 siswa. Bisa kirim estimasi biaya dan waktu?', status: 'unread', is_important: false, replied_at: null, created_at: day(1) },
  { id: id('e', 3), sender_name: 'Clara Wijaya', sender_email: 'clara@example.com', subject: 'Terima kasih untuk sesi kemarin', body: 'Materinya sangat jelas. Boleh minta akses slide lagi? Kodenya hilang.', status: 'read', is_important: false, replied_at: day(2), created_at: day(3) },
  { id: id('e', 4), sender_name: 'Rizky Pratama', sender_email: 'rizky@example.com', subject: 'Kolaborasi open source', body: 'Saya lihat library MQTT Anda. Tertarik kolaborasi untuk dukungan MQTT v5?', status: 'read', is_important: true, replied_at: null, created_at: day(6) },
  { id: id('e', 5), sender_name: 'Promo Bot', sender_email: 'noreply@example.com', subject: 'Diskon hosting 70%', body: 'Penawaran terbatas!', status: 'archived', is_important: false, replied_at: null, created_at: day(12) },
]

/**
 * Mock slides. Plain access codes live only in `MOCK_SLIDE_CODES` to imitate
 * the server-side check; the `access_code` column holds a fake hash marker.
 */
export const MOCK_SLIDE_CODES: Record<string, string> = { 'react-fundamentals': '482913', 'proposal-lms-sekolah': 'KLIEN-2026' }

export const SEED_SLIDES: Slide[] = [
  {
    id: id('f', 1), slug: 'react-fundamentals', title: 'React Fundamentals', description: 'Komponen, state, dan effect — pertemuan 3.',
    presenter: PROFILE.name, file_type: 'html', file_url: '/demo-slides/react-fundamentals/index.html', page_count: 6,
    outline: [{ title: 'Pembuka', page: 1 }, { title: 'Komponen', page: 2 }, { title: 'State', page: 4 }, { title: 'Penutup', page: 6 }],
    access_code: '$2a$mock$hash', is_protected: true, module_category: 'materi_kuliah', order_index: 0, allow_download: false, is_active: true,
    created_at: day(20), updated_at: day(1),
  },
  {
    id: id('f', 2), slug: 'workshop-web-performance', title: 'Workshop Web Performance', description: 'Core Web Vitals dan cara mengukurnya.',
    presenter: PROFILE.name, file_type: 'pdf', file_url: '/demo-slides/web-performance.pdf', page_count: 5,
    outline: [{ title: 'Kenapa performa', page: 1 }, { title: 'LCP', page: 2 }, { title: 'CLS', page: 3 }, { title: 'INP', page: 4 }, { title: 'Checklist', page: 5 }],
    access_code: null, is_protected: false, module_category: 'workshop', order_index: 1, allow_download: true, is_active: true,
    created_at: day(15), updated_at: day(4),
  },
  {
    id: id('f', 3), slug: 'proposal-lms-sekolah', title: 'Proposal LMS Sekolah', description: 'Ruang lingkup, timeline, dan biaya.',
    presenter: PROFILE.name, file_type: 'ppt',
    // External embeds must be publicly reachable; Office Web Viewer cannot read localhost files.
    file_url: 'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fexample.com%2Fproposal-lms.pptx',
    page_count: null, outline: [], access_code: '$2a$mock$hash', is_protected: true, module_category: 'presentasi_klien', order_index: 2,
    allow_download: false, is_active: true, created_at: day(8), updated_at: day(8),
  },
]

export const SEED_ACCESS_LOGS: SlideAccessLog[] = Array.from({ length: 37 }, (_, i) => ({
  id: id('g', i + 1),
  slide_id: SEED_SLIDES[i % 3].id,
  accessed_at: day(i * 0.4),
  ip_hash: null,
  user_agent: i % 2 ? 'Mobile Safari' : 'Chrome Desktop',
  referrer: null,
}))
