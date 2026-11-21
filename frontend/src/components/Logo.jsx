import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function Logo({ compact = false, dark = false, to = '/' }) {
  const { t } = useLanguage()
  return (
    <Link to={to} className={`brand ${compact ? 'brand-compact' : ''} ${dark ? 'brand-on-dark' : ''}`} aria-label="FoodieBook home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-fork">F</span>
      </span>
      <span className="brand-text">
        <span className="brand-name">{t('brand.name')}</span>
        <span className="brand-tagline">{t('brand.tagline')}</span>
      </span>
    </Link>
  )
}
