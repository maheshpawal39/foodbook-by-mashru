import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, ChevronDown, Globe2, LogOut, Menu, Moon, Search, Settings, Sun, User, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { notificationsApi } from '../services'
import { formatRelative, getErrorMessage } from '../utils/format'
import { API_BASE } from '../services/api'

function useOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onOutside])
}

export default function Header({ onMenu }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)

  const notifRef = useRef(null)
  const userRef = useRef(null)
  const langRef = useRef(null)

  useOutside(notifRef, () => setNotifOpen(false))
  useOutside(userRef, () => setUserOpen(false))
  useOutside(langRef, () => setLangOpen(false))

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQuery(params.get('q') || '')
  }, [location.search])

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    notificationsApi
      .list()
      .then((response) => {
        if (!active) return
        setNotifications(response.data?.data?.notifications || [])
        setUnread(response.data?.data?.unread || 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isAuthenticated, location.pathname])

  const openNotifications = async () => {
    const next = !notifOpen
    setNotifOpen(next)
    setUserOpen(false)
    setLangOpen(false)
    if (next) {
      setNotifLoading(true)
      try {
        const response = await notificationsApi.list()
        setNotifications(response.data?.data?.notifications || [])
        setUnread(response.data?.data?.unread || 0)
      } catch (error) {
        toast.error(getErrorMessage(error, t))
      } finally {
        setNotifLoading(false)
      }
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAll()
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
      setUnread(0)
      toast.success(t('notifications.readAll'))
    } catch (error) {
      toast.error(getErrorMessage(error, t))
    }
  }

  const submitSearch = (event) => {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/explore?q=${encodeURIComponent(value)}` : '/explore')
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success(t('auth.signedOut'))
      navigate('/login')
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label={t('common.menu')}>
          <Menu size={21} />
        </button>
        <form className="searchbar" onSubmit={submitSearch} role="search">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('common.searchPlaceholder')}
            aria-label={t('common.search')}
          />
          <kbd>↵</kbd>
        </form>
      </div>

      <div className="topbar-right">
        <div className="popover-wrap" ref={langRef}>
          <button type="button" className="icon-btn lang-btn" onClick={() => { setLangOpen((v) => !v); setNotifOpen(false); setUserOpen(false) }} aria-label={t('settings.language')}>
            <Globe2 size={19} />
            <span>{language === 'hi' ? 'हिं' : 'EN'}</span>
            <ChevronDown size={13} />
          </button>
          {langOpen ? (
            <div className="dropdown dropdown-sm">
              <button
                type="button"
                className={`dropdown-item ${language === 'en' ? 'active' : ''}`}
                onClick={() => { setLanguage('en'); setLangOpen(false); toast.success(t('settings.languageSaved')) }}
              >
                English
              </button>
              <button
                type="button"
                className={`dropdown-item ${language === 'hi' ? 'active' : ''}`}
                onClick={() => { setLanguage('hi'); setLangOpen(false); toast.success(t('settings.languageSaved')) }}
              >
                हिन्दी
              </button>
            </div>
          ) : null}
        </div>

        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={isDark ? t('settings.light') : t('settings.dark')} title={isDark ? t('settings.light') : t('settings.dark')}>
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {isAuthenticated ? (
          <div className="popover-wrap" ref={notifRef}>
            <button type="button" className="icon-btn notif-btn" onClick={openNotifications} aria-label={t('notifications.title')}>
              <Bell size={19} />
              {unread > 0 ? <span className="notif-dot">{unread > 9 ? '9+' : unread}</span> : null}
            </button>
            {notifOpen ? (
              <div className="dropdown notif-dropdown">
                <div className="dropdown-head">
                  <strong>{t('notifications.title')}</strong>
                  <button type="button" className="text-btn" onClick={markAllRead}>
                    <CheckCheck size={15} /> {t('notifications.markAll')}
                  </button>
                </div>
                <div className="notif-list">
                  {notifLoading ? <p className="dropdown-empty">{t('common.loading')}</p> : null}
                  {!notifLoading && notifications.length === 0 ? <p className="dropdown-empty">{t('notifications.empty')}</p> : null}
                  {notifications.slice(0, 8).map((note) => (
                    <Link
                      key={note.id}
                      to={note.link || '/notifications'}
                      className={`notif-item ${note.is_read ? '' : 'unread'}`}
                      onClick={() => setNotifOpen(false)}
                    >
                      <span className={`notif-mark notif-${note.type || 'info'}`} />
                      <div>
                        <strong>{note.title}</strong>
                        {note.message ? <p>{note.message}</p> : null}
                        <span className="notif-time">{formatRelative(note.created_at, language)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link to="/notifications" className="dropdown-foot" onClick={() => setNotifOpen(false)}>
                  {t('common.viewAll')}
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {isAuthenticated ? (
          <div className="popover-wrap" ref={userRef}>
            <button
              type="button"
              className="user-chip"
              onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); setLangOpen(false) }}
              aria-label={t('nav.profile')}
            >
              <span className="user-avatar">
                {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name?.slice(0, 1).toUpperCase()}
              </span>
              <span className="user-chip-copy">
                <strong>{user.name?.split(' ')[0]}</strong>
                <small>{isAdmin ? t('auth.demoAdmin') : t('auth.member')}</small>
              </span>
              <ChevronDown size={14} />
            </button>
            {userOpen ? (
              <div className="dropdown dropdown-sm user-dropdown">
                <div className="dropdown-user">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <NavLink to="/profile" className="dropdown-item" onClick={() => setUserOpen(false)}>
                  <User size={16} /> {t('nav.profile')}
                </NavLink>
                <NavLink to="/settings" className="dropdown-item" onClick={() => setUserOpen(false)}>
                  <Settings size={16} /> {t('nav.settings')}
                </NavLink>
                <button type="button" className="dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={16} /> {t('nav.logout')}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="guest-actions">
            <Link to="/login" className="btn btn-ghost btn-sm">{t('auth.signIn')}</Link>
            <Link to="/register" className="btn btn-primary btn-sm">{t('auth.register')}</Link>
          </div>
        )}
      </div>
    </header>
  )
}

export { API_BASE }
