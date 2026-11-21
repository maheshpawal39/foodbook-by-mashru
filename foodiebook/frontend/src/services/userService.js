import api from './api'

export const favoriteService = {
  list: (params) => api.get('/favorites', { params }).then((r) => r.data),
  remove: (recipeId) => api.delete(`/favorites/${recipeId}`).then((r) => r.data),
}

export const userService = {
  chef: (id) => api.get(`/users/${id}`).then((r) => r.data),
  myReviews: () => api.get('/my-reviews').then((r) => r.data),
}

export const shoppingService = {
  get: () => api.get('/shopping-list').then((r) => r.data),
  addItem: (payload) => api.post('/shopping-list/items', payload).then((r) => r.data),
  updateItem: (id, payload) => api.patch(`/shopping-list/items/${id}`, payload).then((r) => r.data),
  deleteItem: (id) => api.delete(`/shopping-list/items/${id}`).then((r) => r.data),
  fromRecipe: (recipeId) => api.post(`/shopping-list/from-recipe/${recipeId}`).then((r) => r.data),
  clearPurchased: () => api.post('/shopping-list/clear-purchased').then((r) => r.data),
  clearAll: () => api.delete('/shopping-list/clear').then((r) => r.data),
  rename: (name) => api.patch('/shopping-list', { name }).then((r) => r.data),
}

export const notificationService = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
  remove: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
}

export const uploadService = {
  image: (file, kind = 'recipe') => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return api.post('/uploads', form).then((r) => r.data)
  },
}
