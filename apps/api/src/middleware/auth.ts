import type { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/auth.js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    // Skip auth in development mode for easier testing
    if (process.env.NODE_ENV === 'development') {
        return next()
    }

    try {
        const session = await auth.api.getSession({
            headers: req.headers as unknown as Headers,
        })

        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // Attach session to request for use in routes
        ; (req as any).session = session
        next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        return res.status(401).json({ error: 'Unauthorized' })
    }
}
