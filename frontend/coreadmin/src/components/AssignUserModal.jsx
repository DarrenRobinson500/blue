import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

export default function AssignUserModal({ functionId, functionName, currentUserIds, onClose, onAssigned }) {
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/api/core/users/').then(r => r?.json()).then(data => {
      if (data) setUsers(data.filter(u => !currentUserIds.includes(u.id)))
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!selectedUserId) { setError('Please select a user.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch(`/api/core/users/${selectedUserId}/assign-function/`, {
        method: 'POST',
        body: JSON.stringify({ function_id: functionId, start_date: startDate, notes }),
      })
      const data = await res.json()
      if (res.ok) {
        onAssigned()
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
          <h2 className="font-semibold text-primary">Assign user to {functionName}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">User <span className="text-red-500">*</span></label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600 bg-white"
            >
              <option value="">Select a user…</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Effective date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
            />
          </div>
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
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
