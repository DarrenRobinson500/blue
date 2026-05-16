import { useState, useCallback } from 'react'
import { apiFetch } from '../auth'

export function useRiskMatrix() {
  const [cells, setCells] = useState([])

  const load = useCallback(async () => {
    const res = await apiFetch('/api/matrix/')
    if (res?.ok) setCells(await res.json())
  }, [])

  const resolveRating = useCallback((likelihood, consequence) => {
    const cell = cells.find(c => c.likelihood === likelihood && c.consequence === consequence)
    return cell?.rating ?? null
  }, [cells])

  const updateMatrix = async (newCells) => {
    const res = await apiFetch('/api/matrix/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells: newCells }),
    })
    if (res?.ok) {
      const data = await res.json()
      setCells(data.cells)
      return data
    }
    const err = await res?.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to save matrix')
  }

  return { cells, load, resolveRating, updateMatrix }
}
