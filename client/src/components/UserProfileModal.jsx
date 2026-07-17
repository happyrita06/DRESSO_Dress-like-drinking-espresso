import { useEffect, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import SafeImg from './SafeImg'
import { fetchUserProfile, toggleFollow } from '../utils/usersApi'
import { fetchPosts } from '../utils/postsApi'
import { useAuth } from '../hooks/useAuth'
import styles from './UserProfileModal.module.css'

function UserProfileModal({ userId, onClose }) {
  const { token, user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFollowBusy, setIsFollowBusy] = useState(false)

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    setIsLoading(true)
    setError('')
    setProfile(null)

    Promise.all([fetchUserProfile({ token, userId }), fetchPosts({ token, author: userId, limit: 4 })])
      .then(([profileData, postsData]) => {
        if (cancelled) return
        setProfile(profileData)
        setPosts(postsData)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, token])

  const handleFollow = async () => {
    if (!profile) return
    setIsFollowBusy(true)
    try {
      const result = await toggleFollow({ token, userId })
      setProfile((prev) => ({
        ...prev,
        isFollowedByMe: result.following,
        followersCount: prev.followersCount + (result.following ? 1 : -1),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsFollowBusy(false)
    }
  }

  const isMe = user?._id === userId

  return (
    <Modal isOpen={Boolean(userId)} onClose={onClose} contentClassName={styles.modalContent}>
      {isLoading && <p className={styles.status}>불러오는 중...</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {profile && (
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div className={styles.avatar}>
              {profile.profileImage ? (
                <img src={profile.profileImage} alt="" className={styles.avatarImage} />
              ) : (
                profile.nickname.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className={styles.identity}>
              <h2 className={styles.nickname}>{profile.nickname}</h2>
              <div className={styles.counts}>
                <span>
                  <strong>{profile.followersCount}</strong> 팔로워
                </span>
                <span>
                  <strong>{profile.followingCount}</strong> 팔로잉
                </span>
              </div>
            </div>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>

          {profile.preferredStyles?.length > 0 && (
            <div className={styles.styleTags}>
              {profile.preferredStyles.map((tag) => (
                <span key={tag} className={styles.styleTag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {!isMe && (
            <Button
              type="button"
              variant={profile.isFollowedByMe ? 'secondary' : 'primary'}
              onClick={handleFollow}
              isLoading={isFollowBusy}
              fullWidth
            >
              {profile.isFollowedByMe ? '팔로잉' : '팔로우'}
            </Button>
          )}

          {posts.length > 0 && (
            <div className={styles.postsPreview}>
              {posts.map((post) => (
                <div key={post._id} className={styles.postThumb}>
                  <SafeImg src={post.imageUrl} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default UserProfileModal
