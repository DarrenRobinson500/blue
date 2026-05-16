import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

export default function AssignFunctionModal({ user, onClose, onAssigned }) {
  const [functions, setFunctions] = useState([])
  const [selectedFnId, setSelectedFnId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isReassign = !!user.function
  const currentFnId = user.function?.id

  useEffect(() => {
    apiFetch('/api/core/functions/?is_active=true').then(r => r?.json()).then(data => {
      if (data) setFunctions(data.filter(f => f.id !== currentFnId))
    })
  }, [])

  const isVacant = selectedFnId === 'vacant'
  const selectedFn = functions.find(f => f.id === Number(selectedFnId))

  const submit = async (e) => {
    e.preventDefault()
    if (!selectedFnId) { setError('Please select a function.'); return }
    setSaving(true)
    setError('')
    try {
      if (isVacant && !user.function) { onAssigned(user); return }
      const path = isVacant
        ? `/api/core/users/${user.id}/remove-function/`
        : `/api/core/users/${user.id}/assign-function/`
      const body = isVacant
        ? JSON.stringify({ notes })
        : JSON.stringify({ function_id: Number(selectedFnId), start_date: startDate, notes })
      const res = await apiFetch(path, { method: 'POST', body })
      const data = await res.json()
      if (res.ok) {
        onAssigned(data)
      } else {
        setError(data.detail || 'Assignment failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-primary">
            {isReassign ? 'Reassign function' : 'Assign function'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-muted">User: <span className="font-medium text-primary">{user.email}</span></p>

          {isReassign && selectedFn && (
            <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2 text-xs text-blue-700">
              This will end the assignment as <strong>{user.function.name}</strong> and assign{' '}
              <strong>{selectedFn.name}</strong> from {startDate}.
            </div>
          )}
          {isVacant && user.function && (
            <div className="bg-amber-50 border border-amber-100 rounded px-3 py-2 text-xs text-amber-700">
              This will end the assignment as <strong>{user.function.name}</strong>. The user will have no function.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Function <span className="text-red-500">*</span></label>
            <select
              value={selectedFnId}
              onChange={e => setSelectedFnId(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600 bg-white"
            >
              <option value="">Select a function…</option>
              <option value="vacant">— Vacant (no function)</option>
              {functions.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          {!isVacant && (
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Effective date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
            />
          </div>
          )}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-primary border border-border rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : isVacant ? 'Make vacant' : isReassign ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
