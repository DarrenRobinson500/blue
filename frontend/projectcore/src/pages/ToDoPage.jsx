import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../auth'

function buildTree(items) {
  const map = {}
  items.forEach(item => { map[item.id] = { ...item, children: [] } })
  const roots = []
  items.forEach(item => {
    if (item.parent != null) {
      map[item.parent]?.children.push(map[item.id])
    } else {
      roots.push(map[item.id])
    }
  })
  return roots
}

function AddInput({ depth, onSave, onCancel }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  const commit = () => {
    const t = value.trim()
    if (t) onSave(t)
    else onCancel()
  }

  return (
    <div className="flex items-center py-1 pr-3" style={{ paddingLeft: depth * 12 + 12 }}>
      <div className="w-5 shrink-0" />
      <input
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel() }}
        onBlur={commit}
        placeholder="New item…"
        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-slate-400"
      />
    </div>
  )
}

function TodoRow({ item, depth, addingUnder, editingId, editValue, setEditValue,
  onToggle, onDelete, onAddChild, onSaveChild, onCancelAdd,
  onStartEdit, onSaveEdit, onCancelEdit }) {

  const editRef = useRef(null)
  useEffect(() => { if (editingId === item.id) editRef.current?.focus() }, [editingId])

  return (
    <div>
      {/* Row */}
      <div
        className="flex items-center gap-2 py-1.5 pr-3 rounded-lg group hover:bg-gray-50"
        style={{ paddingLeft: depth * 12 + 12 }}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item)}
          className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
            item.completed ? 'bg-slate-700 border-slate-700' : 'border-gray-300 hover:border-slate-500'
          }`}
        >
          {item.completed && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title / inline edit */}
        {editingId === item.id ? (
          <input
            ref={editRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(item.id); if (e.key === 'Escape') onCancelEdit() }}
            onBlur={() => onSaveEdit(item.id)}
            className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        ) : (
          <span
            onDoubleClick={() => onStartEdit(item)}
            className={`flex-1 text-sm select-none cursor-text ${
              item.completed ? 'line-through text-gray-400' : 'text-primary'
            }`}
          >
            {item.title}
          </span>
        )}

        {/* Actions (visible on hover) */}
        {editingId !== item.id && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => onAddChild(item.id)}
              title="Add child item"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-slate-700 hover:bg-gray-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(item.id)}
              title="Delete"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {item.children.length > 0 && (
        <div className="border-l border-gray-200 ml-5" style={{ marginLeft: depth * 12 + 20 }}>
          {item.children.map(child => (
            <TodoRow
              key={child.id}
              item={child}
              depth={depth + 1}
              addingUnder={addingUnder}
              editingId={editingId}
              editValue={editValue}
              setEditValue={setEditValue}
              onToggle={onToggle}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onSaveChild={onSaveChild}
              onCancelAdd={onCancelAdd}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
          {addingUnder === item.id && (
            <AddInput
              depth={depth + 1}
              onSave={(title) => onSaveChild(title, item.id)}
              onCancel={onCancelAdd}
            />
          )}
        </div>
      )}

      {/* Add child input when no existing children yet */}
      {item.children.length === 0 && addingUnder === item.id && (
        <AddInput
          depth={depth + 1}
          onSave={(title) => onSaveChild(title, item.id)}
          onCancel={onCancelAdd}
        />
      )}
    </div>
  )
}

export default function ToDoPage() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingUnder, setAddingUnder] = useState(null) // null | 'root' | parentId
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const load = async () => {
    const res = await apiFetch('/api/project/todos/')
    if (res?.ok) setTodos(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveNew = async (title, parentId = null) => {
    setAddingUnder(null)
    const res = await apiFetch('/api/project/todos/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, parent: parentId }),
    })
    if (res?.ok) load()
  }

  const toggle = async (item) => {
    await apiFetch(`/api/project/todos/${item.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed }),
    })
    load()
  }

  const deleteItem = async (id) => {
    await apiFetch(`/api/project/todos/${id}/`, { method: 'DELETE' })
    load()
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditValue(item.title)
  }

  const saveEdit = async (id) => {
    const title = editValue.trim()
    setEditingId(null)
    if (!title) return
    await apiFetch(`/api/project/todos/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    load()
  }

  const tree = buildTree(todos)
  const isEmpty = tree.length === 0 && addingUnder !== 'root'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-primary">To Do</h1>
        <button
          onClick={() => { setAddingUnder('root'); setEditingId(null) }}
          className="px-3 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-800 transition-colors"
        >
          + To Do
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl py-1">
        {loading ? (
          <p className="px-4 py-8 text-sm text-muted text-center">Loading…</p>
        ) : isEmpty ? (
          <p className="px-4 py-8 text-sm text-muted text-center italic">No items yet — click + To Do to add one.</p>
        ) : (
          <>
            {tree.map(item => (
              <TodoRow
                key={item.id}
                item={item}
                depth={0}
                addingUnder={addingUnder}
                editingId={editingId}
                editValue={editValue}
                setEditValue={setEditValue}
                onToggle={toggle}
                onDelete={deleteItem}
                onAddChild={(id) => { setAddingUnder(id); setEditingId(null) }}
                onSaveChild={saveNew}
                onCancelAdd={() => setAddingUnder(null)}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
            {addingUnder === 'root' && (
              <AddInput
                depth={0}
                onSave={(title) => saveNew(title, null)}
                onCancel={() => setAddingUnder(null)}
              />
            )}
          </>
        )}
      </div>

      {!isEmpty && (
        <p className="mt-3 text-xs text-muted text-center">Double-click a title to edit it</p>
      )}
    </div>
  )
}
