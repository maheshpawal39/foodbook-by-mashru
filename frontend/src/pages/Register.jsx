import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import Field from '../components/Field'
import { InlineLoader } from '../components/Loader'

export default function Register() {
  const { register, isAuthenticated, loading } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const nextErrors = {}
    if (form.name.trim().length < 2) nextErrors.name = t('common.required')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = t('errors.validation')
    if (form.password.length < 8) nextErrors.password = t('auth.passwordHint')
    if (form.confirm !== form.password) nextErrors.confirm = t('settings.passwordMismatch')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      toast.success(t('auth.registered'))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      setError(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow">FoodieBook</span>
        <h2>{t('auth.registerTitle')}</h2>
        <p>{t('auth.registerSubtitle')}</p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={submit} noValidate className="auth-form">
        <Field label={t('auth.name')} htmlFor="name" error={errors.name}>
          <div className="input-icon">
            <User size={17} />
            <input id="name" type="text" autoComplete="name" value={form.name} onChange={update('name')} placeholder="Priya Sharma" />
          </div>
        </Field>
        <Field label={t('auth.email')} htmlFor="email" error={errors.email}>
          <div className="input-icon">
            <Mail size={17} />
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
          </div>
        </Field>
        <div className="form-row">
          <Field label={t('auth.password')} htmlFor="password" error={errors.password} hint={t('auth.passwordHint')}>
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                placeholder="••••••••"
              />
              <button type="button" className="input-action" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          <Field label={t('auth.confirmPassword')} htmlFor="confirm" error={errors.confirm}>
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={update('confirm')} placeholder="••••••••" />
            </div>
          </Field>
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <InlineLoader label={t('auth.registering')} /> : <>{t('auth.register')} <ArrowRight size={17} /></>}
        </button>
      </form>

      <p className="auth-switch">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.signInInstead')}</Link>
      </p>
    </div>
  )
}
