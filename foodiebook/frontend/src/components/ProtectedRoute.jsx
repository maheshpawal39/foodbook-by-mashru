import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageLoader } from '../components/Loaders'

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
