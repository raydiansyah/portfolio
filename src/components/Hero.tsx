export default function Hero() {
    return (
        <section id="home" className="relative w-full py-20 md:py-32 lg:py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-grid-slate">
            {/* Background Blurs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/10 dark:bg-primary/5 blur-3xl -z-10 pointer-events-none rounded-full"></div>
            <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-secondary/10 dark:bg-emerald-500/5 blur-3xl -z-10 pointer-events-none rounded-full"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-background-dark pointer-events-none"></div>

            {/* Content */}
            <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-8 relative z-10 animate-entry">
                {/* Available Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/80 dark:bg-surface-dark/80 border border-slate-200 dark:border-emerald-500/20 backdrop-blur-md shadow-sm hover:border-emerald-500/40 transition-colors cursor-default">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                    </span>
                    <span className="text-slate-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">Available for work</span>
                </div>

                {/* Main Content */}
                <div className="flex flex-col gap-6 w-full">
                    <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium tracking-tight">
                        Halo, Saya
                    </p>
                    <h1 className="text-slate-900 dark:text-white text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] drop-shadow-sm">
                        Ray Diansyah
                    </h1>
                    <h2 className="text-2xl sm:text-3xl text-slate-600 dark:text-slate-300 font-semibold tracking-tight">
                        Web Developer <span className="text-slate-300 dark:text-slate-600 mx-2">|</span>
                        <span className="text-secondary dark:text-emerald-400">IT Trainer</span>
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mt-2">
                        Saya adalah seorang web developer yang memiliki pengalaman dalam pengembangan aplikasi web. Saya juga memiliki pengalaman dalam pengajaran IT di sektor industri dan instansi.
                        <br className="hidden sm:block mb-1" />
                        <span className="italic text-slate-500 dark:text-slate-500 block mt-3 text-sm md:text-base font-medium">
                            Membangun solusi terukur dengan inovasi dan memberdayakan generasi pengembang berikutnya melalui pendampingan.
                        </span>
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-6 w-full animate-entry delay-100">
                    <button className="relative overflow-hidden group bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-8 py-4 font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto">
                        <div className="flex items-center justify-center gap-3 relative z-10">
                            <span>Contact Me / Hubungi Saya</span>
                            <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </button>

                    {/* Social Links */}
                    <div className="flex items-center gap-4">
                        <a
                            aria-label="LinkedIn"
                            className="flex items-center justify-center size-12 rounded-full bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 group shadow-sm"
                            href="https://www.linkedin.com/in/raydiansyah/"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </a>
                        <a
                            aria-label="GitHub"
                            className="flex items-center justify-center size-12 rounded-full bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:text-primary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 group shadow-sm"
                            href="https://github.com/raydiansyah"
                        >
                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform text-[24px]">terminal</span>
                        </a>
                        <a
                            aria-label="Email"
                            className="flex items-center justify-center size-12 rounded-full bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:text-primary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 group shadow-sm"
                            href="mailto:raydiansyah@gmail.com"
                        >
                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform text-[24px]">mail</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
