import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import EditFunctionModal from './EditFunctionModal'
import AssignUserModal from './AssignUserModal'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FunctionDetailPanel({ functionId, onClose, onFunctionUpdated }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showAssignUser, setShowAssignUser] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch(`/api/core/functions/${functionId}/`)
    if (res?.ok) setDetail(await res.json())
    setLoading(false)
  }, [functionId])

  useEffect(() => { load() }, [load])

  const handleSaved = (updated) => {
    setDetail(prev => ({ ...prev, ...updated }))
    setShowEdit(false)
    onFunctionUpdated()
  }

  const toggleActive = async () => {
    if (!detail) return
    setDeactivating(true)
    const res = await apiFetch(`/api/core/functions/${functionId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !detail.is_active }),
    })
    if (res?.ok) {
      const data = await res.json()
      setDetail(prev => ({ ...prev, is_active: data.is_active }))
      onFunctionUpdated()
    }
    setDeactivating(false)
  }

  const canDeactivate = detail?.is_active && (detail?.current_user_count ?? 0) === 0

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

  const currentUsers = detail.current_users ?? []
  const history = detail.assignment_history ?? []

  return (
    <>
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-[560px] bg-white shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-primary text-base">{detail.name}</h2>
                <span className="text-xs font-mono bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">{detail.code}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${detail.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {detail.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs text-muted hover:text-primary border border-border rounded px-2 py-1 transition-colors"
                title="Edit"
              >
                Edit
              </button>
              <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none">&times;</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Section 1 — Details */}
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Details</h3>
              {detail.description
                ? <p className="text-sm text-primary leading-relaxed">{detail.description}</p>
                : <p className="text-sm text-muted italic">No description.</p>
              }
              {detail.parent && (
                <p className="text-xs text-muted mt-3">
                  Reports to:{' '}
                  <span className="font-medium text-primary">{detail.parent.name}</span>
                  <span className="ml-1 font-mono text-[10px] bg-stone-100 text-stone-600 px-1 py-0.5 rounded">{detail.parent.code}</span>
                </p>
              )}
              {detail.children?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted mb-1">Direct reports:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.children.map(c => (
                      <span key={c.id} className="text-xs bg-stone-50 border border-stone-200 text-stone-700 px-2 py-0.5 rounded">
                        {c.name} <span className="font-mono text-[10px] text-stone-500">{c.code}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted mt-3">Created {fmt(detail.created_at)}</p>
            </div>

            {/* Section 2 — Current assignment */}
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Current assignment</h3>
              {currentUsers.length > 0 ? (
                currentUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">{u.email}</p>
                      <p className="text-xs text-muted">Since {fmt(u.assigned_since)}</p>
                    </div>
                    <button
                      onClick={() => setShowAssignUser(true)}
                      className="text-xs text-stone-700 hover:text-stone-900 border border-stone-300 rounded px-2 py-1 transition-colors"
                    >
                      Reassign
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">No user currently assigned.</p>
                  <button
                    onClick={() => setShowAssignUser(true)}
                    className="text-xs bg-stone-700 text-white rounded px-2 py-1 hover:bg-stone-800 transition-colors"
                  >
                    Assign user
                  </button>
                </div>
              )}
            </div>

            {/* Section 3 — Assignment history */}
            <div className="px-6 py-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Assignment history</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted">No history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="pb-2 font-medium pr-3">User</th>
                        <th className="pb-2 font-medium pr-3">Start</th>
                        <th className="pb-2 font-medium pr-3">End</th>
                        <th className="pb-2 font-medium pr-3">Assigned by</th>
                        <th className="pb-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-3 text-primary font-medium truncate max-w-[120px]">{h.user_email}</td>
                          <td className="py-2 pr-3 text-muted whitespace-nowrap">{fmt(h.start_date)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {h.end_date
                              ? <span className="text-muted">{fmt(h.end_date)}</span>
                              : <span className="text-green-600 font-medium">Current</span>
                            }
                          </td>
                          <td className="py-2 pr-3 text-muted truncate max-w-[120px]">{h.assigned_by_email ?? '—'}</td>
                          <td className="py-2 text-muted">{h.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer — deactivate/reactivate */}
          <div className="px-6 py-4 border-t border-border shrink-0">
            {detail.is_active ? (
              <button
                onClick={canDeactivate ? toggleActive : undefined}
                disabled={deactivating || !canDeactivate}
                title={!canDeactivate ? 'Remove the current user assignment before deactivating.' : undefined}
                className={`text-xs border rounded px-3 py-1.5 transition-colors ${
                  canDeactivate
                    ? 'border-red-300 text-red-600 hover:bg-red-50'
                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {deactivating ? 'Deactivating…' : 'Deactivate function'}
              </button>
            ) : (
              <button
                onClick={toggleActive}
                disabled={deactivating}
                className="text-xs border border-stone-300 text-stone-700 rounded px-3 py-1.5 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Reactivating…' : 'Reactivate function'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditFunctionModal fn={detail} onClose={() => setShowEdit(false)} onSaved={handleSaved} />
      )}
      {showAssignUser && (
        <AssignUserModal
          functionId={functionId}
          functionName={detail.name}
          currentUserIds={currentUsers.map(u => u.id)}
          onClose={() => setShowAssignUser(false)}
          onAssigned={() => { setShowAssignUser(false); load(); onFunctionUpdated() }}
        />
      )}
    </>
  )
}
