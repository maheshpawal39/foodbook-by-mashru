import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { ensureCsrf } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const data = await authService.me()
      setUser(data.user)
      return data.user
    } catch (error) {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      try {
        await ensureCsrf()
        const data = await authService.me()
        if (mounted) setUser(data.user)
      } catch (error) {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    bootstrap()
    const onUnauthorized = () => setUser(null)
    window.addEventListener('fb:unauthorized', onUnauthorized)
    return () => {
      mounted = false
      window.removeEventListener('fb:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const updateLocalUser = useCallback((nextUser) => {
    setUser((current) => ({ ...current, ...nextUser }))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refreshUser,
      updateLocalUser,
      setUser,
    }),
    [user, loading, login, register, logout, refreshUser, updateLocalUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
