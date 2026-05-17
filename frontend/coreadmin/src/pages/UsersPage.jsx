import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import UserDetailPanel from '../components/UserDetailPanel'
import NewUserModal from '../components/NewUserModal'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_LABELS = { cro: 'CRO', chief_actuary: 'Chief Actuary', admin: 'Admin' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [provisioned, setProvisioned] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [usersRes, provRes] = await Promise.all([
      apiFetch('/api/core/users/'),
      apiFetch('/api/core/provisioned-users/'),
    ])
    if (usersRes?.ok) setUsers(await usersRes.json())
    if (provRes?.ok) setProvisioned(await provRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return u.email.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q)
  })

  const deleteUser = async (id) => {
    setDeleteError('')
    const res = await apiFetch(`/api/core/users/${id}/`, { method: 'DELETE' })
    if (res?.ok || res?.status === 204) {
      setUsers(prev => prev.filter(u => u.id !== id))
      setConfirmDeleteId(null)
    } else {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.detail || 'Delete failed.')
    }
  }

  const handleProvisionedCreated = (pu) => {
    setProvisioned(prev => [...prev, pu].sort((a, b) => a.username.localeCompare(b.username)))
    setShowNewUser(false)
  }

  const removeProvisioned = async (pu) => {
    const res = await apiFetch(`/api/core/provisioned-users/${pu.id}/`, { method: 'DELETE' })
    if (res?.ok || res?.status === 204) {
      setProvisioned(prev => prev.filter(p => p.id !== pu.id))
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-primary">Users</h1>
        <button
          onClick={() => setShowNewUser(true)}
          className="px-3 py-1.5 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 transition-colors"
        >
          + New user
        </button>
      </div>

      {/* Pending registration */}
      {!loading && provisioned.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Awaiting registration</h2>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Function</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {provisioned.map(pu => (
                  <tr key={pu.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-primary font-mono text-sm">{pu.username}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-primary">{pu.function.name}</span>
                        <span className="text-xs font-mono bg-stone-100 text-stone-700 px-1 py-0.5 rounded">{pu.function.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{fmt(pu.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeProvisioned(pu)}
                        className="text-xs text-muted hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registered users */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by username or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-600"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Username</th>
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
                  <td onClick={() => setSelectedUserId(u.id)} className="px-4 py-3 font-medium text-primary font-mono text-sm cursor-pointer">{u.username}</td>
                  <td onClick={() => setSelectedUserId(u.id)} className="px-4 py-3 text-muted text-xs cursor-pointer">{u.email}</td>
                  <td onClick={() => setSelectedUserId(u.id)} className="px-4 py-3 cursor-pointer">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td onClick={() => setSelectedUserId(u.id)} className="px-4 py-3 cursor-pointer">
                    {u.function ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-primary">{u.function.name}</span>
                        <span className="text-xs font-mono bg-stone-100 text-stone-700 px-1 py-0.5 rounded">{u.function.code}</span>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">No function</span>
                    )}
                  </td>
                  <td onClick={() => setSelectedUserId(u.id)} className="px-4 py-3 text-muted text-xs cursor-pointer">{fmt(u.function_assigned_since)}</td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === u.id ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary">Delete?</span>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(null); setDeleteError('') }}
                            className="text-xs border border-gray-200 text-muted rounded px-2 py-1 hover:border-gray-400 hover:text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                        {deleteError && <p className="text-xs text-red-600 mt-1 max-w-xs">{deleteError}</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(u.id)}
                          className="text-xs border border-gray-200 text-muted rounded px-2 py-1 hover:border-red-300 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">No users found.</td>
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

      {showNewUser && (
        <NewUserModal
          onClose={() => setShowNewUser(false)}
          onCreated={handleProvisionedCreated}
        />
      )}
    </div>
  )
}
