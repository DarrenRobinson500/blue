import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { apiFetch } from '../../auth'

const VELOCITIES = ['high', 'medium', 'low']

export default function AddRiskModal({ categories, onClose, onCreated }) {
  const [obligations, setObligations] = useState([])
  const [functions, setFunctions] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', category: categories[0]?.id || '',
    owner: '', velocity: 'medium',
    risk_type: 'bau', project: '',
    linked_obligations: [], notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/obligations-list/').then(r => r?.json()).then(d => d && setObligations(d))
    apiFetch('/api/core/functions/?is_active=true').then(r => r?.json()).then(d => d && setFunctions(d))
    apiFetch('/api/project/projects/').then(r => r?.json()).then(d => d && setProjects(d))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleObligation = (id) => setForm(f => ({
    ...f,
    linked_obligations: f.linked_obligations.includes(id)
      ? f.linked_obligations.filter(x => x !== id)
      : [...f.linked_obligations, id],
  }))

  const submit = async () => {
    if (!form.title || !form.description || !form.category) {
      setError('Title, description, and category are required.')
      return
    }
    if (['execution', 'delivered'].includes(form.risk_type) && !form.project) {
      setError('A project must be linked for Execution and Delivered risks.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/risks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category: Number(form.category),
          owner: form.owner ? Number(form.owner) : null,
          project: form.project ? Number(form.project) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onCreated(data)
        onClose()
      } else {
        setError(JSON.stringify(data))
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title="Add risk" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Description *</label>
          <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Category *</label>
          <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Owner (function)</label>
            <select className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)}>
              <option value="">Unassigned</option>
              {functions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Velocity</label>
            <select className={inputCls} value={form.velocity} onChange={e => set('velocity', e.target.value)}>
              {VELOCITIES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Risk type</label>
          <select className={inputCls} value={form.risk_type} onChange={e => set('risk_type', e.target.value)}>
            <option value="bau">BAU</option>
            <option value="execution">Execution</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        {['execution', 'delivered'].includes(form.risk_type) && (
          <div>
            <label className={labelCls}>
              Linked project *
            </label>
            <select className={inputCls} value={form.project} onChange={e => set('project', e.target.value)}>
              <option value="">— select project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}{!p.active ? ' (inactive)' : ''}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Linked obligations</label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
            {obligations.length === 0 && <p className="text-xs text-muted italic">Loading obligations…</p>}
            {obligations.map(o => (
              <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.linked_obligations.includes(o.id)}
                  onChange={() => toggleObligation(o.id)}
                />
                <span className="font-mono text-primary">{o.reference}</span>
                <span className="text-muted">{o['source__name']}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create risk'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
