import axios from 'axios'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export const UPLOAD_BASE = API_BASE.replace(/\/api$/, '')

const CSRF_COOKIE = 'foodiebook_csrf'
let csrfToken = null
let csrfRequest = null

function readCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

export async function ensureCsrf(force = false) {
  if (!force && csrfToken) return csrfToken
  if (csrfRequest) return csrfRequest
  csrfRequest = axios
    .get(`${API_BASE}/auth/csrf`, { withCredentials: true })
    .then((response) => {
      csrfToken = response.data?.data?.csrf_token || readCookie(CSRF_COOKIE) || ''
      return csrfToken
    })
    .finally(() => {
      csrfRequest = null
    })
  return csrfRequest
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase()
  if (!['get', 'head', 'options'].includes(method)) {
    const token = await ensureCsrf()
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const message = error.response?.data?.message || ''
    if (status === 403 && !original?._csrfRetry && /security token/i.test(message)) {
      original._csrfRetry = true
      await ensureCsrf(true)
      return api(original)
    }
    const normalized = new Error(message || 'Request failed')
    normalized.status = status
    normalized.errors = error.response?.data?.errors || null
    normalized.code = error.code
    normalized.response = error.response
    throw normalized
  }
)

export function absoluteUrl(path) {
  if (!path) return '/default-recipe.svg'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/uploads/')) return `${UPLOAD_BASE}${path}`
  return path
}

export default api
