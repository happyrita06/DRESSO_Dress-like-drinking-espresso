import { useMemo, useState } from 'react'
import Modal from './Modal'
import CollageCard from './CollageCard'
import Button from './Button'
import { WARDROBE_CATEGORIES } from '../data/wardrobeCategories'
import { saveOutfitCombo } from '../utils/combosApi'
import { useAuth } from '../hooks/useAuth'
import styles from './MatchFromWardrobe.module.css'

function MatchFromWardrobe({ items, onClose }) {
  const { token } = useAuth()
  const [selection, setSelection] = useState({})
  const [comboName, setComboName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const itemsByCategory = useMemo(() => {
    const map = {}
    WARDROBE_CATEGORIES.forEach((cat) => {
      map[cat.value] = []
    })
    items.forEach((item) => {
      if (map[item.category]) map[item.category].push(item)
    })
    return map
  }, [items])

  const selectedList = WARDROBE_CATEGORIES.map((cat) => selection[cat.value]).filter(Boolean)

  const toggleSelect = (category, item) => {
    setSaved(false)
    setSelection((prev) => ({
      ...prev,
      [category]: prev[category]?._id === item._id ? null : item,
    }))
  }

  const handleSave = async () => {
    if (selectedList.length === 0) return
    if (!comboName.trim()) {
      setError('코디 이름을 입력해주세요.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await saveOutfitCombo({
        token,
        name: comboName.trim(),
        items: selectedList.map((item) => ({
          category: item.category,
          name: item.name,
          imageUrl: item.imageUrl,
          wardrobeItem: item._id,
        })),
      })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} contentClassName={styles.modalContent}>
      <div className={styles.wrapper}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>나의 옷장에서 매치하기</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className={styles.board}>
          {selectedList.length === 0 ? (
            <p className={styles.boardEmpty}>카테고리별로 아이템을 하나씩 골라 조합을 만들어보세요.</p>
          ) : (
            selectedList.map((item) => (
              <CollageCard
                key={item._id}
                id={item._id}
                imageUrl={item.imageUrl}
                title={item.name}
                className={styles.boardCard}
                flat
              />
            ))
          )}
        </div>

        {WARDROBE_CATEGORIES.map((cat) => (
          <div key={cat.value} className={styles.categoryRow}>
            <p className={styles.categoryLabel}>{cat.label}</p>
            {itemsByCategory[cat.value].length === 0 ? (
              <p className={styles.categoryEmpty}>등록된 {cat.label} 아이템이 없어요.</p>
            ) : (
              <div className={styles.itemScroll}>
                {itemsByCategory[cat.value].map((item) => (
                  <CollageCard
                    key={item._id}
                    id={item._id}
                    imageUrl={item.imageUrl}
                    title={item.name}
                    className={styles.pickCard}
                    selected={selection[cat.value]?._id === item._id}
                    onClick={() => toggleSelect(cat.value, item)}
                    flat
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        <div className={styles.nameField}>
          <label className={styles.categoryLabel} htmlFor="combo-name">
            코디 이름
          </label>
          <input
            id="combo-name"
            className={styles.nameInput}
            value={comboName}
            onChange={(event) => {
              setComboName(event.target.value)
              setSaved(false)
            }}
            placeholder="예: 데이트룩"
            maxLength={40}
          />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {saved && <p className={styles.saved}>이 조합을 저장했어요!</p>}

        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={selectedList.length === 0}
          fullWidth
        >
          이 조합 저장하기
        </Button>
      </div>
    </Modal>
  )
}

export default MatchFromWardrobe
