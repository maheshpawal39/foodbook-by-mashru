import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, ChefHat, Flag, Heart, LayoutGrid, MessageSquare, Plus, ShieldCheck, Star, Users,
} from 'lucide-react'
import { adminApi } from '../../services'
import { useLanguage } from '../../context/LanguageContext'
import { formatDate, getErrorMessage } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import ImageWithFallback from '../../components/ImageWithFallback'
import RatingStars from '../../components/RatingStars'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import { SkeletonGrid } from '../../components/Loader'

export default function AdminDashboard() {
  const { t, language } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useDocumentTitle(t('admin.overview'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.stats()
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
        <div className="stats-grid">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="skeleton skeleton-stat" />)}
        </div>
        <SkeletonGrid count={3} />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon={ShieldCheck} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
  }

  return (
    <div className="page admin-dashboard">
      <PageHeader
        eyebrow={t('admin.overviewSub')}
        title={t('admin.overview')}
        actions={<Link to="/admin/settings" className="btn btn-primary"><Plus size={16} /> {t('nav.website')}</Link>}
      />

      <div className="stats-grid">
        <StatCard icon={Users} label={t('admin.totalUsers')} value={data.users} tone="maroon" detail={t('admin.newWeek', { count: data.new_users_week })} />
        <StatCard icon={BookOpen} label={t('admin.totalRecipes')} value={data.recipes} tone="gold" detail={t('admin.newWeek', { count: data.new_recipes_week })} />
        <StatCard icon={ChefHat} label={t('admin.published')} value={data.published_recipes} tone="plum" />
        <StatCard icon={LayoutGrid} label={t('admin.drafts')} value={data.drafts} tone="rose" />
        <StatCard icon={LayoutGrid} label={t('admin.categories')} value={data.categories} tone="gold" />
        <StatCard icon={Star} label={t('admin.reviews')} value={data.reviews} tone="maroon" />
        <StatCard icon={Heart} label={t('admin.favorites')} value={data.favorites} tone="rose" />
        <StatCard icon={Flag} label={t('admin.pendingReports')} value={data.pending_reports} tone="plum" />
      </div>

      <div className="admin-quick-actions">
        {[
          { to: '/admin/users', icon: Users, label: t('admin.manageUsers') },
          { to: '/admin/recipes', icon: BookOpen, label: t('admin.manageRecipes') },
          { to: '/admin/categories', icon: LayoutGrid, label: t('admin.manageCategories') },
          { to: '/admin/reports', icon: Flag, label: t('admin.reviewReports'), badge: data.pending_reports },
        ].map(({ to, icon: Icon, label, badge }) => (
          <Link to={to} key={to} className="quick-action">
            <span><Icon size={19} /></span>
            <strong>{label}</strong>
            {badge ? <span className="quick-badge">{badge}</span> : <ArrowRight size={16} />}
          </Link>
        ))}
      </div>

      <div className="admin-activity-grid">
        <section className="panel admin-activity">
          <div className="panel-head">
            <h2>{t('admin.recentUsers')}</h2>
            <Link to="/admin/users" className="text-link">{t('common.viewAll')}</Link>
          </div>
          {(data.recent_users || []).map((user) => (
            <div className="activity-row" key={user.id}>
              <span className="mini-avatar">{user.name?.slice(0, 1).toUpperCase()}</span>
              <div><strong>{user.name}</strong><span>{user.email}</span></div>
              <span className="badge badge-neutral">{user.role}</span>
            </div>
          ))}
        </section>

        <section className="panel admin-activity">
          <div className="panel-head">
            <h2>{t('admin.recentRecipes')}</h2>
            <Link to="/admin/recipes" className="text-link">{t('common.viewAll')}</Link>
          </div>
          {(data.recent_recipes || []).map((recipe) => (
            <div className="activity-row" key={recipe.id}>
              <ImageWithFallback src={recipe.image} alt={recipe.title} className="activity-thumb" />
              <div><strong>{recipe.title}</strong><span>{formatDate(recipe.created_at, language)}</span></div>
              <StatusBadge status={recipe.status} />
            </div>
          ))}
        </section>

        <section className="panel admin-activity">
          <div className="panel-head">
            <h2>{t('admin.recentReviews')}</h2>
            <Link to="/admin/reviews" className="text-link">{t('common.viewAll')}</Link>
          </div>
          {(data.recent_reviews || []).map((review) => (
            <div className="activity-row" key={review.id}>
              <span className="mini-avatar">{review.user?.name?.slice(0, 1).toUpperCase()}</span>
              <div><strong>{review.recipe_title}</strong><span>{review.user?.name}</span></div>
              <RatingStars rating={review.rating} size={12} />
            </div>
          ))}
        </section>
      </div>

      <section className="panel admin-broadcast-teaser">
        <MessageSquare size={22} />
        <div>
          <h3>{t('admin.broadcast')}</h3>
          <p>{t('admin.broadcastSub')}</p>
        </div>
        <Link to="/admin/settings" className="btn btn-ghost btn-sm">{t('admin.broadcast')}</Link>
      </section>
    </div>
  )
}
