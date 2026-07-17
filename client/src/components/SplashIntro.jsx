import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import styles from './SplashIntro.module.css'

const WORD = 'Dresso'
const SESSION_KEY = 'dresso-splash-shown'

// Budget: 1.2s drawing the letters on + 0.2s hold, then the same timeline
// reversed at 2x speed undraws it in 0.6s — 2.0s total, matching the
// "draw then rewind" brief instead of a bolted-on fade-out.
const DRAW_DURATION = 1.2
const HOLD_DURATION = 0.2
const REVERSE_TIME_SCALE = 2

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function alreadyShownThisSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

/**
 * One-time splash that draws "Dresso" on letter-by-letter, then undraws
 * itself by reversing the same GSAP timeline — a rewind, not a separate
 * fade. The site's display font (Mona12, a pixel/bitmap face — see
 * variables.css) has no stroke-path outline data to draw true pen strokes
 * from, so "handwriting" is approximated with a per-letter clip-path
 * reveal + a small settling rotation: each letter finishes before the next
 * starts, which is the visual cue that reads as sequential/hand-drawn,
 * without needing real glyph paths.
 *
 * Gated on sessionStorage (not a module-level flag) so a fresh tab/session
 * replays it once, while route navigation within the same session — which
 * doesn't remount this component at the App root — never re-triggers it.
 */
function SplashIntro() {
  const [visible, setVisible] = useState(() => !prefersReducedMotion() && !alreadyShownThisSession())
  const letterRefs = useRef([])
  letterRefs.current = []

  useEffect(() => {
    if (!visible) return undefined

    sessionStorage.setItem(SESSION_KEY, 'true')

    // CSS already holds the pre-JS resting state (clipped/rotated), so the
    // very first tween frame is the first visible change — no separate
    // gsap.set() needed to avoid a flash of unstyled text.
    const letters = letterRefs.current.filter(Boolean)
    const tl = gsap.timeline()

    tl.to(letters, {
      clipPath: 'inset(0% 0% 0% 0%)',
      rotate: 0,
      duration: DRAW_DURATION / letters.length,
      stagger: DRAW_DURATION / letters.length,
      ease: 'power1.out',
    })
    tl.to({}, { duration: HOLD_DURATION })
    tl.call(() => tl.timeScale(REVERSE_TIME_SCALE).reverse())
    tl.eventCallback('onReverseComplete', () => setVisible(false))

    return () => tl.kill()
  }, [visible])

  if (!visible) return null

  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.word}>
        {WORD.split('').map((char, i) => (
          <span
            key={`${char}-${i}`}
            ref={(el) => {
              letterRefs.current[i] = el
            }}
            className={styles.letter}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  )
}

export default SplashIntro
