import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChefHat,
  Edit3,
  Eye,
  Plus,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { RecipeGridSkeleton } from '../components/Loaders'
import { recipeService } from '../services/recipeService'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useDocumentTitle } from '../hooks/useUtils'
import { formatDate, mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

const TABS = [
  { key: 'all', label: 'myRecipes.all' },
  { key: 'published', label: 'myRecipes.published' },
  { key: 'draft', label: 'myRecipes.drafts' },
]

export default function MyRecipes() {
  const { t, pick, language } = useLanguage()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('status') || 'all'
  const page = Number(searchParams.get('page')) || 1
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  useDocumentTitle(t('myRecipes.title'))

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, per_page: 9 }
      if (tab !== 'all') params.status = tab
      setData(await recipeService.mine(params))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page])

  const setTab = (key) => {
    const next = new URLSearchParams()
    if (key !== 'all') next.set('status', key)
    setSearchParams(next)
  }

  const setPage = (nextPage) => {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setSearchParams(next)
  }

  const changeStatus = async (recipe) => {
    setBusy(true)
    try {
      const next = recipe.status === 'published' ? 'draft' : 'published'
      await recipeService.setStatus(recipe.id, next)
      toast.success(next === 'published' ? t('myRecipes.publishedMsg') : t('myRecipes.draftMsg'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  const deleteRecipe = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await recipeService.remove(deleteTarget.id)
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
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.myRecipes')}
        title={t('myRecipes.title')}
        subtitle={t('myRecipes.subtitle')}
        actions={<Link to="/recipes/new" className="btn btn-primary"><Plus size={16} /> {t('myRecipes.create')}</Link>}
      />

      <div className="tabs">
        {TABS.map((item) => (
          <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>
            {t(item.label)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="alert alert-error">{getErrorMessage(error, t)}<button type="button" className="btn btn-outline btn-sm" onClick={load}>{t('common.retry')}</button></div>
      ) : loading ? (
        <RecipeGridSkeleton count={6} />
      ) : data?.items?.length ? (
        <>
          <div className="manage-grid">
            {data.items.map((recipe) => (
              <article className="manage-card" key={recipe.id}>
                <div className="manage-image">
                  <img src={mediaUrl(recipe.image)} alt={pick(recipe.title, recipe.title_hi)} loading="lazy" />
                  <span className={`badge ${recipe.status === 'published' ? 'badge-success' : 'badge-draft'}`}>
                    {t(recipe.status === 'published' ? 'common.published' : 'common.draft')}
                  </span>
                  {recipe.is_featured && <span className="badge badge-gold">{t('common.featured')}</span>}
                </div>
                <div className="manage-body">
                  <h3>{pick(recipe.title, recipe.title_hi)}</h3>
                  <p>{pick(recipe.short_description, recipe.short_description_hi)}</p>
                  <div className="manage-meta">
                    <span>{recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : ''}</span>
                    <span>{formatDate(recipe.created_at, language)}</span>
                  </div>
                  <div className="manage-actions">
                    <Link to={`/recipes/${recipe.id}`} className="btn btn-ghost btn-sm"><Eye size={14} />{t('common.viewRecipe')}</Link>
                    <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-outline btn-sm"><Edit3 size={14} />{t('common.edit')}</Link>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeStatus(recipe)} disabled={busy}>
                      {recipe.status === 'published' ? <Undo2 size={14} /> : <Send size={14} />}
                      {recipe.status === 'published' ? t('myRecipes.unpublish') : t('myRecipes.publish')}
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(recipe)} aria-label={t('common.delete')}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={ChefHat}
          title={t('myRecipes.empty')}
          message={t('myRecipes.emptyHint')}
          action={t('myRecipes.create')}
          actionTo="/recipes/new"
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteRecipe}
        title={t('common.delete')}
        message={deleteTarget ? t('myRecipes.deleteConfirm', { title: pick(deleteTarget.title, deleteTarget.title_hi) }) : ''}
        loading={busy}
      />
    </div>
  )
}
