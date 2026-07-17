import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { useAuth } from '../hooks/useAuth'
import { fetchCalendarNotes, saveCalendarNote, deleteCalendarNote } from '../utils/calendarNotesApi'
import { isToday } from '../utils/dateUtils'
import styles from './MonthCalendar.module.css'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function toMonthKey(year, month) {
  return `${year}-${pad(month + 1)}`
}

/**
 * A full month grid where a logged-in user can leave a free-text memo on
 * any date (past, present, or far future beyond what KMA's ~3-day forecast
 * can cover) about what they plan to wear.
 */
function MonthCalendar() {
  const { token, isAuthenticated } = useAuth()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [notes, setNotes] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeDateKey, setActiveDateKey] = useState(null)
  const [draftNote, setDraftNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const monthKey = toMonthKey(viewYear, viewMonth)

  const loadNotes = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchCalendarNotes({ token, month: monthKey })
      const map = {}
      data.forEach((entry) => {
        map[entry.date] = entry.note
      })
      setNotes(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token, monthKey])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const list = []
    for (let i = 0; i < startOffset; i += 1) list.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) list.push(day)
    return list
  }, [viewYear, viewMonth])

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((year) => year - 1)
      setViewMonth(11)
    } else {
      setViewMonth((month) => month - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((year) => year + 1)
      setViewMonth(0)
    } else {
      setViewMonth((month) => month + 1)
    }
  }

  const openEditor = (day) => {
    if (!isAuthenticated) return
    const dateKey = toDateKey(viewYear, viewMonth, day)
    setActiveDateKey(dateKey)
    setDraftNote(notes[dateKey] || '')
  }

  const closeEditor = () => {
    setActiveDateKey(null)
    setDraftNote('')
  }

  const handleSaveNote = async () => {
    if (!activeDateKey || !draftNote.trim()) return
    setIsSaving(true)
    setError('')
    try {
      await saveCalendarNote({ token, date: activeDateKey, note: draftNote.trim() })
      setNotes((prev) => ({ ...prev, [activeDateKey]: draftNote.trim() }))
      closeEditor()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!activeDateKey) return
    setIsSaving(true)
    setError('')
    try {
      await deleteCalendarNote({ token, date: activeDateKey })
      setNotes((prev) => {
        const next = { ...prev }
        delete next[activeDateKey]
        return next
      })
      closeEditor()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.monthHeader}>
        <button type="button" className={styles.navButton} onClick={goToPrevMonth} aria-label="이전 달">
          ‹
        </button>
        <p className={styles.monthLabel}>
          {viewYear}년 {viewMonth + 1}월
        </p>
        <button type="button" className={styles.navButton} onClick={goToNextMonth} aria-label="다음 달">
          ›
        </button>
      </div>

      {!isAuthenticated && <p className={styles.hint}>로그인하면 날짜별로 코디 메모를 남길 수 있어요.</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {isLoading && <p className={styles.hint}>메모를 불러오는 중...</p>}

      <div className={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.weekdayLabel}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} className={styles.emptyCell} />

          const dateKey = toDateKey(viewYear, viewMonth, day)
          const hasNote = Boolean(notes[dateKey])
          const todayFlag = isToday(new Date(viewYear, viewMonth, day))

          return (
            <button
              key={dateKey}
              type="button"
              className={`${styles.dayCell} ${todayFlag ? styles.todayCell : ''} ${hasNote ? styles.hasNote : ''}`}
              onClick={() => openEditor(day)}
              disabled={!isAuthenticated}
            >
              <span className={styles.dayNumber}>{day}</span>
              {hasNote && <span className={styles.noteDot} aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <Modal isOpen={Boolean(activeDateKey)} onClose={closeEditor} contentClassName={styles.modalContent}>
        <div className={styles.editor}>
          <h3 className={styles.editorTitle}>{activeDateKey} 코디 메모</h3>
          <textarea
            className={styles.editorTextarea}
            rows={5}
            placeholder="이날 뭘 입을지 메모해보세요."
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
          />
          <div className={styles.editorActions}>
            {notes[activeDateKey] && (
              <Button type="button" variant="ghost" onClick={handleDeleteNote} disabled={isSaving}>
                삭제
              </Button>
            )}
            <Button type="button" onClick={handleSaveNote} isLoading={isSaving} disabled={!draftNote.trim()}>
              저장
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default MonthCalendar
