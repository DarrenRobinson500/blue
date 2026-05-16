import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { apiFetch } from '../../auth'

const RATINGS = ['low', 'medium', 'high', 'critical']

export default function AddTreatmentModal({ risk, users, onClose, onCreated }) {
  const [controls, setControls] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', owner: '', due_date: '',
    expected_residual_rating: 'low', linked_control: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/controls-list/').then(r => r?.json()).then(d => d && setControls(d))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title || !form.description) { setError('Title and description are required.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/api/risks/${risk.id}/treatments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          owner: form.owner ? Number(form.owner) : null,
          due_date: form.due_date || null,
          expected_residual_rating: form.expected_residual_rating,
          linked_control: form.linked_control ? Number(form.linked_control) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) { onCreated(data); onClose() }
      else setError(JSON.stringify(data))
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title={`Add treatment — ${risk.title}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Description *</label>
          <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Owner</label>
            <select className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Due date</label>
            <input type="date" className={inputCls} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Expected residual rating after treatment</label>
          <select className={inputCls} value={form.expected_residual_rating} onChange={e => set('expected_residual_rating', e.target.value)}>
            {RATINGS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Link to a control being implemented by this treatment <span className="font-normal text-gray-400">(optional)</span></label>
          <select className={inputCls} value={form.linked_control} onChange={e => set('linked_control', e.target.value)}>
            <option value="">None</option>
            {controls.map(c => <option key={c.id} value={c.id}>{c.name} — {c.status}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add treatment'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
