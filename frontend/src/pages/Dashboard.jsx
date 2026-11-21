import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, ChefHat, Clock, Flame, Heart, LayoutGrid, Plus, Sparkles, Star, UsersRound,
} from 'lucide-react'
import { dashboardApi } from '../services'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import SectionHeader from '../components/SectionHeader'
import RecipeGrid from '../components/RecipeGrid'
import CategoryCard from '../components/CategoryCard'
import ChefCard from '../components/ChefCard'
import ImageWithFallback from '../components/ImageWithFallback'
import FavoriteButton from '../components/FavoriteButton'
import { FullPageLoader, SkeletonGrid } from '../components/Loader'
import EmptyState from '../components/EmptyState'

function greetingKey() {
  const hour = new Date().getHours()
  if (hour < 12) return 'dashboard.greetingMorning'
  if (hour < 17) return 'dashboard.greetingAfternoon'
  return 'dashboard.greetingEvening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useDocumentTitle(t('nav.dashboard'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await dashboardApi.get()
      setData(response.data?.data)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton skeleton-hero" />
        <SkeletonGrid count={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <EmptyState
          icon={Flame}
          title={t('dashboard.loadError')}
          message={error}
          action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>}
        />
      </div>
    )
  }

  const featured = data?.featured
  const firstName = (data?.greeting_name || user?.name || '').split(' ')[0]

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={t(greetingKey())}
        title={t('dashboard.welcome', { name: firstName })}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Link to="/kitchen" className="btn btn-ghost"><ChefHat size={17} /> {t('nav.kitchen')}</Link>
            <Link to="/recipes/new" className="btn btn-primary"><Plus size={17} /> {t('nav.addRecipe')}</Link>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard icon={BookOpen} label={t('dashboard.totalRecipes')} value={data?.stats?.total_recipes ?? 0} tone="maroon" />
        <StatCard icon={ChefHat} label={t('dashboard.myRecipes')} value={data?.stats?.my_recipes ?? 0} tone="gold" />
        <StatCard icon={Heart} label={t('dashboard.favoriteRecipes')} value={data?.stats?.favorites ?? 0} tone="rose" />
        <StatCard icon={LayoutGrid} label={t('dashboard.totalCategories')} value={data?.stats?.categories ?? 0} tone="plum" />
      </div>

      {featured ? (
        <section className="featured-banner">
          <div className="featured-media">
            <ImageWithFallback src={featured.image} alt={featured.title} />
            <div className="featured-gradient" />
          </div>
          <div className="featured-copy">
            <span className="eyebrow gold"><Sparkles size={14} /> {t('dashboard.featured')}</span>
            <h2>{featured.title}</h2>
            <p>{featured.short_description}</p>
            <div className="featured-meta">
              <span><Clock size={15} /> {featured.total_time} {t('common.min')}</span>
              <span><Star size={15} fill="currentColor" /> {featured.average_rating || '—'} ({featured.review_count})</span>
              <span><UsersRound size={15} /> {featured.servings} {t('common.servings')}</span>
            </div>
            <div className="featured-actions">
              <Link to={`/recipes/${featured.id}`} className="btn btn-gold">
                {t('dashboard.openFeatured')} <ArrowRight size={16} />
              </Link>
              <FavoriteButton recipe={featured} showLabel />
            </div>
          </div>
          <div className="featured-author">
            <span className="mini-avatar">{featured.author?.name?.slice(0, 1)}</span>
            <span>{featured.author?.name}</span>
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow={t('dashboard.categoriesSub')}
          title={t('dashboard.categories')}
          actionLabel={t('common.viewAll')}
          actionTo="/categories"
        />
        <div className="category-scroller">
          {data?.categories?.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow={t('dashboard.trendingSub')}
          title={t('dashboard.trending')}
          actionLabel={t('common.viewAll')}
          actionTo="/explore?sort=popular"
          icon={Flame}
        />
        <RecipeGrid recipes={data?.trending || []} variant="compact" />
      </section>

      <div className="dashboard-split">
        <section>
          <SectionHeader
            eyebrow={t('dashboard.popularSub')}
            title={t('dashboard.popular')}
            actionLabel={t('common.viewAll')}
            actionTo="/explore?sort=rating"
            icon={Star}
          />
          <div className="mini-list">
            {(data?.popular || []).map((recipe, index) => (
              <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="mini-recipe">
                <span className="mini-rank">{String(index + 1).padStart(2, '0')}</span>
                <ImageWithFallback src={recipe.image} alt={recipe.title} />
                <div className="mini-recipe-copy">
                  <strong>{recipe.title}</strong>
                  <span>{recipe.category?.name} · {recipe.total_time} {t('common.min')}</span>
                </div>
                <span className="mini-rating"><Star size={13} fill="currentColor" /> {recipe.average_rating || '—'}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow={t('dashboard.chefsSub')}
            title={t('dashboard.chefs')}
            icon={ChefHat}
          />
          <div className="chef-grid">
            {(data?.chefs || []).map((chef) => (
              <ChefCard key={chef.id} chef={chef} />
            ))}
          </div>
        </section>
      </div>

      <section>
        <SectionHeader
          eyebrow={t('dashboard.recentSub')}
          title={t('dashboard.recent')}
          actionLabel={t('common.viewAll')}
          actionTo="/explore?sort=newest"
        />
        <RecipeGrid recipes={data?.recent || []} />
      </section>

      <section>
        <SectionHeader
          eyebrow={t('dashboard.recommendedSub')}
          title={t('dashboard.recommended')}
          actionLabel={t('common.viewAll')}
          actionTo="/explore?sort=rating"
          icon={Sparkles}
        />
        <RecipeGrid recipes={data?.recommended || []} />
      </section>
    </div>
  )
}
