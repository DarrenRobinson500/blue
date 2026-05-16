import { useState } from 'react'
import { apiFetch } from '../api'

const CODE_RE = /^[A-Z][A-Z0-9_]*$/

export default function NewFunctionModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Name is required.'
    if (!code.trim()) e.code = 'Code is required.'
    else if (!CODE_RE.test(code)) e.code = 'Must match A-Z, 0-9, _ and start with a letter.'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setSaving(true)
    try {
      const res = await apiFetch('/api/core/functions/', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), code, description: description.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        onCreated(data)
      } else {
        const serverErrors = {}
        if (data.name) serverErrors.name = data.name[0]
        if (data.code) serverErrors.code = data.code[0]
        if (data.non_field_errors) serverErrors._general = data.non_field_errors[0]
        setErrors(serverErrors)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-primary">New function</h2>
          <button onClick={onClose} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
              placeholder="e.g. Head of Claims"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Code <span className="text-red-500">*</span></label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              maxLength={50}
              className="w-full border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-600"
              placeholder="e.g. HEAD_CLAIMS"
            />
            <p className="text-xs text-muted mt-1">Short identifier. Cannot be changed after creation.</p>
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
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
          {errors._general && <p className="text-sm text-red-600">{errors._general}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-primary border border-border rounded transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create function'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
