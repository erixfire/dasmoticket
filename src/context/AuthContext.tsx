import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import type { User } from '@/types'
import { api } from '@/lib/api'

const TOKEN_KEY = 'dasmoticket_token'
const USER_KEY  = 'dasmoticket_user'

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000  // refresh 5 min before expiry
const REFRESH_GRACE_MS         = 60 * 60 * 1000 // max 1h past expiry on page load

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000
  } catch { return null }
}

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [token, setToken]         = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const scheduleRefresh = (tkn: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expiry = getTokenExpiry(tkn)
    if (!expiry) return
    const delay = expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS
    if (delay <= 0) {
      void doRefresh()
      return
    }
    refreshTimerRef.current = setTimeout(() => { void doRefresh() }, delay)
  }

  const doRefresh = async () => {
    try {
      const res = await api.auth.refresh()
      localStorage.setItem(TOKEN_KEY, res.token)
      setToken(res.token)
      scheduleRefresh(res.token)
    } catch {
      logout()
    }
  }

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser  = localStorage.getItem(USER_KEY)
    if (storedToken && storedUser) {
      const expiry = getTokenExpiry(storedToken)
      if (expiry && Date.now() > expiry + REFRESH_GRACE_MS) {
        // Beyond the server-side grace window — force re-login
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } else {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        scheduleRefresh(storedToken)
      }
    }
    setIsLoading(false)
  }, [])

  // Listen for session-expired events fired by the api request interceptor
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('dasmoticket:session-expired', handler)
    return () => window.removeEventListener('dasmoticket:session-expired', handler)
  }, [])

  // Clear timer on unmount
  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    const { token: tkn, user: usr } = res.data
    setToken(tkn)
    setUser(usr)
    localStorage.setItem(TOKEN_KEY, tkn)
    localStorage.setItem(USER_KEY, JSON.stringify(usr))
    scheduleRefresh(tkn)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
