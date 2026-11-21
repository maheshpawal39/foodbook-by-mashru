import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Clock3,
  Compass,
  Heart,
  LayoutGrid,
  ListChecks,
  LogOut,
  PlusCircle,
  Settings,
  ShoppingBasket,
  Sparkles,
  UserRound,
  UtensilsCrossed,
  X,
  ChefHat,
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/explore', key: 'nav.explore', icon: Compass },
  { to: '/categories', key: 'nav.categories', icon: UtensilsCrossed },
  { to: '/recipes/new', key: 'nav.addRecipe', icon: PlusCircle },
  { to: '/my-recipes', key: 'nav.myRecipes', icon: ChefHat },
  { to: '/favorites', key: 'nav.favorites', icon: Heart },
  { to: '/shopping-list', key: 'nav.shoppingList', icon: ShoppingBasket },
  { to: '/timer', key: 'nav.cookingTimer', icon: Clock3 },
  { to: '/kitchen', key: 'nav.kitchen', icon: Sparkles },
]

const BOTTOM_ITEMS = [
  { to: '/profile', key: 'nav.profile', icon: UserRound },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { t } = useLanguage()
  const { isAdmin, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    toast.success(t('auth.logoutSuccess'))
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t('nav.menu')}>
      <div className="sidebar-top">
        <Logo to="/dashboard" light onClick={onClose} />
        <button type="button" className="sidebar-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-tagline">{t('app.tagline')}</div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">{t('nav.menu')}</span>
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={18} />
            <span>{t(key)}</span>
            {key === 'nav.addRecipe' && <span className="nav-plus">+</span>}
          </NavLink>
        ))}

        <span className="nav-section-label secondary">{t('common.more')}</span>
        {BOTTOM_ITEMS.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={18} />
            <span>{t(key)}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item nav-admin ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <ListChecks size={18} />
            <span>{t('nav.admin')}</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-quote">
          <span>“</span>
          {t('auth.loginQuote')}
        </div>
        <button type="button" className="nav-item logout-item" onClick={handleLogout}>
          <LogOut size={18} />
          <span>{t('nav.logout')}</span>
        </button>
        <span className="sidebar-year">FoodieBook · {new Date().getFullYear()}</span>
      </div>
    </aside>
  )
}
