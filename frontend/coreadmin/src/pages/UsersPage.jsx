import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import UserDetailPanel from '../components/UserDetailPanel'
import AssignFunctionModal from '../components/AssignFunctionModal'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_LABELS = { cro: 'CRO', chief_actuary: 'Chief Actuary', admin: 'Admin' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [assigningUser, setAssigningUser] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch('/api/core/users/')
    if (res?.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleAssigned = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
    setAssigningUser(null)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-primary">Users</h1>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Function</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Assigned since</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-primary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.function ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-primary">{u.function.name}</span>
                        <span className="text-xs font-mono bg-stone-100 text-stone-700 px-1 py-0.5 rounded">{u.function.code}</span>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">No function</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{fmt(u.function_assigned_since)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAssigningUser(u)}
                        className="text-xs border border-stone-300 text-stone-700 rounded px-2 py-1 hover:bg-stone-50 transition-colors"
                      >
                        {u.function ? 'Reassign' : 'Assign'}
                      </button>
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="text-xs border border-gray-200 text-muted rounded px-2 py-1 hover:border-gray-400 hover:text-primary transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={load}
        />
      )}

      {assigningUser && (
        <AssignFunctionModal
          user={assigningUser}
          onClose={() => setAssigningUser(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  )
}
