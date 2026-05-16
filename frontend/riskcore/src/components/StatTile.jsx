export default function StatTile({ label, value, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs text-muted uppercase tracking-wide font-medium">{label}</span>
      <span className={`text-2xl font-semibold ${accent || 'text-primary'}`}>{value ?? '—'}</span>
    </div>
  )
}
