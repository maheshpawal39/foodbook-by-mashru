import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ChefHat, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import Field from '../components/Field'
import { InlineLoader } from '../components/Loader'

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />
  }

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const nextErrors = {}
    if (!form.email.trim()) nextErrors.email = t('common.required')
    if (!form.password) nextErrors.password = t('common.required')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      await login(form)
      toast.success(t('auth.welcome'))
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      setError(err.status === 401 ? t('errors.loginFailed') : getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  const useDemo = (email, password) => {
    setForm({ email, password, remember: true })
    setErrors({})
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow"><ChefHat size={14} /> FoodieBook</span>
        <h2>{t('auth.signInTitle')}</h2>
        <p>{t('auth.signInSubtitle')}</p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={submit} noValidate className="auth-form">
        <Field label={t('auth.email')} htmlFor="email" error={errors.email}>
          <div className="input-icon">
            <Mail size={17} />
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
          </div>
        </Field>
        <Field label={t('auth.password')} htmlFor="password" error={errors.password}>
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={update('password')}
              placeholder="••••••••"
            />
            <button type="button" className="input-action" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        <div className="form-between">
          <label className="check-inline">
            <input type="checkbox" checked={form.remember} onChange={(event) => setForm((current) => ({ ...current, remember: event.target.checked }))} />
            <span>{t('auth.remember')}</span>
          </label>
          <Link to="/forgot-password" className="text-link small">{t('auth.forgot')}</Link>
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <InlineLoader label={t('auth.signingIn')} /> : <>{t('auth.signIn')} <ArrowRight size={17} /></>}
        </button>
      </form>

      <div className="auth-divider"><span>{t('auth.demoTitle')}</span></div>
      <div className="demo-accounts">
        <button type="button" className="demo-account" onClick={() => useDemo('demo@foodiebook.com', 'Demo@123')}>
          <span className="demo-icon"><ChefHat size={17} /></span>
          <span>
            <strong>{t('auth.demoUser')}</strong>
            <small>demo@foodiebook.com</small>
          </span>
        </button>
        <button type="button" className="demo-account" onClick={() => useDemo('admin@foodiebook.com', 'Admin@123')}>
          <span className="demo-icon"><ShieldCheck size={17} /></span>
          <span>
            <strong>{t('auth.demoAdmin')}</strong>
            <small>admin@foodiebook.com</small>
          </span>
        </button>
      </div>

      <p className="auth-switch">
        {t('auth.noAccount')} <Link to="/register">{t('auth.createOne')}</Link>
      </p>
    </div>
  )
}
