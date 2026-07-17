import StyleTagPicker from './StyleTagPicker'
import { useStyle } from '../contexts/StyleContext'
import styles from './StyleSelector.module.css'

function StyleSelector({ className = '' }) {
  const { preferredStyles, setPreferredStyles } = useStyle()

  const toggleStyle = (style) => {
    setPreferredStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    )
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <StyleTagPicker selected={preferredStyles} onToggle={toggleStyle} />
      <p className={styles.hint}>
        {preferredStyles.length > 0
          ? `${preferredStyles.length}개 선택됨`
          : '원하는 스타일을 자유롭게 골라보세요 (여러 개 선택 가능)'}
      </p>
    </div>
  )
}

export default StyleSelector
