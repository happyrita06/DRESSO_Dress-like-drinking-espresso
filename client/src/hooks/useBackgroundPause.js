import { useEffect } from 'react'

/**
 * Stamps `data-bg-paused="true"` on <html> whenever the tab isn't visible,
 * so the always-on decorative background loops (GradientMesh,
 * FloatingParticles) stop burning CPU/GPU in a backgrounded tab — same
 * `animation-play-state: paused` escape hatch each of those modules already
 * wires up for this attribute. Mounted once at the app root.
 */
export function useBackgroundPause() {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      root.setAttribute('data-bg-paused', document.hidden ? 'true' : 'false')
    }
    apply()
    document.addEventListener('visibilitychange', apply)
    return () => document.removeEventListener('visibilitychange', apply)
  }, [])
}
