const CELL_CLS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-teal-50 text-teal-700',
}

export default function RiskMatrix({ cells, risks = [], onEditClick }) {
  const getCell = (l, c) => cells.find(cell => cell.likelihood === l && cell.consequence === c)

  const risksInCell = (l, c) => risks.filter(r => {
    const a = r.current_assessment
    return a && a.residual_likelihood === l && a.residual_consequence === c
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted">Residual risk positions shown. Consequence → x-axis, Likelihood → y-axis.</div>
        {onEditClick && (
          <button
            onClick={onEditClick}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:border-gray-400 text-primary"
          >
            Edit matrix
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-16 text-muted text-right pr-2 font-normal pb-1">L\C →</th>
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
                  const cell = getCell(l, c)
                  const rating = cell?.rating || 'low'
                  const inCell = risksInCell(l, c)
                  return (
                    <td
                      key={c}
                      className={`border border-white w-28 h-14 text-center align-middle rounded relative group ${CELL_CLS[rating] || 'bg-gray-50'}`}
                    >
                      <div className="text-xs font-medium capitalize">{rating}</div>
                      {inCell.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                          {inCell.map(r => (
                            <span
                              key={r.id}
                              className="w-2 h-2 rounded-full bg-slate-700 opacity-70"
                              title={r.title}
                            />
                          ))}
                        </div>
                      )}
                      {inCell.length > 0 && (
                        <div className="absolute z-10 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg p-2 text-left min-w-max max-w-xs top-full left-1/2 -translate-x-1/2 mt-1">
                          {inCell.map(r => (
                            <div key={r.id} className="text-xs text-primary py-0.5">{r.title}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-xs text-muted">
          ● = risk position (residual). Hover cell to see risk names.
        </div>
      </div>
    </div>
  )
}
