import { useState, useEffect, useCallback } from 'react'
import StatTile from '../components/StatTile'
import ObligationCard from '../components/ObligationCard'
import ObligationPanel from '../components/ObligationPanel'
import ControlPanel from '../components/ControlPanel'
import AddObligationModal from '../components/AddObligationModal'
import AddControlModal from '../components/AddControlModal'
import { ControlTypeBadge, StatusBadge, label } from '../components/Badge'
import { apiFetch } from '../auth'

function useData(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch(path)
    if (res?.ok) setData(await res.json())
    setLoading(false)
  }, [path])

  useEffect(() => { load() }, [load])
  return [data, loading, load]
}

const TABS = ['All obligations', 'By source', 'By owner', 'Controls library']

export default function ObligationsPage() {
  const [stats, , reloadStats] = useData('/api/risk/stats/')
  const [obligations, obLoading, reloadObligations] = useData('/api/risk/obligations/')
  const [sources, , reloadSources] = useData('/api/risk/sources/')
  const [controls, , reloadControls] = useData('/api/risk/controls/')
  const [tab, setTab] = useState(0)
  const [selectedObligation, setSelectedObligation] = useState(null)
  const [selectedControl, setSelectedControl] = useState(null)
  const [showAddObligation, setShowAddObligation] = useState(false)
  const [showAddControl, setShowAddControl] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const reload = () => { reloadObligations(); reloadStats(); reloadControls() }

  const handleObligationUpdated = (updated) => {
    if (selectedObligation?.id === updated.id) setSelectedObligation(updated)
    reload()
  }

  const filtered = (obligations || []).filter(o => {
    if (filterRating && o.risk_rating !== filterRating) return false
    if (filterStatus && o.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      return o.reference.toLowerCase().includes(s) ||
        (o.owner || '').toLowerCase().includes(s) ||
        o.verbatim_text.toLowerCase().includes(s)
    }
    return true
  })

  const activeCount = (obligations || []).filter(o => o.status === 'active').length
  const distinctSources = new Set((obligations || []).map(o => o.source)).size
  const distinctOwners = new Set((obligations || []).filter(o => o.owner).map(o => o.owner)).size

  // Group by source
  const bySource = {}
  filtered.forEach(o => {
    if (!bySource[o.source]) bySource[o.source] = { name: o.source_name, obligations: [] }
    bySource[o.source].obligations.push(o)
  })

  // Group by owner
  const byOwner = {}
  filtered.forEach(o => {
    const key = o.owner || '__unassigned__'
    if (!byOwner[key]) byOwner[key] = { label: o.owner || 'Unassigned', obligations: [] }
    byOwner[key].obligations.push(o)
  })

  const tabBadge = (i) => {
    if (i === 0) return activeCount
    if (i === 1) return distinctSources
    if (i === 2) return distinctOwners + (byOwner['__unassigned__'] ? 1 : 0)
    if (i === 3) return (controls || []).length
    return null
  }

  const openPanel = (o) => { setSelectedControl(null); setSelectedObligation(o) }
  const openControlPanel = (c) => { setSelectedObligation(null); setSelectedControl(c) }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-primary">Obligations</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddObligation(true)}
            className="px-3 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-800 transition-colors"
          >
            + Add obligation
          </button>
          <button
            onClick={() => setShowAddControl(true)}
            className="px-3 py-1.5 text-xs border border-gray-300 text-primary rounded hover:border-gray-500 transition-colors"
          >
            + Add control
          </button>
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatTile label="Total obligations" value={stats?.total_obligations} />
        <StatTile label="Critical & High" value={stats?.critical_and_high} accent="text-red-600" />
        <StatTile label="Controls mapped" value={stats?.controls_mapped} />
        <StatTile label="Controls operating" value={stats?.controls_operating} accent="text-green-600" />
        <StatTile label="Due for review" value={stats?.due_for_review} accent={stats?.due_for_review > 0 ? 'text-amber-600' : ''} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          className="border border-gray-200 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="Search obligations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          value={filterRating}
          onChange={e => setFilterRating(e.target.value)}
        >
          <option value="">All ratings</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="under_review">Under Review</option>
          <option value="not_applicable">Not Applicable</option>
          <option value="superseded">Superseded</option>
        </select>
        {(search || filterRating || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterRating(''); setFilterStatus('') }} className="text-sm text-muted hover:text-primary">Clear</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`pb-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${tab === i ? 'border-slate-700 text-primary' : 'border-transparent text-muted hover:text-primary'}`}
          >
            {t}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${tab === i ? 'bg-slate-100 text-slate-700' : 'bg-gray-100 text-gray-500'}`}>
              {tabBadge(i) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {obLoading && <p className="text-sm text-muted">Loading…</p>}

      {!obLoading && tab === 0 && (
        <div className="grid grid-cols-1 gap-3">
          {filtered.length === 0 && <p className="text-sm text-muted italic">No obligations found.</p>}
          {filtered.map(o => (
            <ObligationCard key={o.id} obligation={o} onClick={() => openPanel(o)} />
          ))}
        </div>
      )}

      {!obLoading && tab === 1 && (
        <div className="space-y-6">
          {Object.entries(bySource).map(([sourceId, { name, obligations: obs }]) => {
            const src = (sources || []).find(s => s.id === Number(sourceId))
            return (
              <div key={sourceId}>
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-primary">{name}</h2>
                    <span className="text-xs text-muted rounded-full bg-gray-100 px-2 py-0.5">{obs.length}</span>
                  </div>
                  {src && <p className="text-xs text-muted">{src.issuing_body}{src.effective_date ? ` · Effective ${src.effective_date}` : ''}</p>}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {obs.map(o => <ObligationCard key={o.id} obligation={o} onClick={() => openPanel(o)} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!obLoading && tab === 2 && (
        <div className="space-y-6">
          {Object.entries(byOwner)
            .sort(([a], [b]) => a === '__unassigned__' ? 1 : b === '__unassigned__' ? -1 : a.localeCompare(b))
            .map(([key, { label: ownerLabel, obligations: obs }]) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-primary">{ownerLabel}</h2>
                  <span className="text-xs text-muted rounded-full bg-gray-100 px-2 py-0.5">{obs.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {obs.map(o => <ObligationCard key={o.id} obligation={o} onClick={() => openPanel(o)} />)}
                </div>
              </div>
            ))}
        </div>
      )}

      {!obLoading && tab === 3 && (
        <div className="grid grid-cols-1 gap-3">
          {(controls || []).map(c => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 cursor-pointer transition-colors"
              onClick={() => openControlPanel(c)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-primary">{c.name}</span>
                    <ControlTypeBadge value={c.control_type} />
                    <StatusBadge value={c.status} />
                  </div>
                  <p className="text-xs text-muted">{label(c.frequency)} · {c.owner || 'No owner'}</p>
                </div>
                <span className="text-xs text-muted bg-gray-100 rounded-full px-2.5 py-0.5 shrink-0">
                  {(c.linked_obligations || []).length} obligation{(c.linked_obligations || []).length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panels */}
      {selectedObligation && (
        <ObligationPanel
          obligation={selectedObligation}
          sources={sources || []}
          allControls={controls || []}
          onClose={() => setSelectedObligation(null)}
          onUpdated={handleObligationUpdated}
          onDeleted={() => { setSelectedObligation(null); reload() }}
        />
      )}

      {selectedControl && (
        <ControlPanel
          control={selectedControl}
          onClose={() => setSelectedControl(null)}
          onSelectObligation={(id) => {
            const o = (obligations || []).find(x => x.id === id)
            if (o) { setSelectedControl(null); setSelectedObligation(o) }
          }}
        />
      )}

      {/* Modals */}
      {showAddObligation && (
        <AddObligationModal
          sources={sources || []}
          onClose={() => setShowAddObligation(false)}
          onCreated={() => { reload(); setShowAddObligation(false) }}
        />
      )}
      {showAddControl && (
        <AddControlModal
          onClose={() => setShowAddControl(false)}
          onCreated={() => { reload(); setShowAddControl(false) }}
        />
      )}

    </div>
  )
}
