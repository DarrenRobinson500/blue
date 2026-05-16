import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import AssignFunctionModal from './AssignFunctionModal'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_LABELS = { cro: 'CRO', chief_actuary: 'Chief Actuary', admin: 'Admin' }

export default function UserDetailPanel({ userId, onClose, onUserUpdated }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch(`/api/core/users/${userId}/`)
    if (res?.ok) setDetail(await res.json())
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleAssigned = (updated) => {
    setDetail(updated)
    setShowAssign(false)
    onUserUpdated()
  }

  const handleRemove = async () => {
    setRemoving(true)
    const res = await apiFetch(`/api/core/users/${userId}/remove-function/`, { method: 'POST' })
    if (res?.ok) {
      const data = await res.json()
      setDetail(data)
      setConfirmRemove(false)
      onUserUpdated()
    }
    setRemoving(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-[560px] bg-white shadow-xl flex items-center justify-center">
          <span className="text-sm text-muted">Loading…</span>
        </div>
      </div>
    )
  }

  if (!detail) return null

  const history = detail.function_history ?? []

  return (
    <>
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-[560px] bg-white shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
            <div>
              <p className="font-semibold text-primary">{detail.email}</p>
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                {ROLE_LABELS[detail.role] ?? detail.role}
              </span>
            </div>
            <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none ml-4">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Section 1 — Current function */}
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Current function</h3>
              {detail.function ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-primary">{detail.function.name}</span>
                    <span className="text-xs font-mono bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">{detail.function.code}</span>
                  </div>
                  <p className="text-xs text-muted mb-4">
                    Since {fmt(detail.function_assigned_since)}
                    {history[0]?.assigned_by_email && ` · Assigned by ${history[0].assigned_by_email}`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAssign(true)}
                      className="text-xs bg-stone-700 text-white rounded px-3 py-1.5 hover:bg-stone-800 transition-colors"
                    >
                      Reassign function
                    </button>
                    {!confirmRemove ? (
                      <button
                        onClick={() => setConfirmRemove(true)}
                        className="text-xs border border-red-300 text-red-600 rounded px-3 py-1.5 hover:bg-red-50 transition-colors"
                      >
                        Remove function
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={handleRemove}
                          disabled={removing}
                          className="text-xs bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {removing ? 'Removing…' : 'Confirm removal'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(false)}
                          className="text-xs text-muted hover:text-primary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">No function assigned.</p>
                  <button
                    onClick={() => setShowAssign(true)}
                    className="text-xs bg-stone-700 text-white rounded px-3 py-1.5 hover:bg-stone-800 transition-colors"
                  >
                    Assign function
                  </button>
                </div>
              )}
            </div>

            {/* Section 2 — Function history */}
            <div className="px-6 py-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Function history</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted">No history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="pb-2 font-medium pr-3">Function</th>
                        <th className="pb-2 font-medium pr-3">Start</th>
                        <th className="pb-2 font-medium pr-3">End</th>
                        <th className="pb-2 font-medium pr-3">Assigned by</th>
                        <th className="pb-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-3">
                            <span className="font-medium text-primary">{h.function_name}</span>
                            <span className="ml-1 text-muted font-mono text-[10px]">{h.function_code}</span>
                          </td>
                          <td className="py-2 pr-3 text-muted whitespace-nowrap">{fmt(h.start_date)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {h.end_date
                              ? <span className="text-muted">{fmt(h.end_date)}</span>
                              : <span className="text-green-600 font-medium">Current</span>
                            }
                          </td>
                          <td className="py-2 pr-3 text-muted">{h.assigned_by_email ?? '—'}</td>
                          <td className="py-2 text-muted">{h.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignFunctionModal
          user={detail}
          onClose={() => setShowAssign(false)}
          onAssigned={handleAssigned}
        />
      )}
    </>
  )
}
