import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera,
  ChefHat,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Save,
  Star,
  UserRound,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import StarRating from '../components/StarRating'
import EmptyState from '../components/EmptyState'
import { InlineLoader } from '../components/Loaders'
import { authService } from '../services/authService'
import { favoriteService, userService, uploadService } from '../services/userService'
import { recipeService } from '../services/recipeService'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useDocumentTitle } from '../hooks/useUtils'
import { formatDate, mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

const TABS = [
  { key: 'recipes', label: 'profile.tabRecipes', icon: ChefHat },
  { key: 'favorites', label: 'profile.tabFavorites', icon: Heart },
  { key: 'reviews', label: 'profile.tabReviews', icon: MessageSquare },
]

export default function Profile() {
  const { t, pick, language } = useLanguage()
  const { user, updateLocalUser } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', bio: '', profile_image: '' })
  const [saveLoading, setSaveLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [tab, setTab] = useState('recipes')
  const [items, setItems] = useState([])
  const [tabLoading, setTabLoading] = useState(true)
  const fileRef = useRef(null)
  useDocumentTitle(t('profile.title'))

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      email: user.email || '',
      bio: user.bio || '',
      profile_image: user.profile_image || '',
    })
  }, [user])

  useEffect(() => {
    let active = true
    const load = async () => {
      setTabLoading(true)
      setItems([])
      try {
        if (tab === 'recipes') {
          const data = await recipeService.mine({ per_page: 6 })
          if (active) setItems(data.items)
        } else if (tab === 'favorites') {
          const data = await favoriteService.list({ per_page: 6 })
          if (active) setItems(data.items)
        } else {
          const data = await userService.myReviews()
          if (active) setItems(data.items)
        }
      } catch (error) {
        /* handled by empty state */
      } finally {
        if (active) setTabLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [tab])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaveLoading(true)
    try {
      const data = await authService.updateProfile(form)
      updateLocalUser(data.user)
      toast.success(t('profile.updated'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setSaveLoading(false)
    }
  }

  const changePicture = async (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(t('recipeForm.imageTypeError'))
      return
    }
    setUploading(true)
    try {
      const upload = await uploadService.image(file, 'avatar')
      const data = await authService.updateProfile({ ...form, profile_image: upload.path })
      updateLocalUser(data.user)
      setForm((current) => ({ ...current, profile_image: upload.path }))
      toast.success(t('profile.updated'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    if (passwordForm.new_password !== passwordForm.confirm) {
      setPasswordError(t('profile.passwordMismatch'))
      return
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError(t('validation.password'))
      return
    }
    setPasswordLoading(true)
    try {
      await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm: '' })
      toast.success(t('profile.passwordUpdated'))
    } catch (err) {
      setPasswordError(getErrorMessage(err, t))
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('nav.profile')} title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <section className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-hero-content">
          <div className="profile-avatar-wrap">
            <Avatar user={{ ...user, profile_image: form.profile_image }} size={112} />
            <button type="button" className="avatar-camera" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label={t('profile.editPicture')}>
              <Camera size={17} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => changePicture(event.target.files?.[0])}
            />
          </div>
          <div className="profile-hero-copy">
            <h1>{user.name}</h1>
            <p>{user.bio || t('profile.bioPlaceholder')}</p>
            <div className="profile-meta">
              <span><Mail size={14} /> {user.email}</span>
              <span><UserRound size={14} /> {user.role === 'admin' ? t('settings.admin') : t('settings.user')}</span>
              <span>{t('profile.joined', { date: formatDate(user.created_at, language) })}</span>
            </div>
          </div>
          <div className="profile-hero-stats">
            <div><strong>{user.recipe_count || 0}</strong><span>{t('profile.statsRecipes')}</span></div>
            <div><strong>{user.favorites_count || 0}</strong><span>{t('profile.statsFavorites')}</span></div>
            <div><strong>{user.reviews_count || 0}</strong><span>{t('profile.statsReviews')}</span></div>
          </div>
        </div>
        {uploading && <span className="profile-uploading">{t('common.uploading')}</span>}
      </section>

      <div className="profile-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>{t('profile.personalInfo')}</h2><p>{t('profile.uploadHint')}</p></div>
            <span className="section-icon"><UserRound size={18} /></span>
          </div>
          <form className="stack-form" onSubmit={saveProfile}>
            <div className="field">
              <label>{t('profile.name')}</label>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={120} />
            </div>
            <div className="field">
              <label>{t('profile.email')}</label>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </div>
            <div className="field">
              <label>{t('profile.bio')}</label>
              <textarea rows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder={t('profile.bioPlaceholder')} maxLength={1000} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saveLoading}>
              <Save size={16} /> {saveLoading ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><h2>{t('profile.security')}</h2><p>{t('auth.passwordHint')}</p></div>
            <span className="section-icon"><KeyRound size={18} /></span>
          </div>
          {passwordError && <div className="alert alert-error">{passwordError}</div>}
          <form className="stack-form" onSubmit={changePassword}>
            <div className="field">
              <label>{t('profile.currentPassword')}</label>
              <div className="input-icon">
                <Lock size={16} />
                <input type={showPasswords ? 'text' : 'password'} value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} required autoComplete="current-password" />
                <button type="button" className="input-action" onClick={() => setShowPasswords((v) => !v)}>
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="field">
              <label>{t('profile.newPassword')}</label>
              <input type={showPasswords ? 'text' : 'password'} value={passwordForm.new_password} onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} required autoComplete="new-password" />
            </div>
            <div className="field">
              <label>{t('profile.confirmPassword')}</label>
              <input type={showPasswords ? 'text' : 'password'} value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} required autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-outline" disabled={passwordLoading}>
              <Lock size={15} /> {passwordLoading ? t('common.saving') : t('profile.updatePassword')}
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              <Icon size={15} /> {t(label)}
            </button>
          ))}
        </div>

        {tabLoading ? (
          <InlineLoader />
        ) : items.length === 0 ? (
          <EmptyState
            icon={tab === 'recipes' ? ChefHat : tab === 'favorites' ? Heart : Star}
            title={tab === 'recipes' ? t('profile.noRecipes') : tab === 'favorites' ? t('profile.noFavorites') : t('profile.noReviews')}
            action={tab === 'reviews' ? undefined : t('favorites.browse')}
            actionTo={tab === 'reviews' ? undefined : '/explore'}
            compact
          />
        ) : tab === 'reviews' ? (
          <div className="profile-reviews">
            {items.map((review) => (
              <Link to={review.recipe ? `/recipes/${review.recipe.id}` : '#'} key={review.id} className="profile-review">
                {review.recipe?.image && <img src={mediaUrl(review.recipe.image)} alt="" />}
                <div>
                  <strong>{pick(review.recipe?.title, review.recipe?.title_hi)}</strong>
                  <StarRating value={review.rating} size={13} />
                  <p>{review.comment}</p>
                  <span>{formatDate(review.created_at, language)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="profile-recipes">
            {items.map((recipe) => (
              <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="profile-recipe">
                <img src={mediaUrl(recipe.image)} alt={pick(recipe.title, recipe.title_hi)} />
                <div>
                  <strong>{pick(recipe.title, recipe.title_hi)}</strong>
                  <span>{recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : ''} · {recipe.total_time} {t('common.minutes')}</span>
                </div>
                <Star size={14} /> {Number(recipe.rating_avg).toFixed(1)}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
