import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await authApi.me()
      setUser(response.data?.data?.user || null)
    } catch (error) {
      if (error.status !== 401) console.warn('Could not refresh session', error.message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials)
    const nextUser = response.data?.data
    setUser(nextUser)
    return { user: nextUser, message: response.data?.message }
  }, [])

  const register = useCallback(async (payload) => {
    const response = await authApi.register(payload)
    const nextUser = response.data?.data
    setUser(nextUser)
    return { user: nextUser, message: response.data?.message }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const updateUser = useCallback((nextUser) => {
    if (nextUser) setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.is_admin),
      login,
      register,
      logout,
      refresh,
      updateUser,
    }),
    [user, loading, login, register, logout, refresh, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
