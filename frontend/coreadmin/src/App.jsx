import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { getToken, getUser, clearAuth, apiFetch, AUTH_BASE } from './api'
import FunctionsPage from './pages/FunctionsPage'
import UsersPage from './pages/UsersPage'
import AuthorityPage from './pages/AuthorityPage'
import GeneralPage from './pages/GeneralPage'
import DataPage from './pages/DataPage'

function IconFunctions() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-1a7 7 0 0 1 14 0v1" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75M22 21v-1a4 4 0 0 0-3-3.87" />
    </svg>
  )
}

function IconAuthority() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18" />
    </svg>
  )
}

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

function IconGeneral() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

const navClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive ? 'bg-stone-700 text-white' : 'text-muted hover:text-primary hover:bg-gray-100'
  }`

function AppLayout({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-52 bg-surface border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-4 py-4 border-b border-border">
          <span className="font-semibold text-sm tracking-tight text-primary">Admin</span>
          <p className="text-xs text-muted mt-0.5">Platform Administration</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavLink to="/functions" className={navClass}>
            <IconFunctions /> Functions
          </NavLink>
          <NavLink to="/users" className={navClass}>
            <IconUsers /> Users
          </NavLink>
          <NavLink to="/authority" className={navClass}>
            <IconAuthority /> Authority
          </NavLink>
          <NavLink to="/general" className={navClass}>
            <IconGeneral /> General
          </NavLink>
          <NavLink to="/data" className={navClass}>
            <IconData /> Data
          </NavLink>
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
          <button onClick={onLogout} className="text-xs text-muted hover:text-primary transition-colors">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/functions" element={<FunctionsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/authority" element={<AuthorityPage />} />
          <Route path="/general" element={<GeneralPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/functions" replace />} />
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
    window.location.href = AUTH_BASE + '?logout=true'
  }

  if (!user) {
    window.location.href = AUTH_BASE + '?next=' + encodeURIComponent(window.location.href)
    return null
  }

  return (
    <BrowserRouter basename="/coreadmin">
      <AppLayout user={user} onLogout={handleLogout} />
    </BrowserRouter>
  )
}
