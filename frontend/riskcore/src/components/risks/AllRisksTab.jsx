import { useState, useMemo } from 'react'
import RiskCard from './RiskCard'

const RATINGS_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const SORT_OPTIONS = [
  { value: 'rating', label: 'Residual rating' },
  { value: 'category', label: 'Category' },
  { value: 'owner', label: 'Owner' },
  { value: 'assessed_at', label: 'Assessment date' },
]

export default function AllRisksTab({ risks, categories, functions, onView, onActivate }) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterAppetite, setFilterAppetite] = useState('')
  const [filterRiskType, setFilterRiskType] = useState('')
  const [filterStatus, setFilterStatus] = useState(['active'])
  const [sortBy, setSortBy] = useState('rating')

  const toggleStatus = (s) => setFilterStatus(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )

  const filtered = useMemo(() => {
    let r = risks.filter(risk => {
      if (filterStatus.length && !filterStatus.includes(risk.status)) return false
      if (filterCategory && risk.category !== Number(filterCategory)) return false
      if (filterOwner && risk.owner !== Number(filterOwner)) return false
      if (filterRating && risk.current_assessment?.residual_rating !== filterRating) return false
      if (filterAppetite === 'within' && risk.current_assessment?.within_appetite !== true) return false
      if (filterAppetite === 'outside' && risk.current_assessment?.within_appetite !== false) return false
      if (filterRiskType && risk.risk_type !== filterRiskType) return false
      if (search) {
        const s = search.toLowerCase()
        if (!risk.title.toLowerCase().includes(s) && !risk.description.toLowerCase().includes(s)) return false
      }
      return true
    })

    r.sort((a, b) => {
      // Stale always first within rating group
      if (sortBy === 'rating') {
        const ra = RATINGS_ORDER[a.current_assessment?.residual_rating ?? 'low'] ?? 99
        const rb = RATINGS_ORDER[b.current_assessment?.residual_rating ?? 'low'] ?? 99
        if (ra !== rb) return ra - rb
        if (a.assessment_stale && !b.assessment_stale) return -1
        if (!a.assessment_stale && b.assessment_stale) return 1
        return 0
      }
      if (sortBy === 'category') return (a.category_name || '').localeCompare(b.category_name || '')
      if (sortBy === 'owner') return (a.owner_name || 'z').localeCompare(b.owner_name || 'z')
      if (sortBy === 'assessed_at') {
        const da = a.current_assessment?.assessed_at || ''
        const db = b.current_assessment?.assessed_at || ''
        return db.localeCompare(da)
      }
      return 0
    })

    return r
  }, [risks, filterStatus, filterCategory, filterOwner, filterRating, filterAppetite, filterRiskType, search, sortBy])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <input
            className="border border-gray-200 rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400 w-52"
            placeholder="Search title or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <select
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
          >
            <option value="">All owners</option>
            {functions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <select
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
            value={filterRating}
            onChange={e => setFilterRating(e.target.value)}
          >
            <option value="">All ratings</option>
            {['critical', 'high', 'medium', 'low'].map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
            value={filterAppetite}
            onChange={e => setFilterAppetite(e.target.value)}
          >
            <option value="">Any appetite</option>
            <option value="within">Within appetite</option>
            <option value="outside">Outside appetite</option>
          </select>
        </div>
        <div>
          <select
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
            value={filterRiskType}
            onChange={e => setFilterRiskType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="bau">BAU</option>
            <option value="execution">Execution</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <div className="flex gap-1">
          {['active', 'draft', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`px-2.5 py-1.5 text-xs rounded border ${filterStatus.includes(s) ? 'border-slate-400 bg-slate-100 text-primary' : 'border-gray-200 text-muted hover:border-gray-400'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div>
          <select
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-muted focus:outline-none"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Risk cards */}
      {filtered.length === 0
        ? <p className="text-sm text-muted italic">No risks match the current filters.</p>
        : (
          <div className="space-y-3">
            {filtered.map(r => (
              <RiskCard key={r.id} risk={r} onView={onView} onActivate={onActivate} />
            ))}
          </div>
        )}
    </div>
  )
}
