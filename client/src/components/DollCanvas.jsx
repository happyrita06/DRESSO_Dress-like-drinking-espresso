import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  LAYER_POSITIONS,
  LAYER_Z_INDEX,
  DOLL_BASE_SIZE,
  HEAD_POSITIONS,
  resolveAccessoryPosition,
  getHairPosition,
  getFaceScale,
  getFaceBrightness,
  getNeckCropRatio,
} from '../data/dollLayout'
import dollBaseF from '../assets/dollsprites/doll-f-base.png'
import dollBaseM from '../assets/dollsprites/doll-m-base.png'
import dollMaskF from '../assets/dollsprites/doll-f-mask.png'
import dollMaskM from '../assets/dollsprites/doll-m-mask.png'
import styles from './DollCanvas.module.css'

const DOLL_BASE_IMAGES = { f: dollBaseF, m: dollBaseM }
// A *filled* version of the body silhouette (arm-to-torso gap morphologically
// closed — see scripts/generate-doll-assets) used only for clipping garment
// layers. The display body deliberately has a gap between arm and torso
// ("arms held slightly away from the body"); masking a garment against that
// gap directly would punch a hole straight through it, so masking uses this
// separate solid-envelope version instead.
const DOLL_MASK_IMAGES = { f: dollMaskF, m: dollMaskM }
// Accessory (necklace/hat/etc.) isn't clothing conforming to the torso/limb
// shape — it sits over the head/collar, a region the (headless) body has no
// silhouette for at all, so silhouette-masking it would just erase it.
// Categories that get stretch-filled into their LAYER_POSITIONS box (as
// opposed to accessory's object-fit: contain).
const FILL_CATEGORIES = new Set(['outer', 'top', 'bottom', 'shoes'])
// Of those, which additionally get clipped to the doll's body silhouette via
// 'destination-in'. 'top' was dropped from this per an explicit follow-up
// request: the uploaded garment photo already has its own background
// removed and is tightly cropped to the real garment shape (see
// extractGarmentForeground in pixelateImage.js) before it ever reaches this
// canvas, so the body-silhouette mask's own trim on top of that was
// double-cutting the sleeve/arm area more aggressively than intended — the
// garment's own already-clean cutout is what should show, not a further
// clip down to the doll's exact arm outline. 'shoes' was dropped for the
// exact same reason, but worse: a tall boot (already cleanly cut out, same
// as any other upload) stretches into the shoes box far wider than the
// doll's own leg is at that height, so the mask's silhouette there is just
// a thin bare-leg column above a small foot shape — clipping to it cut the
// boot's shaft down to almost nothing, leaving only the bit overlapping the
// small foot shape ("발끝에만 신발이 구현되어있어... 부츠여서 발목까지
// 와야 하는데" — reported with a screenshot showing exactly that).
const SILHOUETTE_MASKED_CATEGORIES = new Set(['outer', 'bottom'])
const PREVIEW_CANVAS_SCALE = 3 // resolution multiplier for the live-preview masked layers

// 'bottom' clipped straight to the doll's exact leg silhouette read as
// shrink-wrapped/skin-tight no matter how loose the actual uploaded pants
// photo looked ("바지가 몸 일러스트 다리에 너무 딱 붙는 것 같아" — pants
// look too tight against the leg illustration). A first attempt widened the
// clip mask by a uniform sideways radius (an ellipse dilate), which helped
// a little everywhere but still tapered down with the leg's own real shape
// — tested against a boxy wide-leg/balloon-fit reference photo (cuffed at
// the ankle but ballooning out above it) it still came out visibly tapered
// at the ankle instead of staying wide ("아직도 좀 붙는 핏"), since a
// uniform-radius grow just traces a fatter version of the same tapered leg
// outline rather than a genuinely different (boxier) one. Rather than
// dropping 'bottom' out of SILHOUETTE_MASKED_CATEGORIES entirely (which
// would need re-shrinking its LAYER_POSITIONS box to compensate, same as
// 'top' and 'shoes' both needed after their own mask removal — see this
// file's SILHOUETTE_MASKED_CATEGORIES comment above — since that box is
// deliberately oversized on the assumption the mask trims it back), this
// instead stretches the clip mask horizontally per row with a scale that
// grows from the waist down to the ankle (see `widenMaskTrapezoid`) — the
// leg's own taper gets counteracted by an increasingly wider clip, so a
// wide-leg garment can actually stay wide near the ankle instead of being
// funneled back down to the doll's real (much narrower) ankle width.
// topScale scaled 0.9x around the same waist line per an explicit
// follow-up request ("하의 허리쪽만 크기 0.9배 해줘") — narrows just the
// waist end of the trapezoid (1.1 -> 0.99) while bottomScale (the ankle
// end) stays as-is, matching how a wrap-tie/cinched waistband narrows only
// the top of an otherwise-baggy pant leg.
const MASK_TRAPEZOID_SCALE_BY_CATEGORY = {
  bottom: { topScale: 0.99, bottomScale: 1.75 },
}

// Every hair-{gender}-{style}.png (a "wig" cutout with a transparent hole
// for the face, client/src/assets/dollsprites/hair/) — glob-import all 12 at
// once, indexed by [gender][style].
const hairModules = import.meta.glob('../assets/dollsprites/hair/hair-*.png', {
  eager: true,
  import: 'default',
})

const HAIR_IMAGES = {}
for (const [path, src] of Object.entries(hairModules)) {
  const match = /hair-(f|m)-([a-z-]+)\.png$/.exec(path)
  if (!match) continue
  const [, gender, style] = match
  HAIR_IMAGES[gender] ??= {}
  HAIR_IMAGES[gender][style] = src
}

// Every face-{gender}-{expression}-{eyeColor}.png (cropped from the user's
// reference sheets, client/src/assets/dollsprites/faces/) is a distinct
// illustration — glob-import all 72 at once instead of one import statement
// per file, then index them by [gender][expression][eyeColor].
const faceModules = import.meta.glob('../assets/dollsprites/faces/face-*.png', {
  eager: true,
  import: 'default',
})

const FACE_IMAGES = {}
for (const [path, src] of Object.entries(faceModules)) {
  const match = /face-(f|m)-([a-z]+)-([a-z]+)\.png$/.exec(path)
  if (!match) continue
  const [, gender, expression, eyeColor] = match
  FACE_IMAGES[gender] ??= {}
  FACE_IMAGES[gender][expression] ??= {}
  FACE_IMAGES[gender][expression][eyeColor] = src
}

const TOAST_DURATION_MS = 2600
const SAVE_CANVAS_SCALE = 4 // multiplies the base illustration's real pixel size for save-composite resolution

/**
 * The paper-doll stage: the gender's headless body illustration (see
 * client/src/assets/dollsprites/doll-{gender}-base.png — deliberately drawn
 * with NO head of its own) with the selected expression+eye-color face
 * illustration filling the head box, and each category's pixelated upload
 * layered on top — per `LAYER_POSITIONS`/`LAYER_Z_INDEX`/`HEAD_POSITIONS`
 * (see client/src/data/dollLayout.js). Swapping the face doesn't have to
 * color-match a second head shape underneath, since there isn't one.
 *
 * Each garment layer is pre-composited (positioned + silhouette-clipped) on
 * an offscreen canvas into one full-stage-sized image *before* it's ever
 * rendered (see `buildPositionedLayerUrl`), rather than positioned with a CSS
 * `mask-image` box — CSS masks are prone to silently hiding the whole
 * element if anything about the mask resource/positioning is off, and this
 * sidesteps that failure mode entirely: what you get is a plain `<img>`
 * that either has pixels in it or doesn't, no masking step left to fail at
 * render time.
 *
 * `layers` is `{ outer, top, bottom, shoes, accessory }`, each either a
 * pixelated data URL or null/undefined for "not uploaded yet". `onSave`
 * receives `(compositeDataUrl, layers)` once the user composites+saves —
 * left open for a future Share-my-fits hookup, not wired to any API here.
 * `accessoryNote` is the free-text "where does this go" memo for the
 * accessory upload (see resolveAccessoryPosition in dollLayout.js) — there's
 * no way to tell a hat photo from a belt photo otherwise.
 */
function DollCanvas({
  layers,
  gender = 'f',
  expression = 'joy',
  eyeColor = 'brown',
  hairStyle = '',
  accessoryNote = '',
  neckFlags = {},
  onSave,
}) {
  const stageRef = useRef(null)
  const [showToast, setShowToast] = useState(false)
  const toastTimeoutRef = useRef(null)
  const [savedPreview, setSavedPreview] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [previewLayers, setPreviewLayers] = useState({})

  const filledCount = CATEGORY_ORDER.filter((key) => Boolean(layers[key])).length
  const isComplete = filledCount === CATEGORY_ORDER.length

  useEffect(() => {
    if (!isComplete) return undefined
    setShowToast(true)
    clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), TOAST_DURATION_MS)
    return () => clearTimeout(toastTimeoutRef.current)
  }, [isComplete])

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), [])

  // Rebuild every masked/positioned layer preview whenever the uploads or
  // gender change. Recomputing all of them (rather than diffing per key) is
  // simpler and the source images are tiny (already pixelated), so the cost
  // is negligible even though it re-touches unchanged layers too.
  useEffect(() => {
    let cancelled = false

    async function rebuild() {
      const entries = (
        await Promise.all(
          CATEGORY_ORDER.map(async (key) => {
            const src = layers[key]
            if (!src) return key === 'accessory' ? [['accessory', null], ['accessoryBelowTop', null]] : [[key, null]]
            try {
              const url = await buildPositionedLayerUrl(src, gender, key, accessoryNote, neckFlags[key])
              // accessory splits into two z-layers (see buildPositionedLayerUrl's
              // own comment) instead of the single url every other category
              // returns — everything else is unaffected.
              if (key === 'accessory') {
                return [
                  ['accessory', url.neck],
                  ['accessoryBelowTop', url.other],
                ]
              }
              return [[key, url]]
            } catch (err) {
              // eslint-disable-next-line no-console -- surfaced so a silent
              // per-layer render failure is diagnosable instead of just
              // rendering nothing with no trace.
              console.error(`[PixelDressUp] failed to render "${key}" layer:`, err)
              return key === 'accessory' ? [['accessory', null], ['accessoryBelowTop', null]] : [[key, null]]
            }
          })
        )
      ).flat()
      if (!cancelled) setPreviewLayers(Object.fromEntries(entries))
    }

    rebuild()
    return () => {
      cancelled = true
    }
  }, [layers, gender, accessoryNote, neckFlags])

  const baseSize = DOLL_BASE_SIZE[gender]
  const headPos = scalePositionBox(HEAD_POSITIONS[gender], getFaceScale(gender, expression))
  const hairPos = getHairPosition(gender, hairStyle)
  const faceSrc = FACE_IMAGES[gender]?.[expression]?.[eyeColor]
  const hairSrc = HAIR_IMAGES[gender]?.[hairStyle]
  const faceBrightness = getFaceBrightness(gender, expression)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const dataUrl = await compositeToDataUrl({ layers, gender, expression, eyeColor, hairStyle, accessoryNote, neckFlags })
      setSavedPreview(dataUrl)
      // eslint-disable-next-line no-console -- deliberate: no backend/API wired up yet (see CLAUDE.md known gaps)
      console.log('[PixelDressUp] composited fit saved (data URL, not persisted):', dataUrl)
      onSave?.(dataUrl, layers)
    } catch {
      // Composite failure isn't fatal — the doll preview above is still
      // fully usable, just skip producing a saved snapshot.
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      {showToast && (
        <div className={styles.toast} role="status">
          코디 완성! 🎉
        </div>
      )}

      <div
        className={styles.stage}
        ref={stageRef}
        style={{ '--stage-ratio': `${baseSize.width} / ${baseSize.height}` }}
      >
        <img
          src={DOLL_BASE_IMAGES[gender]}
          alt={gender === 'f' ? '여자 인형 베이스' : '남자 인형 베이스'}
          className={styles.bodyImage}
        />

        {faceSrc && (
          <div className={styles.faceBox} style={{ ...headPos, zIndex: LAYER_Z_INDEX.face }}>
            <img
              src={faceSrc}
              alt=""
              aria-hidden="true"
              className={styles.faceImage}
              style={faceBrightness !== 1 ? { filter: `brightness(${faceBrightness})` } : undefined}
            />
          </div>
        )}

        {hairSrc && (
          <div className={styles.faceBox} style={{ ...hairPos, zIndex: LAYER_Z_INDEX.hair }}>
            <img src={hairSrc} alt="" aria-hidden="true" className={styles.faceImage} />
          </div>
        )}

        {previewLayers.accessoryBelowTop && (
          <img
            src={previewLayers.accessoryBelowTop}
            alt={`${CATEGORY_LABELS.accessory} 레이어`}
            className={styles.layerImageFull}
            style={{ zIndex: LAYER_Z_INDEX.accessoryBelowTop }}
          />
        )}

        {CATEGORY_ORDER.map((key) => {
          const url = previewLayers[key]
          if (!url) return null
          return (
            <img
              key={key}
              src={url}
              alt={`${CATEGORY_LABELS[key]} 레이어`}
              className={styles.layerImageFull}
              style={{ zIndex: LAYER_Z_INDEX[key] }}
            />
          )
        })}
      </div>

      <div className={styles.actions}>
        <p className={styles.progress}>{filledCount} / {CATEGORY_ORDER.length} 아이템 착용 중</p>
        <Button onClick={handleSave} isLoading={isSaving} disabled={filledCount === 0}>
          이 핏 저장하기
        </Button>
      </div>

      {savedPreview && (
        <div className={styles.savedPreviewBlock}>
          <p className={styles.savedPreviewLabel}>저장된 핏 미리보기</p>
          <img src={savedPreview} alt="저장된 코디 합성 이미지" className={styles.savedPreviewImage} />
        </div>
      )}
    </div>
  )
}

/**
 * Draws one garment image onto an offscreen canvas the same aspect as the
 * whole doll stage, positioned at its `LAYER_POSITIONS[gender][category]`
 * box, then (for clothing categories) clips it to the body's filled
 * silhouette mask via 'destination-in'. Returns a full-stage-sized
 * `toDataURL()` PNG — everywhere outside the garment/box is transparent, so
 * it can be stacked directly with plain absolute-fill positioning.
 */
async function buildPositionedLayerUrl(src, gender, category, accessoryNote, hasNeckline) {
  const baseSize = DOLL_BASE_SIZE[gender]
  const canvas = document.createElement('canvas')
  canvas.width = baseSize.width * PREVIEW_CANVAS_SCALE
  canvas.height = baseSize.height * PREVIEW_CANVAS_SCALE
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  if (category === 'shoes' && src && typeof src === 'object') {
    // pixelateShoePair detected two separate shoe blobs — draw each into its
    // own half of the (split) shoes box instead of stretching one photo
    // across the whole thing (see shoesLeft/shoesRight's own comment in
    // dollLayout.js for why).
    const [leftImg, rightImg] = await Promise.all([loadImage(src.left), loadImage(src.right)])
    for (const [img, posKey] of [[leftImg, 'shoesRight'], [rightImg, 'shoesLeft']]) {
      const pos = LAYER_POSITIONS[gender][posKey]
      const x = (parsePercent(pos.left) / 100) * canvas.width
      const y = (parsePercent(pos.top) / 100) * canvas.height
      const w = (parsePercent(pos.width) / 100) * canvas.width
      const h = (parsePercent(pos.height) / 100) * canvas.height
      drawFill(ctx, img, x, y, w, h)
    }
    return canvas.toDataURL('image/png')
  }

  const img = await loadImage(src)

  if (category === 'accessory') {
    // resolveAccessoryPosition returns an array — usually one zone, but two
    // (wristLeft + wristRight) when a wrist accessory's note doesn't pin it
    // to one side, so it renders symmetrically on both wrists. See that
    // function's own comment in dollLayout.js. Split across two canvases by
    // `isNeck` (also from resolveAccessoryPosition) rather than one flattened
    // image, so the caller can stack them at two different z-indexes —
    // LAYER_Z_INDEX.accessory (neck, above top/outer) vs
    // LAYER_Z_INDEX.accessoryBelowTop (everything else, under top) — per an
    // explicit follow-up request that only neck-worn accessories should sit
    // above the shirt.
    const neckCanvas = document.createElement('canvas')
    neckCanvas.width = canvas.width
    neckCanvas.height = canvas.height
    const neckCtx = neckCanvas.getContext('2d')
    neckCtx.imageSmoothingEnabled = false
    let hasNeck = false
    let hasOther = false

    for (const pos of resolveAccessoryPosition(gender, accessoryNote)) {
      const targetCtx = pos.isNeck ? neckCtx : ctx
      if (pos.isNeck) hasNeck = true
      else hasOther = true
      const x = (parsePercent(pos.left) / 100) * canvas.width
      const y = (parsePercent(pos.top) / 100) * canvas.height
      const w = (parsePercent(pos.width) / 100) * canvas.width
      const h = (parsePercent(pos.height) / 100) * canvas.height
      drawContain(targetCtx, img, x, y, w, h, pos.rotate)
    }
    return {
      neck: hasNeck ? neckCanvas.toDataURL('image/png') : null,
      other: hasOther ? canvas.toDataURL('image/png') : null,
    }
  }

  const pos = LAYER_POSITIONS[gender][category]
  const x = (parsePercent(pos.left) / 100) * canvas.width
  const y = (parsePercent(pos.top) / 100) * canvas.height
  const w = (parsePercent(pos.width) / 100) * canvas.width
  const h = (parsePercent(pos.height) / 100) * canvas.height
  const isFilled = FILL_CATEGORIES.has(category)
  if (isFilled) {
    drawFill(ctx, img, x, y, w, h, getNeckCropRatio(category, hasNeckline))
  } else {
    drawContain(ctx, img, x, y, w, h)
  }

  if (SILHOUETTE_MASKED_CATEGORIES.has(category)) {
    const maskImg = await loadImage(DOLL_MASK_IMAGES[gender])
    const trapezoidScale = MASK_TRAPEZOID_SCALE_BY_CATEGORY[category]
    ctx.globalCompositeOperation = 'destination-in'
    if (trapezoidScale) {
      const topPct = parsePercent(pos.top) / 100
      const bottomPct = topPct + parsePercent(pos.height) / 100
      ctx.drawImage(widenMaskTrapezoid(maskImg, canvas.width, canvas.height, { topPct, bottomPct, ...trapezoidScale }), 0, 0)
    } else {
      ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height)
    }
  }

  return canvas.toDataURL('image/png')
}

/**
 * Stretches a silhouette mask horizontally, row by row, with a scale that
 * ramps linearly from `topScale` (at `topPct` of the canvas's height) to
 * `bottomScale` (at `bottomPct`) — see MASK_TRAPEZOID_SCALE_BY_CATEGORY's
 * own comment for why this exists instead of a uniform-radius dilate. Rows
 * above `topPct`/below `bottomPct` clamp to the nearest end scale rather
 * than continuing to extrapolate. Each row is stretched around the
 * canvas's own horizontal center, since the leg (and the garment box
 * clipped to it) is itself horizontally centered on the stage.
 */
function widenMaskTrapezoid(maskImg, width, height, { topPct, bottomPct, topScale, bottomScale }) {
  // Rasterize the mask at the target canvas's own resolution first — the
  // per-row slicing below reads source rows 1:1 against `height`, which
  // only lines up once the source has actually been scaled to `width` x
  // `height` (maskImg's own natural size is the much smaller doll-sprite
  // resolution, e.g. 242x513; slicing rows against that directly reads
  // past its real height for most of the canvas and renders blank).
  const baseCanvas = document.createElement('canvas')
  baseCanvas.width = width
  baseCanvas.height = height
  baseCanvas.getContext('2d').drawImage(maskImg, 0, 0, width, height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const topPx = topPct * height
  const bottomPx = bottomPct * height
  for (let y = 0; y < height; y++) {
    const t = Math.min(1, Math.max(0, (y - topPx) / (bottomPx - topPx)))
    const scale = topScale + (bottomScale - topScale) * t
    const dw = width * scale
    const dx = (width - dw) / 2
    ctx.drawImage(baseCanvas, 0, y, width, 1, dx, y, dw, 1)
  }
  return canvas
}

/**
 * Renders the headless body illustration + expression/eye-color face image
 * + every uploaded layer onto one offscreen canvas, in the same face/
 * shoes/bottom/top/outer/accessory z-order as the live stage (see
 * CATEGORY_ORDER/LAYER_Z_INDEX in dollLayout.js), and returns a single
 * flattened `toDataURL()` PNG — the same positioning/masking as
 * `buildPositionedLayerUrl`, just composited straight onto the final canvas
 * instead of returned as a separate image.
 */
async function compositeToDataUrl({ layers, gender, expression, eyeColor, hairStyle, accessoryNote, neckFlags = {} }) {
  const baseSize = DOLL_BASE_SIZE[gender]
  const canvas = document.createElement('canvas')
  canvas.width = baseSize.width * SAVE_CANVAS_SCALE
  canvas.height = baseSize.height * SAVE_CANVAS_SCALE
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  const baseImg = await loadImage(DOLL_BASE_IMAGES[gender])
  ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)
  const maskImg = await loadImage(DOLL_MASK_IMAGES[gender])

  const faceSrc = FACE_IMAGES[gender]?.[expression]?.[eyeColor]
  if (faceSrc) {
    const faceImg = await loadImage(faceSrc)
    const headPos = scalePositionBox(HEAD_POSITIONS[gender], getFaceScale(gender, expression))
    const fx = (parsePercent(headPos.left) / 100) * canvas.width
    const fy = (parsePercent(headPos.top) / 100) * canvas.height
    const fw = (parsePercent(headPos.width) / 100) * canvas.width
    const fh = (parsePercent(headPos.height) / 100) * canvas.height
    // preserve the face crop's own aspect ratio within the head box
    // (object-fit: contain equivalent) instead of stretching it to fill.
    const scale = Math.min(fw / faceImg.width, fh / faceImg.height)
    const dw = faceImg.width * scale
    const dh = faceImg.height * scale
    const dx = fx + (fw - dw) / 2
    const dy = fy + (fh - dh) / 2
    const faceBrightness = getFaceBrightness(gender, expression)
    ctx.filter = faceBrightness !== 1 ? `brightness(${faceBrightness})` : 'none'
    ctx.drawImage(faceImg, dx, dy, dw, dh)
    ctx.filter = 'none'
  }

  const genderLayerPositions = LAYER_POSITIONS[gender]
  // 'accessory' is drawn twice — once for its non-neck zones (before 'top',
  // so a hat/belt/bracelet/anklet sits under the shirt) and once for its
  // neck zone (after 'outer', same spot 'accessory' always drew — see
  // LAYER_Z_INDEX's own comment in dollLayout.js for why only neck stays
  // above top/outer). `drawAccessoryLayer` below does one pass filtered by
  // `wantNeck`; COMPOSITE_ORDER slots each pass in at the right point
  // instead of CATEGORY_ORDER's single fixed 'accessory' position.
  const COMPOSITE_ORDER = ['shoes', 'bottom', 'accessoryBelowTop', 'top', 'outer', 'accessory']

  async function drawAccessoryLayer(wantNeck) {
    const src = layers.accessory
    if (!src) return
    const img = await loadImage(src)
    for (const pos of resolveAccessoryPosition(gender, accessoryNote)) {
      if (pos.isNeck !== wantNeck) continue
      const x = (parsePercent(pos.left) / 100) * canvas.width
      const y = (parsePercent(pos.top) / 100) * canvas.height
      const w = (parsePercent(pos.width) / 100) * canvas.width
      const h = (parsePercent(pos.height) / 100) * canvas.height
      drawContain(ctx, img, x, y, w, h, pos.rotate)
    }
  }

  for (const key of COMPOSITE_ORDER) {
    if (key === 'accessoryBelowTop') {
      await drawAccessoryLayer(false)
      continue
    }
    if (key === 'accessory') {
      await drawAccessoryLayer(true)
      continue
    }

    const src = layers[key]
    if (!src) continue

    if (key === 'shoes' && typeof src === 'object') {
      // see buildPositionedLayerUrl's own comment — draw each detected shoe
      // into its own half of the (split) shoes box instead of stretching
      // one photo across the whole thing.
      const [leftImg, rightImg] = await Promise.all([loadImage(src.left), loadImage(src.right)])
      for (const [img, posKey] of [[leftImg, 'shoesRight'], [rightImg, 'shoesLeft']]) {
        const pos = genderLayerPositions[posKey]
        const x = (parsePercent(pos.left) / 100) * canvas.width
        const y = (parsePercent(pos.top) / 100) * canvas.height
        const w = (parsePercent(pos.width) / 100) * canvas.width
        const h = (parsePercent(pos.height) / 100) * canvas.height
        drawFill(ctx, img, x, y, w, h)
      }
      continue
    }

    const img = await loadImage(src)

    const pos = genderLayerPositions[key]
    const x = (parsePercent(pos.left) / 100) * canvas.width
    const y = (parsePercent(pos.top) / 100) * canvas.height
    const w = (parsePercent(pos.width) / 100) * canvas.width
    const h = (parsePercent(pos.height) / 100) * canvas.height

    if (!FILL_CATEGORIES.has(key)) {
      drawContain(ctx, img, x, y, w, h)
      continue
    }

    if (!SILHOUETTE_MASKED_CATEGORIES.has(key)) {
      drawFill(ctx, img, x, y, w, h, getNeckCropRatio(key, neckFlags[key]))
      continue
    }

    const layerCanvas = document.createElement('canvas')
    layerCanvas.width = canvas.width
    layerCanvas.height = canvas.height
    const layerCtx = layerCanvas.getContext('2d')
    layerCtx.imageSmoothingEnabled = false
    drawFill(layerCtx, img, x, y, w, h, getNeckCropRatio(key, neckFlags[key]))
    layerCtx.globalCompositeOperation = 'destination-in'
    const trapezoidScale = MASK_TRAPEZOID_SCALE_BY_CATEGORY[key]
    if (trapezoidScale) {
      const topPct = parsePercent(pos.top) / 100
      const bottomPct = topPct + parsePercent(pos.height) / 100
      layerCtx.drawImage(
        widenMaskTrapezoid(maskImg, canvas.width, canvas.height, { topPct, bottomPct, ...trapezoidScale }),
        0,
        0
      )
    } else {
      layerCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height)
    }

    ctx.drawImage(layerCanvas, 0, 0)
  }

  // drawn last (on top of all clothing) to match LAYER_Z_INDEX.hair being the
  // highest z-index in the live preview — see dollLayout.js's own comment.
  const hairSrc = HAIR_IMAGES[gender]?.[hairStyle]
  if (hairSrc) {
    const hairImg = await loadImage(hairSrc)
    const hairPos = getHairPosition(gender, hairStyle)
    const hx = (parsePercent(hairPos.left) / 100) * canvas.width
    const hy = (parsePercent(hairPos.top) / 100) * canvas.height
    const hw = (parsePercent(hairPos.width) / 100) * canvas.width
    const hh = (parsePercent(hairPos.height) / 100) * canvas.height
    drawContain(ctx, hairImg, hx, hy, hw, hh)
  }

  return canvas.toDataURL('image/png')
}

function parsePercent(value) {
  return parseFloat(value)
}

/**
 * Scales a { top, left, width, height } (percentage-string) box by `scale`
 * around its own center — used for HEAD_POSITIONS, since a face crop already
 * fills its own canvas nearly edge-to-edge (see the face image pipeline in
 * dollLayout.js), leaving no spare canvas margin to trim for a *bigger*
 * render within a fixed box (object-fit: contain can only shrink-to-fit,
 * never overflow its box). Scaling the box itself has no such ceiling.
 * Scaling around the center (not the top-left corner) keeps the box anchored
 * on the same point instead of drifting when it grows/shrinks.
 */
function scalePositionBox(pos, scale) {
  if (scale === 1) return pos
  const left = parsePercent(pos.left)
  const top = parsePercent(pos.top)
  const width = parsePercent(pos.width)
  const height = parsePercent(pos.height)
  const cx = left + width / 2
  const cy = top + height / 2
  const newWidth = width * scale
  const newHeight = height * scale
  return {
    left: `${cx - newWidth / 2}%`,
    top: `${cy - newHeight / 2}%`,
    width: `${newWidth}%`,
    height: `${newHeight}%`,
  }
}

/**
 * `object-fit: contain` for canvas: draws `img` scaled to fit inside the
 * (x, y, w, h) box without stretching, centered on both axes. Used for the
 * face and accessory layers, where the box height is a meaningful constraint
 * (a head or a collar really is that tall) so shrink-to-fit-both-dimensions
 * is correct. `rotateDeg` (optional) rotates the drawn image around the
 * box's own center — used for wrist accessories, whose zone box in
 * dollLayout.js carries a `rotate` matching the doll's own wrist/forearm
 * tilt at that point (measured off the base illustration's silhouette), so
 * a bracelet/watch photo (uploaded straight-on) sits angled the same way
 * the wrist itself is angled instead of looking pasted on flat.
 */
function drawContain(ctx, img, x, y, w, h, rotateDeg = 0) {
  const scale = Math.min(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  if (!rotateDeg) {
    ctx.drawImage(img, dx, dy, dw, dh)
    return
  }
  const cx = x + w / 2
  const cy = y + h / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((rotateDeg * Math.PI) / 180)
  ctx.drawImage(img, dx - cx, dy - cy, dw, dh)
  ctx.restore()
}

/**
 * `object-fit: fill` for canvas: stretches `img` to exactly (w, h),
 * ignoring its own aspect ratio. Used for every masked clothing category so
 * the garment always fully covers its assigned body-part box — z-order +
 * silhouette masking keep the result looking correct even when stretched.
 *
 * `neckCropRatio` (0-1, see NECK_CROP_RATIO in dollLayout.js) first drops
 * that fraction off the *source* image's own top edge — used for garment
 * categories with a real-world neckline, so the photo's own curved collar
 * cutout is skipped and the remaining flat slice lands on the box's flat
 * top edge instead, reading as a snug fit at the neck rather than showing
 * the photo's own neck-hole shape.
 */
function drawFill(ctx, img, x, y, w, h, neckCropRatio = 0) {
  if (!neckCropRatio) {
    ctx.drawImage(img, x, y, w, h)
    return
  }
  const sy = img.height * neckCropRatio
  const sh = img.height - sy
  ctx.drawImage(img, 0, sy, img.width, sh, x, y, w, h)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default DollCanvas
