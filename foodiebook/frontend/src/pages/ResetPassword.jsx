import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock } from 'lucide-react'
import { authService } from '../services/authService'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/errors'
import { useDocumentTitle } from '../hooks/useUtils'

export default function ResetPassword() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)
  useDocumentTitle(t('auth.resetTitle'))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldError('')
    if (password.length < 8) {
      setFieldError(t('validation.password'))
      return
    }
    if (password !== confirmPassword) {
      setFieldError(t('validation.passwordMatch'))
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword({ token, password })
      toast.success(t('auth.resetSuccess'))
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-heading">
        <span className="eyebrow"><KeyRound size={13} /> {t('auth.resetTitle')}</span>
        <h1>{t('auth.resetTitle')}</h1>
        <p>{t('auth.resetSubtitle')}</p>
      </div>

      {!token && <div className="alert alert-error">{t('auth.invalidReset')}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form className="stack-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="password">{t('auth.newPassword')}</label>
          <div className={`input-icon ${fieldError ? 'invalid' : ''}`}>
            <Lock size={17} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          {fieldError ? <span className="field-error">{fieldError}</span> : <span className="field-hint">{t('auth.passwordHint')}</span>}
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
          <div className="input-icon">
            <Lock size={17} />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || !token}>
          {loading ? t('auth.resetting') : t('auth.resetPassword')}
        </button>
        <Link to="/login" className="btn btn-ghost btn-block">
          <ArrowLeft size={16} />{t('auth.backToLogin')}
        </Link>
      </form>
    </div>
  )
}
