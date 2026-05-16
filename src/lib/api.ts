import axios from 'axios'

export const TOKEN_KEY = 'yp_admin_token'
export const REFRESH_TOKEN_KEY = 'yp_admin_refresh_token'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.yallaplei.com/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(err: unknown, token: string | null = null) {
  failedQueue.forEach(p => (err ? p.reject(err) : p.resolve(token!)))
  failedQueue = []
}

function forceLogout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.location.replace('/login')
}

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      isRefreshing = false
      forceLogout()
      return Promise.reject(error)
    }

    try {
      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
      const { access_token, refresh_token: newRefresh } = res.data.data
      localStorage.setItem(TOKEN_KEY, access_token)
      if (newRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)
      api.defaults.headers.common.Authorization = `Bearer ${access_token}`
      processQueue(null, access_token)
      original.headers.Authorization = `Bearer ${access_token}`
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr)
      forceLogout()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)
