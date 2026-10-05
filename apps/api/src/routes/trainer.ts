import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Get all trainer experiences
router.get('/', async (req, res) => {
    try {
        const items = await db.select().from(schema.trainerExperiences)
        res.json(items)
    } catch (error) {
        console.error('Error fetching trainer experiences:', error)
        res.status(500).json({ error: 'Failed to fetch trainer experiences' })
    }
})

// Get single trainer experience
router.get('/:id', async (req, res) => {
    try {
        const item = await db.select().from(schema.trainerExperiences).where(eq(schema.trainerExperiences.id, req.params.id)).limit(1)
        if (!item.length) return res.status(404).json({ error: 'Not found' })
        res.json(item[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trainer experience' })
    }
})

// Create trainer experience
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, organization, location, period, descriptionEN, descriptionID, studentsCount, isCurrent } = req.body
        const id = randomUUID()
        await db.insert(schema.trainerExperiences).values({
            id, title, organization, location, period, descriptionEN, descriptionID, studentsCount, isCurrent
        })
        const item = await db.select().from(schema.trainerExperiences).where(eq(schema.trainerExperiences.id, id)).limit(1)
        res.status(201).json(item[0])
    } catch (error) {
        console.error('Error creating trainer experience:', error)
        res.status(500).json({ error: 'Failed to create trainer experience' })
    }
})

// Update trainer experience
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { title, organization, location, period, descriptionEN, descriptionID, studentsCount, isCurrent } = req.body
        await db.update(schema.trainerExperiences).set({
            title, organization, location, period, descriptionEN, descriptionID, studentsCount, isCurrent
        }).where(eq(schema.trainerExperiences.id, req.params.id))
        const item = await db.select().from(schema.trainerExperiences).where(eq(schema.trainerExperiences.id, req.params.id)).limit(1)
        if (!item.length) return res.status(404).json({ error: 'Not found' })
        res.json(item[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to update trainer experience' })
    }
})

// Delete trainer experience
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await db.delete(schema.trainerExperiences).where(eq(schema.trainerExperiences.id, req.params.id))
        res.json({ message: 'Deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete trainer experience' })
    }
})

export default router
