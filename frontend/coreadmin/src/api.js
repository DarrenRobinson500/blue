const TOKEN_KEY = 'lp_token'
const USER_KEY = 'lp_user'

export const AUTH_BASE = import.meta.env.DEV ? 'http://localhost:5177/auth/' : '/auth/'

;(() => {
  const p = new URLSearchParams(window.location.search)
  const t = p.get('lp_token')
  const u = p.get('lp_user')
  if (t && u) {
    try {
      localStorage.setItem(TOKEN_KEY, t)
      localStorage.setItem(USER_KEY, atob(u))
      const url = new URL(window.location.href)
      url.searchParams.delete('lp_token')
      url.searchParams.delete('lp_user')
      window.history.replaceState({}, '', url.toString())
    } catch { /* ignore malformed params */ }
  }
})()

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
    window.location.href = AUTH_BASE + '?logout=true&next=' + encodeURIComponent(window.location.href)
    return null
  }
  return res
}
