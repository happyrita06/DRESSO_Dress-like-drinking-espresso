import { EXPRESSIONS } from '../data/dollLayout'
import styles from './ExpressionPicker.module.css'

// Same glob-import convention as DollCanvas — see client/src/assets/
// dollsprites/faces/face-{gender}-{expression}-{eyeColor}.png.
const faceModules = import.meta.glob('../assets/dollsprites/faces/face-*.png', {
  eager: true,
  import: 'default',
})

const FACE_THUMBS = {}
for (const [path, src] of Object.entries(faceModules)) {
  const match = /face-(f|m)-([a-z]+)-([a-z]+)\.png$/.exec(path)
  if (!match) continue
  const [, gender, expression, eyeColor] = match
  FACE_THUMBS[gender] ??= {}
  FACE_THUMBS[gender][expression] ??= {}
  FACE_THUMBS[gender][expression][eyeColor] = src
}

/**
 * Horizontally-scrolling picker for the doll's facial expression. Shows the
 * cropped face illustration (client/src/assets/dollsprites/faces/) for the
 * currently selected gender and eye color, so the thumbnail always matches
 * what DollCanvas is about to render.
 */
function ExpressionPicker({ gender, eyeColor, value, onChange }) {
  const thumbsByExpr = FACE_THUMBS[gender] || FACE_THUMBS.f

  return (
    <div className={styles.scroller} role="radiogroup" aria-label="표정 선택">
      {EXPRESSIONS.map((expr) => {
        const isSelected = value === expr.value
        const thumb = thumbsByExpr[expr.value]?.[eyeColor]
        return (
          <button
            key={expr.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
            onClick={() => onChange(expr.value)}
          >
            <span className={styles.thumbWrap}>
              {thumb && <img src={thumb} alt="" aria-hidden="true" className={styles.thumb} />}
            </span>
            <span className={styles.label}>{expr.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ExpressionPicker
