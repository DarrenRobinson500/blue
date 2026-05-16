import { useState } from 'react'
import Modal from '../Modal'

const RATINGS = ['low', 'medium', 'high', 'critical']
const CELL_CLS = {
  critical: 'bg-red-100',
  high: 'bg-orange-100',
  medium: 'bg-amber-50',
  low: 'bg-teal-50',
}

export default function MatrixEditor({ cells, onClose, onSave }) {
  const initGrid = () => {
    const g = {}
    cells.forEach(c => { g[`${c.likelihood}_${c.consequence}`] = c.rating })
    return g
  }
  const [grid, setGrid] = useState(initGrid)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const setCell = (l, c, rating) => setGrid(g => ({ ...g, [`${l}_${c}`]: rating }))

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      const newCells = []
      for (let l = 1; l <= 5; l++) {
        for (let c = 1; c <= 5; c++) {
          newCells.push({ likelihood: l, consequence: c, rating: grid[`${l}_${c}`] || 'low' })
        }
      }
      const data = await onSave(newCells)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Failed to save matrix')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit risk matrix" onClose={onClose} wide>
      {result ? (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded p-3 text-sm text-teal-800">
            Matrix saved. {result.risks_marked_stale} risk{result.risks_marked_stale !== 1 ? 's' : ''} {result.risks_marked_stale !== 1 ? 'have' : 'has'} been flagged for reassessment.
          </div>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">Set the risk rating for each likelihood × consequence combination. Consequence on x-axis (1–5), Likelihood on y-axis (5 at top).</p>
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-muted text-right pr-2 font-normal">L\C →</th>
                  {[1, 2, 3, 4, 5].map(c => (
                    <th key={c} className="w-28 text-center text-muted font-normal pb-1">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[5, 4, 3, 2, 1].map(l => (
                  <tr key={l}>
                    <td className="text-right pr-2 text-muted font-normal">{l}</td>
                    {[1, 2, 3, 4, 5].map(c => {
                      const rating = grid[`${l}_${c}`] || 'low'
                      return (
                        <td key={c} className={`p-1 ${CELL_CLS[rating] || ''}`}>
                          <select
                            value={rating}
                            onChange={e => setCell(l, c, e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-transparent"
                          >
                            {RATINGS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">Cancel</button>
            <button
              onClick={save}
              disabled={loading}
              className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save matrix'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
