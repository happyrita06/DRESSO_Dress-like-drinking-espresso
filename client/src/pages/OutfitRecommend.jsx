import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Card from '../components/Card'
import Button from '../components/Button'
import LocationSelector from '../components/LocationSelector'
import GenderSelector from '../components/GenderSelector'
import StyleSelector from '../components/StyleSelector'
import WeatherCard from '../components/WeatherCard'
import { useLocation } from '../contexts/LocationContext'
import { useStyle } from '../contexts/StyleContext'
import { useWeather } from '../hooks/useWeather'
import { recommendOutfit } from '../utils/recommendEngine'
import { formatDate } from '../utils/dateUtils'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './OutfitRecommend.module.css'

const CATEGORY_META = [
  { key: 'outer', label: '아우터', accent: 'pink' },
  { key: 'top', label: '상의', accent: 'mint' },
  { key: 'bottom', label: '하의', accent: 'sky' },
  { key: 'shoes', label: '신발', accent: 'yellow' },
  { key: 'accessories', label: '액세서리', accent: 'lavender' },
]

function OutfitRecommend() {
  const { location } = useLocation()
  const { gender, preferredStyles } = useStyle()
  const { weather, isLoading, error } = useWeather(location)

  // Rotates today's outfit picks day-to-day (see recommendOutfit's dateSeed)
  // — same value all day (stable within a visit/session), changes tomorrow.
  const todaySeed = formatDate(new Date())

  // recommendOutfit() is deterministic for the same inputs, but returns a
  // brand-new object/array tree every call — memoizing on the actual
  // primitive inputs avoids recomputing/re-rendering downstream on every
  // render for no reason.
  const result = useMemo(
    () =>
      weather
        ? recommendOutfit({
            tmp: weather.tmp,
            reh: weather.reh,
            pop: weather.pop,
            weatherCode: weather.weatherCode,
            styles: preferredStyles,
            gender: gender || 'all',
            dateSeed: todaySeed,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weather?.tmp, weather?.reh, weather?.pop, weather?.weatherCode, preferredStyles, gender, todaySeed]
  )

  const pageRef = useRef(null)
  const introRef = useRef(null)
  const setupRef = useRef(null)
  const resultsRef = useRef(null)

  // checkedIds persists (the checkbox stays filled); bubbleId is transient —
  // only the item just checked shows the "좋은 선택이에요!" bubble, and it
  // auto-clears itself a couple seconds later so it doesn't just pile up.
  const [checkedIds, setCheckedIds] = useState(() => new Set())
  const [bubbleId, setBubbleId] = useState(null)
  const bubbleTimeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(bubbleTimeoutRef.current), [])

  const handleToggleCheck = (id) => {
    const willCheck = !checkedIds.has(id)
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    clearTimeout(bubbleTimeoutRef.current)
    if (willCheck) {
      setBubbleId(id)
      bubbleTimeoutRef.current = setTimeout(() => setBubbleId(null), 2300)
    } else {
      setBubbleId((current) => (current === id ? null : current))
    }
  }

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

      revealFrom(`.${styles.setupGrid} > *`, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: { trigger: setupRef.current, start: 'top 90%', once: true },
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  // Results section only exists once a location + result are available, so
  // it needs its own effect keyed off that (mirrors Home.jsx's preview section).
  const hasResults = Boolean(location && result)
  useEffect(() => {
    if (!hasResults || !resultsRef.current) return undefined
    if (prefersReducedMotion()) return undefined

    const ctx = gsap.context(() => {
      revealFrom([`.${styles.resultsTitle}`, `.${styles.resultsMeta}`], {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: resultsRef.current, start: 'top 85%', once: true },
      })

      const cards = resultsRef.current.querySelectorAll(`.${styles.itemCard}`)
      if (cards.length) {
        revealFrom(cards, {
          opacity: 0,
          y: 28,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.06,
          scrollTrigger: { trigger: resultsRef.current, start: 'top 85%', once: true },
        })
      }
    }, resultsRef)

    return () => ctx.revert()
  }, [hasResults])

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.intro} ref={introRef}>
        <p className={styles.eyebrow}>Outfit recommendation</p>
        <h1 className={styles.title}>오늘 뭐 입지?</h1>
        <p className={styles.lede}>위치와 취향을 알려주면 오늘 날씨에 맞는 코디를 추천해드려요.</p>
        <Button to="/dressup" variant="secondary" className={styles.dressUpLink}>
          픽셀아트로 입혀보기
        </Button>
      </header>

      <div ref={setupRef} className={styles.setupSection}>
        <div className={styles.setupGrid}>
          <Card accent="sky" className={styles.setupCard}>
            <h2 className={styles.cardTitle}>위치</h2>
            <LocationSelector />
          </Card>

          <WeatherCard
            weather={weather}
            isLoading={isLoading}
            error={error}
            locationLabel={location?.label}
          />
        </div>

        <div className={styles.setupGrid}>
          <Card accent="lavender" className={styles.setupCard}>
            <h2 className={styles.cardTitle}>성별</h2>
            <GenderSelector />
          </Card>

          <Card accent="mint" className={styles.setupCard}>
            <h2 className={styles.cardTitle}>선호 스타일</h2>
            <StyleSelector />
          </Card>
        </div>
      </div>

      {!location && <p className={styles.hint}>위치를 선택하면 추천을 시작할 수 있어요.</p>}

      {location && result && (
        <section className={styles.results} ref={resultsRef}>
          <span className="washiDivider" aria-hidden="true" />
          <h2 className={styles.resultsTitle}>오늘의 추천 코디</h2>
          <p className={styles.resultsMeta}>
            {result.band.label} 날씨 기준{result.isRainy ? ' · 비 소식이 있어 방수 아이템을 우선 추천했어요' : ''}
          </p>

          {/* One flat horizontal row across every category (not a separate
              stacked section per category) — each card carries its own
              category tag since there's no longer a per-category heading
              to group them under. */}
          <div className={styles.itemGrid}>
            {CATEGORY_META.flatMap(({ key, label, accent }) =>
              result.items[key].map((item) => {
                const isChecked = checkedIds.has(item.id)
                return (
                  <Card key={item.id} accent={accent} className={styles.itemCard}>
                    <button
                      type="button"
                      className={`${styles.checkButton} ${isChecked ? styles.checkButtonActive : ''}`}
                      onClick={() => handleToggleCheck(item.id)}
                      aria-pressed={isChecked}
                      aria-label={isChecked ? `${item.name} 체크 해제` : `${item.name} 체크하기`}
                    >
                      ✓
                    </button>
                    {bubbleId === item.id && (
                      <span className={styles.pixelBubble} role="status">
                        좋은 선택이에요!
                      </span>
                    )}
                    <span className={styles.itemCategory}>{label}</span>
                    <p className={styles.itemName}>{item.name}</p>
                    <p className={styles.itemDesc}>{item.description}</p>
                  </Card>
                )
              })
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default OutfitRecommend
