import { useState, useEffect } from 'react'
import Panel from '../Panel'
import { apiFetch } from '../../auth'
import {
  RatingPill, StatusPill, VelocityPill, AppetiteLabel, StaleWarning,
  TreatmentStatusPill, EffectivenessPill, label,
} from './RiskBadge'
import AddTreatmentModal from './AddTreatmentModal'
import EditTreatmentModal from './EditTreatmentModal'
import LinkControlModal from './LinkControlModal'

const RATINGS_5 = [1, 2, 3, 4, 5]

function AssessmentForm({ risk, matrixCells, onSaved, onCancel }) {
  const [form, setForm] = useState({
    inherent_likelihood: 3, inherent_consequence: 3,
    residual_likelihood: 2, residual_consequence: 2,
    target_likelihood: 1, target_consequence: 2,
    confidence: 'medium', rationale: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const resolveRating = (l, c) => {
    const cell = matrixCells.find(cell => cell.likelihood === l && cell.consequence === c)
    return cell?.rating ?? '—'
  }

  const submit = async () => {
    if (form.rationale.length < 50) { setError('Rationale must be at least 50 characters.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/api/risks/${risk.id}/assess/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) onSaved(data)
      else setError(data.rationale?.[0] || data.error || JSON.stringify(data))
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'border border-gray-200 rounded px-2 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'

  const RatingRow = ({ prefix, lKey, cKey }) => {
    const l = form[lKey]
    const c = form[cKey]
    const rating = resolveRating(l, c)
    return (
      <div className="flex items-center gap-3">
        <div>
          <label className={labelCls}>Likelihood</label>
          <select className={inputCls} value={l} onChange={e => set(lKey, Number(e.target.value))}>
            {RATINGS_5.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Consequence</label>
          <select className={inputCls} value={c} onChange={e => set(cKey, Number(e.target.value))}>
            {RATINGS_5.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <RatingPill value={rating} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">New assessment</h4>
      <div>
        <p className="text-xs font-medium text-muted mb-2">Inherent (before controls)</p>
        <RatingRow prefix="inherent" lKey="inherent_likelihood" cKey="inherent_consequence" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted mb-2">Residual (after existing controls)</p>
        <RatingRow prefix="residual" lKey="residual_likelihood" cKey="residual_consequence" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted mb-2">Target (after planned treatments)</p>
        <RatingRow prefix="target" lKey="target_likelihood" cKey="target_consequence" />
      </div>
      <div>
        <label className={labelCls}>Confidence</label>
        <select className={inputCls} value={form.confidence} onChange={e => set('confidence', e.target.value)}>
          {['high', 'medium', 'low'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>
          Rationale * <span className="text-gray-400 font-normal">({form.rationale.length}/50 min)</span>
        </label>
        <textarea
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400"
          rows={4}
          value={form.rationale}
          onChange={e => set('rationale', e.target.value)}
          placeholder="Explain the reasoning behind inherent ratings, effectiveness of controls, and residual position…"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save assessment'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded text-muted hover:text-primary">Cancel</button>
      </div>
    </div>
  )
}

export default function RiskDetail({ risk: initialRisk, matrixCells, users, onClose, onRiskUpdated }) {
  const [risk, setRisk] = useState(initialRisk)
  const [fullRisk, setFullRisk] = useState(null)
  const [assessHistory, setAssessHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAssessForm, setShowAssessForm] = useState(false)
  const [showAddTreatment, setShowAddTreatment] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState(null)
  const [showLinkControl, setShowLinkControl] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(risk.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const loadFull = async (r = risk) => {
    const res = await apiFetch(`/api/risks/${r.id}/`)
    if (res?.ok) {
      const data = await res.json()
      setFullRisk(data)
      setRisk(data)
      onRiskUpdated?.(data)
    }
  }

  const loadHistory = async () => {
    const res = await apiFetch(`/api/risks/${risk.id}/assessments/`)
    if (res?.ok) setAssessHistory(await res.json())
  }

  useEffect(() => { loadFull() }, [risk.id])

  const r = fullRisk || risk
  const assessment = r.current_assessment
  const controls = fullRisk?.controls || []
  const treatments = fullRisk?.treatments || []
  const linkedObligations = fullRisk?.linked_obligations || []
  const hasUnhealthyControl = controls.some(c => ['not_operating', 'not_tested'].includes(c.control_status))

  const handleAssessmentSaved = async () => {
    setShowAssessForm(false)
    await loadFull()
  }

  const handleTreatmentCreated = async () => {
    setShowAddTreatment(false)
    await loadFull()
  }

  const handleTreatmentSaved = async () => {
    setEditingTreatment(null)
    await loadFull()
  }

  const handleControlLinked = async () => {
    setShowLinkControl(false)
    await loadFull()
  }

  const handleUnlinkControl = async (controlId) => {
    await apiFetch(`/api/risks/${r.id}/unlink_control/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ control_id: controlId }),
    })
    await loadFull()
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    const res = await apiFetch(`/api/risks/${r.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesValue }),
    })
    if (res?.ok) {
      const data = await res.json()
      setFullRisk(data)
      setRisk(data)
      onRiskUpdated?.(data)
    }
    setEditingNotes(false)
    setSavingNotes(false)
  }

  const sectionHdr = 'text-xs font-semibold text-muted uppercase tracking-wide mb-3'

  return (
    <Panel onClose={onClose}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        {r.assessment_stale && (
          <div className="mb-3">
            <StaleWarning />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-primary">{r.title}</span>
          <StatusPill value={r.status} />
          <VelocityPill value={r.velocity} />
          {assessment && <RatingPill value={assessment.residual_rating} />}
          {assessment && <AppetiteLabel withinAppetite={assessment.within_appetite} />}
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted">
          <span>{r.category_name}</span>
          <span>·</span>
          <span>{label(r.source_type)}</span>
          <span>·</span>
          <span>{r.owner_email || 'Unassigned'}</span>
        </div>
        {linkedObligations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {linkedObligations.map(o => (
              <span key={o.id} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-mono">{o.reference}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Assessment */}
        <div>
          <h3 className={sectionHdr}>Current assessment</h3>
          {showAssessForm ? (
            <AssessmentForm
              risk={r}
              matrixCells={matrixCells}
              onSaved={handleAssessmentSaved}
              onCancel={() => setShowAssessForm(false)}
            />
          ) : assessment ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Inherent', l: assessment.inherent_likelihood, c: assessment.inherent_consequence, rating: assessment.inherent_rating },
                  { label: 'Residual', l: assessment.residual_likelihood, c: assessment.residual_consequence, rating: assessment.residual_rating },
                  { label: 'Target', l: assessment.target_likelihood, c: assessment.target_consequence, rating: assessment.target_rating },
                ].map(a => (
                  <div key={a.label} className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                    <p className="text-xs text-muted mb-1">{a.label}</p>
                    <RatingPill value={a.rating} />
                    <p className="text-xs text-muted mt-1">L{a.l} × C{a.c}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>Confidence: <span className="capitalize text-primary">{assessment.confidence}</span></span>
                <span>·</span>
                <span>Assessed {assessment.assessed_at ? new Date(assessment.assessed_at).toLocaleDateString('en-AU') : '—'}</span>
                <span>·</span>
                <span>{assessment.assessed_by_email}</span>
              </div>
              {assessment.rationale && (
                <p className="text-sm text-primary bg-gray-50 border border-gray-200 rounded p-3">{assessment.rationale}</p>
              )}
              {assessment.matrix_version_note && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{assessment.matrix_version_note}</p>
              )}
              {r.status === 'active' && (
                <button
                  onClick={() => setShowAssessForm(true)}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Reassess →
                </button>
              )}
              <div>
                <button
                  onClick={async () => {
                    if (!showHistory) { await loadHistory(); setShowHistory(true) }
                    else setShowHistory(false)
                  }}
                  className="text-xs text-muted hover:text-primary"
                >
                  {showHistory ? 'Hide history' : 'Show assessment history'}
                </button>
                {showHistory && assessHistory.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {assessHistory.slice(1).map(a => (
                      <div key={a.id} className="border border-gray-100 rounded p-3 flex items-center gap-4 text-xs text-muted">
                        <RatingPill value={a.residual_rating} size="xs" />
                        <span>{a.assessed_at ? new Date(a.assessed_at).toLocaleDateString('en-AU') : '—'}</span>
                        <span>{a.assessed_by_email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted italic">No assessment yet.</p>
              {r.status !== 'closed' && (
                <button
                  onClick={() => setShowAssessForm(true)}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  + Add assessment
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div>
          <h3 className={sectionHdr}>Controls ({controls.length})</h3>
          {hasUnhealthyControl && (
            <div className="mb-3 bg-amber-50 border-l-4 border-amber-400 rounded px-3 py-2 text-xs text-amber-800">
              One or more controls supporting this risk are not operating.
            </div>
          )}
          <div className="space-y-2">
            {controls.map(rc => (
              <div key={rc.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-primary">{rc.control_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${['not_operating', 'not_tested'].includes(rc.control_status) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {rc.control_status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs text-muted capitalize">{rc.control_role}</span>
                      <EffectivenessPill value={rc.effectiveness} />
                    </div>
                    {rc.linkage_notes && <p className="text-xs text-muted mt-1">{rc.linkage_notes}</p>}
                  </div>
                  <button
                    onClick={() => handleUnlinkControl(rc.control)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ))}
          </div>
          {r.status !== 'closed' && (
            <button
              onClick={() => setShowLinkControl(true)}
              className="mt-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
            >
              + Link existing control
            </button>
          )}
        </div>

        {/* Treatments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className={sectionHdr}>Treatments ({treatments.length})</h3>
            {r.status !== 'closed' && (
              <button
                onClick={() => setShowAddTreatment(true)}
                className="text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                + Add treatment
              </button>
            )}
          </div>
          <div className="space-y-2">
            {treatments.map(t => (
              <div key={t.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-primary">{t.title}</span>
                      <TreatmentStatusPill value={t.status} />
                      <RatingPill value={t.expected_residual_rating} size="xs" />
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted">
                      {t.owner_email && <span>{t.owner_email}</span>}
                      {t.due_date && <span>Due {t.due_date}</span>}
                    </div>
                    {t.completion_notes && (
                      <p className="text-xs text-muted mt-1 italic">{t.completion_notes}</p>
                    )}
                  </div>
                  {r.status !== 'closed' && (
                    <button
                      onClick={() => setEditingTreatment(t)}
                      className="text-xs text-slate-600 hover:text-slate-800 shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
            {treatments.length === 0 && <p className="text-sm text-muted italic">No treatments yet.</p>}
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={sectionHdr}>Notes</h3>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-xs text-slate-600 hover:text-slate-800 -mt-1">Edit</button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                rows={3}
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800"
                >
                  {savingNotes ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingNotes(false); setNotesValue(r.notes || '') }}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-primary">{r.notes || <span className="text-muted italic">No notes</span>}</p>
          )}
        </div>
      </div>

      {showAddTreatment && (
        <AddTreatmentModal
          risk={r}
          users={users}
          onClose={() => setShowAddTreatment(false)}
          onCreated={handleTreatmentCreated}
        />
      )}
      {editingTreatment && (
        <EditTreatmentModal
          treatment={editingTreatment}
          users={users}
          onClose={() => setEditingTreatment(null)}
          onSaved={handleTreatmentSaved}
        />
      )}
      {showLinkControl && (
        <LinkControlModal
          risk={r}
          onClose={() => setShowLinkControl(false)}
          onLinked={handleControlLinked}
        />
      )}
    </Panel>
  )
}
