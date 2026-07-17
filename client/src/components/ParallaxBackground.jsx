import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useParallaxPointer } from '../hooks/useParallaxPointer'
import { scheduleScrollRefresh } from '../utils/scrollReveal'
import styles from './ParallaxBackground.module.css'

/**
 * Replaces the old flat `body { background-image }` tile with a layered,
 * depth-cued version of the same art: three copies of the seamless SVG
 * tiles (clouds-back, clouds-mid, stars-near) sitting under one CSS
 * `perspective`, each pushed to a different `translateZ`. That's what
 * sells "3D" here rather than a literal 3D scene — real perspective
 * projection means the far layer visibly moves less than the near layer
 * for the same rotation, which is exactly the parallax cue we want, and
 * it's free (no JS math per layer, the browser's 3D transform does it).
 *
 * Depth now has two independent drivers, composed in CSS (see .tile's
 * transform in the module): mouse position (`--px`/`--py`, written by
 * useParallaxPointer onto :root) and scroll progress (`--scrollY`,
 * written below via ScrollTrigger). Each layer weights the two through
 * its own `--depth-px`/`--depth-scroll`, so the near layer both parallaxes
 * harder off the cursor AND drifts further as you scroll than the back
 * layer does — that differential is what actually reads as depth, more
 * than the translateZ staging alone.
 *
 * Mounted once at the app root like PixelSky, and portaled behind it
 * (z-index -2 vs PixelSky's -1) so PixelSky's big drifting clouds still
 * read as the nearest layer.
 */
function ParallaxBackground() {
  useParallaxPointer()

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    gsap.registerPlugin(ScrollTrigger)
    const root = document.documentElement
    // scrub (not a hard onUpdate snap) so the value itself already trails
    // the raw scroll a little — the same "no mechanical 1:1 follow" goal
    // as the pointer lerp, just GSAP's built-in version of it.
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      scrub: 0.6,
      onUpdate: (self) => root.style.setProperty('--scrollY', self.progress.toFixed(4)),
    })

    // ScrollTrigger's own auto-refresh only watches viewport resize, not
    // body growth — but this app's page height keeps changing well after
    // mount (weather fetch resolving, moodboard photos loading, the
    // scroll-reveal sections themselves rendering in), so an "end: max"
    // trigger created this early would otherwise stay pinned to whatever
    // the (often near-empty) doc height was at that first paint.
    let resizeFrame = null
    const ro = new ResizeObserver(() => {
      if (resizeFrame != null) return
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null
        scheduleScrollRefresh()
      })
    })
    ro.observe(document.body)

    return () => {
      trigger.kill()
      ro.disconnect()
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
    }
  }, [])

  return createPortal(
    <div className={styles.root} aria-hidden="true">
      <div className={styles.stage}>
        <div className={`${styles.layer} ${styles.layerBack}`}>
          <div className={styles.tile} style={{ backgroundImage: "url('/backgrounds/y2k-clouds-tile.svg')" }} />
        </div>
        <div className={`${styles.layer} ${styles.layerMid}`}>
          <div className={styles.tile} style={{ backgroundImage: "url('/backgrounds/y2k-clouds-tile.svg')" }} />
        </div>
        <div className={`${styles.layer} ${styles.layerNear}`}>
          <div className={styles.tile} style={{ backgroundImage: "url('/backgrounds/y2k-stars-tile.svg')" }} />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ParallaxBackground
