/**
 * Pixel-art shooting-star glyphs for ShootingStars.jsx — built the same way
 * generate-background.cjs's pixelSparklePath() builds the tile's plus-shaped
 * sparkles (grid-snapped blocky cells, not smooth SVG lines), but these live
 * as plain JS/React output instead of baked into the repeating tile, since a
 * shooting star has to travel across the whole viewport in one continuous
 * motion — something a repeating background tile can't do (see
 * ParallaxBackground.jsx for the layer that renders these).
 *
 * Local grid convention: the star's head sits at gx=0, with the trail
 * extending in the -x direction (tapering off to the left). Callers rotate
 * the whole glyph to match its actual travel angle and pin the CSS
 * transform-origin to the head cell, so the head leads the motion and the
 * trail always reads as sweeping in *behind* it, whichever way it's flying.
 */

// Same pink/rose/magenta family as generate-background.cjs's COLOR — kept as
// a plain hex palette here (rather than importing the .cjs generator) since
// this module ships to the browser and the generator is a Node build script.
export const SHOOTING_STAR_COLORS = [
  { main: '#FF74B8', core: '#FFFFFF', accent: '#FF4F9E' }, // hotPink / darkPink
  { main: '#E8529E', core: '#FFF5FA', accent: '#D6409F' }, // fuchsia / magentaDeep
  { main: '#FFB6D9', core: '#FFFFFF', accent: '#FF74B8' }, // rosePink / hotPink
  { main: '#FF8FA3', core: '#FFFFFF', accent: '#FF2E8F' }, // coralPink / sparkle
]

export const SHOOTING_STAR_VARIANTS = ['single', 'double', 'dotted', 'forked']

// Small "+"-plus head with a bright core pixel and a couple of diagonal
// spark accents — a miniature version of pixelSparklePath's cross+diagonal
// construction from the generator.
function headCells(colors) {
  return [
    [0, -1, colors.main, 1],
    [0, 1, colors.main, 1],
    [1, 0, colors.main, 1],
    [-1, 0, colors.main, 1],
    [1, -1, colors.accent, 0.9],
    [1, 1, colors.accent, 0.9],
    [0, 0, colors.core, 1],
  ]
}

// A single tapering line: solid near the head, thinning to a dashed then
// sparse dotted stretch further out — mirrors the reference sheet's plain
// long-trail glyphs.
function singleTrail(length, colors) {
  const cells = []
  const solidEnd = Math.round(length * 0.35)
  const dashEnd = Math.round(length * 0.7)
  for (let i = 2; i <= length; i += 1) {
    const gx = -i
    if (i <= solidEnd) {
      cells.push([gx, 0, colors.main, 1])
    } else if (i <= dashEnd) {
      if (i % 2 === 0) cells.push([gx, 0, colors.main, 0.7])
    } else if (i % 3 === 0) {
      cells.push([gx, 0, colors.main, 0.4])
    }
  }
  return cells
}

// Two parallel speed-lines of slightly different length, both tapering —
// the reference sheet's double-stroke "‖" trail variant.
function doubleTrail(length, colors) {
  const cells = []
  const rows = [
    { y: -1, len: Math.round(length * 0.62) },
    { y: 1, len: length },
  ]
  rows.forEach(({ y, len }) => {
    for (let i = 2; i <= len; i += 1) {
      const gx = -i
      const t = i / len
      const opacity = t < 0.5 ? 1 : t < 0.8 ? 0.65 : 0.35
      cells.push([gx, y, colors.main, opacity])
    }
  })
  return cells
}

// Discrete dots shrinking in size and fading as they get further from the
// head — the reference sheet's segmented-trail variant.
function dottedTrail(length, colors) {
  const cells = []
  const dots = [4, 7, 10, 14, 18, 23, Math.max(23, length - 2)]
  dots.forEach((gx0, idx) => {
    const size = idx < 2 ? 2 : 1
    const opacity = Math.max(0.3, 1 - idx * 0.13)
    for (let dx = 0; dx < size; dx += 1) {
      for (let dy = 0; dy < size; dy += 1) {
        cells.push([-gx0 - dx, dy - (size > 1 ? 0.5 : 0), colors.main, opacity])
      }
    }
  })
  return cells
}

// Main trail plus a short second trail branching off just behind the head —
// the reference sheet's forked-trail variant.
function forkedTrail(length, colors) {
  const cells = singleTrail(length, colors)
  for (let i = 2; i <= 7; i += 1) {
    const gx = -i
    const gy = Math.min(3, Math.round((i - 2) * 0.6))
    cells.push([gx, gy, colors.accent, i <= 5 ? 0.85 : 0.45])
  }
  return cells
}

const TRAIL_BUILDERS = {
  single: singleTrail,
  double: doubleTrail,
  dotted: dottedTrail,
  forked: forkedTrail,
}

/**
 * Builds one glyph's rect list + viewBox + head anchor (as a 0..1 fraction
 * of width, for CSS transform-origin) ready to drop into an inline <svg>.
 */
export function buildShootingStarGlyph(variant, colors, { length = 26, unit = 3 } = {}) {
  const build = TRAIL_BUILDERS[variant] || singleTrail
  const cells = [...headCells(colors), ...build(length, colors)]

  let minGx = 0
  let maxGx = 0
  let minGy = 0
  let maxGy = 0
  cells.forEach(([gx, gy]) => {
    minGx = Math.min(minGx, gx)
    maxGx = Math.max(maxGx, gx + 1)
    minGy = Math.min(minGy, gy)
    maxGy = Math.max(maxGy, gy + 1)
  })

  const width = (maxGx - minGx) * unit
  const height = (maxGy - minGy) * unit
  const headAnchor = ((0 - minGx) * unit) / width

  const rects = cells.map(([gx, gy, fill, opacity], i) => ({
    key: i,
    x: (gx - minGx) * unit,
    y: (gy - minGy) * unit,
    width: unit,
    height: unit,
    fill,
    opacity,
  }))

  return { rects, width, height, headAnchor }
}
