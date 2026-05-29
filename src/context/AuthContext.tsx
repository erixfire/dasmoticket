import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('dasmoticket_token')
    const storedUser = localStorage.getItem('dasmoticket_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('dasmoticket_token', res.data.token)
    localStorage.setItem('dasmoticket_user', JSON.stringify(res.data.user))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('dasmoticket_token')
    localStorage.removeItem('dasmoticket_user')
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
