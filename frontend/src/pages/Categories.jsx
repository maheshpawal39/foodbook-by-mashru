import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, LayoutGrid, Plus } from 'lucide-react'
import { categoriesApi } from '../services'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import CategoryCard from '../components/CategoryCard'
import EmptyState from '../components/EmptyState'
import { SkeletonGrid } from '../components/Loader'

export default function Categories() {
  const { t } = useLanguage()
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useDocumentTitle(t('nav.categories'))

  useEffect(() => {
    categoriesApi.list()
      .then((response) => setCategories(response.data?.data || []))
      .catch((err) => setError(getErrorMessage(err, t)))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <div className="page">
      <PageHeader
        eyebrow={t('dashboard.categoriesSub')}
        title={t('nav.categories')}
        subtitle={t('brand.promise')}
        actions={isAdmin ? <Link to="/admin/categories" className="btn btn-primary"><Plus size={16} /> {t('admin.addCategory')}</Link> : <LayoutGrid size={26} className="page-watermark" />}
      />
      {error ? (
        <EmptyState icon={BookOpen} title={t('errors.loadError')} message={error} />
      ) : loading ? (
        <SkeletonGrid count={12} />
      ) : categories.length ? (
        <div className="category-grid">
          {categories.map((category) => <CategoryCard key={category.id} category={category} />)}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title={t('common.noResults')} />
      )}
    </div>
  )
}
