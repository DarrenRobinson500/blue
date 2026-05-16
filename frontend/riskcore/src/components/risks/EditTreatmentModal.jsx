import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { apiFetch } from '../../auth'
import { patchTreatment } from '../../hooks/useTreatments'

const STATUSES = ['not_started', 'in_progress', 'complete']
const RATINGS = ['low', 'medium', 'high', 'critical']

export default function EditTreatmentModal({ treatment, users, onClose, onSaved }) {
  const [controls, setControls] = useState([])
  const [form, setForm] = useState({
    title: treatment.title,
    description: treatment.description,
    owner: treatment.owner || '',
    due_date: treatment.due_date || '',
    status: ['overdue', 'not_started', 'in_progress', 'complete'].includes(treatment.status)
      ? (treatment.status === 'overdue' ? 'in_progress' : treatment.status)
      : treatment.status,
    expected_residual_rating: treatment.expected_residual_rating,
    linked_control: treatment.linked_control || '',
    completion_notes: treatment.completion_notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/controls-list/').then(r => r?.json()).then(d => d && setControls(d))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const saved = await patchTreatment(treatment.id, {
        ...form,
        owner: form.owner ? Number(form.owner) : null,
        due_date: form.due_date || null,
        linked_control: form.linked_control ? Number(form.linked_control) : null,
      })
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e.message || 'Error saving')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title="Edit treatment" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Expected residual rating</label>
            <select className={inputCls} value={form.expected_residual_rating} onChange={e => set('expected_residual_rating', e.target.value)}>
              {RATINGS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
        </div>
        {form.status === 'complete' && (
          <div>
            <label className={labelCls}>Completion notes</label>
            <textarea className={inputCls} rows={2} value={form.completion_notes} onChange={e => set('completion_notes', e.target.value)} />
          </div>
        )}
        <div>
          <label className={labelCls}>Linked control <span className="font-normal text-gray-400">(optional)</span></label>
          <select className={inputCls} value={form.linked_control} onChange={e => set('linked_control', e.target.value)}>
            <option value="">None</option>
            {controls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
