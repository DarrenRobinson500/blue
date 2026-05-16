import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { getToken, getUser, clearAuth, apiFetch } from './auth'
import LoginPage from './pages/LoginPage'
import ProjectPage from './pages/ProjectPage'

function IconProject() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="3" rx="1" />
      <rect x="3" y="10" width="12" height="3" rx="1" />
      <rect x="3" y="16" width="8" height="3" rx="1" />
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
          <span className="font-semibold text-sm tracking-tight text-primary">Project</span>
          <p className="text-xs text-muted mt-0.5">Project Management</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavLink to="/projects" className={navClass}>
            <IconProject /> Projects
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
          <Route path="/projects" element={<ProjectPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
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
    <BrowserRouter basename="/project">
      <AppLayout user={user} onLogout={handleLogout} />
    </BrowserRouter>
  )
}
