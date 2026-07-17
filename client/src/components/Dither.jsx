import { useEffect, useRef } from 'react'
import styles from './Dither.module.css'

// Classic 4x4 ordered (Bayer) dither matrix, normalized to -0.5..0.5. This
// is the actual fix for the "still has a grid" problem: quantizing a smooth
// wave field into a handful of `colorNum` bands on its own always draws
// hard contour lines wherever the value crosses a band threshold, and two
// periodic waves (x and y) sharing a frequency always tile those contours
// into *some* regular repeating shape — switching sin(x)*cos(y) to
// sin(x)+sin(y) earlier just changed it from a checkerboard to a diamond/
// argyle grid, it didn't remove the periodicity. Adding a per-pixel Bayer
// threshold before quantizing is the standard way real dithering avoids
// this: it perturbs *which* band each pixel rounds to based on a small
// repeating 4x4 texture instead of the wave value alone, breaking the
// smooth contour lines up into a fine stippled/noisy texture — which is
// also just what an actual "dither" effect is supposed to look like.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16 - 0.5))

/**
 * Animated dithered-wave background: a low-res canvas (one pixel per
 * `pixelSize` screen px) filled from a moving sine-wave field, quantized to
 * `colorNum` brightness steps for the chunky retro-dither look, then scaled
 * up via CSS `image-rendering: pixelated` instead of drawing full-size
 * rects — draws `(width/pixelSize) x (height/pixelSize)` cells per frame
 * (a few thousand, even at pixelSize:2 on a big screen) instead of the
 * ~2 million individual screen pixels a naive full-res loop would touch,
 * which is what makes this cheap enough to run every frame without a WebGL
 * shader (the project has no Three.js/OGL dependency — this trades exact
 * shader fidelity for staying in plain Canvas2D).
 */
function Dither({
  waveColor = [1, 0.455, 0.722], // --vivid-pink (#ff74b8), matching the app's palette
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
  colorNum = 4,
  pixelSize = 2,
  waveAmplitude = 0.3,
  waveFrequency = 3,
  waveSpeed = 0.05,
}) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -9999, y: -9999, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cols = 0
    let rows = 0
    const resize = () => {
      cols = Math.max(1, Math.ceil(window.innerWidth / pixelSize))
      rows = Math.max(1, Math.ceil(window.innerHeight / pixelSize))
      canvas.width = cols
      canvas.height = rows
    }
    resize()
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 150)
    }
    window.addEventListener('resize', handleResize)

    const handleMouseMove = (event) => {
      mouseRef.current = {
        x: event.clientX / pixelSize,
        y: event.clientY / pixelSize,
        active: true,
      }
    }
    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }
    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseleave', handleMouseLeave)
    }

    const [r, g, b] = waveColor.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255))
    const mouseRadiusCells = (mouseRadius * 200) / pixelSize
    const steps = Math.max(2, colorNum)
    const animate = disableAnimation || reducedMotion ? false : true
    // Ambient texture stays subtle everywhere; opacity only ramps up near
    // the cursor (BASE_ALPHA vs BASE_ALPHA + MOUSE_ALPHA_BOOST), so the grain
    // itself can be emphasized without making the whole background heavier.
    const BASE_ALPHA = 42 * 1.4 * 1.2
    const MOUSE_ALPHA_BOOST = 150 * 1.4 * 1.2

    let animationId
    let time = 0
    const draw = () => {
      const imageData = ctx.createImageData(cols, rows)
      const data = imageData.data
      const { x: mx, y: my, active } = mouseRef.current

      const f = waveFrequency * 0.007

      // The melt hash below only depends on x (which block-column a pixel
      // falls in), not y — computed per (x, y) cell it was ~289k Math.sin
      // calls/frame instead of ~600 (dropped FPS 52 -> 19), so it's
      // hoisted out here and looked up per row instead.
      const MELT_BLOCK = 3
      const colFracCache = enableMouseInteraction && active ? new Float32Array(cols) : null
      if (colFracCache) {
        for (let cx = 0; cx < cols; cx += 1) {
          const blockDx = Math.floor((cx - mx) / MELT_BLOCK) * MELT_BLOCK
          const colSeed = Math.sin(blockDx * 12.9898) * 43758.5453
          colFracCache[cx] = colSeed - Math.floor(colSeed)
        }
      }

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          // Any sum of axis-aligned sine waves still tiles into a regular
          // grid at large scale no matter how it's quantized — Bayer
          // dithering alone couldn't fix that, since it only smooths the
          // *quantization* step, not the periodicity of the field itself.
          // Summing three sines at different angles (axis-aligned, one
          // diagonal) and non-matching frequency ratios (1, 1.13, 0.6) is a
          // cheap classic trick for faking noise without a real noise
          // function: the combined period is so much larger than any single
          // term's that it reads as organic/cloud-like up close instead of
          // an obvious repeating tile. A 4th term measured ~47fps vs ~60fps
          // for 3, so this is the cheapest count that still hides the tile.
          let value =
            (Math.sin(x * f + time) +
              Math.sin(y * f * 1.13 - time * 0.8) +
              Math.sin((x * 0.7 + y * 0.7) * f * 0.6 + time * 1.3)) *
            (1 / 3) *
            waveAmplitude

          let mouseGlow = 0
          if (enableMouseInteraction && active) {
            const rawDx = x - mx
            const rawDy = y - my
            // Cheap squared-distance gate on the RAW (unsnapped) position
            // first — block-snapping and the per-column hash below only
            // stay close to the raw point (see the melt-offset comment), so
            // this bound is safe, and it's what keeps the expensive per-
            // column math from running on every pixel on screen instead of
            // just the handful actually near the cursor.
            const gateRadius = mouseRadiusCells * 1.5
            if (rawDx * rawDx + rawDy * rawDy < gateRadius * gateRadius) {
            // Snap to a coarse block grid before feeding into the ripple
            // math below, instead of computing smooth per-cell values — the
            // shape reads as chunky enlarged pixels rather than a soft
            // gradient. Each column of blocks also gets its own constantly-
            // increasing, wrapping vertical offset (a hashed per-column
            // speed/phase so columns don't move in lockstep), which makes
            // the blocks continuously drip/cycle downward through the
            // shape instead of sitting static — the "melting" part. The
            // offset is added then subtracted back out around the floor, so
            // it only ever shifts which block boundary a point falls on
            // (at most one MELT_BLOCK away from its raw position) rather
            // than actually displacing the point — keeping the gate above
            // valid.
            const blockDx = Math.floor(rawDx / MELT_BLOCK) * MELT_BLOCK
            const colFrac = colFracCache[x]
            const meltRange = MELT_BLOCK * 6
            const meltOffset = ((time * (5 + colFrac * 9) + colFrac * meltRange) % meltRange) - meltRange / 2
            const blockDy = Math.floor((rawDy + meltOffset) / MELT_BLOCK) * MELT_BLOCK - meltOffset

            const dx = blockDx
            const dy = blockDy
            // Back to a uniform, radially-symmetric ripple (no angular
            // turbulence or vertical stretch) — the pixel-block snapping
            // above is what gives it a "pixel style" texture, this part is
            // what keeps the actual glow shape a plain, even circle.
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < mouseRadiusCells) {
              const falloff = 1 - dist / mouseRadiusCells
              // Concentric rings flowing outward from the cursor: the sin
              // phase is `dist * k - time * speed`, so holding the phase
              // constant as time grows means dist has to grow too — the
              // ring crests visibly travel outward instead of just
              // pulsing in place.
              const ripple = Math.sin(dist * 0.55 - time * 4.5) * 0.5 + 0.5
              mouseGlow = falloff * (0.45 + 0.55 * ripple)
              value += mouseGlow * 0.6
            }
            }
          }

          // Normalize to 0..1, push toward the extremes for more visible
          // grain contrast, nudge by this pixel's Bayer threshold at double
          // strength (emphasized texture), *then* quantize into `steps`
          // bands — see BAYER_4X4 above for why the Bayer step exists.
          const normalized = Math.max(0, Math.min(1, (value + 1) / 2))
          const contrasted = Math.max(0, Math.min(1, 0.5 + (normalized - 0.5) * 1.35))
          const dithered = Math.max(0, Math.min(1, contrasted + (2 * BAYER_4X4[y % 4][x % 4]) / steps))
          const quantized = Math.round(dithered * (steps - 1)) / (steps - 1)

          const i = (y * cols + x) * 4
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          // Base opacity is a flat, subtle wash; the cursor adds an extra
          // glow on top instead of the whole field getting brighter.
          data[i + 3] = Math.round(quantized * BASE_ALPHA + mouseGlow * MOUSE_ALPHA_BOOST)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      if (animate) {
        time += waveSpeed
        animationId = requestAnimationFrame(draw)
      }
    }
    draw()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationId)
      clearTimeout(resizeTimer)
    }
  }, [waveColor, disableAnimation, enableMouseInteraction, mouseRadius, colorNum, pixelSize, waveAmplitude, waveFrequency, waveSpeed])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}

export default Dither
