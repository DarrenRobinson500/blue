import { useState, useEffect } from 'react'

const TOKEN_KEY = 'lp_token'
const USER_KEY = 'lp_user'

// Explicit sign-out: clear own storage so the login form is shown.
;(() => {
  if (new URLSearchParams(window.location.search).has('logout')) {
    localStorage.removeItem('lp_token')
    localStorage.removeItem('lp_user')
    const url = new URL(window.location.href)
    url.searchParams.delete('logout')
    window.history.replaceState({}, '', url.toString())
  }
})()

// Accept token handoff from other apps (cross-origin dev mode).
;(() => {
  const p = new URLSearchParams(window.location.search)
  const t = p.get('lp_token')
  const u = p.get('lp_user')
  if (t && u) {
    try {
      localStorage.setItem(TOKEN_KEY, t)
      localStorage.setItem(USER_KEY, atob(u))
      const url = new URL(window.location.href)
      url.searchParams.delete('lp_token')
      url.searchParams.delete('lp_user')
      window.history.replaceState({}, '', url.toString())
    } catch { /* ignore malformed params */ }
  }
})()

const ALL_APPS = import.meta.env.DEV
  ? [
      { key: 'risk',      label: 'Risk',      href: 'http://localhost:5173/risk/' },
      { key: 'project',   label: 'Project',   href: 'http://localhost:5176/project/' },
      { key: 'actuarial', label: 'Actuarial', href: 'http://localhost:5174/actuarialcore/' },
      { key: 'admin',     label: 'Admin',     href: 'http://localhost:5175/coreadmin/' },
    ]
  : [
      { key: 'risk',      label: 'Risk',      href: '/risk/' },
      { key: 'project',   label: 'Project',   href: '/project/' },
      { key: 'actuarial', label: 'Actuarial', href: '/actuarialcore/' },
      { key: 'admin',     label: 'Admin',     href: '/coreadmin/' },
    ]

function getNextUrl() {
  const params = new URLSearchParams(window.location.search)
  const next = params.get('next')
  return next && next.startsWith('http') ? next : null
}

// Always include the token in redirects so the receiving app can store it
// in its own origin's localStorage without needing a proxy.
function withHandoff(url) {
  const token = localStorage.getItem(TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  if (!token || !userRaw) return url
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + `lp_token=${encodeURIComponent(token)}&lp_user=${encodeURIComponent(btoa(userRaw))}`
}

export default function App() {
  const nextUrl = getNextUrl()

  const [loggedIn, setLoggedIn] = useState(() => {
    const hasToken = !!localStorage.getItem(TOKEN_KEY)
    if (hasToken && nextUrl) {
      window.location.href = withHandoff(nextUrl)
      return false
    }
    return hasToken
  })

  const [accessibleApps, setAccessibleApps] = useState(null)

  useEffect(() => {
    if (!loggedIn) return
    const token = localStorage.getItem(TOKEN_KEY)
    fetch('/api/core/accessible-apps/', { headers: { Authorization: `Token ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => setAccessibleApps(data ?? []))
      .catch(() => setAccessibleApps([]))
  }, [loggedIn])

  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body = { username: username.trim().toLowerCase(), password }
      const res = await fetch(mode === 'login' ? '/api/auth/login/' : '/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem(TOKEN_KEY, data.token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        if (nextUrl) {
          window.location.href = withHandoff(nextUrl)
        } else {
          setLoggedIn(true)
        }
      } else {
        setError(data.detail || data.non_field_errors?.[0] || 'Something went wrong.')
      }
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const inputCls ='w-full border border-border rounded px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'

  if (loggedIn) {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-surface border border-border rounded-lg shadow-sm w-full max-w-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-primary tracking-tight">LifePlatform</h1>
            <p className="text-sm text-muted mt-1">Signed in as <span className="font-medium text-primary">{user?.email}</span></p>
          </div>
          <div className="space-y-2">
            {accessibleApps === null ? (
              <p className="text-sm text-muted text-center py-2">Loading…</p>
            ) : accessibleApps.length === 0 ? (
              <p className="text-sm text-muted text-center py-2">No apps available. Contact your administrator.</p>
            ) : (
              ALL_APPS.filter(app => accessibleApps.includes(app.key)).map(app => {
                const token = localStorage.getItem(TOKEN_KEY)
                const userRaw = localStorage.getItem(USER_KEY)
                const handoff = token && userRaw
                  ? `?lp_token=${encodeURIComponent(token)}&lp_user=${encodeURIComponent(btoa(userRaw))}`
                  : ''
                return (
                  <a
                    key={app.key}
                    href={app.href + handoff}
                    className="flex items-center justify-between w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-primary hover:border-slate-400 hover:bg-gray-50 transition-colors"
                  >
                    {app.label}
                    <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </a>
                )
              })
            )}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY)
              localStorage.removeItem(USER_KEY)
              setLoggedIn(false)
            }}
            className="mt-6 w-full text-xs text-muted hover:text-primary transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-surface border border-border rounded-lg shadow-sm w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-primary tracking-tight">LifePlatform</h1>
          <p className="text-sm text-muted mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'login' ? (
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className={inputCls}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Company User Name</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputCls}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div className="mt-5 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-muted">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setMode('register'); setError('') }}
                className="text-accent font-medium hover:underline"
              >
                Register
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError('') }}
                className="text-accent font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
