import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage, getFieldErrors } from '../utils/errors'
import { useDocumentTitle } from '../hooks/useUtils'

export default function Register() {
  const { t } = useLanguage()
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  useDocumentTitle(t('auth.registerTitle'))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    const errors = {}
    if (form.name.trim().length < 2) errors.name = t('validation.required')
    if (!form.email.trim()) errors.email = t('validation.email')
    if (form.password.length < 8) errors.password = t('validation.password')
    if (form.password !== form.confirmPassword) errors.confirmPassword = t('validation.passwordMatch')
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      toast.success(t('auth.registerSuccess'))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const apiFields = getFieldErrors(err)
      if (Object.keys(apiFields).length) setFieldErrors(apiFields)
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-heading">
        <span className="eyebrow">FoodieBook</span>
        <h1>{t('auth.registerTitle')}</h1>
        <p>{t('auth.registerSubtitle')}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="stack-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="name">{t('auth.name')}</label>
          <div className={`input-icon ${fieldErrors.name ? 'invalid' : ''}`}>
            <UserRound size={17} />
            <input
              id="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={t('auth.namePlaceholder')}
              autoComplete="name"
            />
          </div>
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <div className={`input-icon ${fieldErrors.email ? 'invalid' : ''}`}>
            <Mail size={17} />
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <div className={`input-icon ${fieldErrors.password ? 'invalid' : ''}`}>
            <Lock size={17} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
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
          {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : <span className="field-hint">{t('auth.passwordHint')}</span>}
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
          <div className={`input-icon ${fieldErrors.confirmPassword ? 'invalid' : ''}`}>
            <Lock size={17} />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
            />
          </div>
          {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? t('auth.registering') : t('auth.createAccount')}
        </button>
      </form>

      <p className="auth-switch">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
      </p>
    </div>
  )
}
