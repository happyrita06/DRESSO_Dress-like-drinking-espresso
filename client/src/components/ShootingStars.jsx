import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { SHOOTING_STAR_COLORS, buildShootingStarGlyph } from '../utils/shootingStarGlyphs'
import styles from './ShootingStars.module.css'

// One star per reference-sheet trail style (plain taper / double speed-line /
// dotted / forked) — 4 stars total lands in the "immersive but not chaotic"
// range the design calls for. `scale` is a display-size multiplier baked
// into each glyph's onscreen px size (not a GSAP transform), so it doesn't
// fight the per-launch scale jitter added below.
const STAR_CONFIGS = [
  { variant: 'single', color: SHOOTING_STAR_COLORS[0], length: 30, scale: 1.05 },
  { variant: 'double', color: SHOOTING_STAR_COLORS[1], length: 22, scale: 0.9 },
  { variant: 'dotted', color: SHOOTING_STAR_COLORS[2], length: 24, scale: 0.85 },
  { variant: 'forked', color: SHOOTING_STAR_COLORS[3], length: 28, scale: 1.1 },
]

// px-per-grid-unit for on-screen size (the glyph builder's own `unit` is an
// internal SVG coordinate, not a display size). 0.8x of the original 2.6.
const DISPLAY_UNIT = 2.08

const randRange = (min, max) => min + Math.random() * (max - min)

/**
 * Immersive meteor-shower layer: a handful of pixel-art shooting stars (see
 * shootingStarGlyphs.js) that streak across the viewport one at a time in
 * random order — not a synced loop. Each star runs its own independent
 * cycle: launch with a random start point/travel angle/duration, fade out,
 * then wait a fresh random delay before launching again. Because both the
 * delay *and* the duration are re-rolled every cycle (rather than reusing a
 * fixed interval), the stars' relative timing keeps drifting instead of
 * settling into a repeating pattern.
 *
 * Portaled + fixed like ParallaxBackground/PixelSky; mounted after PixelSky
 * in App.jsx so it reads as the nearest depth layer. Skips entirely under
 * prefers-reduced-motion, matching useParallaxPointer's convention.
 */
function ShootingStars() {
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const starRefs = useRef([])
  const glyphs = useMemo(
    () => STAR_CONFIGS.map((cfg) => buildShootingStarGlyph(cfg.variant, cfg.color, { length: cfg.length })),
    []
  )

  useEffect(() => {
    if (prefersReducedMotion) return undefined

    const pendingCalls = []

    const launch = (i) => {
      const el = starRefs.current[i]
      if (!el) return

      const vw = window.innerWidth
      const vh = window.innerHeight
      // Start roughly in the upper-left two-thirds of the viewport (with
      // some off-screen overhang) and travel down-right far enough to
      // always exit off the opposite edge, whatever the random angle.
      const startX = randRange(-0.15, 0.55) * vw
      const startY = randRange(-0.25, 0.3) * vh
      const travelX = randRange(0.4, 0.85) * vw
      const travelY = randRange(0.35, 0.7) * vh
      const endX = startX + travelX
      const endY = startY + travelY
      const angle = Math.atan2(travelY, travelX) * (180 / Math.PI)
      const duration = randRange(1.5, 2.7)
      const scaleJitter = randRange(0.85, 1.15)

      gsap.killTweensOf(el)
      gsap.set(el, { x: startX, y: startY, rotation: angle, opacity: 0, scale: scaleJitter })

      gsap
        .timeline({
          onComplete: () => {
            pendingCalls[i] = gsap.delayedCall(randRange(2.5, 9), () => launch(i))
          },
        })
        .to(el, { opacity: 1, duration: duration * 0.15, ease: 'sine.out' })
        .to(el, { x: endX, y: endY, duration, ease: 'power1.in' }, 0)
        .to(el, { opacity: 0, duration: duration * 0.3, ease: 'sine.in' }, duration * 0.7)
    }

    // Independent random initial delay per star so they don't all launch
    // together on mount.
    starRefs.current.forEach((_, i) => {
      pendingCalls[i] = gsap.delayedCall(randRange(0, 4.5), () => launch(i))
    })

    return () => {
      pendingCalls.forEach((call) => call?.kill())
      starRefs.current.forEach((el) => el && gsap.killTweensOf(el))
    }
  }, [prefersReducedMotion])

  if (prefersReducedMotion) return null

  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {glyphs.map((glyph, i) => (
        <div
          key={i}
          ref={(el) => {
            starRefs.current[i] = el
          }}
          className={styles.star}
          style={{ transformOrigin: `${glyph.headAnchor * 100}% 50%` }}
        >
          <svg
            className={styles.starSvg}
            width={glyph.width * DISPLAY_UNIT * STAR_CONFIGS[i].scale}
            height={glyph.height * DISPLAY_UNIT * STAR_CONFIGS[i].scale}
            viewBox={`0 0 ${glyph.width} ${glyph.height}`}
            shapeRendering="crispEdges"
          >
            {glyph.rects.map((r) => (
              <rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} opacity={r.opacity} />
            ))}
          </svg>
        </div>
      ))}
    </div>,
    document.body
  )
}

export default ShootingStars
