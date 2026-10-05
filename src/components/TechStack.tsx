const techItems = [
    {
        icon: 'html',
        color: 'text-orange-600 dark:text-orange-500',
        label: 'Frontend'
    },
    {
        icon: 'code',
        color: 'text-blue-500 dark:text-blue-400',
        label: 'React/Next'
    },
    {
        icon: 'javascript',
        color: 'text-yellow-500 dark:text-yellow-400',
        label: 'JavaScript'
    },
    {
        icon: 'database',
        color: 'text-emerald-500 dark:text-emerald-400',
        label: 'Backend'
    }
]

export default function TechStack() {
    return (
        <div id="techstack" className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/40 backdrop-blur-sm py-12 animate-entry delay-300">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-600 mb-8 uppercase tracking-[0.2em]">
                    Core Tech Stack / Teknologi Utama
                </p>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-90">
                    {techItems.map((item, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center gap-3 group cursor-default"
                        >
                            <div className="p-3 rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800 group-hover:border-primary/30 transition-colors">
                                <span className={`material-symbols-outlined text-3xl ${item.color}`}>
                                    {item.icon}
                                </span>
                            </div>
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
