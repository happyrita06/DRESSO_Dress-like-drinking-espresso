import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import StyleTagPicker from '../components/StyleTagPicker'
import { useAuth } from '../hooks/useAuth'
import { updateMyProfile } from '../utils/usersApi'
import styles from './Account.module.css'

const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024 // stored as a base64 data URL, so keep it small

const GENDERS = [
  { value: 'prefer_not_to_say', label: '선택 안 함' },
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'other', label: '기타' },
]

function Account() {
  const { user, setUser, token, isAuthenticated, isRestoringUser } = useAuth()

  const [nickname, setNickname] = useState(user?.nickname || '')
  const [gender, setGender] = useState(user?.gender || 'prefer_not_to_say')
  const [preferredStyles, setPreferredStyles] = useState(user?.preferredStyles || [])
  const [profileImage, setProfileImage] = useState(user?.profileImage || null)

  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // On a fresh page load only the token survives (see UserContext) — `user`
  // resolves a beat later via GET /auth/me, after this component's initial
  // state already ran with `user` still null. Re-sync once it lands.
  useEffect(() => {
    if (!user) return
    setNickname(user.nickname || '')
    setGender(user.gender || 'prefer_not_to_say')
    setPreferredStyles(user.preferredStyles || [])
    setProfileImage(user.profileImage || null)
  }, [user])

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <p className={styles.authGate}>
          계정 설정은 로그인 후 이용할 수 있어요.{' '}
          <Link to="/login" className={styles.authLink}>
            로그인하러 가기
          </Link>
        </p>
      </div>
    )
  }

  if (isRestoringUser) {
    return (
      <div className={styles.page}>
        <p className={styles.authGate}>불러오는 중...</p>
      </div>
    )
  }

  const initial = nickname.trim().slice(0, 1).toUpperCase() || '?'

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('이미지 파일만 업로드할 수 있어요.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormError('이미지 용량이 너무 커요. 1.5MB 이하로 올려주세요.')
      return
    }
    setFormError('')
    const reader = new FileReader()
    reader.onload = () => setProfileImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setProfileImage(null)
  }

  const toggleStyleTag = (tag) => {
    setPreferredStyles((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setIsSaved(false)

    if (!nickname.trim()) {
      setFormError('닉네임을 입력해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const { user: updatedUser } = await updateMyProfile({
        token,
        nickname: nickname.trim(),
        gender,
        preferredStyles,
        profileImage,
      })
      setUser(updatedUser)
      setIsSaved(true)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>My account</p>
        <h1 className={styles.title}>계정 설정</h1>
        <p className={styles.lede}>프로필 사진과 개인 설정을 관리해보세요.</p>
      </header>

      <Card accent="lavender" className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.photoRow}>
            <div className={styles.avatar}>
              {profileImage ? (
                <img src={profileImage} alt="프로필 사진" className={styles.avatarImage} />
              ) : (
                <span aria-hidden="true">{initial}</span>
              )}
            </div>
            <div className={styles.photoActions}>
              <label className={styles.uploadLabel} htmlFor="account-photo-upload">
                사진 올리기
              </label>
              <input
                id="account-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className={styles.fileInput}
              />
              {profileImage && (
                <button type="button" className={styles.removePhoto} onClick={handleRemovePhoto}>
                  사진 삭제
                </button>
              )}
            </div>
          </div>

          <Input
            label="닉네임"
            id="account-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            required
          />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="account-gender">
              성별
            </label>
            <select
              id="account-gender"
              className={styles.select}
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            >
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>선호 스타일</label>
            <StyleTagPicker selected={preferredStyles} onToggle={toggleStyleTag} />
          </div>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          {isSaved && !formError && <p className={styles.savedMessage}>저장했어요.</p>}

          <Button type="submit" fullWidth size="lg" isLoading={isSaving}>
            저장하기
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default Account
