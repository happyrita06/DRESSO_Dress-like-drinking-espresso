/**
 * Formats a Date (or date string/number) as 'YYYY-MM-DD'.
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns true if the given date (Date/string/number) falls on the same
 * calendar day as today.
 */
export function isToday(date) {
  const d = date instanceof Date ? date : new Date(date)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

/**
 * Returns a new Date offset by `amount` days (negative moves backward).
 */
export function addDays(date, amount) {
  const d = date instanceof Date ? new Date(date) : new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

/**
 * Formats a Date as 'YYYYMMDD' — the format KMA's forecast API uses for
 * fcstDate/base_date.
 */
export function formatDateCompact(date) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * Returns the Korean single-character weekday label ('일'..'토').
 */
export function getWeekdayLabel(date) {
  const d = date instanceof Date ? date : new Date(date)
  return WEEKDAY_LABELS[d.getDay()]
}
