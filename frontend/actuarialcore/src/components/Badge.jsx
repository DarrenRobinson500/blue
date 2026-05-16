const IMPORT_STATUS = {
  validated: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-500',
  parsing: 'bg-amber-100 text-amber-700',
  superseded: 'bg-slate-100 text-slate-500',
}

const LABELS = {
  validated: 'Validated', failed: 'Failed', pending: 'Pending',
  parsing: 'Parsing', superseded: 'Superseded',
  csv: 'CSV', fixed_width: 'Fixed Width',
  string: 'String', integer: 'Integer', decimal: 'Decimal', date: 'Date', boolean: 'Boolean',
  missing_required: 'Missing required', wrong_type: 'Wrong type', out_of_range: 'Out of range',
  invalid_value: 'Invalid value', duplicate_primary_key: 'Duplicate key', row_level: 'File error',
}

export function ImportStatusBadge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${IMPORT_STATUS[value] || 'bg-gray-100 text-gray-600'}`}>
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
