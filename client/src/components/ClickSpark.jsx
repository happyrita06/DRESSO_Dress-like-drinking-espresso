import { useCallback, useEffect, useRef } from 'react'
import styles from './ClickSpark.module.css'

const EASINGS = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  'ease-out': (t) => t * (2 - t),
}

/**
 * Full-viewport click-spark overlay: a burst of short radiating lines at
 * every click point, canvas-drawn (not DOM nodes, so a rapid click flurry
 * stays cheap). Mounted once globally in App.jsx, fixed + pointer-events:
 * none so it never intercepts real clicks — listens on `window` instead of
 * needing the canvas itself to receive the event.
 */
function ClickSpark({
  sparkColor = '#ffffff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1,
}) {
  const canvasRef = useRef(null)
  const sparksRef = useRef([])
  const easeFunc = EASINGS[easing] || EASINGS['ease-out']

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    resizeCanvas()

    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resizeCanvas, 100)
    }
    window.addEventListener('resize', handleResize)

    const handleClick = (event) => {
      const now = performance.now()
      const x = event.clientX
      const y = event.clientY
      for (let i = 0; i < sparkCount; i += 1) {
        sparksRef.current.push({ x, y, angle: (2 * Math.PI * i) / sparkCount, startTime: now })
      }
    }
    window.addEventListener('click', handleClick)

    let animationId
    const draw = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime
        if (elapsed >= duration) return false

        const eased = easeFunc(elapsed / duration)
        const distance = eased * sparkRadius * extraScale
        const lineLength = sparkSize * (1 - eased)

        const x1 = spark.x + distance * Math.cos(spark.angle)
        const y1 = spark.y + distance * Math.sin(spark.angle)
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle)
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle)

        ctx.strokeStyle = sparkColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        return true
      })

      animationId = requestAnimationFrame(draw)
    }
    animationId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('click', handleClick)
      cancelAnimationFrame(animationId)
      clearTimeout(resizeTimer)
    }
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easeFunc, extraScale, resizeCanvas])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}

export default ClickSpark
