import styles from './FloatingClothesCollage.module.css'

// User-supplied fixed photos (not live-searched) — swap the files in
// client/public/about/ and this list to change what shows here.
const PHOTOS = [
  { src: '/about/fur-hood-jacket.jpg', alt: '퍼 후드 크롭 재킷 코디' },
  { src: '/about/star-buckle-boots.jpg', alt: '스타 버클 컴뱃 부츠' },
  { src: '/about/red-layered-belts.jpg', alt: '레드 레이어드 벨트' },
  { src: '/about/vegas-halter-top.jpg', alt: '베가스 그래픽 홀터 탑' },
  { src: '/about/plaid-wide-denim.jpg', alt: '체크 레이어드 와이드 데님' },
]

// Scattered, overlapping "moodboard" positions — deliberately not a grid.
const LAYOUT = [
  { top: '0%', left: '6%', width: '30%' },
  { top: '2%', left: '62%', width: '26%' },
  { top: '18%', left: '32%', width: '28%' },
  { top: '42%', left: '58%', width: '32%' },
  { top: '48%', left: '18%', width: '30%' },
]

/**
 * A scattered moodboard of fixed, hand-picked outfit photos that idly
 * wiggle in place — sits next to the About page's intro copy. Plain
 * cropped tiles (no distorted clip-path shapes), like photos pinned to a
 * corkboard. Purely decorative.
 */
function FloatingClothesCollage({ className = '' }) {
  return (
    <div className={`${styles.board} ${className}`} aria-hidden="true">
      {PHOTOS.map((photo, index) => {
        const layout = LAYOUT[index % LAYOUT.length]
        return (
          <div
            key={photo.src}
            className={styles.tile}
            style={{ '--delay': `${index * 0.3}s`, top: layout.top, left: layout.left, width: layout.width }}
          >
            <div className={styles.paper}>
              <img src={photo.src} alt={photo.alt} className={styles.photo} loading="lazy" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FloatingClothesCollage
