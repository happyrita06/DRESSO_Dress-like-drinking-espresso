import { apiRequest } from './apiClient'

export function fetchUserProfile({ token, userId }) {
  return apiRequest(`/users/${userId}`, { token })
}

export function toggleFollow({ token, userId }) {
  return apiRequest(`/users/${userId}/follow`, { method: 'POST', token })
}

export function updateMyProfile({ token, ...updates }) {
  return apiRequest('/users/me', { method: 'PATCH', body: updates, token })
}
