import { useEffect, useState } from 'react'
import {
  BookOpen,
  Flag,
  Heart,
  LayoutGrid,
  Star,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import StatCard from '../../components/StatCard'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { getErrorMessage } from '../../utils/errors'

export default function AdminOverview({ onNavigate }) {
  const { t, pick } = useLanguage()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminService.stats().then(setStats).catch(setError)
  }, [])

  if (error) return <div className="alert alert-error">{getErrorMessage(error, t)}</div>
  if (!stats) return <PanelSkeleton rows={8} />

  const maxCategory = Math.max(1, ...stats.categories_breakdown.map((item) => item.count))

  return (
    <div className="admin-overview">
      <div className="stats-grid">
        <StatCard icon={Users} label={t('admin.statsUsers')} value={stats.users.total} hint={`${stats.users.active} ${t('admin.active')}`} tone="maroon" />
        <StatCard icon={UtensilsCrossed} label={t('admin.statsRecipes')} value={stats.recipes.total} hint={`${stats.recipes.published} ${t('admin.publishedRecipes')}`} tone="gold" />
        <StatCard icon={BookOpen} label={t('admin.statsDrafts')} value={stats.recipes.drafts} hint={t('admin.draftRecipes')} tone="green" />
        <StatCard icon={Star} label={t('admin.statsReviews')} value={stats.reviews} hint={`${t('admin.avgRating')}: ${stats.avg_rating}`} tone="rose" />
        <StatCard icon={Flag} label={t('admin.statsReports')} value={stats.reports_open} hint={t('admin.reportedContent')} tone="red" />
        <StatCard icon={LayoutGrid} label={t('admin.statsCategories')} value={stats.categories} hint={t('categories.title')} tone="gold" />
        <StatCard icon={Heart} label={t('admin.statsFavorites')} value={stats.favorites} hint={t('common.favorites')} tone="rose" />
        <StatCard icon={TrendingUp} label={t('admin.newThisWeek')} value={stats.users.new_this_week} hint={`${stats.recipes.new_this_week} ${t('admin.recipes')}`} tone="green" />
      </div>

      <div className="admin-overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>{t('admin.categoryBreakdown')}</h2><p>{t('admin.categoriesHint')}</p></div>
            <button type="button" className="link-btn" onClick={() => onNavigate('categories')}>{t('common.viewAll')}</button>
          </div>
          <div className="breakdown-list">
            {stats.categories_breakdown.map((item) => (
              <div className="breakdown-row" key={item.name}>
                <span>{pick(item.name, item.name_hi)}</span>
                <div className="breakdown-track"><span style={{ width: `${(item.count / maxCategory) * 100}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel admin-quick">
          <h2>{t('admin.overview')}</h2>
          <p>{t('admin.subtitle')}</p>
          <div className="quick-grid">
            <button type="button" onClick={() => onNavigate('users')}><Users size={18} /><span>{t('admin.users')}</span><strong>{stats.users.total}</strong></button>
            <button type="button" onClick={() => onNavigate('recipes')}><UtensilsCrossed size={18} /><span>{t('admin.recipes')}</span><strong>{stats.recipes.total}</strong></button>
            <button type="button" onClick={() => onNavigate('reviews')}><Star size={18} /><span>{t('admin.reviews')}</span><strong>{stats.reviews}</strong></button>
            <button type="button" onClick={() => onNavigate('reports')}><Flag size={18} /><span>{t('admin.reports')}</span><strong>{stats.reports_open}</strong></button>
            <button type="button" onClick={() => onNavigate('featured')}><Heart size={18} /><span>{t('admin.featured')}</span><strong>{stats.recipes.featured}</strong></button>
            <button type="button" onClick={() => onNavigate('settings')}><LayoutGrid size={18} /><span>{t('admin.settings')}</span><strong>{stats.settings_count}</strong></button>
          </div>
        </section>
      </div>
    </div>
  )
}
