import { useEffect, useState } from 'react'
import { Save, Settings, ShieldCheck } from 'lucide-react'
import ImageUpload from '../../components/ImageUpload'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { getErrorMessage } from '../../utils/errors'

const DEFAULTS = {
  site_name: 'FoodieBook',
  tagline: 'Recipes, memories & the joy of cooking',
  contact_email: 'hello@foodiebook.com',
  banner_title: 'Cook something unforgettable today',
  banner_subtitle: 'A curated collection of soulful recipes.',
  banner_image: '',
  about_text: '',
  maintenance_mode: 'false',
}

export default function AdminSettings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [form, setForm] = useState(DEFAULTS)
  const [extra, setExtra] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminService.settings()
      .then((data) => {
        const map = {}
        data.items.forEach((item) => { map[item.key] = item.value || '' })
        const known = { ...DEFAULTS }
        const unknown = {}
        Object.entries(map).forEach(([key, value]) => {
          if (key in DEFAULTS) known[key] = value
          else unknown[key] = value
        })
        setForm(known)
        setExtra(unknown)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await adminService.updateSettings({ ...extra, ...form })
      toast.success(t('admin.settingsSaved'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PanelSkeleton rows={8} />
  if (error) return <div className="alert alert-error">{getErrorMessage(error, t)}</div>

  return (
    <div className="admin-section">
      <div className="panel">
        <div className="panel-heading">
          <div><h2>{t('admin.siteSettings')}</h2><p>{t('admin.subtitle')}</p></div>
          <span className="admin-count"><ShieldCheck size={15} /> {t('common.admin')}</span>
        </div>

        <div className="form-grid two">
          <div className="field">
            <label>{t('admin.siteName')}</label>
            <input value={form.site_name} onChange={(event) => setForm({ ...form, site_name: event.target.value })} />
          </div>
          <div className="field">
            <label>{t('admin.tagline')}</label>
            <input value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
          </div>
        </div>

        <div className="field">
          <label>{t('admin.contactEmail')}</label>
          <input type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} />
        </div>

        <div className="form-grid two">
          <div className="field">
            <label>{t('admin.bannerTitle')}</label>
            <input value={form.banner_title} onChange={(event) => setForm({ ...form, banner_title: event.target.value })} />
          </div>
          <div className="field">
            <label>{t('admin.bannerSubtitle')}</label>
            <input value={form.banner_subtitle} onChange={(event) => setForm({ ...form, banner_subtitle: event.target.value })} />
          </div>
        </div>

        <div className="field">
          <label>{t('admin.bannerImage')}</label>
          <ImageUpload value={form.banner_image} onChange={(value) => setForm({ ...form, banner_image: value })} />
        </div>

        <div className="field">
          <label>{t('admin.aboutText')}</label>
          <textarea rows={4} value={form.about_text} onChange={(event) => setForm({ ...form, about_text: event.target.value })} />
        </div>

        <label className="toggle-row maintenance-row">
          <span><Settings size={17} /><span><strong>{t('admin.maintenance')}</strong><small>{t('admin.siteSettings')}</small></span></span>
          <input
            type="checkbox"
            className="switch"
            checked={form.maintenance_mode === 'true'}
            onChange={(event) => setForm({ ...form, maintenance_mode: event.target.checked ? 'true' : 'false' })}
          />
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={16} /> {saving ? t('common.saving') : t('admin.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  )
}
