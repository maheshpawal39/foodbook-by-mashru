import { Link } from 'react-router-dom'
import { Clock, Star, Flame } from 'lucide-react'
import ImageWithFallback from './ImageWithFallback'
import FavoriteButton from './FavoriteButton'
import { useLanguage } from '../context/LanguageContext'

export default function RecipeCard({ recipe, variant = 'default', onChange }) {
  const { t, language } = useLanguage()
  if (!recipe) return null

  const categoryName = language === 'hi' && recipe.category?.name_hi ? recipe.category.name_hi : recipe.category?.name
  const title = recipe.title

  return (
    <article className={`recipe-card recipe-card-${variant}`}>
      <Link to={`/recipes/${recipe.id}`} className="recipe-card-media" aria-label={title}>
        <ImageWithFallback src={recipe.image} alt={title} className="recipe-card-image" />
        <div className="recipe-card-shade" />
        <div className="recipe-card-top">
          <span className={`diet-pill ${recipe.diet === 'veg' ? 'is-veg' : 'is-nonveg'}`}>
            <span className="diet-dot" />
            {recipe.diet === 'veg' ? t('common.veg') : t('common.nonVeg')}
          </span>
          {recipe.is_featured ? (
            <span className="featured-pill">
              <Flame size={12} /> {t('common.featured')}
            </span>
          ) : null}
        </div>
        <div className="recipe-card-bottom">
          {categoryName ? <span className="recipe-category">{categoryName}</span> : null}
          {recipe.average_rating > 0 ? (
            <span className="recipe-rating">
              <Star size={13} fill="currentColor" /> {recipe.average_rating.toFixed(1)}
            </span>
          ) : (
            <span className="recipe-rating new">{t('detail.beFirst')}</span>
          )}
        </div>
      </Link>

      <div className="recipe-card-body">
        <div className="recipe-card-title-row">
          <h3>
            <Link to={`/recipes/${recipe.id}`}>{title}</Link>
          </h3>
          <FavoriteButton recipe={recipe} onChange={onChange} />
        </div>
        <p className="recipe-card-desc">{recipe.short_description}</p>
        <div className="recipe-card-meta">
          <span>
            <Clock size={14} /> {recipe.total_time} {t('common.min')}
          </span>
          <span className="dot-sep" />
          <span>
            {recipe.difficulty === 'Easy' ? t('common.easy') : recipe.difficulty === 'Hard' ? t('common.hard') : t('common.medium')}
          </span>
          <span className="dot-sep" />
          <span>{recipe.servings} {t('common.servings')}</span>
        </div>
        {recipe.author ? (
          <div className="recipe-card-author">
            <span className="mini-avatar">{recipe.author.name?.slice(0, 1).toUpperCase()}</span>
            <span>{recipe.author.name}</span>
            {recipe.status === 'draft' ? <span className="badge badge-draft">{t('common.draft')}</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
