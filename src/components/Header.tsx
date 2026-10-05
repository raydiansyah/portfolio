import { useState } from 'react'

interface HeaderProps {
    isDark: boolean
    toggleTheme: () => void
}

const navLinks = [
    { id: 'home', label: 'Home', labelID: 'Beranda' },
    { id: 'about', label: 'About', labelID: 'Tentang' },
    { id: 'experience', label: 'Experience', labelID: 'Pengalaman' },
    { id: 'portfolio', label: 'Projects', labelID: 'Proyek' },
    { id: 'techstack', label: 'Skills', labelID: 'Keahlian' },
]

export default function Header({ isDark, toggleTheme }: HeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [activeSection, setActiveSection] = useState('home')

    const scrollToSection = (sectionId: string) => {
        setActiveSection(sectionId)
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
        }
        setIsMobileMenuOpen(false)
    }

    return (
        <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-background-dark/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <button
                        onClick={() => scrollToSection('home')}
                        className="flex items-center gap-3 animate-entry"
                    >
                        <img
                            src="/rydsh.png"
                            alt="Ray Diansyah Logo"
                            className="size-10 rounded-xl object-contain"
                        />
                        <div className="text-left">
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight leading-none">Ray Diansyah</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">PORTFOLIO</p>
                        </div>
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-surface-dark/50 p-1 rounded-full border border-slate-200 dark:border-slate-800 animate-entry delay-100">
                        {navLinks.map((link) => (
                            <button
                                key={link.id}
                                onClick={() => scrollToSection(link.id)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeSection === link.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {link.label}
                            </button>
                        ))}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 sm:gap-4 animate-entry delay-100">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle Theme"
                            className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-primary dark:hover:text-yellow-300 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[22px] filled">
                                {isDark ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>

                        {/* Divider */}
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        {/* Language Switcher */}
                        <button className="hidden md:flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-700/60 hover:border-primary/30 dark:hover:border-primary/50 transition-all group shadow-sm">
                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">language</span>
                            <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                                <span>ID</span>
                                <span className="mx-2 text-slate-300 dark:text-slate-600 font-light">|</span>
                                <span className="text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">EN</span>
                            </div>
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden flex items-center justify-center size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <span className="material-symbols-outlined">
                                {isMobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 animate-slideDown">
                    <nav className="px-4 py-4 space-y-2">
                        {navLinks.map((link) => (
                            <button
                                key={link.id}
                                onClick={() => scrollToSection(link.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between ${activeSection === link.id
                                    ? 'bg-primary text-white'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span>{link.label}</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">{link.labelID}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <span className="material-symbols-outlined text-lg">language</span>
                            <span className="text-sm font-medium">ID / EN</span>
                        </button>
                    </div>
                </div>
            )}
        </header>
    )
}
