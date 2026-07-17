import { STYLE_CATEGORIES } from '../data/styleCategories'
import styles from './StyleSelector.module.css'

/**
 * Presentational multi-select chip grid for the 20 style categories.
 * StyleSelector wraps this with global StyleContext; ShareFits uses it
 * directly with local per-post state — same look, different data source.
 */
function StyleTagPicker({ selected, onToggle, className = '' }) {
  return (
    <div className={`${styles.chips} ${className}`} role="group" aria-label="스타일 태그 선택">
      {STYLE_CATEGORIES.map((style) => {
        const isSelected = selected.includes(style)
        return (
          <button
            key={style}
            type="button"
            className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
            aria-pressed={isSelected}
            onClick={() => onToggle(style)}
          >
            {style}
          </button>
        )
      })}
    </div>
  )
}

export default StyleTagPicker
