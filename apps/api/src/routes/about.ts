import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Get about info
router.get('/', async (req, res) => {
    try {
        const about = await db.select().from(schema.about).limit(1)
        res.json(about[0] || null)
    } catch (error) {
        console.error('Error fetching about:', error)
        res.status(500).json({ error: 'Failed to fetch about info' })
    }
})

// Create or update about info
router.post('/', requireAuth, async (req, res) => {
    try {
        const { nameEN, nameID, titleEN, titleID, bioEN, bioID, location, email, phone, avatar } = req.body

        // Check if record exists
        const existing = await db.select().from(schema.about).limit(1)

        if (existing.length > 0) {
            // Update existing
            await db.update(schema.about).set({
                nameEN, nameID, titleEN, titleID, bioEN, bioID, location, email, phone, avatar
            }).where(eq(schema.about.id, existing[0].id))
            const updated = await db.select().from(schema.about).where(eq(schema.about.id, existing[0].id)).limit(1)
            res.json(updated[0])
        } else {
            // Create new
            const id = randomUUID()
            await db.insert(schema.about).values({
                id, nameEN, nameID, titleEN, titleID, bioEN, bioID, location, email, phone, avatar
            })
            const created = await db.select().from(schema.about).where(eq(schema.about.id, id)).limit(1)
            res.status(201).json(created[0])
        }
    } catch (error) {
        console.error('Error saving about:', error)
        res.status(500).json({ error: 'Failed to save about info' })
    }
})

export default router
