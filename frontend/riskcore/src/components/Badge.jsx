const RISK_COLOURS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

const STATUS_COLOURS = {
  active: 'bg-green-100 text-green-700',
  under_review: 'bg-amber-100 text-amber-700',
  not_applicable: 'bg-gray-100 text-gray-500',
  superseded: 'bg-slate-100 text-slate-500',
  operating: 'bg-green-100 text-green-700',
  not_operating: 'bg-red-100 text-red-700',
  not_tested: 'bg-gray-100 text-gray-500',
  retired: 'bg-slate-100 text-slate-500',
}

const CONTROL_TYPE_COLOURS = {
  preventive: 'bg-indigo-100 text-indigo-700',
  detective: 'bg-purple-100 text-purple-700',
  corrective: 'bg-teal-100 text-teal-700',
}

const LABELS = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
  active: 'Active', under_review: 'Under Review', not_applicable: 'N/A', superseded: 'Superseded',
  operating: 'Operating', not_operating: 'Not Operating', not_tested: 'Not Tested', retired: 'Retired',
  preventive: 'Preventive', detective: 'Detective', corrective: 'Corrective',
  continuous: 'Continuous', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', annual: 'Annual', ad_hoc: 'Ad Hoc',
  legislation: 'Legislation', prudential_standard: 'Prudential Standard',
  asic_instrument: 'ASIC Instrument', life_code: 'Life Code', internal_policy: 'Internal Policy',
}

export function RiskBadge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_COLOURS[value] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[value] || value}
    </span>
  )
}

export function StatusBadge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[value] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[value] || value}
    </span>
  )
}

export function ControlTypeBadge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTROL_TYPE_COLOURS[value] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[value] || value}
    </span>
  )
}

export function Pill({ label, colour = 'bg-gray-100 text-gray-600' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colour}`}>
      {label}
    </span>
  )
}

export function label(value) {
  return LABELS[value] || value
}
