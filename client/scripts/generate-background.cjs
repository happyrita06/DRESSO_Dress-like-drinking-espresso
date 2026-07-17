// Regenerates the seamless Y2K/dreamcore background tiles used across the
// whole app. Run with:
//   node scripts/generate-background.cjs
// Everything is rasterized onto a fixed pixel grid (see PIXEL below) and
// drawn as <rect> blocks with shape-rendering="crispEdges" — clouds, stars,
// and halftone dots all read as 8-bit/bitmap art instead of smooth vector
// shapes.
//
// Output is split into two tiles instead of one so ParallaxBackground.jsx
// can animate/depth-layer them independently:
//   - y2k-clouds-tile.svg: opaque bg + halftone dots + clouds (the "back"
//     and "mid" depth layers)
//   - y2k-stars-tile.svg: transparent bg, pixel starbursts + blinking
//     sparkle dots (the "near" depth layer, sits on top)
// A separate animated layer of small pink pixel-squares blinks via SMIL
// <animate> for the twinkling sparkle effect (this keeps animating even
// though the SVG is only ever used as a CSS background-image — SMIL runs
// regardless of how the SVG document is embedded). Sparkle <animate>
// elements carry a class that an embedded <style>/@media block disables
// under prefers-reduced-motion, since that's a CSS-only mechanism SMIL
// doesn't otherwise obey.
const fs = require('fs');
const path = require('path');

const TILE = 900;
const PIXEL = 9; // one "pixel" block, in SVG user-units — smaller = finer/more detailed pixel art
const GRID = TILE / PIXEL; // 100

const COLOR = {
  bg: '#FFF9FC',
  cloudHi: '#FFFFFF',
  cloudBase: '#FFEAF5',
  softPink: '#FFD8EC',
  medPink: '#FFBCD9',
  hotPink: '#FF74B8',
  darkPink: '#FF4F9E',
  sparkle: '#FF2E8F',
  // extra star hues — still the pink/rose/magenta family, just spread wider
  // across it (coral-warm to violet-cool) so stars don't all read as one
  // uniform color the way a single hotPink/darkPink pair did.
  coralPink: '#FF8FA3',
  rosePink: '#FFB6D9',
  fuchsia: '#E8529E',
  magentaDeep: '#D6409F',
};

// Per-cloud tint variants — small shifts within the same pink family so
// clouds read as varied without introducing off-palette hues. Each variant
// overrides just rim/base/hi; the halftone shade dust under every cloud
// stays COLOR.medPink so the shading doesn't clash.
const CLOUD_TINTS = [
  { rim: COLOR.softPink, base: COLOR.cloudBase, hi: COLOR.cloudHi }, // neutral (original)
  { rim: '#FFD2E9', base: '#FFE3F1', hi: '#FFFFFF' }, // warmer, slightly more saturated
  { rim: '#FFE0F0', base: '#FFF0F7', hi: '#FFFFFF' }, // paler / airier
  { rim: '#FFC9E4', base: '#FFDCEF', hi: '#FFF6FB' }, // cooler-leaning, deeper rim
  { rim: '#FFDCEE', base: '#FFEEF6', hi: '#FFFFFF' }, // pale, low-contrast
];

// ---------- deterministic PRNG (so re-runs are reproducible) ----------
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed % 10000) / 10000;
}
function randRange(min, max) {
  return min + rand() * (max - min);
}

// ---------- pixel-grid rasterizer ----------
// `test(px, py)` receives a cell's center in tile-space and returns a fill
// color (or falsy to skip). Cells are snapped to the PIXEL grid so every
// shape's silhouette comes out as blocky squares, never a smooth curve.
// Consecutive same-color cells in a row are merged into one wide <rect> —
// without this a single solid cloud rasterizes to thousands of 12x12 rects
// (multi-MB output); run-length encoding keeps it to one rect per run.
function emitRow(out, gy, runFill, runStartGx, gx) {
  if (!runFill) return out;
  const x = runStartGx * PIXEL;
  const y = gy * PIXEL;
  const w = (gx - runStartGx) * PIXEL;
  return `${out}<rect x="${x}" y="${y}" width="${w}" height="${PIXEL}" fill="${runFill}" />`;
}

function rasterizeLocal(cx, cy, r, test) {
  const gx0 = Math.max(0, Math.floor((cx - r) / PIXEL));
  const gx1 = Math.min(GRID - 1, Math.ceil((cx + r) / PIXEL));
  const gy0 = Math.max(0, Math.floor((cy - r) / PIXEL));
  const gy1 = Math.min(GRID - 1, Math.ceil((cy + r) / PIXEL));
  let out = '';
  for (let gy = gy0; gy <= gy1; gy += 1) {
    let runFill = null;
    let runStartGx = gx0;
    for (let gx = gx0; gx <= gx1; gx += 1) {
      const px = gx * PIXEL + PIXEL / 2;
      const py = gy * PIXEL + PIXEL / 2;
      const fill = test(px, py) || null;
      if (fill !== runFill) {
        out = emitRow(out, gy, runFill, runStartGx, gx);
        runFill = fill;
        runStartGx = gx;
      }
    }
    out = emitRow(out, gy, runFill, runStartGx, gx1 + 1);
  }
  return out;
}

// ---------- halftone dot pattern (pixel squares, not circles) ----------
function patternDefs() {
  return `
    <pattern id="halftoneSparse" width="${PIXEL * 3}" height="${PIXEL * 3}" patternUnits="userSpaceOnUse">
      <rect x="${PIXEL}" y="${PIXEL}" width="${PIXEL}" height="${PIXEL}" fill="${COLOR.medPink}" opacity="0.55" />
    </pattern>
  `;
}

// ---------- pixel sparkle (4-point twinkle, drawn as a blocky plus) ----------
// `size` is in PIXEL units (radius of the longest arm). Produces a classic
// 8-bit twinkle glyph: a tapering vertical + horizontal arm and a smaller
// diagonal accent, all snapped to the grid.
function pixelSparklePath(cx, cy, size, color, accentColor) {
  const cells = [];
  const cgx = Math.round(cx / PIXEL);
  const cgy = Math.round(cy / PIXEL);

  const arm = Math.max(2, Math.round(size));
  for (let i = -arm; i <= arm; i += 1) {
    const dist = Math.abs(i);
    if (dist === arm && arm > 2) continue; // taper the very tip
    cells.push([cgx, cgy + i, color]);
    cells.push([cgx + i, cgy, color]);
  }
  const diag = Math.max(1, Math.round(arm * 0.4));
  for (let i = 1; i <= diag; i += 1) {
    cells.push([cgx + i, cgy + i, accentColor]);
    cells.push([cgx - i, cgy - i, accentColor]);
    cells.push([cgx + i, cgy - i, accentColor]);
    cells.push([cgx - i, cgy + i, accentColor]);
  }
  cells.push([cgx, cgy, COLOR.cloudHi]); // bright core pixel

  return cells
    .map(
      ([gx, gy, fill]) =>
        `<rect x="${gx * PIXEL}" y="${gy * PIXEL}" width="${PIXEL}" height="${PIXEL}" fill="${fill}" />`
    )
    .join('');
}

// ---------- fluffy cloud, rasterized union of circles ----------
function cloudBumps(cx, cy, scale) {
  const unit = 300 * scale;
  const rel = [
    { dx: -1.05, dy: 0.12, r: 0.46 },
    { dx: -0.62, dy: -0.18, r: 0.58 },
    { dx: -0.15, dy: -0.36, r: 0.66 },
    { dx: 0.35, dy: -0.32, r: 0.64 },
    { dx: 0.82, dy: -0.12, r: 0.58 },
    { dx: 1.12, dy: 0.14, r: 0.46 },
    { dx: 0.5, dy: 0.18, r: 0.5 },
    { dx: -0.5, dy: 0.2, r: 0.5 },
    { dx: 0.0, dy: 0.1, r: 0.6 },
  ];
  return rel.map((b) => ({ x: cx + b.dx * unit, y: cy + b.dy * unit, r: b.r * unit }));
}

function inAnyBump(px, py, bumps, extraR) {
  return bumps.some((b) => {
    const dx = px - b.x;
    const dy = py - b.y;
    return dx * dx + dy * dy <= (b.r + extraR) * (b.r + extraR);
  });
}

function cloudG(cx, cy, scale, id, tint) {
  const unit = 300 * scale;
  const bumps = cloudBumps(cx, cy, scale);
  const boundR = 1.4 * unit;

  // three layers, largest-to-smallest: tinted rim, base fill, and a
  // small upper-left highlight cluster per bump for a hint of shading.
  const rim = rasterizeLocal(cx, cy, boundR, (px, py) => (inAnyBump(px, py, bumps, PIXEL) ? tint.rim : null));
  const base = rasterizeLocal(cx, cy, boundR, (px, py) => (inAnyBump(px, py, bumps, 0) ? tint.base : null));
  const hiBumps = bumps.map((b) => ({ x: b.x - PIXEL * 1.3, y: b.y - PIXEL * 1.1, r: b.r * 0.42 }));
  const hi = rasterizeLocal(cx, cy, boundR, (px, py) => (inAnyBump(px, py, hiBumps, 0) ? tint.hi : null));
  // halftone shading dust along the lower edge of the cloud
  const shadeY = cy + 0.3 * unit;
  const shadeRX = 1.15 * unit;
  const shadeRY = 0.4 * unit;
  // row-parity dither (not checkerboard) — every other *row* is filled, so
  // each filled row is one long run-length-encoded rect instead of a rect
  // per cell, while still reading as halftone shading.
  const shade = rasterizeLocal(cx, shadeY, Math.max(shadeRX, shadeRY), (px, py) => {
    const dx = (px - cx) / shadeRX;
    const dy = (py - shadeY) / shadeRY;
    if (dx * dx + dy * dy > 1) return null;
    const gy = Math.round(py / PIXEL);
    return gy % 2 === 0 ? COLOR.medPink : null;
  });

  return `<g data-cloud="${id}">${rim}${base}${hi}${shade}</g>`;
}

// ---------- seamless wrapping ----------
function wrappedCopies(x, y, r) {
  const offsets = [[0, 0]];
  const nearLeft = x - r < 0;
  const nearRight = x + r > TILE;
  const nearTop = y - r < 0;
  const nearBottom = y + r > TILE;

  if (nearLeft) offsets.push([TILE, 0]);
  if (nearRight) offsets.push([-TILE, 0]);
  if (nearTop) offsets.push([0, TILE]);
  if (nearBottom) offsets.push([0, -TILE]);
  if (nearLeft && nearTop) offsets.push([TILE, TILE]);
  if (nearRight && nearTop) offsets.push([-TILE, TILE]);
  if (nearLeft && nearBottom) offsets.push([TILE, -TILE]);
  if (nearRight && nearBottom) offsets.push([-TILE, -TILE]);

  return offsets;
}

// ---------- compose the tile ----------
const clouds = [
  { x: 100, y: 120, scale: 1.5 },
  { x: 560, y: 60, scale: 1.35 },
  { x: 850, y: 260, scale: 1.4 },
  { x: 260, y: 420, scale: 1.6 },
  { x: 650, y: 460, scale: 1.3 },
  { x: 40, y: 560, scale: 1.2 },
  { x: 470, y: 720, scale: 1.5 },
  { x: 850, y: 700, scale: 1.25 },
  { x: 120, y: 830, scale: 1.15 },
  { x: 750, y: 60, scale: 1.05 },
];

// Trimmed from an original 8 down to 6 — the new ShootingStars.jsx layer
// (see src/components/ShootingStars.jsx) now carries some of that "busy
// sky" density instead, so the baked-in tile didn't need as many.
// Deliberately irregular spacing (no shared row/column, no even grid
// rhythm) so the repeating tile doesn't read as a patterned lattice — each
// star sits at a different distance from its neighbors.
const stars = [
  { x: 65, y: 615, size: 8, color: COLOR.hotPink, accent: COLOR.darkPink },
  { x: 845, y: 95, size: 7, color: COLOR.fuchsia, accent: COLOR.magentaDeep },
  { x: 310, y: 800, size: 7, color: COLOR.rosePink, accent: COLOR.hotPink },
  { x: 590, y: 210, size: 5, color: COLOR.coralPink, accent: COLOR.hotPink },
  { x: 130, y: 330, size: 2, color: COLOR.darkPink, accent: COLOR.hotPink },
  { x: 745, y: 555, size: 2, color: COLOR.fuchsia, accent: COLOR.rosePink },
];

// wrappedCopies gives (dx,dy) offsets meant to be applied via an SVG
// transform, but rasterizeLocal clamps its scan range to the tile bounds
// *before* any transform is applied — so a shape straddling an edge had its
// overflow portion clipped off instead of wrapping, leaving a hard seam at
// every tile boundary. Baking the offset into the shape's own center
// coordinates (instead of a post-hoc <g transform>) makes each wrapped copy
// rasterize its own correct slice of the shape at the shifted position.
let cloudsMarkup = '';
clouds.forEach((c, i) => {
  const r = 540 * c.scale;
  const tint = CLOUD_TINTS[i % CLOUD_TINTS.length];
  wrappedCopies(c.x, c.y, r).forEach(([dx, dy]) => {
    cloudsMarkup += cloudG(c.x + dx, c.y + dy, c.scale, `c${i}`, tint);
  });
});

let starsMarkup = '';
stars.forEach((s, i) => {
  const r = s.size * PIXEL * 1.5;
  wrappedCopies(s.x, s.y, r).forEach(([dx, dy]) => {
    starsMarkup += pixelSparklePath(s.x + dx, s.y + dy, s.size, s.color, s.accent);
  });
});

// ---------- animated pink pixel-dot sparkle layer ----------
// Small 1-2px squares scattered across the tile, each independently
// blinking via SMIL <animate> (runs fine even when this SVG is only used
// as a CSS background-image, unlike CSS @keyframes on the element itself).
const SPARKLE_COUNT = 55;
let sparkleMarkup = '';
for (let i = 0; i < SPARKLE_COUNT; i += 1) {
  const gx = Math.floor(randRange(0, GRID));
  const gy = Math.floor(randRange(0, GRID));
  const size = rand() < 0.75 ? 1 : 2; // mostly single pixels, some 2x2
  const dur = randRange(1.4, 3.2).toFixed(2);
  const begin = (-randRange(0, 3.2)).toFixed(2); // negative begin = random phase on load
  const minOpacity = randRange(0.05, 0.2).toFixed(2);
  const maxOpacity = randRange(0.7, 0.9).toFixed(2);
  const SPARKLE_COLORS = [COLOR.sparkle, COLOR.hotPink, COLOR.fuchsia, COLOR.coralPink, COLOR.rosePink, COLOR.magentaDeep];
  const color = SPARKLE_COLORS[Math.floor(rand() * SPARKLE_COLORS.length)];

  sparkleMarkup += `<rect x="${gx * PIXEL}" y="${gy * PIXEL}" width="${PIXEL * size}" height="${
    PIXEL * size
  }" fill="${color}">
    <animate class="reduceMotionOff" attributeName="opacity" values="${minOpacity};${maxOpacity};${minOpacity}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" />
  </rect>`;
}

// disables the sparkle-blink <animate> elements under reduced motion; the
// rects themselves have no static opacity attribute, so once the animation
// stops applying they just render solid (a static, non-jarring fallback).
const reduceMotionStyle = `<style>@media (prefers-reduced-motion: reduce) { .reduceMotionOff { display: none; } }</style>`;

const cloudsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" shape-rendering="crispEdges">
  <defs>${patternDefs()}</defs>
  <rect width="${TILE}" height="${TILE}" fill="${COLOR.bg}" />
  <rect width="${TILE}" height="${TILE}" fill="url(#halftoneSparse)" opacity="0.5" />
  ${cloudsMarkup}
</svg>`;

const starsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" shape-rendering="crispEdges">
  ${reduceMotionStyle}
  ${starsMarkup}
  ${sparkleMarkup}
</svg>`;

const cloudsPath = path.join(__dirname, '..', 'public', 'backgrounds', 'y2k-clouds-tile.svg');
const starsPath = path.join(__dirname, '..', 'public', 'backgrounds', 'y2k-stars-tile.svg');
fs.writeFileSync(cloudsPath, cloudsSvg);
fs.writeFileSync(starsPath, starsSvg);
console.log('wrote', cloudsPath, '- length', cloudsSvg.length);
console.log('wrote', starsPath, '- length', starsSvg.length);
