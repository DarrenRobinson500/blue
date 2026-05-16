import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { getToken, getUser, clearAuth, apiFetch } from './auth'
import LoginPage from './pages/LoginPage'
import ObligationsPage from './pages/ObligationsPage'
import RiskRegisterPage from './pages/RiskRegisterPage'

function IconObligations() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function IconRisk() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

const navClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive ? 'bg-stone-700 text-white' : 'text-muted hover:text-primary hover:bg-gray-100'
  }`

function AppLayout({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-52 bg-surface border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-4 py-4 border-b border-border">
          <span className="font-semibold text-sm tracking-tight text-primary">Risk</span>
          <p className="text-xs text-muted mt-0.5">Risk Management</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavLink to="/obligations" className={navClass}>
            <IconObligations /> Obligations
          </NavLink>
          <NavLink to="/register" className={navClass}>
            <IconRisk /> Risk Register
          </NavLink>
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted truncate mb-2">{user.email}</p>
          <button onClick={onLogout} className="text-xs text-muted hover:text-primary transition-colors">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/obligations" element={<ObligationsPage />} />
          <Route path="/register" element={<RiskRegisterPage />} />
          <Route path="*" element={<Navigate to="/obligations" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => getToken() ? getUser() : null)

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
    clearAuth()
    setUser(null)
  }

  if (!user) return <LoginPage onLogin={setUser} />

  return (
    <BrowserRouter basename="/risk">
      <AppLayout user={user} onLogout={handleLogout} />
    </BrowserRouter>
  )
}
