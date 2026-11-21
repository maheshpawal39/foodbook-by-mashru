import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Languages,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { languages } from '../translations'
import { notificationService } from '../services/userService'
import { formatDate } from '../utils/format'

export default function Header({ onMenu }) {
  const { t, language, setLanguage, pick } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const notifRef = useRef(null)
  const userRef = useRef(null)
  const langRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQuery(params.get('q') || '')
  }, [location.search])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await notificationService.list()
        if (!active) return
        setNotifications(data.items)
        setUnread(data.unread_count)
      } catch (error) {
        /* silent */
      }
    }
    load()
    const interval = window.setInterval(load, 60000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const onClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(event.target)) setUserOpen(false)
      if (langRef.current && !langRef.current.contains(event.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const submitSearch = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : '/explore')
  }

  const openNotifications = async () => {
    setNotifOpen((current) => !current)
    setUserOpen(false)
    if (!notifOpen) {
      try {
        const data = await notificationService.list()
        setNotifications(data.items)
        setUnread(data.unread_count)
      } catch (error) {
        /* silent */
      }
    }
  }

  const openNotification = async (item) => {
    try {
      if (!item.is_read) {
        await notificationService.markRead(item.id)
        setUnread((count) => Math.max(0, count - 1))
        setNotifications((list) => list.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
      }
    } catch (error) {
      /* ignore */
    }
    setNotifOpen(false)
    if (item.link) navigate(item.link)
  }

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setUnread(0)
      setNotifications((list) => list.map((item) => ({ ...item, is_read: true })))
    } catch (error) {
      /* silent */
    }
  }

  const handleLogout = async () => {
    await logout()
    toast.success(t('auth.logoutSuccess'))
    navigate('/login')
  }

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label={t('header.menu')}>
        <Menu size={22} />
      </button>

      <Link to="/dashboard" className="mobile-brand">FoodieBook</Link>

      <form className="topbar-search" onSubmit={submitSearch} role="search">
        <Search size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('header.searchPlaceholder')}
          aria-label={t('header.searchPlaceholder')}
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label={t('common.clear')}>
            <X size={15} />
          </button>
        )}
      </form>

      <div className="topbar-actions">
        <Link to="/explore" className="icon-btn mobile-search-btn" aria-label={t('common.search')}>
          <Search size={18} />
        </Link>
        <div className="dropdown" ref={langRef}>
          <button
            type="button"
            className="lang-btn"
            onClick={() => {
              setLangOpen((v) => !v)
              setNotifOpen(false)
              setUserOpen(false)
            }}
            aria-label={t('header.language')}
          >
            <Languages size={17} />
            <span>{language === 'hi' ? 'हिं' : 'EN'}</span>
            <ChevronDown size={13} />
          </button>
          {langOpen && (
            <div className="dropdown-menu lang-menu">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`dropdown-item ${language === item.code ? 'active' : ''}`}
                  onClick={() => {
                    setLanguage(item.code)
                    setLangOpen(false)
                  }}
                >
                  <span>{item.label}</span>
                  <span className="lang-short">{item.short}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="icon-btn theme-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <div className="dropdown" ref={notifRef}>
          <button type="button" className="icon-btn notification-btn" onClick={openNotifications} aria-label={t('header.notifications')}>
            <Bell size={19} />
            {unread > 0 && <span className="notification-dot">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown-menu notification-menu">
              <div className="dropdown-head">
                <strong>{t('header.notifications')}</strong>
                {unread > 0 && (
                  <button type="button" className="link-btn" onClick={markAllRead}>
                    <CheckCheck size={14} />{t('header.markAllRead')}
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    <Bell size={22} />
                    <strong>{t('header.noNotifications')}</strong>
                    <span>{t('header.noNotificationsHint')}</span>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`notification-item ${item.is_read ? '' : 'unread'}`}
                      onClick={() => openNotification(item)}
                    >
                      <span className={`notification-type type-${item.type}`} />
                      <span className="notification-copy">
                        <strong>{pick(item.title, item.title_hi)}</strong>
                        <span>{pick(item.message, item.message_hi)}</span>
                        <small>{formatDate(item.created_at, language)}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="dropdown-footer">
                <Link to="/settings" onClick={() => setNotifOpen(false)}>{t('nav.settings')}</Link>
              </div>
            </div>
          )}
        </div>

        <div className="dropdown user-dropdown" ref={userRef}>
          <button
            type="button"
            className="user-btn"
            onClick={() => {
              setUserOpen((v) => !v)
              setNotifOpen(false)
              setLangOpen(false)
            }}
          >
            <Avatar user={user} size={36} />
            <span className="user-meta">
              <strong>{user?.name}</strong>
              <small>{user?.role === 'admin' ? t('common.admin') : t('common.chef')}</small>
            </span>
            <ChevronDown size={14} />
          </button>
          {userOpen && (
            <div className="dropdown-menu user-menu">
              <div className="user-menu-head">
                <Avatar user={user} size={44} />
                <div>
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>
              <Link to="/profile" className="dropdown-item" onClick={() => setUserOpen(false)}>
                <UserRound size={16} />{t('header.profile')}
              </Link>
              <Link to="/settings" className="dropdown-item" onClick={() => setUserOpen(false)}>
                <Settings size={16} />{t('header.settings')}
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="dropdown-item" onClick={() => setUserOpen(false)}>
                  <Settings size={16} />{t('header.admin')}
                </Link>
              )}
              <button type="button" className="dropdown-item danger" onClick={handleLogout}>
                <LogOut size={16} />{t('header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
