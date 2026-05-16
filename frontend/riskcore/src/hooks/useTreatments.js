import { apiFetch } from '../auth'

export async function patchTreatment(id, data) {
  const res = await apiFetch(`/api/treatments/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res?.ok) return res.json()
  const err = await res?.json().catch(() => ({}))
  throw new Error(JSON.stringify(err))
}
