import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage, getFieldErrors } from '../utils/errors'
import { useDocumentTitle } from '../hooks/useUtils'

export default function Login() {
  const { t } = useLanguage()
  const { login, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  useDocumentTitle(t('auth.loginTitle'))

  const from = location.state?.from || '/dashboard'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    const errors = {}
    if (!form.email.trim()) errors.email = t('validation.email')
    if (!form.password) errors.password = t('validation.required')
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      await login({ email: form.email.trim(), password: form.password, remember: form.remember })
      toast.success(t('auth.loginSuccess'))
      navigate(from, { replace: true })
    } catch (err) {
      const apiFields = getFieldErrors(err)
      if (Object.keys(apiFields).length) setFieldErrors(apiFields)
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setForm({ email: 'demo@foodiebook.com', password: 'Demo@12345', remember: true })
    setError('')
  }

  return (
    <div className="auth-page">
      <div className="auth-heading">
        <span className="eyebrow"><Sparkles size={13} /> {t('auth.welcomeBack')}</span>
        <h1>{t('auth.loginTitle')}</h1>
        <p>{t('auth.loginSubtitle')}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="stack-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <div className={`input-icon ${fieldErrors.email ? 'invalid' : ''}`}>
            <Mail size={17} />
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="password">{t('auth.password')}</label>
            <Link to="/forgot-password" className="link-sm">{t('auth.forgot')}</Link>
          </div>
          <div className={`input-icon ${fieldErrors.password ? 'invalid' : ''}`}>
            <Lock size={17} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={t('auth.passwordPlaceholder')}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(event) => setForm({ ...form, remember: event.target.checked })}
          />
          <span>{t('auth.remember')}</span>
        </label>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <div className="demo-box">
        <div>
          <strong>{t('auth.demoTitle')}</strong>
          <p>{t('auth.demoText')}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={fillDemo}>
          {t('auth.demoFill')}
        </button>
      </div>

      <p className="auth-switch">
        {t('auth.noAccount')} <Link to="/register">{t('auth.createAccount')}</Link>
      </p>
    </div>
  )
}
