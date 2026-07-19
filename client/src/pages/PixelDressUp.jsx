import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import UploadSlot from '../components/UploadSlot'
import DollCanvas from '../components/DollCanvas'
import ExpressionPicker from '../components/ExpressionPicker'
import EyeColorPicker from '../components/EyeColorPicker'
import HairPicker from '../components/HairPicker'
import { WARDROBE_CATEGORIES } from '../data/wardrobeCategories'
import exampleOuter1 from '../assets/dressup-examples/example-outer-1.jpg'
import exampleTopOuter2 from '../assets/dressup-examples/example-top-outer-2.jpg'
import exampleBottom from '../assets/dressup-examples/example-bottom.jpg'
import exampleShoes from '../assets/dressup-examples/example-shoes.jpg'
import exampleAccessoryBracelet from '../assets/dressup-examples/example-accessory-bracelet.jpg'
import exampleAccessoryNecklace from '../assets/dressup-examples/example-accessory-necklace.jpg'
import styles from './PixelDressUp.module.css'

// Reference photos shown at the page bottom so users can see what a
// "잘 인식되는" source photo looks like per category (front-facing,
// plain/light background — see the notice banner above the upload panel).
// 'top'/'outer' share the same two examples since both crop/fit the same
// way (see NECK_CROP_RATIO / LAYER_POSITIONS.outer==top in dollLayout.js).
// Accessory examples cover 팔찌/발찌 (bracelet/anklet — same wrist/ankle-zone
// resolution, so one example photo represents both) and 목걸이 (necklace);
// see resolveAccessoryPosition / ACCESSORY_ZONES in dollLayout.js for the
// keyword-to-zone mapping these photos are meant to illustrate.
const EXAMPLE_PHOTOS = [
  { label: '상의 / 아우터', images: [exampleOuter1, exampleTopOuter2] },
  { label: '하의', images: [exampleBottom] },
  { label: '신발', images: [exampleShoes] },
  { label: '팔찌 / 발찌', images: [exampleAccessoryBracelet] },
  { label: '목걸이', images: [exampleAccessoryNecklace] },
]

const ACCENTS = {
  outer: 'pink',
  top: 'mint',
  bottom: 'sky',
  shoes: 'yellow',
  accessory: 'lavender',
}

// Per-category intermediate pixel-grid shape — taller items (outer/top/
// bottom) keep a portrait ratio, shoes are wide-and-flat. Pushed back up to
// a fine/minimal pixel unit (small blocks, high pixelWidth + high
// colorLevels) per a follow-up request for more detail/definition in the
// converted result, rather than the chunkier "obviously retro" look tried
// earlier. extractForeground re-enabled now that DollCanvas fits garments by
// width (not contain) — background-removed crops were rendering far too
// small under the old contain-fit, which made the background-removal
// feature look broken even when it worked correctly.
// `category` is passed through to pixelateImage so its extractForeground
// pass can apply any category-specific segmentation tuning (see
// LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY in pixelateImage.js).
const PIXELATE_OPTIONS = {
  outer: { pixelWidth: 48, pixelHeight: 58, colorLevels: 40, outputWidth: 220, outputHeight: 270, extractForeground: true, category: 'outer' },
  top: { pixelWidth: 48, pixelHeight: 55, colorLevels: 40, outputWidth: 220, outputHeight: 254, extractForeground: true, category: 'top' },
  bottom: { pixelWidth: 44, pixelHeight: 55, colorLevels: 40, outputWidth: 200, outputHeight: 250, extractForeground: true, category: 'bottom' },
  shoes: { pixelWidth: 56, pixelHeight: 32, colorLevels: 36, outputWidth: 240, outputHeight: 135, extractForeground: true, category: 'shoes' },
  // accessory covers everything from hats to belts to bracelets, with very
  // different aspect ratios (a belt is wide-and-flat, a necklace is tall).
  // A fixed square pixelWidth/pixelHeight + outputWidth/outputHeight (as
  // this used to have) forces every upload's intermediate canvas to 1:1,
  // silently squashing any non-square accessory — reported for a belt photo
  // ("가로로 찌그러져 있어"). Per a follow-up request to preserve each
  // upload's own aspect ratio, pixelHeight/outputHeight are omitted here so
  // pixelateImage derives them from the source photo's real aspect ratio
  // (see its own JSDoc defaults) instead of forcing a square.
  accessory: { pixelWidth: 44, colorLevels: 36, outputWidth: 180, extractForeground: true, category: 'accessory' },
}

function PixelDressUp() {
  const [layers, setLayers] = useState({})
  const [gender, setGender] = useState('f')
  const [expression, setExpression] = useState('joy')
  const [eyeColor, setEyeColor] = useState('brown')
  const [hairStyle, setHairStyle] = useState('')
  const [accessoryNote, setAccessoryNote] = useState('')
  // Per-category "does this garment actually have a neckline?" override for
  // NECK_CROP_RATIO (dollLayout.js) — defaults to true (crop applied, the
  // prior behavior) for 'top'/'outer'; unchecked for garments with no real
  // neck-hole to trim (off-shoulder, tube tops, etc).
  const [neckFlags, setNeckFlags] = useState({ top: true, outer: true })

  const handleGenderChange = (nextGender) => {
    setGender(nextGender)
    setHairStyle('') // hairstyle values are gender-specific, don't carry over
  }

  const handlePixelated = (categoryValue) => (dataUrl) => {
    setLayers((prev) => ({ ...prev, [categoryValue]: dataUrl }))
  }

  const handleNecklineChange = (categoryValue) => (value) => {
    setNeckFlags((prev) => ({ ...prev, [categoryValue]: value }))
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Pixel dress-up</p>
        <h1 className={styles.title}>
          픽셀아트로 입혀보기 <span className={styles.betaBadge}>BETA</span>
        </h1>
        <p className={styles.lede}>
          옷 사진을 올리면 픽셀아트로 바꿔서 인형에게 입혀드려요. 다섯 카테고리를 채워 오늘의 핏을 완성해보세요.
        </p>
        <p className={styles.notice}>
          ⚠️ 옷이 <strong>정면(앞면)</strong>으로 나온 사진일 때만 정확하게 적용돼요. 비스듬하거나 옆/뒷면 사진은
          모양이 어긋날 수 있어요. 배경은 흰색·단색일수록 더 정확하게 잘려요.
        </p>
      </header>

      <div className={styles.layout}>
        <Card accent="lavender" className={styles.uploadPanel} tilt="none">
          <h2 className={styles.panelTitle}>옷 업로드</h2>
          <div className={styles.slotList}>
            {WARDROBE_CATEGORIES.map(({ value, label }) => (
              <UploadSlot
                key={value}
                label={label}
                accent={ACCENTS[value]}
                pixelateOptions={PIXELATE_OPTIONS[value]}
                onPixelated={handlePixelated(value)}
                note={value === 'accessory' ? accessoryNote : undefined}
                onNoteChange={value === 'accessory' ? setAccessoryNote : undefined}
                notePlaceholder={value === 'accessory' ? '착용 위치 (예: 머리, 목, 허리, 왼쪽 손목, 오른쪽 손목, 발목)' : undefined}
                hasNeckline={value === 'top' || value === 'outer' ? neckFlags[value] : undefined}
                onNecklineChange={value === 'top' || value === 'outer' ? handleNecklineChange(value) : undefined}
              />
            ))}
          </div>
        </Card>

        <Card accent="sky" className={styles.dollPanel} tilt="none">
          <h2 className={styles.panelTitle}>인형</h2>

          <div className={styles.genderToggle} role="radiogroup" aria-label="인형 성별 선택">
            <Button
              type="button"
              variant={gender === 'f' ? 'primary' : 'secondary'}
              size="md"
              aria-checked={gender === 'f'}
              role="radio"
              onClick={() => handleGenderChange('f')}
            >
              여자 인형
            </Button>
            <Button
              type="button"
              variant={gender === 'm' ? 'primary' : 'secondary'}
              size="md"
              aria-checked={gender === 'm'}
              role="radio"
              onClick={() => handleGenderChange('m')}
            >
              남자 인형
            </Button>
          </div>

          <div className={styles.pickerBlock}>
            <p className={styles.pickerLabel}>헤어스타일</p>
            <HairPicker gender={gender} value={hairStyle} onChange={setHairStyle} />
          </div>

          <div className={styles.pickerBlock}>
            <p className={styles.pickerLabel}>표정</p>
            <ExpressionPicker gender={gender} eyeColor={eyeColor} value={expression} onChange={setExpression} />
          </div>

          <div className={styles.pickerBlock}>
            <p className={styles.pickerLabel}>눈동자 색</p>
            <EyeColorPicker value={eyeColor} onChange={setEyeColor} />
          </div>

          <DollCanvas
            layers={layers}
            gender={gender}
            expression={expression}
            eyeColor={eyeColor}
            hairStyle={hairStyle}
            accessoryNote={accessoryNote}
            neckFlags={neckFlags}
          />
        </Card>
      </div>

      <Card accent="mint" className={styles.examplePanel} tilt="none">
        <h2 className={styles.panelTitle}>이런 사진이 잘 인식돼요</h2>
        <p className={styles.exampleLede}>
          정면으로 나온, 배경이 흰색·단색에 가까운 사진일수록 결과물이 깔끔해요. 아래 예시를 참고해주세요.
        </p>
        <p className={styles.exampleLede}>
          옷 색이 배경색과 너무 비슷하거나(흰 옷 + 흰 배경 등), 배경에 무늬·그림자가 많거나, 옷이 사진 프레임에서
          너무 작게 나오면 배경 제거가 잘 안 될 수 있어요.
        </p>
        <div className={styles.exampleGrid}>
          {EXAMPLE_PHOTOS.map(({ label, images }) => (
            <div key={label} className={styles.exampleGroup}>
              <p className={styles.exampleLabel}>{label}</p>
              <div className={styles.exampleImages}>
                {images.map((src) => (
                  <img key={src} src={src} alt={`${label} 예시 사진`} className={styles.exampleImage} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default PixelDressUp
