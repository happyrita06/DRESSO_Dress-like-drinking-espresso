import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import Card from '../components/Card'
import Button from '../components/Button'
import PostCard from '../components/PostCard'
import CollageCard from '../components/CollageCard'
import StyleTagPicker from '../components/StyleTagPicker'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from '../contexts/LocationContext'
import { useWeather } from '../hooks/useWeather'
import { fetchOutfitCombos, renameOutfitCombo, deleteOutfitCombo } from '../utils/combosApi'
import { fetchPosts, createPost } from '../utils/postsApi'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './ShareFits.module.css'

const TABS = [
  { value: 'write', label: '새 게시물 작성' },
  { value: 'mine', label: '내가 쓴 글' },
  { value: 'combos', label: '코디 모음' },
]

const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024 // stored as a base64 data URL, so keep it small

function ShareFits() {
  const { token, user, isAuthenticated } = useAuth()
  const { location } = useLocation()
  const { weather } = useWeather(location)

  const [activeTab, setActiveTab] = useState('write')

  const [source, setSource] = useState('combo')
  const [combos, setCombos] = useState([])
  const [isLoadingCombos, setIsLoadingCombos] = useState(false)
  const [selectedComboId, setSelectedComboId] = useState('')
  const [uploadPreview, setUploadPreview] = useState(null)
  const [comboThumbPreview, setComboThumbPreview] = useState(null)
  const [description, setDescription] = useState('')
  const [includeWeatherTag, setIncludeWeatherTag] = useState(false)
  const [styleTags, setStyleTags] = useState([])
  const [formError, setFormError] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [justPosted, setJustPosted] = useState(false)

  const [myPosts, setMyPosts] = useState([])
  const [isLoadingMine, setIsLoadingMine] = useState(false)
  const [mineError, setMineError] = useState('')

  const [renamingComboId, setRenamingComboId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [comboActionError, setComboActionError] = useState('')
  const [comboBusyId, setComboBusyId] = useState(null)
  const [confirmDeleteComboId, setConfirmDeleteComboId] = useState(null)

  const comboGridRef = useRef(null)
  const mineGridRef = useRef(null)
  const combosGridRef = useRef(null)

  const loadCombos = useCallback(async () => {
    if (!token) return
    setIsLoadingCombos(true)
    try {
      const data = await fetchOutfitCombos({ token })
      setCombos(data)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsLoadingCombos(false)
    }
  }, [token])

  useEffect(() => {
    loadCombos()
  }, [loadCombos])

  const loadMyPosts = useCallback(async () => {
    if (!token || !user?._id) return
    setIsLoadingMine(true)
    setMineError('')
    try {
      const data = await fetchPosts({ token, author: user._id, sort: 'latest' })
      setMyPosts(data)
    } catch (err) {
      setMineError(err.message)
    } finally {
      setIsLoadingMine(false)
    }
  }, [token, user?._id])

  useEffect(() => {
    if (activeTab === 'mine') loadMyPosts()
  }, [activeTab, loadMyPosts])

  const handleMyPostDeleted = useCallback((postId) => {
    setMyPosts((prev) => prev.filter((p) => p._id !== postId))
  }, [])

  const handleMyPostUpdated = useCallback((updatedPost) => {
    setMyPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)))
  }, [])

  const startRenameCombo = (combo) => {
    setRenamingComboId(combo._id)
    setRenameValue(combo.name || '')
    setComboActionError('')
  }

  const handleRenameCombo = async (comboId) => {
    if (!renameValue.trim()) {
      setComboActionError('코디 이름을 입력해주세요.')
      return
    }
    setComboBusyId(comboId)
    setComboActionError('')
    try {
      const updated = await renameOutfitCombo({ token, id: comboId, name: renameValue.trim() })
      setCombos((prev) => prev.map((c) => (c._id === comboId ? updated : c)))
      setRenamingComboId(null)
    } catch (err) {
      setComboActionError(err.message)
    } finally {
      setComboBusyId(null)
    }
  }

  const handleDeleteCombo = async (comboId) => {
    setComboBusyId(comboId)
    setComboActionError('')
    try {
      await deleteOutfitCombo({ token, id: comboId })
      setCombos((prev) => prev.filter((c) => c._id !== comboId))
      setConfirmDeleteComboId(null)
      if (selectedComboId === comboId) setSelectedComboId('')
    } catch (err) {
      setComboActionError(err.message)
    } finally {
      setComboBusyId(null)
    }
  }

  const readImageFile = (file, onLoaded) => {
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
    reader.onload = () => onLoaded({ imageUrl: reader.result })
    reader.readAsDataURL(file)
  }

  const handleFileChange = (event) => {
    readImageFile(event.target.files?.[0], setUploadPreview)
  }

  const handleComboThumbChange = (event) => {
    readImageFile(event.target.files?.[0], setComboThumbPreview)
  }

  const toggleStyleTag = (tag) => {
    setStyleTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const selectedCombo = combos.find((combo) => combo._id === selectedComboId)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setJustPosted(false)

    if (!description.trim()) {
      setFormError('코디 설명을 입력해주세요.')
      return
    }
    if (source === 'combo' && !selectedCombo) {
      setFormError('저장된 조합을 선택해주세요.')
      return
    }
    if (source === 'upload' && !uploadPreview) {
      setFormError('사진을 업로드해주세요.')
      return
    }

    setIsPosting(true)
    try {
      const payload =
        source === 'combo'
          ? {
              source: 'combo',
              outfitCombo: selectedCombo._id,
              items: selectedCombo.items,
              imageUrl: comboThumbPreview?.imageUrl || selectedCombo.items?.[0]?.imageUrl || null,
            }
          : {
              source: 'upload',
              imageUrl: uploadPreview.imageUrl,
              items: [],
            }

      await createPost({
        token,
        ...payload,
        description: description.trim(),
        weatherTag:
          includeWeatherTag && weather ? `${weather.label} · ${Math.round(weather.tmp)}°C` : undefined,
        styleTags,
      })

      setJustPosted(true)
      setDescription('')
      setStyleTags([])
      setSelectedComboId('')
      setUploadPreview(null)
      setComboThumbPreview(null)
      setActiveTab('mine')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsPosting(false)
    }
  }

  useEffect(() => {
    if (!combos.length || source !== 'combo' || !comboGridRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      const cards = comboGridRef.current.querySelectorAll(`.${styles.comboCard}`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.05,
      })
    }, comboGridRef)
    return () => ctx.revert()
  }, [combos, source])

  useEffect(() => {
    if (activeTab !== 'mine' || !myPosts.length || !mineGridRef.current) return undefined
    if (prefersReducedMotion()) return undefined
    const ctx = gsap.context(() => {
      const cards = mineGridRef.current.querySelectorAll(`.${styles.postsGrid} > *`)
      if (!cards.length) return
      revealFrom(cards, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.06,
      })
    }, mineGridRef)
    return () => ctx.revert()
  }, [activeTab, myPosts])

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <p className={styles.authGate}>
          Share my fits는 로그인 후 이용할 수 있어요.{' '}
          <Link to="/login" className={styles.authLink}>
            로그인하러 가기
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Share my fits</p>
        <h1 className={styles.title}>내 코디 공유하기</h1>
        <p className={styles.lede}>오늘의 코디를 커뮤니티에 자랑해보세요.</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Share my fits 탭">
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

      {activeTab === 'write' && (
        <Card accent="pink" className={styles.formCard}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.sourceToggle} role="radiogroup" aria-label="게시물 소스">
              <button
                type="button"
                role="radio"
                aria-checked={source === 'combo'}
                className={`${styles.sourceButton} ${source === 'combo' ? styles.sourceButtonActive : ''}`}
                onClick={() => setSource('combo')}
              >
                저장된 조합에서 선택
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={source === 'upload'}
                className={`${styles.sourceButton} ${source === 'upload' ? styles.sourceButtonActive : ''}`}
                onClick={() => setSource('upload')}
              >
                사진 업로드
              </button>
            </div>

            {source === 'combo' && (
              <div className={styles.comboPicker}>
                {isLoadingCombos && <p className={styles.status}>불러오는 중...</p>}
                {!isLoadingCombos && combos.length === 0 && (
                  <p className={styles.status}>
                    아직 저장된 조합이 없어요. 나의 옷장에서 먼저 조합을 만들어보세요.
                  </p>
                )}
                <div className={`${styles.comboGrid} ${styles.comboGridCompact}`} ref={comboGridRef}>
                  {combos.map((combo) => (
                    <CollageCard
                      key={combo._id}
                      id={combo._id}
                      imageUrl={combo.items?.[0]?.imageUrl}
                      title={combo.name || `${combo.items?.length || 0}개 아이템`}
                      selected={selectedComboId === combo._id}
                      onClick={() => {
                        setSelectedComboId(combo._id)
                        setComboThumbPreview(null)
                      }}
                      className={styles.comboCard}
                      compact
                    />
                  ))}
                </div>

                {selectedCombo && (
                  <div className={styles.uploadBox}>
                    <label className={styles.label} htmlFor="combo-thumb-upload">
                      썸네일 직접 올리기 (선택)
                    </label>
                    <input
                      id="combo-thumb-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleComboThumbChange}
                      className={styles.fileInput}
                    />
                    {comboThumbPreview && (
                      <>
                        <img
                          src={comboThumbPreview.imageUrl}
                          alt="썸네일 미리보기"
                          className={styles.uploadPreview}
                        />
                        <button
                          type="button"
                          className={styles.sourceButton}
                          onClick={() => setComboThumbPreview(null)}
                        >
                          기본 썸네일로 되돌리기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {source === 'upload' && (
              <div className={styles.uploadBox}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                {uploadPreview && (
                  <img src={uploadPreview.imageUrl} alt="업로드 미리보기" className={styles.uploadPreview} />
                )}
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="fit-description">
                코디 설명
              </label>
              <textarea
                id="fit-description"
                className={styles.textarea}
                rows={4}
                placeholder="오늘 코디에 대해 소개해주세요."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <label className={styles.weatherToggle}>
              <input
                type="checkbox"
                checked={includeWeatherTag}
                onChange={(event) => setIncludeWeatherTag(event.target.checked)}
                disabled={!weather}
              />
              {weather
                ? `오늘 날씨 태그 추가 (${weather.label} · ${Math.round(weather.tmp)}°C)`
                : '오늘 날씨 태그 추가 (위치를 설정하면 사용할 수 있어요)'}
            </label>

            <div className={styles.field}>
              <p className={styles.label}>스타일 태그</p>
              <StyleTagPicker selected={styleTags} onToggle={toggleStyleTag} />
            </div>

            {formError && (
              <p className={styles.error} role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" isLoading={isPosting} fullWidth>
              게시하기
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'mine' && (
        <div className={styles.mineSection}>
          {justPosted && <p className={styles.success}>게시물을 등록했어요!</p>}
          {mineError && (
            <p className={styles.error} role="alert">
              {mineError}
            </p>
          )}
          {isLoadingMine && <p className={styles.status}>불러오는 중...</p>}
          {!isLoadingMine && myPosts.length === 0 && (
            <p className={styles.status}>아직 공유한 코디가 없어요.</p>
          )}
          <div className={styles.postsGrid} ref={mineGridRef}>
            {myPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDeleted={handleMyPostDeleted}
                onUpdated={handleMyPostUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'combos' && (
        <div className={styles.mineSection}>
          {comboActionError && (
            <p className={styles.error} role="alert">
              {comboActionError}
            </p>
          )}
          {isLoadingCombos && <p className={styles.status}>불러오는 중...</p>}
          {!isLoadingCombos && combos.length === 0 && (
            <p className={styles.status}>
              아직 저장된 조합이 없어요. 나의 옷장에서 조합을 만들어보세요.
            </p>
          )}
          <div className={styles.comboGrid} ref={combosGridRef}>
            {combos.map((combo) => (
              <div key={combo._id} className={styles.comboHistoryCard}>
                <CollageCard
                  id={combo._id}
                  imageUrl={combo.items?.[0]?.imageUrl}
                  title={combo.name || '이름 없는 코디'}
                  className={styles.comboCard}
                  flat
                />
                {renamingComboId === combo._id ? (
                  <div className={styles.comboRenameRow}>
                    <input
                      className={styles.nameInput}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      maxLength={40}
                    />
                    <button
                      type="button"
                      className={styles.sourceButton}
                      onClick={() => handleRenameCombo(combo._id)}
                      disabled={comboBusyId === combo._id}
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      className={styles.sourceButton}
                      onClick={() => setRenamingComboId(null)}
                      disabled={comboBusyId === combo._id}
                    >
                      취소
                    </button>
                  </div>
                ) : confirmDeleteComboId === combo._id ? (
                  <div className={styles.comboRenameRow}>
                    <span className={styles.status}>정말 삭제할까요?</span>
                    <button
                      type="button"
                      className={styles.sourceButton}
                      onClick={() => handleDeleteCombo(combo._id)}
                      disabled={comboBusyId === combo._id}
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      className={styles.sourceButton}
                      onClick={() => setConfirmDeleteComboId(null)}
                      disabled={comboBusyId === combo._id}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className={styles.comboRenameRow}>
                    <button
                      type="button"
                      className={styles.sourceButton}
                      onClick={() => startRenameCombo(combo)}
                    >
                      이름 수정
                    </button>
                    <button
                      type="button"
                      className={styles.sourceButton}
                      onClick={() => setConfirmDeleteComboId(combo._id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareFits
