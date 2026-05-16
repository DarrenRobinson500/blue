import { useState } from 'react'
import { RatingPill, AppetiteLabel, StaleWarning } from './RiskBadge'

const APPETITE_CLS = { low: 'bg-teal-50 text-teal-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-blue-50 text-blue-700' }

export default function ByCategoryTab({ risks, categories, onView }) {
  const activeRisks = risks.filter(r => r.status === 'active')

  const grouped = categories.map(cat => {
    const catRisks = activeRisks.filter(r => r.category === cat.id)
    const outsideCount = catRisks.filter(r => r.current_assessment?.within_appetite === false).length
    return { cat, risks: catRisks, outsideCount }
  }).filter(g => g.risks.length > 0)

  const [expanded, setExpanded] = useState(() => {
    const init = {}
    grouped.forEach(g => { init[g.cat.id] = g.outsideCount > 0 })
    return init
  })

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="space-y-3">
      {grouped.map(({ cat, risks: catRisks, outsideCount }) => (
        <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggle(cat.id)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-primary">{cat.name}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${APPETITE_CLS[cat.appetite] || 'bg-gray-100 text-gray-600'}`}>
                Appetite: {cat.appetite}
              </span>
              <span className="text-xs text-muted">{catRisks.length} risk{catRisks.length !== 1 ? 's' : ''}</span>
              {outsideCount > 0 && (
                <span className="text-xs text-red-600 font-semibold">{outsideCount} outside appetite</span>
              )}
            </div>
            <span className="text-muted text-sm">{expanded[cat.id] ? '▲' : '▼'}</span>
          </button>

          {expanded[cat.id] && (
            <div className="divide-y divide-gray-100">
              {catRisks.map(r => (
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
                  <span className="text-xs text-muted shrink-0">{r.owner_email || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {grouped.length === 0 && <p className="text-sm text-muted italic">No active risks.</p>}
    </div>
  )
}
