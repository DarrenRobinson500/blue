import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

export default function EditFunctionModal({ fn, onClose, onSaved }) {
  const [name, setName] = useState(fn.name)
  const [description, setDescription] = useState(fn.description ?? '')
  const [isActive, setIsActive] = useState(fn.is_active)
  const [parentId, setParentId] = useState(fn.parent?.id ?? '')
  const [functions, setFunctions] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/api/core/functions/?is_active=all').then(r => r?.json()).then(d => {
      if (d) setFunctions(d.filter(f => f.id !== fn.id))
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    try {
      const res = await apiFetch(`/api/core/functions/${fn.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(), description: description.trim(), is_active: isActive,
          parent_id: parentId ? Number(parentId) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onSaved(data)
      } else {
        setError(data.name?.[0] || data.detail || 'Save failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-primary">Edit function</h2>
          <button onClick={onClose} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Code (read-only)</label>
            <div className="px-3 py-2 bg-gray-50 border border-border rounded text-sm font-mono text-muted">
              {fn.code}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Reports to</label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600 bg-white"
            >
              <option value="">None</option>
              {functions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-primary">Active</label>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-stone-700' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-primary border border-border rounded transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
