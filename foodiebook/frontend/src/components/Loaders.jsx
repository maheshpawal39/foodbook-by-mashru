import { Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export function Spinner({ size = 22 }) {
  return <Loader2 className="spin" size={size} />
}

export function FullPageLoader({ label }) {
  const { t } = useLanguage()
  return (
    <div className="full-loader">
      <div className="loader-mark">F</div>
      <Spinner size={26} />
      <p>{label || t('common.loading')}</p>
    </div>
  )
}

export function InlineLoader({ label }) {
  const { t } = useLanguage()
  return (
    <div className="inline-loader">
      <Spinner />
      <span>{label || t('common.loading')}</span>
    </div>
  )
}

export function RecipeGridSkeleton({ count = 6 }) {
  return (
    <div className="recipe-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton skeleton-image" />
          <div className="skeleton-body">
            <div className="skeleton skeleton-line w70" />
            <div className="skeleton skeleton-line w90" />
            <div className="skeleton skeleton-line w40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PanelSkeleton({ rows = 4 }) {
  return (
    <div className="panel-skeleton">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton skeleton-line" key={index} style={{ width: `${88 - index * 7}%` }} />
      ))}
    </div>
  )
}
