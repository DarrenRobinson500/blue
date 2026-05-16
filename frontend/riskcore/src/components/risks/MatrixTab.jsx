import { useState } from 'react'
import RiskMatrix from './RiskMatrix'
import MatrixEditor from './MatrixEditor'

export default function MatrixTab({ cells, risks, onMatrixSaved }) {
  const [showEditor, setShowEditor] = useState(false)

  const handleSave = async (newCells) => {
    const data = await onMatrixSaved(newCells)
    return data
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <RiskMatrix cells={cells} risks={risks} onEditClick={() => setShowEditor(true)} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Matrix legend</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { label: 'Critical', cls: 'bg-red-100 text-red-700' },
            { label: 'High', cls: 'bg-orange-100 text-orange-700' },
            { label: 'Medium', cls: 'bg-amber-50 text-amber-700' },
            { label: 'Low', cls: 'bg-teal-50 text-teal-700' },
          ].map(({ label, cls }) => (
            <span key={label} className={`px-3 py-1 rounded ${cls}`}>{label}</span>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          The matrix is consequence-weighted: high consequence always results in high or critical rating regardless of likelihood. Edit the matrix to update ratings — active risks whose residual position changes will be automatically flagged for reassessment.
        </p>
      </div>

      {showEditor && (
        <MatrixEditor
          cells={cells}
          onClose={() => setShowEditor(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
