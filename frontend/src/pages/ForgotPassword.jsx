import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { authApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../utils/format'
import Field from '../components/Field'
import { InlineLoader } from '../components/Loader'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [devLink, setDevLink] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t('errors.validation'))
      return
    }
    setBusy(true)
    try {
      const response = await authApi.forgotPassword(email)
      setMessage(t('auth.resetSent'))
      setDevLink(response.data?.data?.dev_reset_url || '')
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow"><Mail size={14} /> {t('auth.forgotTitle')}</span>
        <h2>{t('auth.forgotTitle')}</h2>
        <p>{t('auth.forgotSubtitle')}</p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? (
        <div className="alert alert-success">
          {message}
          {devLink ? (
            <a href={devLink} className="dev-link">{t('auth.devReset')} →</a>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="auth-form">
        <Field label={t('auth.email')} htmlFor="email" error={error}>
          <div className="input-icon">
            <Mail size={17} />
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </div>
        </Field>
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <InlineLoader label={t('common.sending')} /> : <>{t('auth.sendReset')} <Send size={16} /></>}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login"><ArrowLeft size={14} /> {t('auth.backToLogin')}</Link>
      </p>
    </div>
  )
}
