import { useMemo } from 'react'
import SafeImg from './SafeImg'
import styles from './CollageCard.module.css'

/**
 * Deterministic pseudo-random rotation derived from a stable seed (the
 * item's id/title) — same item always gets the same tilt, so the collage
 * doesn't jitter on every re-render the way Math.random() would.
 */
function hashRotation(seed, min = -8, max = 8) {
  const str = String(seed)
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 100000
  }
  const t = (hash % 1000) / 1000
  return min + t * (max - min)
}

function CollageCard({
  id,
  imageUrl,
  title,
  footer,
  className = '',
  onClick,
  selected = false,
  flat = false,
  compact = false,
}) {
  const rotation = useMemo(() => (flat ? 0 : hashRotation(id ?? title ?? 'dresso')), [id, title, flat])

  const classNames = [
    styles.card,
    onClick ? styles.clickable : '',
    selected ? styles.selected : '',
    compact ? styles.compact : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classNames}
      style={{ '--rotation': `${rotation.toFixed(2)}deg` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.photo}>
        <SafeImg
          src={imageUrl}
          alt={title || ''}
          className={styles.image}
          loading="lazy"
          fallback={
            <div className={styles.placeholder} aria-hidden="true">
              {(title || '?').slice(0, 1)}
            </div>
          }
        />
      </div>
      {(title || footer) && (
        <div className={styles.caption}>
          {title && <p className={styles.title}>{title}</p>}
          {footer}
        </div>
      )}
    </div>
  )
}

export default CollageCard
