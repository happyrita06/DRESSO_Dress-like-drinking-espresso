import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../utils/scrollReveal'
import styles from './PageTransition.module.css'

/**
 * Cinematic route-change effect: since <Routes> swaps the outgoing page for
 * the incoming one in the same render (no framer-motion AnimatePresence-style
 * exit phase available), this fakes a camera cut instead of a cross-fade — a
 * quick pixel-flash wipe covers the swap, and the new page settles in from a
 * slightly zoomed/blurred state, like a lens racking into focus. Runs on
 * every location.pathname change, resets scroll to top (a page cut wouldn't
 * carry over the old page's scroll position), and no-ops entirely under
 * prefers-reduced-motion — same convention as ShootingStars/useParallaxPointer.
 */
function PageTransition({ children }) {
  const location = useLocation()
  const contentRef = useRef(null)
  const flashRef = useRef(null)
  const firstRender = useRef(true)

  useEffect(() => {
    window.scrollTo(0, 0)

    if (firstRender.current) {
      firstRender.current = false
      return undefined
    }

    if (prefersReducedMotion()) return undefined

    const content = contentRef.current
    const flash = flashRef.current
    if (!content || !flash) return undefined

    gsap.killTweensOf([content, flash])

    // clearProps on completion is load-bearing, not cosmetic: leaving
    // `filter`/`transform` as inline styles (even inert ones like
    // blur(0px)/scale(1)) keeps this whole subtree GPU-layer-promoted
    // afterwards, which drops text out of subpixel antialiasing in
    // Chromium — every page painted after the first route change would
    // read as faintly hazy. Settling back to no inline styles at all
    // restores normal (sharp) text rendering once the cut has landed.
    const settle = () => gsap.set(content, { clearProps: 'transform,filter,opacity,visibility,willChange' })

    const tl = gsap.timeline({ onComplete: settle, onInterrupt: settle })
    tl.set(content, { willChange: 'transform, filter, opacity', autoAlpha: 0, scale: 1.03, filter: 'blur(8px)' })
      .set(flash, { autoAlpha: 1 })
      .to(flash, { autoAlpha: 0, duration: 0.35, ease: 'power1.out' }, 0.02)
      .to(
        content,
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' },
        0.08
      )

    return () => tl.kill()
  }, [location.pathname])

  return (
    <>
      <div ref={contentRef} className={styles.stage}>
        {children}
      </div>
      <div ref={flashRef} className={styles.flash} aria-hidden="true" />
    </>
  )
}

export default PageTransition
