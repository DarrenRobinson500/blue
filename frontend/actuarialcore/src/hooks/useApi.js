import { useState, useCallback } from 'react'
import { apiFetch } from '../auth'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (path, options = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(path, options)
      if (!res) return null
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || data.error || JSON.stringify(data) || `Error ${res.status}`)
        return null
      }
      if (res.status === 204) return true
      return await res.json()
    } catch (e) {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { request, loading, error, setError }
}
