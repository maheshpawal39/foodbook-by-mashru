import api from './api'

export const adminService = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload).then((r) => r.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  recipes: (params) => api.get('/admin/recipes', { params }).then((r) => r.data),
  updateRecipe: (id, payload) => api.patch(`/admin/recipes/${id}`, payload).then((r) => r.data),
  deleteRecipe: (id) => api.delete(`/admin/recipes/${id}`).then((r) => r.data),
  categories: () => api.get('/admin/categories').then((r) => r.data),
  createCategory: (payload) => api.post('/admin/categories', payload).then((r) => r.data),
  updateCategory: (id, payload) => api.patch(`/admin/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`).then((r) => r.data),
  reviews: (params) => api.get('/admin/reviews', { params }).then((r) => r.data),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`).then((r) => r.data),
  reports: (params) => api.get('/admin/reports', { params }).then((r) => r.data),
  updateReport: (id, payload) => api.patch(`/admin/reports/${id}`, payload).then((r) => r.data),
  settings: () => api.get('/admin/settings').then((r) => r.data),
  updateSettings: (settings) => api.put('/admin/settings', { settings }).then((r) => r.data),
}
