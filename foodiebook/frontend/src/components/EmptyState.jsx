import { ChefHat, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function EmptyState({
  icon: Icon = SearchX,
  title,
  message,
  action,
  actionTo,
  secondary,
  secondaryTo,
  compact = false,
}) {
  const { t } = useLanguage()
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <div className="empty-icon">
        <Icon size={compact ? 24 : 30} />
      </div>
      <h3>{title || t('common.noResults')}</h3>
      <p>{message || t('common.noResultsHint')}</p>
      {(action || secondary) && (
        <div className="empty-actions">
          {action && actionTo && (
            <Link to={actionTo} className="btn btn-primary btn-sm">
              {action}
            </Link>
          )}
          {secondary && secondaryTo && (
            <Link to={secondaryTo} className="btn btn-ghost btn-sm">
              {secondary}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function ChefEmpty() {
  return <ChefHat size={30} />
}
