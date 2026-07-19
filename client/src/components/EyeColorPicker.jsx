import { EYE_COLORS } from '../data/dollLayout'
import styles from './EyeColorPicker.module.css'

/**
 * Horizontally-scrolling picker for the doll's eye color. There's no
 * per-color face illustration, so this just records a choice — DollCanvas
 * renders it as a small tinted overlay on the face's eye positions.
 */
function EyeColorPicker({ value, onChange }) {
  return (
    <div className={styles.scroller} role="radiogroup" aria-label="눈동자 색 선택">
      {EYE_COLORS.map((color) => {
        const isSelected = value === color.value
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
            onClick={() => onChange(color.value)}
          >
            <span className={styles.swatch} style={{ backgroundColor: color.hex }} aria-hidden="true" />
            <span className={styles.label}>{color.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default EyeColorPicker
