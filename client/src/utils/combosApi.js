import { apiRequest } from './apiClient'

export function saveOutfitCombo({ token, items, name }) {
  return apiRequest('/combos', { method: 'POST', token, body: { items, name } })
}

export async function fetchOutfitCombos({ token } = {}) {
  const data = await apiRequest('/combos', { token })
  return data.combos
}

export function renameOutfitCombo({ token, id, name }) {
  return apiRequest(`/combos/${id}`, { method: 'PATCH', token, body: { name } })
}

export function deleteOutfitCombo({ token, id }) {
  return apiRequest(`/combos/${id}`, { method: 'DELETE', token })
}
