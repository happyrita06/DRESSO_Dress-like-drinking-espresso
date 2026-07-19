/**
 * Pure canvas-based image pixelation — no external/AI API calls.
 *
 * Pipeline:
 *  0. "구조 인식" (structure recognition): try to isolate the garment from
 *     its background — sample the photo's border pixels to estimate the
 *     background color, then flood-fill inward from every border pixel that
 *     matches it to find the connected background region (so a similarly-
 *     colored patch fully enclosed *inside* the garment, e.g. a white button
 *     placket, isn't mistaken for background). The fill is two-tier — a
 *     pixel only *seeds* the fill by matching the single global background
 *     estimate, but once inside, it *grows* into any neighbor close to the
 *     background pixel it's spreading from (not just the global estimate).
 *     This matters for real studio photos, which are rarely one flat color:
 *     a shadow/vignette gradient (e.g. darker corners under the garment)
 *     drifts far enough from the global average that a single fixed
 *     threshold leaves those corners stranded as "foreground," which then
 *     also blows out the crop's bounding box to the full frame edge (see
 *     `LOCAL_BG_COLOR_DISTANCE_THRESHOLD`'s own comment). Local growth
 *     tracks that drift step by step instead. Then tightly crop to the
 *     remaining foreground's bounding box with the background made
 *     transparent. Only
 *     applied when confident (the background forms a plausible plain-ish
 *     border region, not too little/too much of the frame) — a busy/complex
 *     photo background falls back to using the full original photo
 *     untouched, same as before this step existed. This is genuine
 *     pixel-level foreground/background segmentation done with plain canvas
 *     operations; it is NOT pose estimation or perspective correction (no
 *     model for that exists here — see README/PR notes for why "front-view
 *     conversion" isn't implemented).
 *  1. Draw the (possibly isolated) source into a tiny off-screen canvas
 *     (`pixelWidth` x `pixelHeight`) with `drawImage`, forcing the browser's
 *     downscale to do the heavy-lifting of averaging neighbourhoods of the
 *     original into each output pixel.
 *  2. Read that tiny canvas back with `getImageData` and quantize every RGB
 *     channel to `colorLevels` evenly spaced steps
 *     (`Math.round(value / step) * step`, `step = 256 / colorLevels`) — this
 *     is what gives the flat, "limited palette" pixel-art look while still
 *     keeping enough steps that soft gradients don't band into mush.
 *  3. Blow the quantized tiny image back up to `outputWidth` x `outputHeight`
 *     with `ctx.imageSmoothingEnabled = false`, so the upscale is a hard
 *     nearest-neighbour block-replicate (crisp squares) instead of a blurry
 *     interpolation.
 */

// how far (Euclidean, 0-441) a pixel's RGB must be from the estimated
// background color to count as foreground/garment. Was raised 42->60 to
// stop a white fringe surviving around the arm/sleeve area, but 60 proved
// too aggressive the other direction — it started eating into the garment
// itself (light/white clothing areas misread as background). Settled at 50
// as the middle ground per an explicit follow-up request.
const BG_COLOR_DISTANCE_THRESHOLD = 50
// how far a candidate pixel's RGB may be from the *already-classified
// background pixel it's spreading from* (not the single global estimate) to
// also count as background during flood-fill growth — see the "구조 인식"
// pipeline note above. Deliberately much tighter than the global threshold:
// this only needs to tolerate one step of gradient/shadow drift between
// adjacent pixels, not the full swing between a photo's lightest and
// darkest background regions. Verified against a real garment photo with a
// bottom-corner shadow vignette (flat 50 alone stranded both bottom corners
// as unremoved "foreground," which also forced the crop's bounding box out
// to the full frame width since those corners touch the left/right edges):
// 26 already leaked into the garment's own soft fabric shading, 10 cleanly
// caught both corners with no leakage into the garment.
const LOCAL_BG_COLOR_DISTANCE_THRESHOLD = 10
// Per-category override of the local growth threshold above. 'bottom'
// (하의) photos started producing visibly wrong cutouts once local growth
// shipped — pants/skirts commonly have their own soft fabric-shading
// gradient (denim fade, corduroy ridges, fold shadows) that a threshold of
// 10 was still enough to walk through, unlike the jacket photo this was
// tuned against. Lowered specifically for this category per an explicit
// follow-up request ("bottom 쪽만 민감하게 낮춰줘") rather than lowering the
// shared default, which would undo the bottom-corner-vignette fix for every
// other category. Falls back to LOCAL_BG_COLOR_DISTANCE_THRESHOLD when a
// category has no override listed.
const LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY = {
  bottom: 5,
}
// A white/silver necklace photo on a white/light studio background was
// leaving an unremoved white halo around the chain ("하얀 부분" surviving
// extraction). First attempt raised BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY
// for the whole 'accessory' category flat — that caught the halo but also
// ate into the necklace's own near-white/metallic highlights, erasing parts
// of the necklace itself ("목걸이 자체도 지워버려서"). Reverted that flat
// per-category bump per an explicit follow-up request: colors other than
// white must keep behaving exactly like the shared defaults above. Instead,
// the extra tolerance below applies ONLY when the *candidate pixel itself*
// reads as near-white (see `isNearWhite`) — a genuinely white/near-white
// pixel gets this more permissive distance-from-background-estimate
// threshold, while every other color (including a necklace's non-white
// metal/gem tones) still uses the tight shared default. Falls back to the
// relevant shared default when a category has no override listed.
const NEAR_WHITE_CHANNEL_MIN = 225
function isNearWhite(r, g, b) {
  return r >= NEAR_WHITE_CHANNEL_MIN && g >= NEAR_WHITE_CHANNEL_MIN && b >= NEAR_WHITE_CHANNEL_MIN
}
const WHITE_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY = {
  accessory: 75,
}
const WHITE_LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY = {
  accessory: 22,
}
// if the flood-filled background covers less than this fraction of the
// frame, there probably isn't a real plain background to remove (e.g. a
// busy photo, or the garment fills the whole frame) — skip extraction.
const MIN_BACKGROUND_FRACTION = 0.04
// if the cropped foreground's width or height comes out under this fraction
// of the original frame, the flood fill almost certainly ate into the
// garment itself rather than found a genuinely tiny subject — skip
// extraction rather than hand back a sliver.
const MIN_FOREGROUND_DIMENSION_FRACTION = 0.25
// if it covers more than this, the "background" detection likely misfired
// (matched into the garment itself) — skip extraction rather than risk
// cropping the garment down to nothing.
const MAX_BACKGROUND_FRACTION = 0.93
// Per-category override of the cap above. 'shoes' photos are routinely two
// small objects (a left shoe + a right shoe) shot with generous surrounding
// studio space, so their background can legitimately cover well over 93% of
// the frame — that was tripping this guard and bailing extraction out
// entirely (falling back to the raw, un-keyed original photo, so *nothing*
// got cut, not just the gap between the shoes — "누끼 따지지 않았어. 전혀"
// per an explicit follow-up report). Raised specifically for this category
// rather than the shared cap, which exists to catch a background match that
// misfired into the garment itself — a risk that doesn't scale with how
// much of the frame is legitimately empty studio space.
const MAX_BACKGROUND_FRACTION_BY_CATEGORY = {
  shoes: 0.985,
}
// working resolution cap for the segmentation pass — this only needs to be
// big enough to find a clean silhouette/bounding box, not present detail
// (that comes from the original image in the later pixelation steps).
const SEGMENTATION_MAX_DIM = 640

/**
 * @param {File|Blob|HTMLImageElement} imageSource - a File/Blob (read via
 *   FileReader) or an already-loaded HTMLImageElement.
 * @param {object} [options]
 * @param {number} [options.pixelWidth=28] - width (px) of the intermediate
 *   low-res canvas. Lower = chunkier pixels. Recommended range 16-32; the
 *   default (28) stays recognizable while still reading as "pixel art".
 * @param {number} [options.pixelHeight] - height (px) of the intermediate
 *   canvas. Defaults to `pixelWidth * (source aspect ratio)` so proportions
 *   aren't stretched; pass explicitly to force a fixed aspect (e.g. taller
 *   for outer/top/bottom, flatter for shoes).
 * @param {number} [options.colorLevels=28] - number of quantization steps per
 *   RGB channel (256 / colorLevels = step size). Higher = smoother gradients
 *   survive, lower = flatter/more posterized. 24-32 keeps most clothing
 *   photos' shading intact while still looking hand-pixelated; avoid going
 *   much below ~12 or color banding gets harsh.
 * @param {number} [options.outputWidth=256] - final displayed canvas width in
 *   CSS px (the low-res buffer is scaled up to this with nearest-neighbour).
 * @param {number} [options.outputHeight] - final displayed canvas height;
 *   defaults to keep the same aspect ratio as the intermediate canvas.
 * @param {string} [options.category] - wardrobe category ('top', 'bottom',
 *   etc.) this photo is for. Only affects the step-0 extraction pass's local
 *   growth threshold — see `LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY` —
 *   and is safe to omit for categories with no listed override.
 * @param {boolean} [options.extractForeground=false] - run the step-0
 *   background-removal/crop pass before pixelating. Off by default: for a
 *   common case — a garment with white/light coloring shot on a white/light
 *   studio background — the two are colorimetrically indistinguishable, so
 *   the flood fill can eat into the actual garment instead of stopping at
 *   its edge, cropping the result down to a sliver. There's a size-sanity
 *   check in `extractGarmentForeground` that rejects the most extreme cases
 *   of this, but not the milder ones, so this stays an explicit opt-in
 *   rather than the default until it's more robust.
 * @returns {Promise<string>} a `data:image/png;base64,...` data URL of the
 *   pixelated result.
 */
export function pixelateImage(
  imageSource,
  { extractForeground = false, category, ...pixelateOptions } = {}
) {
  return loadImageElement(imageSource).then((img) => {
    const source = extractForeground ? extractGarmentForeground(img, category) ?? img : img
    return pixelateSource(source, pixelateOptions)
  })
}

/**
 * Steps 1-3 of the pipeline (downscale-average / quantize / nearest-neighbour
 * upscale) factored out of `pixelateImage` so `pixelateShoePair` can run them
 * directly on an already-segmented blob canvas (see below) without re-running
 * foreground extraction on a crop that's already isolated.
 */
function pixelateSource(source, { pixelWidth = 28, pixelHeight, colorLevels = 28, outputWidth = 256, outputHeight } = {}) {
  const srcW = source.naturalWidth || source.width
  const srcH = source.naturalHeight || source.height
  const aspect = srcH / srcW || 1

  const smallW = Math.max(1, Math.round(pixelWidth))
  const smallH = Math.max(1, Math.round(pixelHeight ?? pixelWidth * aspect))

  // Step 1: downscale the (possibly isolated) source into the tiny
  // intermediate canvas.
  const smallCanvas = document.createElement('canvas')
  smallCanvas.width = smallW
  smallCanvas.height = smallH
  const smallCtx = smallCanvas.getContext('2d')
  smallCtx.imageSmoothingEnabled = true
  smallCtx.drawImage(source, 0, 0, smallW, smallH)

  // Step 2: quantize every channel to `colorLevels` evenly spaced steps.
  const levels = Math.max(2, Math.round(colorLevels))
  const step = 256 / levels
  const imageData = smallCtx.getImageData(0, 0, smallW, smallH)
  const { data } = imageData
  for (let i = 0; i < data.length; i += 4) {
    data[i] = quantizeChannel(data[i], step)
    data[i + 1] = quantizeChannel(data[i + 1], step)
    data[i + 2] = quantizeChannel(data[i + 2], step)
    // alpha (data[i + 3]) left untouched so transparency is preserved
  }
  smallCtx.putImageData(imageData, 0, 0)

  // Step 3: upscale to the display size with nearest-neighbour (no blur).
  const outW = Math.max(1, Math.round(outputWidth))
  const outH = Math.max(1, Math.round(outputHeight ?? outputWidth * (smallH / smallW)))
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d')
  outCtx.imageSmoothingEnabled = false
  outCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, outW, outH)

  return outCanvas.toDataURL('image/png')
}

// Two shoes photographed side by side have real background visible between
// them (see extractGarmentForeground's own "구조 인식" comment on why that gap
// is deliberately left as a clean cutout, not filled) — that gap used to get
// stretched into the middle of the single shoes box, landing right where the
// doll's two legs are and showing the body illustration through the gap
// ("신발끼리 떨어져있으면 몸 일러스트가 보이는 듯"). `pixelateShoePair`
// detects the two separate shoe blobs, crops each on its own, and pixelates
// them independently so each half of the (now split, see shoesLeft/
// shoesRight in dollLayout.js) shoes box only ever draws its own shoe, no
// source-photo gap pixels involved. Only a MIN_SHOE_BLOB_AREA_FRACTION-sized
// pair of blobs with non-overlapping x-ranges counts as "confidently two
// shoes" — anything else (one blob, 3+, overlapping/touching shoes) returns
// `null` so the caller can fall back to the legacy single-stretch behavior
// (still available via `pixelateImage`) rather than risk a bad crop.
const MIN_SHOE_BLOB_AREA_FRACTION = 0.01
const SHOE_BLOB_PADDING_FRACTION = 0.04

export function pixelateShoePair(imageSource, { category, ...pixelateOptions } = {}) {
  return loadImageElement(imageSource).then((img) => {
    const blobs = detectShoeBlobs(img, category)
    if (!blobs) return null
    const [leftCanvas, rightCanvas] = blobs
    return {
      left: pixelateSource(leftCanvas, pixelateOptions),
      right: pixelateSource(rightCanvas, pixelateOptions),
    }
  })
}

/**
 * Runs the same border-flood-fill segmentation as `extractGarmentForeground`,
 * then connected-component-labels the remaining foreground pixels (4-
 * connectivity) to find distinct blobs. Returns `[leftCanvas, rightCanvas]`
 * (each background-transparent, tightly cropped with a little padding) when
 * exactly two significant, non-overlapping (by x-range) blobs are found —
 * "photo-left" and "photo-right" map straight onto the screen-left/right
 * halves of the (split) shoes box, the same left-to-right orientation a
 * single stretched photo already used. Returns `null` otherwise.
 */
function detectShoeBlobs(img, category) {
  const seg = segmentForeground(img, category)
  if (!seg) return null
  const { data, w, h, visited } = seg

  const labels = new Int32Array(w * h).fill(-1)
  const blobs = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (visited[idx] || labels[idx] !== -1) continue
      const stack = [idx]
      labels[idx] = blobs.length
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let area = 0
      while (stack.length) {
        const cur = stack.pop()
        const cx = cur % w
        const cy = (cur - cx) / w
        area++
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
        if (cx > 0) tryPush(cur - 1)
        if (cx < w - 1) tryPush(cur + 1)
        if (cy > 0) tryPush(cur - w)
        if (cy < h - 1) tryPush(cur + w)
      }
      blobs.push({ minX, maxX, minY, maxY, area })

      function tryPush(n) {
        if (visited[n] || labels[n] !== -1) return
        labels[n] = blobs.length
        stack.push(n)
      }
    }
  }

  const minArea = MIN_SHOE_BLOB_AREA_FRACTION * w * h
  const significant = blobs.filter((b) => b.area >= minArea)
  if (significant.length !== 2) return null // not confidently two separate shoes

  significant.sort((a, b) => a.minX + a.maxX - (b.minX + b.maxX))
  const [leftBlob, rightBlob] = significant
  // overlapping x-ranges means they're not cleanly side-by-side (angled
  // shot, touching shoes, etc.) — bail rather than crop something that would
  // cut one shoe in half.
  if (leftBlob.maxX > rightBlob.minX) return null

  // The padding margin below is symmetric by default, but padding outward on
  // the side facing the *other* shoe risks pulling a sliver of the real gap
  // between the two shoes back into the crop as opaque pixels — the flood
  // fill only marks background reachable from the frame edges, and a
  // shadow/gradient in that gap can fail the background color-distance
  // check without ever touching an edge, surviving as unremoved "foreground"
  // once padding reaches into it. Skipping padding on just the inner-facing
  // edge of each blob keeps the safety margin everywhere else while
  // guaranteeing neither crop ever reaches past its own detected foreground
  // toward the other shoe.
  //
  // That alone isn't enough, though: a real shoe/boot's silhouette is rarely
  // a perfect rectangle (an ankle boot's collar is routinely narrower than
  // its sole), so even a perfectly-tight crop can have rows where the
  // opaque pixels stop short of the crop's own inner edge. Since
  // shoesLeft/shoesRight (dollLayout.js) are drawn with `drawFill` (a
  // straight stretch to a rectangular box, no silhouette masking — see
  // SILHOUETTE_MASKED_CATEGORIES in DollCanvas.jsx), any such short row
  // stretches into a visible light gap at the seam between the two feet
  // ("하의가 발목 안쪽이 비어있다" — actually the shoes layer failing to
  // reach the seam, not the pants). `extendRowsToInnerEdge` closes that by
  // extending each row's nearest-to-seam opaque pixel out to the crop's own
  // inner edge, only on that one seam-facing side — the outer/top/bottom
  // edges keep the real photographed silhouette untouched.
  return [
    extendRowsToInnerEdge(cropBlobWithPadding(data, w, h, visited, leftBlob, { padRight: false }), 'right'),
    extendRowsToInnerEdge(cropBlobWithPadding(data, w, h, visited, rightBlob, { padLeft: false }), 'left'),
  ]
}

function cropBlobWithPadding(data, w, h, visited, blob, { padLeft = true, padRight = true } = {}) {
  const padX = Math.round((blob.maxX - blob.minX + 1) * SHOE_BLOB_PADDING_FRACTION)
  const padY = Math.round((blob.maxY - blob.minY + 1) * SHOE_BLOB_PADDING_FRACTION)
  const minX = Math.max(0, blob.minX - (padLeft ? padX : 0))
  const maxX = Math.min(w - 1, blob.maxX + (padRight ? padX : 0))
  const minY = Math.max(0, blob.minY - padY)
  const maxY = Math.min(h - 1, blob.maxY + padY)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')
  const outData = ctx.createImageData(cropW, cropH)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (y + minY) * w + (x + minX)
      const srcOffset = srcIdx * 4
      const dstOffset = (y * cropW + x) * 4
      outData.data[dstOffset] = data[srcOffset]
      outData.data[dstOffset + 1] = data[srcOffset + 1]
      outData.data[dstOffset + 2] = data[srcOffset + 2]
      outData.data[dstOffset + 3] = visited[srcIdx] ? 0 : 255
    }
  }
  ctx.putImageData(outData, 0, 0)
  return canvas
}

/**
 * For every row that has at least one opaque pixel, extends that row's
 * nearest-to-`side` opaque pixel out to the canvas's own edge on that side
 * (flat color/alpha repeat) — closing any gap left by a non-rectangular
 * garment silhouette stretched into a rectangular box. Rows with no opaque
 * pixel at all (above/below the garment, inside its own padding margin) are
 * left untouched. See detectShoeBlobs' own comment for why this only runs
 * on the inner (seam-facing) edge of each shoe crop.
 */
// How far (as a fraction of the crop's own width) a row's nearest-to-edge
// opaque pixel may be extended out to the seam. Extending unconditionally
// (any distance) closed the light-gap bug for a plain matte boot, but a
// glossy/patent boot with a bright highlight or lace-loop pixel near its
// inner edge produced an obviously wrong smeared/gradient streak once that
// one pixel's color got stretched across a wide gap ("발과 발 사이에
// 이상하게 늘어졌어" — a striped gray artifact between the feet, reported
// with a screenshot of exactly that). A row whose real content stops this
// far from the edge is more likely a genuine part of the boot's shape (the
// ankle collar curving away) than a segmentation gap worth papering over —
// better to leave a small transparent sliver there than smear a highlight
// pixel across a large area.
const MAX_INNER_EDGE_EXTEND_FRACTION = 0.08

function extendRowsToInnerEdge(canvas, side) {
  const w = canvas.width
  const h = canvas.height
  const maxGap = MAX_INNER_EDGE_EXTEND_FRACTION * w
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, w, h)
  const { data } = imageData
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w * 4
    if (side === 'right') {
      let x = w - 1
      while (x >= 0 && data[rowOffset + x * 4 + 3] === 0) x--
      if (x < 0 || x === w - 1 || w - 1 - x > maxGap) continue
      const srcOffset = rowOffset + x * 4
      const [r, g, b, a] = [data[srcOffset], data[srcOffset + 1], data[srcOffset + 2], data[srcOffset + 3]]
      for (let fx = x + 1; fx < w; fx++) {
        const offset = rowOffset + fx * 4
        data[offset] = r
        data[offset + 1] = g
        data[offset + 2] = b
        data[offset + 3] = a
      }
    } else {
      let x = 0
      while (x < w && data[rowOffset + x * 4 + 3] === 0) x++
      if (x >= w || x === 0 || x > maxGap) continue
      const srcOffset = rowOffset + x * 4
      const [r, g, b, a] = [data[srcOffset], data[srcOffset + 1], data[srcOffset + 2], data[srcOffset + 3]]
      for (let fx = 0; fx < x; fx++) {
        const offset = rowOffset + fx * 4
        data[offset] = r
        data[offset + 1] = g
        data[offset + 2] = b
        data[offset + 3] = a
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * "구조 인식" step: the border-flood-fill background segmentation shared by
 * `extractGarmentForeground` (single tight bbox crop) and `detectShoeBlobs`
 * (connected-component split into two crops) above. Returns
 * `{ data, w, h, visited }` — `visited[y*w+x]` truthy means that pixel was
 * classified as background — or `null` if the background couldn't be
 * confidently identified (busy photo, garment fills the whole frame, etc.),
 * in which case the caller should fall back to the original image untouched.
 */
function segmentForeground(img, category) {
  const naturalW = img.naturalWidth || img.width
  const naturalH = img.naturalHeight || img.height
  if (!naturalW || !naturalH) return null

  const scale = Math.min(1, SEGMENTATION_MAX_DIM / Math.max(naturalW, naturalH))
  const w = Math.max(1, Math.round(naturalW * scale))
  const h = Math.max(1, Math.round(naturalH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const bg = estimateBackgroundColor(data, w, h)
  const whiteGlobalThreshold = WHITE_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY[category] ?? BG_COLOR_DISTANCE_THRESHOLD
  const globalThresholdFor = (offset) =>
    isNearWhite(data[offset], data[offset + 1], data[offset + 2]) ? whiteGlobalThreshold : BG_COLOR_DISTANCE_THRESHOLD
  const isGlobalBackgroundColor = (i) => colorDistance(data, i, bg) <= globalThresholdFor(i)
  const localThreshold = LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY[category] ?? LOCAL_BG_COLOR_DISTANCE_THRESHOLD
  const whiteLocalThreshold = WHITE_LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY[category] ?? localThreshold
  const localThresholdFor = (offset) =>
    isNearWhite(data[offset], data[offset + 1], data[offset + 2]) ? whiteLocalThreshold : localThreshold

  // BFS flood fill, seeded from every border pixel that matches the global
  // background estimate so only the background *connected to the frame
  // edge* is removed — an enclosed same-colored region inside the garment
  // (a white shirt placket, say) isn't mistaken for background. Growth from
  // there also accepts a neighbor close to the specific background pixel
  // it's spreading from, so a gradient/shadowed background is tracked
  // instead of stopping wherever it first drifts past the global estimate.
  const visited = new Uint8Array(w * h)
  const queue = []
  for (let x = 0; x < w; x++) {
    pushSeedIfBackground(x, 0)
    pushSeedIfBackground(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    pushSeedIfBackground(0, y)
    pushSeedIfBackground(w - 1, y)
  }

  function pushSeedIfBackground(x, y) {
    const idx = y * w + x
    if (visited[idx]) return
    if (!isGlobalBackgroundColor(idx * 4)) return
    visited[idx] = 1
    queue.push(idx)
  }

  function pushGrownIfBackground(x, y, fromIdx) {
    const idx = y * w + x
    if (visited[idx]) return
    const offset = idx * 4
    const closeToParent = colorDistance(data, offset, sampleColor(data, fromIdx)) <= localThresholdFor(offset)
    if (!closeToParent && !isGlobalBackgroundColor(offset)) return
    visited[idx] = 1
    queue.push(idx)
  }

  let head = 0
  while (head < queue.length) {
    const idx = queue[head++]
    const x = idx % w
    const y = (idx - x) / w
    if (x > 0) pushGrownIfBackground(x - 1, y, idx)
    if (x < w - 1) pushGrownIfBackground(x + 1, y, idx)
    if (y > 0) pushGrownIfBackground(x, y - 1, idx)
    if (y < h - 1) pushGrownIfBackground(x, y + 1, idx)
  }

  const backgroundCount = queue.length
  const backgroundFraction = backgroundCount / (w * h)
  const maxBackgroundFraction = MAX_BACKGROUND_FRACTION_BY_CATEGORY[category] ?? MAX_BACKGROUND_FRACTION
  if (backgroundFraction < MIN_BACKGROUND_FRACTION || backgroundFraction > maxBackgroundFraction) {
    return null // not confident there's a removable plain background
  }

  return { data, w, h, visited }
}

/**
 * Isolates the garment from a plain-ish photo background using
 * `segmentForeground` above, and returns a tightly-cropped, background-
 * transparent canvas around the single overall bounding box of whatever's
 * left — or `null` (segmentation unconfident, or nothing left as
 * foreground), in which case the caller should fall back to the original
 * image untouched. For 'shoes' specifically, this treats a left+right shoe
 * pair as one combined region (see `detectShoeBlobs` above for the
 * alternative that crops each shoe on its own instead).
 */
function extractGarmentForeground(img, category) {
  const seg = segmentForeground(img, category)
  if (!seg) return null
  const { data, w, h, visited } = seg

  // tight bounding box of the remaining foreground
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y * w + x]) continue // background
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null // nothing left as foreground

  // 'shoes' photos are routinely two disjoint objects (a left shoe + a right
  // shoe) with real background visible between them. Two attempts at
  // bridging that gap so it wouldn't render as a hole over the doll's ankle
  // were both tried and both reverted: forcing it opaque with its own raw
  // backdrop color read as an obvious pale block between the shoes, and
  // recoloring it via nearest-edge clone-stretch read as a smeared gray
  // distortion across the middle instead of two shoes ("신발 가운데에
  // 이상하게 회색으로 늘어나 있고 신발 사진이 일그러졌어. 가운데 누끼 좀
  // 제대로 따줘" — explicitly asking for that gap to stay a clean cutout,
  // not filled). So this single-bbox path gets no special-casing: the flood
  // fill's own background/foreground call stands as-is, same as every other
  // category — `pixelateShoePair`/`detectShoeBlobs` above is what actually
  // keeps that gap from landing on the doll, by cropping each shoe alone.
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  // guards the failure mode where a same-ish-colored garment (a white top
  // on a white backdrop, say) lets the flood fill eat into the garment
  // itself: if what's left is a sliver of the original frame, this almost
  // certainly over-erased rather than found a small real garment.
  if (cropW / w < MIN_FOREGROUND_DIMENSION_FRACTION || cropH / h < MIN_FOREGROUND_DIMENSION_FRACTION) {
    return null
  }

  const outCanvas = document.createElement('canvas')
  outCanvas.width = cropW
  outCanvas.height = cropH
  const outCtx = outCanvas.getContext('2d')
  const outData = outCtx.createImageData(cropW, cropH)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (y + minY) * w + (x + minX)
      const srcOffset = srcIdx * 4
      const dstOffset = (y * cropW + x) * 4
      outData.data[dstOffset] = data[srcOffset]
      outData.data[dstOffset + 1] = data[srcOffset + 1]
      outData.data[dstOffset + 2] = data[srcOffset + 2]
      outData.data[dstOffset + 3] = visited[srcIdx] ? 0 : 255
    }
  }
  outCtx.putImageData(outData, 0, 0)
  return outCanvas
}

/** Averages a ring of border pixels (a few px thick) as the background estimate. */
function estimateBackgroundColor(data, w, h) {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  const ringDepth = Math.max(1, Math.round(Math.min(w, h) * 0.02))
  const addPixel = (x, y) => {
    const i = (y * w + x) * 4
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  for (let d = 0; d < ringDepth; d++) {
    for (let x = 0; x < w; x++) {
      addPixel(x, d)
      addPixel(x, h - 1 - d)
    }
    for (let y = 0; y < h; y++) {
      addPixel(d, y)
      addPixel(w - 1 - d, y)
    }
  }
  return count === 0 ? [255, 255, 255] : [r / count, g / count, b / count]
}

function colorDistance(data, offset, [br, bg, bb]) {
  const dr = data[offset] - br
  const dg = data[offset + 1] - bg
  const db = data[offset + 2] - bb
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/** Reads the RGB of pixel `idx` (as set by `y * w + x`) as a [r, g, b] triple. */
function sampleColor(data, idx) {
  const offset = idx * 4
  return [data[offset], data[offset + 1], data[offset + 2]]
}

function quantizeChannel(value, step) {
  const quantized = Math.round(value / step) * step
  return Math.min(255, Math.max(0, quantized))
}

/** Resolves any supported imageSource into a loaded HTMLImageElement. */
function loadImageElement(imageSource) {
  if (imageSource instanceof HTMLImageElement) {
    if (imageSource.complete && imageSource.naturalWidth) return Promise.resolve(imageSource)
    return new Promise((resolve, reject) => {
      imageSource.addEventListener('load', () => resolve(imageSource), { once: true })
      imageSource.addEventListener('error', reject, { once: true })
    })
  }

  // File/Blob: read as a data URL, then load into a fresh <img>.
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result
    }
    reader.readAsDataURL(imageSource)
  })
}

export default pixelateImage
