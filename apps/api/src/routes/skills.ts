import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Get all skills
router.get('/', async (req, res) => {
    try {
        const skills = await db.select().from(schema.skills)
        res.json(skills)
    } catch (error) {
        console.error('Error fetching skills:', error)
        res.status(500).json({ error: 'Failed to fetch skills' })
    }
})

// Get single skill
router.get('/:id', async (req, res) => {
    try {
        const skill = await db.select().from(schema.skills).where(eq(schema.skills.id, req.params.id)).limit(1)
        if (!skill.length) return res.status(404).json({ error: 'Skill not found' })
        res.json(skill[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch skill' })
    }
})

// Create skill
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, category, icon, proficiency, isPublic } = req.body
        const id = randomUUID()
        await db.insert(schema.skills).values({ id, name, category, icon, proficiency, isPublic })
        const skill = await db.select().from(schema.skills).where(eq(schema.skills.id, id)).limit(1)
        res.status(201).json(skill[0])
    } catch (error) {
        console.error('Error creating skill:', error)
        res.status(500).json({ error: 'Failed to create skill' })
    }
})

// Update skill
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { name, category, icon, proficiency, isPublic } = req.body
        await db.update(schema.skills).set({ name, category, icon, proficiency, isPublic }).where(eq(schema.skills.id, req.params.id))
        const skill = await db.select().from(schema.skills).where(eq(schema.skills.id, req.params.id)).limit(1)
        if (!skill.length) return res.status(404).json({ error: 'Skill not found' })
        res.json(skill[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to update skill' })
    }
})

// Delete skill
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await db.delete(schema.skills).where(eq(schema.skills.id, req.params.id))
        res.json({ message: 'Skill deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete skill' })
    }
})

export default router
