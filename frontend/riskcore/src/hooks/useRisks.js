import { useState, useCallback } from 'react'
import { apiFetch } from '../auth'

export function useRisks() {
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (params = {}) => {
    setLoading(true)
    const qs = new URLSearchParams(params).toString()
    const res = await apiFetch(`/api/risks/${qs ? '?' + qs : ''}`)
    if (res?.ok) setRisks(await res.json())
    setLoading(false)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [activeRes, draftRes, closedRes] = await Promise.all([
      apiFetch('/api/risks/?status=active'),
      apiFetch('/api/risks/?status=draft'),
      apiFetch('/api/risks/?status=closed'),
    ])
    const all = []
    for (const res of [activeRes, draftRes, closedRes]) {
      if (res?.ok) all.push(...(await res.json()))
    }
    setRisks(all)
    setLoading(false)
  }, [])

  const refresh = useCallback(() => loadAll(), [loadAll])

  const patchRisk = async (id, data) => {
    const res = await apiFetch(`/api/risks/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res?.ok) {
      const updated = await res.json()
      setRisks(prev => prev.map(r => r.id === id ? updated : r))
      return updated
    }
    return null
  }

  const createRisk = async (data) => {
    const res = await apiFetch('/api/risks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res?.ok) {
      const created = await res.json()
      setRisks(prev => [created, ...prev])
      return created
    }
    const err = await res?.json().catch(() => ({}))
    throw new Error(JSON.stringify(err))
  }

  return { risks, loading, load, loadAll, refresh, patchRisk, createRisk }
}
