import { useEffect, useState } from 'react'
import { Heart, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import RecipeCard from '../components/RecipeCard'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import { RecipeGridSkeleton } from '../components/Loaders'
import { favoriteService } from '../services/userService'
import { useLanguage } from '../context/LanguageContext'
import { useDocumentTitle } from '../hooks/useUtils'
import { getErrorMessage } from '../utils/errors'

export default function Favorites() {
  const { t } = useLanguage()
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useDocumentTitle(t('favorites.title'))

  const load = async (targetPage = page) => {
    setLoading(true)
    setError(null)
    try {
      setData(await favoriteService.list({ page: targetPage, per_page: 9 }))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleFavoriteChange = (recipeId, isFavorited) => {
    if (!isFavorited) load(page)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.favorites')}
        title={t('favorites.title')}
        subtitle={t('favorites.subtitle')}
        actions={<button type="button" className="btn btn-outline" onClick={() => load(page)}><Heart size={16} /> {t('common.favorites')}</button>}
      />

      {error ? (
        <div className="alert alert-error">{getErrorMessage(error, t)}<button type="button" className="btn btn-outline btn-sm" onClick={() => load(page)}>{t('common.retry')}</button></div>
      ) : loading ? (
        <RecipeGridSkeleton count={6} />
      ) : data?.items?.length ? (
        <>
          <div className="recipe-grid">
            {data.items.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onFavoriteChange={handleFavoriteChange} />
            ))}
          </div>
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Search}
          title={t('favorites.empty')}
          message={t('favorites.emptyHint')}
          action={t('favorites.browse')}
          actionTo="/explore"
        />
      )}
    </div>
  )
}
