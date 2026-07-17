import { useStyle } from '../contexts/StyleContext'
import styles from './GenderSelector.module.css'

const OPTIONS = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'all', label: '전체' },
]

function GenderSelector({ className = '' }) {
  const { gender, setGender } = useStyle()

  return (
    <div className={`${styles.group} ${className}`} role="radiogroup" aria-label="성별 선택">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={gender === option.value}
          className={`${styles.option} ${gender === option.value ? styles.optionSelected : ''}`}
          onClick={() => setGender(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default GenderSelector
