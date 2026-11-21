import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react'
import { authApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import Field from '../components/Field'
import { InlineLoader } from '../components/Loader'

export default function ResetPassword() {
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const nextErrors = {}
    if (form.password.length < 8) nextErrors.password = t('auth.passwordHint')
    if (form.confirm !== form.password) nextErrors.confirm = t('settings.passwordMismatch')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      await authApi.resetPassword({ token, password: form.password })
      toast.success(t('auth.resetSuccess'))
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-card">
        <div className="alert alert-error">{t('auth.invalidReset')}</div>
        <Link to="/forgot-password" className="btn btn-primary btn-block">{t('auth.forgotTitle')}</Link>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow"><KeyRound size={14} /> {t('auth.resetTitle')}</span>
        <h2>{t('auth.resetTitle')}</h2>
        <p>{t('auth.resetSubtitle')}</p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={submit} noValidate className="auth-form">
        <Field label={t('auth.newPassword')} htmlFor="password" error={errors.password} hint={t('auth.passwordHint')}>
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))} placeholder="••••••••" />
          </div>
        </Field>
        <Field label={t('auth.confirmPassword')} htmlFor="confirm" error={errors.confirm}>
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm((c) => ({ ...c, confirm: event.target.value }))} placeholder="••••••••" />
          </div>
        </Field>
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <InlineLoader label={t('common.saving')} /> : t('auth.resetPassword')}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login"><ArrowLeft size={14} /> {t('auth.backToLogin')}</Link>
      </p>
    </div>
  )
}
