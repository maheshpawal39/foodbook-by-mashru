import api, { API_BASE, ensureCsrf } from './api'

export const authApi = {
  me: () => api.get('/auth/me'),
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  logout: () => api.post('/auth/logout'),
  updateProfile: (payload) => api.put('/auth/profile', payload),
  uploadAvatar: (file) => {
    const data = new FormData()
    data.append('avatar', file)
    return api.post('/auth/profile/avatar', data)
  },
  changePassword: (payload) => api.post('/auth/change-password', payload),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
}

export const recipesApi = {
  list: (params) => api.get('/recipes', { params }),
  mine: (params) => api.get('/recipes/mine', { params }),
  get: (id) => api.get(`/recipes/${id}`),
  create: (formData) => api.post('/recipes', formData),
  update: (id, formData) => api.put(`/recipes/${id}`, formData),
  setStatus: (id, status) => api.patch(`/recipes/${id}/status`, { status }),
  remove: (id) => api.delete(`/recipes/${id}`),
  filters: () => api.get('/recipes/filters'),
  kitchen: (ingredients) => api.get('/recipes/kitchen', { params: { ingredients } }),
  similar: (id) => api.get(`/recipes/${id}/similar`),
  pdfUrl: (id) => `${API_BASE}/recipes/${id}/pdf`,
}

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (payload) => api.post('/categories', payload),
  update: (id, payload) => api.put(`/categories/${id}`, payload),
  remove: (id) => api.delete(`/categories/${id}`),
}

export const favoritesApi = {
  list: (params) => api.get('/favorites', { params }),
  add: (recipeId) => api.post(`/recipes/${recipeId}/favorite`),
  remove: (recipeId) => api.delete(`/recipes/${recipeId}/favorite`),
}

export const reviewsApi = {
  list: (recipeId) => api.get(`/recipes/${recipeId}/reviews`),
  create: (recipeId, payload) => api.post(`/recipes/${recipeId}/reviews`, payload),
  update: (reviewId, payload) => api.put(`/reviews/${reviewId}`, payload),
  remove: (reviewId) => api.delete(`/reviews/${reviewId}`),
  mine: () => api.get('/reviews/mine'),
  report: (payload) => api.post('/reports', payload),
}

export const shoppingApi = {
  get: () => api.get('/shopping-list'),
  add: (payload) => api.post('/shopping-list/items', payload),
  update: (id, payload) => api.put(`/shopping-list/items/${id}`, payload),
  remove: (id) => api.delete(`/shopping-list/items/${id}`),
  clearPurchased: () => api.delete('/shopping-list/purchased'),
  fromRecipe: (recipeId) => api.post(`/shopping-list/from-recipe/${recipeId}`),
}

export const dashboardApi = {
  get: () => api.get('/dashboard'),
}

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAll: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
  broadcast: (payload) => api.post('/notifications/broadcast', payload),
}

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  recipes: (params) => api.get('/admin/recipes', { params }),
  toggleFeatured: (id, isFeatured) => api.patch(`/admin/recipes/${id}/feature`, { is_featured: isFeatured }),
  reviews: (params) => api.get('/admin/reviews', { params }),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
  reports: (params) => api.get('/admin/reports', { params }),
  updateReport: (id, status) => api.patch(`/admin/reports/${id}`, { status }),
  categories: () => api.get('/admin/categories'),
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (payload) => api.put('/settings', payload),
}

export { ensureCsrf }
