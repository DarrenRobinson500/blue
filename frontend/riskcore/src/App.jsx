import { useState } from 'react'
import { getToken, getUser, clearAuth, apiFetch } from './auth'
import LoginPage from './pages/LoginPage'
import ObligationsPage from './pages/ObligationsPage'
import RiskRegisterPage from './pages/RiskRegisterPage'

const MODULES = [
  { key: 'obligations', label: 'Obligations' },
  { key: 'register', label: 'Risk Register' },
]

export default function App() {
  const [user, setUser] = useState(() => getToken() ? getUser() : null)
  const [module, setModule] = useState('obligations')

  // Obligations triggers
  const [addObligationTrigger, setAddObligationTrigger] = useState(0)
  const [addControlTrigger, setAddControlTrigger] = useState(0)

  // Risk register triggers
  const [addRiskTrigger, setAddRiskTrigger] = useState(0)
  const [editMatrixTrigger, setEditMatrixTrigger] = useState(0)

  const handleLogin = (u) => setUser(u)

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
    clearAuth()
    setUser(null)
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sm tracking-tight">RiskCore</span>
          {/* Module nav */}
          <div className="flex gap-1">
            {MODULES.map(m => (
              <button
                key={m.key}
                onClick={() => setModule(m.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  module === m.key
                    ? 'bg-slate-700 text-white'
                    : 'text-muted hover:text-primary hover:bg-gray-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted hidden sm:block border-l border-gray-200 pl-4">{today}</span>
        </div>

        <div className="flex items-center gap-3">
          {module === 'obligations' && (
            <>
              <button
                onClick={() => setAddObligationTrigger(v => v + 1)}
                className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors"
              >
                + Add obligation
              </button>
              <button
                onClick={() => setAddControlTrigger(v => v + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 text-primary rounded hover:border-gray-500 transition-colors"
              >
                + Add control
              </button>
            </>
          )}
          {module === 'register' && (
            <>
              <button
                onClick={() => setAddRiskTrigger(v => v + 1)}
                className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors"
              >
                + Add risk
              </button>
              <button
                onClick={() => setEditMatrixTrigger(v => v + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 text-primary rounded hover:border-gray-500 transition-colors"
              >
                Edit matrix
              </button>
            </>
          )}
          <span className="text-xs text-muted border-l border-gray-200 pl-3">{user.email}</span>
          <button onClick={handleLogout} className="text-xs text-muted hover:text-primary">Sign out</button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {module === 'obligations' && (
          <ObligationsPage
            addObligationTrigger={addObligationTrigger}
            addControlTrigger={addControlTrigger}
          />
        )}
        {module === 'register' && (
          <RiskRegisterPage
            addRiskTrigger={addRiskTrigger}
            editMatrixTrigger={editMatrixTrigger}
          />
        )}
      </main>
    </div>
  )
}
