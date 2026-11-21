import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CookingPot, Edit3, Plus, Send, Trash2, Undo2 } from 'lucide-react'
import { recipesApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import RecipeCard from '../components/RecipeCard'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import { SkeletonGrid } from '../components/Loader'

const TABS = [
  { value: '', label: 'myRecipes.all' },
  { value: 'published', label: 'myRecipes.published' },
  { value: 'draft', label: 'myRecipes.drafts' },
]

export default function MyRecipes() {
  const { t } = useLanguage()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const page = Number(params.get('page') || 1)
  const [recipes, setRecipes] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  useDocumentTitle(t('myRecipes.title'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await recipesApi.mine({ status: status || undefined, page, per_page: 9 })
      setRecipes(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [status, page, t])

  useEffect(() => {
    load()
  }, [load])

  const changeTab = (nextStatus) => {
    const next = new URLSearchParams()
    if (nextStatus) next.set('status', nextStatus)
    setParams(next)
  }

  const goPage = (nextPage) => {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  const toggleStatus = async (recipe) => {
    setBusyId(recipe.id)
    try {
      const nextStatus = recipe.status === 'published' ? 'draft' : 'published'
      await recipesApi.setStatus(recipe.id, nextStatus)
      toast.success(nextStatus === 'published' ? t('myRecipes.publishedMsg') : t('myRecipes.draftMsg'))
      await load()
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
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={t('myRecipes.subtitle')}
        title={t('myRecipes.title')}
        actions={<Link to="/recipes/new" className="btn btn-primary"><Plus size={17} /> {t('myRecipes.newRecipe')}</Link>}
      />

      <div className="tabs">
        {TABS.map((tab) => (
          <button key={tab.value} type="button" className={status === tab.value ? 'active' : ''} onClick={() => changeTab(tab.value)}>
            {t(tab.label)}
            {tab.value === '' && pagination ? <span className="tab-count">{pagination.total}</span> : null}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState icon={CookingPot} title={t('explore.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonGrid count={6} />
      ) : recipes.length ? (
        <>
          <div className="recipe-grid my-recipes-grid">
            {recipes.map((recipe) => (
              <div className="my-recipe-wrap" key={recipe.id}>
                <RecipeCard recipe={recipe} />
                <div className="my-recipe-actions">
                  <StatusBadge status={recipe.status} />
                  <div>
                    <Link to={`/recipes/${recipe.id}/edit`} className="icon-btn" title={t('common.edit')}><Edit3 size={16} /></Link>
                    <button type="button" className="icon-btn" disabled={busyId === recipe.id} onClick={() => toggleStatus(recipe)} title={recipe.status === 'published' ? t('common.unpublish') : t('common.publish')}>
                      {recipe.status === 'published' ? <Undo2 size={16} /> : <Send size={16} />}
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(recipe)} title={t('common.delete')}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={pagination?.page || 1} pages={pagination?.pages || 1} total={pagination?.total} onPage={goPage} />
        </>
      ) : (
        <EmptyState
          icon={CookingPot}
          title={t('myRecipes.empty')}
          message={t('myRecipes.emptyFiltered')}
          action={<Link to="/recipes/new" className="btn btn-primary"><Plus size={16} /> {t('myRecipes.createFirst')}</Link>}
        />
      )}

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={removeRecipe} title={t('common.confirmDelete')} message={deleteTarget?.title} />
    </div>
  )
}
