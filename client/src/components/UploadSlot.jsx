import { useId, useRef, useState } from 'react'
import { pixelateImage } from '../utils/pixelateImage'
import styles from './UploadSlot.module.css'

const MIN_LOADING_MS = 800
const MAX_LOADING_MS = 1500

/**
 * One category's upload slot: click-or-drag an image in, show a brief
 * "변환 중..." loading state, then swap to the canvas-pixelated result
 * (fade-in + scale-up). Mobile has no native drag-and-drop surface, so the
 * click handler alone is what opens the OS file picker there — no separate
 * branch needed, the same <input type="file"> covers both.
 */
function UploadSlot({
  label,
  accent = 'pink',
  onPixelated,
  pixelateOptions,
  note,
  onNoteChange,
  notePlaceholder,
  hasNeckline,
  onNecklineChange,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [status, setStatus] = useState('empty') // empty | loading | done | error
  const [originalUrl, setOriginalUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const processFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있어요.')
      setStatus('error')
      return
    }

    setError('')
    setStatus('loading')

    const reader = new FileReader()
    reader.onload = () => setOriginalUrl(reader.result)
    reader.readAsDataURL(file)

    const delay = MIN_LOADING_MS + Math.random() * (MAX_LOADING_MS - MIN_LOADING_MS)

    Promise.all([pixelateImage(file, pixelateOptions), waitFor(delay)])
      .then(([dataUrl]) => {
        setResultUrl(dataUrl)
        setStatus('done')
        onPixelated?.(dataUrl)
      })
      .catch(() => {
        setError('이미지를 변환하지 못했어요. 다시 시도해주세요.')
        setStatus('error')
      })
  }

  const handleFileChange = (event) => {
    processFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    processFile(event.dataTransfer.files?.[0])
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleRemove = (event) => {
    event.stopPropagation()
    setStatus('empty')
    setOriginalUrl(null)
    setResultUrl(null)
    setError('')
    onPixelated?.(null)
  }

  const stateClass =
    status === 'loading'
      ? styles.loading
      : status === 'done'
        ? styles.done
        : status === 'error'
          ? styles.hasError
          : styles.empty

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} 이미지 업로드`}
        className={[styles.slot, styles[`accent-${accent}`], stateClass, isDragging ? styles.dragging : '']
          .filter(Boolean)
          .join(' ')}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {status === 'empty' && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon} aria-hidden="true">
              +
            </span>
            <p className={styles.placeholderText}>이미지를 넣어주세요</p>
            <p className={styles.placeholderHint}>클릭하거나 드래그해서 업로드</p>
          </div>
        )}

        {status === 'loading' && (
          <div className={styles.loadingState}>
            {originalUrl && (
              <img src={originalUrl} alt="" aria-hidden="true" className={styles.loadingThumb} />
            )}
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.loadingText}>변환 중...</p>
          </div>
        )}

        {status === 'done' && resultUrl && (
          <>
            <img src={resultUrl} alt={`${label} 픽셀아트 결과`} className={styles.resultImage} />
            <button
              type="button"
              className={styles.removeButton}
              onClick={handleRemove}
              aria-label={`${label} 벗기기`}
            >
              벗기기
            </button>
          </>
        )}

        {status === 'error' && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon} aria-hidden="true">
              !
            </span>
            <p className={styles.placeholderText}>{error}</p>
          </div>
        )}
      </div>

      {onNoteChange && (
        <input
          type="text"
          className={styles.noteInput}
          value={note ?? ''}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder={notePlaceholder ?? '착용 위치를 적어주세요'}
          aria-label={`${label} 착용 위치 메모`}
        />
      )}

      {onNecklineChange && (
        <label className={styles.neckToggle}>
          <input
            type="checkbox"
            checked={hasNeckline ?? true}
            onChange={(event) => onNecklineChange(event.target.checked)}
          />
          목선이 있는 옷이에요 (터틀넥/크루넥 등)
        </label>
      )}
    </div>
  )
}

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default UploadSlot
