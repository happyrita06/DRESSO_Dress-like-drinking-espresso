import { useState } from 'react'
import Input from './Input'
import Button from './Button'
import SafeImg from './SafeImg'
import { WARDROBE_CATEGORIES } from '../data/wardrobeCategories'
import { fetchLinkPreview } from '../utils/linkPreviewApi'
import { createWardrobeItem } from '../utils/wardrobeApi'
import { useAuth } from '../hooks/useAuth'
import styles from './LinkImportForm.module.css'

function LinkImportForm({ onSaved }) {
  const { token } = useAuth()
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null) // { imageUrl, title }
  const [category, setCategory] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleFetchPreview = async () => {
    if (!url.trim()) return
    setError('')
    setPreview(null)
    setIsFetching(true)
    try {
      const data = await fetchLinkPreview({ token, url: url.trim() })
      if (!data.imageUrl && !data.title) {
        setError(data.notice || '이 링크에서는 이미지를 찾지 못했어요. 이름만 입력해서 등록할 수 있어요.')
      }
      setPreview({ imageUrl: data.imageUrl, title: data.title || '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsFetching(false)
    }
  }

  const handleSave = async () => {
    if (!preview || !category) return
    setIsSaving(true)
    setError('')
    try {
      const item = await createWardrobeItem({
        token,
        category,
        name: preview.title?.trim() || '이름 없는 아이템',
        imageUrl: preview.imageUrl,
        sourceUrl: url.trim(),
      })
      onSaved?.(item)
      setUrl('')
      setPreview(null)
      setCategory('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.urlRow}>
        <Input
          label="쇼핑몰 상품 링크"
          id="wardrobe-url"
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className={styles.urlInput}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleFetchPreview}
          isLoading={isFetching}
          className={styles.fetchButton}
        >
          미리보기 가져오기
        </Button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {preview && (
        <div className={styles.previewBox}>
          <div className={styles.previewImageWrap}>
            <SafeImg
              src={preview.imageUrl}
              alt=""
              className={styles.previewImage}
              fallback={<div className={styles.previewPlaceholder}>이미지 없음</div>}
            />
          </div>

          <div className={styles.previewFields}>
            <Input
              label="아이템 이름"
              id="wardrobe-name"
              value={preview.title}
              onChange={(event) => setPreview((prev) => ({ ...prev, title: event.target.value }))}
            />

            <div className={styles.categoryField}>
              <label className={styles.categoryLabel} htmlFor="wardrobe-category">
                카테고리<span className={styles.required}>*</span>
              </label>
              <select
                id="wardrobe-category"
                className={styles.categorySelect}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">카테고리를 선택해주세요</option>
                {WARDROBE_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Button type="button" onClick={handleSave} isLoading={isSaving} disabled={!category}>
              옷장에 추가하기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LinkImportForm
