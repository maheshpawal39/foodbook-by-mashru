import { useEffect, useMemo, useState } from 'react'
import { Globe2, Megaphone, Save, Send } from 'lucide-react'
import { adminApi, notificationsApi, settingsApi } from '../../services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { getErrorMessage } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import Field from '../../components/Field'
import ImageWithFallback from '../../components/ImageWithFallback'
import { InlineLoader, SkeletonRows } from '../../components/Loader'

const EMPTY = {
  site_name: '',
  site_tagline: '',
  site_description: '',
  about_text: '',
  contact_email: '',
  instagram_url: '',
  youtube_url: '',
  featured_recipe_ids: [],
  maintenance_mode: false,
}

export default function AdminSettings() {
  const { t } = useLanguage()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState({ title: '', message: '', link: '' })
  const [sending, setSending] = useState(false)
  useDocumentTitle(t('admin.settingsTitle'))

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      adminApi.recipes({ per_page: 100 }),
    ])
      .then(([settingsResponse, recipesResponse]) => {
        const settings = settingsResponse.data?.data || {}
        setForm({
          site_name: settings.site_name || '',
          site_tagline: settings.site_tagline || '',
          site_description: settings.site_description || '',
          about_text: settings.about_text || '',
          contact_email: settings.contact_email || '',
          instagram_url: settings.instagram_url || '',
          youtube_url: settings.youtube_url || '',
          featured_recipe_ids: (settings.featured_recipes || []).map((recipe) => recipe.id),
          maintenance_mode: settings.maintenance_mode === 'true',
        })
        setRecipes(recipesResponse.data?.data || [])
      })
      .catch((err) => setError(getErrorMessage(err, t)))
      .finally(() => setLoading(false))
  }, [t])

  const publishedRecipes = useMemo(() => recipes.filter((recipe) => recipe.status === 'published'), [recipes])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await settingsApi.update({
        ...form,
        featured_recipe_ids: form.featured_recipe_ids.join(','),
        maintenance_mode: form.maintenance_mode,
      })
      toast.success(t('admin.settingsSaved'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const sendAnnouncement = async (event) => {
    event.preventDefault()
    if (!announcement.title.trim()) return
    setSending(true)
    try {
      await notificationsApi.broadcast(announcement)
      toast.success(t('admin.announcementSent'))
      setAnnouncement({ title: '', message: '', link: '' })
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setSending(false)
    }
  }

  const toggleFeatured = (recipeId) => {
    setForm((current) => ({
      ...current,
      featured_recipe_ids: current.featured_recipe_ids.includes(recipeId)
        ? current.featured_recipe_ids.filter((id) => id !== recipeId)
        : [...current.featured_recipe_ids, recipeId],
    }))
  }

  if (loading) return <div className="page"><SkeletonRows count={8} /></div>

  return (
    <div className="page admin-settings-page">
      <PageHeader eyebrow={t('admin.settingsSub')} title={t('admin.settingsTitle')} actions={<Globe2 size={28} className="page-watermark" />} />
      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={save} className="settings-form">
        <section className="panel form-section">
          <div className="form-section-head">
            <span className="form-section-icon"><Globe2 size={19} /></span>
            <div><h2>{t('admin.settingsTitle')}</h2><p>{t('admin.settingsSub')}</p></div>
          </div>
          <div className="form-grid">
            <Field label={t('admin.siteName')} htmlFor="site_name">
              <input id="site_name" type="text" value={form.site_name} onChange={(event) => update('site_name', event.target.value)} />
            </Field>
            <Field label={t('admin.tagline')} htmlFor="site_tagline">
              <input id="site_tagline" type="text" value={form.site_tagline} onChange={(event) => update('site_tagline', event.target.value)} />
            </Field>
            <Field label={t('admin.siteDescription')} htmlFor="site_description" className="span-2">
              <input id="site_description" type="text" value={form.site_description} onChange={(event) => update('site_description', event.target.value)} />
            </Field>
            <Field label={t('admin.aboutText')} htmlFor="about_text" className="span-2">
              <textarea id="about_text" rows={4} value={form.about_text} onChange={(event) => update('about_text', event.target.value)} />
            </Field>
            <Field label={t('admin.contactEmail')} htmlFor="contact_email">
              <input id="contact_email" type="email" value={form.contact_email} onChange={(event) => update('contact_email', event.target.value)} />
            </Field>
            <Field label={t('admin.instagram')} htmlFor="instagram_url">
              <input id="instagram_url" type="url" value={form.instagram_url} onChange={(event) => update('instagram_url', event.target.value)} />
            </Field>
            <Field label={t('admin.youtube')} htmlFor="youtube_url">
              <input id="youtube_url" type="url" value={form.youtube_url} onChange={(event) => update('youtube_url', event.target.value)} />
            </Field>
            <Field label={t('admin.maintenance')} htmlFor="maintenance_mode" hint={t('admin.maintenanceHint')}>
              <label className="switch-row">
                <input id="maintenance_mode" type="checkbox" checked={form.maintenance_mode} onChange={(event) => update('maintenance_mode', event.target.checked)} />
                <span className="toggle"><span /></span>
                <span>{form.maintenance_mode ? t('admin.active') : t('admin.inactive')}</span>
              </label>
            </Field>
          </div>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="form-section-icon"><Globe2 size={19} /></span>
            <div><h2>{t('admin.featuredRecipes')}</h2><p>{t('admin.featuredHint')}</p></div>
          </div>
          <div className="featured-selector">
            {publishedRecipes.map((recipe) => (
              <button
                type="button"
                key={recipe.id}
                className={`featured-option ${form.featured_recipe_ids.includes(recipe.id) ? 'selected' : ''}`}
                onClick={() => toggleFeatured(recipe.id)}
              >
                {recipe.image ? <ImageWithFallback src={recipe.image} alt={recipe.title} /> : <span className="featured-placeholder" />}
                <span>{recipe.title}</span>
                <span className="featured-check">{form.featured_recipe_ids.includes(recipe.id) ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="form-submit-bar">
          <span>{t('admin.settingsSub')}</span>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <InlineLoader /> : <><Save size={16} /> {t('admin.saveSettings')}</>}
          </button>
        </div>
      </form>

      <form className="panel broadcast-card" onSubmit={sendAnnouncement}>
        <div className="settings-card-head">
          <span className="settings-icon"><Megaphone size={19} /></span>
          <div><h2>{t('admin.broadcast')}</h2><p>{t('admin.broadcastSub')}</p></div>
        </div>
        <div className="form-row">
          <Field label={t('admin.announcementTitle')} htmlFor="announcement-title" required>
            <input id="announcement-title" type="text" value={announcement.title} onChange={(event) => setAnnouncement((c) => ({ ...c, title: event.target.value }))} />
          </Field>
          <Field label={t('common.link')} htmlFor="announcement-link">
            <input id="announcement-link" type="text" value={announcement.link} onChange={(event) => setAnnouncement((c) => ({ ...c, link: event.target.value }))} placeholder="/explore" />
          </Field>
        </div>
        <Field label={t('admin.announcementMessage')} htmlFor="announcement-message">
          <textarea id="announcement-message" rows={3} value={announcement.message} onChange={(event) => setAnnouncement((c) => ({ ...c, message: event.target.value }))} />
        </Field>
        <button type="submit" className="btn btn-gold" disabled={sending || !announcement.title.trim()}>
          {sending ? <InlineLoader /> : <><Send size={16} /> {t('admin.sendAnnouncement')}</>}
        </button>
      </form>
    </div>
  )
}
