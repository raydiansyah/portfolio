/**
 * Tiny in-memory "table" used while the dashboard runs on mock data.
 * Persists to localStorage so edits survive reloads and the public slide
 * portal (same browser) sees what the admin changed.
 *
 * Every repository function that uses this has a `// SUPABASE:` marker with
 * the equivalent client call — swap the body, keep the signature.
 */

const LATENCY = 220

export const delay = <T,>(value: T, ms = LATENCY) => new Promise<T>((r) => setTimeout(() => r(value), ms))

export const uuid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

export class MockTable<T extends { id: string | number }> {
  private rows: T[]
  private key: string

  constructor(name: string, seed: T[]) {
    this.key = `admin-mock:${name}`
    this.rows = this.load() ?? structuredClone(seed)
  }

  private load(): T[] | null {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as T[]) : null
    } catch {
      return null
    }
  }

  private save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.rows))
    } catch {
      /* quota / private mode: keep in memory only */
    }
  }

  all() {
    return structuredClone(this.rows)
  }

  get(id: T['id']) {
    const row = this.rows.find((r) => r.id === id)
    return row ? structuredClone(row) : null
  }

  find(pred: (row: T) => boolean) {
    const row = this.rows.find(pred)
    return row ? structuredClone(row) : null
  }

  insert(row: T) {
    this.rows.unshift(row)
    this.save()
    return structuredClone(row)
  }

  update(id: T['id'], patch: Partial<T>) {
    const i = this.rows.findIndex((r) => r.id === id)
    if (i < 0) throw new Error('Row not found')
    this.rows[i] = { ...this.rows[i], ...patch }
    this.save()
    return structuredClone(this.rows[i])
  }

  remove(id: T['id']) {
    this.rows = this.rows.filter((r) => r.id !== id)
    this.save()
  }

  replaceAll(rows: T[]) {
    this.rows = rows
    this.save()
  }
}
