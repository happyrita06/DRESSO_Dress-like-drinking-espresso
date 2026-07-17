import { createPortal } from 'react-dom'
import styles from './GradientMesh.module.css'

/**
 * Soft ambient glow layer in the app's background stack: large, softly-
 * blurred pastel blobs that drift on independent CSS keyframe loops. Pure
 * CSS (no GSAP/JS) — same reasoning as ParallaxBackground's own float
 * keyframes: this motion doesn't need to be scroll- or pointer-linked, so
 * there's nothing a rAF loop would buy here, and
 * `@media (prefers-reduced-motion: reduce)` alone is enough to freeze it.
 * Two blobs, not three — measured ~34fps with 3 overlapping blurred
 * layers under the animated Dither canvas vs ~46fps with 2 (blur radius
 * itself barely moved the number; it's specifically having 3+ overlapping
 * blur layers recomposited every frame that's expensive) — see the CSS
 * module for the rest of the tuning (off entirely under 768px, etc).
 */
function GradientMesh() {
  return createPortal(
    <div className={styles.root} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blobPink}`} />
      <span className={`${styles.blob} ${styles.blobLavender}`} />
    </div>,
    document.body
  )
}

export default GradientMesh
