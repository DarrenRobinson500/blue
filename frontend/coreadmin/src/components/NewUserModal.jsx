import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

export default function NewUserModal({ onClose, onCreated }) {
  const [username, setUsername] = useState('')
  const [functionId, setFunctionId] = useState('')
  const [functions, setFunctions] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/api/core/functions/').then(r => r?.json()).then(d => { if (d) setFunctions(d) })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim()) { setError('Username is required.'); return }
    if (!functionId) { setError('Please select a function.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch('/api/core/provisioned-users/', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim().toLowerCase(), function_id: Number(functionId) }),
      })
      const data = await res.json()
      if (res.ok) {
        onCreated(data)
      } else {
        setError(data.username?.[0] || data.function_id?.[0] || data.detail || 'Something went wrong.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-primary">New user</h2>
          <button onClick={onClose} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Username <span className="text-red-500">*</span></label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="off"
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
              placeholder="e.g. jsmith"
            />
            <p className="text-xs text-muted mt-1">The person will use this to log in.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Function <span className="text-red-500">*</span></label>
            <select
              value={functionId}
              onChange={e => setFunctionId(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600 bg-white"
            >
              <option value="">Select a function…</option>
              {functions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-primary border border-border rounded transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
