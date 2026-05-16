const RATING_CLS = {
  critical: 'bg-red-100 text-red-700 font-semibold',
  high: 'bg-orange-100 text-orange-600 font-semibold',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-teal-50 text-teal-700',
}

const RATING_DOT = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-teal-500',
}

const STATUS_CLS = {
  draft: 'bg-gray-100 text-gray-500',
  active: 'bg-teal-50 text-teal-700',
  closed: 'bg-slate-100 text-slate-500',
}

const VELOCITY_CLS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

const TREATMENT_STATUS_CLS = {
  not_started: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-teal-50 text-teal-700',
  overdue: 'bg-red-100 text-red-700 font-semibold',
}

const EFFECTIVENESS_CLS = {
  strong: 'bg-teal-50 text-teal-700',
  adequate: 'bg-blue-50 text-blue-700',
  weak: 'bg-amber-50 text-amber-700',
  untested: 'bg-gray-100 text-gray-500',
}

const LABELS = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
  draft: 'Draft', active: 'Active', closed: 'Closed',
  high_v: 'High velocity', medium_v: 'Medium velocity', low_v: 'Low velocity',
  not_started: 'Not started', in_progress: 'In progress', complete: 'Complete', overdue: 'Overdue',
  preventive: 'Preventive', detective: 'Detective', corrective: 'Corrective',
  strong: 'Strong', adequate: 'Adequate', weak: 'Weak', untested: 'Untested',
  regulatory: 'Regulatory', operational: 'Operational', strategic: 'Strategic',
  financial: 'Financial', emerging: 'Emerging',
}

export function label(v) {
  return LABELS[v] ?? v
}

export function RatingPill({ value, size = 'sm' }) {
  const cls = RATING_CLS[value] || 'bg-gray-100 text-gray-500'
  const sz = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full ${sz} ${cls}`}>
      {LABELS[value] ?? value}
    </span>
  )
}

export function RatingDot({ value }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${RATING_DOT[value] || 'bg-gray-400'}`} />
  )
}

export function StatusPill({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[value] || 'bg-gray-100 text-gray-500'}`}>
      {LABELS[value] ?? value}
    </span>
  )
}

export function VelocityPill({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${VELOCITY_CLS[value] || 'bg-gray-100 text-gray-500'}`}>
      {value ? `${value.charAt(0).toUpperCase() + value.slice(1)} velocity` : '—'}
    </span>
  )
}

export function TreatmentStatusPill({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${TREATMENT_STATUS_CLS[value] || 'bg-gray-100 text-gray-500'}`}>
      {LABELS[value] ?? value}
    </span>
  )
}

export function EffectivenessPill({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${EFFECTIVENESS_CLS[value] || 'bg-gray-100 text-gray-500'}`}>
      {LABELS[value] ?? value}
    </span>
  )
}

export function AppetiteLabel({ withinAppetite }) {
  if (withinAppetite === null || withinAppetite === undefined) return null
  return withinAppetite
    ? <span className="text-xs text-teal-600">Within appetite</span>
    : <span className="text-xs text-red-600 font-semibold">Outside appetite</span>
}

export function StaleWarning() {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded px-3 py-2 text-xs text-amber-800">
      Assessment may need review — controls or matrix have changed since last assessment.
    </div>
  )
}
