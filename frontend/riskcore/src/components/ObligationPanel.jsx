import { useState, useEffect } from 'react'
import Panel from './Panel'
import { RiskBadge, StatusBadge, ControlTypeBadge, label } from './Badge'
import ReviewDue from './ReviewDue'
import { useApi } from '../hooks/useApi'
import { apiFetch } from '../auth'

function HistoryEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-primary">{entry.change_summary || 'No summary'}</p>
          <p className="text-xs text-muted mt-0.5">
            {entry.changed_by_email || 'System'} · {new Date(entry.changed_at).toLocaleString('en-AU')}
          </p>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-xs text-muted hover:text-primary shrink-0">
          {expanded ? 'Hide' : 'View snapshot'}
        </button>
      </div>
      {expanded && (
        <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700">
          {JSON.stringify(entry.snapshot, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function ObligationPanel({ obligation: initial, sources, allControls, onClose, onUpdated, onDeleted }) {
  const [obligation, setObligation] = useState(initial)
  const [history, setHistory] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [linkSearch, setLinkSearch] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const { request, loading } = useApi()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const deleteObligation = async () => {
    setDeleting(true)
    const res = await apiFetch(`/api/risk/obligations/${obligation.id}/`, { method: 'DELETE' })
    if (res?.ok || res?.status === 204) onDeleted?.(obligation.id)
    setDeleting(false)
  }

  useEffect(() => { setObligation(initial); setEditing(false) }, [initial])

  const loadHistory = async () => {
    if (history) return
    const data = await request(`/api/risk/obligations/${obligation.id}/history/`)
    if (data) setHistory(data)
  }

  const toggleHistory = async () => {
    if (!historyOpen) await loadHistory()
    setHistoryOpen(v => !v)
  }

  const startEdit = () => {
    setEditForm({
      source: obligation.source,
      reference: obligation.reference,
      interpretation: obligation.interpretation,
      owner: obligation.owner || '',
      implementation_notes: obligation.implementation_notes || '',
      risk_rating: obligation.risk_rating,
      status: obligation.status,
      review_due: obligation.review_due || '',
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    const payload = { ...editForm }
    if (!payload.review_due) payload.review_due = null
    const data = await request(`/api/risk/obligations/${obligation.id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    if (data) {
      setObligation(data)
      setHistory(null)
      setEditing(false)
      onUpdated(data)
    }
  }

  const linkControl = async (controlId) => {
    await request(`/api/risk/obligations/${obligation.id}/controls/`, {
      method: 'POST',
      body: JSON.stringify({ control_id: controlId }),
    })
    const fresh = await request(`/api/risk/obligations/${obligation.id}/`)
    if (fresh) { setObligation(fresh); onUpdated(fresh) }
    setLinkOpen(false)
    setLinkSearch('')
  }

  const unlinkControl = async (controlId) => {
    if (!confirm('Unlink this control?')) return
    await request(`/api/risk/obligations/${obligation.id}/controls/${controlId}/`, { method: 'DELETE' })
    const fresh = await request(`/api/risk/obligations/${obligation.id}/`)
    if (fresh) { setObligation(fresh); onUpdated(fresh) }
  }

  const linkedIds = new Set((obligation.controls || []).map(c => c.id))
  const filtered = allControls.filter(c =>
    !linkedIds.has(c.id) &&
    (linkSearch === '' || c.name.toLowerCase().includes(linkSearch.toLowerCase()))
  )

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Panel onClose={onClose}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-primary">{obligation.reference}</span>
            <RiskBadge value={obligation.risk_rating} />
            <StatusBadge value={obligation.status} />
          </div>
          <p className="text-xs text-muted mt-1">{obligation.source_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && (
            confirmDelete ? (
              <>
                <button
                  onClick={deleteObligation}
                  disabled={deleting}
                  className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted hover:text-primary border border-gray-200 rounded px-2 py-1 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={startEdit} className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:border-gray-400 text-primary transition-colors">Edit</button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:border-red-300 hover:text-red-600 text-muted transition-colors"
                >
                  Delete
                </button>
              </>
            )
          )}
          <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none">&times;</button>
        </div>
      </div>

      <div className="flex-1 px-6 py-4 space-y-6">

        {/* Verbatim text */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Verbatim text</h3>
          <p className="text-sm text-primary bg-gray-50 border border-gray-200 rounded p-3 leading-relaxed italic">
            {obligation.verbatim_text}
          </p>
        </div>

        {/* Interpretation */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Interpretation</h3>
          {editing ? (
            <textarea className={inputCls} rows={3} value={editForm.interpretation} onChange={e => setEditForm(f => ({ ...f, interpretation: e.target.value }))} />
          ) : (
            <p className="text-sm text-primary leading-relaxed">{obligation.interpretation || <span className="text-subtle italic">Not set</span>}</p>
          )}
        </div>

        {/* Implementation notes */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Implementation notes</h3>
          {editing ? (
            <textarea className={inputCls} rows={3} value={editForm.implementation_notes} onChange={e => setEditForm(f => ({ ...f, implementation_notes: e.target.value }))} />
          ) : (
            <p className="text-sm text-primary leading-relaxed">{obligation.implementation_notes || <span className="text-subtle italic">Not set</span>}</p>
          )}
        </div>

        {/* Owner & review */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Owner</h3>
            {editing ? (
              <input className={inputCls} value={editForm.owner} onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))} />
            ) : (
              <p className="text-sm text-primary">{obligation.owner || <span className="text-subtle italic">Unassigned</span>}</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Review due</h3>
            {editing ? (
              <input type="date" className={inputCls} value={editForm.review_due} onChange={e => setEditForm(f => ({ ...f, review_due: e.target.value }))} />
            ) : (
              <ReviewDue date={obligation.review_due} />
            )}
          </div>
        </div>

        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Risk rating</label>
              <select className={inputCls} value={editForm.risk_rating} onChange={e => setEditForm(f => ({ ...f, risk_rating: e.target.value }))}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="under_review">Under Review</option>
                <option value="not_applicable">Not Applicable</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>
          </div>
        )}

        {editing && (
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded text-muted hover:text-primary">Cancel</button>
            <button onClick={saveEdit} disabled={loading} className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

        {/* Controls */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Controls ({(obligation.controls || []).length})</h3>
            <button onClick={() => setLinkOpen(v => !v)} className="text-xs text-slate-600 hover:text-slate-800 font-medium">+ Link control</button>
          </div>

          {linkOpen && (
            <div className="mb-3 border border-gray-200 rounded p-3 bg-gray-50">
              <input
                autoFocus
                className={inputCls + ' mb-2'}
                placeholder="Search controls…"
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 && <p className="text-xs text-subtle">No unlinked controls found</p>}
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => linkControl(c.id)}
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-white rounded border border-transparent hover:border-gray-200 transition-colors"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted ml-2">{label(c.control_type)} · {label(c.frequency)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(obligation.controls || []).length === 0 ? (
            <p className="text-sm text-subtle italic">No controls linked</p>
          ) : (
            <div className="space-y-2">
              {(obligation.controls || []).map(c => (
                <div key={c.id} className="border border-gray-200 rounded p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-primary">{c.name}</span>
                        <ControlTypeBadge value={c.control_type} />
                        <StatusBadge value={c.status} />
                      </div>
                      <p className="text-xs text-muted mt-0.5">{label(c.frequency)} · {c.owner || 'No owner'}</p>
                      {c.evidence_description && <p className="text-xs text-subtle mt-1">{c.evidence_description}</p>}
                    </div>
                    <button onClick={() => unlinkControl(c.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Unlink</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <button onClick={toggleHistory} className="flex items-center gap-1 text-xs font-semibold text-muted uppercase tracking-wide hover:text-primary">
            <span>{historyOpen ? '▾' : '▸'}</span> History
          </button>
          {historyOpen && (
            <div className="mt-2">
              {history === null ? (
                <p className="text-xs text-subtle">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-subtle italic">No history recorded</p>
              ) : (
                history.map(h => <HistoryEntry key={h.id} entry={h} />)
              )}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
