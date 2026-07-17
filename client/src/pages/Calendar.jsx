import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Card from '../components/Card'
import Button from '../components/Button'
import WeatherIcon from '../components/WeatherIcon'
import MonthCalendar from '../components/MonthCalendar'
import { useLocation } from '../contexts/LocationContext'
import { useStyle } from '../contexts/StyleContext'
import { useWeeklyForecast } from '../hooks/useWeeklyForecast'
import { recommendOutfit } from '../utils/recommendEngine'
import { pickWeeklyComment } from '../data/weeklyComments'
import { addDays, formatDateCompact, getWeekdayLabel, isToday } from '../utils/dateUtils'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './Calendar.module.css'

const DAYS_TO_SHOW = 7

function Calendar() {
  const { location } = useLocation()
  const { gender, preferredStyles } = useStyle()
  const { days, isLoading, error } = useWeeklyForecast(location)
  const [showFullView, setShowFullView] = useState(false)

  const forecastByDate = useMemo(() => {
    const map = new Map()
    days.forEach((day) => map.set(day.date, day))
    return map
  }, [days])

  const weekDates = useMemo(
    () => Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(new Date(), i)),
    []
  )

  const pageRef = useRef(null)
  const introRef = useRef(null)
  const gridRef = useRef(null)
  const fullViewRef = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      revealFrom(introRef.current.children, {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
      })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  // Day cards only render once a location is set, so this is keyed off that
  // (mirrors the preview-section pattern in Home.jsx).
  useEffect(() => {
    if (!location || !gridRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      const cards = gridRef.current.querySelectorAll(`.${styles.dayCard}`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.06,
        scrollTrigger: { trigger: gridRef.current, start: 'top 85%', once: true },
      })
    }, gridRef)
    return () => ctx.revert()
  }, [location])

  // Full-view section is toggled in/out of the DOM by the button just above
  // it, so each time it mounts it should re-reveal.
  useEffect(() => {
    if (!showFullView || !fullViewRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      revealFrom(fullViewRef.current.children, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: { trigger: fullViewRef.current, start: 'top 90%', once: true },
      })
    }, fullViewRef)
    return () => ctx.revert()
  }, [showFullView])

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.intro} ref={introRef}>
        <p className={styles.eyebrow}>Calendar</p>
        <h1 className={styles.title}>코디 캘린더</h1>
        <p className={styles.lede}>이번 주 날씨에 맞춰 요일별로 어떤 코디가 어울릴지 미리 살펴보세요.</p>
      </header>

      {!location && <p className={styles.hint}>먼저 홈이나 추천 페이지에서 위치를 설정해주세요.</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {isLoading && <p className={styles.status}>날씨를 불러오는 중...</p>}

      {location && (
        <div className={styles.grid} ref={gridRef}>
          {weekDates.map((date) => {
            const dateKey = formatDateCompact(date)
            const forecast = forecastByDate.get(dateKey)
            const today = isToday(date)

            return (
              <Card
                key={dateKey}
                accent={today ? 'pink' : 'sky'}
                className={`${styles.dayCard} ${!forecast ? styles.dayCardEmpty : ''}`}
              >
                <div className={styles.dayHead}>
                  <span className={styles.weekday}>{getWeekdayLabel(date)}</span>
                  <span className={styles.dateLabel}>
                    {date.getMonth() + 1}/{date.getDate()}
                  </span>
                  {today && <span className={styles.todayBadge}>오늘</span>}
                </div>

                {!forecast ? (
                  <p className={styles.pending}>예보 준비 중이에요</p>
                ) : (
                  <DayForecast
                    forecast={forecast}
                    gender={gender}
                    preferredStyles={preferredStyles}
                    dateSeed={dateKey}
                  />
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div className={styles.fullViewToggle}>
        <Button type="button" variant="secondary" onClick={() => setShowFullView((prev) => !prev)}>
          {showFullView ? '전체 보기 닫기' : '이번 달 전체 보기'}
        </Button>
      </div>

      {showFullView && (
        <section className={styles.fullViewSection} ref={fullViewRef}>
          <span className="washiDivider" aria-hidden="true" />
          <h2 className={styles.fullViewTitle}>월간 코디 메모</h2>
          <p className={styles.fullViewLede}>
            날씨 예보가 아직 없는 날짜도 눌러서 어떤 옷을 입을지 미리 메모해둘 수 있어요.
          </p>
          <MonthCalendar />
        </section>
      )}
    </div>
  )
}

function DayForecast({ forecast, gender, preferredStyles, dateSeed }) {
  // dateSeed (this day's own date) rotates which style/garment gets
  // recommended — without it, every day in the week with a similar
  // temperature recommended the exact same top, which reads oddly lined up
  // 7-across.
  const result = useMemo(
    () =>
      recommendOutfit({
        tmp: Math.round(((forecast.tmpMin ?? forecast.tmpMax) + forecast.tmpMax) / 2),
        reh: forecast.reh,
        pop: forecast.pop,
        weatherCode: forecast.weatherCode,
        styles: preferredStyles,
        gender: gender || 'all',
        dateSeed,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forecast.tmpMin, forecast.tmpMax, forecast.reh, forecast.pop, forecast.weatherCode, preferredStyles, gender, dateSeed]
  )

  const outerItem = result.items.outer[0]
  const topItem = result.items.top[0]
  const comment = pickWeeklyComment({
    tmp: forecast.tmpMax,
    pop: forecast.pop,
    weatherCode: forecast.weatherCode,
    reh: forecast.reh,
    dateSeed,
  })

  return (
    <>
      <div className={styles.weatherRow}>
        <WeatherIcon icon={forecast.icon} size={32} />
        <div className={styles.tempRange}>
          <span className={styles.tempMax}>{Math.round(forecast.tmpMax)}°</span>
          <span className={styles.tempMin}>{Math.round(forecast.tmpMin)}°</span>
        </div>
      </div>
      <p className={styles.skyLabel}>
        {forecast.label} · 강수 {forecast.pop}%
      </p>

      <div className={styles.outfitSummary}>
        {outerItem && (
          <div className={styles.outfitItem}>
            <p className={styles.outfitLine}>{outerItem.name}</p>
          </div>
        )}
        {topItem && (
          <div className={styles.outfitItem}>
            <p className={styles.outfitLine}>{topItem.name}</p>
          </div>
        )}
      </div>

      <p className={styles.comment}>{comment}</p>
    </>
  )
}

export default Calendar
