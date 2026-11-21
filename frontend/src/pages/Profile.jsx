import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Camera, Heart, KeyRound, Mail, MessageSquare, Pencil, Star, User as UserIcon } from 'lucide-react'
import { authApi, favoritesApi, recipesApi, reviewsApi } from '../services'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { formatDate, getErrorMessage, initials } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import RecipeCard from '../components/RecipeCard'
import RatingStars from '../components/RatingStars'
import EmptyState from '../components/EmptyState'
import { InlineLoader } from '../components/Loader'

const TABS = [
  { key: 'recipes', label: 'profile.myRecipes' },
  { key: 'favorites', label: 'favorites.title' },
  { key: 'reviews', label: 'profile.myReviews' },
]

export default function Profile() {
  const { user, updateUser, refresh } = useAuth()
  const { t, language } = useLanguage()
  const toast = useToast()
  const fileRef = useRef(null)
  const [tab, setTab] = useState('recipes')
  const [form, setForm] = useState({ name: '', email: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})
  const [recipes, setRecipes] = useState([])
  const [favorites, setFavorites] = useState([])
  const [reviews, setReviews] = useState([])
  useDocumentTitle(t('profile.title'))

  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '', bio: user.bio || '' })
  }, [user?.id, user?.name, user?.email, user?.bio])

  useEffect(() => {
    Promise.all([
      recipesApi.mine({ per_page: 6 }).then((response) => setRecipes(response.data?.data || [])),
      favoritesApi.list({ per_page: 6 }).then((response) => setFavorites(response.data?.data || [])),
      reviewsApi.mine().then((response) => setReviews(response.data?.data || [])),
    ]).catch(() => {})
  }, [])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const response = await authApi.updateProfile(form)
      updateUser(response.data?.data)
      toast.success(t('profile.saved'))
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      toast.error(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      toast.error(t('form.imageTooLarge'))
      return
    }
    setUploading(true)
    try {
      const response = await authApi.uploadAvatar(file)
      updateUser(response.data?.data)
      await refresh()
      toast.success(t('profile.avatarUpdated'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!user) return null

  const tabContent = useMemo(() => {
    if (tab === 'recipes') {
      return recipes.length ? (
        <div className="recipe-grid">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
      ) : (
        <EmptyState icon={BookOpen} title={t('myRecipes.empty')} action={<Link to="/recipes/new" className="btn btn-primary">{t('myRecipes.createFirst')}</Link>} />
      )
    }
    if (tab === 'favorites') {
      return favorites.length ? (
        <div className="recipe-grid">{favorites.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
      ) : (
        <EmptyState icon={Heart} title={t('favorites.empty')} action={<Link to="/explore" className="btn btn-primary">{t('favorites.explore')}</Link>} />
      )
    }
    return reviews.length ? (
      <div className="my-review-list">
        {reviews.map((review) => (
          <article className="my-review panel" key={review.id}>
            <div className="my-review-head">
              <Link to={`/recipes/${review.recipe_id}`}><strong>{review.recipe_title}</strong></Link>
              <RatingStars rating={review.rating} size={14} />
            </div>
            <p>{review.comment}</p>
            <span>{formatDate(review.created_at, language)}</span>
          </article>
        ))}
      </div>
    ) : (
      <EmptyState icon={MessageSquare} title={t('profile.noReviews')} />
    )
  }, [tab, recipes, favorites, reviews, t, language])

  return (
    <div className="page profile-page">
      <PageHeader eyebrow={t('profile.subtitle')} title={t('profile.title')} actions={<UserIcon size={28} className="page-watermark" />} />

      <div className="profile-layout">
        <aside className="profile-aside">
          <div className="panel profile-card">
            <div className="profile-avatar-large">
              {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{initials(user.name)}</span>}
              <button type="button" className="avatar-edit" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label={t('profile.editPhoto')}>
                {uploading ? <InlineLoader /> : <Camera size={16} />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} hidden />
            </div>
            <h2>{user.name}</h2>
            <p className="profile-role">{user.is_admin ? t('auth.demoAdmin') : t('auth.demoUser')}</p>
            <span className="profile-joined">{t('profile.memberSince', { date: formatDate(user.created_at, language) })}</span>
            <div className="profile-stats-inline">
              <span><strong>{user.recipe_count}</strong>{t('profile.recipes')}</span>
              <span><strong>{user.favorite_count}</strong>{t('profile.favorites')}</span>
              <span><strong>{user.review_count}</strong>{t('profile.reviews')}</span>
            </div>
            <Link to="/settings" className="btn btn-ghost btn-block"><KeyRound size={16} /> {t('profile.changePassword')}</Link>
          </div>

          <div className="panel profile-tip">
            <Star size={18} />
            <p>{t('footer.made')}</p>
          </div>
        </aside>

        <div className="profile-main">
          <section className="panel profile-form-card">
            <div className="panel-head">
              <div>
                <span className="eyebrow">{t('profile.accountDetails')}</span>
                <h2>{t('profile.title')}</h2>
              </div>
            </div>
            <form onSubmit={saveProfile} className="profile-form">
              <div className="form-row">
                <div className={`field ${errors.name ? 'has-error' : ''}`}>
                  <label htmlFor="profile-name">{t('profile.name')}</label>
                  <div className="input-icon">
                    <UserIcon size={16} />
                    <input id="profile-name" type="text" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
                  </div>
                  {errors.name ? <span className="field-error">{errors.name}</span> : null}
                </div>
                <div className={`field ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor="profile-email">{t('profile.email')}</label>
                  <div className="input-icon">
                    <Mail size={16} />
                    <input id="profile-email" type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
                  </div>
                  {errors.email ? <span className="field-error">{errors.email}</span> : null}
                </div>
              </div>
              <div className="field">
                <label htmlFor="profile-bio">{t('profile.bio')}</label>
                <textarea id="profile-bio" rows={4} value={form.bio} onChange={(event) => setForm((c) => ({ ...c, bio: event.target.value }))} placeholder={t('profile.bioPlaceholder')} maxLength={500} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <InlineLoader /> : <><Pencil size={16} /> {t('profile.save')}</>}
              </button>
            </form>
          </section>

          <div className="stats-grid profile-stats">
            <StatCard icon={BookOpen} label={t('profile.recipes')} value={user.recipe_count} tone="maroon" />
            <StatCard icon={Heart} label={t('profile.favorites')} value={user.favorite_count} tone="rose" />
            <StatCard icon={MessageSquare} label={t('profile.reviews')} value={user.review_count} tone="gold" />
          </div>

          <section className="profile-activity">
            <div className="tabs">
              {TABS.map((item) => (
                <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>
                  {t(item.label)}
                </button>
              ))}
            </div>
            {tabContent}
          </section>
        </div>
      </div>
    </div>
  )
}
