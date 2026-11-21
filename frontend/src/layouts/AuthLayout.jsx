import { Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import { useLanguage } from '../context/LanguageContext'
import { Quote, Sparkles } from 'lucide-react'

export default function AuthLayout() {
  const { t } = useLanguage()
  return (
    <div className="auth-shell">
      <aside className="auth-showcase">
        <div className="auth-showcase-top">
          <Logo dark />
        </div>
        <div className="auth-showcase-copy">
          <span className="eyebrow gold">
            <Sparkles size={14} /> {t('brand.promise')}
          </span>
          <h1>{t('brand.name')}</h1>
          <p>{t('footer.made')}</p>
          <blockquote>
            <Quote size={22} />
            <p>“{t('settings.aboutText')}”</p>
          </blockquote>
        </div>
        <div className="auth-showcase-foot">
          <span>FoodieBook · {t('brand.tagline')}</span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-card-wrap">
          <Outlet />
        </div>
        <p className="auth-copyright">© {new Date().getFullYear()} FoodieBook by Marshru</p>
      </main>
    </div>
  )
}
