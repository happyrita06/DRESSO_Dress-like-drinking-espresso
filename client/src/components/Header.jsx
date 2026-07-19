import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import styles from './Header.module.css'

const PRIMARY_LINKS = [
  { to: '/about', label: 'About app' },
  { to: '/wardrobe', label: 'My wardrobe' },
  { to: '/recommend', label: 'Outfit recommendation' },
  { to: '/dressup', label: 'Dress Up' },
  { to: '/share-fits', label: 'Share my fits' },
  { to: '/calendar', label: '캘린더' },
  { to: '/community', label: '커뮤니티' },
]

const SECONDARY_LINKS = [
  { to: '/contact', label: '문의하기' },
  { to: '/business', label: '비즈니스 제안하기' },
]

function Header() {
  const { user } = useUser()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [scrollDir, setScrollDir] = useState('up')
  const [menuOpen, setMenuOpen] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    lastScrollY.current = window.scrollY
    function handleScroll() {
      const y = window.scrollY
      setScrolled(y > 4)
      setScrollDir(y > lastScrollY.current ? 'down' : 'up')
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const primaryLinkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`

  const secondaryLinkClass = ({ isActive }) =>
    `${styles.secondaryLink} ${isActive ? styles.secondaryLinkActive : ''}`

  const initial = user?.nickname ? user.nickname.trim().slice(0, 1).toUpperCase() : '?'

  const headerClassName = [
    styles.header,
    scrolled ? styles.scrolled : '',
    scrolled && scrollDir === 'down' ? styles.shadowStrong : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
    {/* Hidden SVG filter (0x0, never painted itself) that the logo's CSS
        `filter: url(#logoRoughEdge)` references — feTurbulence generates
        per-pixel noise, feDisplacementMap uses it to push each pixel of
        the text off its true position, which roughens the glyph outlines
        into a spray-stencil-style fray instead of the font's clean vector
        curves. scale=4.5 (up from an earlier, subtler 2.6) matches the
        heavier, more "bled" edge in the spray/smudge reference this was
        redone from. Needs to be a real DOM node (not just CSS), and
        Firefox requires it in the same document as whatever references
        it. */}
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="logoRoughEdge" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
    <header className={headerClassName}>
      <div className={styles.bar}>
        <Link to="/" className={styles.logo} aria-label="Dresso 홈으로 이동">
          Dresso
        </Link>

        <nav className={styles.desktopNav} aria-label="주요 메뉴">
          <ul className={styles.primaryList}>
            {PRIMARY_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={primaryLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <span className={styles.navDivider} aria-hidden="true" />
          <ul className={styles.secondaryList}>
            {SECONDARY_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={secondaryLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.authArea}>
          {user ? (
            <Link
              to="/account"
              className={styles.profileBadge}
              aria-label={`${user.nickname || '내'} 프로필`}
            >
              {user.profileImage ? (
                <img src={user.profileImage} alt="" className={styles.profileBadgeImage} />
              ) : (
                initial
              )}
            </Link>
          ) : (
            <>
              <Link to="/login" className={styles.authLink}>
                로그인
              </Link>
              <Link to="/register" className={styles.authCta}>
                회원가입
              </Link>
            </>
          )}

          <button
            type="button"
            className={styles.hamburger}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-overlay"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={`${styles.hamburgerBox} ${menuOpen ? styles.hamburgerBoxOpen : ''}`}>
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </span>
          </button>
        </div>
      </div>
    </header>

    {createPortal(
      <div
        id="mobile-nav-overlay"
        className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="모바일 메뉴">
          <ul className={styles.overlayPrimaryList}>
            {PRIMARY_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={primaryLinkClass} tabIndex={menuOpen ? 0 : -1}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <span className="washiDivider" aria-hidden="true" />

          <ul className={styles.overlaySecondaryList}>
            {SECONDARY_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={secondaryLinkClass} tabIndex={menuOpen ? 0 : -1}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className={styles.overlayAuth}>
            {user ? (
              <Link
                to="/account"
                className={styles.profileBadgeLarge}
                tabIndex={menuOpen ? 0 : -1}
              >
                {user.profileImage ? (
                  <img src={user.profileImage} alt="" className={styles.profileBadgeImage} />
                ) : (
                  initial
                )}
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.authLink} tabIndex={menuOpen ? 0 : -1}>
                  로그인
                </Link>
                <Link to="/register" className={styles.authCta} tabIndex={menuOpen ? 0 : -1}>
                  회원가입
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>,
      document.body
    )}
    </>
  )
}

export default Header
