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
  const [breadcrumb, setBreadcrumb] = useState([]) // [{id, name}, ...]

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch('/api/core/functions/?is_active=true')
    if (res?.ok) setFunctions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const total = functions.length
  const unassigned = functions.filter(f => f.current_user_count === 0).length

  const handleCreated = (fn) => {
    setShowNew(false)
    load()
    setSelectedId(fn.id)
  }

  const childrenOf = functions.reduce((acc, f) => {
    if (f.parent) acc[f.parent.id] = [...(acc[f.parent.id] ?? []), f]
    return acc
  }, {})

  const drillInto = (fn) => setBreadcrumb(prev => [...prev, { id: fn.id, name: fn.name }])
  const drillTo = (index) => setBreadcrumb(prev => index < 0 ? [] : prev.slice(0, index + 1))

  const currentId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null
  const currentFn = currentId ? functions.find(f => f.id === currentId) : null
  const topLevel = functions.filter(f => !f.parent)

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
        <StatTile label="Active functions" value={total} />
        <StatTile label="Assigned" value={total - unassigned} />
        <StatTile label="Vacant" value={unassigned} />
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs mb-4 flex-wrap">
          <button onClick={() => drillTo(-1)} className="text-stone-600 hover:text-stone-900 hover:underline">
            All functions
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <span className="text-muted">/</span>
              {i < breadcrumb.length - 1 ? (
                <button onClick={() => drillTo(i)} className="text-stone-600 hover:text-stone-900 hover:underline">
                  {crumb.name}
                </button>
              ) : (
                <span className="text-primary font-medium">{crumb.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Function cards */}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : functions.length === 0 ? (
        <p className="text-sm text-muted">No functions yet.</p>
      ) : currentFn ? (
        // Drilled-in view: current function at top, its children below
        <div>
          <FunctionCard fn={currentFn} onClick={() => setSelectedId(currentFn.id)} />
          {childrenOf[currentFn.id]?.length > 0 && (
            <div className="ml-6 mt-2 space-y-2 border-l-2 border-stone-100 pl-4">
              {childrenOf[currentFn.id].map(child => (
                <FunctionCard
                  key={child.id}
                  fn={child}
                  onClick={() => childrenOf[child.id]?.length > 0 ? drillInto(child) : setSelectedId(child.id)}
                />
              ))}
            </div>
          )}
          {!childrenOf[currentFn.id]?.length && (
            <p className="text-xs text-muted mt-4">No direct reports.</p>
          )}
        </div>
      ) : (
        // Top-level view
        <div className="space-y-4">
          {topLevel.map(fn => (
            <div key={fn.id}>
              <FunctionCard fn={fn} onClick={() => setSelectedId(fn.id)} />
              {childrenOf[fn.id]?.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l-2 border-stone-100 pl-4">
                  {childrenOf[fn.id].map(child => (
                    <FunctionCard
                      key={child.id}
                      fn={child}
                      onClick={() => drillInto(child)}
                    />
                  ))}
                </div>
              )}
            </div>
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
