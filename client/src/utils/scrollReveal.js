import { gsap } from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Coordinates every scroll-reveal tween in the app with the body-resize-driven
 * ScrollTrigger.refresh() in ParallaxBackground.jsx.
 *
 * Root cause of the "last card in a stagger group stuck mid-animation" bug
 * (confirmed via CDP: GSAP's own per-target onComplete fired reporting a
 * non-zero resting `translate`, i.e. GSAP itself thought that was the final
 * value): ScrollTrigger.refresh() reverts *every* live ScrollTrigger — not
 * just the one whose layout actually changed — to remeasure positions, then
 * force-renders each one's animation back from a progress snapshot taken at
 * the start of that revert (see ScrollTrigger.js's `revert()`/`refresh()`:
 * `prevAnimProgress = animation.progress()` ... `animation.progress(prevAnimProgress
 * || 0, true).render(animation.time(), true, true)`). If a staggered
 * gsap.from() is actively mid-flight when that snapshot is taken, the
 * snapshot doesn't line up with where the per-target staggered playheads
 * really are, and the group's internal time bookkeeping comes out of it
 * desynced — later-staggered targets (the ones with the least progress at
 * snapshot time) never resolve to their true end value even though the
 * tween goes on to report 100% complete. Because this app calls a global
 * refresh() from a body ResizeObserver (weather/photo/reveal-section layout
 * keeps shifting well after mount) and reveal tweens fire right as their
 * section scrolls in — i.e. right when layout is also still settling — the
 * two collide routinely, not as a rare timing fluke.
 *
 * Fix: track how many reveal tweens are actively playing and have the
 * resize-driven refresh reschedule itself instead of firing mid-tween.
 * `clearProps` in onComplete/onInterrupt is a second, independent
 * guarantee: even a tween interrupted some other way always lands in
 * whatever resting state the component's own CSS defines, rather than
 * whatever (possibly desynced) values GSAP last computed.
 */
let activeReveals = 0

export function scheduleScrollRefresh() {
  if (activeReveals > 0) {
    gsap.delayedCall(0.2, scheduleScrollRefresh)
    return
  }
  ScrollTrigger.refresh()
}

/**
 * Plain DOM style resets rather than another gsap.set({clearProps}) tween —
 * deliberately. onInterrupt can fire synchronously from inside
 * gsap.context()'s own revert/kill pass (React StrictMode's dev-only
 * double-invoke of effects triggers exactly this), and creating a *new*
 * GSAP tween from in there raced GSAP's internal "current context" bookkeeping
 * (a bogus "Invalid scope" warning, since the context being torn down isn't
 * a valid selector scope anymore). Setting the styles directly sidesteps
 * GSAP's context system entirely, so it's safe to call from any of these
 * callbacks regardless of what GSAP's own teardown is doing at that moment.
 */
const settleTargets = (tween) => {
  tween.targets().forEach((el) => {
    el.style.transform = ''
    el.style.opacity = ''
  })
}

/** Drop-in replacement for gsap.from() for reveal tweens — same args, adds the coordination above. */
export function revealFrom(targets, vars) {
  const { onStart, onComplete, onInterrupt, ...rest } = vars
  let settled = false

  const settle = (tween) => {
    if (settled) return
    settled = true
    settleTargets(tween)
    activeReveals = Math.max(0, activeReveals - 1)
  }

  const tween = gsap.from(targets, {
    ...rest,
    onStart: function (...args) {
      activeReveals += 1
      onStart?.apply(this, args)
    },
    onComplete: function (...args) {
      settle(this)
      onComplete?.apply(this, args)
    },
    onInterrupt: function (...args) {
      settle(this)
      onInterrupt?.apply(this, args)
    },
  })

  // Safety net for exactly the desync bug described above: if a target's
  // own onComplete/onInterrupt somehow never fires (the documented failure
  // mode — a later-staggered target whose internal timing came out
  // desynced can report the tween 100% complete without ever visually
  // reaching its end value), this guarantees every target still lands at
  // full opacity/no-transform after a generous timeout, instead of staying
  // permanently stuck at a partial "hazy" opacity — which is what a
  // half-revealed card striped through this bug actually looks like.
  const staggerSpan = typeof rest.stagger === 'number' ? rest.stagger * 20 : 1
  const safetyDelay = (rest.duration || 0.6) + staggerSpan + 2
  gsap.delayedCall(safetyDelay, () => settle(tween))

  return tween
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
