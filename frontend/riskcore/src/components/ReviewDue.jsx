export default function ReviewDue({ date }) {
  if (!date) return <span className="text-xs text-subtle">No review date</span>

  const due = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24))

  if (diff < 0) {
    return <span className="text-xs font-medium text-red-600">Overdue ({Math.abs(diff)}d)</span>
  }
  if (diff <= 30) {
    return <span className="text-xs font-medium text-amber-600">Due in {diff}d</span>
  }
  return <span className="text-xs text-green-600">Due {due.toLocaleDateString('en-AU')}</span>
}
