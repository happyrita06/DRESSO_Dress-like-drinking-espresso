import { apiRequest } from './apiClient'

export async function fetchCalendarNotes({ token, month }) {
  const data = await apiRequest(`/calendar-notes?month=${month}`, { token })
  return data.notes
}

export function saveCalendarNote({ token, date, note }) {
  return apiRequest(`/calendar-notes/${date}`, { method: 'PUT', token, body: { note } })
}

export function deleteCalendarNote({ token, date }) {
  return apiRequest(`/calendar-notes/${date}`, { method: 'DELETE', token })
}
