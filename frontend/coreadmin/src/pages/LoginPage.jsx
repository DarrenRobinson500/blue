import { useState } from 'react'
import { setAuth } from '../api'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuth(data.token, data.user)
        onLogin(data.user)
      } else {
        setError(data.non_field_errors?.[0] || data.detail || 'Login failed.')
      }
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-surface border border-border rounded-lg shadow-sm w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-primary tracking-tight">CoreAdmin</h1>
          <p className="text-sm text-muted mt-1">Platform Administration</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-700 text-white rounded px-4 py-2 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
