import { useState } from 'react'
import Modal from './Modal'
import { Pill, label } from './Badge'
import { getToken } from '../auth'

export default function NewImportModal({ schemas, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [selectedSchema, setSelectedSchema] = useState(schemas[0] || null)
  const [showSchemaFields, setShowSchemaFields] = useState(false)
  const [form, setForm] = useState({ import_reference: '', data_date: '', notes: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!file) { setError('Please select a file.'); return }
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('schema', selectedSchema.id)
      fd.append('import_reference', form.import_reference)
      fd.append('data_date', form.data_date)
      fd.append('notes', form.notes)
      fd.append('uploaded_file', file)

      const token = getToken()
      const res = await fetch('/api/actuarial/imports/', {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (res.ok) {
        onCreated(data)
        onClose()
      } else {
        setError(data.error || data.detail || JSON.stringify(data))
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  return (
    <Modal title={`Import data — Step ${step} of 3`} onClose={onClose}>
      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Schema *</label>
            <select
              className={inputCls}
              value={selectedSchema?.id || ''}
              onChange={e => {
                const s = schemas.find(s => s.id === Number(e.target.value))
                setSelectedSchema(s || null)
                setShowSchemaFields(false)
              }}
            >
              {schemas.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.product_code} v{s.version} ({label(s.file_format)})
                </option>
              ))}
            </select>
          </div>

          {selectedSchema && (
            <div>
              <button
                onClick={() => setShowSchemaFields(v => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showSchemaFields ? 'Hide schema definition' : 'View schema definition'}
              </button>
              {showSchemaFields && (
                <div className="mt-3 border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-muted">#</th>
                        <th className="px-3 py-2 text-left text-muted">Field</th>
                        <th className="px-3 py-2 text-left text-muted">Type</th>
                        <th className="px-3 py-2 text-left text-muted">Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSchema.fields_list || []).map(f => (
                        <tr key={f.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-muted">{f.field_order}</td>
                          <td className="px-3 py-2 font-mono">{f.field_name}</td>
                          <td className="px-3 py-2">{label(f.data_type)}</td>
                          <td className="px-3 py-2">{f.is_required ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedSchema}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Import reference *</label>
            <input
              className={inputCls}
              value={form.import_reference}
              onChange={e => set('import_reference', e.target.value)}
              placeholder={`${selectedSchema?.product_code}-YYYY-MM`}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Data date * <span className="text-gray-400 font-normal">(the date the data represents)</span></label>
            <input
              type="date"
              className={inputCls}
              value={form.data_date}
              onChange={e => set('data_date', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">← Back</button>
            <button
              onClick={() => setStep(3)}
              disabled={!form.import_reference || !form.data_date}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Select file *</label>
            <input
              type="file"
              accept=".csv,.txt"
              className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={e => setFile(e.target.files[0] || null)}
            />
            {file && <p className="mt-1 text-xs text-muted">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-muted space-y-0.5">
            <p><strong>Schema:</strong> {selectedSchema?.name} v{selectedSchema?.version}</p>
            <p><strong>Reference:</strong> {form.import_reference}</p>
            <p><strong>Data date:</strong> {form.data_date}</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">← Back</button>
            <button
              onClick={submit}
              disabled={loading || !file}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
