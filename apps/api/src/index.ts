import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'
import projectsRouter from './routes/projects.js'
import experiencesRouter from './routes/experiences.js'
import skillsRouter from './routes/skills.js'
import aboutRouter from './routes/about.js'
import trainerRouter from './routes/trainer.js'
import servicesRouter from './routes/services.js'
import settingsRouter from './routes/settings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}))

// Parse JSON bodies
app.use(express.json())

// Root route - redirect to dashboard
app.get('/', (req, res) => {
    res.redirect('/dashboard')
})

// Auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'))
})

// Admin pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'))
})
app.get('/admin/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'projects.html'))
})
app.get('/admin/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'))
})
app.get('/admin/skills', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'skills.html'))
})
app.get('/admin/experience', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'experience.html'))
})
app.get('/admin/trainer', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'trainer.html'))
})
app.get('/admin/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'services.html'))
})
app.get('/admin/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'))
})

// API Info
app.get('/api', (req, res) => {
    res.json({
        name: 'Portfolio API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: 'GET /api/health',
            auth: 'POST /api/auth/sign-up/email | sign-in/email | sign-out',
            projects: 'GET|POST|PUT|DELETE /api/projects',
            experiences: 'GET|POST|PUT|DELETE /api/experiences',
            skills: 'GET|POST|PUT|DELETE /api/skills',
            about: 'GET|POST /api/about',
            trainer: 'GET|POST|PUT|DELETE /api/trainer',
            services: 'GET|POST|PUT|DELETE /api/services',
            settings: 'GET|POST /api/settings',
        },
    })
})

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Better Auth routes
app.all('/api/auth/*', toNodeHandler(auth))

// API routes
app.use('/api/projects', projectsRouter)
app.use('/api/experiences', experiencesRouter)
app.use('/api/skills', skillsRouter)
app.use('/api/about', aboutRouter)
app.use('/api/trainer', trainerRouter)
app.use('/api/services', servicesRouter)
app.use('/api/settings', settingsRouter)

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`🔐 Login: http://localhost:${PORT}/login`)
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`)
})
