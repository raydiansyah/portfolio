import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Get all experiences
router.get('/', async (req, res) => {
    try {
        const experiences = await db.select().from(schema.experiences)
        res.json(experiences)
    } catch (error) {
        console.error('Error fetching experiences:', error)
        res.status(500).json({ error: 'Failed to fetch experiences' })
    }
})

// Get single experience
router.get('/:id', async (req, res) => {
    try {
        const experience = await db
            .select()
            .from(schema.experiences)
            .where(eq(schema.experiences.id, req.params.id))
            .limit(1)

        if (!experience.length) {
            return res.status(404).json({ error: 'Experience not found' })
        }

        res.json(experience[0])
    } catch (error) {
        console.error('Error fetching experience:', error)
        res.status(500).json({ error: 'Failed to fetch experience' })
    }
})

// Create experience (protected)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, company, location, period, descriptionEN, descriptionID, skills, isCurrent } = req.body
        const id = randomUUID()

        await db.insert(schema.experiences).values({
            id,
            title,
            company,
            location,
            period,
            descriptionEN,
            descriptionID,
            skills,
            isCurrent: isCurrent || false,
        })

        const experience = await db.select().from(schema.experiences).where(eq(schema.experiences.id, id)).limit(1)
        res.status(201).json(experience[0])
    } catch (error) {
        console.error('Error creating experience:', error)
        res.status(500).json({ error: 'Failed to create experience' })
    }
})

// Update experience (protected)
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { title, company, location, period, descriptionEN, descriptionID, skills, isCurrent } = req.body

        await db.update(schema.experiences).set({
            title,
            company,
            location,
            period,
            descriptionEN,
            descriptionID,
            skills,
            isCurrent,
        }).where(eq(schema.experiences.id, req.params.id))

        const experience = await db.select().from(schema.experiences).where(eq(schema.experiences.id, req.params.id)).limit(1)

        if (!experience.length) {
            return res.status(404).json({ error: 'Experience not found' })
        }

        res.json(experience[0])
    } catch (error) {
        console.error('Error updating experience:', error)
        res.status(500).json({ error: 'Failed to update experience' })
    }
})

// Delete experience (protected)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await db.delete(schema.experiences).where(eq(schema.experiences.id, req.params.id))
        res.json({ message: 'Experience deleted successfully' })
    } catch (error) {
        console.error('Error deleting experience:', error)
        res.status(500).json({ error: 'Failed to delete experience' })
    }
})

export default router
