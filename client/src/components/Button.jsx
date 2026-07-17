import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

let rippleId = 0

function Button({
  children,
  onClick,
  to,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  className = '',
  ...rest
}) {
  const [ripples, setRipples] = useState([])
  const elRef = useRef(null)

  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Click micro-interaction: a pixel-square burst expanding from the
  // pointer position, matching the app's hard-edge sticker aesthetic
  // rather than a soft material-design circle. Purely decorative
  // (aria-hidden), self-removes after its animation via onAnimationEnd.
  const spawnRipple = (event) => {
    const el = elRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clientX = event.clientX ?? rect.left + rect.width / 2
    const clientY = event.clientY ?? rect.top + rect.height / 2
    const size = Math.max(rect.width, rect.height) * 1.6
    const id = rippleId++
    setRipples((current) => [
      ...current,
      { id, x: clientX - rect.left, y: clientY - rect.top, size },
    ])
  }

  const removeRipple = (id) => {
    setRipples((current) => current.filter((r) => r.id !== id))
  }

  const handleClick = (event) => {
    if (!disabled && !isLoading) spawnRipple(event)
    onClick?.(event)
  }

  const rippleLayer = ripples.map((r) => (
    <span
      key={r.id}
      className={styles.ripple}
      aria-hidden="true"
      style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
      onAnimationEnd={() => removeRipple(r.id)}
    />
  ))

  // Navigation action (e.g. a CTA that sends the user to another page) —
  // render a real <Link> so it stays a proper anchor, styled like a button.
  if (to) {
    return (
      <Link ref={elRef} to={to} className={classNames} onClick={handleClick} {...rest}>
        {children}
        {rippleLayer}
      </Link>
    )
  }

  return (
    <button
      ref={elRef}
      type={type}
      className={classNames}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? '처리 중...' : children}
      {rippleLayer}
    </button>
  )
}

export default Button
