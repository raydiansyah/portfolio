/**
 * All portfolio copy lives here so it can be edited without touching the world.
 * Projects marked `featured` become the four buoys around Portfolio Island.
 */

export const PROFILE = {
  name: 'Ray Diansyah',
  role: 'Web Developer · IT Trainer',
  location: 'Surabaya, Indonesia',
  available: true,
  startYear: 2014,
  email: 'raydiansyah@gmail.com',
  links: {
    github: 'https://github.com/raydiansyah',
    linkedin: 'https://www.linkedin.com/in/raydiansyah/',
  },
}

export interface Project {
  id: string
  title: string
  category: string
  year: string
  summary: string
  description: string
  role: string
  stack: string[]
  highlights: string[]
  liveUrl?: string
  repoUrl?: string
  featured: boolean
  /** Two-stop tint used for the generated thumbnail (no stock imagery). */
  tint: [string, string]
}

export const PROJECTS: Project[] = [
  {
    id: 'titikpoin',
    title: 'Titikpoin',
    category: 'Interactive Learning Platform',
    year: '2025',
    summary: 'Gamified learning platform with points, quests and live class tools.',
    description:
      'A learning platform where students earn points for finishing quests, joining live sessions and helping peers. Teachers get a dashboard to build modules, track progress and run quizzes in class.',
    role: 'Lead developer — architecture, frontend, API',
    stack: ['Next.js', 'TypeScript', 'Laravel', 'MySQL', 'Redis'],
    highlights: ['Quest engine with configurable rewards', 'Realtime classroom quiz mode', 'Teacher analytics dashboard'],
    repoUrl: 'https://github.com/raydiansyah',
    featured: true,
    tint: ['#2f4a5a', '#c9a46a'],
  },
  {
    id: 'lsp-tik',
    title: 'LSP TIK',
    category: 'Certification Platform',
    year: '2024',
    summary: 'End-to-end competency certification: registration, assessment, certificates.',
    description:
      'A certification system for an ICT professional certification body. Candidates register and upload evidence, assessors score competency units, and certificates are issued with verifiable QR codes.',
    role: 'Full-stack developer & assessor workflow design',
    stack: ['Laravel', 'Livewire', 'MySQL', 'Tailwind CSS'],
    highlights: ['Assessor scheduling and scoring', 'QR-verified digital certificates', 'Audit trail for every assessment'],
    repoUrl: 'https://github.com/raydiansyah',
    featured: true,
    tint: ['#2c3e50', '#7fa08a'],
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    category: 'Omnichannel Commerce',
    year: '2024',
    summary: 'One stock, many channels — sync orders across marketplaces and a web store.',
    description:
      'An omnichannel commerce back office that keeps stock, pricing and orders in sync across several marketplaces and a branded web store, built from lessons learned running my own online shop.',
    role: 'Product engineer — integrations & inventory',
    stack: ['React', 'Node.js', 'PostgreSQL', 'Queues', 'Docker'],
    highlights: ['Channel-agnostic order pipeline', 'Stock reservation with conflict handling', 'Sales dashboard per channel'],
    repoUrl: 'https://github.com/raydiansyah',
    featured: true,
    tint: ['#3b3a4a', '#d0896a'],
  },
  {
    id: 'saas',
    title: 'SaaS Project',
    category: 'Management Platform',
    year: '2023',
    summary: 'Multi-tenant management platform for teams, billing and reporting.',
    description:
      'A multi-tenant SaaS for small organisations to manage members, schedules and invoices, with role-based access and exportable reports.',
    role: 'Full-stack developer',
    stack: ['Vue', 'Laravel', 'MySQL', 'Stripe'],
    highlights: ['Tenant isolation & RBAC', 'Recurring billing', 'Scheduled PDF reports'],
    repoUrl: 'https://github.com/raydiansyah',
    featured: true,
    tint: ['#24343c', '#9db4c0'],
  },
  {
    id: 'fintrack',
    title: 'FinTrack Mobile',
    category: 'Mobile Application',
    year: '2023',
    summary: 'Personal finance tracker with receipt scanning and auto-categorisation.',
    description: 'A Flutter app that scans receipts with OCR and categorises expenses automatically.',
    role: 'Mobile developer',
    stack: ['Flutter', 'Firebase', 'ML Kit'],
    highlights: ['On-device OCR', 'Spending insights'],
    featured: false,
    tint: ['#30403a', '#a8b88a'],
  },
  {
    id: 'python-module',
    title: 'Corporate Python Module',
    category: 'IT Training',
    year: '2022',
    summary: 'Automation-focused Python curriculum for corporate workshops.',
    description: 'A modular curriculum for corporate Python workshops, focused on automating everyday office work.',
    role: 'Curriculum designer & trainer',
    stack: ['Python', 'Pandas', 'Jupyter'],
    highlights: ['12 hands-on modules', 'Used across several cohorts'],
    featured: false,
    tint: ['#2e3848', '#c7b37a'],
  },
  {
    id: 'mqtt',
    title: 'Smart Home MQTT API',
    category: 'Open Source',
    year: '2021',
    summary: 'Lightweight Go library for MQTT messaging on IoT devices.',
    description: 'A small Go library that wraps MQTT messaging patterns for home-automation devices.',
    role: 'Author',
    stack: ['Go', 'MQTT', 'Docker'],
    highlights: ['Zero-dependency core', 'Typed topic routing'],
    repoUrl: 'https://github.com/raydiansyah',
    featured: false,
    tint: ['#283436', '#8fb0a8'],
  },
]

export const FEATURED_PROJECTS = PROJECTS.filter((p) => p.featured).slice(0, 4)

export const ABOUT = {
  heading: 'Building code, bridging knowledge.',
  paragraphs: [
    'I am a web developer with a strong interest in programming, information security and data. Along the way I have also worked as IT support, practitioner, assessor and admin — roles that taught me to work fast, carefully and with ownership, alone or in a team.',
    'I also sell on online marketplaces, which gives me a practical feel for product optimisation, sales strategy and customer behaviour. That mix of engineering and business sense shapes how I build: technology should serve a real goal.',
    'Teaching is the other half of my work. As an IT trainer I have mentored hundreds of students and professionals. Knowledge grows when it is shared.',
  ],
  facts: [
    { label: 'Based in', value: 'Surabaya, ID' },
    { label: 'Focus', value: 'Full-stack web' },
    { label: 'Also', value: 'Certified IT trainer' },
    { label: 'Languages', value: 'Bahasa Indonesia, English' },
  ],
  stack: ['TypeScript', 'React', 'Next.js', 'Laravel', 'Node.js', 'MySQL', 'PostgreSQL', 'Docker', 'Three.js'],
}

export interface ExperienceItem {
  role: string
  org: string
  period: string
  location: string
  summary: string
  stack: string[]
}

export const EXPERIENCE: ExperienceItem[] = [
  {
    role: 'Web Developer',
    org: 'Freelance & product work',
    period: '2021 — Now',
    location: 'Surabaya / Remote',
    summary:
      'Design and build web platforms end to end — learning, certification and commerce systems — from data model to deployment.',
    stack: ['Next.js', 'Laravel', 'MySQL', 'Docker'],
  },
  {
    role: 'IT Trainer & Assessor',
    org: 'Training institutions & certification bodies',
    period: '2019 — Now',
    location: 'Indonesia',
    summary:
      'Deliver programming and IT curricula for industry and government cohorts, and assess competency for professional certification.',
    stack: ['Curriculum design', 'Python', 'Web fundamentals'],
  },
  {
    role: 'IT Support & Administrator',
    org: 'Institutional IT',
    period: '2014 — 2019',
    location: 'Surabaya',
    summary:
      'Kept systems, networks and users running; built internal tools that replaced spreadsheets with small web apps.',
    stack: ['Networking', 'PHP', 'MySQL'],
  },
]

export interface Service {
  title: string
  summary: string
  deliverables: string[]
}

export const SERVICES: Service[] = [
  {
    title: 'Web platforms',
    summary: 'Product-grade web apps: dashboards, portals, learning and commerce systems.',
    deliverables: ['Architecture & data model', 'Frontend + API', 'Deployment & handover'],
  },
  {
    title: 'Interactive experiences',
    summary: 'Landing pages and storytelling sites with WebGL and motion that still load fast.',
    deliverables: ['Three.js scenes', 'GSAP motion', 'Performance budget'],
  },
  {
    title: 'IT training',
    summary: 'Hands-on workshops and curricula for teams, schools and institutions.',
    deliverables: ['Curriculum design', 'Workshops & bootcamps', 'Assessment'],
  },
  {
    title: 'Technical consulting',
    summary: 'Audits and second opinions on codebases, stacks and delivery process.',
    deliverables: ['Code & architecture review', 'Performance audit', 'Roadmap'],
  },
]
