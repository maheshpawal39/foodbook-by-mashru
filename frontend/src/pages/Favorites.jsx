import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Compass, Heart } from 'lucide-react'
import { favoritesApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import RecipeGrid from '../components/RecipeGrid'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import { SkeletonGrid } from '../components/Loader'

export default function Favorites() {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || 1)
  const [recipes, setRecipes] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useDocumentTitle(t('favorites.title'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await favoritesApi.list({ page, per_page: 12 })
      setRecipes(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [page, t])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <PageHeader eyebrow={t('favorites.subtitle')} title={t('favorites.title')} actions={<Heart size={28} className="page-watermark" />} />

      {error ? (
        <EmptyState icon={Heart} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonGrid count={8} />
      ) : recipes.length ? (
        <>
          <RecipeGrid recipes={recipes} onChange={load} />
          <Pagination page={pagination?.page || 1} pages={pagination?.pages || 1} total={pagination?.total} onPage={(next) => setParams({ page: String(next) })} />
        </>
      ) : (
        <EmptyState
          icon={Heart}
          title={t('favorites.empty')}
          action={<Link to="/explore" className="btn btn-primary"><Compass size={16} /> {t('favorites.explore')}</Link>}
        />
      )}
    </div>
  )
}
