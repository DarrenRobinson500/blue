import { useState } from 'react'
import { RiskBadge, StatusBadge } from './Badge'
import ReviewDue from './ReviewDue'

export default function ObligationCard({ obligation, onClick }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-primary">{obligation.reference}</span>
            <RiskBadge value={obligation.risk_rating} />
            <StatusBadge value={obligation.status} />
          </div>
          <p className="text-xs text-muted mb-2">{obligation.source_name}</p>
          <p
            className={`text-sm text-gray-700 leading-relaxed ${expanded ? '' : 'line-clamp-3'} italic`}
          >
            {obligation.verbatim_text}
          </p>
          {obligation.verbatim_text && obligation.verbatim_text.length > 160 && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              className="text-xs text-slate-500 hover:text-slate-700 mt-1"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted">{obligation.owner || <span className="italic text-subtle">Unassigned</span>}</span>
          <ReviewDue date={obligation.review_due} />
        </div>
        <span className="text-xs text-muted bg-gray-100 rounded-full px-2.5 py-0.5">
          {obligation.control_count} control{obligation.control_count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
