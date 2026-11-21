import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useLanguage } from '../context/LanguageContext'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { t } = useLanguage()

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname, location.search])

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button type="button" className="sidebar-overlay" aria-label={t('common.close')} onClick={() => setSidebarOpen(false)} />}
      <div className="app-main">
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="page-container">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>{t('footer.tagline')}</span>
          <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
        </footer>
      </div>
    </div>
  )
}
