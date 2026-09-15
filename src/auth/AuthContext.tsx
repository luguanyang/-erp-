import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { auth } from '../cloudbase'
import { api } from '../api'
import type { AdminProfile } from '../types'

interface AuthContextValue {
  user: AdminProfile | null
  loading: boolean
  login: (username: string, password: string) => Promise<AdminProfile>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const sessionResult = await auth.getSession()
        if (!sessionResult.data?.session) return
        const profile = await api.profile()
        if (active) setUser(profile)
      } catch {
        await auth.signOut().catch(() => undefined)
      } finally {
        if (active) setLoading(false)
      }
    }
    restore()
    return () => {
      active = false
    }
  }, [])

  async function login(username: string, password: string) {
    const result = await auth.signInWithPassword({ username, password })
    if (result.error || !result.data?.session) {
      throw new Error(result.error?.message || '账号或密码错误')
    }
    try {
      const profile = await api.profile(username)
      setUser(profile)
      return profile
    } catch (error) {
      await auth.signOut().catch(() => undefined)
      throw error
    }
  }

  async function logout() {
    await auth.signOut().catch(() => undefined)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
