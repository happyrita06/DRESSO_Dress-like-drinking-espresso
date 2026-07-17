import { useEffect } from 'react'

// Spring-like settle rather than a hard snap-to-cursor: each frame the
// written value only closes part of the gap to the raw pointer position,
// so a fast mouse flick eases in instead of teleporting. Lower = softer/
// more trailing, higher = snappier. Tuned by feel, not measured.
const LERP_FACTOR = 0.08
const SETTLE_EPSILON = 0.0005

/**
 * Tracks pointer position as a -1..1 offset from viewport center and lerps
 * it onto CSS custom properties `--px`/`--py`, rAF-driven so a fast
 * mousemove stream never triggers more than one style write per frame —
 * and never a React re-render, since every consumer (background layers,
 * Card's dynamic shadow) reads the vars purely through CSS.
 *
 * Writes to `document.documentElement` by default (an explicit ref can
 * still be passed) so the vars are available to any descendant — the
 * portal-rendered background and ordinary page content alike — via plain
 * CSS custom property inheritance, without each consumer needing its own
 * listener.
 *
 * No-ops (leaving the vars at their 0 default) under
 * prefers-reduced-motion or when there's no fine pointer (touch), where
 * CSS auto-float alone carries the effect.
 */
export function useParallaxPointer(targetRef) {
  useEffect(() => {
    const node = targetRef?.current ?? document.documentElement
    if (!node) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches
    if (reduceMotion || !hasFinePointer) return undefined

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let frame = null

    const tick = () => {
      current.x += (target.x - current.x) * LERP_FACTOR
      current.y += (target.y - current.y) * LERP_FACTOR
      node.style.setProperty('--px', current.x.toFixed(4))
      node.style.setProperty('--py', current.y.toFixed(4))

      const settled =
        Math.abs(target.x - current.x) < SETTLE_EPSILON && Math.abs(target.y - current.y) < SETTLE_EPSILON
      frame = settled ? null : requestAnimationFrame(tick)
    }

    const handleMove = (event) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1
      target.y = (event.clientY / window.innerHeight) * 2 - 1
      if (frame == null) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (frame != null) cancelAnimationFrame(frame)
    }
  }, [targetRef])
}
