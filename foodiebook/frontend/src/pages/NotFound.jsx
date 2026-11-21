import { Link } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function NotFound() {
  const { t } = useLanguage()
  return (
    <div className="not-found">
      <div className="not-found-mark"><UtensilsCrossed size={38} /></div>
      <span className="eyebrow">404</span>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.subtitle')}</p>
      <Link to="/dashboard" className="btn btn-primary">{t('notFound.goHome')}</Link>
    </div>
  )
}
