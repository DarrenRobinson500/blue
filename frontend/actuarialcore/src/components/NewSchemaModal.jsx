import { useState } from 'react'
import Modal from './Modal'
import { useApi } from '../hooks/useApi'

const EMPTY_FIELD = () => ({
  _id: Math.random(),
  field_name: '',
  display_name: '',
  data_type: 'string',
  date_format: '',
  is_required: true,
  is_primary_key: false,
  max_length: '',
  min_value: '',
  max_value: '',
  allowed_values_raw: '',
  notes: '',
})

export default function NewSchemaModal({ onClose, onCreated }) {
  const { request, loading, error } = useApi()
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState({
    name: '', description: '', product_code: '', file_format: 'csv',
    delimiter: ',', has_header_row: true, encoding: 'utf-8', notes: '',
  })
  const [fields, setFields] = useState([EMPTY_FIELD()])

  const setMet = (k, v) => setMeta(m => ({ ...m, [k]: v }))
  const updateField = (id, k, v) => setFields(fs => fs.map(f => f._id === id ? { ...f, [k]: v } : f))
  const addField = () => setFields(fs => [...fs, EMPTY_FIELD()])
  const removeField = (id) => setFields(fs => fs.filter(f => f._id !== id))
  const setPK = (id) => setFields(fs => fs.map(f => ({ ...f, is_primary_key: f._id === id })))

  const submit = async () => {
    const fields_list = fields.map((f, i) => ({
      field_name: f.field_name,
      display_name: f.display_name,
      field_order: i + 1,
      data_type: f.data_type,
      date_format: f.date_format || '',
      is_required: f.is_required,
      is_primary_key: f.is_primary_key,
      max_length: f.max_length ? Number(f.max_length) : null,
      min_value: f.min_value !== '' ? f.min_value : null,
      max_value: f.max_value !== '' ? f.max_value : null,
      allowed_values: f.allowed_values_raw
        ? f.allowed_values_raw.split(',').map(v => v.trim()).filter(Boolean)
        : null,
      notes: f.notes,
    }))
    const data = await request('/api/actuarial/schemas/', {
      method: 'POST',
      body: JSON.stringify({ ...meta, fields_list }),
    })
    if (data) { onCreated(data); onClose() }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'
  const miniCls = 'border border-gray-200 rounded px-2 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full'

  const metaValid = meta.name && meta.product_code
  const fieldsValid = fields.length > 0 && fields.every(f => f.field_name && f.display_name)

  return (
    <Modal title={`New schema — Step ${step} of 2`} onClose={onClose} wide>
      <div className="flex gap-2 mb-6">
        {[1, 2].map(s => (
          <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Schema name *</label>
              <input className={inputCls} value={meta.name} onChange={e => setMet('name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Product code *</label>
              <input className={inputCls} value={meta.product_code} onChange={e => setMet('product_code', e.target.value)} placeholder="e.g. TL01" required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={2} value={meta.description} onChange={e => setMet('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>File format</label>
              <select className={inputCls} value={meta.file_format} onChange={e => setMet('file_format', e.target.value)}>
                <option value="csv">CSV</option>
                <option value="fixed_width">Fixed Width</option>
              </select>
            </div>
            {meta.file_format === 'csv' && (
              <div>
                <label className={labelCls}>Delimiter</label>
                <input className={inputCls} value={meta.delimiter} onChange={e => setMet('delimiter', e.target.value)} maxLength={5} />
              </div>
            )}
            <div>
              <label className={labelCls}>Encoding</label>
              <input className={inputCls} value={meta.encoding} onChange={e => setMet('encoding', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={meta.has_header_row} onChange={e => setMet('has_header_row', e.target.checked)} className="rounded" />
              <span className="text-sm text-primary">File has header row</span>
            </label>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={meta.notes} onChange={e => setMet('notes', e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!metaValid}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Next: Define fields →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted">Define the columns in your file. Drag to reorder (coming soon).</p>
            <button onClick={addField} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add field</button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {fields.map((f, idx) => (
              <div key={f._id} className="border border-gray-200 rounded p-3 bg-gray-50">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-1 text-xs text-muted pt-2 text-center">{idx + 1}</div>
                  <div className="col-span-3">
                    <label className="block text-xs text-muted mb-0.5">Field name *</label>
                    <input className={miniCls} placeholder="field_name" value={f.field_name}
                      onChange={e => updateField(f._id, 'field_name', e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-muted mb-0.5">Display name *</label>
                    <input className={miniCls} placeholder="Display Name" value={f.display_name}
                      onChange={e => updateField(f._id, 'display_name', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-0.5">Type</label>
                    <select className={miniCls} value={f.data_type} onChange={e => updateField(f._id, 'data_type', e.target.value)}>
                      <option value="string">String</option>
                      <option value="integer">Integer</option>
                      <option value="decimal">Decimal</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1 pt-0.5">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={f.is_required} onChange={e => updateField(f._id, 'is_required', e.target.checked)} />
                      Required
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" name="pk_field" checked={f.is_primary_key} onChange={() => setPK(f._id)} />
                      Primary key
                    </label>
                  </div>
                  <div className="col-span-1 flex justify-end pt-1">
                    <button onClick={() => removeField(f._id)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                  </div>
                </div>

                {/* Expanded validation options */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {f.data_type === 'date' && (
                    <div>
                      <label className="block text-xs text-muted mb-0.5">Date format</label>
                      <input className={miniCls} placeholder="%d/%m/%Y" value={f.date_format}
                        onChange={e => updateField(f._id, 'date_format', e.target.value)} />
                    </div>
                  )}
                  {f.data_type === 'string' && (
                    <div>
                      <label className="block text-xs text-muted mb-0.5">Max length</label>
                      <input type="number" className={miniCls} value={f.max_length}
                        onChange={e => updateField(f._id, 'max_length', e.target.value)} />
                    </div>
                  )}
                  {['integer', 'decimal'].includes(f.data_type) && (
                    <>
                      <div>
                        <label className="block text-xs text-muted mb-0.5">Min value</label>
                        <input type="number" className={miniCls} value={f.min_value}
                          onChange={e => updateField(f._id, 'min_value', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-0.5">Max value</label>
                        <input type="number" className={miniCls} value={f.max_value}
                          onChange={e => updateField(f._id, 'max_value', e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-0.5">Allowed values <span className="font-normal">(comma-separated)</span></label>
                    <input className={miniCls} placeholder="M, F, U" value={f.allowed_values_raw}
                      onChange={e => updateField(f._id, 'allowed_values_raw', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">← Back</button>
            <button
              onClick={submit}
              disabled={loading || !fieldsValid}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Create schema'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
