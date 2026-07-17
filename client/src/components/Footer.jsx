import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

const FOOTER_LINKS = [
  { to: '/about', label: 'About app' },
  { to: '/contact', label: '문의하기' },
  { to: '/business', label: '비즈니스 제안하기' },
]

const SOCIAL_PLACEHOLDERS = ['IG', 'X', 'YT']

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <span className={styles.washiTop} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            Dresso
          </Link>
          <p className={styles.tagline}>오늘 날씨에 맞는 코디, 매일 아침 고민 끝.</p>
        </div>

        <nav className={styles.links} aria-label="바로가기">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.social} aria-label="소셜 미디어 (준비중)">
          {SOCIAL_PLACEHOLDERS.map((label) => (
            <span key={label} className={styles.socialIcon} aria-hidden="true">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copyright}>&copy; {year} Dresso. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
