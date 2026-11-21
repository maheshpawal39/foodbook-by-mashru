import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '')
export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || API_URL.replace(/\/api$/, '')).replace(/\/$/, '')

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

let csrfToken = null
let csrfPromise = null

export async function ensureCsrf(force = false) {
  if (force) {
    csrfToken = null
    csrfPromise = null
  }
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = api
      .get('/auth/csrf')
      .then((res) => {
        csrfToken = res.data.csrf_token
        return csrfToken
      })
      .finally(() => {
        csrfPromise = null
      })
  }
  return csrfPromise
}

export function resetCsrf() {
  csrfToken = null
  csrfPromise = null
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await ensureCsrf()
    config.headers = config.headers || {}
    config.headers['X-CSRF-Token'] = token
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {}
    const status = error.response?.status
    if (status === 403 && error.response?.data?.code === 'csrf_failed' && !config.__csrfRetried) {
      config.__csrfRetried = true
      resetCsrf()
      try {
        const token = await ensureCsrf(true)
        config.headers = { ...(config.headers || {}), 'X-CSRF-Token': token }
        return api.request(config)
      } catch (retryError) {
        return Promise.reject(retryError)
      }
    }
    if (status === 401 && !String(config.url || '').includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('fb:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function apiErrorCode(error) {
  if (!error) return 'generic'
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return 'network'
  return error.response?.data?.code || 'generic'
}

export default api
