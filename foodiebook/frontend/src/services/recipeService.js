import api from './api'

export const recipeService = {
  list: (params) => api.get('/recipes', { params }).then((r) => r.data),
  mine: (params) => api.get('/recipes/mine', { params }).then((r) => r.data),
  get: (id) => api.get(`/recipes/${id}`).then((r) => r.data),
  create: (payload) => api.post('/recipes', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/recipes/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/recipes/${id}`).then((r) => r.data),
  setStatus: (id, status) => api.patch(`/recipes/${id}/publish`, { status }).then((r) => r.data),
  toggleFavorite: (id) => api.post(`/recipes/${id}/favorite`).then((r) => r.data),
  reviews: (id, params) => api.get(`/recipes/${id}/reviews`, { params }).then((r) => r.data),
  createReview: (id, payload) => api.post(`/recipes/${id}/reviews`, payload).then((r) => r.data),
  updateReview: (reviewId, payload) => api.put(`/recipes/reviews/${reviewId}`, payload).then((r) => r.data),
  deleteReview: (reviewId) => api.delete(`/recipes/reviews/${reviewId}`).then((r) => r.data),
  match: (ingredients) => api.post('/recipes/match', { ingredients }).then((r) => r.data),
  downloadPdf: (id) => api.get(`/recipes/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
  report: (payload) => api.post('/reports', payload).then((r) => r.data),
}
