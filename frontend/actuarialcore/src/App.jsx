import { useState } from 'react'
import { getToken, getUser, clearAuth, apiFetch, AUTH_BASE } from './auth'
import DataInputPage from './pages/DataInputPage'

function IconData() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9" />
      <path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4" />
    </svg>
  )
}

function homeUrl() {
  const base = AUTH_BASE
  const token = getToken()
  const userRaw = localStorage.getItem('lp_user')
  if (token && userRaw) {
    return base + `?lp_token=${encodeURIComponent(token)}&lp_user=${encodeURIComponent(btoa(userRaw))}`
  }
  return base
}

export default function App() {
  const [user] = useState(() => getToken() ? getUser() : null)
  const [addImportTrigger, setAddImportTrigger] = useState(0)
  const [addSchemaTrigger, setAddSchemaTrigger] = useState(0)

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
    clearAuth()
    window.location.href = AUTH_BASE + '?logout=true'
  }

  if (!user) {
    window.location.href = AUTH_BASE + '?next=' + encodeURIComponent(window.location.href)
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-52 bg-surface border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-4 py-4 border-b border-border">
          <span className="font-semibold text-sm tracking-tight text-primary">Actuarial</span>
          <p className="text-xs text-muted mt-0.5">Actuarial Data</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium bg-stone-700 text-white">
            <IconData /> Data Input
          </div>
          <div className="pt-2 space-y-1">
            <button
              onClick={() => setAddSchemaTrigger(n => n + 1)}
              className="w-full text-left px-3 py-1.5 rounded text-xs text-muted hover:text-primary hover:bg-gray-100 transition-colors"
            >
              + New schema
            </button>
            <button
              onClick={() => setAddImportTrigger(n => n + 1)}
              className="w-full text-left px-3 py-1.5 rounded text-xs text-muted hover:text-primary hover:bg-gray-100 transition-colors"
            >
              + Import data
            </button>
          </div>
        </nav>
        <div className="p-4 border-t border-border">
          <a href={homeUrl()} className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors mb-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 12l9-9 9 9M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" />
            </svg>
            All apps
          </a>
          <p className="text-xs text-muted truncate mb-2">
            {user.username || user.email}{user.function ? ` (${user.function.name})` : ''}
          </p>
          <button onClick={handleLogout} className="text-xs text-muted hover:text-primary transition-colors">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <DataInputPage
          addImportTrigger={addImportTrigger}
          addSchemaTrigger={addSchemaTrigger}
        />
      </main>
    </div>
  )
}
