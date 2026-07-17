/**
 * Renders ASCII pixel-art (an array of equal-length strings, one char per
 * cell) as crisp, scalable SVG rects — the shared engine behind every
 * illustration in the app (weather icons, the wardrobe door, etc.) so they
 * all read as one consistent bitmap/dot-art style.
 *
 * `matrix`: string[] — rows top-to-bottom, '.' means empty/transparent.
 * `palette`: { [char]: cssColor } — maps every non-'.' char to a fill color.
 */
function PixelIcon({ matrix, palette, size = 40, className = '', ...rest }) {
  const rows = matrix.length
  const cols = matrix[0]?.length || 0

  const cells = []
  matrix.forEach((row, y) => {
    ;[...row].forEach((char, x) => {
      const fill = palette[char]
      if (!fill) return
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} data-char={char} />)
    })
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {cells}
    </svg>
  )
}

export default PixelIcon
