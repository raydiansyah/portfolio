import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Get all services
router.get('/', async (req, res) => {
    try {
        const items = await db.select().from(schema.trainingServices)
        res.json(items)
    } catch (error) {
        console.error('Error fetching services:', error)
        res.status(500).json({ error: 'Failed to fetch services' })
    }
})

// Get single service
router.get('/:id', async (req, res) => {
    try {
        const item = await db.select().from(schema.trainingServices).where(eq(schema.trainingServices.id, req.params.id)).limit(1)
        if (!item.length) return res.status(404).json({ error: 'Not found' })
        res.json(item[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch service' })
    }
})

// Create service
router.post('/', requireAuth, async (req, res) => {
    try {
        const { titleEN, titleID, descriptionEN, descriptionID, price, duration, isActive } = req.body
        const id = randomUUID()
        await db.insert(schema.trainingServices).values({
            id, titleEN, titleID, descriptionEN, descriptionID, price, duration, isActive
        })
        const item = await db.select().from(schema.trainingServices).where(eq(schema.trainingServices.id, id)).limit(1)
        res.status(201).json(item[0])
    } catch (error) {
        console.error('Error creating service:', error)
        res.status(500).json({ error: 'Failed to create service' })
    }
})

// Update service
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { titleEN, titleID, descriptionEN, descriptionID, price, duration, isActive } = req.body
        await db.update(schema.trainingServices).set({
            titleEN, titleID, descriptionEN, descriptionID, price, duration, isActive
        }).where(eq(schema.trainingServices.id, req.params.id))
        const item = await db.select().from(schema.trainingServices).where(eq(schema.trainingServices.id, req.params.id)).limit(1)
        if (!item.length) return res.status(404).json({ error: 'Not found' })
        res.json(item[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to update service' })
    }
})

// Delete service
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await db.delete(schema.trainingServices).where(eq(schema.trainingServices.id, req.params.id))
        res.json({ message: 'Deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete service' })
    }
})

export default router
