/**
 * Tiny pixel-art helper: turns a matrix of rows ('X' = filled block, '.' or
 * anything else = empty) into a flat list of SVG <rect> descriptors. Rows
 * don't need to share a length — each is walked independently — which keeps
 * hand-drawing the shapes below easy.
 */
export const PIXEL_UNIT = 4

export function pixelMatrixToRects(matrix, { color, offsetX = 0, offsetY = 0, unit = PIXEL_UNIT }) {
  const rects = []
  matrix.forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      if (cell !== 'X') return
      rects.push({
        key: `${offsetX}-${offsetY}-${x}-${y}`,
        x: (x + offsetX) * unit,
        y: (y + offsetY) * unit,
        width: unit,
        height: unit,
        fill: color,
      })
    })
  })
  return rects
}

export function pixelMatrixSize(matrix, unit = PIXEL_UNIT) {
  const cols = matrix.reduce((max, row) => Math.max(max, row.length), 0)
  return { width: cols * unit, height: matrix.length * unit }
}

// Chunky retro cumulus silhouettes, tapered top / wide bottom, three sizes.
export const CLOUD_MATRICES = {
  sm: [
    '...XXXX...',
    '..XXXXXXX..',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    '.XXXXXXXXXX.',
  ],
  md: [
    '....XXXXX......',
    '...XXXXXXXXX...',
    '..XXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXX',
    '.XXXXXXXXXXXXXX.',
  ],
  lg: [
    '.....XXXXXX........',
    '....XXXXXXXXXX.....',
    '...XXXXXXXXXXXXX...',
    '..XXXXXXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXX',
    '.XXXXXXXXXXXXXXXXXX.',
    '..XXXXXXXXXXXXXXXX..',
  ],
}

// Retro "+"-cross and diagonal sparkle pixel stars, for the twinkle layer.
export const STAR_MATRICES = {
  cross: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
  tinyCross: ['.X.', 'XXX', '.X.'],
  diagonal: ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'],
}
