import { apiErrorCode } from '../services/api'

export function getErrorMessage(error, t) {
  const code = apiErrorCode(error)
  const key = `errors.${code}`
  const translated = t(key)
  if (translated && translated !== key) return translated
  const serverMessage = error?.response?.data?.message
  return serverMessage || t('errors.generic')
}

export function getFieldErrors(error) {
  return error?.response?.data?.errors || {}
}
