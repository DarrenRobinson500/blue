import { useState } from 'react'
import Modal from './Modal'
import { useApi } from '../hooks/useApi'

export default function AddObligationModal({ sources, onClose, onCreated }) {
  const { request, loading, error } = useApi()
  const [form, setForm] = useState({
    source: sources[0]?.id || '',
    reference: '',
    verbatim_text: '',
    interpretation: '',
    owner: '',
    implementation_notes: '',
    risk_rating: 'medium',
    status: 'active',
    review_due: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (!payload.review_due) delete payload.review_due
    const data = await request('/api/risk/obligations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (data) { onCreated(data); onClose() }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title="Add obligation" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Source *</label>
            <select className={inputCls} value={form.source} onChange={e => set('source', e.target.value)} required>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reference *</label>
            <input className={inputCls} value={form.reference} onChange={e => set('reference', e.target.value)} required placeholder="e.g. s48(1)(a)" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Verbatim text * <span className="text-gray-400 font-normal">(enter exact text from source — cannot be edited after saving)</span></label>
          <textarea className={inputCls} rows={4} value={form.verbatim_text} onChange={e => set('verbatim_text', e.target.value)} required />
        </div>

        <div>
          <label className={labelCls}>Interpretation *</label>
          <textarea className={inputCls} rows={3} value={form.interpretation} onChange={e => set('interpretation', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Owner</label>
            <input className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="e.g. Chief Risk Officer" />
          </div>
          <div>
            <label className={labelCls}>Review due</label>
            <input type="date" className={inputCls} value={form.review_due} onChange={e => set('review_due', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Risk rating *</label>
            <select className={inputCls} value={form.risk_rating} onChange={e => set('risk_rating', e.target.value)}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Status *</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="not_applicable">Not Applicable</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Implementation notes</label>
          <textarea className={inputCls} rows={3} value={form.implementation_notes} onChange={e => set('implementation_notes', e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-primary border border-gray-200 rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save obligation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
