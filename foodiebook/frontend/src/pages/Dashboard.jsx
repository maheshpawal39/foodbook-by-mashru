import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChefHat,
  Heart,
  LayoutGrid,
  Plus,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import RecipeCard from '../components/RecipeCard'
import StatCard from '../components/StatCard'
import CategoryIcon from '../components/CategoryIcon'
import EmptyState from '../components/EmptyState'
import { RecipeGridSkeleton } from '../components/Loaders'
import { dashboardService } from '../services/catalogService'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useAsync, useDocumentTitle } from '../hooks/useUtils'
import { avatarUrl, getGreeting, mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function Dashboard() {
  const { t, pick } = useLanguage()
  const { user } = useAuth()
  const { data, loading, error, refresh } = useAsync(() => dashboardService.get(), [])
  useDocumentTitle(t('nav.dashboard'))

  if (loading) {
    return (
      <div className="page-stack">
        <div className="skeleton skeleton-hero" />
        <RecipeGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-stack">
        <div className="alert alert-error">
          {getErrorMessage(error, t)}
          <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>{t('common.retry')}</button>
        </div>
      </div>
    )
  }

  const { stats, featured, trending, popular, recent, recommended, categories, chefs, banner } = data
  const greeting = getGreeting(t)

  return (
    <div className="page-stack dashboard-page">
      <section className="hero-banner">
        <img src={mediaUrl(banner.banner_image)} alt="" className="hero-image" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">{greeting}, {user?.name?.split(' ')[0]}</span>
          <h1>{banner.banner_title}</h1>
          <p>{banner.banner_subtitle}</p>
          <div className="hero-actions">
            <Link to="/explore" className="btn btn-gold">
              {t('dashboard.bannerCta')} <ArrowRight size={16} />
            </Link>
            <Link to="/recipes/new" className="btn btn-glass">
              <Plus size={16} /> {t('dashboard.addRecipe')}
            </Link>
          </div>
        </div>
        <div className="hero-seal">
          <span>FOODIEBOOK</span>
          <Star size={18} fill="currentColor" />
          <small>by Marshru</small>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon={UtensilsCrossed} label={t('dashboard.statsTotal')} value={stats.total_recipes} hint={t('dashboard.subtitle')} tone="maroon" />
        <StatCard icon={ChefHat} label={t('dashboard.statsMine')} value={stats.my_recipes} hint={t('myRecipes.title')} tone="gold" />
        <StatCard icon={Heart} label={t('dashboard.statsFavorites')} value={stats.favorites} hint={t('favorites.title')} tone="rose" />
        <StatCard icon={LayoutGrid} label={t('dashboard.statsCategories')} value={stats.categories} hint={t('categories.title')} tone="green" />
      </div>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> {t('common.featured')}</span>
            <h2>{t('dashboard.featuredTitle')}</h2>
            <p>{t('dashboard.featuredSubtitle')}</p>
          </div>
          <Link to="/explore" className="link-more">{t('common.viewAll')} <ArrowRight size={15} /></Link>
        </div>
        <div className="recipe-grid featured-grid">
          {featured.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      </section>

      <section className="kitchen-cta">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> {t('kitchen.pantryTitle')}</span>
          <h2>{t('dashboard.kitchenCta')}</h2>
          <p>{t('dashboard.kitchenCtaText')}</p>
        </div>
        <Link to="/kitchen" className="btn btn-gold">{t('dashboard.tryKitchen')} <ArrowRight size={16} /></Link>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>{t('dashboard.trending')}</h2>
            <p>{t('dashboard.trendingSubtitle')}</p>
          </div>
          <Link to="/explore?sort=popular" className="link-more">{t('common.viewAll')} <ArrowRight size={15} /></Link>
        </div>
        <div className="recipe-grid">
          {trending.slice(0, 3).map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>{t('dashboard.popular')}</h2>
            <p>{t('dashboard.popularSubtitle')}</p>
          </div>
          <Link to="/explore?sort=rating" className="link-more">{t('common.viewAll')} <ArrowRight size={15} /></Link>
        </div>
        <div className="recipe-grid">
          {popular.slice(0, 3).map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      </section>

      <section className="section split-section">
        <div className="recent-column">
          <div className="section-heading">
            <div>
              <h2>{t('dashboard.recentlyAdded')}</h2>
              <p>{t('dashboard.recentlyAddedSubtitle')}</p>
            </div>
          </div>
          <div className="compact-list">
            {recent.slice(0, 5).map((recipe) => (
              <Link to={`/recipes/${recipe.id}`} className="compact-recipe" key={recipe.id}>
                <img src={mediaUrl(recipe.image)} alt={pick(recipe.title, recipe.title_hi)} loading="lazy" />
                <div>
                  <strong>{pick(recipe.title, recipe.title_hi)}</strong>
                  <span>{recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : ''} · {recipe.total_time} {t('common.minutes')}</span>
                  <span className="compact-rating"><Star size={12} fill="currentColor" /> {Number(recipe.rating_avg).toFixed(1)}</span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>

        <div className="chefs-column">
          <div className="section-heading">
            <div>
              <h2>{t('dashboard.chefsTitle')}</h2>
              <p>{t('dashboard.chefsSubtitle')}</p>
            </div>
          </div>
          <div className="chef-list">
            {chefs.map((chef) => (
              <Link to={`/explore?author_id=${chef.id}`} className="chef-card" key={chef.id}>
                <img src={avatarUrl(chef.profile_image)} alt={chef.name} />
                <div>
                  <strong>{chef.name}</strong>
                  <span>{t('common.recipesCount', { count: chef.recipe_count })}</span>
                </div>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>{t('dashboard.categoriesTitle')}</h2>
            <p>{t('dashboard.categoriesSubtitle')}</p>
          </div>
          <Link to="/categories" className="link-more">{t('common.viewAll')} <ArrowRight size={15} /></Link>
        </div>
        <div className="category-strip">
          {categories.slice(0, 10).map((category) => (
            <Link to={`/explore?category=${category.slug}`} className="category-chip-card" key={category.id}>
              <span className="category-icon-wrap"><CategoryIcon name={category.icon} size={22} /></span>
              <strong>{pick(category.name, category.name_hi)}</strong>
              <span>{t('categories.recipes', { count: category.recipe_count })}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>{t('dashboard.recommended')}</h2>
            <p>{t('dashboard.recommendedSubtitle')}</p>
          </div>
        </div>
        {recommended.length ? (
          <div className="recipe-grid">
            {recommended.slice(0, 3).map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        ) : (
          <EmptyState title={t('common.noResults')} message={t('common.noResultsHint')} />
        )}
      </section>
    </div>
  )
}
