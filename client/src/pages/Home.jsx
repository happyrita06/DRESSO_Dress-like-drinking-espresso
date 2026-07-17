import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import Card from '../components/Card'
import Button from '../components/Button'
import WeatherCard from '../components/WeatherCard'
import TodayMoodboard from '../components/TodayMoodboard'
import { useLocation } from '../contexts/LocationContext'
import { useStyle } from '../contexts/StyleContext'
import { useWeather } from '../hooks/useWeather'
import { recommendOutfit } from '../utils/recommendEngine'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './Home.module.css'

const PREVIEW_CATEGORIES = [
  { key: 'outer', label: '아우터' },
  { key: 'top', label: '상의' },
  { key: 'bottom', label: '하의' },
]

function Home() {
  const { location } = useLocation()
  const { gender, preferredStyles } = useStyle()
  const { weather, isLoading, error } = useWeather(location)

  const pageRef = useRef(null)
  const heroRef = useRef(null)
  const weatherRowRef = useRef(null)
  const previewRef = useRef(null)

  const result = weather
    ? recommendOutfit({
        tmp: weather.tmp,
        reh: weather.reh,
        pop: weather.pop,
        weatherCode: weather.weatherCode,
        styles: preferredStyles,
        gender: gender || 'all',
      })
    : null

  // Hero reads immediately on mount (it's above the fold, no scroll to
  // trigger off of) — everything below gets a real scroll-triggered
  // reveal. `once: true` on every ScrollTrigger here is deliberate: this
  // is a one-time "story unfolds as you scroll down" beat, not a
  // scrub-linked effect that should reverse if you scroll back up.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    const ctx = gsap.context(() => {
      revealFrom(heroRef.current.children, {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
      })

      revealFrom(weatherRowRef.current.children, {
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: { trigger: weatherRowRef.current, start: 'top 88%', once: true },
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  // Preview section only exists once a location + result are available,
  // so it needs its own effect keyed off that (not the mount effect above,
  // which would run before the section is in the DOM).
  const hasPreview = Boolean(location && result)
  useEffect(() => {
    if (!hasPreview || !previewRef.current) return undefined
    if (prefersReducedMotion()) return undefined

    const ctx = gsap.context(() => {
      revealFrom([`.${styles.previewTitle}`, `.${styles.previewMeta}`], {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: previewRef.current, start: 'top 85%', once: true },
      })

      const cards = previewRef.current.querySelectorAll(`.${styles.previewCard}`)
      if (cards.length) {
        revealFrom(cards, {
          opacity: 0,
          y: 32,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: { trigger: previewRef.current, start: 'top 80%', once: true },
        })
      }

      revealFrom(`.${styles.preview} a, .${styles.preview} button`, {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: { trigger: previewRef.current, start: 'top 70%', once: true },
      })
    }, previewRef)

    return () => ctx.revert()
  }, [hasPreview])

  return (
    <div className={styles.page} ref={pageRef}>
      <section className={styles.hero} ref={heroRef}>
        <p className={styles.eyebrow}>Dresso</p>
        <h1 className={styles.title}>오늘 날씨엔 뭘 입지?</h1>
        <p className={styles.lede}>위치만 알려주면 오늘 날씨에 딱 맞는 코디를 골라드려요.</p>
      </section>

      <div className={styles.weatherRow} ref={weatherRowRef}>
        <WeatherCard
          weather={weather}
          isLoading={isLoading}
          error={error}
          locationLabel={location?.label}
          className={styles.weatherCard}
        />

        {!location && (
          <Card accent="lavender" className={styles.ctaCard}>
            <p className={styles.ctaText}>아직 위치가 설정되지 않았어요.</p>
            <Button to="/recommend" size="md">
              위치 설정하고 추천받기
            </Button>
          </Card>
        )}
      </div>

      {hasPreview && (
        <section className={styles.preview} ref={previewRef}>
          <span className="washiDivider" aria-hidden="true" />
          <h2 className={styles.previewTitle}>오늘의 추천 코디 미리보기</h2>
          <p className={styles.previewMeta}>{result.band.label} 날씨에 어울리는 조합이에요.</p>

          <div className={styles.previewGrid}>
            {PREVIEW_CATEGORIES.map(({ key, label }) => {
              const item = result.items[key]?.[0]
              if (!item) return null
              return (
                <Card key={key} accent="pink" className={styles.previewCard}>
                  <p className={styles.previewLabel}>{label}</p>
                  <p className={styles.previewName}>{item.name}</p>
                </Card>
              )
            })}
          </div>

          <Button to="/recommend" variant="secondary">
            전체 코디 보러 가기
          </Button>
        </section>
      )}

      {weather && <TodayMoodboard weather={weather} />}
    </div>
  )
}

export default Home
