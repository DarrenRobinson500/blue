const TOKEN_KEY = 'ca_token'
const USER_KEY = 'ca_user'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getUser = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null')
export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const apiFetch = async (path, options = {}) => {
  const token = getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401) {
    clearAuth()
    window.location.reload()
    return null
  }
  return res
}
