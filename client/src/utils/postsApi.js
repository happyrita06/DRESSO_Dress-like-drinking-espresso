import { apiRequest } from './apiClient'

export async function fetchPosts({ token, sort = 'latest', limit, author, following } = {}) {
  const params = new URLSearchParams()
  if (sort) params.set('sort', sort)
  if (limit) params.set('limit', String(limit))
  if (author) params.set('author', author)
  if (following) params.set('following', 'true')
  const query = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest(`/posts${query}`, { token })
  return data.posts
}

export function createPost({ token, ...body }) {
  return apiRequest('/posts', { method: 'POST', token, body })
}

export function updatePost({ token, id, ...body }) {
  return apiRequest(`/posts/${id}`, { method: 'PATCH', token, body })
}

export function deletePost({ token, id }) {
  return apiRequest(`/posts/${id}`, { method: 'DELETE', token })
}

export function toggleLike({ token, postId }) {
  return apiRequest(`/posts/${postId}/like`, { method: 'POST', token })
}

export async function fetchComments({ token, postId }) {
  const data = await apiRequest(`/posts/${postId}/comments`, { token })
  return data.comments
}

export function addComment({ token, postId, text }) {
  return apiRequest(`/posts/${postId}/comments`, { method: 'POST', token, body: { text } })
}

export function deleteComment({ token, commentId }) {
  return apiRequest(`/posts/comments/${commentId}`, { method: 'DELETE', token })
}
