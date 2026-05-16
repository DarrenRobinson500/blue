export default function FunctionCard({ fn, onClick }) {
  const currentUser = fn.current_users?.[0] ?? null
  const hasUser = fn.current_user_count > 0

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-sm text-primary leading-tight">{fn.name}</span>
        <span className="shrink-0 text-xs font-mono bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">
          {fn.code}
        </span>
      </div>
      {fn.parent && (
        <p className="text-xs text-muted mb-1">Reports to: <span className="text-primary">{fn.parent.name}</span></p>
      )}
      {fn.description && (
        <p className="text-xs text-muted mb-3 line-clamp-2 leading-relaxed">{fn.description}</p>
      )}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${hasUser ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-muted truncate max-w-[160px]">
            {hasUser ? (currentUser?.email ?? `${fn.current_user_count} user(s)`) : 'Unassigned'}
          </span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          fn.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {fn.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}
