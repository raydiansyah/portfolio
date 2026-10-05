import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// Default settings
const defaultSettings: Record<string, string> = {
    'register_enabled': 'true',
    'site_name': 'Portfolio Admin',
    'maintenance_mode': 'false'
}

// Get all settings (public)
router.get('/', async (req, res) => {
    try {
        const settings = await db.select().from(schema.settings)
        // Merge with defaults
        const result: Record<string, string> = { ...defaultSettings }
        settings.forEach(s => {
            if (s.keyName) result[s.keyName] = s.value || ''
        })
        res.json(result)
    } catch (error) {
        console.error('Error fetching settings:', error)
        res.json(defaultSettings)
    }
})

// Get single setting
router.get('/:key', async (req, res) => {
    try {
        const setting = await db.select().from(schema.settings)
            .where(eq(schema.settings.keyName, req.params.key))
            .limit(1)

        if (setting.length) {
            res.json({ key: setting[0].keyName, value: setting[0].value })
        } else if (defaultSettings[req.params.key] !== undefined) {
            res.json({ key: req.params.key, value: defaultSettings[req.params.key] })
        } else {
            res.status(404).json({ error: 'Setting not found' })
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch setting' })
    }
})

// Update setting (protected)
router.post('/:key', requireAuth, async (req, res) => {
    try {
        const { value } = req.body
        const key = req.params.key

        // Check if exists
        const existing = await db.select().from(schema.settings)
            .where(eq(schema.settings.keyName, key))
            .limit(1)

        if (existing.length) {
            await db.update(schema.settings)
                .set({ value })
                .where(eq(schema.settings.keyName, key))
        } else {
            const id = randomUUID()
            await db.insert(schema.settings).values({ id, keyName: key, value })
        }

        res.json({ key, value, message: 'Setting updated' })
    } catch (error) {
        console.error('Error updating setting:', error)
        res.status(500).json({ error: 'Failed to update setting' })
    }
})

export default router
