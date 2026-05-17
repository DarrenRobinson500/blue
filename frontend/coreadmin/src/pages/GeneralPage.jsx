import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

export default function GeneralPage() {
  const [emailDomain, setEmailDomain] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/core/settings/').then(r => r?.json()).then(d => {
      if (d) setEmailDomain(d.email_domain)
      setLoading(false)
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const domain = emailDomain.trim()
    if (!domain) { setError('Domain cannot be empty.'); return }
    setSaving(true)
    setError('')
    setSaved(false)
    const res = await apiFetch('/api/core/settings/', {
      method: 'PATCH',
      body: JSON.stringify({ email_domain: domain }),
    })
    if (res?.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Failed to save.')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-lg font-semibold text-primary mb-6">General</h1>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <form onSubmit={submit} className="bg-surface border border-border rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Company email domain</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted select-none">@</span>
              <input
                value={emailDomain}
                onChange={e => setEmailDomain(e.target.value)}
                className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
                placeholder="company.com.au"
              />
            </div>
            <p className="text-xs text-muted mt-1">
              Used to build internal email addresses when new users register, e.g. <span className="font-mono">jsmith@{emailDomain || 'company.com.au'}</span>.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </form>
      )}
    </div>
  )
}
