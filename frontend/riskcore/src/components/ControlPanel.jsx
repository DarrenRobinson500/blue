import Panel from './Panel'
import { ControlTypeBadge, StatusBadge, RiskBadge, label } from './Badge'

export default function ControlPanel({ control, onClose, onSelectObligation }) {
  return (
    <Panel onClose={onClose}>
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-primary">{control.name}</span>
            <ControlTypeBadge value={control.control_type} />
            <StatusBadge value={control.status} />
          </div>
          <p className="text-xs text-muted mt-1">{label(control.frequency)} · {control.owner || 'No owner'}</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-primary text-xl leading-none">&times;</button>
      </div>

      <div className="flex-1 px-6 py-4 space-y-5">
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Description</h3>
          <p className="text-sm text-primary leading-relaxed">{control.description}</p>
        </div>

        {control.evidence_description && (
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Evidence</h3>
            <p className="text-sm text-primary leading-relaxed">{control.evidence_description}</p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Linked obligations ({(control.linked_obligations || []).length})
          </h3>
          {(control.linked_obligations || []).length === 0 ? (
            <p className="text-sm text-subtle italic">No obligations linked</p>
          ) : (
            <div className="space-y-2">
              {control.linked_obligations.map(o => (
                <button
                  key={o.id}
                  onClick={() => onSelectObligation && onSelectObligation(o.id)}
                  className="w-full text-left border border-gray-200 rounded p-3 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{o.reference}</span>
                    <RiskBadge value={o.risk_rating} />
                    <StatusBadge value={o.status} />
                  </div>
                  <p className="text-xs text-muted mt-0.5">{o['source__name']}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
