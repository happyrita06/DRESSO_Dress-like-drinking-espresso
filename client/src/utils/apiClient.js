const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Shared fetch helper for the authenticated JSON endpoints (wardrobe,
 * outfit combos, link preview). Attaches the bearer token when given and
 * normalizes error handling the same way authApi.js does.
 */
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.')
  }

  return data
}
