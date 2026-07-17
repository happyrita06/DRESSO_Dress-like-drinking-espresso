import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import Button from '../components/Button'
import CollageCard from '../components/CollageCard'
import LinkImportForm from '../components/LinkImportForm'
import WardrobeDoorIntro from '../components/WardrobeDoorIntro'
import MatchFromWardrobe from '../components/MatchFromWardrobe'
import { WARDROBE_CATEGORIES } from '../data/wardrobeCategories'
import { useAuth } from '../hooks/useAuth'
import { fetchWardrobeItems, deleteWardrobeItem } from '../utils/wardrobeApi'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './MyWardrobe.module.css'

const TABS = [{ value: 'all', label: '전체' }, ...WARDROBE_CATEGORIES]

function MyWardrobe() {
  const { token, isAuthenticated } = useAuth()
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showImportForm, setShowImportForm] = useState(false)
  const [showMatch, setShowMatch] = useState(false)

  const gridRef = useRef(null)

  const loadItems = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchWardrobeItems({ token })
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleSaved = (item) => {
    setItems((prev) => [item, ...prev])
    setShowImportForm(false)
  }

  const handleDelete = async (id) => {
    try {
      await deleteWardrobeItem({ token, id })
      setItems((prev) => prev.filter((item) => item._id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const visibleItems =
    activeTab === 'all' ? items : items.filter((item) => item.category === activeTab)

  useEffect(() => {
    if (!visibleItems.length || !gridRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      const cards = gridRef.current.querySelectorAll(`.${styles.gridCard}`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.05,
        scrollTrigger: { trigger: gridRef.current, start: 'top 88%', once: true },
      })
    }, gridRef)
    return () => ctx.revert()
    // visibleItems is derived fresh each render; items+activeTab are the real,
    // stable inputs that should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeTab])

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <p className={styles.authGate}>
          나의 옷장은 로그인 후 이용할 수 있어요.{' '}
          <Link to="/login" className={styles.authLink}>
            로그인하러 가기
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <WardrobeDoorIntro className={styles.doorIntro} />

      <header className={styles.header}>
        <p className={styles.eyebrow}>My wardrobe</p>
        <h1 className={styles.title}>나의 옷장</h1>
        <p className={styles.lede}>가진 옷을 모아두고, 콜라주 다이어리처럼 훑어보세요.</p>
      </header>

      <div className={styles.actions}>
        <Button type="button" onClick={() => setShowImportForm((v) => !v)}>
          {showImportForm ? '닫기' : '+ 새 아이템 추가'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowMatch(true)}
          disabled={items.length === 0}
        >
          나의 옷장에서 매치하기
        </Button>
      </div>

      {showImportForm && (
        <div className={styles.importPanel}>
          <LinkImportForm onSaved={handleSaved} />
        </div>
      )}

      <div className={styles.tabs} role="tablist" aria-label="카테고리 필터">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`${styles.tab} ${activeTab === tab.value ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {isLoading && <p className={styles.status}>불러오는 중...</p>}

      {!isLoading && visibleItems.length === 0 && (
        <p className={styles.empty}>
          {activeTab === 'all'
            ? '아직 등록된 옷이 없어요. 위 버튼으로 링크를 붙여넣어 추가해보세요.'
            : '이 카테고리에는 아직 아이템이 없어요.'}
        </p>
      )}

      <div className={styles.grid} ref={gridRef}>
        {visibleItems.map((item) => (
          <CollageCard
            key={item._id}
            id={item._id}
            imageUrl={item.imageUrl}
            title={item.name}
            className={styles.gridCard}
            footer={
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(item._id)}
              >
                삭제
              </button>
            }
          />
        ))}
      </div>

      {showMatch && <MatchFromWardrobe items={items} onClose={() => setShowMatch(false)} />}
    </div>
  )
}

export default MyWardrobe
