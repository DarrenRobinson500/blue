import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../auth'
import StatTile from '../components/StatTile'
import { ImportStatusBadge, Pill, label } from '../components/Badge'
import ImportPanel from '../components/ImportPanel'
import SchemaPanel from '../components/SchemaPanel'
import NewImportModal from '../components/NewImportModal'
import NewSchemaModal from '../components/NewSchemaModal'

const STATUS_OPTIONS = ['validated', 'failed', 'pending', 'parsing', 'superseded']

export default function DataInputPage({ addImportTrigger, addSchemaTrigger }) {
  const [tab, setTab] = useState('imports')
  const [stats, setStats] = useState(null)
  const [imports, setImports] = useState([])
  const [schemas, setSchemas] = useState([])

  // filters
  const [filterSchema, setFilterSchema] = useState('')
  const [filterStatus, setFilterStatus] = useState([])
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterActive, setFilterActive] = useState('')

  // panels / modals
  const [selectedImport, setSelectedImport] = useState(null)
  const [selectedSchema, setSelectedSchema] = useState(null)
  const [showNewImport, setShowNewImport] = useState(false)
  const [showNewSchema, setShowNewSchema] = useState(false)

  const loadStats = async () => {
    const res = await apiFetch('/api/actuarial/stats/')
    if (res?.ok) setStats(await res.json())
  }

  const loadImports = async () => {
    const res = await apiFetch('/api/actuarial/imports/')
    if (res?.ok) {
      const d = await res.json()
      setImports(d.results ?? d)
    }
  }

  const loadSchemas = async () => {
    const res = await apiFetch('/api/actuarial/schemas/')
    if (res?.ok) {
      const d = await res.json()
      setSchemas(d.results ?? d)
    }
  }

  useEffect(() => {
    loadStats()
    loadImports()
    loadSchemas()
  }, [])

  // wire external triggers from App.jsx
  useEffect(() => { if (addImportTrigger) setShowNewImport(true) }, [addImportTrigger])
  useEffect(() => { if (addSchemaTrigger) setShowNewSchema(true) }, [addSchemaTrigger])

  const handleImportCreated = (imp) => {
    setImports(prev => [imp, ...prev])
    loadStats()
  }

  const handleSchemaCreated = (schema) => {
    setSchemas(prev => [schema, ...prev])
    loadStats()
  }

  const handleNewVersion = (newSchema) => {
    setSchemas(prev => prev.map(s => s.id === newSchema.id ? newSchema : s).concat(
      prev.find(s => s.id === newSchema.id) ? [] : [newSchema]
    ))
    setSelectedSchema(newSchema)
  }

  // re-fetch selected import when panel is open (status may change)
  const refreshSelectedImport = useCallback(async () => {
    if (!selectedImport) return
    const res = await apiFetch(`/api/actuarial/imports/${selectedImport.id}/`)
    if (res?.ok) {
      const d = await res.json()
      setSelectedImport(d)
      setImports(prev => prev.map(i => i.id === d.id ? d : i))
    }
  }, [selectedImport?.id])

  // filtered imports
  const visibleImports = imports.filter(i => {
    if (filterSchema && i.schema !== Number(filterSchema)) return false
    if (filterStatus.length && !filterStatus.includes(i.status)) return false
    if (filterDateFrom && i.data_date < filterDateFrom) return false
    if (filterDateTo && i.data_date > filterDateTo) return false
    return true
  })

  // filtered schemas
  const visibleSchemas = schemas.filter(s => {
    if (filterActive === 'active' && !s.is_active) return false
    if (filterActive === 'inactive' && s.is_active) return false
    return true
  })

  const toggleStatus = (s) =>
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const importsBadge = imports.filter(i => ['validated', 'failed'].includes(i.status)).length
  const schemasBadge = schemas.filter(s => s.is_active).length

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Active schemas" value={stats?.active_schemas} />
        <StatTile label="Total imports" value={stats?.total_imports} />
        <StatTile label="Validated" value={stats?.validated_imports} accent="text-green-600" />
        <StatTile label="Failed" value={stats?.failed_imports} accent={stats?.failed_imports > 0 ? 'text-red-600' : undefined} />
        <StatTile label="Latest data date" value={stats?.latest_data_date || '—'} />
        <StatTile label="Policy records" value={stats?.total_policy_records?.toLocaleString()} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'imports', label: 'Data imports', badge: importsBadge },
            { key: 'schemas', label: 'Schema library', badge: schemasBadge },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs rounded-full px-2 py-0.5 font-semibold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Data imports tab */}
      {tab === 'imports' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-muted mb-1">Schema</label>
              <select
                className="border border-gray-200 rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={filterSchema}
                onChange={e => setFilterSchema(e.target.value)}
              >
                <option value="">All schemas</option>
                {schemas.map(s => (
                  <option key={s.id} value={s.id}>{s.name} v{s.version}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Date from</label>
              <input
                type="date"
                className="border border-gray-200 rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Date to</label>
              <input
                type="date"
                className="border border-gray-200 rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Status</label>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      filterStatus.includes(s)
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-muted hover:border-gray-400'
                    }`}
                  >
                    {label(s)}
                  </button>
                ))}
              </div>
            </div>
            {(filterSchema || filterStatus.length || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterSchema(''); setFilterStatus([]); setFilterDateFrom(''); setFilterDateTo('') }}
                className="text-xs text-red-500 hover:text-red-700 pb-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Import cards */}
          {visibleImports.length === 0 ? (
            <p className="text-sm text-muted italic">No imports match the current filters.</p>
          ) : (
            <div className="space-y-2">
              {visibleImports.map(imp => (
                <div
                  key={imp.id}
                  onClick={() => setSelectedImport(imp)}
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-semibold text-primary truncate">{imp.import_reference}</span>
                      <ImportStatusBadge value={imp.status} />
                      <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-medium">{imp.data_date}</span>
                    </div>
                    <div className="text-xs text-muted shrink-0">
                      {imp.uploaded_at ? new Date(imp.uploaded_at).toLocaleDateString('en-AU') : ''}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4">
                    <span className="text-xs text-muted">{imp.schema_name} v{imp.schema_version}</span>
                    {imp.status === 'validated' && (
                      <>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-green-700">{imp.row_count_valid?.toLocaleString()} valid</span>
                        {imp.row_count_error > 0 && (
                          <>
                            <span className="text-xs text-muted">·</span>
                            <span className="text-xs text-red-600">{imp.row_count_error} errors</span>
                          </>
                        )}
                      </>
                    )}
                    {imp.uploaded_by_email && (
                      <>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted">{imp.uploaded_by_email}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schema library tab */}
      {tab === 'schemas' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex gap-2">
            {[
              { v: '', l: 'All' },
              { v: 'active', l: 'Active' },
              { v: 'inactive', l: 'Inactive' },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => setFilterActive(opt.v)}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  filterActive === opt.v
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-muted hover:border-gray-400'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {/* Schema cards */}
          {visibleSchemas.length === 0 ? (
            <p className="text-sm text-muted italic">No schemas found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleSchemas.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSchema(s)}
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary truncate">{s.name}</span>
                        <Pill label={`v${s.version}`} colour="bg-indigo-50 text-indigo-700" />
                        <Pill
                          label={s.is_active ? 'Active' : 'Inactive'}
                          colour={s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                        />
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {s.product_code} · {label(s.file_format)} · {s.field_count} fields
                      </p>
                    </div>
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted mt-2 line-clamp-2">{s.description}</p>
                  )}
                  <p className="text-xs text-muted mt-2">
                    Created {s.created_at ? new Date(s.created_at).toLocaleDateString('en-AU') : '—'}
                    {s.created_by_email ? ` by ${s.created_by_email}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail panels */}
      {selectedImport && (
        <ImportPanel
          importData={selectedImport}
          onClose={() => { setSelectedImport(null); loadStats() }}
        />
      )}
      {selectedSchema && (
        <SchemaPanel
          schema={selectedSchema}
          imports={imports}
          onClose={() => setSelectedSchema(null)}
          onNewVersion={handleNewVersion}
        />
      )}

      {/* Modals */}
      {showNewImport && schemas.length > 0 && (
        <NewImportModal
          schemas={schemas}
          onClose={() => setShowNewImport(false)}
          onCreated={handleImportCreated}
        />
      )}
      {showNewSchema && (
        <NewSchemaModal
          onClose={() => setShowNewSchema(false)}
          onCreated={handleSchemaCreated}
        />
      )}
    </div>
  )
}
