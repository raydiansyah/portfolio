import { useState, useEffect } from 'react'
import ProjectDetail from './ProjectDetail'
import type { ProjectDetailData } from './ProjectDetail'

type Category = 'all' | 'web' | 'mobile' | 'training' | 'opensource'

interface Project {
    id: number
    category: Category
    categoryLabel: { en: string; id: string }
    icon: string
    title: string
    descriptionEN: string
    descriptionID: string
    tags: string[]
    image: string
    isPublic: boolean
    primaryAction: {
        icon: string
        labelEN: string
        labelID: string
        href: string
    }
    hasCodeLink: boolean
}

// Project detail data for modal
const projectDetails: Record<number, ProjectDetailData> = {
    1: {
        id: 1,
        category: 'Full Stack Development',
        year: '2023',
        title: 'E-Commerce Analytics',
        descriptionEN: 'A comprehensive platform for tracking real-time sales data and customer metrics designed for modern e-commerce businesses.',
        descriptionID: 'Platform komprehensif untuk melacak data penjualan real-time dan metrik pelanggan yang dirancang untuk bisnis e-commerce modern.',
        challengeEN: 'Traditional analytics systems were too complex and expensive for small to medium e-commerce businesses. They needed a lightweight, real-time solution that could handle high-volume data while providing actionable insights.',
        challengeID: 'Sistem analitik tradisional terlalu kompleks dan mahal untuk bisnis e-commerce kecil dan menengah. Mereka membutuhkan solusi ringan dan real-time yang dapat menangani data volume tinggi sambil memberikan wawasan yang dapat ditindaklanjuti.',
        solutionEN: 'I architected a modular React application backed by a Node.js microservices ecosystem. The system implements aggressive caching strategies and real-time WebSocket updates to ensure smooth performance even during peak traffic periods.',
        solutionID: 'Saya merancang aplikasi React modular yang didukung oleh ekosistem microservices Node.js. Sistem ini mengimplementasikan strategi caching agresif dan update WebSocket real-time untuk memastikan performa lancar bahkan selama periode traffic puncak.',
        featuresEN: [
            'Real-time dashboard with live sales updates',
            'Customer behavior analytics and segmentation',
            'Automated report generation for weekly/monthly summaries',
            'Multi-currency and multi-timezone support'
        ],
        featuresID: [
            'Dashboard real-time dengan update penjualan langsung',
            'Analitik perilaku pelanggan dan segmentasi',
            'Generasi laporan otomatis untuk ringkasan mingguan/bulanan',
            'Dukungan multi-mata uang dan multi-zona waktu'
        ],
        technologies: [
            { name: 'React' },
            { name: 'TypeScript' },
            { name: 'Node.js' },
            { name: 'PostgreSQL' },
            { name: 'Docker' }
        ],
        mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLsMc2oGLdipjqIy7zTb_qSQfbnkG1cpnYc49b8dVAdw3teFzKviuYAC7aINBNDM2k_qIG--BKinuN8NdavvrD_hXqYeO0U1WeXBCfqGO2TXgRr0_R_9dJYG5tx4X6It1_bzdLBK0FDHZkToEQuMHmoCCmBqyMCoTd-0krJr4oZBtFC5IVuk-b4tw7CjbfT8t_gSdpTDbfP6CnK5rhQgNOR148BjBkJnh97kXshpY_bazTr5VgJVGG4U2916Zg5fRiTB18UZsIOwVw',
        thumbnails: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBJqpU6mtg-wS5tuQS3gAEMLjae0UAXeBbgYKi900V-rz_ukykMDMLWMCmIVrBtlJKKTXvDLofS3I4BJb4JeoIHmvmIIVlQxm4S1C7vI1Fa29CMvDNViXkdvofskhzPUnUMemQApaN3VhStM70XYZGYXv4GGoeokGcAc6KayRkd1hteky0H-iuVUnER9Do_FNbDE4m2WbTze9KMjBD1dhG_bKkGB4tUHM9qkdqi6hk_nlWINBJd4sygbawvGUXrBJLPMXmJnt_iNbBC',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDR6BmzIQuA5StFoTT8DzfbTiUTkwsZjqsvrEq1xIWP5MpIkPvYLtzlba-tayORFsJYGEg40usl4kosH2xTvz_Ar8e1SUB4QtYgbgrKnIXETtdBp2v8jU6vmXhz9LSo89OKnV3SJFyYzmSPvU_qAt9qplbi_wK4E0JyXiCU_q6KQck5UXaEZor5Uhj7GeTG-eNLsWaF7YUrheCLpzMDVu9gOz4_ifkGchaxEhupVRy1pzugRIsr2p_mvhYCt84pwVxznIS1vjN62FJU',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBBbwCaODkAbrEjqjuTjM15EOORU2Lt5I47cbXG-RhhWscslpf4ZxIo0kW9bnaokVArjphSH776jiqBvCznGJoe-QDbhC5xKHJ9-Dehm9IX33_9J7yErCjmlJR2RlY28rIBkxmeZZrb16nrI2GKHCuAsYgWC78sdvQoNZLGmcPsObWFejvW_SjWNdnMXUI8dHHjFVGiOxwXWO7NTYAxj_ha11V-umaB4538LdcDs2m0b13isiNbnxpGTDBDdBdGMilbo-c-AcWWD4iY'
        ],
        role: 'Lead Developer',
        timeline: '3 Months',
        liveUrl: '#',
        repoUrl: '#',
        relatedProjects: [
            {
                id: 5,
                title: 'HR Management System',
                descriptionEN: 'Internal employee management system handling payroll and attendance.',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDs996kC8V4j7y7txj61DMoWgztJv63mps96TevJ3L9xyvPl2Qf1_QLCpZ4DNqNKK_sTPntVwJR3pA_PyoYbrJf5POcP1qqmijMtseZQ1aMXIcnZ-MWGr_aizCoC1mZFiNzZDJbQCHOJDA4k5aX3v9Wjfs4vi6xWHfnU1byDkrLdO6G0iw8Dn3iREPYvcKT1NW4g_BTj7GSPrQtkN_RdCB510cJXvHYZVa3ctpWDbCXgFSu0v26_Lqft5DTDNXedpaKNxBk07FM57ur',
                tags: ['Laravel', 'Vue.js']
            },
            {
                id: 6,
                title: 'DevPortfolio v2.0',
                descriptionEN: 'Minimalist portfolio website template for developers.',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBr3DncCmFhbZqHmawKSGDDuLAPW6eP8uJSZKpZUBBV-SE-7DK7dlCV1UzLOS2HtH8i44WG5McmcezvktPpQz546NIIbmgQpPSa-MkE4JcO3Hx3480xe4IVYD9JUc4shoSvKghL0i0DXqZaKLy29kbQN51HltxxUyNSgnaNKlBXxWn_kZJ4npDVBhDsxmYRTmCBhI26Ej33GZcq1QF9z5LJYQZKEpkbFGe0XWSHBZQAuS3CLEEBKoslLDQb2bUDoMGBuWk_HYDCoCxB',
                tags: ['HTML5', 'Tailwind']
            }
        ]
    },
    3: {
        id: 3,
        category: 'Mobile Application',
        year: '2023',
        title: 'FinTrack Mobile',
        descriptionEN: 'Personal finance tracking application with receipt scanning and expense categorization features.',
        descriptionID: 'Aplikasi pelacakan keuangan pribadi dengan fitur pemindaian struk dan kategorisasi pengeluaran.',
        challengeEN: 'Users needed a simple yet powerful way to track their daily expenses without manual data entry. Traditional finance apps were too complex and time-consuming to use consistently.',
        challengeID: 'Pengguna membutuhkan cara sederhana namun powerful untuk melacak pengeluaran harian mereka tanpa entri data manual. Aplikasi keuangan tradisional terlalu kompleks dan memakan waktu untuk digunakan secara konsisten.',
        solutionEN: 'I developed a Flutter-based mobile app with OCR technology for receipt scanning. The app uses machine learning to automatically categorize expenses and provides intuitive visualizations for spending patterns.',
        solutionID: 'Saya mengembangkan aplikasi mobile berbasis Flutter dengan teknologi OCR untuk pemindaian struk. Aplikasi ini menggunakan machine learning untuk mengkategorikan pengeluaran secara otomatis dan menyediakan visualisasi intuitif untuk pola pengeluaran.',
        featuresEN: [
            'OCR-powered receipt scanning',
            'Automatic expense categorization',
            'Monthly budget tracking and alerts',
            'Sync across multiple devices'
        ],
        featuresID: [
            'Pemindaian struk bertenaga OCR',
            'Kategorisasi pengeluaran otomatis',
            'Pelacakan anggaran bulanan dan peringatan',
            'Sinkronisasi di berbagai perangkat'
        ],
        technologies: [
            { name: 'Flutter' },
            { name: 'Firebase' },
            { name: 'Dart' },
            { name: 'ML Kit' }
        ],
        mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAat20WoyAFwk3bkGz3j86KZBPbgVFku-Cmv8eRcW6kbpnJ6fOv2TaTx938yqxwRleTKXyLW0ZjDVEZepifp0Btfyk2Tp16ktZy-7OiIWISyVehbXVvn0PILjSX2sjeVNJUCDZQ8F_A6sH8g4DBXXz9_TKi_0Qx0gfwMyUpC3bAflHI14380g7CNz0bAOjQ6MH4IlISLgN_f6aaAgDhR-cDiHgCTPT774ICCE2MuG7yTN0sI2dcMuyvg6DmTEdaLPgZQqRaODPnRnjq',
        thumbnails: [],
        role: 'Solo Developer',
        timeline: '4 Months',
        liveUrl: '#',
        repoUrl: '#',
        relatedProjects: []
    },
    4: {
        id: 4,
        category: 'Open Source',
        year: '2022',
        title: 'Smart Home MQTT API',
        descriptionEN: 'Lightweight Go library for handling MQTT messaging in IoT devices.',
        descriptionID: 'Pustaka Go ringan untuk menangani pesan MQTT pada perangkat IoT.',
        challengeEN: 'Existing MQTT libraries were either too heavy for embedded devices or lacked modern Go idioms and proper error handling.',
        challengeID: 'Library MQTT yang ada terlalu berat untuk perangkat embedded atau kurang idiom Go modern dan penanganan error yang baik.',
        solutionEN: 'I created a minimalist Go library focused on performance and developer experience. The library uses goroutines efficiently and provides a clean API for common IoT messaging patterns.',
        solutionID: 'Saya membuat library Go minimalis yang fokus pada performa dan pengalaman developer. Library ini menggunakan goroutine secara efisien dan menyediakan API bersih untuk pola messaging IoT umum.',
        featuresEN: [
            'Zero-dependency core library',
            'Automatic reconnection handling',
            'QoS level 0, 1, and 2 support',
            'Comprehensive test coverage'
        ],
        featuresID: [
            'Library inti tanpa dependensi',
            'Penanganan reconeksi otomatis',
            'Dukungan QoS level 0, 1, dan 2',
            'Cakupan test komprehensif'
        ],
        technologies: [
            { name: 'Go' },
            { name: 'MQTT' },
            { name: 'Docker' }
        ],
        mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjTq2WCO5YNLQCr4HkRp1669wxaaD0d-QHwbOrKxs3-WckN81Jen__RLMHy1LvULOQ9V6OzKJHcsrrhIB-Q1Okm22EIcCpHW_87cfhVeQ03NYZJEe-RBXJUPvmJI_FgHSPRnWJUKaxKAkCivg1ksexg9uhXLjt3Ts3vuafpnEexlgl9EiNcbO7kmnCaQIVUjNhQdx69t9hBJ0feGr9IDZcY0q3Au0S3trqTYDujoBJgnM8yYXdTvlmzchJ2U84OOlbOkN23dvGu6p2',
        thumbnails: [],
        role: 'Creator & Maintainer',
        timeline: 'Ongoing',
        liveUrl: undefined,
        repoUrl: '#',
        relatedProjects: []
    },
    6: {
        id: 6,
        category: 'Web Design',
        year: '2024',
        title: 'DevPortfolio v2.0',
        descriptionEN: 'Minimalist portfolio website template for developers with dark mode and bilingual support.',
        descriptionID: 'Template website portofolio minimalis untuk pengembang dengan mode gelap dan dukungan bilingual.',
        challengeEN: 'Developers needed a clean, professional portfolio template that was easy to customize without diving deep into complex frameworks.',
        challengeID: 'Developer membutuhkan template portofolio yang bersih dan profesional yang mudah dikustomisasi tanpa harus mendalami framework kompleks.',
        solutionEN: 'I designed a responsive portfolio template using vanilla HTML5 and Tailwind CSS. The template includes dark mode toggle, smooth animations, and bilingual content support out of the box.',
        solutionID: 'Saya mendesain template portofolio responsif menggunakan vanilla HTML5 dan Tailwind CSS. Template ini mencakup toggle mode gelap, animasi halus, dan dukungan konten bilingual secara default.',
        featuresEN: [
            'Fully responsive design',
            'Dark/Light mode toggle',
            'Bilingual content support (EN/ID)',
            'Smooth scroll animations'
        ],
        featuresID: [
            'Desain fully responsive',
            'Toggle mode gelap/terang',
            'Dukungan konten bilingual (EN/ID)',
            'Animasi scroll halus'
        ],
        technologies: [
            { name: 'HTML5' },
            { name: 'Tailwind CSS' },
            { name: 'JavaScript' }
        ],
        mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBr3DncCmFhbZqHmawKSGDDuLAPW6eP8uJSZKpZUBBV-SE-7DK7dlCV1UzLOS2HtH8i44WG5McmcezvktPpQz546NIIbmgQpPSa-MkE4JcO3Hx3480xe4IVYD9JUc4shoSvKghL0i0DXqZaKLy29kbQN51HltxxUyNSgnaNKlBXxWn_kZJ4npDVBhDsxmYRTmCBhI26Ej33GZcq1QF9z5LJYQZKEpkbFGe0XWSHBZQAuS3CLEEBKoslLDQb2bUDoMGBuWk_HYDCoCxB',
        thumbnails: [],
        role: 'Designer & Developer',
        timeline: '2 Weeks',
        liveUrl: '#',
        repoUrl: '#',
        relatedProjects: []
    }
}

const projects: Project[] = [
    {
        id: 1,
        category: 'web',
        categoryLabel: { en: 'Web Application', id: 'Aplikasi Web' },
        icon: 'web',
        title: 'E-Commerce Analytics',
        descriptionEN: 'A real-time dashboard for tracking sales data and customer metrics.',
        descriptionID: 'Dashboard real-time untuk melacak data penjualan dan metrik pelanggan.',
        tags: ['React', 'TypeScript', 'Node.js'],
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ0Rj4Daz5K9Wnh5VUExpR580WbhA73UrzGaJWDAI1b4TbVLBQkA3DE839ifxvgwrBEUH2Ol2HaaukcNhg67fxVHd6FgFCIzvjgw84UKl0zTQjU562xr73WZiEKbJ0lBKP1CkuVl88_Iri2rsJ7mrjlHuc3FSPwqo6Uk_iUiJColm6b9-Y8wUBF1UtVw5UsCYiL0LVTXwC96aXPUde5eXcSPvWx4SYciqh78RjT9wXrUTGv9ECF7jHiF8r1E4JBgZR8ZWf7gONVskA',
        isPublic: true,
        primaryAction: { icon: 'visibility', labelEN: 'View', labelID: 'Lihat', href: '#' },
        hasCodeLink: true
    },
    {
        id: 2,
        category: 'training',
        categoryLabel: { en: 'IT Training', id: 'Pelatihan IT' },
        icon: 'school',
        title: 'Corporate Python Module',
        descriptionEN: 'Comprehensive curriculum for corporate Python workshops focusing on automation.',
        descriptionID: 'Kurikulum komprehensif untuk workshop Python korporat yang berfokus pada otomasi.',
        tags: ['Python', 'Pandas', 'Jupyter'],
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCW1alAiJvHYc_Uw5kohghH1JGAIy-wlO4L3M0tfZUrWfJtezCKL_VEp_4LnS8PzH_g4N9qF3gyfA8Rha2gmM6YKUvKJEHLnhf8yLHdpwIjAi4zoHCqm2kmQAnF2mz13gR-zoLWv4TxTtXYlw3i0A-ZojbYmJ-hpoH0twhDo9anSAWFTCI-pRdydag7GxUO_-3cFtqGeY5WaJQ50OBT3NI8JOtnKyVrMsvuSxruSXqVmwWy-ppWqT7d8mGeAGhZag4uUNAKYItFBVJm',
        isPublic: false,
        primaryAction: { icon: 'menu_book', labelEN: 'Syllabus', labelID: 'Silabus', href: '#' },
        hasCodeLink: false
    },
    {
        id: 3,
        category: 'mobile',
        categoryLabel: { en: 'Mobile Application', id: 'Aplikasi Mobile' },
        icon: 'smartphone',
        title: 'FinTrack Mobile',
        descriptionEN: 'Personal finance tracking application with receipt scanning features.',
        descriptionID: 'Aplikasi pelacakan keuangan pribadi dengan fitur pemindaian struk.',
        tags: ['Flutter', 'Firebase', 'Dart'],
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAat20WoyAFwk3bkGz3j86KZBPbgVFku-Cmv8eRcW6kbpnJ6fOv2TaTx938yqxwRleTKXyLW0ZjDVEZepifp0Btfyk2Tp16ktZy-7OiIWISyVehbXVvn0PILjSX2sjeVNJUCDZQ8F_A6sH8g4DBXXz9_TKi_0Qx0gfwMyUpC3bAflHI14380g7CNz0bAOjQ6MH4IlISLgN_f6aaAgDhR-cDiHgCTPT774ICCE2MuG7yTN0sI2dcMuyvg6DmTEdaLPgZQqRaODPnRnjq',
        isPublic: true,
        primaryAction: { icon: 'install_mobile', labelEN: 'Download', labelID: 'Unduh', href: '#' },
        hasCodeLink: true
    },
    {
        id: 4,
        category: 'opensource',
        categoryLabel: { en: 'Open Source', id: 'Open Source' },
        icon: 'terminal',
        title: 'Smart Home MQTT API',
        descriptionEN: 'Lightweight Go library for handling MQTT messaging in IoT devices.',
        descriptionID: 'Pustaka Go ringan untuk menangani pesan MQTT pada perangkat IoT.',
        tags: ['Go', 'MQTT', 'IoT'],
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjTq2WCO5YNLQCr4HkRp1669wxaaD0d-QHwbOrKxs3-WckN81Jen__RLMHy1LvULOQ9V6OzKJHcsrrhIB-Q1Okm22EIcCpHW_87cfhVeQ03NYZJEe-RBXJUPvmJI_FgHSPRnWJUKaxKAkCivg1ksexg9uhXLjt3Ts3vuafpnEexlgl9EiNcbO7kmnCaQIVUjNhQdx69t9hBJ0feGr9IDZcY0q3Au0S3trqTYDujoBJgnM8yYXdTvlmzchJ2U84OOlbOkN23dvGu6p2',
        isPublic: true,
        primaryAction: { icon: 'book', labelEN: 'Docs', labelID: 'Dokumen', href: '#' },
        hasCodeLink: true
    },
    {
        id: 5,
        category: 'web',
        categoryLabel: { en: 'Web Application', id: 'Aplikasi Web' },
        icon: 'business_center',
        title: 'HR Management System',
        descriptionEN: 'Internal employee management system handling payroll and attendance.',
        descriptionID: 'Sistem manajemen karyawan internal yang menangani penggajian dan kehadiran.',
        tags: ['Laravel', 'Vue.js', 'MySQL'],
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDs996kC8V4j7y7txj61DMoWgztJv63mps96TevJ3L9xyvPl2Qf1_QLCpZ4DNqNKK_sTPntVwJR3pA_PyoYbrJf5POcP1qqmijMtseZQ1aMXIcnZ-MWGr_aizCoC1mZFiNzZDJbQCHOJDA4k5aX3v9Wjfs4vi6xWHfnU1byDkrLdO6G0iw8Dn3iREPYvcKT1NW4g_BTj7GSPrQtkN_RdCB510cJXvHYZVa3ctpWDbCXgFSu0v26_Lqft5DTDNXedpaKNxBk07FM57ur',
        isPublic: false,
        primaryAction: { icon: 'info', labelEN: 'Case Study', labelID: 'Studi Kasus', href: '#' },
        hasCodeLink: false
    },
    {
        id: 6,
        category: 'web',
        categoryLabel: { en: 'Design', id: 'Desain' },
        icon: 'design_services',
        title: 'DevPortfolio v2.0',
        descriptionEN: 'Minimalist portfolio website template for developers.',
        descriptionID: 'Template website portofolio minimalis untuk pengembang.',
        tags: ['HTML5', 'Tailwind CSS'],
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBr3DncCmFhbZqHmawKSGDDuLAPW6eP8uJSZKpZUBBV-SE-7DK7dlCV1UzLOS2HtH8i44WG5McmcezvktPpQz546NIIbmgQpPSa-MkE4JcO3Hx3480xe4IVYD9JUc4shoSvKghL0i0DXqZaKLy29kbQN51HltxxUyNSgnaNKlBXxWn_kZJ4npDVBhDsxmYRTmCBhI26Ej33GZcq1QF9z5LJYQZKEpkbFGe0XWSHBZQAuS3CLEEBKoslLDQb2bUDoMGBuWk_HYDCoCxB',
        isPublic: true,
        primaryAction: { icon: 'visibility', labelEN: 'View', labelID: 'Lihat', href: '#' },
        hasCodeLink: true
    }
]

const categories = [
    { key: 'all' as Category, labelEN: 'All', labelID: 'Semua' },
    { key: 'web' as Category, labelEN: 'Web Development', labelID: 'Pengembangan Web' },
    { key: 'mobile' as Category, labelEN: 'Mobile Apps', labelID: 'Aplikasi Mobile' },
    { key: 'training' as Category, labelEN: 'IT Training', labelID: 'Pelatihan IT' },
    { key: 'opensource' as Category, labelEN: 'Open Source', labelID: 'Open Source' }
]

export default function Projects() {
    const [activeCategory, setActiveCategory] = useState<Category>('all')
    const [visibleCount, setVisibleCount] = useState(6)
    const [selectedProject, setSelectedProject] = useState<ProjectDetailData | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [apiProjects, setApiProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch projects from API on mount
    useEffect(() => {
        async function loadProjects() {
            try {
                const res = await fetch('http://localhost:3001/api/projects')
                if (res.ok) {
                    const data = await res.json()
                    // Convert API projects to our format
                    const formatted = data.map((p: any, index: number) => ({
                        id: 100 + index,
                        category: (p.category?.toLowerCase() || 'web') as Category,
                        categoryLabel: { en: p.category || 'Web', id: p.category || 'Web' },
                        icon: 'folder',
                        title: p.title,
                        descriptionEN: p.descriptionEN || p.title,
                        descriptionID: p.descriptionID || p.title,
                        tags: p.tags ? p.tags.split(',').map((t: string) => t.trim()) : ['Project'],
                        image: p.image || 'https://placehold.co/600x400/1e293b/60a5fa?text=' + encodeURIComponent(p.title),
                        isPublic: p.isPublic !== false,
                        primaryAction: { icon: 'visibility', labelEN: 'View', labelID: 'Lihat', href: p.liveUrl || '#' },
                        hasCodeLink: !!p.repoUrl
                    }))
                    setApiProjects(formatted)
                }
            } catch (e) {
                console.log('Using static projects data')
            }
            setLoading(false)
        }
        loadProjects()
    }, [])

    // Combine API projects with static projects
    const allProjects = [...apiProjects, ...projects]

    const filteredProjects = activeCategory === 'all'
        ? allProjects
        : allProjects.filter(p => p.category === activeCategory)

    const displayedProjects = filteredProjects.slice(0, visibleCount)
    const hasMore = visibleCount < filteredProjects.length

    const loadMore = () => {
        setVisibleCount(prev => prev + 6)
    }

    const openProjectDetail = (projectId: number) => {
        const detail = projectDetails[projectId]
        if (detail) {
            setSelectedProject(detail)
            setIsModalOpen(true)
            document.body.style.overflow = 'hidden'
        }
    }

    const closeProjectDetail = () => {
        setIsModalOpen(false)
        setSelectedProject(null)
        document.body.style.overflow = 'auto'
    }

    return (
        <>
            <section id="portfolio" className="flex-1 flex flex-col items-center py-8 md:py-12 px-4 md:px-10 lg:px-20 bg-slate-50 dark:bg-background-dark transition-colors duration-300">
                <div className="w-full max-w-7xl flex flex-col gap-8">
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-extrabold leading-tight tracking-[-0.02em]">
                            Featured Projects
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl">
                            A selection of technical solutions and training modules. <br className="hidden md:block" />
                            <span className="text-slate-400 dark:text-slate-500 text-base italic">Pilihan solusi teknis dan modul pelatihan.</span>
                        </p>
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-3 items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                        {categories.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => {
                                    setActiveCategory(cat.key)
                                    setVisibleCount(6)
                                }}
                                className={`flex h-9 items-center justify-center gap-x-2 rounded-full px-5 transition-all ${activeCategory === cat.key
                                    ? 'bg-primary text-white shadow-sm hover:scale-105 active:scale-95'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary hover:shadow-sm text-slate-600 dark:text-slate-300'
                                    }`}
                            >
                                <span className="text-sm font-medium">{cat.labelEN}</span>
                            </button>
                        ))}
                    </div>

                    {/* Projects Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {displayedProjects.map(project => (
                            <article
                                key={project.id}
                                className="group flex flex-col bg-white dark:bg-[#1a2230] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                            >
                                {/* Image */}
                                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                        style={{ backgroundImage: `url("${project.image}")` }}
                                    />
                                    <div className="absolute top-3 right-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border shadow-sm backdrop-blur-sm ${project.isPublic
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                                            }`}>
                                            {project.isPublic ? 'Public' : 'Private'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex flex-1 flex-col p-5">
                                    {/* Category Badge */}
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[20px]">{project.icon}</span>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            {project.categoryLabel.en}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                                        {project.title}
                                    </h3>

                                    {/* Description */}
                                    <div className="mb-4 flex-1">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                            {project.descriptionEN}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                                            {project.descriptionID}
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {project.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                        <button
                                            onClick={() => openProjectDetail(project.id)}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary text-white text-sm font-bold h-10 hover:bg-blue-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{project.primaryAction.icon}</span>
                                            <span>{project.primaryAction.labelEN} / {project.primaryAction.labelID}</span>
                                        </button>
                                        {project.hasCodeLink ? (
                                            <a
                                                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium h-10 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                href="#"
                                                title="View Repository"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">code</span>
                                            </a>
                                        ) : (
                                            <button
                                                className="flex items-center justify-center gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 text-sm font-medium h-10 px-4 cursor-not-allowed"
                                                disabled
                                                title="Private Repository"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">lock</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={loadMore}
                                className="flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium h-11 px-8 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                            >
                                <span>Load More / Muat Lebih Banyak</span>
                                <span className="material-symbols-outlined text-[18px]">expand_more</span>
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Project Detail Modal */}
            {selectedProject && (
                <ProjectDetail
                    project={selectedProject}
                    isOpen={isModalOpen}
                    onClose={closeProjectDetail}
                />
            )}
        </>
    )
}
