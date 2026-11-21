import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit3, Eye, Search, Star, Trash2, UtensilsCrossed } from 'lucide-react'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useDebouncedValue } from '../../hooks/useUtils'
import { formatDate, mediaUrl } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

export default function AdminRecipes() {
  const { t, pick, language } = useLanguage()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebouncedValue(query, 350)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { q: debounced, page, per_page: 15 }
      if (status) params.status = status
      setData(await adminService.recipes(params))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [debounced, status, page]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [debounced, status])

  const update = async (recipe, payload) => {
    try {
      await adminService.updateRecipe(recipe.id, payload)
      toast.success(t('admin.featureSaved'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await adminService.deleteRecipe(deleteTarget.id)
      toast.success(t('myRecipes.deleted'))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="panel">
        <div className="admin-toolbar">
          <div className="search-inline">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.searchRecipes')} />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t('admin.filterStatus')}>
            <option value="">{t('admin.allStatus')}</option>
            <option value="published">{t('common.published')}</option>
            <option value="draft">{t('common.draft')}</option>
          </select>
          <span className="admin-count">{data?.pagination?.total || 0} {t('admin.recipes')}</span>
        </div>

        {error ? (
          <div className="alert alert-error">{getErrorMessage(error, t)}</div>
        ) : loading ? (
          <PanelSkeleton rows={8} />
        ) : (
          <div className="table-wrap">
            <table className="data-table recipes-table">
              <thead>
                <tr>
                  <th>{t('admin.recipes')}</th>
                  <th>{t('admin.author')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.rating')}</th>
                  <th>{t('common.featured')}</th>
                  <th>{t('admin.joined')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((recipe) => (
                  <tr key={recipe.id}>
                    <td>
                      <div className="table-recipe">
                        <img src={mediaUrl(recipe.image)} alt="" />
                        <div>
                          <strong>{pick(recipe.title, recipe.title_hi)}</strong>
                          <span>{recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>{recipe.author?.name}</td>
                    <td>
                      <button
                        type="button"
                        className={`status-pill clickable ${recipe.status === 'published' ? 'active' : 'inactive'}`}
                        onClick={() => update(recipe, { status: recipe.status === 'published' ? 'draft' : 'published' })}
                        title={recipe.status === 'published' ? t('admin.unpublish') : t('admin.publish')}
                      >
                        {recipe.status === 'published' ? t('common.published') : t('common.draft')}
                      </button>
                    </td>
                    <td><span className="rating-inline"><Star size={13} fill="currentColor" /> {Number(recipe.rating_avg).toFixed(1)}</span></td>
                    <td>
                      <button
                        type="button"
                        className={`feature-star ${recipe.is_featured ? 'active' : ''}`}
                        onClick={() => update(recipe, { is_featured: !recipe.is_featured })}
                        title={recipe.is_featured ? t('admin.unfeature') : t('admin.feature')}
                      >
                        <Star size={17} fill={recipe.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td>{formatDate(recipe.created_at, language)}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/recipes/${recipe.id}`} className="icon-btn" title={t('common.viewRecipe')}><Eye size={16} /></Link>
                        <Link to={`/recipes/${recipe.id}/edit`} className="icon-btn" title={t('common.edit')}><Edit3 size={16} /></Link>
                        <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(recipe)} title={t('common.delete')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.items?.length && <p className="table-empty">{t('admin.noRecipes')}</p>}
          </div>
        )}

        {data?.pagination && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={t('common.delete')}
        message={deleteTarget ? t('myRecipes.deleteConfirm', { title: pick(deleteTarget.title, deleteTarget.title_hi) }) : ''}
        loading={busy}
      />
    </div>
  )
}
