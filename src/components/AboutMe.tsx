import { useState } from 'react'

type Language = 'EN' | 'ID'

const content = {
    EN: {
        intro: 'Introduction',
        title: 'About Me',
        professionalFocus: 'Professional Focus',
        developerTrainer: 'Developer & Trainer',
        webDeveloper: 'Web Developer',
        webDesc: 'Building scalable web applications, API architecture, and cloud solutions.',
        itEducation: 'IT Education',
        educationDesc: 'Curriculum design, corporate training, and mentoring next-gen developers.',
        openForWork: 'Open for Work',
        location: 'Surabaya, ID',
        yearsExp: 'Years Exp.',
        projects: 'Projects',
        students: 'Students',
        headingStart: 'Building Code &',
        headingHighlight: 'Bridging Knowledge',
        introParagraph: "Hello! I'm a passionate technologist who thrives at the intersection of complex problem-solving and human connection. I don't just write code; I craft solutions that empower users and businesses alike.",
        paragraph1: 'With over 5 years of experience in full-stack development, I specialize in building scalable web applications using modern technologies like React, Node.js, and Cloud Infrastructure. My approach is user-first, ensuring that every line of code contributes to a seamless digital experience.',
        paragraph2: 'Beyond development, I am deeply committed to education. As a certified IT Trainer, I have had the privilege of mentoring over 1,000 students, helping them navigate the ever-evolving landscape of technology. I believe that knowledge grows when shared, and bridging the gap between technical complexity and human understanding is my ultimate goal.',
        fullStackDev: 'Full Stack Developer',
        certifiedTrainer: 'Certified IT Trainer',
        bilingual: 'Bilingual (EN/ID)',
        downloadCV: 'Download CV',
        viewPortfolio: 'View Portfolio',
    },
    ID: {
        intro: 'Perkenalan',
        title: 'Tentang Saya',
        professionalFocus: 'Fokus Profesional',
        developerTrainer: 'Developer & Trainer',
        webDeveloper: 'Web Developer',
        webDesc: 'Membangun aplikasi web skalabel, arsitektur API, dan solusi cloud.',
        itEducation: 'Pendidikan IT',
        educationDesc: 'Desain kurikulum, pelatihan korporat, dan membimbing pengembang generasi berikutnya.',
        openForWork: 'Tersedia untuk Bekerja',
        location: 'Surabaya, ID',
        yearsExp: 'Tahun Pengalaman',
        projects: 'Proyek',
        students: 'Siswa',
        headingStart: 'Membangun Kode &',
        headingHighlight: 'Menjembatani Pengetahuan',
        introParagraph: 'Halo! Saya adalah seorang Web Developer yang memiliki minat besar di dunia IT, terutama dalam pemrograman, keamanan informasi, dan data science. Selama perjalanan karier saya, saya juga berpengalaman sebagai IT Support, Praktisi, Asesor, dan Admin. Pengalaman ini mengasah kemampuan saya untuk bekerja secara efisien, cepat, dan penuh tanggung jawab, baik secara individu maupun dalam tim.',
        paragraph1: 'Selain itu, saya juga aktif sebagai seller di marketplace, yang memberi saya pemahaman mendalam tentang optimalisasi produk, strategi penjualan, serta perilaku konsumen di platform digital. Kombinasi antara kemampuan teknis dan wawasan bisnis ini memperkuat kemampuan saya dalam menggabungkan solusi digital dengan tujuan komersial yang efektif.',
        paragraph2: 'Saat ini, saya terus mengasah kemampuan teknis dan analitis saya, dengan harapan dapat memberikan kontribusi yang lebih besar di dunia IT. Saya percaya bahwa teknologi bukan hanya alat, tetapi juga jembatan menuju efisiensi, inovasi, dan pertumbuhan. Dengan semangat belajar yang tinggi dan pendekatan yang adaptif, saya siap untuk terus berkembang dan memberikan dampak positif, baik dalam dunia teknologi maupun bisnis digital.',
        fullStackDev: 'Full Stack Developer',
        certifiedTrainer: 'IT Trainer Bersertifikat',
        bilingual: 'Bilingual (EN/ID)',
        downloadCV: 'Unduh CV',
        viewPortfolio: 'Lihat Portfolio',
    }
}

export default function AboutMe() {
    const [language, setLanguage] = useState<Language>('EN')
    const t = content[language]

    // Calculate years of experience from start date
    const startYear = 2014 // Change this to your actual start year
    const currentYear = new Date().getFullYear()
    const yearsOfExperience = currentYear - startYear

    return (
        <section id="about" className="flex-1 flex justify-center py-12 px-4 sm:px-8 lg:px-40 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="flex flex-col max-w-[1100px] flex-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="h-px w-8 bg-primary"></span>
                            <span className="text-primary text-xs font-bold tracking-widest uppercase">{t.intro}</span>
                        </div>
                        <h1 className="text-slate-900 dark:text-white text-3xl sm:text-5xl font-bold leading-tight tracking-[-0.02em]">{t.title}</h1>
                    </div>

                    {/* Language Toggle */}
                    <div className="flex h-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-surface-dark border border-transparent dark:border-slate-700 p-1">
                        <label className={`flex cursor-pointer h-full items-center justify-center rounded-md px-3 text-xs sm:text-sm font-bold transition-all ${language === 'EN' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span>EN</span>
                            <input
                                checked={language === 'EN'}
                                className="invisible w-0 absolute"
                                name="lang"
                                type="radio"
                                value="EN"
                                onChange={() => setLanguage('EN')}
                            />
                        </label>
                        <label className={`flex cursor-pointer h-full items-center justify-center rounded-md px-3 text-xs sm:text-sm font-bold transition-all ${language === 'ID' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span>ID</span>
                            <input
                                checked={language === 'ID'}
                                className="invisible w-0 absolute"
                                name="lang"
                                type="radio"
                                value="ID"
                                onChange={() => setLanguage('ID')}
                            />
                        </label>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    {/* Left Column - Professional Card */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="w-full rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-xl dark:shadow-none min-h-[320px]">
                            {/* Background Blurs */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col gap-8">
                                {/* Header */}
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-surface-dark dark:bg-background-dark border border-slate-700 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-xl">person</span>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-900 dark:text-white font-bold text-lg">{t.professionalFocus}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">{t.developerTrainer}</p>
                                    </div>
                                </div>

                                {/* Focus Areas */}
                                <div className="space-y-6">
                                    <div className="group">
                                        <div className="flex items-center gap-3 mb-1 text-slate-900 dark:text-slate-200 font-semibold group-hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                                            <span>{t.webDeveloper}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                                            {t.webDesc}
                                        </p>
                                    </div>
                                    <div className="group">
                                        <div className="flex items-center gap-3 mb-1 text-slate-900 dark:text-slate-200 font-semibold group-hover:text-emerald-500 transition-colors">
                                            <span className="material-symbols-outlined text-emerald-500 text-[20px]">school</span>
                                            <span>{t.itEducation}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                                            {t.educationDesc}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.openForWork}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                        <span className="material-symbols-outlined text-[14px] text-red-500">location_on</span>
                                        {t.location}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/30 transition-all group">
                                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{yearsOfExperience}+</span>
                                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center font-semibold mt-1">{t.yearsExp}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/30 transition-all group">
                                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">10+</span>
                                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center font-semibold mt-1">{t.projects}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/30 transition-all group">
                                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">100+</span>
                                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center font-semibold mt-1">{t.students}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Content */}
                    <div className="lg:col-span-7 flex flex-col gap-8">
                        <div>
                            <h2 className="text-slate-900 dark:text-white text-2xl sm:text-[32px] font-bold leading-tight tracking-[-0.015em] mb-6">
                                {t.headingStart} <span className="text-primary relative inline-block">
                                    {t.headingHighlight}
                                    <svg className="absolute w-full h-2 bottom-0 left-0 text-primary opacity-20" preserveAspectRatio="none" viewBox="0 0 100 10">
                                        <path d="M0 5 Q 50 10 100 5" fill="none" stroke="currentColor" strokeWidth="8"></path>
                                    </svg>
                                </span>
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-normal leading-relaxed">
                                {t.introParagraph}
                            </p>
                        </div>

                        <div className="flex flex-col gap-5 text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                            <p>{t.paragraph1}</p>
                            <p>{t.paragraph2}</p>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-3 py-2">
                            <div className="flex h-9 items-center justify-center gap-x-2.5 rounded-full bg-primary/10 px-5 border border-primary/20 hover:bg-primary/20 transition-colors cursor-default">
                                <span className="material-symbols-outlined text-primary text-[18px]">code</span>
                                <p className="text-primary text-xs sm:text-sm font-semibold">{t.fullStackDev}</p>
                            </div>
                            <div className="flex h-9 items-center justify-center gap-x-2.5 rounded-full bg-emerald-500/10 px-5 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-default">
                                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">school</span>
                                <p className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold">{t.certifiedTrainer}</p>
                            </div>
                        </div>

                        <hr className="border-slate-200 dark:border-slate-700 my-2" />

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button className="flex min-w-[150px] cursor-pointer items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary hover:bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-[20px]">download</span>
                                <span>{t.downloadCV}</span>
                            </button>
                            <button className="flex min-w-[150px] cursor-pointer items-center justify-center gap-2 rounded-lg h-12 px-6 bg-white dark:bg-transparent border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] transition-all active:scale-95 group">
                                <span>{t.viewPortfolio}</span>
                                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pb-10"></div>
            </div>
        </section>
    )
}
