import { useState, useCallback } from 'react'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: false, error: null })

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await fn()
      setState({ data, loading: false, error: null })
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setState({ data: null, loading: false, error: msg })
      throw err
    }
  }, [])

  return { ...state, execute }
}
