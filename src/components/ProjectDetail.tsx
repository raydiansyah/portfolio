import { useState } from 'react'

type Language = 'EN' | 'ID'

export interface ProjectDetailData {
    id: number
    category: string
    year: string
    title: string
    descriptionEN: string
    descriptionID: string
    challengeEN: string
    challengeID: string
    solutionEN: string
    solutionID: string
    featuresEN: string[]
    featuresID: string[]
    technologies: { name: string; icon?: string }[]
    mainImage: string
    thumbnails: string[]
    role: string
    timeline: string
    liveUrl?: string
    repoUrl?: string
    relatedProjects: {
        id: number
        title: string
        descriptionEN: string
        image: string
        tags: string[]
    }[]
}

interface ProjectDetailProps {
    project: ProjectDetailData
    isOpen: boolean
    onClose: () => void
}

export default function ProjectDetail({ project, isOpen, onClose }: ProjectDetailProps) {
    const [language, setLanguage] = useState<Language>('EN')

    if (!isOpen) return null

    const content = {
        challenge: language === 'EN' ? project.challengeEN : project.challengeID,
        solution: language === 'EN' ? project.solutionEN : project.solutionID,
        features: language === 'EN' ? project.featuresEN : project.featuresID,
        description: language === 'EN' ? project.descriptionEN : project.descriptionID,
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative min-h-screen bg-background-light dark:bg-background-dark">
                {/* Navbar */}
                <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm">
                    <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary">
                                <span className="material-symbols-outlined">terminal</span>
                            </div>
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">DevPortfolio</h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                <span className="hidden md:inline">Back to Projects</span>
                            </button>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold">
                                <span
                                    className={`cursor-pointer ${language === 'EN' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
                                    onClick={() => setLanguage('EN')}
                                >
                                    EN
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">/</span>
                                <span
                                    className={`cursor-pointer ${language === 'ID' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
                                    onClick={() => setLanguage('ID')}
                                >
                                    ID
                                </span>
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Left Column: Content & Details */}
                        <div className="lg:col-span-7 flex flex-col gap-8">
                            {/* Header Section */}
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap gap-3">
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide border border-primary/20">
                                        {project.category}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                        {project.year}
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                                    {project.title}
                                </h1>
                                <p className="text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                                    {content.description}
                                </p>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-slate-200 dark:border-slate-800">
                                <div className="flex gap-8">
                                    <button
                                        onClick={() => setLanguage('EN')}
                                        className={`flex flex-col items-center border-b-2 pb-3 px-1 transition-colors ${language === 'EN'
                                                ? 'border-primary text-slate-900 dark:text-white'
                                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        <span className="text-sm font-bold tracking-wide">English</span>
                                    </button>
                                    <button
                                        onClick={() => setLanguage('ID')}
                                        className={`flex flex-col items-center border-b-2 pb-3 px-1 transition-colors ${language === 'ID'
                                                ? 'border-primary text-slate-900 dark:text-white'
                                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        <span className="text-sm font-bold tracking-wide">Bahasa Indonesia</span>
                                    </button>
                                </div>
                            </div>

                            {/* Description Content */}
                            <div className="flex flex-col gap-8 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                    <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">flag</span>
                                        {language === 'EN' ? 'The Challenge' : 'Tantangan'}
                                    </h3>
                                    <p className="mb-6">{content.challenge}</p>

                                    <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">lightbulb</span>
                                        {language === 'EN' ? 'The Solution' : 'Solusi'}
                                    </h3>
                                    <p className="mb-6">{content.solution}</p>

                                    <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">monitoring</span>
                                        {language === 'EN' ? 'Key Features' : 'Fitur Utama'}
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-2 text-slate-500 dark:text-slate-400">
                                        {content.features.map((feature, index) => (
                                            <li key={index}>{feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Tech Stack */}
                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                <h3 className="text-slate-400 dark:text-slate-500 text-sm font-bold uppercase tracking-wider mb-4">
                                    {language === 'EN' ? 'Technologies Used' : 'Teknologi yang Digunakan'}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.technologies.map((tech, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors cursor-default"
                                        >
                                            {tech.icon && (
                                                <img alt={`${tech.name} icon`} className="w-4 h-4" src={tech.icon} />
                                            )}
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{tech.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Visuals & Actions */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            {/* Main Preview Card */}
                            <div className="group relative w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl">
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                    style={{ backgroundImage: `url('${project.mainImage}')` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                            </div>

                            {/* Thumbnails */}
                            {project.thumbnails.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {project.thumbnails.slice(0, 2).map((thumb, index) => (
                                        <div
                                            key={index}
                                            className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-primary transition-colors"
                                        >
                                            <div
                                                className="w-full h-full bg-cover bg-center"
                                                style={{ backgroundImage: `url('${thumb}')` }}
                                            />
                                        </div>
                                    ))}
                                    {project.thumbnails.length > 2 && (
                                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-primary transition-colors flex items-center justify-center relative">
                                            <div
                                                className="w-full h-full bg-cover bg-center opacity-50"
                                                style={{ backgroundImage: `url('${project.thumbnails[2]}')` }}
                                            />
                                            <div className="absolute text-slate-900 dark:text-white font-bold text-sm bg-white/80 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-md">
                                                +{project.thumbnails.length - 2} More
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4 mt-2">
                                <div className="flex flex-col gap-1 mb-2">
                                    <h4 className="text-slate-900 dark:text-white font-bold">Project Links</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {language === 'EN' ? 'Explore the codebase or see it in action.' : 'Jelajahi kode atau lihat secara langsung.'}
                                    </p>
                                </div>
                                {project.liveUrl && (
                                    <a
                                        href={project.liveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 w-full h-12 bg-primary hover:bg-blue-600 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40"
                                    >
                                        <span className="material-symbols-outlined">rocket_launch</span>
                                        <span>View Live Project</span>
                                        <span className="opacity-60 font-normal text-xs ml-auto pr-2 hidden sm:inline-block">/ Lihat Project Live</span>
                                    </a>
                                )}
                                {project.repoUrl && (
                                    <a
                                        href={project.repoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 w-full h-12 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg font-bold transition-all"
                                    >
                                        <span className="material-symbols-outlined">code</span>
                                        <span>View Git Repository</span>
                                        <span className="opacity-60 font-normal text-xs ml-auto pr-2 hidden sm:inline-block">/ Lihat Repositori</span>
                                    </a>
                                )}
                            </div>

                            {/* Project Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase mb-1">Role</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{project.role}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase mb-1">Timeline</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{project.timeline}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Projects Section */}
                    {project.relatedProjects.length > 0 && (
                        <section className="mt-20 pt-12 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
                                {language === 'EN' ? 'Related Projects' : 'Proyek Terkait'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {project.relatedProjects.map((related) => (
                                    <div
                                        key={related.id}
                                        className="group flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all cursor-pointer"
                                    >
                                        <div className="aspect-[16/9] w-full rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                                                style={{ backgroundImage: `url('${related.image}')` }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <h4 className="text-slate-900 dark:text-white font-bold text-lg group-hover:text-primary transition-colors">
                                                {related.title}
                                            </h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                                                {related.descriptionEN}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {related.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="text-xs text-primary bg-primary/10 px-2 py-1 rounded"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                {/* Footer */}
                <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 mt-auto">
                    <div className="max-w-[1200px] mx-auto px-4 md:px-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                        <p>© 2024 DevPortfolio. Built with precision and code.</p>
                    </div>
                </footer>
            </div>
        </div>
    )
}
