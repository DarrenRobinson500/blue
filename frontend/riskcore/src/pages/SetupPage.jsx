import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../auth'
import { useRiskMatrix } from '../hooks/useRiskMatrix'
import MatrixEditor from '../components/risks/MatrixEditor'

const APPETITE_CLS = {
  low: 'bg-teal-100 text-teal-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

const CELL_COLOR = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-amber-300',
  low: 'bg-green-400',
}

function MatrixPreview({ cells }) {
  const getCell = (l, c) => cells.find(cell => cell.likelihood === l && cell.consequence === c)?.rating ?? 'low'
  if (cells.length === 0) return <p className="text-sm text-muted italic">Matrix not loaded.</p>
  return (
    <div>
      <div className="inline-block">
        <div className="flex gap-px mb-px ml-6">
          {[1,2,3,4,5].map(c => (
            <div key={c} className="w-8 text-center text-xs text-muted">{c}</div>
          ))}
        </div>
        {[5,4,3,2,1].map(l => (
          <div key={l} className="flex items-center gap-px mb-px">
            <div className="w-5 text-xs text-muted text-right mr-1">{l}</div>
            {[1,2,3,4,5].map(c => {
              const rating = getCell(l, c)
              return (
                <div
                  key={c}
                  title={`L${l} × C${c}: ${rating}`}
                  className={`w-8 h-8 rounded-sm ${CELL_COLOR[rating] || 'bg-gray-200'} opacity-80`}
                />
              )
            })}
          </div>
        ))}
        <div className="flex ml-6 mt-1 w-40 justify-between">
          <span className="text-[10px] text-muted">↑ Likelihood</span>
          <span className="text-[10px] text-muted">Impact →</span>
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        {[
          { label: 'Critical', cls: 'bg-red-100 text-red-700' },
          { label: 'High', cls: 'bg-orange-100 text-orange-700' },
          { label: 'Medium', cls: 'bg-amber-50 text-amber-700' },
          { label: 'Low', cls: 'bg-teal-50 text-teal-700' },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-xs px-2 py-0.5 rounded ${cls}`}>{label}</span>
        ))}
      </div>
    </div>
  )
}

function CategoryForm({ form, setForm, error, saving, onSave, onCancel }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400'
  const labelCls = 'block text-xs font-medium text-muted mb-1'
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelCls}>Appetite *</label>
          <select className={inputCls} value={form.appetite} onChange={e => set('appetite', e.target.value)}>
            {['low', 'medium', 'high'].map(a => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Appetite rationale</label>
        <textarea className={inputCls} rows={2} value={form.appetite_rationale} onChange={e => set('appetite_rationale', e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-200 rounded text-muted hover:text-primary">
          Cancel
        </button>
      </div>
    </div>
  )
}

const EMPTY_FORM = { name: '', description: '', appetite: 'medium', appetite_rationale: '' }

export default function SetupPage() {
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const { cells, load: loadMatrix, updateMatrix } = useRiskMatrix()
  const [showMatrixEditor, setShowMatrixEditor] = useState(false)

  const [addingCategory, setAddingCategory] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const loadCategories = useCallback(async () => {
    const res = await apiFetch('/api/categories/')
    if (res?.ok) setCategories(await res.json())
    setCatLoading(false)
  }, [])

  useEffect(() => {
    loadCategories()
    loadMatrix()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setAddingCategory(true)
  }

  const openEdit = (cat) => {
    setAddingCategory(false)
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      description: cat.description || '',
      appetite: cat.appetite,
      appetite_rationale: cat.appetite_rationale || '',
    })
    setFormError('')
  }

  const cancel = () => {
    setAddingCategory(false)
    setEditingId(null)
    setFormError('')
  }

  const save = async () => {
    if (!form.name.trim() || !form.appetite) {
      setFormError('Name and appetite are required.')
      return
    }
    setSaving(true)
    setFormError('')
    const url = addingCategory ? '/api/categories/' : `/api/categories/${editingId}/`
    const method = addingCategory ? 'POST' : 'PATCH'
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res?.ok) {
      await loadCategories()
      setAddingCategory(false)
      setEditingId(null)
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.name?.[0] || data.detail || 'Save failed.')
    }
    setSaving(false)
  }

  const deleteCategory = async (id) => {
    setDeleteError('')
    const res = await apiFetch(`/api/categories/${id}/`, { method: 'DELETE' })
    if (res?.ok || res?.status === 204) {
      setDeleteConfirm(null)
      await loadCategories()
    } else {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.detail || 'Delete failed.')
      setDeleteConfirm(null)
    }
  }

  const handleMatrixSaved = async (newCells) => updateMatrix(newCells)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold text-primary">Setup</h1>

      {/* Risk Categories */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-primary">Risk Categories</h2>
          {!addingCategory && (
            <button
              onClick={openAdd}
              className="px-3 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-800 transition-colors"
            >
              + Add category
            </button>
          )}
        </div>

        {addingCategory && (
          <div className="px-5 py-4 border-b border-gray-100 bg-slate-50">
            <CategoryForm
              form={form}
              setForm={setForm}
              error={formError}
              saving={saving}
              onSave={save}
              onCancel={cancel}
            />
          </div>
        )}

        {catLoading ? (
          <p className="px-5 py-4 text-sm text-muted">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted italic">No categories yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-muted px-5 py-3 w-1/4">Name</th>
                <th className="text-left text-xs font-medium text-muted px-5 py-3">Description</th>
                <th className="text-left text-xs font-medium text-muted px-5 py-3 w-24">Appetite</th>
                <th className="text-right text-xs font-medium text-muted px-5 py-3 w-24">Active risks</th>
                <th className="px-5 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                editingId === cat.id ? (
                  <tr key={cat.id} className="border-b border-gray-100 last:border-0 bg-slate-50">
                    <td colSpan={5} className="px-5 py-4">
                      <CategoryForm
                        form={form}
                        setForm={setForm}
                        error={formError}
                        saving={saving}
                        onSave={save}
                        onCancel={cancel}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={cat.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-primary">{cat.name}</td>
                    <td className="px-5 py-3 text-muted text-xs truncate max-w-xs">{cat.description || <span className="italic">—</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${APPETITE_CLS[cat.appetite] || 'bg-gray-100 text-gray-600'}`}>
                        {cat.appetite}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted text-xs">{cat.active_risk_count}</td>
                    <td className="px-5 py-3">
                      {deleteConfirm === cat.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-muted hover:text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(cat)}
                            className="text-xs text-muted hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setDeleteError(''); setDeleteConfirm(cat.id) }}
                            className="text-xs text-muted hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
        {deleteError && <p className="px-5 py-3 text-sm text-red-600 border-t border-gray-100">{deleteError}</p>}
      </div>

      {/* Risk Matrix */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-primary">Risk Matrix</h2>
            <p className="text-xs text-muted mt-0.5">5×5 likelihood × consequence grid defining risk ratings</p>
          </div>
          <button
            onClick={() => setShowMatrixEditor(true)}
            className="px-3 py-1.5 text-xs border border-gray-300 text-primary rounded hover:border-gray-500 transition-colors"
          >
            Edit matrix
          </button>
        </div>
        <div className="px-5 py-4">
          <MatrixPreview cells={cells} />
        </div>
      </div>

      {showMatrixEditor && (
        <MatrixEditor
          cells={cells}
          onClose={() => setShowMatrixEditor(false)}
          onSave={handleMatrixSaved}
        />
      )}
    </div>
  )
}
