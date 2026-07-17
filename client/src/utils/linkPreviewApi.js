import { apiRequest } from './apiClient'

export function fetchLinkPreview({ token, url }) {
  return apiRequest('/link-preview', { method: 'POST', token, body: { url } })
}
