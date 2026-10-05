import { useState, useEffect } from 'react'

type Language = 'EN' | 'ID'

interface ExperienceItem {
    id: number
    icon: string
    iconBgClass: string
    iconColorClass: string
    borderHoverClass: string
    openBorderClass: string
    hoverTextClass: string
    openIconColorClass: string
    title: string
    company: string
    location: string
    period: string
    isCurrent: boolean
    descriptionEN: string
    descriptionID: string
    skills: { name: string; color: string }[]
}

const experiences: ExperienceItem[] = [
    {
        id: 1,
        icon: 'business_center',
        iconBgClass: 'bg-blue-50 dark:bg-blue-900/20',
        iconColorClass: 'text-primary',
        borderHoverClass: 'hover:border-primary/50 dark:hover:border-primary/50',
        openBorderClass: 'data-[open=true]:border-primary dark:data-[open=true]:border-primary/50',
        hoverTextClass: 'group-hover:text-primary',
        openIconColorClass: 'group-data-[open=true]:text-primary',
        title: 'Senior Software Engineer',
        company: 'TechCompany A',
        location: 'Jakarta, ID',
        period: 'Jan 2021 - Present',
        isCurrent: true,
        descriptionEN: 'Spearheaded the migration of a legacy monolithic application to a microservices architecture, improving system scalability by 40%. Mentored a team of 5 junior developers, conducting code reviews and implementing best practices in CI/CD pipelines.',
        descriptionID: 'Memimpin migrasi aplikasi monolitik warisan ke arsitektur layanan mikro, meningkatkan skalabilitas sistem sebesar 40%. Membimbing tim yang terdiri dari 5 pengembang junior, melakukan tinjauan kode dan menerapkan praktik terbaik dalam jalur CI/CD.',
        skills: [
            { name: 'Go', color: '#00ADD8' },
            { name: 'Kubernetes', color: '#326CE5' },
            { name: 'AWS', color: '#FF9900' },
            { name: 'Docker', color: '#3C873A' }
        ]
    },
    {
        id: 2,
        icon: 'school',
        iconBgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
        iconColorClass: 'text-emerald-500',
        borderHoverClass: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/50',
        openBorderClass: 'data-[open=true]:border-emerald-500 dark:data-[open=true]:border-emerald-500/50',
        hoverTextClass: 'group-hover:text-emerald-500',
        openIconColorClass: 'group-data-[open=true]:text-emerald-500',
        title: 'IT Trainer',
        company: 'BootCamp B',
        location: 'Remote',
        period: 'Jun 2019 - Dec 2020',
        isCurrent: false,
        descriptionEN: 'Designed and delivered comprehensive full-stack development curriculum to over 50 students per cohort. Achieved a 95% graduation rate and assisted students in building their capstone projects using modern web technologies.',
        descriptionID: 'Merancang dan menyampaikan kurikulum pengembangan full-stack yang komprehensif kepada lebih dari 50 siswa per kelompok. Mencapai tingkat kelulusan 95% dan membantu siswa membangun proyek akhir mereka.',
        skills: [
            { name: 'React', color: '#61DAFB' },
            { name: 'Node.js', color: '#339933' },
            { name: 'JavaScript', color: '#F7DF1E' }
        ]
    },
    {
        id: 3,
        icon: 'terminal',
        iconBgClass: 'bg-indigo-50 dark:bg-indigo-900/20',
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        borderHoverClass: 'hover:border-indigo-500/50 dark:hover:border-indigo-500/50',
        openBorderClass: 'data-[open=true]:border-indigo-500 dark:data-[open=true]:border-indigo-500/50',
        hoverTextClass: 'group-hover:text-indigo-500',
        openIconColorClass: 'group-data-[open=true]:text-indigo-500',
        title: 'Freelance Developer',
        company: 'Self-Employed',
        location: 'Surabaya, ID',
        period: 'Jan 2018 - May 2019',
        isCurrent: false,
        descriptionEN: 'Developed custom e-commerce solutions for SMEs, integrating payment gateways and inventory management systems. Optimized database queries reducing page load times by 2 seconds on average.',
        descriptionID: 'Mengembangkan solusi e-commerce kustom untuk UKM, mengintegrasikan gateway pembayaran dan sistem inventaris. Mengoptimalkan query database yang mengurangi waktu muat halaman rata-rata 2 detik.',
        skills: [
            { name: 'PHP', color: '#777BB4' },
            { name: 'Laravel', color: '#FF2D20' },
            { name: 'MySQL', color: '#4479A1' }
        ]
    }
]

const content = {
    EN: {
        title: 'Work Experience',
        subtitle: 'My professional journey and career milestones in software engineering.',
        subtitleAlt: 'Pengalaman kerja dan perjalanan karir profesional saya.',
        english: 'English',
        indonesian: 'Bahasa Indonesia',
        langEN: 'English',
        langID: 'Bahasa Indonesia'
    },
    ID: {
        title: 'Pengalaman Kerja',
        subtitle: 'Perjalanan profesional dan pencapaian karir saya dalam rekayasa perangkat lunak.',
        subtitleAlt: 'My professional journey and career milestones in software engineering.',
        english: 'English',
        indonesian: 'Bahasa Indonesia',
        langEN: 'English',
        langID: 'Bahasa Indonesia'
    }
}

export default function Experience() {
    const [language, setLanguage] = useState<Language>('EN')
    const [openItems, setOpenItems] = useState<number[]>([1]) // First item open by default
    const [apiExperiences, setApiExperiences] = useState<ExperienceItem[]>([])
    const t = content[language]

    // Fetch experiences from API
    useEffect(() => {
        async function loadExperiences() {
            try {
                const res = await fetch('http://localhost:3001/api/experiences')
                if (res.ok) {
                    const data = await res.json()
                    const formatted = data.map((e: any, index: number) => ({
                        id: 100 + index,
                        icon: 'work',
                        iconBgClass: 'bg-blue-50 dark:bg-blue-900/20',
                        iconColorClass: 'text-primary',
                        borderHoverClass: 'hover:border-primary/50 dark:hover:border-primary/50',
                        openBorderClass: 'data-[open=true]:border-primary dark:data-[open=true]:border-primary/50',
                        hoverTextClass: 'group-hover:text-primary',
                        openIconColorClass: 'group-data-[open=true]:text-primary',
                        title: e.title,
                        company: e.company,
                        location: e.location || 'Remote',
                        period: e.period || '',
                        isCurrent: e.isCurrent || false,
                        descriptionEN: e.descriptionEN || e.title,
                        descriptionID: e.descriptionID || e.title,
                        skills: e.skills ? e.skills.split(',').map((s: string) => ({ name: s.trim(), color: '#60A5FA' })) : []
                    }))
                    setApiExperiences(formatted)
                }
            } catch (e) {
                console.log('Using static experiences data')
            }
        }
        loadExperiences()
    }, [])

    // Combine API experiences with static experiences
    const allExperiences = [...apiExperiences, ...experiences]

    const toggleItem = (id: number) => {
        setOpenItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        )
    }

    return (
        <section id="experience" className="flex-grow flex flex-col items-center py-16 px-4 md:px-8 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="w-full max-w-4xl flex flex-col gap-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{t.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-xl leading-relaxed">
                            {t.subtitle}
                        </p>
                    </div>

                    {/* Language Toggle */}
                    <div className="flex bg-slate-200 dark:bg-slate-900 p-1.5 rounded-xl border border-transparent dark:border-slate-800">
                        <label className="cursor-pointer relative">
                            <input
                                checked={language === 'EN'}
                                className="peer sr-only"
                                name="exp-lang"
                                type="radio"
                                onChange={() => setLanguage('EN')}
                            />
                            <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 peer-checked:bg-white dark:peer-checked:bg-slate-800 peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm transition-all select-none">
                                English
                            </span>
                        </label>
                        <label className="cursor-pointer relative">
                            <input
                                checked={language === 'ID'}
                                className="peer sr-only"
                                name="exp-lang"
                                type="radio"
                                onChange={() => setLanguage('ID')}
                            />
                            <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 peer-checked:bg-white dark:peer-checked:bg-slate-800 peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm transition-all select-none">
                                Bahasa Indonesia
                            </span>
                        </label>
                    </div>
                </div>

                {/* Experience List */}
                <div className="flex flex-col gap-5">
                    {allExperiences.map(exp => {
                        const isOpen = openItems.includes(exp.id)

                        return (
                            <div
                                key={exp.id}
                                data-open={isOpen}
                                className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm ${exp.borderHoverClass} ${exp.openBorderClass} transition-all duration-300 ${isOpen ? 'shadow-lg' : ''}`}
                            >
                                {/* Summary Header */}
                                <button
                                    onClick={() => toggleItem(exp.id)}
                                    className="w-full flex flex-col md:flex-row md:items-center gap-5 p-6 cursor-pointer select-none outline-none text-left"
                                >
                                    <div className="flex-shrink-0">
                                        <div className={`size-14 rounded-xl ${exp.iconBgClass} flex items-center justify-center ${exp.iconColorClass} border border-current/20`}>
                                            <span className="material-symbols-outlined text-[28px]">{exp.icon}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                        <div>
                                            <h3 className={`text-xl font-bold text-slate-900 dark:text-white ${exp.hoverTextClass} transition-colors`}>
                                                {exp.title}
                                            </h3>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                                {exp.company} • {exp.location}
                                            </p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mt-2 md:mt-0">
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap tracking-wide ${exp.isCurrent
                                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20'
                                                : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                                                }`}>
                                                {exp.period}
                                            </span>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${exp.openIconColorClass}`}>
                                                expand_more
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isOpen && (
                                    <div className="px-6 pb-8 pt-2 ml-0 md:ml-[5.5rem] animate-slideDown">
                                        <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-6">
                                            {/* Single description based on language */}
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                                {language === 'EN' ? exp.descriptionEN : exp.descriptionID}
                                            </p>

                                            {/* Skills */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {exp.skills.map(skill => (
                                                    <div
                                                        key={skill.name}
                                                        className="flex items-center px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                                                    >
                                                        <span
                                                            className="w-2 h-2 rounded-full mr-2"
                                                            style={{
                                                                backgroundColor: skill.color,
                                                                boxShadow: `0 0 6px ${skill.color}`
                                                            }}
                                                        />
                                                        {skill.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
