import axios from 'axios'

const TOKEN_KEY = 'yp_admin_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://api.yallaplei.com/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.replace('/login')
    }
    return Promise.reject(error)
  }
)

export { TOKEN_KEY }
