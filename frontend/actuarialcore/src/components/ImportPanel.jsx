import { useState, useEffect } from 'react'
import Panel from './Panel'
import { ImportStatusBadge, label } from './Badge'
import { apiFetch } from '../auth'
import { useApi } from '../hooks/useApi'

function RecordDetail({ record, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <span className="text-sm font-semibold text-primary">Row {record.row_number}</span>
            <span className="text-xs text-muted ml-2">PK: {record.primary_key_value}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(record.data).map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 text-muted font-medium w-40 align-top">{k}</td>
                  <td className="py-2 text-primary font-mono">{v === null || v === undefined ? <span className="text-subtle italic">null</span> : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ImportPanel({ importData: initial, onClose }) {
  const [importData, setImportData] = useState(initial)
  const [errors, setErrors] = useState(null)
  const [records, setRecords] = useState(null)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordFilter, setRecordFilter] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [errorsPage, setErrorsPage] = useState(1)
  const [errorsTotal, setErrorsTotal] = useState(0)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(initial.notes || '')
  const { request } = useApi()

  useEffect(() => { setImportData(initial); setNotesValue(initial.notes || '') }, [initial])

  const loadErrors = async (page = 1) => {
    const res = await apiFetch(`/api/actuarial/imports/${importData.id}/errors/?page=${page}`)
    if (res?.ok) {
      const d = await res.json()
      setErrors(d.results)
      setErrorsTotal(d.count)
      setErrorsPage(page)
    }
  }

  const loadRecords = async (page = 1, filter = recordFilter) => {
    const qs = filter ? `&has_errors=${filter}` : ''
    const res = await apiFetch(`/api/actuarial/imports/${importData.id}/records/?page=${page}${qs}`)
    if (res?.ok) {
      const d = await res.json()
      setRecords(d.results)
      setRecordsTotal(d.count)
      setRecordsPage(page)
    }
  }

  useEffect(() => {
    loadErrors()
    if (importData.status === 'validated') loadRecords()
  }, [importData.id])

  const saveNotes = async () => {
    await request(`/api/actuarial/imports/${importData.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: notesValue }),
    })
    setImportData(d => ({ ...d, notes: notesValue }))
    setEditingNotes(false)
  }

  const errorTypeCls = (t) => {
    const m = { missing_required: 'text-red-600', wrong_type: 'text-orange-600', out_of_range: 'text-amber-600', invalid_value: 'text-purple-600', duplicate_primary_key: 'text-red-600', row_level: 'text-red-600' }
    return m[t] || 'text-gray-600'
  }

  return (
    <Panel onClose={onClose}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-primary">{importData.import_reference}</span>
          <ImportStatusBadge value={importData.status} />
          <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-medium">{importData.data_date}</span>
        </div>
        <p className="text-xs text-muted mt-1">{importData.schema_name} · {importData.product_code}</p>
      </div>

      <div className="flex-1 px-6 py-5 space-y-6">

        {/* Section 1 — Summary */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Summary</h3>
          {importData.status === 'validated' && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total rows', value: importData.row_count_raw },
                { label: 'Valid', value: importData.row_count_valid, colour: 'text-green-600' },
                { label: 'Errors', value: importData.row_count_error, colour: importData.row_count_error > 0 ? 'text-red-600' : 'text-green-600' },
              ].map(t => (
                <div key={t.label} className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                  <p className={`text-xl font-semibold ${t.colour || 'text-primary'}`}>{t.value}</p>
                  <p className="text-xs text-muted mt-0.5">{t.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="text-muted">Uploaded by</div>
            <div className="text-primary">{importData.uploaded_by_email || '—'}</div>
            <div className="text-muted">Uploaded at</div>
            <div className="text-primary">{importData.uploaded_at ? new Date(importData.uploaded_at).toLocaleString('en-AU') : '—'}</div>
            {importData.parse_started_at && <>
              <div className="text-muted">Parse started</div>
              <div className="text-primary">{new Date(importData.parse_started_at).toLocaleString('en-AU')}</div>
            </>}
            {importData.parse_completed_at && <>
              <div className="text-muted">Parse completed</div>
              <div className="text-primary">{new Date(importData.parse_completed_at).toLocaleString('en-AU')}</div>
            </>}
          </div>

          {/* Notes */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Notes</span>
              {!editingNotes && <button onClick={() => setEditingNotes(true)} className="text-xs text-indigo-600 hover:text-indigo-700">Edit</button>}
            </div>
            {editingNotes ? (
              <div className="mt-1 space-y-2">
                <textarea
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  rows={3}
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
                  <button onClick={() => { setEditingNotes(false); setNotesValue(importData.notes || '') }} className="px-3 py-1.5 text-xs border border-gray-200 rounded text-muted">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-primary">{importData.notes || <span className="text-subtle italic">No notes</span>}</p>
            )}
          </div>
        </div>

        {/* Superseded banner */}
        {importData.status === 'superseded' && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            This import has been superseded by a more recent validated import for the same data date. It is retained for audit purposes.
          </div>
        )}

        {/* Section 2 — Validation errors */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Validation errors {errorsTotal > 0 && <span className="text-red-600">({errorsTotal})</span>}
          </h3>
          {errors === null ? (
            <p className="text-sm text-subtle">Loading…</p>
          ) : errors.length === 0 ? (
            <p className="text-sm text-green-600">No validation errors — all records passed.</p>
          ) : (
            <>
              <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {['Row', 'Field', 'Type', 'Raw value', 'Message'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errors.map(e => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-muted">{e.row_number || 'FILE'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.field_name}</td>
                      <td className={`px-3 py-2 text-xs font-medium ${errorTypeCls(e.error_type)}`}>{label(e.error_type)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600 max-w-[8rem] truncate">{e.raw_value || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errorsTotal > 100 && (
                <div className="flex items-center gap-3 mt-2 text-sm text-muted">
                  <button disabled={errorsPage === 1} onClick={() => loadErrors(errorsPage - 1)} className="disabled:opacity-40">←</button>
                  <span>Page {errorsPage} of {Math.ceil(errorsTotal / 100)}</span>
                  <button disabled={errorsPage * 100 >= errorsTotal} onClick={() => loadErrors(errorsPage + 1)} className="disabled:opacity-40">→</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section 3 — Records */}
        {importData.status === 'validated' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
                Records ({recordsTotal})
              </h3>
              <div className="flex gap-2">
                {['', 'true', 'false'].map(v => (
                  <button
                    key={v}
                    onClick={() => { setRecordFilter(v); loadRecords(1, v) }}
                    className={`px-2.5 py-1 text-xs rounded border ${recordFilter === v ? 'border-indigo-400 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-muted hover:border-gray-400'}`}
                  >
                    {v === '' ? 'All' : v === 'true' ? 'Errors only' : 'Clean only'}
                  </button>
                ))}
              </div>
            </div>
            {records === null ? (
              <p className="text-sm text-subtle">Loading…</p>
            ) : (
              <>
                <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted w-12">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Primary key</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted w-16">Errors</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">First values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => {
                      const first3 = Object.entries(r.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')
                      return (
                        <tr
                          key={r.id}
                          className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${r.has_errors ? 'bg-red-50' : ''}`}
                          onClick={() => setSelectedRecord(r)}
                        >
                          <td className="px-3 py-2 text-muted">{r.row_number}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.primary_key_value}</td>
                          <td className="px-3 py-2">
                            {r.has_errors
                              ? <span className="text-xs text-red-600 font-medium">Yes</span>
                              : <span className="text-xs text-green-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted truncate max-w-xs">{first3}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {recordsTotal > 200 && (
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted">
                    <button disabled={recordsPage === 1} onClick={() => loadRecords(recordsPage - 1)} className="disabled:opacity-40">←</button>
                    <span>Page {recordsPage} of {Math.ceil(recordsTotal / 200)}</span>
                    <button disabled={recordsPage * 200 >= recordsTotal} onClick={() => loadRecords(recordsPage + 1)} className="disabled:opacity-40">→</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selectedRecord && <RecordDetail record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </Panel>
  )
}
