import { HAIR_STYLES } from '../data/dollLayout'
import styles from './HairPicker.module.css'

// Same glob-import convention as DollCanvas — see client/src/assets/
// dollsprites/hair/hair-{gender}-{style}.png.
const hairModules = import.meta.glob('../assets/dollsprites/hair/hair-*.png', {
  eager: true,
  import: 'default',
})

const HAIR_THUMBS = {}
for (const [path, src] of Object.entries(hairModules)) {
  const match = /hair-(f|m)-([a-z-]+)\.png$/.exec(path)
  if (!match) continue
  const [, gender, style] = match
  HAIR_THUMBS[gender] ??= {}
  HAIR_THUMBS[gender][style] = src
}

/**
 * Horizontally-scrolling picker for the doll's hairstyle (a "wig" cutout —
 * see client/src/assets/dollsprites/hair/) for the currently selected
 * gender. Includes a "없음" (none/bald) option since hair is optional.
 */
function HairPicker({ gender, value, onChange }) {
  const styleList = HAIR_STYLES[gender] || HAIR_STYLES.f
  const thumbs = HAIR_THUMBS[gender] || HAIR_THUMBS.f

  return (
    <div className={styles.scroller} role="radiogroup" aria-label="헤어스타일 선택">
      <button
        type="button"
        role="radio"
        aria-checked={value === ''}
        className={`${styles.item} ${value === '' ? styles.itemSelected : ''}`}
        onClick={() => onChange('')}
      >
        <span className={styles.thumbWrap}>
          <span className={styles.noneLabel} aria-hidden="true">
            없음
          </span>
        </span>
        <span className={styles.label}>없음</span>
      </button>

      {styleList.map((style) => {
        const isSelected = value === style.value
        const thumb = thumbs[style.value]
        return (
          <button
            key={style.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
            onClick={() => onChange(style.value)}
          >
            <span className={styles.thumbWrap}>
              {thumb && <img src={thumb} alt="" aria-hidden="true" className={styles.thumb} />}
            </span>
            <span className={styles.label}>{style.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default HairPicker
