import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import styles from './FloatingParticles.module.css'

const PARTICLE_COUNT = 12
const SHAPES = ['dot', 'dot', 'dot', 'sparkle']

const randRange = (min, max) => min + Math.random() * (max - min)

/**
 * Soft bokeh/sparkle dust drifting slowly upward across the whole app —
 * mounted after ShootingStars in App.jsx so it sits nearest of the fixed
 * background layers. Pure CSS keyframe drift (no GSAP/rAF needed, same
 * reasoning as GradientMesh): each particle's size/left/duration/delay is
 * randomized once via useMemo and baked into inline custom properties, so
 * the loop itself stays a single shared @keyframes rule. Skips entirely
 * under prefers-reduced-motion, matching ShootingStars' convention.
 */
function FloatingParticles() {
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        left: randRange(0, 100),
        size: randRange(3, 9),
        duration: randRange(14, 30),
        delay: randRange(-30, 0),
        drift: randRange(-40, 40),
        opacity: randRange(0.25, 0.65),
      })),
    []
  )

  if (prefersReducedMotion) return null

  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`${styles.particle} ${p.shape === 'sparkle' ? styles.sparkle : styles.dot}`}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
            '--peak-opacity': p.opacity,
          }}
        />
      ))}
    </div>,
    document.body
  )
}

export default FloatingParticles
