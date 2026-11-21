import { Link } from 'react-router-dom'
import { ArrowRight, Settings, UtensilsCrossed } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import CategoryIcon from '../components/CategoryIcon'
import EmptyState from '../components/EmptyState'
import { RecipeGridSkeleton } from '../components/Loaders'
import { categoryService } from '../services/catalogService'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useAsync, useDocumentTitle } from '../hooks/useUtils'
import { mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function Categories() {
  const { t, pick } = useLanguage()
  const { isAdmin } = useAuth()
  const { data, loading, error, refresh } = useAsync(() => categoryService.list(), [])
  useDocumentTitle(t('categories.title'))

  const categories = data?.items || []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.categories')}
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        actions={
          isAdmin && (
            <Link to="/admin?tab=categories" className="btn btn-outline">
              <Settings size={16} /> {t('categories.manage')}
            </Link>
          )
        }
      />

      {error ? (
        <div className="alert alert-error">
          {getErrorMessage(error, t)}
          <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>{t('common.retry')}</button>
        </div>
      ) : loading ? (
        <RecipeGridSkeleton count={6} />
      ) : categories.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={t('categories.empty')} message={t('categories.emptyHint')} />
      ) : (
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/explore?category=${category.slug}`}
              className={`category-card category-card-${(index % 4) + 1}`}
            >
              <img src={mediaUrl(category.image)} alt="" loading="lazy" />
              <div className="category-overlay" />
              <div className="category-card-content">
                <span className="category-icon-wrap"><CategoryIcon name={category.icon} size={22} /></span>
                <div>
                  <h3>{pick(category.name, category.name_hi)}</h3>
                  <p>{t('categories.recipes', { count: category.recipe_count })}</p>
                </div>
                <span className="category-arrow"><ArrowRight size={17} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
