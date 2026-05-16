import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { apiFetch } from '../../auth'

const ROLES = ['preventive', 'detective', 'corrective']
const EFFECTIVENESS = ['strong', 'adequate', 'weak', 'untested']
const STATUS_CLS = {
  operating: 'text-teal-600',
  not_operating: 'text-red-500',
  not_tested: 'text-amber-600',
  retired: 'text-gray-400',
}

export default function LinkControlModal({ risk, onClose, onLinked }) {
  const [controls, setControls] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ control_id: '', control_role: 'preventive', effectiveness: 'adequate', linkage_notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/controls-list/').then(r => r?.json()).then(d => d && setControls(d))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filtered = controls.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const submit = async () => {
    if (!form.control_id) { setError('Please select a control.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/api/risks/${risk.id}/link_control/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, control_id: Number(form.control_id) }),
      })
      const data = await res.json()
      if (res.ok) { onLinked(data); onClose() }
      else setError(data.error || JSON.stringify(data))
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title="Link existing control" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Control</label>
          <input
            className={inputCls}
            placeholder="Search controls…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded">
            {filtered.map(c => (
              <label
                key={c.id}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 ${form.control_id === String(c.id) ? 'bg-slate-50' : ''}`}
              >
                <input
                  type="radio"
                  name="control"
                  value={c.id}
                  checked={form.control_id === String(c.id)}
                  onChange={() => set('control_id', String(c.id))}
                />
                <div className="min-w-0">
                  <span className="text-primary">{c.name}</span>
                  <span className={`ml-2 text-xs ${STATUS_CLS[c.status] || 'text-gray-500'}`}>{c.status?.replace('_', ' ')}</span>
                </div>
              </label>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted">No controls match.</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Control role</label>
            <select className={inputCls} value={form.control_role} onChange={e => set('control_role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Effectiveness for this risk</label>
            <select className={inputCls} value={form.effectiveness} onChange={e => set('effectiveness', e.target.value)}>
              {EFFECTIVENESS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Linkage notes</label>
          <textarea className={inputCls} rows={2} value={form.linkage_notes} onChange={e => set('linkage_notes', e.target.value)} placeholder="How does this control specifically address this risk?" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Linking…' : 'Link control'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
