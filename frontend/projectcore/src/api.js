import { apiFetch } from './auth'

async function api(method, path, body) {
  const res = await apiFetch(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res) return { data: null }
  if (res.status === 204) return { data: null }
  const data = await res.json()
  return { data }
}

export const getProjects = () => api('GET', '/api/project/projects/')
export const createProject = (data) => api('POST', '/api/project/projects/', data)
export const updateProject = (id, data) => api('PUT', `/api/project/projects/${id}/`, data)
export const deleteProject = (id) => api('DELETE', `/api/project/projects/${id}/`)
export const reorderProjects = (ids) => api('POST', '/api/project/projects/reorder/', ids)
export const getTasks = (projectId) => api('GET', `/api/project/tasks/?project=${projectId}`)
export const createTask = (data) => api('POST', '/api/project/tasks/', data)
export const updateTask = (id, data) => api('PUT', `/api/project/tasks/${id}/`, data)
export const deleteTask = (id) => api('DELETE', `/api/project/tasks/${id}/`)
export const reorderTasks = (ids) => api('POST', '/api/project/tasks/reorder/', ids)
export const bulkUpdateTasks = (items) => api('POST', '/api/project/tasks/bulk-update/', items)
export const markTaskDone = (id) => api('POST', `/api/project/tasks/${id}/done/`)
