import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../auth'
import StatTile from '../components/StatTile'
import { useRisks } from '../hooks/useRisks'
import { useRiskMatrix } from '../hooks/useRiskMatrix'
import AllRisksTab from '../components/risks/AllRisksTab'
import ByCategoryTab from '../components/risks/ByCategoryTab'
import ByOwnerTab from '../components/risks/ByOwnerTab'
import TreatmentsTab from '../components/risks/TreatmentsTab'
import MatrixTab from '../components/risks/MatrixTab'
import RiskDetail from '../components/risks/RiskDetail'
import AddRiskModal from '../components/risks/AddRiskModal'

export default function RiskRegisterPage() {
  const { risks, loadAll, refresh } = useRisks()
  const { cells, load: loadMatrix, updateMatrix } = useRiskMatrix()
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [functions, setFunctions] = useState([])
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('all')
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [showAddRisk, setShowAddRisk] = useState(false)

  const loadStats = useCallback(async () => {
    const res = await apiFetch('/api/risk-stats/')
    if (res?.ok) setStats(await res.json())
  }, [])

  const loadCategories = useCallback(async () => {
    const res = await apiFetch('/api/categories/')
    if (res?.ok) setCategories(await res.json())
  }, [])

  const loadUsers = useCallback(async () => {
    const res = await apiFetch('/api/auth/users/')
    if (res?.ok) setUsers(await res.json())
  }, [])

  const loadFunctions = useCallback(async () => {
    const res = await apiFetch('/api/core/functions/?is_active=true')
    if (res?.ok) setFunctions(await res.json())
  }, [])

  useEffect(() => {
    loadAll()
    loadMatrix()
    loadStats()
    loadCategories()
    loadUsers()
    loadFunctions()
  }, [])

  const handleRiskCreated = async (risk) => {
    await loadAll()
    await loadStats()
    setSelectedRisk(risk)
  }

  const handleRiskUpdated = (updated) => {
    // Handled inside RiskDetail via full re-fetch
    loadAll()
    loadStats()
  }

  const handleActivate = async (risk) => {
    const res = await apiFetch(`/api/risks/${risk.id}/activate/`, { method: 'POST' })
    if (res?.ok) {
      await loadAll()
      await loadStats()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Could not activate risk')
    }
  }

  const handleMatrixSaved = async (newCells) => {
    const data = await updateMatrix(newCells)
    await loadAll()
    await loadStats()
    return data
  }

  const handleTreatmentUpdated = async () => {
    await loadAll()
    await loadStats()
  }

  const TABS = [
    { key: 'all', label: 'All risks', badge: stats?.active_risks },
    { key: 'category', label: 'By category', badge: categories.filter(c => risks.some(r => r.status === 'active' && r.category === c.id)).length || undefined },
    { key: 'owner', label: 'By owner', badge: [...new Set(risks.filter(r => r.status === 'active').map(r => r.owner_name))].filter(Boolean).length || undefined },
    {
      key: 'treatments', label: 'Treatments',
      badge: (() => {
        const today = new Date().toISOString().slice(0, 10)
        return risks.filter(r => r.status === 'active').reduce((acc, r) => acc + (r.overdue_treatment_count || 0), 0) || undefined
      })(),
    },
    { key: 'matrix', label: 'Risk matrix', badge: undefined },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-primary">Risk Register</h1>
        <button
          onClick={() => setShowAddRisk(true)}
          className="px-3 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-800 transition-colors"
        >
          + Add risk
        </button>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Active risks" value={stats?.active_risks} />
        <div className={`border rounded-lg p-4 flex flex-col gap-1 ${stats?.outside_appetite > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <span className="text-xs text-muted uppercase tracking-wide font-medium">Outside appetite</span>
          <span className={`text-2xl font-semibold ${stats?.outside_appetite > 0 ? 'text-red-600' : 'text-primary'}`}>{stats?.outside_appetite ?? '—'}</span>
        </div>
        <div className={`border rounded-lg p-4 flex flex-col gap-1 ${stats?.stale_assessments > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <span className="text-xs text-muted uppercase tracking-wide font-medium">Stale assessments</span>
          <span className={`text-2xl font-semibold ${stats?.stale_assessments > 0 ? 'text-amber-700' : 'text-primary'}`}>{stats?.stale_assessments ?? '—'}</span>
        </div>
        <StatTile label="Overdue treatments" value={stats?.overdue_treatments} accent={stats?.overdue_treatments > 0 ? 'text-red-600' : undefined} />
        <StatTile label="Draft risks" value={stats?.draft_risks} />
        <StatTile label="Closed risks" value={stats?.closed_risks} accent="text-muted" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-slate-700 text-primary'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="bg-slate-100 text-primary text-xs rounded-full px-2 py-0.5 font-semibold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'all' && (
        <AllRisksTab
          risks={risks}
          categories={categories}
          functions={functions}
          onView={setSelectedRisk}
          onActivate={handleActivate}
        />
      )}
      {tab === 'category' && (
        <ByCategoryTab
          risks={risks}
          categories={categories}
          onView={setSelectedRisk}
        />
      )}
      {tab === 'owner' && (
        <ByOwnerTab
          risks={risks}
          onView={setSelectedRisk}
        />
      )}
      {tab === 'treatments' && (
        <TreatmentsTab
          risks={risks}
          users={users}
          onTreatmentUpdated={handleTreatmentUpdated}
        />
      )}
      {tab === 'matrix' && (
        <MatrixTab
          cells={cells}
          risks={risks}
          onMatrixSaved={handleMatrixSaved}
        />
      )}

      {/* Detail panel */}
      {selectedRisk && (
        <RiskDetail
          risk={selectedRisk}
          matrixCells={cells}
          users={users}
          categories={categories}
          onClose={() => { setSelectedRisk(null); loadStats() }}
          onRiskUpdated={handleRiskUpdated}
          onDeleted={() => { setSelectedRisk(null); loadAll(); loadStats() }}
        />
      )}

      {/* Modals */}
      {showAddRisk && (
        <AddRiskModal
          categories={categories}
          onClose={() => setShowAddRisk(false)}
          onCreated={handleRiskCreated}
        />
      )}
    </div>
  )
}
