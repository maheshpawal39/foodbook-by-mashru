import { useSearchParams } from 'react-router-dom'
import {
  Flag,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useLanguage } from '../../context/LanguageContext'
import { useDocumentTitle } from '../../hooks/useUtils'
import AdminOverview from './AdminOverview'
import AdminUsers from './AdminUsers'
import AdminRecipes from './AdminRecipes'
import AdminCategories from './AdminCategories'
import AdminReviews from './AdminReviews'
import AdminReports from './AdminReports'
import AdminFeatured from './AdminFeatured'
import AdminSettings from './AdminSettings'

const TABS = [
  { key: 'overview', label: 'admin.overview', icon: LayoutGrid },
  { key: 'users', label: 'admin.users', icon: Users },
  { key: 'recipes', label: 'admin.recipes', icon: UtensilsCrossed },
  { key: 'categories', label: 'admin.categories', icon: Sparkles },
  { key: 'reviews', label: 'admin.reviews', icon: Star },
  { key: 'reports', label: 'admin.reports', icon: Flag },
  { key: 'featured', label: 'admin.featured', icon: ShieldCheck },
  { key: 'settings', label: 'admin.settings', icon: Settings },
]

export default function AdminDashboard() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'
  useDocumentTitle(t('admin.title'))

  const setTab = (key) => {
    const next = new URLSearchParams(searchParams)
    if (key === 'overview') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next)
  }

  return (
    <div className="page-stack admin-page">
      <PageHeader
        eyebrow={t('common.admin')}
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={<span className="admin-badge"><ShieldCheck size={15} /> {t('common.admin')}</span>}
      />

      <nav className="admin-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            <Icon size={15} />
            <span>{t(label)}</span>
          </button>
        ))}
      </nav>

      {tab === 'overview' && <AdminOverview onNavigate={setTab} />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'recipes' && <AdminRecipes />}
      {tab === 'categories' && <AdminCategories />}
      {tab === 'reviews' && <AdminReviews />}
      {tab === 'reports' && <AdminReports />}
      {tab === 'featured' && <AdminFeatured />}
      {tab === 'settings' && <AdminSettings />}
    </div>
  )
}
