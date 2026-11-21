import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { authService } from '../services/authService'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../utils/errors'
import { useDocumentTitle } from '../hooks/useUtils'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useDocumentTitle(t('auth.forgotTitle'))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email.trim()) {
      setError(t('validation.email'))
      return
    }
    setLoading(true)
    try {
      const data = await authService.forgotPassword({ email: email.trim() })
      setResult(data)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-heading">
        <span className="eyebrow"><KeyRound size={13} /> {t('auth.forgotTitle')}</span>
        <h1>{t('auth.forgotTitle')}</h1>
        <p>{t('auth.forgotSubtitle')}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result ? (
        <div className="stack-form">
          <div className="alert alert-success">{t('auth.resetSent')}</div>
          {result.reset_token && (
            <div className="dev-reset">
              <strong>{t('auth.devResetTitle')}</strong>
              <p>{t('auth.devResetText')}</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/reset-password?token=${encodeURIComponent(result.reset_token)}`)}
              >
                {t('auth.openReset')}
              </button>
            </div>
          )}
          <Link to="/login" className="btn btn-ghost btn-block">
            <ArrowLeft size={16} />{t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form className="stack-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">{t('auth.email')}</label>
            <div className="input-icon">
              <Mail size={17} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? t('auth.sending') : t('auth.sendReset')}
          </button>
          <Link to="/login" className="btn btn-ghost btn-block">
            <ArrowLeft size={16} />{t('auth.backToLogin')}
          </Link>
        </form>
      )}
    </div>
  )
}
