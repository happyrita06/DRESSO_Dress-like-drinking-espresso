import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import PostCard from '../components/PostCard'
import UserProfileModal from '../components/UserProfileModal'
import { useAuth } from '../hooks/useAuth'
import { fetchPosts } from '../utils/postsApi'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './Community.module.css'

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
]

const SCOPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'following', label: '팔로잉만' },
  { value: 'mine', label: '내가 쓴 글' },
]

function Community() {
  const { token, user, isAuthenticated } = useAuth()
  const [sort, setSort] = useState('latest')
  const [scope, setScope] = useState('all')
  const [posts, setPosts] = useState([])
  const [bestPosts, setBestPosts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeProfileId, setActiveProfileId] = useState(null)

  const handlePostDeleted = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId))
    setBestPosts((prev) => prev.filter((p) => p._id !== postId))
  }, [])

  const handlePostUpdated = useCallback((updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)))
    setBestPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)))
  }, [])

  const pageRef = useRef(null)
  const introRef = useRef(null)
  const bestRef = useRef(null)
  const feedRef = useRef(null)

  const loadFeed = useCallback(async () => {
    if (!token) return
    if (scope === 'mine' && !user?._id) return
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchPosts({
        token,
        sort,
        following: scope === 'following',
        author: scope === 'mine' ? user._id : undefined,
      })
      setPosts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token, sort, scope, user?._id])

  const loadBest = useCallback(async () => {
    if (!token) return
    try {
      const data = await fetchPosts({ token, sort: 'popular', limit: 3 })
      setBestPosts(data)
    } catch {
      // best-of is a nice-to-have — a failure here shouldn't block the main feed
    }
  }, [token])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  useEffect(() => {
    loadBest()
  }, [loadBest])

  useEffect(() => {
    if (prefersReducedMotion() || !introRef.current) return undefined
    const ctx = gsap.context(() => {
      revealFrom(introRef.current.children, {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
      })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!bestPosts.length || !bestRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      const cards = bestRef.current.querySelectorAll(`.${styles.bestGrid} > *`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: { trigger: bestRef.current, start: 'top 85%', once: true },
      })
    }, bestRef)
    return () => ctx.revert()
  }, [bestPosts])

  useEffect(() => {
    if (!posts.length || !feedRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      const cards = feedRef.current.querySelectorAll(`.${styles.feedGrid} > *`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.06,
        scrollTrigger: { trigger: feedRef.current, start: 'top 88%', once: true },
      })
    }, feedRef)
    return () => ctx.revert()
  }, [posts])

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <p className={styles.authGate}>
          커뮤니티는 로그인 후 이용할 수 있어요.{' '}
          <Link to="/login" className={styles.authLink}>
            로그인하러 가기
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.intro} ref={introRef}>
        <p className={styles.eyebrow}>Community</p>
        <h1 className={styles.title}>커뮤니티</h1>
        <p className={styles.lede}>다른 사람들의 코디를 구경하고, 마음에 들면 좋아요와 댓글을 남겨보세요.</p>
      </header>

      {bestPosts.length > 0 && (
        <section className={styles.bestSection} ref={bestRef}>
          <span className="washiDivider" aria-hidden="true" />
          <h2 className={styles.sectionTitle}>베스트 코디</h2>
          <div className={styles.bestGrid}>
            {bestPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onOpenProfile={setActiveProfileId}
                onDeleted={handlePostDeleted}
                onUpdated={handlePostUpdated}
              />
            ))}
          </div>
        </section>
      )}

      <section className={styles.feedSection} ref={feedRef}>
        <div className={styles.controls}>
          <div className={styles.segment} role="tablist" aria-label="정렬">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={sort === opt.value}
                className={`${styles.segmentButton} ${sort === opt.value ? styles.segmentButtonActive : ''}`}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className={styles.segment} role="tablist" aria-label="피드 범위">
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={scope === opt.value}
                className={`${styles.segmentButton} ${scope === opt.value ? styles.segmentButtonActive : ''}`}
                onClick={() => setScope(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {isLoading && <p className={styles.status}>불러오는 중...</p>}
        {!isLoading && posts.length === 0 && (
          <p className={styles.status}>
            {scope === 'following'
              ? '팔로잉한 사용자의 게시물이 아직 없어요.'
              : scope === 'mine'
                ? '아직 커뮤니티에 올린 글이 없어요.'
                : '아직 게시물이 없어요.'}
          </p>
        )}

        <div className={styles.feedGrid}>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onOpenProfile={setActiveProfileId}
              onDeleted={handlePostDeleted}
              onUpdated={handlePostUpdated}
            />
          ))}
        </div>
      </section>

      {activeProfileId && (
        <UserProfileModal userId={activeProfileId} onClose={() => setActiveProfileId(null)} />
      )}
    </div>
  )
}

export default Community
