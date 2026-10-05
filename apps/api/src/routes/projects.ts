import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Get all projects
router.get('/', async (req, res) => {
    try {
        const projects = await db.select().from(schema.projects)
        res.json(projects)
    } catch (error) {
        console.error('Error fetching projects:', error)
        res.status(500).json({ error: 'Failed to fetch projects' })
    }
})

// Get single project
router.get('/:id', async (req, res) => {
    try {
        const project = await db
            .select()
            .from(schema.projects)
            .where(eq(schema.projects.id, req.params.id))
            .limit(1)

        if (!project.length) {
            return res.status(404).json({ error: 'Project not found' })
        }

        res.json(project[0])
    } catch (error) {
        console.error('Error fetching project:', error)
        res.status(500).json({ error: 'Failed to fetch project' })
    }
})

// Create project (protected)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, descriptionEN, descriptionID, category, image, tags, liveUrl, repoUrl, isPublic } = req.body
        const id = randomUUID()

        await db.insert(schema.projects).values({
            id,
            title,
            descriptionEN,
            descriptionID,
            category,
            image,
            tags,
            liveUrl,
            repoUrl,
            isPublic: isPublic !== false,
        })

        const project = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1)
        res.status(201).json(project[0])
    } catch (error) {
        console.error('Error creating project:', error)
        res.status(500).json({ error: 'Failed to create project' })
    }
})

// Update project (protected)
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { title, descriptionEN, descriptionID, category, image, tags, liveUrl, repoUrl, isPublic } = req.body

        await db.update(schema.projects).set({
            title,
            descriptionEN,
            descriptionID,
            category,
            image,
            tags,
            liveUrl,
            repoUrl,
            isPublic,
        }).where(eq(schema.projects.id, req.params.id))

        const project = await db.select().from(schema.projects).where(eq(schema.projects.id, req.params.id)).limit(1)

        if (!project.length) {
            return res.status(404).json({ error: 'Project not found' })
        }

        res.json(project[0])
    } catch (error) {
        console.error('Error updating project:', error)
        res.status(500).json({ error: 'Failed to update project' })
    }
})

// Delete project (protected)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await db.delete(schema.projects).where(eq(schema.projects.id, req.params.id))
        res.json({ message: 'Project deleted successfully' })
    } catch (error) {
        console.error('Error deleting project:', error)
        res.status(500).json({ error: 'Failed to delete project' })
    }
})

export default router
