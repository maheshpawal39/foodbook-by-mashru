import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  Globe2,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { authService } from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useDocumentTitle, useLocalStorage } from '../hooks/useUtils'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useLocalStorage('fb-notification-prefs', {
    emailUpdates: true,
    cookingReminders: true,
    productUpdates: false,
  })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [saving, setSaving] = useState(false)
  useDocumentTitle(t('settings.title'))

  const togglePref = (key) => setPrefs({ ...prefs, [key]: !prefs[key] })

  const savePrefs = () => {
    toast.success(t('settings.preferencesSaved'))
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    if (passwordForm.new_password !== passwordForm.confirm) {
      setPasswordError(t('settings.passwordMismatch'))
      return
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError(t('validation.password'))
      return
    }
    setSaving(true)
    try {
      await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm: '' })
      toast.success(t('settings.passwordUpdated'))
    } catch (err) {
      setPasswordError(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast.success(t('auth.logoutSuccess'))
    navigate('/login')
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('nav.settings')} title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="settings-layout">
        <section className="panel settings-section">
          <div className="settings-head">
            <span className="section-icon"><Palette size={19} /></span>
            <div><h2>{t('settings.appearance')}</h2><p>{t('settings.theme')}</p></div>
          </div>
          <div className="theme-options">
            <button type="button" className={`theme-option light ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
              <span className="theme-preview"><Sun size={22} /></span>
              <span><strong>{t('settings.light')}</strong><small>{t('settings.lightHint')}</small></span>
              {theme === 'light' && <Check size={18} />}
            </button>
            <button type="button" className={`theme-option dark ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
              <span className="theme-preview"><Moon size={22} /></span>
              <span><strong>{t('settings.dark')}</strong><small>{t('settings.darkHint')}</small></span>
              {theme === 'dark' && <Check size={18} />}
            </button>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="settings-head">
            <span className="section-icon"><Languages size={19} /></span>
            <div><h2>{t('settings.language')}</h2><p>{t('settings.languageHint')}</p></div>
          </div>
          <div className="language-options">
            <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
              <Globe2 size={20} />
              <span><strong>English</strong><small>English</small></span>
              {language === 'en' && <Check size={17} />}
            </button>
            <button type="button" className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')}>
              <Languages size={20} />
              <span><strong>हिन्दी</strong><small>Hindi</small></span>
              {language === 'hi' && <Check size={17} />}
            </button>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="settings-head">
            <span className="section-icon"><Bell size={19} /></span>
            <div><h2>{t('settings.notifications')}</h2><p>{t('settings.cookingRemindersHint')}</p></div>
          </div>
          <div className="toggle-list">
            <label className="toggle-row">
              <span><Mail size={17} /><span><strong>{t('settings.emailNotifications')}</strong><small>{t('settings.emailNotificationsHint')}</small></span></span>
              <input type="checkbox" className="switch" checked={prefs.emailUpdates} onChange={() => togglePref('emailUpdates')} />
            </label>
            <label className="toggle-row">
              <span><Bell size={17} /><span><strong>{t('settings.cookingReminders')}</strong><small>{t('settings.cookingRemindersHint')}</small></span></span>
              <input type="checkbox" className="switch" checked={prefs.cookingReminders} onChange={() => togglePref('cookingReminders')} />
            </label>
            <label className="toggle-row">
              <span><ShieldCheck size={17} /><span><strong>{t('settings.productUpdates')}</strong><small>{t('settings.productUpdatesHint')}</small></span></span>
              <input type="checkbox" className="switch" checked={prefs.productUpdates} onChange={() => togglePref('productUpdates')} />
            </label>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={savePrefs}><Save size={15} /> {t('settings.savePreferences')}</button>
        </section>

        <section className="panel settings-section">
          <div className="settings-head">
            <span className="section-icon"><KeyRound size={19} /></span>
            <div><h2>{t('settings.security')}</h2><p>{t('auth.passwordHint')}</p></div>
          </div>
          {passwordError && <div className="alert alert-error">{passwordError}</div>}
          <form className="stack-form" onSubmit={changePassword}>
            <div className="field">
              <label>{t('settings.currentPassword')}</label>
              <input type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} required autoComplete="current-password" />
            </div>
            <div className="form-grid two">
              <div className="field">
                <label>{t('settings.newPassword')}</label>
                <input type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} required autoComplete="new-password" />
              </div>
              <div className="field">
                <label>{t('settings.confirmPassword')}</label>
                <input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} required autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" className="btn btn-outline" disabled={saving}>{saving ? t('common.saving') : t('settings.updatePassword')}</button>
          </form>
        </section>

        <section className="panel settings-section">
          <div className="settings-head">
            <span className="section-icon"><ShieldCheck size={19} /></span>
            <div><h2>{t('settings.account')}</h2><p>{t('settings.logoutHint')}</p></div>
          </div>
          <div className="account-list">
            <div><span>{t('settings.email')}</span><strong>{user?.email}</strong></div>
            <div><span>{t('settings.role')}</span><strong>{user?.role === 'admin' ? t('settings.admin') : t('settings.user')}</strong></div>
            <div><span>{t('settings.memberSince')}</span><strong>{formatDate(user?.created_at, language)}</strong></div>
          </div>
          <button type="button" className="btn btn-danger-soft" onClick={handleLogout}><LogOut size={16} /> {t('settings.logout')}</button>
        </section>
      </div>
    </div>
  )
}
