import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Star, TrendingUp } from 'lucide-react'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { mediaUrl } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

export default function AdminFeatured() {
  const { t, pick } = useLanguage()
  const { toast } = useToast()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const data = await adminService.recipes({ featured: 1, per_page: 50 })
      setItems(data.items)
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => { load() }, [])

  const unfeature = async (recipe) => {
    try {
      await adminService.updateRecipe(recipe.id, { is_featured: false })
      toast.success(t('admin.featureSaved'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  if (error) return <div className="alert alert-error">{getErrorMessage(error, t)}</div>
  if (!items) return <PanelSkeleton rows={6} />

  return (
    <div className="admin-section">
      <div className="panel">
        <div className="panel-heading">
          <div><h2>{t('admin.featuredTitle')}</h2><p>{t('admin.featuredHint')}</p></div>
          <span className="admin-count"><TrendingUp size={15} /> {items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="table-empty">{t('admin.notFeatured')}</p>
        ) : (
          <div className="featured-admin-grid">
            {items.map((recipe) => (
              <article className="featured-admin-card" key={recipe.id}>
                <img src={mediaUrl(recipe.image)} alt={pick(recipe.title, recipe.title_hi)} />
                <div>
                  <span className="badge badge-gold"><Star size={11} fill="currentColor" /> {t('common.featured')}</span>
                  <h3>{pick(recipe.title, recipe.title_hi)}</h3>
                  <p>{pick(recipe.cuisine, recipe.cuisine_hi)} · {recipe.author?.name}</p>
                  <div className="featured-actions">
                    <Link to={`/recipes/${recipe.id}`} className="btn btn-ghost btn-sm"><Eye size={14} /> {t('common.viewRecipe')}</Link>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => unfeature(recipe)}>{t('admin.removeFeature')}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
