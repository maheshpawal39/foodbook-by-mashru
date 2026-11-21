import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function Logo({ to = '/dashboard', light = false, size = 'default', onClick }) {
  const { t } = useLanguage()
  const content = (
    <>
      <span className="logo-name">{t('app.name')}</span>
      <span className="logo-by">{t('app.by')}</span>
    </>
  )
  const className = `brand brand-${size} ${light ? 'brand-light' : ''}`
  if (!to) return <div className={className}>{content}</div>
  return (
    <Link to={to} className={className} onClick={onClick} aria-label="FoodieBook by Marshru">
      {content}
    </Link>
  )
}
