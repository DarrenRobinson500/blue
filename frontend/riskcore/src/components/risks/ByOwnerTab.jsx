import { useState } from 'react'
import { RatingPill, AppetiteLabel } from './RiskBadge'

export default function ByOwnerTab({ risks, onView }) {
  const activeRisks = risks.filter(r => r.status === 'active')
  const today = new Date().toISOString().slice(0, 10)

  const grouped = {}
  activeRisks.forEach(r => {
    const key = r.owner_email || '__unassigned__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  const owners = Object.keys(grouped).sort((a, b) => {
    if (a === '__unassigned__') return 1
    if (b === '__unassigned__') return -1
    return a.localeCompare(b)
  })

  const [expanded, setExpanded] = useState(() => {
    const init = {}
    owners.forEach(k => { init[k] = true })
    return init
  })

  return (
    <div className="space-y-3">
      {owners.map(ownerKey => {
        const ownerRisks = grouped[ownerKey]
        const outsideCount = ownerRisks.filter(r => r.current_assessment?.within_appetite === false).length
        const overdueCount = ownerRisks.reduce((acc, r) => acc + (r.overdue_treatment_count || 0), 0)
        const label = ownerKey === '__unassigned__' ? 'Unassigned' : ownerKey

        return (
          <div key={ownerKey} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(e => ({ ...e, [ownerKey]: !e[ownerKey] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-primary">{label}</span>
                <span className="text-xs text-muted">{ownerRisks.length} risk{ownerRisks.length !== 1 ? 's' : ''}</span>
                {outsideCount > 0 && (
                  <span className="text-xs text-red-600 font-semibold">{outsideCount} outside appetite</span>
                )}
                {overdueCount > 0 && (
                  <span className="text-xs text-amber-700">{overdueCount} overdue treatment{overdueCount !== 1 ? 's' : ''}</span>
                )}
              </div>
              <span className="text-muted text-sm">{expanded[ownerKey] ? '▲' : '▼'}</span>
            </button>

            {expanded[ownerKey] && (
              <div className="divide-y divide-gray-100">
                {ownerRisks.map(r => (
                  <div
                    key={r.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onView(r)}
                  >
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      {r.assessment_stale && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Stale</span>
                      )}
                      <span className="text-sm text-primary truncate">{r.title}</span>
                      {r.current_assessment && <RatingPill value={r.current_assessment.residual_rating} size="xs" />}
                      {r.current_assessment && <AppetiteLabel withinAppetite={r.current_assessment.within_appetite} />}
                    </div>
                    <span className="text-xs text-muted shrink-0">{r.category_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {owners.length === 0 && <p className="text-sm text-muted italic">No active risks.</p>}
    </div>
  )
}
