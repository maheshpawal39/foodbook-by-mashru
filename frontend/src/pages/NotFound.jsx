import { Link } from 'react-router-dom'
import { Utensils } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function NotFound() {
  const { t } = useLanguage()
  return (
    <div className="notfound-page">
      <span className="notfound-code">404</span>
      <span className="notfound-icon"><Utensils size={30} /></span>
      <h1>{t('common.notFound')}</h1>
      <p>{t('common.notFoundText')}</p>
      <Link to="/dashboard" className="btn btn-primary">{t('common.goHome')}</Link>
    </div>
  )
}
