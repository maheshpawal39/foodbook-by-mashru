import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Globe2, KeyRound, Moon, ShieldCheck, Sun } from 'lucide-react'
import { authApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import Field from '../components/Field'
import { InlineLoader } from '../components/Loader'

export default function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  useDocumentTitle(t('settings.title'))

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme)
    toast.success(t('settings.themeSaved'))
  }

  const changeLanguage = (next) => {
    setLanguage(next)
    toast.success(t('settings.languageSaved'))
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.current_password) nextErrors.current_password = t('common.required')
    if (form.new_password.length < 8) nextErrors.new_password = t('auth.passwordHint')
    if (form.confirm !== form.new_password) nextErrors.confirm = t('settings.passwordMismatch')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    try {
      await authApi.changePassword({ current_password: form.current_password, new_password: form.new_password })
      setForm({ current_password: '', new_password: '', confirm: '' })
      toast.success(t('settings.passwordChanged'))
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      toast.error(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page settings-page">
      <PageHeader eyebrow={t('settings.subtitle')} title={t('settings.title')} />

      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">{theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}</span>
            <div><h2>{t('settings.appearance')}</h2><p>{t('settings.appearanceSub')}</p></div>
          </div>
          <div className="theme-options">
            <button type="button" className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => changeTheme('light')}>
              <span className="theme-preview light-preview" />
              <strong>{t('settings.light')}</strong>
              <small>{t('settings.lightDesc')}</small>
              {theme === 'light' ? <Check size={16} className="option-check" /> : null}
            </button>
            <button type="button" className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => changeTheme('dark')}>
              <span className="theme-preview dark-preview" />
              <strong>{t('settings.dark')}</strong>
              <small>{t('settings.darkDesc')}</small>
              {theme === 'dark' ? <Check size={16} className="option-check" /> : null}
            </button>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-head">
            <span className="settings-icon"><Globe2 size={19} /></span>
            <div><h2>{t('settings.language')}</h2><p>{t('settings.languageSub')}</p></div>
          </div>
          <div className="language-options">
            <button type="button" className={`language-option ${language === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>
              <span className="language-code">EN</span>
              <span><strong>{t('settings.english')}</strong><small>English</small></span>
              {language === 'en' ? <Check size={16} /> : null}
            </button>
            <button type="button" className={`language-option ${language === 'hi' ? 'active' : ''}`} onClick={() => changeLanguage('hi')}>
              <span className="language-code">हिं</span>
              <span><strong>{t('settings.hindi')}</strong><small>Hindi</small></span>
              {language === 'hi' ? <Check size={16} /> : null}
            </button>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-head">
            <span className="settings-icon"><KeyRound size={19} /></span>
            <div><h2>{t('settings.security')}</h2><p>{t('settings.securitySub')}</p></div>
          </div>
          <form onSubmit={submitPassword} className="password-form">
            <Field label={t('settings.currentPassword')} htmlFor="current_password" error={errors.current_password}>
              <input id="current_password" type="password" autoComplete="current-password" value={form.current_password} onChange={(event) => setForm((c) => ({ ...c, current_password: event.target.value }))} />
            </Field>
            <div className="form-row">
              <Field label={t('settings.newPassword')} htmlFor="new_password" error={errors.new_password} hint={t('auth.passwordHint')}>
                <input id="new_password" type="password" autoComplete="new-password" value={form.new_password} onChange={(event) => setForm((c) => ({ ...c, new_password: event.target.value }))} />
              </Field>
              <Field label={t('settings.confirmPassword')} htmlFor="confirm_password" error={errors.confirm}>
                <input id="confirm_password" type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm((c) => ({ ...c, confirm: event.target.value }))} />
              </Field>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <InlineLoader /> : <><ShieldCheck size={16} /> {t('settings.changePassword')}</>}
            </button>
          </form>
        </section>

        <section className="panel settings-card about-card">
          <div className="settings-card-head">
            <span className="settings-icon"><ShieldCheck size={19} /></span>
            <div><h2>{t('settings.about')}</h2><p>{t('settings.version', { version: '1.0.0' })}</p></div>
          </div>
          <p>{t('settings.aboutText')}</p>
          <div className="about-account">
            <span>{user?.name}</span>
            <span>{user?.email}</span>
            <Link to="/profile" className="text-link">{t('nav.profile')} →</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
