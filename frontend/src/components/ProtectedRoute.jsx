import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { FullPageLoader } from './Loader'
import EmptyState from './EmptyState'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t('admin.adminOnly')}
        message={t('errors.forbidden')}
        action={<a className="btn btn-primary" href="/">{t('common.goHome')}</a>}
      />
    )
  }
  return <Outlet />
}
