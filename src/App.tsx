import { useState, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import AboutMe from './components/AboutMe'
import Experience from './components/Experience'
import Projects from './components/Projects'
import TechStack from './components/TechStack'
import './index.css'

function App() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Check initial theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const storedTheme = localStorage.getItem('theme')

    if (storedTheme) {
      setIsDark(storedTheme === 'dark')
    } else {
      setIsDark(prefersDark)
    }
  }, [])

  useEffect(() => {
    // Apply theme to html element
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display antialiased overflow-x-hidden transition-colors duration-300 text-slate-900 dark:text-slate-100">
      <Header isDark={isDark} toggleTheme={toggleTheme} />
      <main className="flex-grow flex flex-col justify-center relative">
        <Hero />
        <AboutMe />
        <Experience />
        <Projects />
        <TechStack />
      </main>
    </div>
  )
}

export default App
