import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/api'

interface JwtPayload {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
  exp?: number
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function clearAllTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getUser(): JwtPayload | null {
  const token = getToken()
  if (!token) return null
  return decodeJwt(token)
}

export function isFullAdmin(): boolean {
  return getUser()?.role === 'admin'
}

export function isAdmin(): boolean {
  const user = getUser()
  return user?.role === 'admin' || user?.role === 'manager'
}

export function isTokenExpired(): boolean {
  const user = getUser()
  if (!user?.exp) return true
  return Date.now() / 1000 > user.exp
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  return !isTokenExpired()
}
