import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { getMoodProfile } from '../data/moodboardData'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './TodayMoodboard.module.css'

// A few preset torn-edge silhouettes (see FloatingClothesCollage for the
// same technique) and rotation angles, cycled by card index so the collage
// reads as hand-placed rather than gridded.
const ROTATIONS = [-3, 2, -2, 3]

function todayLabel() {
  const d = new Date()
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} ${weekday}`
}

function TornCard({ label, rotate, variant = 'a', size, className = '', style, children }) {
  return (
    <div
      className={`${styles.card} ${styles[`variant${variant.toUpperCase()}`]} ${size ? styles[size] : ''} ${className}`}
      style={{ '--rotate': `${rotate}deg`, ...style }}
    >
      <div className={styles.cardInner}>{children}</div>
      {label && <span className={styles.cardLabel}>{label}</span>}
    </div>
  )
}

/**
 * A weather-driven, magazine-cutout-style color/texture moodboard: CSS-
 * generated fabric texture swatches, the day's color palette, and a beauty-
 * mood color chip — all chosen from today's temperature band + sky
 * condition (see data/moodboardData.js).
 */
function TodayMoodboard({ weather }) {
  const mood = weather ? getMoodProfile(weather) : null
  const gridRef = useRef(null)

  const moodKey = mood ? `${mood.bandId}|${mood.condition}|${mood.emphasize.join(',')}` : null

  useEffect(() => {
    if (!moodKey || !gridRef.current) return undefined
    if (prefersReducedMotion()) return undefined

    const ctx = gsap.context(() => {
      const cards = gridRef.current.querySelectorAll(`.${styles.card}`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 28,
        scale: 0.96,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.06,
        scrollTrigger: { trigger: gridRef.current, start: 'top 85%', once: true },
      })
    }, gridRef)

    return () => ctx.revert()
  }, [moodKey])

  if (!weather || !mood) return null

  // Four fixed cards (Fabric, Texture, Palette [wide=2 cells], Beauty) tile
  // a 4-column grid exactly (1+1+2+1=5 cells -> filler fills the remaining
  // 3 to complete the row) regardless of mood, so this doesn't need the
  // dynamic cell-count math the photo-driven version needed.
  const GRID_COLUMNS = 4
  const BASE_CELLS = 1 /* fabric */ + 1 /* texture */ + 2 /* palette */ + 1 /* beauty */
  const fillerSpan = (GRID_COLUMNS - (BASE_CELLS % GRID_COLUMNS)) % GRID_COLUMNS

  return (
    <section className={styles.board} aria-labelledby="moodboard-title">
      <div className={styles.boardHeader}>
        <p className={styles.kicker}>TODAY&apos;S MOODBOARD</p>
        <h2 id="moodboard-title" className={styles.title}>
          {mood.title}
        </h2>
        <span className={styles.dateStamp}>
          {todayLabel()} · {Math.round(weather.tmp)}&deg;C
        </span>
      </div>

      <span className="washiDivider" aria-hidden="true" />

      <div className={styles.grid} ref={gridRef}>
        <TornCard label="FABRIC" rotate={ROTATIONS[0]} variant="b">
          <div
            className={`${styles.textureSwatch} ${styles[`tex${capitalize(mood.textures[0])}`]}`}
            style={{ '--tex-a': mood.palette[1], '--tex-b': mood.palette[3] }}
          />
        </TornCard>

        <TornCard label="TEXTURE" rotate={ROTATIONS[1]} variant="c">
          <div
            className={`${styles.textureSwatch} ${styles[`tex${capitalize(mood.textures[1])}`]}`}
            style={{ '--tex-a': mood.palette[0], '--tex-b': mood.palette[4] }}
          />
        </TornCard>

        <TornCard label="PALETTE" rotate={ROTATIONS[2]} variant="a" size="wide">
          <div className={styles.paletteRow}>
            {mood.palette.map((hex) => (
              <div key={hex} className={styles.swatchChip}>
                <span className={styles.swatchColor} style={{ background: hex }} />
                <span className={styles.swatchHex}>{hex.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </TornCard>

        <TornCard label="BEAUTY MOOD" rotate={ROTATIONS[3]} variant="b">
          <div className={styles.beautyRow}>
            {mood.palette.slice(0, 3).map((hex) => (
              <span key={hex} className={styles.beautyDot} style={{ background: hex }} />
            ))}
          </div>
        </TornCard>

        {fillerSpan > 0 && (
          <TornCard label="MOOD" rotate={-1} variant="c" style={{ gridColumn: `span ${fillerSpan}` }}>
            <div
              className={`${styles.textureSwatch} ${styles[`tex${capitalize(mood.textures[2])}`]}`}
              style={{ '--tex-a': mood.palette[2], '--tex-b': mood.palette[0] }}
            />
          </TornCard>
        )}
      </div>
    </section>
  )
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default TodayMoodboard
