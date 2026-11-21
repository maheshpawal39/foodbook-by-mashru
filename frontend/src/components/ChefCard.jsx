import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import ImageWithFallback from './ImageWithFallback'
import { useLanguage } from '../context/LanguageContext'

export default function ChefCard({ chef }) {
  const { t } = useLanguage()
  return (
    <div className="chef-card">
      <div className="chef-avatar">
        {chef.avatar ? (
          <ImageWithFallback src={chef.avatar} alt={chef.name} />
        ) : (
          <span>{chef.name?.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <h3>{chef.name}</h3>
      <p>{chef.bio || t('brand.promise')}</p>
      <div className="chef-meta">
        <span>{t('dashboard.recipesCount', { count: chef.recipe_count })}</span>
        {chef.avg_rating > 0 ? (
          <span>
            <Star size={13} fill="currentColor" /> {chef.avg_rating}
          </span>
        ) : null}
      </div>
      <Link className="btn btn-ghost btn-sm" to={`/explore?author_id=${chef.id}`}>
        {t('common.viewAll')}
      </Link>
    </div>
  )
}
