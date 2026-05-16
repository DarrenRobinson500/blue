import { useState, useMemo } from 'react'
import { TreatmentStatusPill, RatingPill } from './RiskBadge'
import EditTreatmentModal from './EditTreatmentModal'

const STATUS_ORDER = { overdue: 0, in_progress: 1, not_started: 2, complete: 3 }
const STATUS_HEADERS = {
  overdue: 'Overdue',
  in_progress: 'In progress',
  not_started: 'Not started',
  complete: 'Complete',
}

export default function TreatmentsTab({ risks, users, onTreatmentUpdated }) {
  const [filterOwner, setFilterOwner] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [editingTreatment, setEditingTreatment] = useState(null)

  const allTreatments = useMemo(() => {
    const out = []
    risks.filter(r => r.status === 'active').forEach(r => {
      (r.treatments || []).forEach(t => out.push({ ...t, _risk: r }))
    })
    return out
  }, [risks])

  // Get unique owners/categories for filters
  const ownerEmails = [...new Set(allTreatments.map(t => t.owner_email).filter(Boolean))]
  const categories = [...new Set(risks.map(r => r.category_name).filter(Boolean))]

  const filtered = allTreatments.filter(t => {
    if (filterOwner && t.owner_email !== filterOwner) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterCategory && t._risk.category_name !== filterCategory) return false
    return true
  })

  const grouped = {}
  filtered.forEach(t => {
    const g = STATUS_ORDER[t.status] !== undefined ? t.status : 'not_started'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(t)
  })

  const statusGroups = ['overdue', 'in_progress', 'not_started', 'complete'].filter(s => grouped[s]?.length)

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
        >
          <option value="">All owners</option>
          {ownerEmails.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {['overdue', 'in_progress', 'not_started', 'complete'].map(s => (
            <option key={s} value={s}>{STATUS_HEADERS[s]}</option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {allTreatments.length === 0 && (
        <p className="text-sm text-muted italic">No treatments across active risks.</p>
      )}

      {statusGroups.map(statusKey => (
        <div key={statusKey}>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            {STATUS_HEADERS[statusKey]} ({grouped[statusKey].length})
          </h3>
          <div className="space-y-2">
            {grouped[statusKey].map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-primary truncate">{t.title}</span>
                    <TreatmentStatusPill value={t.status} />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted">
                    <span className="font-medium text-primary">{t._risk.title}</span>
                    {t._risk.current_assessment && <RatingPill value={t._risk.current_assessment.residual_rating} size="xs" />}
                    {t.owner_email && <span>{t.owner_email}</span>}
                    {t.due_date && <span>Due {t.due_date}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEditingTreatment(t)}
                  className="text-xs text-slate-600 hover:text-slate-800 shrink-0"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {editingTreatment && (
        <EditTreatmentModal
          treatment={editingTreatment}
          users={users}
          onClose={() => setEditingTreatment(null)}
          onSaved={(updated) => {
            setEditingTreatment(null)
            onTreatmentUpdated(updated)
          }}
        />
      )}
    </div>
  )
}
