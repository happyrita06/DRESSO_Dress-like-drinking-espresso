import styles from './Card.module.css'

function Card({ children, accent = 'pink', tilt = 'none', className = '', ...rest }) {
  const classNames = [styles.card, styles[`accent-${accent}`], styles[`tilt-${tilt}`], className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  )
}

export default Card
