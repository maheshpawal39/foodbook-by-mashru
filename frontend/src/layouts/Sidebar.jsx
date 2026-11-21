import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3, BookOpen, ChefHat, Clock3, Compass, CookingPot, Heart, LayoutDashboard, ListChecks,
  LogOut, Plus, Settings, Shield, ShieldAlert, User, Users, Flag, Star, Globe2, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import Logo from '../components/Logo'

const MAIN_LINKS = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/explore', key: 'nav.explore', icon: Compass },
  { to: '/categories', key: 'nav.categories', icon: BookOpen },
  { to: '/recipes/new', key: 'nav.addRecipe', icon: Plus },
  { to: '/my-recipes', key: 'nav.myRecipes', icon: CookingPot },
  { to: '/favorites', key: 'nav.favorites', icon: Heart },
  { to: '/shopping-list', key: 'nav.shoppingList', icon: ListChecks },
  { to: '/timer', key: 'nav.timer', icon: Clock3 },
  { to: '/kitchen', key: 'nav.kitchen', icon: ChefHat },
]

const ACCOUNT_LINKS = [
  { to: '/profile', key: 'nav.profile', icon: User },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

const ADMIN_LINKS = [
  { to: '/admin', key: 'nav.adminDashboard', icon: BarChart3, end: true },
  { to: '/admin/users', key: 'nav.users', icon: Users },
  { to: '/admin/recipes', key: 'nav.recipes', icon: CookingPot },
  { to: '/admin/categories', key: 'nav.categories', icon: BookOpen },
  { to: '/admin/reviews', key: 'nav.reviews', icon: Star },
  { to: '/admin/reports', key: 'nav.reports', icon: Flag },
  { to: '/admin/settings', key: 'nav.website', icon: Globe2 },
]

export const GUEST_LINKS = [
  { to: '/explore', key: 'nav.explore', icon: Compass },
  { to: '/categories', key: 'nav.categories', icon: BookOpen },
]

function NavSection({ title, links, onNavigate }) {
  const { t } = useLanguage()
  return (
    <div className="nav-section">
      <span className="nav-section-title">{title}</span>
      {links.map(({ to, key, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <Icon size={18} />
          <span>{t(key)}</span>
        </NavLink>
      ))}
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success(t('auth.signedOut'))
      navigate('/login', { replace: true })
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Logo dark />
          <button className="sidebar-close" type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-scroll">
          {isAuthenticated ? (
            <NavSection title={t('nav.main')} links={MAIN_LINKS} onNavigate={onClose} />
          ) : (
            <NavSection title={t('nav.explore')} links={GUEST_LINKS} onNavigate={onClose} />
          )}

          {isAuthenticated ? (
            <NavSection title={t('nav.account')} links={ACCOUNT_LINKS} onNavigate={onClose} />
          ) : null}

          {isAdmin ? (
            <NavSection title={t('nav.management')} links={ADMIN_LINKS} onNavigate={onClose} />
          ) : null}

          {!isAuthenticated ? (
            <div className="sidebar-guest">
              <ShieldAlert size={20} />
              <p>{t('common.signInToContinue')}</p>
              <NavLink to="/login" className="btn btn-gold btn-sm" onClick={onClose}>
                {t('auth.signIn')}
              </NavLink>
            </div>
          ) : null}
        </div>

        <div className="sidebar-foot">
          {isAuthenticated ? (
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{user.name?.slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="sidebar-user-copy">
                <strong>{user.name}</strong>
                <span>{isAdmin ? t('auth.demoAdmin') : t('nav.account')}</span>
              </div>
              <button type="button" className="sidebar-logout" onClick={handleLogout} title={t('nav.logout')} aria-label={t('nav.logout')}>
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <NavLink to="/register" className="btn btn-gold btn-block" onClick={onClose}>
              {t('auth.registerTitle')}
            </NavLink>
          )}
          <div className="sidebar-signature">
            <Shield size={13} /> FoodieBook by Marshru
          </div>
        </div>
      </aside>
    </>
  )
}
