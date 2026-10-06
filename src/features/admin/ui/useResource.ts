import { useCallback, useEffect, useState } from 'react'

/**
 * Minimal async loader for repository calls: { data, loading, error, reload, setData }.
 * `setData` enables optimistic updates (mutate locally, then call the repo).
 */
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    load()
      .then((d) => {
        if (!alive) return
        setData(d)
        setError(null)
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e : new Error(String(e))))
    return () => {
      alive = false
    }
    // `load` is expected to be a stable module function; reload via `version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, loading: data === null && !error, error, reload, setData }
}
