import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../utils/scrollReveal'
import styles from './WardrobeDoorIntro.module.css'

// Illustration is authored in a shared 400x300 coordinate space. The
// interior (back wall / rail / hangers / shelf) is one inline <svg> — its
// layers only ever need 2D parallax translates, which SVG's `transform`
// happily supports. The doors are deliberately NOT SVG <g>s: GSAP's 3D
// transform (rotationY + z) collapses to a flattened 2D `matrix()` on SVG
// elements (SVG's transform attribute has no 3D concept), so a hinge swing
// would silently no-op there. Instead each door is its own small <svg>
// (viewBox sliced from the same 400x300 space, so the artwork coordinates
// below are unchanged) wrapped in a plain HTML <div> that GSAP can rotate
// in true CSS 3D, positioned to exactly overlay its slice of the interior.
const HANGER_X = [83, 161, 239, 317]
const RAIL_Y = 46
const SHOULDER_Y = 52

// Everything below is rasterized onto a fixed pixel grid, same technique as
// scripts/generate-background.cjs (rasterizeLocal/cloudG there): flat-color
// blocks snapped to a grid, run-length-encoded per row so a filled shape
// becomes a handful of wide <rect>s instead of one-rect-per-pixel. PIXEL=4
// on this 400-wide viewBox matches the same block density as the
// background tile's PIXEL=9 on its 900-wide tile (both ~100 columns), so
// the wardrobe reads at the same "bitmap" scale as the rest of the app.
const PIXEL = 4
const FLOATER_PIXEL = 2
// The bag is rasterized at half the usual floater cell size (finer grid =
// more, smaller blocks) so it reads with visibly more shading detail while
// staying strictly within the same flat-color/crispEdges pixel-art style.
const BAG_PIXEL = FLOATER_PIXEL / 2

// ---------- shared pixel-rasterization helpers ----------

// Scans a bounding box on the PIXEL grid, asks `testFn(px, py)` for a fill
// color per cell, and merges same-color horizontal runs into one <rect> —
// the same run-length-encoding rasterizeLocal() uses in generate-background.cjs.
function rasterizeTest(x0, y0, x1, y1, cell, testFn, keyPrefix) {
  const gx0 = Math.floor(x0 / cell)
  const gx1 = Math.ceil(x1 / cell)
  const gy0 = Math.floor(y0 / cell)
  const gy1 = Math.ceil(y1 / cell)
  const rects = []
  for (let gy = gy0; gy <= gy1; gy += 1) {
    let runFill = null
    let runStart = gx0
    for (let gx = gx0; gx <= gx1 + 1; gx += 1) {
      let fill = null
      if (gx <= gx1) {
        const px = gx * cell + cell / 2
        const py = gy * cell + cell / 2
        fill = testFn(px, py) || null
      }
      if (fill !== runFill) {
        if (runFill) {
          rects.push(
            <rect
              key={`${keyPrefix}-${gy}-${runStart}`}
              x={runStart * cell}
              y={gy * cell}
              width={(gx - runStart) * cell}
              height={cell}
              fill={runFill}
            />
          )
        }
        runFill = fill
        runStart = gx
      }
    }
  }
  return rects
}

// Even-odd ray-cast point-in-polygon test, used to rasterize the
// hand-authored garment/accessory silhouettes below onto the pixel grid.
function pointInPolygon(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function polyBBox(poly) {
  const xs = poly.map((p) => p[0])
  const ys = poly.map((p) => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

function scalePoly(poly, factor, cx, cy) {
  return poly.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor])
}

function rasterizePoly(poly, cell, fillFn, keyPrefix) {
  const { x0, x1, y0, y1 } = polyBBox(poly)
  return rasterizeTest(x0, y0, x1, y1, cell, (px, py) => (pointInPolygon(px, py, poly) ? fillFn(px, py) : null), keyPrefix)
}

// A silhouette rendered as two flat-color passes — a dilated outline
// ("rim") behind a row-banded fill — the same layered-flat-colors idea
// cloudG() uses in place of a smooth gradient for shading.
function renderSilhouette(poly, bands, cell, keyPrefix) {
  const { x0, x1, y0, y1 } = polyBBox(poly)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rim = rasterizePoly(scalePoly(poly, 1.12, cx, cy), cell, () => '#4a1030', `${keyPrefix}-rim`)
  const base = rasterizePoly(
    poly,
    cell,
    (px, py) => {
      const t = (py - y0) / (y1 - y0 || 1)
      return t < 0.34 ? bands.light : t < 0.68 ? bands.mid : bands.dark
    },
    `${keyPrefix}-base`
  )
  return (
    <g key={keyPrefix}>
      <g opacity={0.28}>{rim}</g>
      {base}
    </g>
  )
}

// Hand-authored pixel-grid array (rows of equal-length strings, each char
// keying into `colors`) — for the tiny heart charm, where a few dozen
// hand-placed cells are simpler than rasterizing a polygon.
function pixelGrid(rows, colors, originX, originY, cell, keyPrefix) {
  const rects = []
  rows.forEach((row, gy) => {
    let runCh = null
    let runStart = 0
    for (let gx = 0; gx <= row.length; gx += 1) {
      const ch = gx < row.length ? row[gx] : null
      if (ch !== runCh) {
        if (runCh && runCh !== '.' && colors[runCh]) {
          rects.push(
            <rect
              key={`${keyPrefix}-${gy}-${runStart}`}
              x={originX + runStart * cell}
              y={originY + gy * cell}
              width={(gx - runStart) * cell}
              height={cell}
              fill={colors[runCh]}
            />
          )
        }
        runCh = ch
        runStart = gx
      }
    }
  })
  return rects
}

// Flat base fill + sparse darker pixel-rows (horizontal grain banding) +
// a few gapped pixel columns (vertical grain "cracks") — replaces the old
// smooth wood gradient + hairline <path> grain lines. Reused for the outer
// frame, the interior back wall, and both door faces so they all read as
// the same material.
function woodGrain(x, y, w, h, base, band, grain, cell, keyPrefix) {
  const rects = [<rect key={`${keyPrefix}-base`} x={x} y={y} width={w} height={h} fill={base} />]
  const gy0 = Math.round(y / cell)
  const gy1 = Math.round((y + h) / cell)
  for (let gy = gy0; gy < gy1; gy += 5) {
    rects.push(<rect key={`${keyPrefix}-band-${gy}`} x={x} y={gy * cell} width={w} height={cell} fill={band} opacity={0.4} />)
  }
  const gx0 = Math.round(x / cell)
  const gx1 = Math.round((x + w) / cell)
  const segH = cell * 3
  const gap = cell * 2
  for (let gx = gx0 + 3; gx < gx1; gx += 7) {
    let i = 0
    for (let sy = y; sy < y + h; sy += segH + gap) {
      rects.push(
        <rect
          key={`${keyPrefix}-grain-${gx}-${i}`}
          x={gx * cell}
          y={sy}
          width={cell}
          height={Math.min(segH, y + h - sy)}
          fill={grain}
          opacity={0.22}
        />
      )
      i += 1
    }
  }
  return rects
}

// Concentric blocky rings of decreasing opacity — a pixel-dithered stand-in
// for the old smooth radialGradient interior glow.
const GLOW_RINGS = [
  { r: 34, fill: 'rgba(243,232,255,0.85)' },
  { r: 62, fill: 'rgba(255,224,240,0.55)' },
  { r: 92, fill: 'rgba(255,224,240,0.3)' },
  { r: 124, fill: 'rgba(255,224,240,0.12)' },
]

function pixelGlow(cx, cy, ringSpecs, cell, keyPrefix) {
  const maxR = ringSpecs[ringSpecs.length - 1].r
  return rasterizeTest(
    cx - maxR,
    cy - maxR * 0.8,
    cx + maxR,
    cy + maxR * 0.8,
    cell,
    (px, py) => {
      const dist = Math.hypot(px - cx, (py - cy) * 1.3)
      const ring = ringSpecs.find((r) => dist <= r.r)
      return ring ? ring.fill : null
    },
    keyPrefix
  )
}

// Discrete flat-tone banding (2-3 stacked bands) standing in for a smooth
// metallic gradient — used for the hanger rail and both door handles.
function metalBand(x, y, w, h, keyPrefix) {
  const bandH = h / 3
  return (
    <g key={keyPrefix}>
      <rect x={x} y={y} width={w} height={bandH} fill="#fff6fb" />
      <rect x={x} y={y + bandH} width={w} height={bandH} fill="#e8d9ff" />
      <rect x={x} y={y + bandH * 2} width={w} height={bandH} fill="#b36fe8" />
    </g>
  )
}

// Blocky 8-bit twinkle glyph (plus-shape with a bright core pixel),
// replacing the smooth vector sparkle path — same shape recipe as
// pixelSparklePath() in generate-background.cjs.
function pixelSparkle(cx, cy, size, cell, color, keyPrefix) {
  const cgx = Math.round(cx / cell)
  const cgy = Math.round(cy / cell)
  const arm = Math.max(2, Math.round(size))
  const cells = []
  for (let i = -arm; i <= arm; i += 1) {
    if (Math.abs(i) === arm && arm > 2) continue
    cells.push([cgx, cgy + i])
    cells.push([cgx + i, cgy])
  }
  return (
    <g key={keyPrefix}>
      {cells.map(([gx, gy], i) => (
        <rect key={`${keyPrefix}-${i}`} x={gx * cell} y={gy * cell} width={cell} height={cell} fill={color} />
      ))}
      <rect x={cgx * cell} y={cgy * cell} width={cell} height={cell} fill="#fff" />
    </g>
  )
}

// Four hand-authored garment silhouettes (dress / tee / cardigan / skirt),
// each a polygon (endpoints sampled from the shapes' original curve paths —
// pixelation erases the difference between a curve and its polygon
// approximation, so straight-line vertices are all that's needed now) plus
// a 3-stop light/mid/dark band recipe reusing each garment's original
// gradient's own two end colors, with one in-family midpoint added.
const GARMENTS = [
  {
    id: 'dress',
    bands: { light: '#ffeaf5', mid: '#ff9ecb', dark: '#ff74b8' },
    poly: (cx) => [
      [cx - 22, SHOULDER_Y + 3],
      [cx - 27, SHOULDER_Y + 14],
      [cx - 15, SHOULDER_Y + 48],
      [cx - 21, SHOULDER_Y + 108],
      [cx + 21, SHOULDER_Y + 108],
      [cx + 15, SHOULDER_Y + 48],
      [cx + 27, SHOULDER_Y + 14],
      [cx + 22, SHOULDER_Y + 3],
      [cx, SHOULDER_Y - 4],
    ],
    stitch: (cx) => [
      { x: cx - 14, y: SHOULDER_Y + 60, w: 6, h: 2 },
      { x: cx - 4, y: SHOULDER_Y + 62, w: 6, h: 2 },
      { x: cx + 8, y: SHOULDER_Y + 60, w: 6, h: 2 },
    ],
  },
  {
    id: 'tee',
    bands: { light: '#eafff7', mid: '#9ceecb', dark: '#3dd9a8' },
    poly: (cx) => [
      [cx - 25, SHOULDER_Y + 1],
      [cx - 31, SHOULDER_Y + 17],
      [cx - 20, SHOULDER_Y + 23],
      [cx - 20, SHOULDER_Y + 85],
      [cx + 20, SHOULDER_Y + 85],
      [cx + 20, SHOULDER_Y + 23],
      [cx + 31, SHOULDER_Y + 17],
      [cx + 25, SHOULDER_Y + 1],
      [cx, SHOULDER_Y - 5],
    ],
    stitch: (cx) => [
      { x: cx - 2, y: SHOULDER_Y + 6, w: 4, h: 8 },
      { x: cx - 2, y: SHOULDER_Y + 18, w: 4, h: 8 },
    ],
  },
  {
    id: 'cardigan',
    bands: { light: '#fff8e6', mid: '#ffd897', dark: '#ffb84d' },
    // Open-front cardigan: the boundary dips from the neckline down into a
    // narrow closed slit that stops partway down the chest (y+20 to y+55)
    // rather than reaching the hem, so the panels stay joined into one
    // solid body below the slit. Two earlier attempts both read as pants:
    // a wide V-notch reaching the hem, and then a constant-width slit that
    // still ran the full body length — both fully bisect the silhouette
    // top to bottom, which is exactly the bifurcated leg/crotch shape the
    // skirt fix below also had to avoid. Stopping the slit above the hem
    // keeps the garment reading as one torso with an open collar.
    poly: (cx) => [
      [cx - 24, SHOULDER_Y + 2],
      [cx - 30, SHOULDER_Y + 16],
      [cx - 21, SHOULDER_Y + 22],
      [cx - 21, SHOULDER_Y + 96],
      [cx + 21, SHOULDER_Y + 96],
      [cx + 21, SHOULDER_Y + 22],
      [cx + 30, SHOULDER_Y + 16],
      [cx + 24, SHOULDER_Y + 2],
      [cx + 10, SHOULDER_Y - 6],
      [cx + 3, SHOULDER_Y + 20],
      [cx + 3, SHOULDER_Y + 55],
      [cx - 3, SHOULDER_Y + 55],
      [cx - 3, SHOULDER_Y + 20],
      [cx - 10, SHOULDER_Y - 6],
    ],
    // two small buttons, one per front panel, flanking the open-collar slit
    stitch: (cx) => [
      { x: cx - 14, y: SHOULDER_Y + 30, w: 4, h: 4 },
      { x: cx - 14, y: SHOULDER_Y + 45, w: 4, h: 4 },
      { x: cx + 10, y: SHOULDER_Y + 30, w: 4, h: 4 },
      { x: cx + 10, y: SHOULDER_Y + 45, w: 4, h: 4 },
    ],
  },
  {
    id: 'skirt',
    bands: { light: '#f0f9ff', mid: '#afd6f7', dark: '#6fb3e8' },
    // Simple A-line flare from a narrow waistband out to a wide hem — the
    // previous version cut a V all the way up to mid-thigh height, which
    // rasterized as two separate leg-like columns (reading as shorts, not
    // a skirt). A skirt silhouette needs to stay one solid flared panel.
    poly: (cx) => [
      [cx - 18, SHOULDER_Y + 4],
      [cx + 18, SHOULDER_Y + 4],
      [cx + 29, SHOULDER_Y + 80],
      [cx - 29, SHOULDER_Y + 80],
    ],
    stitch: (cx) => [{ x: cx - 15, y: SHOULDER_Y + 10, w: 30, h: 2 }],
  },
]

function renderStitch(segments, keyPrefix) {
  return segments.map((s, i) => {
    const x = Math.round(s.x / PIXEL) * PIXEL
    const y = Math.round(s.y / PIXEL) * PIXEL
    const w = Math.max(PIXEL, Math.round(s.w / PIXEL) * PIXEL)
    const h = Math.max(PIXEL, Math.round(s.h / PIXEL) * PIXEL)
    return <rect key={`${keyPrefix}-stitch-${i}`} x={x} y={y} width={w} height={h} fill="#fff" opacity={0.55} />
  })
}

// Shared by both door SVGs (each door is its own SVG document — no shared
// gradient/pattern ids across them — so this small defs block is inlined
// into each).
function DoorDefs() {
  return (
    <defs>
      <pattern id="halftone" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect x="0.5" y="0.5" width="3" height="3" fill="#4a1030" fillOpacity="0.35" />
      </pattern>
      <filter id="doorSoftShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4a1030" floodOpacity="0.28" />
      </filter>
    </defs>
  )
}

/**
 * The "walking into your closet" moment for the MyWardrobe page: a layered,
 * bitmap/pixel-art diorama wardrobe whose two doors swing open on a fixed
 * hinge (real CSS 3D rotateY, not a slide) to reveal a rail of hanging
 * clothes that swish into place with a staggered, bouncy cascade. Every
 * element is rasterized onto a fixed pixel grid (see PIXEL above) — flat
 * color bands and run-length-encoded <rect> blocks instead of gradients or
 * smooth curves, matching the bitmap style of the site's background tiles
 * (scripts/generate-background.cjs). Interior layers drift gently with the
 * cursor (reusing the site-wide --px/--py written by useParallaxPointer via
 * ParallaxBackground, mounted once at the app root — no second pointer
 * listener here) and a few accessories float lazily around the frame. Runs
 * once automatically on mount; GSAP-driven, with a static open fallback
 * under prefers-reduced-motion.
 */
function WardrobeDoorIntro({ className = '' }) {
  const rootRef = useRef(null)
  const doorLeftRef = useRef(null)
  const doorRightRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const doorLeft = doorLeftRef.current
    const doorRight = doorRightRef.current
    const hangers = root.querySelectorAll(`.${styles.hanger}`)
    const floaters = root.querySelectorAll(`.${styles.floater}`)

    if (prefersReducedMotion()) {
      gsap.set([doorLeft, doorRight], { transformPerspective: 900 })
      gsap.set(doorLeft, { rotationY: -112, z: 18 })
      gsap.set(doorRight, { rotationY: 112, z: 18 })
      gsap.set(hangers, { opacity: 1, x: 0, rotate: 0 })
      gsap.set(floaters, { opacity: 1, y: 0, scale: 1 })
      return undefined
    }

    const ctx = gsap.context(() => {
      gsap.set([doorLeft, doorRight], { transformPerspective: 900, z: 18 })
      gsap.set(hangers, { opacity: 0, x: -32, rotate: -12, transformOrigin: '50% 0%' })
      gsap.set(floaters, { opacity: 0, y: 12, scale: 0.85 })

      const tl = gsap.timeline({ delay: 0.2 })
      tl.to(doorLeft, { rotationY: -112, duration: 1.05, ease: 'power3.inOut' })
        .to(doorRight, { rotationY: 112, duration: 1.05, ease: 'power3.inOut' }, '<')
        .to(
          hangers,
          { opacity: 1, x: 0, rotate: 0, duration: 0.65, stagger: 0.09, ease: 'back.out(1.9)' },
          '-=0.55'
        )
        .to(floaters, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.4)' }, '-=0.45')
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div className={`${styles.wrapper} ${className}`} ref={rootRef} aria-hidden="true">
      <div className={`${styles.floater} ${styles.floaterHat}`}>
        {/* Sun-hat silhouette: a wide flat brim ellipse with a distinctly
            narrower, taller domed crown clipped flat at its base so it
            reads as sitting ON the brim rather than merging into one
            triangular blob (the previous brim-ellipse + kite-polygon
            combo pointed to a single apex and overlapped so heavily the
            two parts fused into an unreadable mound). */}
        <svg viewBox="0 0 40 32" className={styles.floaterSvg} shapeRendering="crispEdges">
          {rasterizeTest(
            2,
            19,
            38,
            29,
            FLOATER_PIXEL,
            (px, py) => {
              const dx = (px - 20) / 18
              const dy = (py - 24) / 4.5
              return dx * dx + dy * dy <= 1 ? (py < 23 ? '#ff9ecb' : '#ff4f9e') : null
            },
            'hatbrim'
          )}
          {rasterizeTest(
            9,
            6,
            31,
            22,
            FLOATER_PIXEL,
            (px, py) => {
              if (py > 21) return null
              const dx = (px - 20) / 10
              const dy = (py - 16) / 11
              return dx * dx + dy * dy <= 1 ? (py < 13 ? '#ffeaf5' : '#ff74b8') : null
            },
            'hatcrown'
          )}
        </svg>
      </div>
      <div className={`${styles.floater} ${styles.floaterBag}`}>
        <svg viewBox="0 0 36 34" className={styles.floaterSvg} shapeRendering="crispEdges">
          {/* handle, drawn as a blocky bracket — rasterized at BAG_PIXEL
              (half the usual floater cell) instead of authored as three
              flat rects, so it reads as finer-grained blocks like the
              rest of this element */}
          {rasterizeTest(
            10,
            2,
            26,
            14,
            BAG_PIXEL,
            (px, py) => (py <= 5 || px <= 13 || px >= 23 ? '#9450c9' : null),
            'baghandle'
          )}
          {/* body: four flat-color bands (was two) at the finer BAG_PIXEL
              grid, giving more shading gradation while staying strictly
              flat-color/crispEdges */}
          {rasterizeTest(
            5,
            12,
            31,
            32,
            BAG_PIXEL,
            (px, py) => {
              const t = (py - 12) / 20
              return t < 0.28 ? '#f3e6ff' : t < 0.52 ? '#e8d9ff' : t < 0.78 ? '#c48ce8' : '#9450c9'
            },
            'bagbody'
          )}
          <rect x="16" y="20" width="4" height="4" fill="#fff" opacity="0.7" />
        </svg>
      </div>

      <div className={styles.stage}>
        <svg
          className={styles.svg}
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="옷장 문이 열리며 옷걸이가 나타나는 장식 일러스트"
          shapeRendering="crispEdges"
        >
          <defs>
            <pattern id="halftoneRug" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect x="1" y="1" width="4" height="4" fill="#b36fe8" fillOpacity="0.4" />
            </pattern>
            <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4a1030" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* ground contact shadow, grounding the whole piece */}
          <ellipse cx="200" cy="292" rx="150" ry="9" fill="#4a1030" opacity="0.16" />

          {/* ============ outer frame + pediment (always visible) ============ */}
          <g>
            {woodGrain(20, 10, 360, 280, '#a9663a', '#6d4025', '#3a2114', PIXEL, 'frame')}
            <rect x="20" y="10" width="360" height="280" fill="none" stroke="#3a2114" strokeWidth="1.5" />
            {woodGrain(150, 2, 100, 10, '#a9663a', '#6d4025', '#3a2114', PIXEL, 'pediment')}
            <rect x="26" y="278" width="14" height="12" fill="#6d4025" />
            <rect x="360" y="278" width="14" height="12" fill="#6d4025" />
          </g>

          {/* ============ interior back layer (parallax depth) ============ */}
          <g className={styles.parallaxBack}>
            {woodGrain(34, 24, 332, 252, '#3f2a1e', '#2a1c14', '#000000', PIXEL, 'backwall')}
            {pixelGlow(200, 96, GLOW_RINGS, PIXEL, 'glow')}
          </g>

          {/* ============ interior mid layer: rail, hangers, shelf, rug (parallax depth) ============ */}
          <g className={styles.parallaxMid}>
            {/* rug on the closet floor */}
            <rect x="70" y="252" width="260" height="18" fill="url(#halftoneRug)" opacity="0.5" />
            <rect x="70" y="252" width="260" height="18" fill="#e8d9ff" opacity="0.25" />

            {/* soft contact shadow under the hanging clothes */}
            <ellipse cx="200" cy="248" rx="150" ry="8" fill="#2a1c14" opacity="0.35" />

            {/* glass shelf with folded clothes + a shoe resting on it */}
            <g>
              <rect x="40" y="192" width="320" height="4" fill="#ffffff" opacity="0.75" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" />
              <rect x="40" y="196" width="320" height="3" fill="#d9f5ea" opacity="0.35" />
              <rect x="40" y="197" width="320" height="4" fill="#000" opacity="0.12" />
              {/* folded clothes stack — sits in the x-gap between hangers 1
                  and 2, and low enough to clear their hems with a visible
                  margin, so it reads as its own shelf item instead of
                  fusing with the dress hanging directly above it (the
                  previous x/y placement shared the dress's own footprint,
                  so its pale top block rasterized as a disconnected
                  fragment stuck to the bottom of the dress) */}
              <rect x="112" y="182" width="34" height="8" fill="#ffd8ec" />
              <rect x="116" y="174" width="30" height="8" fill="#d9f5ea" />
              <rect x="120" y="166" width="26" height="8" fill="#e8d9ff" />
              {/* a little shoe sitting on the shelf */}
              {rasterizePoly(
                [
                  [282, 192],
                  [290, 180],
                  [308, 176],
                  [316, 180],
                  [322, 183],
                  [320, 190],
                ],
                PIXEL,
                (px, py) => (py < 184 ? '#fff3d6' : '#ffb84d'),
                'shelfshoe'
              )}
            </g>

            {/* hanger rail */}
            <g filter="url(#softShadow)">{metalBand(40, RAIL_Y, 320, 6, 'rail')}</g>

            {/* hangers with garments, swished in on open */}
            {GARMENTS.map((g, i) => {
              const cx = HANGER_X[i]
              return (
                <g key={g.id} className={styles.hanger}>
                  <polyline
                    points={`${cx},${RAIL_Y - 8} ${cx - 6},${RAIL_Y - 8} ${cx - 6},${RAIL_Y - 2} ${cx},${RAIL_Y + 1}`}
                    fill="none"
                    stroke="#8c4a6e"
                    strokeWidth="1.4"
                  />
                  <line x1={cx - 16} y1={RAIL_Y + 1} x2={cx + 16} y2={RAIL_Y + 1} stroke="#8c4a6e" strokeWidth="1.6" />
                  {renderSilhouette(g.poly(cx), g.bands, PIXEL, g.id)}
                  {renderStitch(g.stitch(cx), g.id)}
                  {/* tiny hanging charm/tag on the mint tee, a nice decorative touch */}
                  {g.id === 'tee' && (
                    <g>
                      <line x1={cx + 10} y1={RAIL_Y + 4} x2={cx + 14} y2={RAIL_Y + 10} stroke="#8c4a6e" strokeWidth="0.6" />
                      <rect
                        x={cx + 11}
                        y={RAIL_Y + 10}
                        width="6"
                        height="8"
                        fill="#fff3d6"
                        stroke="#4a1030"
                        strokeOpacity="0.3"
                        strokeWidth="0.5"
                      />
                    </g>
                  )}
                </g>
              )
            })}

            {/* ambient sparkle accents inside the wardrobe */}
            {[
              { x: 62, y: 70, size: 2.2, delay: '0s' },
              { x: 340, y: 90, size: 1.6, delay: '0.6s' },
              { x: 200, y: 216, size: 1.4, delay: '1.1s' },
            ].map((sp) => (
              <g key={`${sp.x}-${sp.y}`} className={styles.sparkle} style={{ animationDelay: sp.delay }}>
                {pixelSparkle(sp.x, sp.y, sp.size, PIXEL, '#fff', `sparkle-${sp.x}-${sp.y}`)}
              </g>
            ))}
          </g>
        </svg>

        {/* ============ doors: hinge-mounted, swing open in real CSS 3D ============
            Plain HTML divs (not SVG <g>s — see the file-level comment for why),
            each holding its own small <svg> sliced from the same 400x300 space
            via viewBox, positioned to exactly overlay that slice. */}
        <div ref={doorLeftRef} className={`${styles.door} ${styles.doorLeft}`}>
          <svg viewBox="34 24 166 252" className={styles.doorSvg} preserveAspectRatio="none" shapeRendering="crispEdges">
            <DoorDefs />
            {woodGrain(34, 24, 166, 252, '#F3CDA3', '#D8945C', '#3a2114', PIXEL, 'doorL')}
            <rect x="46" y="38" width="142" height="224" fill="#FFE4C2" opacity="0.4" stroke="#3a2114" strokeOpacity="0.4" strokeWidth="1.2" />
            <rect x="46" y="38" width="142" height="112" fill="#8A5A34" opacity="0.18" />
            <rect x="34" y="24" width="166" height="252" fill="url(#halftone)" opacity="0.12" />
            {/* hinge-side molding accent */}
            <rect x="34" y="24" width="6" height="252" fill="#3a2114" opacity="0.3" />
            {/* handle */}
            <g filter="url(#doorSoftShadow)">{metalBand(180, 142, 6, 20, 'handleL')}</g>
          </svg>
        </div>

        <div ref={doorRightRef} className={`${styles.door} ${styles.doorRight}`}>
          <svg viewBox="200 24 166 252" className={styles.doorSvg} preserveAspectRatio="none" shapeRendering="crispEdges">
            <DoorDefs />
            {woodGrain(200, 24, 166, 252, '#F3CDA3', '#D8945C', '#3a2114', PIXEL, 'doorR')}
            <rect x="212" y="38" width="142" height="224" fill="#FFE4C2" opacity="0.4" stroke="#3a2114" strokeOpacity="0.4" strokeWidth="1.2" />
            <rect x="212" y="38" width="142" height="112" fill="#8A5A34" opacity="0.18" />
            <rect x="200" y="24" width="166" height="252" fill="url(#halftone)" opacity="0.12" />
            <rect x="360" y="24" width="6" height="252" fill="#3a2114" opacity="0.3" />
            <g filter="url(#doorSoftShadow)">{metalBand(214, 142, 6, 20, 'handleR')}</g>
            {/* a little pixel heart charm dangling off the right handle */}
            <line x1="217" y1="168" x2="217" y2="176" stroke="#8c4a6e" strokeWidth="0.6" />
            {pixelGrid(
              ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
              { '#': '#ff74b8' },
              210,
              176,
              2,
              'heart'
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}

export default WardrobeDoorIntro
