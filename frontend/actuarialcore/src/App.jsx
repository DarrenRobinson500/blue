import { useState } from 'react'
import { getToken, getUser, clearAuth, apiFetch } from './auth'
import LoginPage from './pages/LoginPage'
import DataInputPage from './pages/DataInputPage'

export default function App() {
  const [user, setUser] = useState(() => getToken() ? getUser() : null)
  const [addImportTrigger, setAddImportTrigger] = useState(0)
  const [addSchemaTrigger, setAddSchemaTrigger] = useState(0)

  const handleLogin = (u) => setUser(u)

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
    clearAuth()
    setUser(null)
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm tracking-tight text-primary">ActuarialCore</span>
          <span className="text-xs text-muted hidden sm:block">{today}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddSchemaTrigger(n => n + 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded text-primary hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            + New schema
          </button>
          <button
            onClick={() => setAddImportTrigger(n => n + 1)}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            + Import data
          </button>
          <span className="text-xs text-muted hidden sm:block">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <DataInputPage
        addImportTrigger={addImportTrigger}
        addSchemaTrigger={addSchemaTrigger}
      />
    </div>
  )
}
