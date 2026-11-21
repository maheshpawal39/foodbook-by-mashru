export function formatDate(value, language = 'en', options = {}) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatRelative(value, language = 'en') {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(language === 'hi' ? 'hi' : 'en', { numeric: 'auto' })
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, factor] of units) {
    if (Math.abs(seconds) >= factor) return formatter.format(Math.round(seconds / factor), unit)
  }
  return formatter.format(seconds, 'second')
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  return `${minutes}`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function getErrorMessage(error, t) {
  if (!error) return t('errors.generic')
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return t('errors.network')
  if (error.status === 401) return t('errors.unauthorized')
  if (error.status === 403) return t('errors.forbidden')
  if (error.status === 404) return t('errors.notFound')
  if (error.status === 409) return /email/i.test(error.message || '') ? t('errors.emailTaken') : t('errors.conflict')
  if (error.status === 422) return t('errors.validation')
  if (error.status >= 500) return t('errors.generic')
  return error.message || t('errors.generic')
}

export function truncate(text = '', length = 120) {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text
}

export function stripTags(value = '') {
  return value.replace(/<[^>]*>/g, '')
}
