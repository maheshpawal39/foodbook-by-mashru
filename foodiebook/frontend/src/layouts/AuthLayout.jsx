import { Outlet } from 'react-router-dom'
import { Languages, Moon, Sun } from 'lucide-react'
import Logo from '../components/Logo'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { mediaUrl } from '../utils/format'

export default function AuthLayout() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <img src={mediaUrl('/uploads/seed/banner.jpg')} alt="" className="auth-visual-image" />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <Logo to={null} light />
          <div className="auth-quote">
            <span className="quote-mark">“</span>
            <p>{t('auth.loginQuote')}</p>
            <span className="auth-quote-by">{t('auth.loginQuoteBy')}</span>
          </div>
          <div className="auth-features">
            <span>🍛 {t('nav.explore')}</span>
            <span>⏱️ {t('nav.cookingTimer')}</span>
            <span>🛒 {t('nav.shoppingList')}</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-controls">
          <div className="auth-lang">
            <Languages size={16} />
            <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('header.language')}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={t('header.theme')}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
        <div className="auth-card">
          <div className="auth-mobile-brand"><Logo to={null} /></div>
          <Outlet />
        </div>
        <p className="auth-footer-note">{t('footer.made')}</p>
      </main>
    </div>
  )
}
