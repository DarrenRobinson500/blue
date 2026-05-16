import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { getToken, getUser, clearAuth, apiFetch } from './api'
import LoginPage from './pages/LoginPage'
import FunctionsPage from './pages/FunctionsPage'
import UsersPage from './pages/UsersPage'

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

const navClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive ? 'bg-stone-700 text-white' : 'text-muted hover:text-primary hover:bg-gray-100'
  }`

function AppLayout({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-52 bg-surface border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-4 py-4 border-b border-border">
          <span className="font-semibold text-sm tracking-tight text-primary">CoreAdmin</span>
          <p className="text-xs text-muted mt-0.5">Platform Administration</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavLink to="/functions" className={navClass}>
            <IconFunctions /> Functions
          </NavLink>
          <NavLink to="/users" className={navClass}>
            <IconUsers /> Users
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
          <Route path="/functions" element={<FunctionsPage />} />
          <Route path="/users" element={<UsersPage />} />
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
    setUser(null)
  }

  if (!user) return <LoginPage onLogin={setUser} />

  return (
    <BrowserRouter basename="/coreadmin">
      <AppLayout user={user} onLogout={handleLogout} />
    </BrowserRouter>
  )
}
