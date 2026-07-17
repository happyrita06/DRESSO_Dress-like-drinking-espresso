import { apiRequest } from './apiClient'

export async function fetchWardrobeItems({ token, category } = {}) {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  const data = await apiRequest(`/wardrobe${query}`, { token })
  return data.items
}

export function createWardrobeItem({ token, category, name, imageUrl, sourceUrl }) {
  return apiRequest('/wardrobe', {
    method: 'POST',
    token,
    body: { category, name, imageUrl, sourceUrl },
  })
}

export function deleteWardrobeItem({ token, id }) {
  return apiRequest(`/wardrobe/${id}`, { method: 'DELETE', token })
}
