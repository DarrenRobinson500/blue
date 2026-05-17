import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

const APPS = [
  { key: 'risk', label: 'Risk' },
  { key: 'project', label: 'Project' },
  { key: 'actuarial', label: 'Actuarial' },
  { key: 'admin', label: 'Admin' },
]

export default function AuthorityPage() {
  const [functions, setFunctions] = useState([])
  const [access, setAccess] = useState(new Set())
  const [saving, setSaving] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/core/functions/?is_active=all').then(r => r.json()),
      apiFetch('/api/core/authority/').then(r => r.json()),
    ]).then(([fns, acc]) => {
      setFunctions(fns)
      setAccess(new Set(acc.map(a => `${a.function_id}:${a.app}`)))
      setLoading(false)
    })
  }, [])

  const toggle = async (functionId, app) => {
    const key = `${functionId}:${app}`
    const granted = !access.has(key)
    setSaving(key)
    const next = new Set(access)
    if (granted) next.add(key); else next.delete(key)
    setAccess(next)
    await apiFetch('/api/core/authority/', {
      method: 'POST',
      body: JSON.stringify({ function_id: functionId, app, granted }),
    })
    setSaving(null)
  }

  if (loading) return <div className="p-8 text-sm text-muted">Loading…</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-primary">Authority</h1>
        <p className="text-sm text-muted mt-0.5">Control which functions have access to each app.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted pb-3 pr-8 min-w-48">Function</th>
              {APPS.map(app => (
                <th key={app.key} className="text-center text-xs font-medium text-muted pb-3 px-6 min-w-24">
                  {app.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {functions.map(fn => (
              <tr key={fn.id} className="hover:bg-gray-50">
                <td className="py-3 pr-8">
                  <span className="font-medium text-primary">{fn.name}</span>
                  <span className="ml-2 text-xs text-muted font-mono">{fn.code}</span>
                </td>
                {APPS.map(app => {
                  const key = `${fn.id}:${app.key}`
                  const checked = access.has(key)
                  return (
                    <td key={app.key} className="py-3 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving === key}
                        onChange={() => toggle(fn.id, app.key)}
                        className="w-4 h-4 rounded border-gray-300 text-slate-700 cursor-pointer disabled:opacity-50"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {functions.length === 0 && (
          <p className="text-sm text-muted italic mt-4">No functions found.</p>
        )}
      </div>
    </div>
  )
}
