import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Clock, Flame, Heart, Star, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { recipeService } from '../services/recipeService'
import { getErrorMessage } from '../utils/errors'
import { formatMinutes, mediaUrl } from '../utils/format'

export default function RecipeCard({ recipe, onFavoriteChange, variant = 'grid' }) {
  const { user } = useAuth()
  const { t, pick } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [favorited, setFavorited] = useState(Boolean(recipe.is_favorited))
  const [count, setCount] = useState(recipe.favorite_count || 0)
  const [busy, setBusy] = useState(false)

  if (!recipe) return null

  const title = pick(recipe.title, recipe.title_hi)
  const description = pick(recipe.short_description, recipe.short_description_hi)
  const categoryName = recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : ''
  const cuisine = pick(recipe.cuisine, recipe.cuisine_hi)

  const toggleFavorite = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const data = await recipeService.toggleFavorite(recipe.id)
      setFavorited(data.is_favorited)
      setCount(data.favorite_count)
      toast.success(data.is_favorited ? t('recipe.favoriteAdded') : t('recipe.favoriteRemoved'))
      onFavoriteChange?.(recipe.id, data.is_favorited)
    } catch (error) {
      toast.error(getErrorMessage(error, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`recipe-card recipe-card-${variant} ${recipe.status === 'draft' ? 'is-draft' : ''}`}>
      <div className="recipe-image-wrap">
        <Link to={`/recipes/${recipe.id}`} className="recipe-image-link" aria-label={title}>
          <img
            src={mediaUrl(recipe.image)}
            alt={title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = mediaUrl(null)
            }}
          />
        </Link>
        <div className="recipe-badges">
          {recipe.is_featured && <span className="badge badge-gold">{t('common.featured')}</span>}
          {recipe.status === 'draft' && <span className="badge badge-draft">{t('common.draft')}</span>}
          <span className={`badge badge-food ${recipe.food_type}`}>
            <span className="food-dot" />
            {t(`foodType.${recipe.food_type}`)}
          </span>
        </div>
        <button
          type="button"
          className={`favorite-btn ${favorited ? 'active' : ''}`}
          onClick={toggleFavorite}
          disabled={busy}
          aria-label={t('common.favorites')}
          title={t('common.favorites')}
        >
          <Heart size={17} fill={favorited ? 'currentColor' : 'none'} />
        </button>
        {categoryName && <span className="recipe-category-tag">{categoryName}</span>}
      </div>

      <div className="recipe-card-body">
        <div className="recipe-card-topline">
          <span className="recipe-cuisine">{cuisine}</span>
          <span className="recipe-rating">
            <Star size={13} fill="currentColor" />
            {Number(recipe.rating_avg || 0).toFixed(1)}
            <span className="muted">({recipe.rating_count || 0})</span>
          </span>
        </div>
        <h3>
          <Link to={`/recipes/${recipe.id}`}>{title}</Link>
        </h3>
        <p className="recipe-description">{description}</p>
        <div className="recipe-meta">
          <span><Clock size={14} />{formatMinutes(recipe.total_time, t)}</span>
          <span><Flame size={14} />{t(`difficulty.${recipe.difficulty}`)}</span>
          <span><Users size={14} />{recipe.servings}</span>
        </div>
        {recipe.author && (
          <div className="recipe-card-footer">
            <Link to={`/explore?author_id=${recipe.author.id}`} className="author-mini">
              <img
                src={mediaUrl(recipe.author.profile_image, '/uploads/defaults/avatar-default.jpg')}
                alt={recipe.author.name}
                onError={(event) => { event.currentTarget.src = mediaUrl(null) }}
              />
              <span>{recipe.author.name}</span>
            </Link>
            <span className="favorite-count"><Heart size={13} />{count}</span>
          </div>
        )}
      </div>
    </article>
  )
}
