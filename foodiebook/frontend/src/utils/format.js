import { API_ORIGIN } from '../services/api'

export const DEFAULT_RECIPE_IMAGE = '/uploads/defaults/recipe-default.jpg'
export const DEFAULT_AVATAR = '/uploads/defaults/avatar-default.jpg'

export function mediaUrl(path, fallback = DEFAULT_RECIPE_IMAGE) {
  const value = path || fallback
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
  return `${API_ORIGIN}${value}`
}

export function avatarUrl(path) {
  return mediaUrl(path, DEFAULT_AVATAR)
}

export function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FB'
  )
}

export function formatMinutes(mins, t) {
  const value = Number(mins) || 0
  if (value < 60) return `${value} ${t('common.minutes')}`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  const hourLabel = hours === 1 ? t('time.hour') : t('time.hours')
  return rest ? `${hours} ${hourLabel} ${rest} ${t('common.minutes')}` : `${hours} ${hourLabel}`
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (n) => String(n).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

export function formatDate(iso, language = 'en') {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch (e) {
    return ''
  }
}

export function formatNumber(value) {
  const number = Number(value) || 0
  return number.toLocaleString('en-IN')
}

export function localize(enValue, hiValue, language) {
  if (language === 'hi' && hiValue) return hiValue
  return enValue || hiValue || ''
}

export function clampPercentage(value) {
  return Math.max(0, Math.min(100, Number(value) || 0))
}

export function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function getGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('dashboard.greetingMorning')
  if (hour < 17) return t('dashboard.greetingAfternoon')
  return t('dashboard.greetingEvening')
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const CUISINES = [
  'Indian',
  'North Indian',
  'South Indian',
  'Punjabi',
  'Hyderabadi',
  'Maharashtrian',
  'Indo-Chinese',
  'Chinese',
  'Italian',
  'French',
  'Greek',
  'Mediterranean',
  'Middle Eastern',
  'Modern',
]

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
export const SORTS = ['newest', 'popular', 'rating', 'time_asc', 'time_desc', 'title']
