import { useState } from 'react'
import { toggleLike, fetchComments, addComment, updatePost, deletePost } from '../utils/postsApi'
import { useAuth } from '../hooks/useAuth'
import StyleTagPicker from './StyleTagPicker'
import SafeImg from './SafeImg'
import styles from './PostCard.module.css'

function PostCard({ post, onOpenProfile, onDeleted, onUpdated }) {
  const { token, user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(null)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)

  const isOwner = Boolean(user?._id) && post.user?._id === user._id

  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState(post.description || '')
  const [editWeatherTag, setEditWeatherTag] = useState(post.weatherTag || '')
  const [editStyleTags, setEditStyleTags] = useState(post.styleTags || [])
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const toggleEditStyleTag = (tag) => {
    setEditStyleTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const startEdit = () => {
    setEditDescription(post.description || '')
    setEditWeatherTag(post.weatherTag || '')
    setEditStyleTags(post.styleTags || [])
    setEditError('')
    setIsEditing(true)
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()
    if (!editDescription.trim()) {
      setEditError('코디 설명을 입력해주세요.')
      return
    }
    setIsSavingEdit(true)
    setEditError('')
    try {
      const updated = await updatePost({
        token,
        id: post._id,
        description: editDescription.trim(),
        weatherTag: editWeatherTag,
        styleTags: editStyleTags,
      })
      setIsEditing(false)
      onUpdated?.(updated)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deletePost({ token, id: post._id })
      onDeleted?.(post._id)
    } catch (err) {
      setDeleteError(err.message)
      setIsDeleting(false)
    }
  }

  const handleLike = async () => {
    const previousLiked = liked
    const previousCount = likesCount
    setLiked(!previousLiked)
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1)
    try {
      const result = await toggleLike({ token, postId: post._id })
      setLiked(result.liked)
      setLikesCount(result.likesCount)
    } catch {
      setLiked(previousLiked)
      setLikesCount(previousCount)
    }
  }

  const handleToggleComments = async () => {
    if (comments !== null) {
      setShowComments((v) => !v)
      return
    }
    setIsLoadingComments(true)
    try {
      const data = await fetchComments({ token, postId: post._id })
      setComments(data)
      setShowComments(true)
    } catch {
      setComments([])
      setShowComments(true)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleAddComment = async (event) => {
    event.preventDefault()
    const text = commentText.trim()
    if (!text) return

    setIsCommenting(true)
    try {
      const newComment = await addComment({ token, postId: post._id, text })
      setComments((prev) => [...(prev || []), newComment])
      setCommentsCount((prev) => prev + 1)
      setCommentText('')
    } catch {
      // leave the draft text in place so the user can retry
    } finally {
      setIsCommenting(false)
    }
  }

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.author}
        onClick={() => onOpenProfile?.(post.user?._id)}
      >
        {post.user?.nickname || '알 수 없는 사용자'}
      </button>

      {post.imageUrl && (
        <div className={styles.imageWrap}>
          <SafeImg src={post.imageUrl} alt="" className={styles.image} />
        </div>
      )}

      {isEditing ? (
        <form className={styles.editForm} onSubmit={handleSaveEdit}>
          <textarea
            className={styles.editTextarea}
            rows={3}
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
          />
          <input
            className={styles.editWeatherInput}
            value={editWeatherTag}
            onChange={(event) => setEditWeatherTag(event.target.value)}
            placeholder="날씨 태그 (선택)"
          />
          <StyleTagPicker selected={editStyleTags} onToggle={toggleEditStyleTag} />
          {editError && (
            <p className={styles.error} role="alert">
              {editError}
            </p>
          )}
          <div className={styles.editActions}>
            <button type="submit" className={styles.saveButton} disabled={isSavingEdit}>
              {isSavingEdit ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className={styles.description}>{post.description}</p>

          {(post.weatherTag || post.styleTags?.length > 0) && (
            <div className={styles.tags}>
              {post.weatherTag && <span className={styles.weatherTag}>{post.weatherTag}</span>}
              {post.styleTags?.map((tag) => (
                <span key={tag} className={styles.styleTag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {isOwner && !isEditing && (
        <div className={styles.ownerActions}>
          <button type="button" className={styles.editButton} onClick={startEdit}>
            수정
          </button>
          {confirmDelete ? (
            <>
              <span className={styles.confirmText}>정말 삭제할까요?</span>
              <button
                type="button"
                className={styles.deleteConfirmButton}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                취소
              </button>
            </>
          ) : (
            <button type="button" className={styles.deleteButton} onClick={() => setConfirmDelete(true)}>
              삭제
            </button>
          )}
          {deleteError && (
            <span className={styles.error} role="alert">
              {deleteError}
            </span>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${liked ? styles.liked : ''}`}
          onClick={handleLike}
        >
          좋아요 {likesCount}
        </button>
        <button type="button" className={styles.actionButton} onClick={handleToggleComments}>
          댓글 {commentsCount} {showComments ? '접기' : '보기'}
        </button>
      </div>

      {showComments && (
        <div className={styles.commentsBox}>
          {isLoadingComments && <p className={styles.commentStatus}>불러오는 중...</p>}
          {!isLoadingComments && comments?.length === 0 && (
            <p className={styles.commentStatus}>아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>
          )}
          {comments?.map((comment) => (
            <p key={comment._id} className={styles.comment}>
              <strong>{comment.user?.nickname}</strong> {comment.text}
            </p>
          ))}

          <form className={styles.commentForm} onSubmit={handleAddComment}>
            <input
              className={styles.commentInput}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="댓글을 남겨보세요"
              maxLength={300}
            />
            <button
              type="submit"
              className={styles.commentSubmit}
              disabled={isCommenting || !commentText.trim()}
            >
              등록
            </button>
          </form>
        </div>
      )}
    </article>
  )
}

export default PostCard
