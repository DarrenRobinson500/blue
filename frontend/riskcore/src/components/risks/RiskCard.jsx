import { RatingPill, StatusPill, VelocityPill, AppetiteLabel, StaleWarning, label } from './RiskBadge'

export default function RiskCard({ risk, onView, onAssess, onActivate }) {
  const assessment = risk.current_assessment
  const overdueCount = risk.overdue_treatment_count || 0
  const treatmentCount = risk.treatment_count || 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
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
            <VelocityPill value={risk.velocity} />
            {assessment && <RatingPill value={assessment.residual_rating} />}
            {assessment && <AppetiteLabel withinAppetite={assessment.within_appetite} />}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onView(risk)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:border-gray-400 text-primary"
          >
            View
          </button>
          {risk.status === 'active' && (
            <button
              onClick={() => onAssess(risk)}
              className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800"
            >
              Assess
            </button>
          )}
          {risk.status === 'draft' && assessment && (
            <button
              onClick={() => onActivate(risk)}
              className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              Activate
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-1">
        <span>{risk.owner_email || 'Unassigned'}</span>
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
