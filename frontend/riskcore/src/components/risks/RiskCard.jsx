import { RatingPill, StatusPill, VelocityPill, AppetiteLabel, StaleWarning, RiskTypePill, label } from './RiskBadge'

export default function RiskCard({ risk, onView, onAssess, onActivate }) {
  const assessment = risk.current_assessment
  const overdueCount = risk.overdue_treatment_count || 0
  const treatmentCount = risk.treatment_count || 0

  return (
    <div
      onClick={() => onView(risk)}
      className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {risk.assessment_stale && <StaleWarning />}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-primary">{risk.title}</span>
            <span className="text-xs text-muted bg-gray-100 rounded-full px-2 py-0.5">{risk.category_name}</span>
            <span className="text-xs text-muted">{label(risk.source_type)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusPill value={risk.status} />
            <RiskTypePill value={risk.risk_type} />
            <VelocityPill value={risk.velocity} />
            {assessment && <RatingPill value={assessment.residual_rating} />}
            {assessment && <AppetiteLabel withinAppetite={assessment.within_appetite} />}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {risk.status === 'active' && (
            <button
              onClick={e => { e.stopPropagation(); onAssess(risk) }}
              className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800"
            >
              Assess
            </button>
          )}
          {risk.status === 'draft' && assessment && (
            <button
              onClick={e => { e.stopPropagation(); onActivate(risk) }}
              className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              Activate
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-1">
        <span>{risk.owner_name || 'Unassigned'}</span>
        {risk.project_name && <span className="text-violet-600">↳ {risk.project_name}</span>}
        {treatmentCount > 0 && (
          <span>
            {treatmentCount} treatment{treatmentCount !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="text-red-600 font-medium">, {overdueCount} overdue</span>}
          </span>
        )}
        {risk.control_count > 0 && (
          <span>{risk.control_count} control{risk.control_count !== 1 ? 's' : ''} linked</span>
        )}
      </div>
    </div>
  )
}
