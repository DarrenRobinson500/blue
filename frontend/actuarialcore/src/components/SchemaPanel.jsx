import { useState } from 'react'
import Panel from './Panel'
import { ImportStatusBadge, Pill, label } from './Badge'
import { useApi } from '../hooks/useApi'

export default function SchemaPanel({ schema, imports, onClose, onNewVersion }) {
  const { request, loading } = useApi()

  const handleNewVersion = async () => {
    const data = await request(`/api/actuarial/schemas/${schema.id}/new-version/`, { method: 'POST' })
    if (data) onNewVersion(data)
  }

  const validationSummary = (field) => {
    const parts = []
    if (field.min_value !== null && field.min_value !== undefined) parts.push(`min: ${field.min_value}`)
    if (field.max_value !== null && field.max_value !== undefined) parts.push(`max: ${field.max_value}`)
    if (field.max_length) parts.push(`maxLen: ${field.max_length}`)
    if (field.allowed_values) parts.push(`in: [${field.allowed_values.join(', ')}]`)
    if (field.date_format) parts.push(field.date_format)
    return parts.join(' · ') || '—'
  }

  const schemaImports = (imports || []).filter(i => i.schema === schema.id)

  return (
    <Panel onClose={onClose}>
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-primary">{schema.name}</span>
              <Pill label={`v${schema.version}`} colour="bg-indigo-50 text-indigo-700" />
              <Pill label={schema.is_active ? 'Active' : 'Inactive'} colour={schema.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} />
              <Pill label={label(schema.file_format)} colour="bg-gray-100 text-gray-600" />
            </div>
            <p className="text-xs text-muted mt-1">{schema.product_code} · {schema.field_count} fields</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {schema.is_active && (
              <button
                onClick={handleNewVersion}
                disabled={loading}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:border-gray-400 text-primary disabled:opacity-50"
              >
                New version
              </button>
            )}
            <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none">&times;</button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-6">
        {/* Metadata */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Metadata</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {schema.description && <><div className="text-muted col-span-2">Description</div><div className="text-primary col-span-2">{schema.description}</div></>}
            <div className="text-muted">Delimiter</div><div className="text-primary font-mono">'{schema.delimiter}'</div>
            <div className="text-muted">Header row</div><div className="text-primary">{schema.has_header_row ? 'Yes' : 'No'}</div>
            <div className="text-muted">Encoding</div><div className="text-primary">{schema.encoding}</div>
            <div className="text-muted">Created by</div><div className="text-primary">{schema.created_by_email || '—'}</div>
            <div className="text-muted">Created at</div><div className="text-primary">{schema.created_at ? new Date(schema.created_at).toLocaleDateString('en-AU') : '—'}</div>
          </div>
          {schema.notes && <p className="mt-2 text-sm text-primary bg-gray-50 border border-gray-200 rounded p-3">{schema.notes}</p>}
        </div>

        {/* Field definitions */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Field definitions</h3>
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Field name', 'Display name', 'Type', 'Req', 'PK', 'Validation'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(schema.fields_list || []).map(f => (
                  <tr key={f.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-muted">{f.field_order}</td>
                    <td className="px-3 py-2 font-mono text-xs text-primary">{f.field_name}</td>
                    <td className="px-3 py-2 text-primary">{f.display_name}</td>
                    <td className="px-3 py-2">
                      <Pill label={label(f.data_type)} colour="bg-blue-50 text-blue-700" />
                    </td>
                    <td className="px-3 py-2 text-center">{f.is_required ? '✓' : ''}</td>
                    <td className="px-3 py-2 text-center">{f.is_primary_key ? '✓' : ''}</td>
                    <td className="px-3 py-2 text-xs text-muted">{validationSummary(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import history */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Import history ({schemaImports.length})
          </h3>
          {schemaImports.length === 0 ? (
            <p className="text-sm text-subtle italic">No imports yet</p>
          ) : (
            <div className="space-y-2">
              {schemaImports.map(i => (
                <div key={i.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{i.import_reference}</span>
                      <ImportStatusBadge value={i.status} />
                    </div>
                    <span className="text-xs text-muted">{i.data_date}</span>
                  </div>
                  {i.status === 'validated' && (
                    <p className="text-xs text-muted mt-0.5">
                      {i.row_count_raw?.toLocaleString()} records · {i.row_count_error} errors
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
