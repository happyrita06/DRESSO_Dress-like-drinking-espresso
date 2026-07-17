const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.')
  }

  return data
}

export function registerUser({ email, password, nickname }) {
  return postJson('/auth/register', { email, password, nickname })
}

export function loginUser({ email, password }) {
  return postJson('/auth/login', { email, password })
}

/** GET /auth/me — resolves the full user profile for a bearer token, used
 * to restore UserContext's `user` on page load (only the token itself
 * survives a refresh, in localStorage). */
export async function fetchCurrentUser({ token }) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || '세션을 확인하지 못했어요.')
  }

  return data
}
