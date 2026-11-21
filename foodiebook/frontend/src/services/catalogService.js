import api from './api'

export const categoryService = {
  list: () => api.get('/categories').then((r) => r.data),
}

export const dashboardService = {
  get: () => api.get('/dashboard').then((r) => r.data),
}

export const ingredientService = {
  search: (q, limit = 20) => api.get('/ingredients', { params: { q, limit } }).then((r) => r.data),
}

export const settingsService = {
  public: () => api.get('/settings').then((r) => r.data),
}
