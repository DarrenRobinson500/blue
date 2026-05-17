import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { getToken, getUser, clearAuth, apiFetch, AUTH_BASE } from './auth'
import ProjectPage from './pages/ProjectPage'
import ToDoPage from './pages/ToDoPage'

function IconProject() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="3" rx="1" />
      <rect x="3" y="10" width="12" height="3" rx="1" />
      <rect x="3" y="16" width="8" height="3" rx="1" />
    </svg>
  )
}

function IconTodo() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
          <span className="font-semibold text-sm tracking-tight text-primary">Project</span>
          <p className="text-xs text-muted mt-0.5">Project Management</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavLink to="/projects" className={navClass}>
            <IconProject /> Projects
          </NavLink>
          <NavLink to="/todo" className={navClass}>
            <IconTodo /> To Do
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
          <Route path="/projects" element={<ProjectPage />} />
          <Route path="/todo" element={<ToDoPage />} />
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
    window.location.href = AUTH_BASE + '?logout=true'
  }

  if (!user) {
    window.location.href = AUTH_BASE + '?next=' + encodeURIComponent(window.location.href)
    return null
  }

  return (
    <BrowserRouter basename="/project">
      <AppLayout user={user} onLogout={handleLogout} />
    </BrowserRouter>
  )
}
