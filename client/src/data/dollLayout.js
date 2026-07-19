/**
 * Placement constants for PixelDressUp's paper-doll canvas. Every value is a
 * percentage of the doll base's own bounding box (see DollCanvas.module.css's
 * `.stage`), so the whole layout scales with the stage instead of being
 * pinned to hardcoded pixel offsets — keeps this tweakable in one place
 * without touching DollCanvas.jsx's render logic.
 *
 * z-index order (low → high) matches an explicit follow-up request
 * (악세서리 > 상의 > 하의 > 신발, "먼저 입력한 게 제일 위 레이어" — accessory
 * topmost, then top, then bottom, then shoes at the very bottom): shoes <
 * bottom < top < accessory. 'outer' wasn't named in that request — kept
 * directly under accessory (i.e. above top), matching its prior relative
 * position as outerwear layered over the top.
 */
export const CATEGORY_ORDER = ['shoes', 'bottom', 'top', 'outer', 'accessory']

// z-index order (low -> high): base illustration (implicit 0) < face (head
// overlay) < hair (wig, framing the face with a cutout hole so face still
// shows through) < shoes < bottom < top < outer < accessory. See
// CATEGORY_ORDER's own comment above for the follow-up request behind this
// order.
export const LAYER_Z_INDEX = {
  face: 1,
  hair: 2,
  shoes: 3,
  bottom: 4,
  top: 5,
  outer: 6,
  accessory: 7,
}

// { top, left, width, height } as % of the doll stage's own box — gender-
// specific because the two body illustrations aren't identical proportions.
// These are the doll-{gender}-mask.png silhouette's own measured pixel
// edges (not eyeballed): for each category, the exact leftmost/rightmost
// opaque column within its vertical band. outer/top use the shoulder→waist
// band's true arm+torso span; bottom uses the waist→ankle band's hip span
// with the hand/arm columns excluded from the measurement (arms are still
// technically within that y-range, so measuring naively there overstates
// the true hip width by ~20 points — the excluded-column sampling in
// scripts/generate-doll-assets fixes that); shoes use the ankle→sole band's
// foot span. This is what makes an uploaded photo's *size*, not just its
// position, actually match the doll's real body edges — see also the
// mask-based silhouette clipping in DollCanvas.jsx (MASKED_CATEGORIES),
// which then cuts each garment down to the body's real opaque pixels within
// that box so it conforms to the actual (tapered, non-rectangular) shape.
//
// ---------------------------------------------------------------------------
// COVERAGE RULE (applies to every entry in MASKED_CATEGORIES, i.e. every key
// here except accessory): each box must fully cover its body part across the
// box's *entire* vertical span, not just at one measured row. Because
// DollCanvas.jsx clips every masked layer to the body's real silhouette via
// 'destination-in', a box that's *too big* only ever gets trimmed back to
// the true silhouette (safe) — a box that's *too small* leaves a strip of
// bare doll/blank canvas showing (a visible bug, e.g. exposed ankles). So
// when in doubt, size each box to the body part's widest/tallest extent
// across its full range, plus a safety margin, never to the narrowest or
// most literal edge. Concretely:
//   - vertical (top/height): span the whole semantic segment end-to-end —
//     top/outer run neck-base (bottom edge of HEAD_POSITIONS, i.e. where the
//     face crop ends and the neck begins) down to the waist; bottom picks up
//     at that same waist line down to the ankle; shoes must start *above*
//     the ankle bone (not at the visible top-of-foot line) and run down to
//     the sole, so the shoe layer also covers the ankle instead of leaving
//     it exposed between the pants hem and the shoe.
//   - horizontal (left/width): use the body part's widest row within that
//     vertical band (e.g. bottom's box must be wide enough for the whole
//     hip→ankle leg band, not just the narrower waist-row hip measurement),
//     plus margin, since a real garment photo's own silhouette rarely
//     reaches exactly as far as the doll's — see also the outer/top note
//     below about sleeve span.
// outer/top both run neck-base→waist and bottom picks up exactly at that
// same waist line (52%/53%) down to the ankle, per the anatomical fit guide:
// jackets/tops end at the waist, pants start at the waist, shoes cover the
// feet (and, per the coverage rule above, the ankle too).
// accessory (necklace/hat/etc.) is intentionally NOT silhouette-masked
// (see MASKED_CATEGORIES in DollCanvas.jsx) since it sits over the
// head/collar, a region the headless body has no silhouette for.
// accessory is deliberately absent here — its position is resolved
// dynamically per-upload from a free-text memo, see `resolveAccessoryPosition`
// below.
// Every masked category now uses `object-fit: fill` semantics (DollCanvas.jsx's
// drawFill — stretches to both the box's width AND height, ignoring the
// source photo's own aspect ratio) rather than fitting by width alone: the
// brief is "the clothes must fully cover their assigned body part," and a
// fit-by-width photo could still fall short vertically depending on its own
// proportions, leaving a gap of bare skin above the next layer down. Since
// MASKED_CATEGORIES clips everything to the body's real silhouette anyway,
// stretching to guarantee full coverage is safe — any distortion this causes
// is far less noticeable than a visible gap. outer/top's width is also
// deliberately more generous than the measured arm-span edge, since a real
// garment photo's own sleeves rarely reach exactly as far as the doll's arms.
export const LAYER_POSITIONS = {
  f: {
    // top edge = HEAD_POSITIONS.f's bottom edge (31.75%, neck-base) with
    // height doubled (20.25%->40.5%) per an earlier follow-up request, then
    // extended a further ~3mm upward (top -2.25%, height +2.25%, bottom
    // edge unchanged at 72.25%) per a later request — 1mm on-screen ≈
    // 0.75% of stage height, the same conversion used elsewhere in this
    // file (see HEAD_POSITIONS' own nudge comments). Width then scaled 1.4x
    // around its own center (96%->134.4%, left recentred 2%->-17.2%) per a
    // follow-up request to stretch the garment photo itself wider rather
    // than patch coverage gaps in the pixelation step. Per a later
    // follow-up request, outer was set to reuse 'top's own box exactly
    // (see 'top' below) instead of its own independently-tuned box. Then,
    // per a later follow-up request, scaled 1.3x around its own center
    // (94.08%/33.338% -> 122.304%/43.339%, left/top recentred to
    // -11.152%/24.518%) — outer diverged from 'top'. That 1.3x scale was
    // reverted per a later follow-up request ("팔에 딱 안 맞아도 돼, 팔
    // 볼륨 줄이지 말고 상의처럼 둬") — outer once again reuses 'top's own
    // box exactly, since the wider box was shrinking the sleeve/arm fit
    // relative to 'top' rather than leaving it as generous.
    outer: { top: '29.519%', left: '2.96%', width: '94.08%', height: '33.338%' },
    // top nudged up 2mm (top -1.5%, 0.75%/mm) then stretched taller by 2.5mm
    // (height +1.875%) per an explicit follow-up request, independent of
    // outer (which keeps its original box). Later moved up a further 2mm
    // (top -1.5%, bottom edge shifts with it) and then had its range
    // extended upward by 4mm (top -3%, height +3%, bottom edge unchanged
    // from the prior step) per a later follow-up request. Moved up a
    // further 2.5mm (top -1.875%, height unchanged — the whole box shifts
    // up, bottom edge moves with it) per a later follow-up request. 'top'
    // was then dropped from DollCanvas.jsx's SILHOUETTE_MASKED_CATEGORIES
    // (see that file) so this box's own overflow past the body's real
    // silhouette is no longer trimmed automatically — that made the box's
    // deliberately-generous size (see the file-level coverage-rule note
    // above) visibly spill past both sides. Scaled 0.7x around its own
    // center (134.4%/47.625% -> 94.08%/33.338%, left/top recentred to
    // 2.96%/28.769%) per an explicit follow-up request to compensate. Moved
    // down a further 1mm (top +0.75%, 28.769%->29.519%; left/width/height
    // unchanged, so only the box's vertical position shifts) per a later
    // follow-up request.
    top: { top: '29.519%', left: '2.96%', width: '94.08%', height: '33.338%' },
    // width scaled 1.3x around its own center (82%->106.6%, left recentred
    // to -3.3%); height further scaled 1.1x anchored at the fixed 52% waist
    // line (36%->39.6%), both per explicit follow-up requests — deliberately
    // overflows the stage on all sides; the silhouette mask trims it back
    // to the real leg edges, so the overflow itself is harmless (see
    // coverage rule).
    bottom: { top: '52%', left: '-3.3%', width: '106.6%', height: '39.6%' },
    // top edge measured directly off doll-f-mask.png's real pixel data
    // (decoded the PNG's raw alpha channel and scanned per-row opaque
    // width): the leg's narrowest row (the ankle) sits at y=86.94% of the
    // canvas — box starts at 87.5% (86.5% + a ~1.3mm/0.98% nudge down).
    // Bottom stays pinned to the sole line (101%), well past the art's own
    // last opaque row (99.22%/97.86% base/mask). A later 1.5x "grow inward"
    // pass was reverted (it was making shoe uploads render distorted/
    // near-invisible) back to these values.
    // scaled 1.5x around its own center (114%/13.5% -> 171%/20.25%, left/top
    // recentred to -35.5%/84.125%) per an explicit follow-up request. Then
    // scaled 0.7x back down around that same center (171%/20.25% ->
    // 119.7%/14.175%, left/top recentred to -9.85%/87.163%) per a later
    // follow-up request — the 1.5x box was overflowing the stage's sides.
    // Fill-stretch to a too-short box was squishing shoe photos vertically,
    // so per a later follow-up request the box was extended upward by 3mm
    // with the sole (bottom) edge held fixed (top -2.25%, height +2.25%,
    // 0.75%/mm — same conversion used elsewhere in this file), then width
    // was reduced by 3mm around the box's own center (119.7%->117.45%, left
    // recentred to -8.725%) to compensate. Width then reduced a further 4mm
    // (3%) around that same center (117.45%->114.45%, left recentred to
    // -7.225%). Those two mm-scale nudges turned out too small to be
    // visible against the box's actual width:height ratio (still ~3.3:1),
    // so per a later follow-up request the box's aspect ratio was matched
    // to PixelDressUp.jsx's shoes pixelate output (240x135 = 16:9), sole
    // (bottom) edge held fixed, width unchanged: height grown to
    // width_units/(16/9) (277.09 asset-px / 1.778 = 155.86 -> 30.383% of
    // 513) and top raised to keep the bottom edge pinned at 101.338%. Then
    // scaled 0.7x around its own center (114.45%/30.383% -> 80.115%/
    // 21.268%, left/top recentred to 9.943%/75.512%) per a later follow-up
    // request. Then, per a later follow-up request: shifted down 3mm
    // (top +2.25%, 75.512%->77.762%, height unchanged — the whole box
    // moves down) to bring the sole closer to the doll's actual foot sole;
    // and width narrowed by 3mm total (1.5mm off each foot, bringing the
    // two feet 1.5mm closer together) around the box's own center
    // (80.115%->77.865%, left recentred to 11.0675%). Width narrowed a
    // further 4mm total (2mm off each foot) around that same center
    // (77.865%->74.865%, left recentred to 12.5675%) per a later follow-up
    // request. Width narrowed a further 5mm (3.75%) around that same
    // center per a later follow-up request ("폭 5mm 더 당기고"), then a
    // further 4mm total (2mm off each side, symmetric) per the same
    // request's second half — combined 9mm/6.75% (74.865%->68.115%, left
    // recentred to 15.9425%). Width narrowed a further 3mm per side
    // (6mm/4.5% total) around that same center (68.115%->63.615%, left
    // recentred to 18.1925%) per a later follow-up request.
    //
    // COVERAGE RULE (shoes-specific): shoes is deliberately NOT in
    // DollCanvas.jsx's SILHOUETTE_MASKED_CATEGORIES (see that file's own
    // comment — mask-clipping cut boot shafts down to almost nothing), so
    // nothing trims this box back to the doll's real silhouette the way the
    // generic file-level coverage rule above assumes — whatever this box's
    // own top/height say is exactly what gets covered, no safety net. A
    // later follow-up request flagged that the repeated center-anchored
    // width/height scaling above had drifted the *bottom* edge up off the
    // measured sole line (99.03% vs the original 101% pin), leaving a gap
    // below the foot uncovered — reported as "발목쪽이 좀 휘어져서 사진이
    // 인식된 듯" (an uploaded photo's own ragged extractForeground edge
    // showing through that gap). So the rule going forward: this box's
    // bottom edge must always stay pinned at the measured sole line (101%,
    // see the ankle/sole measurement comment above) and its top edge must
    // stay at or above the measured ankle row (87.5%) — any future
    // width-only edit (like the narrowing above) must not touch top/height,
    // and any future vertical edit must re-derive height from
    // (101% - top) rather than scaling top/height together. Height
    // corrected here to restore that pin: 101% - 77.762% = 23.238%.
    // Then, per a later follow-up request ("서로 4mm정도 더 안쪽으로
    // 붙여야... 발목부터 정강이가 안 덮여"): width narrowed a further 4mm
    // per side (8mm/6% total) around the box's own center (63.615%->
    // 57.615%, left recentred to 21.1925%); and top raised 5mm (3.75%,
    // 77.762%->74.012%) to extend coverage further up toward the shin,
    // with height re-derived from the sole-line pin per the rule above
    // (101% - 74.012% = 26.988%).
    shoes: { top: '74.012%', left: '21.1925%', width: '57.615%', height: '26.988%' },
  },
  m: {
    // top edge = HEAD_POSITIONS.m's bottom edge (32.77%, neck-base) with
    // height doubled (20.23%->40.46%), then extended ~3mm upward
    // (top -2.25%, height +2.25%, bottom unchanged at 73.23%); width scaled
    // 1.4x around its own center (96%->134.4%, left 2%->-17.2%) — see f's
    // comment above for rationale/conversion. Per the same later follow-up
    // request as f's outer above, outer was set to reuse 'top's own box
    // exactly (see 'top' below). Then, per the same later follow-up request
    // as f's outer above, scaled 1.3x around its own center (94.08%/33.31%
    // -> 122.304%/43.303%, left/top recentred to -11.152%/25.537%). Reverted
    // per the same later follow-up request as f's outer above — outer once
    // again reuses 'top's own box exactly.
    outer: { top: '30.533%', left: '2.96%', width: '94.08%', height: '33.31%' },
    // top nudged up 2mm (top -1.5%) then stretched taller by 2.5mm
    // (height +1.875%) per the same follow-up request as f's top above.
    // Later moved up a further 2mm and extended upward by 4mm, then a
    // further 2.5mm, then scaled 0.7x around its own center
    // (134.4%/47.585% -> 94.08%/33.31%, left/top recentred to
    // 2.96%/29.783%) — see f's top comment above for the exact same
    // follow-ups, including the later 1mm-down nudge (top +0.75%,
    // 29.783%->30.533%; left/width/height unchanged).
    top: { top: '30.533%', left: '2.96%', width: '94.08%', height: '33.31%' },
    // width scaled 1.3x around its own center (82%->106.6%, left -3.3%);
    // height scaled 1.1x anchored at the fixed 53% waist line
    // (35%->38.5%) — see f's comment above.
    bottom: { top: '53%', left: '-3.3%', width: '106.6%', height: '38.5%' },
    // top edge measured off doll-m-mask.png's real pixel data: the leg's
    // narrowest row (ankle) sits at y=84.04% of the canvas (mask governs
    // what's actually clippable/visible, so it takes precedence over the
    // base illustration's own, slightly lower, 90.91% reading) — box starts
    // at 84.98% (84% + a ~1.3mm/0.98% nudge down). Bottom stays pinned at
    // 100.98%, well past the art's own last opaque row (99.19%/97.78%
    // base/mask). A later 1.5x "grow inward" pass was reverted — see f's
    // comment above.
    // scaled 1.5x around its own center (117%/16% -> 175.5%/24%, left/top
    // recentred to -37.75%/80.98%) per the same follow-up request as f's
    // shoes above. Then scaled 0.7x back down around that same center
    // (175.5%/24% -> 122.85%/16.8%, left/top recentred to -11.425%/84.58%)
    // per the same later follow-up request as f's shoes above. Then, per
    // the same vertical-squish fix as f's shoes above, extended upward by
    // 3mm with the sole held fixed (top -2.25%, height +2.25%) and width
    // reduced by 3mm around the box's own center (122.85%->120.6%, left
    // recentred to -10.3%). Width then reduced a further 4mm (3%) around
    // that same center (120.6%->117.6%, left recentred to -8.8%). Same as
    // f's shoes above, those mm nudges were too small to read against the
    // box's ~3.3:1 ratio, so per the same later follow-up request the box's
    // aspect was matched to the 16:9 pixelate output, sole held fixed,
    // width unchanged: height grown to width_units/(16/9) (276.36 asset-px
    // / 1.778 = 155.45 -> 31.404% of 495) and top raised to keep the bottom
    // edge pinned at 101.38%. Then scaled 0.7x around its own center
    // (117.6%/31.404% -> 82.32%/21.983%, left/top recentred to 8.84%/
    // 74.687%) per the same later follow-up request as f's shoes above.
    // Then, per the same later follow-up request as f's shoes above:
    // shifted down 3mm (top +2.25%, 74.687%->76.937%, height unchanged);
    // and width narrowed by 3mm total (1.5mm off each foot) around the
    // box's own center (82.32%->80.07%, left recentred to 9.965%). Width
    // narrowed a further 4mm total (2mm off each foot) around that same
    // center (80.07%->77.07%, left recentred to 11.465%) per the same later
    // follow-up request as f's shoes above. Narrowed a further combined
    // 9mm/6.75% around that same center per the same later follow-up
    // request as f's shoes above (77.07%->70.32%, left recentred to
    // 14.84%). Narrowed a further 3mm per side (6mm/4.5% total) around that
    // same center (70.32%->65.82%, left recentred to 17.09%) per the same
    // later follow-up request as f's shoes above.
    //
    // See f's shoes COVERAGE RULE comment above — same fix applies here:
    // bottom edge restored to the measured sole line (100.98%), top left
    // unchanged, height re-derived as 100.98% - 76.937% = 24.043%. Then, per
    // the same later follow-up request as f's shoes above: width narrowed a
    // further 4mm per side (8mm/6% total) around the box's own center
    // (65.82%->59.82%, left recentred to 20.09%); and top raised 5mm
    // (3.75%, 76.937%->73.187%) with height re-derived from the sole-line
    // pin (100.98% - 73.187% = 27.793%).
    shoes: { top: '73.187%', left: '20.09%', width: '59.82%', height: '27.793%' },
  },
}

// NECK CROP RULE: for a garment category whose real-world clothing has a
// neckline ('top' and 'outer' — collars/crewnecks/scoops/jacket collars),
// the raw uploaded photo's own neck-hole/collar curve sits in the top slice
// of the image. Stretch-filling that whole photo straight into
// LAYER_POSITIONS' box (whose top edge is a flat, fixed line at the
// neck-base) would show that curved cutout instead of a flat edge, breaking
// the "fits snugly at the neck, covers to the shoulders" look. So for these
// categories, before the fill-stretch, the source image is first cropped to
// drop this top fraction — landing the remaining (already-flat,
// shoulder-to-hem) slice of the garment photo on the box's flat top edge
// instead. Consumed by DollCanvas.jsx's drawFill call. 0 (or an absent key)
// means "no crop, use the whole source image" — the default for every other
// category. outer crops a larger fraction than top per an explicit
// follow-up request ("목 부분 더 자르도록") — a jacket/coat's own collar
// photographs as a taller cutout than a t-shirt's, so it needs more trimmed
// to land flat.
export const NECK_CROP_RATIO = {
  top: 0.15,
  outer: 0.22,
}

/** Fraction (0-1) of the source image's own top edge to crop off before
 * fill-stretching this category into its LAYER_POSITIONS box — see the
 * NECK_CROP_RATIO rule above. 0 for any category not listed there.
 * `hasNeckline` (default true) is an explicit per-upload override — per a
 * follow-up request, garments without a real neckline (e.g. off-shoulder,
 * tube tops — anything without a collar/crewneck cutout to trim away)
 * should skip this crop entirely even for 'top'/'outer', since there's no
 * neck-hole curve in the photo to cut off in the first place. Wired from
 * PixelDressUp.jsx's per-category neckline toggle (see UploadSlot.jsx). */
export function getNeckCropRatio(category, hasNeckline = true) {
  if (!hasNeckline) return 0
  return NECK_CROP_RATIO[category] ?? 0
}

// Accessory covers everything from hats to belts to bracelets, and a single
// fixed box can't place all of those correctly — there's no way to tell
// "this photo is a hat" from "this photo is a belt" without asking. The
// accessory upload slot has a free-text memo field for exactly this
// (PixelDressUp.jsx's accessoryNote), and `resolveAccessoryPosition` below
// keyword-matches it against these zones; falls back to the neck/collar box
// (ACCESSORY_ZONES[gender].default, i.e. a necklace) when the note is empty
// or doesn't match anything. This is a rough approximation by keyword, not
// true body-part detection.
// head/waist zones reuse the same edge-measured numbers as HEAD_POSITIONS /
// LAYER_POSITIONS.bottom (with a small margin for a hat brim or belt
// overhang) rather than separate guesses, for the same reason those are
// edge-measured in the first place — so a hat or belt uploaded through this
// memo path sizes to the real head/hip edges too, not an approximation.
// ACCESSORY ASPECT-RATIO RULE: unlike outer/top/bottom/shoes, accessory is
// NOT in DollCanvas.jsx's FILL_CATEGORIES — it's drawn with drawContain
// (object-fit: contain), so it always preserves the *uploaded photo's own*
// aspect ratio inside whichever zone box below it resolves to, regardless of
// that box's own aspect ratio. This only works because PixelDressUp.jsx's
// `PIXELATE_OPTIONS.accessory` deliberately omits `pixelHeight`/
// `outputHeight` so pixelateImage derives them from the source photo instead
// of forcing a square — a belt (wide/flat) photo was reported rendering
// squashed ("가로로 찌그러져 있어") back when that was hardcoded to a fixed
// 44x44/180x180 square. Do not reintroduce a fixed pixelHeight/outputHeight
// for 'accessory' in PIXELATE_OPTIONS — accessory covers hats/necklaces/
// belts/bracelets with wildly different real aspect ratios, and forcing any
// single fixed shape there will re-break whichever ones don't match it.
export const ACCESSORY_ZONES = {
  f: {
    head: { top: '-3%', left: '18.9%', width: '61.8%', height: '34%' },
    // scaled 1.5x around its own center (40%/10% -> 60%/15%, left/top
    // recentred to 20%/24.5%) then moved down 5mm (top +3.75%,
    // 24.5%->28.25%; left/width/height unchanged) per an explicit
    // follow-up request. Then scaled 0.8x around its own center
    // (60%/15% -> 48%/12%, left/top recentred to 26%/29.75%) per a later
    // follow-up request. Then scaled 0.7x around its own center
    // (48%/12% -> 33.6%/8.4%, left/top recentred to 33.2%/31.55%) per a
    // later follow-up request.
    neck: { top: '31.55%', left: '33.2%', width: '33.6%', height: '8.4%' },
    // scaled 0.6x around its own center (69.4%/10% -> 41.64%/6%, left/top
    // recentred to 28.78%/52%) per an explicit follow-up request.
    waist: { top: '52%', left: '28.78%', width: '41.64%', height: '6%' },
    // Split the old single wide 'wrist' box (top:54%, left:1.5%, width:97%,
    // height:10% — spanning both arms in one band) into a left/right pair
    // per an explicit follow-up request to distinguish which wrist a
    // bracelet/watch/etc. goes on. Halved with a small 1% center gap
    // (1.5%-49.5% / 50.5%-98.5%). Keys are the doll's OWN left/right (not
    // screen left/right) — screen-left is the doll's right arm and vice
    // versa, per the standard mirror convention for a figure facing the
    // viewer. `rotate` (degrees) matches the doll's own forearm/wrist tilt
    // at that height, measured directly off doll-f-base.png's silhouette
    // (arm-center x at two y-rows within the wrist band, atan2'd) — see
    // resolveAccessoryPosition below for how/when both get used together.
    // Per a later follow-up request (bracelets specifically): moved outward
    // 10mm (7.5%, 0.75%/mm) — wristRight's left 1.5%->-6%, wristLeft's left
    // 50.5%->58%, width/top/height unchanged — then tilt flipped from the
    // measured natural outward arm-tilt to an explicit 60° *inward* tilt
    // (wristRight +60, wristLeft -60; canvas rotation is clockwise-positive,
    // so tilting each box's top edge toward the body's centerline is +60 on
    // the screen-left box and -60 on the screen-right box). Per a later
    // follow-up request, tilt direction flipped back to *outward* at 40°
    // (wristRight -40, wristLeft +40 — same sign convention as the original
    // measured natural-tilt, just a steeper explicit angle), and the whole
    // box scaled 0.8x around its own center (47%/10% -> 37.6%/8%, left/top
    // recentred to -1.3%/55%). Per a later follow-up request: tilt flipped
    // back to *inward* at 20° (wristRight +20, wristLeft -20 — same sign
    // convention as the earlier 60°-inward version), and position moved a
    // further 3mm (2.25%) outward from center (wristRight left
    // -1.3%->-3.55%, wristLeft left 62.7%->64.95%; width/top/height
    // unchanged). Per a later follow-up request: moved a further 3mm
    // (2.25%) outward each (wristRight left -3.55%->-5.8%, wristLeft left
    // 64.95%->67.2%) and 2mm (1.5%, 0.75%/mm) up (top 55%->53.5% for both;
    // width/height/rotate unchanged). Per a later follow-up request:
    // wristRight only moved a further 2mm (1.5%) outward (left
    // -5.8%->-7.3%; wristLeft left unchanged), and both moved a further
    // 2mm (1.5%) up (top 53.5%->52%). Per a later follow-up request, both
    // moved 1.5mm (1.125%) to the right (wristRight left -7.3%->-6.175%,
    // wristLeft left 67.2%->68.325%; top/width/height/rotate unchanged).
    // Per a later follow-up request, both moved 2mm (1.5%) up
    // (top 52%->50.5%; left/width/height/rotate unchanged). Per a later
    // follow-up request, wristLeft only moved 1.5mm (1.125%) to the right
    // (left 68.325%->69.45%; wristRight unchanged). Per a later follow-up
    // request, wristLeft moved a further 1.5mm (1.125%) to the right
    // (left 69.45%->70.575%; wristRight unchanged). Per a later follow-up
    // request, both moved 2mm (1.5%) inward toward each other
    // (wristRight left -6.175%->-4.675%, wristLeft left 70.575%->69.075%;
    // top/width/height/rotate unchanged).
    wristRight: { top: '50.5%', left: '-4.675%', width: '37.6%', height: '8%', rotate: 20 },
    wristLeft: { top: '50.5%', left: '69.075%', width: '37.6%', height: '8%', rotate: -20 },
    // Split the old single 'ankle' box (top:85%, left:21.9%, width:55.8%,
    // height:8%) into a left/right pair per an explicit follow-up request
    // to apply the same left/right-distinguishing behavior as
    // wristLeft/wristRight above. Halved with the same 1% center gap
    // convention as the original wrist split (21.9%-49.3% / 50.3%-77.7%).
    // Keys are the doll's OWN left/right (same mirror convention as wrist —
    // see wristLeft/wristRight's comment above).
    // ankleLeft moved 3mm (2.25%) to the right (left 50.3%->52.55%) per an
    // explicit follow-up request, then both scaled 1.2x around their own
    // centers (27.4%/8% -> 32.88%/9.6%, left/top recentred: ankleRight
    // 21.9%/85% -> 19.16%/84.2%, ankleLeft 52.55%/85% -> 49.81%/84.2%).
    // Then both moved 3mm (2.25%) inward toward each other per a further
    // follow-up request (ankleRight left 19.16%->21.41%, ankleLeft left
    // 49.81%->47.56%; top/width/height unchanged). Then both scaled a
    // further 1.2x around their own centers per a later follow-up request
    // (32.88%/9.6% -> 39.456%/11.52%, left/top recentred: ankleRight
    // 21.41%/84.2% -> 18.122%/83.24%, ankleLeft 47.56%/84.2% ->
    // 44.272%/83.24%).
    ankleRight: { top: '83.24%', left: '18.122%', width: '39.456%', height: '11.52%' },
    ankleLeft: { top: '83.24%', left: '44.272%', width: '39.456%', height: '11.52%' },
  },
  m: {
    head: { top: '-3%', left: '19.1%', width: '62.2%', height: '34%' },
    // scaled 1.5x around its own center (40%/10% -> 60%/15%, left/top
    // recentred to 20%/25.5%) then moved down 5mm (top +3.75%,
    // 25.5%->29.25%; left/width/height unchanged) per the same follow-up
    // request as f's neck above. Then scaled 0.8x around its own center
    // (60%/15% -> 48%/12%, left/top recentred to 26%/30.75%) per the same
    // later follow-up request as f's neck above. Then scaled 0.7x around
    // its own center (48%/12% -> 33.6%/8.4%, left/top recentred to
    // 33.2%/32.55%) per the same later follow-up request as f's neck above.
    neck: { top: '32.55%', left: '33.2%', width: '33.6%', height: '8.4%' },
    // scaled 0.6x around its own center (69.4%/10% -> 41.64%/6%, left/top
    // recentred to 28.78%/53%) per the same follow-up request as f's waist
    // above.
    waist: { top: '53%', left: '28.78%', width: '41.64%', height: '6%' },
    // same split/rationale as f's wristLeft/wristRight above (same follow-up
    // request); m's tilt reuses f's measured -6/+6 rather than being
    // re-measured off doll-m-mask.png separately — the two base
    // illustrations share essentially the same arms-hanging pose. Then, per
    // the same later bracelet-specific follow-up request as f's wrist above:
    // moved outward 10mm (left 1.5%->-6% / 50.5%->58%) and tilt set to an
    // explicit 60° inward (wristRight +60, wristLeft -60). Then, per the
    // same later follow-up request as f's wrist above: tilt flipped back to
    // outward at 40° (wristRight -40, wristLeft +40) and scaled 0.8x around
    // its own center (47%/10% -> 37.6%/8%, left/top recentred to
    // -1.3%/57%). Then, per the same later follow-up request as f's wrist
    // above: tilt flipped back to inward at 20° (wristRight +20, wristLeft
    // -20) and position moved a further 3mm (2.25%) outward from center
    // (wristRight left -1.3%->-3.55%, wristLeft left 62.7%->64.95%). Per the
    // same later follow-up request as f's wrist above: moved a further 3mm
    // (2.25%) outward each (wristRight left -3.55%->-5.8%, wristLeft left
    // 64.95%->67.2%) and 2mm (1.5%) up (top 57%->55.5% for both). Per the
    // same later follow-up request as f's wrist above: wristRight only
    // moved a further 2mm (1.5%) outward (left -5.8%->-7.3%; wristLeft
    // left unchanged), and both moved a further 2mm (1.5%) up
    // (top 55.5%->54%). Per the same later follow-up request as f's wrist
    // above, both moved 1.5mm (1.125%) to the right (wristRight left
    // -7.3%->-6.175%, wristLeft left 67.2%->68.325%). Per the same later
    // follow-up request as f's wrist above, both moved 2mm (1.5%) up
    // (top 54%->52.5%; left/width/height/rotate unchanged). Per the same
    // later follow-up request as f's wrist above, wristLeft only moved
    // 1.5mm (1.125%) to the right (left 68.325%->69.45%; wristRight
    // unchanged). Per a later follow-up request, wristLeft moved a further
    // 1.5mm (1.125%) to the right (left 69.45%->70.575%; wristRight
    // unchanged). Per the same later follow-up request as f's wrist above,
    // both moved 2mm (1.5%) inward toward each other (wristRight left
    // -6.175%->-4.675%, wristLeft left 70.575%->69.075%;
    // top/width/height/rotate unchanged).
    wristRight: { top: '52.5%', left: '-4.675%', width: '37.6%', height: '8%', rotate: 20 },
    wristLeft: { top: '52.5%', left: '69.075%', width: '37.6%', height: '8%', rotate: -20 },
    // Split the old single 'ankle' box (top:85%, left:21.3%, width:57.5%,
    // height:8%) into a left/right pair — same rationale/split convention
    // as f's ankleRight/ankleLeft above (21.3%-49.55% / 50.55%-78.8%).
    // ankleLeft moved 3mm (2.25%) to the right (left 50.55%->52.8%) per the
    // same follow-up request as f's ankleLeft above, then both scaled 1.2x
    // around their own centers (28.25%/8% -> 33.9%/9.6%, left/top
    // recentred: ankleRight 21.3%/85% -> 18.475%/84.2%, ankleLeft
    // 52.8%/85% -> 49.975%/84.2%). Then both moved 3mm (2.25%) inward
    // toward each other per the same later follow-up request as f's ankle
    // above (ankleRight left 18.475%->20.725%, ankleLeft left
    // 49.975%->47.725%; top/width/height unchanged). Then both scaled a
    // further 1.2x around their own centers per the same later follow-up
    // request as f's ankle above (33.9%/9.6% -> 40.68%/11.52%, left/top
    // recentred: ankleRight 20.725%/84.2% -> 17.335%/83.24%, ankleLeft
    // 47.725%/84.2% -> 44.335%/83.24%).
    ankleRight: { top: '83.24%', left: '17.335%', width: '40.68%', height: '11.52%' },
    ankleLeft: { top: '83.24%', left: '44.335%', width: '40.68%', height: '11.52%' },
  },
}

// keyword (Korean) -> zone key. Checked in order; first match wins. Wrist
// and ankle are handled separately below (resolveAccessoryPosition) since
// each can resolve to one *or two* zones depending on which side the note
// mentions.
const ACCESSORY_KEYWORDS = [
  [['머리', '모자', '헤어', '헤드', '귀', '귀걸이', '안경'], 'head'],
  [['목', '목걸이', '초커'], 'neck'],
  [['허리', '벨트'], 'waist'],
]

// A wrist-ish note ('손목'/'팔찌'/'시계'/'팔') gets checked against these
// side keywords to pick wristLeft vs wristRight vs both. Left/right are the
// doll's own left/right — see the wristLeft/wristRight comment in
// ACCESSORY_ZONES above for the screen-mirroring caveat.
const WRIST_KEYWORDS = ['손목', '팔찌', '시계', '팔']
const WRIST_LEFT_KEYWORDS = ['왼쪽', '왼손목', '왼팔']
const WRIST_RIGHT_KEYWORDS = ['오른쪽', '오른손목', '오른팔']

// An ankle-ish note ('발목'/'발찌'/'발') gets the same left/right-split
// treatment as wrist above, per an explicit follow-up request ("발목도
// 팔찌와 마찬가지로... 룰로 설정"): unspecified side -> both ankleLeft and
// ankleRight; a named side -> just that zone.
const ANKLE_KEYWORDS = ['발목', '발찌', '발']
const ANKLE_LEFT_KEYWORDS = ['왼쪽', '왼발목', '왼발']
const ANKLE_RIGHT_KEYWORDS = ['오른쪽', '오른발목', '오른발']

/**
 * Resolves the free-text accessory memo into an array of `ACCESSORY_ZONES`
 * boxes for this gender (almost always one box — an array only so the wrist
 * case, which can need two, doesn't need a different return shape). Defaults
 * to `neck` (a necklace) when `note` is empty/unset or matches no known
 * keyword.
 *
 * Wrist notes are special-cased per an explicit follow-up request ("오른쪽
 * 왼쪽 팔 구분해서 장착"): a note naming one side ('왼쪽'/'오른쪽' + a wrist
 * keyword) resolves to just that wrist's zone; a wrist-ish note that doesn't
 * name a side (including an explicit "양쪽"/"둘다") resolves to *both*
 * wristLeft and wristRight, per the same request's rule that an unspecified
 * or double-worn accessory renders symmetrically on both wrists — the
 * caller (DollCanvas.jsx) draws the same uploaded image once per returned
 * zone, each with its own `rotate`. Ankle notes follow the identical rule
 * per a later follow-up request ("발목도 팔찌와 마찬가지로... 룰로 설정").
 */
export function resolveAccessoryPosition(gender, note) {
  const zones = ACCESSORY_ZONES[gender] ?? ACCESSORY_ZONES.f
  const text = (note ?? '').trim()

  if (text && WRIST_KEYWORDS.some((kw) => text.includes(kw))) {
    if (WRIST_LEFT_KEYWORDS.some((kw) => text.includes(kw))) return [zones.wristLeft]
    if (WRIST_RIGHT_KEYWORDS.some((kw) => text.includes(kw))) return [zones.wristRight]
    return [zones.wristLeft, zones.wristRight]
  }

  if (text && ANKLE_KEYWORDS.some((kw) => text.includes(kw))) {
    if (ANKLE_LEFT_KEYWORDS.some((kw) => text.includes(kw))) return [zones.ankleLeft]
    if (ANKLE_RIGHT_KEYWORDS.some((kw) => text.includes(kw))) return [zones.ankleRight]
    return [zones.ankleLeft, zones.ankleRight]
  }

  if (text) {
    for (const [keywords, zoneKey] of ACCESSORY_KEYWORDS) {
      if (keywords.some((kw) => text.includes(kw))) return [zones[zoneKey]]
    }
  }
  return [zones.neck]
}

export const CATEGORY_LABELS = {
  outer: '아우터',
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  accessory: '액세서리',
}

// Real pixel dimensions of the base illustrations (client/src/assets/
// dollsprites/doll-{gender}-base.png) — cropped from the user-supplied
// reference sheet, with the head pixels erased (alpha=0) but the canvas
// left at its *original* height so there's still room above the neck for
// the swapped face image (cropping the canvas itself shorter would leave no
// space for a head at all). Used both to pick the .stage's exact
// aspect-ratio (so the art never stretches/letterboxes oddly) and as the
// canvas size basis in DollCanvas's compositeToDataUrl.
export const DOLL_BASE_SIZE = {
  f: { width: 242, height: 513 },
  m: { width: 235, height: 495 },
}

// Head box (as % of the doll stage) — where the cropped face illustration
// (client/src/assets/dollsprites/faces/face-{gender}-{expression}-
// {eyeColor}.png, cropped from user-supplied reference sheets) gets placed.
// The body illustration has no head pixels of its own in this region (see
// DOLL_BASE_SIZE) — the swapped face image *is* the entire head, so there's
// no competing skin tone/silhouette underneath for it to seam against.
// object-fit: contain (DollCanvas.module.css .faceImage) letterboxes each
// crop's own aspect ratio inside this box without stretching. These exact
// percentages are the original reference sheet's own head bounding box
// (top-of-head to neck-narrowest-point, widest head row) measured directly
// off the same doll-{gender}-base.png canvas before its head pixels were
// erased — i.e. this reproduces the reference art's real head:body scale,
// not an approximation.
// f.top nudged +0.75% (~1mm on-screen) from the reference-matched value per
// an earlier request; m.top additionally nudged +1.12% (~1.5mm on-screen)
// beyond that per a follow-up request specific to the male doll.
export const HEAD_POSITIONS = {
  f: { top: '1.55%', left: '21.9%', width: '55.8%', height: '30.2%' },
  m: { top: '2.67%', left: '22.1%', width: '56.2%', height: '30.1%' },
}

// Per-expression scale multiplier applied on top of HEAD_POSITIONS, centered
// on the same box, for expressions whose face crop needs to render bigger/
// smaller than the shared head box's default fit. This exists because the
// face image itself already fills its own canvas nearly edge-to-edge (see
// the face-{gender}-{expression}-{color}.png crop pipeline) — past a small
// margin-trimming allowance, object-fit: contain can't render a crop *larger*
// within a fixed box without a multiplier like this, since contain can only
// shrink-to-fit, never overflow, and there's no more crop-canvas margin left
// to trim away for extra size. Unlisted expressions default to 1 — see
// getFaceScale below.
const FACE_SCALE = {
  m: {
    sad: 1.0,
  },
}

/** Returns the per-expression face scale multiplier (1 if not listed above). */
export function getFaceScale(gender, expression) {
  return FACE_SCALE[gender]?.[expression] ?? 1
}

// Per-expression brightness multiplier applied to the face image (CSS/canvas
// `brightness()` filter) for expressions whose face crop reads as too dark/
// muted relative to the others. Unlisted expressions default to 1 (no
// filter) — see getFaceBrightness below.
const FACE_BRIGHTNESS = {
  m: {
    sad: 1.12,
  },
}

/** Returns the per-expression face brightness multiplier (1 if not listed above). */
export function getFaceBrightness(gender, expression) {
  return FACE_BRIGHTNESS[gender]?.[expression] ?? 1
}

// Hair box (as % of the doll stage) — where the selected wig illustration
// (client/src/assets/dollsprites/hair/hair-{gender}-{style}.png, each a
// "wig" cutout with a transparent hole for the face) gets placed. Explicit
// per-style boxes, not one shared box + a scale multiplier: each wig image's
// own face-hole is a different size/shape relative to its own canvas (a
// voluminous style like long-wavy has a hole that's a small fraction of its
// canvas; a close-cropped style like semi-leaf has a hole that's most of its
// canvas), so a uniform box never fits all of them.
//
// Every value here was derived, not eyeballed: for each hair-{gender}-
// {style}.png asset, a script (1) measured that asset's own widest
// left/right-bounded transparent opening (a proxy for the actual face-hole
// width, robust even for styles whose hole touches the image's own bottom
// edge or is broken up by jagged bang strands) and scaled the whole image so
// that opening comes out to ~60% of HEAD_POSITIONS' width — i.e.
// deliberately *smaller* than the face box, so the hair's opaque edge
// overlaps the face's own edge with margin rather than exactly matching it.
// This is intentional per an explicit requirement: it's fine for hair to
// cover a bit of the face, but the doll's blank canvas must never show
// through *inside* the hairline — an exact hole/face match still leaves a
// sliver of background visible at the boundary once you account for the
// hole's antialiased edge and the fact the hole's shape never perfectly
// traces the face image's own silhouette. (2) then aligned the whole scaled
// image so its own topmost opaque pixel lands just above HEAD_POSITIONS'
// top edge, so the hairline drapes onto the scalp instead of floating above
// it or starting mid-forehead.
export const HAIR_POSITIONS = {
  f: {
    'long-wavy': { top: '-2.55%', left: '6.62%', width: '86.36%', height: '51.33%' },
    bob: { top: '-2.48%', left: '15.43%', width: '68.74%', height: '34.28%' },
    hush: { top: '-2.44%', left: '12.22%', width: '75.16%', height: '38.52%' },
    // scaled 1.3x around its own center (53.43%/41.96% -> 69.459%/54.548%,
    // left/top recentred to 15.066%/-7.124%) then moved down a further 1mm
    // (top +0.75%, -7.124%->-6.374%; left/width/height unchanged) per an
    // explicit follow-up request. Then scaled 0.8x around its own center
    // (69.459%/54.548% -> 55.567%/43.638%, left/top recentred to
    // 22.012%/-0.919%) then moved down a further 3mm (top +2.25%,
    // -0.919%->1.331%; left/width/height unchanged) per a later follow-up
    // request.
    braid: { top: '1.331%', left: '22.012%', width: '55.567%', height: '43.638%' },
    bun: { top: '-4.68%', left: '23.08%', width: '53.43%', height: '33.50%' },
  },
  m: {
    'two-block': { top: '0.14%', left: '25.64%', width: '49.39%', height: '18.03%' },
    dandy: { top: '-2.55%', left: '17.45%', width: '65.82%', height: '22.01%' },
    'down-perm': { top: '0.93%', left: '24.84%', width: '50.98%', height: '16.76%' },
    'baby-perm': { top: '0.01%', left: '18.97%', width: '62.74%', height: '21.78%' },
    wolf: { top: '-0.48%', left: '17.93%', width: '64.53%', height: '35.61%' },
    'semi-leaf': { top: '0.72%', left: '15.30%', width: '70.02%', height: '26.68%' },
  },
}

/** Returns the hair position box for this gender+style (falls back to the
 * first style's box if an unknown style slips through). */
export function getHairPosition(gender, style) {
  const genderBoxes = HAIR_POSITIONS[gender] ?? HAIR_POSITIONS.f
  return genderBoxes[style] ?? Object.values(genderBoxes)[0]
}

export const HAIR_STYLES = {
  f: [
    { value: 'long-wavy', label: '롱 웨이브' },
    { value: 'bob', label: '단발' },
    { value: 'hush', label: '허쉬컷' },
    { value: 'braid', label: '땋은 머리' },
    { value: 'bun', label: '올림머리' },
  ],
  m: [
    { value: 'semi-leaf', label: '세미 리프컷' },
    { value: 'down-perm', label: '다운펌' },
    { value: 'dandy', label: '댄디컷' },
    { value: 'wolf', label: '울프컷' },
    { value: 'two-block', label: '투블럭' },
    { value: 'baby-perm', label: '베이비펌' },
  ],
}

export const EXPRESSIONS = [
  { value: 'joy', label: '기쁨' },
  { value: 'sad', label: '슬픔' },
  { value: 'languid', label: '나른' },
  { value: 'annoyed', label: '짜증' },
]

// Matches the 6 eye-color columns present in the user-supplied reference
// sheets (client/src/assets/dollsprites/faces/face-{gender}-{expression}-
// {color}.png) — each (gender, expression, eyeColor) combo is a distinct
// cropped illustration, not a CSS tint. `hex` here is only a picker-swatch
// hint (EyeColorPicker), it plays no part in which face image gets rendered.
export const EYE_COLORS = [
  { value: 'blue', label: '파랑', hex: '#3b6fd6' },
  { value: 'black', label: '검정', hex: '#2b2b2b' },
  { value: 'brown', label: '브라운', hex: '#6b4226' },
  { value: 'hazelnut', label: '헤이즐넛', hex: '#a97142' },
  { value: 'grey', label: '회색', hex: '#8c8c8c' },
  { value: 'green', label: '녹색', hex: '#4b7f52' },
]
