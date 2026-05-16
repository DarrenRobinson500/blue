import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import FunctionCard from '../components/FunctionCard'
import FunctionDetailPanel from '../components/FunctionDetailPanel'
import NewFunctionModal from '../components/NewFunctionModal'

function StatTile({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-5 py-4">
      <p className="text-2xl font-semibold text-primary">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  )
}

export default function FunctionsPage() {
  const [functions, setFunctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch('/api/core/functions/?is_active=all')
    if (res?.ok) setFunctions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const total = functions.length
  const active = functions.filter(f => f.is_active).length
  const unassigned = functions.filter(f => f.is_active && f.current_user_count === 0).length

  const handleCreated = (fn) => {
    setShowNew(false)
    load()
    setSelectedId(fn.id)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-primary">Functions</h1>
        <button
          onClick={() => setShowNew(true)}
          className="px-3 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-800 transition-colors"
        >
          + New function
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile label="Total functions" value={total} />
        <StatTile label="Active functions" value={active} />
        <StatTile label="Active with no user" value={unassigned} />
      </div>

      {/* Function cards */}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : functions.length === 0 ? (
        <p className="text-sm text-muted">No functions yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {functions.map(fn => (
            <FunctionCard
              key={fn.id}
              fn={fn}
              onClick={() => setSelectedId(fn.id)}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <FunctionDetailPanel
          functionId={selectedId}
          onClose={() => setSelectedId(null)}
          onFunctionUpdated={load}
        />
      )}

      {showNew && (
        <NewFunctionModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
