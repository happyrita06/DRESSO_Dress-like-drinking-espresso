import { createPortal } from 'react-dom'
import { CLOUD_MATRICES, STAR_MATRICES, pixelMatrixToRects, pixelMatrixSize } from '../utils/pixelArt'
import styles from './PixelSky.module.css'

// Negative `delay` starts each cloud already mid-flight so they don't all
// bunch up at the left edge on load — each still loops at its own `duration`
// (its drift speed), giving the layer a naturally staggered, floaty feel.
const CLOUDS = [
  { variant: 'lg', top: '6%', width: 170, duration: 70, delay: -10 },
  { variant: 'md', top: '20%', width: 120, duration: 54, delay: -30 },
  { variant: 'sm', top: '2%', width: 80, duration: 42, delay: -5 },
  { variant: 'md', top: '32%', width: 130, duration: 62, delay: -45 },
  { variant: 'lg', top: '13%', width: 190, duration: 85, delay: -60 },
  { variant: 'sm', top: '27%', width: 75, duration: 38, delay: -15 },
]

const STARS = [
  { top: '4%', left: '8%', variant: 'cross', size: 12, color: '#FF74B8', duration: 2.2, delay: 0 },
  { top: '10%', left: '85%', variant: 'diagonal', size: 16, color: '#B36FE8', duration: 2.8, delay: 0.4 },
  { top: '18%', left: '45%', variant: 'tinyCross', size: 9, color: '#FF4F9E', duration: 1.8, delay: 0.9 },
  { top: '3%', left: '60%', variant: 'cross', size: 10, color: '#FFFFFF', duration: 2.5, delay: 1.3 },
  { top: '24%', left: '20%', variant: 'diagonal', size: 14, color: '#FF74B8', duration: 3.2, delay: 0.2 },
  { top: '30%', left: '92%', variant: 'tinyCross', size: 10, color: '#B36FE8', duration: 2.0, delay: 1.6 },
  { top: '8%', left: '32%', variant: 'tinyCross', size: 8, color: '#FF4F9E', duration: 1.6, delay: 0.5 },
  { top: '15%', left: '5%', variant: 'diagonal', size: 12, color: '#FFFFFF', duration: 2.6, delay: 1.0 },
  { top: '36%', left: '70%', variant: 'cross', size: 11, color: '#FF74B8', duration: 2.3, delay: 0.7 },
  { top: '2%', left: '95%', variant: 'tinyCross', size: 9, color: '#B36FE8', duration: 1.9, delay: 1.4 },
  { top: '22%', left: '55%', variant: 'cross', size: 13, color: '#FFFFFF', duration: 2.7, delay: 0.3 },
  { top: '40%', left: '15%', variant: 'diagonal', size: 10, color: '#FF4F9E', duration: 2.1, delay: 1.1 },
]

function PixelShape({ matrix, color, shadowColor, className }) {
  const { width, height } = pixelMatrixSize(matrix)
  const shadow = shadowColor ? pixelMatrixToRects(matrix, { color: shadowColor, offsetX: 1, offsetY: 1 }) : []
  const main = pixelMatrixToRects(matrix, { color })

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width + 4} ${height + 4}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {shadow.map((r) => (
        <rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} />
      ))}
      {main.map((r) => (
        <rect key={r.key} x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} />
      ))}
    </svg>
  )
}

/**
 * A fixed, whole-viewport ambient layer of drifting pixel-art clouds and
 * twinkling pixel-dot stars — mounted once at the app root (see App.jsx) so
 * it never re-renders per page. Portaled to document.body and given a
 * negative z-index so it sits above the page's own tiled background but
 * behind every bit of real content, and never intercepts clicks.
 */
function PixelSky() {
  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className={styles.cloud}
          style={{
            top: cloud.top,
            width: cloud.width,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <PixelShape
            matrix={CLOUD_MATRICES[cloud.variant]}
            color="#FFFFFF"
            shadowColor="#FFD8EC"
            className={styles.cloudSvg}
          />
        </div>
      ))}

      {STARS.map((star, i) => (
        <div
          key={i}
          className={styles.star}
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        >
          <PixelShape matrix={STAR_MATRICES[star.variant]} color={star.color} className={styles.starSvg} />
        </div>
      ))}
    </div>,
    document.body
  )
}

export default PixelSky
