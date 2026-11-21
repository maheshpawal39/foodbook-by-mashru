import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit3, Eye, Search, Send, Star, Trash2, Undo2, Utensils } from 'lucide-react'
import { adminApi, recipesApi } from '../../services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { formatDate, getErrorMessage } from '../../utils/format'
import { useDebounce, useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import ImageWithFallback from '../../components/ImageWithFallback'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import { SkeletonRows } from '../../components/Loader'

export default function AdminRecipes() {
  const { t, language } = useLanguage()
  const toast = useToast()
  const [recipes, setRecipes] = useState([])
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const debounced = useDebounce(search, 400)
  useDocumentTitle(t('admin.recipesTitle'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.recipes({ q: debounced || undefined, status: status || undefined, page, per_page: 12 })
      setRecipes(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [debounced, status, page, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debounced, status])

  const toggleFeatured = async (recipe) => {
    setBusyId(recipe.id)
    try {
      const response = await adminApi.toggleFeatured(recipe.id, !recipe.is_featured)
      setRecipes((current) => current.map((item) => (item.id === recipe.id ? response.data?.data : item)))
      toast.success(t('admin.featuredUpdated'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  const toggleStatus = async (recipe) => {
    setBusyId(recipe.id)
    try {
      const next = recipe.status === 'published' ? 'draft' : 'published'
      const response = await recipesApi.setStatus(recipe.id, next)
      setRecipes((current) => current.map((item) => (item.id === recipe.id ? { ...item, status: response.data?.data?.status } : item)))
      toast.success(next === 'published' ? t('common.published') : t('common.draft'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  const removeRecipe = async () => {
    if (!deleteTarget) return
    try {
      await recipesApi.remove(deleteTarget.id)
      toast.success(t('myRecipes.deleted'))
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader eyebrow={t('admin.recipesSub')} title={t('admin.recipesTitle')} actions={<Utensils size={28} className="page-watermark" />} />

      <div className="table-toolbar panel">
        <div className="table-search">
          <Search size={17} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.searchRecipes')} />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t('common.status')}>
          <option value="">{t('admin.allStatuses')}</option>
          <option value="published">{t('common.published')}</option>
          <option value="draft">{t('common.draft')}</option>
        </select>
      </div>

      {error ? (
        <EmptyState icon={Utensils} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonRows count={8} />
      ) : recipes.length === 0 ? (
        <EmptyState icon={Utensils} title={t('common.noResults')} />
      ) : (
        <div className="table-wrap panel">
          <table className="data-table recipes-table">
            <thead>
              <tr>
                <th>{t('common.author')} / {t('form.name')}</th>
                <th>{t('explore.category')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.rating')}</th>
                <th>{t('common.featured')}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe) => (
                <tr key={recipe.id}>
                  <td>
                    <div className="table-recipe">
                      <ImageWithFallback src={recipe.image} alt={recipe.title} />
                      <div>
                        <Link to={`/recipes/${recipe.id}`}><strong>{recipe.title}</strong></Link>
                        <span>{recipe.author?.name}</span>
                      </div>
                    </div>
                  </td>
                  <td>{recipe.category?.name || '—'}</td>
                  <td><StatusBadge status={recipe.status} /></td>
                  <td><span className="inline-rating"><Star size={13} fill="currentColor" /> {recipe.average_rating || '—'} ({recipe.review_count})</span></td>
                  <td>
                    <button type="button" className={`icon-btn star-toggle ${recipe.is_featured ? 'active' : ''}`} onClick={() => toggleFeatured(recipe)} disabled={busyId === recipe.id} title={recipe.is_featured ? t('admin.unfeature') : t('admin.feature')}>
                      <Star size={17} fill={recipe.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td>{formatDate(recipe.created_at, language)}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/recipes/${recipe.id}`} className="icon-btn" title={t('common.viewRecipe')}><Eye size={16} /></Link>
                      <Link to={`/recipes/${recipe.id}/edit`} className="icon-btn" title={t('common.edit')}><Edit3 size={16} /></Link>
                      <button type="button" className="icon-btn" onClick={() => toggleStatus(recipe)} disabled={busyId === recipe.id} title={recipe.status === 'published' ? t('common.unpublish') : t('common.publish')}>
                        {recipe.status === 'published' ? <Undo2 size={16} /> : <Send size={16} />}
                      </button>
                      <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(recipe)} title={t('common.delete')}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination?.page || 1} pages={pagination?.pages || 1} total={pagination?.total} onPage={setPage} />
        </div>
      )}

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={removeRecipe} title={t('common.confirmDelete')} message={deleteTarget?.title} />
    </div>
  )
}
