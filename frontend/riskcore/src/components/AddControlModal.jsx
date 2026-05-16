import { useState } from 'react'
import Modal from './Modal'
import { useApi } from '../hooks/useApi'

export default function AddControlModal({ onClose, onCreated }) {
  const { request, loading, error } = useApi()
  const [form, setForm] = useState({
    name: '',
    description: '',
    control_type: 'preventive',
    frequency: 'monthly',
    owner: '',
    evidence_description: '',
    status: 'operating',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const data = await request('/api/risk/controls/', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    if (data) { onCreated(data); onClose() }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title="Add control" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Description *</label>
          <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Type *</label>
            <select className={inputCls} value={form.control_type} onChange={e => set('control_type', e.target.value)}>
              <option value="preventive">Preventive</option>
              <option value="detective">Detective</option>
              <option value="corrective">Corrective</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Frequency *</label>
            <select className={inputCls} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              <option value="continuous">Continuous</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="ad_hoc">Ad Hoc</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Owner</label>
            <input className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="operating">Operating</option>
              <option value="not_operating">Not Operating</option>
              <option value="not_tested">Not Tested</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Evidence description</label>
          <textarea className={inputCls} rows={2} value={form.evidence_description} onChange={e => set('evidence_description', e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-primary border border-gray-200 rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save control'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
