# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dresso — a weather-based outfit recommendation web app (Dress + espresso). Combines location, gender/style preferences, and real-time weather to recommend outfits, lets users log a personal wardrobe, and has a community feature for sharing fits.

Two independent Node projects in one repo, deployed as two separate Vercel projects (same repo, different Root Directory):
- `client/` — Vite + React 19 frontend
- `server/` — Express + MongoDB (Mongoose) backend

## Commands

Run each from its own directory (`client/` or `server/`) — there is no root-level package.json or workspace tooling.

**Server** (`server/`)
- `npm run dev` — nodemon, http://localhost:5000
- `npm start` — plain `node index.js`
- No test suite or lint script currently configured.

**Client** (`client/`)
- `npm run dev` — Vite dev server, http://localhost:5173
- `npm run build` — production build (`vite build`)
- `npm run preview` — preview a production build
- `npm run lint` — oxlint
- No test suite currently configured (README notes manual/Playwright verification only).

### Environment

Both apps read from a local `.env` (see `.env.example` in each folder):

- `server/.env`: `PORT`, `MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY` (reserved, not yet wired up), optional `SMTP_*`/`CONTACT_NOTIFY_TO` (contact/business-inquiry email; falls back to DB-only save if unset), optional `CORS_ORIGIN` (defaults to `*`).
- `client/.env`: `VITE_API_BASE_URL` (e.g. `http://localhost:5000/api`).
- If `MONGO_URI` is a placeholder, the server does not crash — it logs a warning and only auth/DB-backed routes fail.

## Architecture

### Client structure (`client/src/`)
- `components/` — shared UI (Header, Footer, Button, Card, Input, Modal, PostCard, WardrobeDoorIntro, ParallaxBackground, ShootingStars, SafeImg, DollCanvas, UploadSlot, HairPicker, ExpressionPicker, EyeColorPicker, etc.)
- `pages/` — one component per route (Home, MyWardrobe, OutfitRecommend, ShareFits, Calendar, Community, About, Contact, Business, Login, Register, Account, PixelDressUp)
- `contexts/` — `UserContext`, `LocationContext`, `StyleContext`
- `hooks/` — `useAuth`, `useWeather`, `useWeeklyForecast`, `useParallaxPointer`, `useBackgroundPause` (stamps `data-bg-paused` on `<html>` on tab visibility change, mounted once in `App.jsx`, so the always-on decorative background loops pause via their own `animation-play-state` CSS instead of burning CPU/GPU in a backgrounded tab)
- `utils/` — `WeatherService.js`, `recommendEngine.js` (pure recommendation logic), `apiClient.js` (shared fetch wrapper), one `*Api.js` file per backend resource (`authApi`, `wardrobeApi`, `combosApi`, `postsApi`, `usersApi`, `calendarNotesApi`, `linkPreviewApi`), `scrollReveal.js`, `dateUtils.js`, `pixelateImage.js` (canvas-based pixelation + background removal for PixelDressUp uploads)
- `data/` — static/config data (`regions.js`, `styleCategories.js`, `wardrobeCategories.js`, `weeklyComments.js`, `moodboardData.js`, `dollLayout.js` — see Pixel dress-up section below)
- Styling is CSS Modules throughout (`*.module.css`), no CSS-in-JS or Tailwind. Site font is a pixel/bitmap font (Mona12).

**API calls**: every authenticated/JSON call to the backend goes through `apiClient.js`'s `apiRequest(path, { method, body, token })`, which prefixes `VITE_API_BASE_URL`, attaches the bearer token, and normalizes error messages. Each `utils/*Api.js` file is a thin wrapper around it for one resource — follow that pattern for new endpoints rather than calling `fetch` directly from components.

**Weather**: Open-Meteo is called directly from the client (no API key required, no server proxy) — see `WeatherService.js` / `useWeather.js` / `useWeeklyForecast.js`.

**Animation system**: GSAP + ScrollTrigger drives all scroll/parallax animation. `ScrollTrigger` has no named export from `gsap/ScrollTrigger` — always use the default import. Scroll-triggered reveals must go through `utils/scrollReveal.js`'s `revealFrom()` / `scheduleScrollRefresh()` (not raw `gsap.from()`) — it tracks in-flight tweens so `ScrollTrigger.refresh()` (fired on `ResizeObserver`) doesn't desync staggered animations mid-play. Mouse parallax and scroll depth are shared across independent components via CSS custom properties (`--px`, `--py`, `--scrollY`) written to `document.documentElement` by `useParallaxPointer.js`, not via prop drilling or context. Respect `prefers-reduced-motion` via the shared `prefersReducedMotion()` helper in `scrollReveal.js`.

**Background art**: the pixel-art Y2K background/wardrobe illustrations are hand-generated, not drawn live — `client/scripts/generate-background.cjs` rasterizes shapes to a fixed pixel grid and emits SVG with run-length-encoded `<rect>` rows per scanline (critical for file size) and `shape-rendering="crispEdges"`; output is split into `y2k-clouds-tile.svg` + `y2k-stars-tile.svg`. Regenerate via this script rather than hand-editing the SVGs. `WardrobeDoorIntro.jsx` renders its hinge-animated doors as HTML `<div>` + small inline `<svg>` per door (not SVG `<g>`) because GSAP's 3D `rotationY` flattens to a 2D `matrix()` on SVG groups.

**Glassmorphism**: `Card`, `Header`, `Button` (secondary/ghost), `Input`, `Modal`, and `CollageCard` all use a shared translucent-panel formula (tinted gradient background + heavy `backdrop-filter: blur() saturate()` + light border) instead of solid fills, deliberately layered under the app's pixel-art decorations (washi tape, torn-paper photo edges, Mona12 text), which stay solid on top — the intent is "glass card in a pixel scrapbook," not a full aesthetic replacement. `Card`'s glass surface also carries a mouse-responsive light-sheen `::after` (a radial-gradient positioned via the same `--px`/`--py` vars `useParallaxPointer.js` writes, blended with `mix-blend-mode: overlay` at low opacity) — keep any future hover/sheen effects on cards subtle: a stronger version of this exact technique was previously the root cause of a "blurry popup" legibility bug.

**Decorative background/interaction layers** (mounted in `App.jsx`, all `aria-hidden`, most no-op under `prefers-reduced-motion`): `GradientMesh` (soft drifting color blobs), `ParallaxBackground` (the Y2K tile layers above), `PixelSky`/`ShootingStars`/`FloatingParticles`, `Dither` (an animated low-res canvas wave field with Bayer-dithered quantization and a pixel-blocked, cursor-following ripple/melt effect), and `ClickSpark` (click-burst). These stack at specific `z-index` tiers relative to `ParallaxBackground`'s *opaque* background-color — anything meant to be visible must sit in the `-1` tier (mounted after `ParallaxBackground`) or it silently renders fully hidden behind that opaque layer.

**Pixel icon animation hook**: `PixelIcon.jsx` (the shared engine behind every bitmap icon, including `WeatherIcon`) stamps each rendered `<rect>` with `data-char={char}` from the source ASCII matrix. `WeatherIcon.module.css` uses this to target specific icon parts by character (`rect[data-char="W"]` = raindrop, `"R"` = sun ray, etc.) with per-part CSS keyframe animations — the matrix chars in `WeatherIcon.jsx`'s `ICONS` map effectively double as an animation-targeting API, so changing a char there changes what animates.

**Pixel dress-up** (`/dressup`, `PixelDressUp.jsx`, BETA-badged): upload a garment photo per category (outer/top/bottom/shoes/accessory), it's client-side pixelated + background-removed (`utils/pixelateImage.js`), then stretched onto a paper-doll illustration (`DollCanvas.jsx`) at fixed per-gender/category boxes defined in `data/dollLayout.js` (`LAYER_POSITIONS`). Key rules baked into `dollLayout.js`, all discovered/tuned through iterative visual follow-up requests (the box comments in that file are a full log of each adjustment and its reasoning — read them before changing a box, don't just eyeball new numbers):
  - Most categories are stretch-filled (`object-fit: fill` semantics) into their box, then (`outer`/`bottom` only — see `SILHOUETTE_MASKED_CATEGORIES` in `DollCanvas.jsx`) clipped to the doll's real body silhouette via canvas `destination-in`. `top`/`shoes` are deliberately *not* silhouette-masked (clipping was cutting sleeves/boot shafts down to nothing) — for those two, whatever the box's own coordinates say is exactly what renders, no safety net, so getting the box right matters more.
  - `outer` currently reuses `top`'s exact box (kept in sync manually, not derived) per an explicit request to not constrain arm/sleeve volume.
  - `shoes`' box bottom edge must always stay pinned to the doll's measured sole line (the real per-gender pixel measurement is in that box's own comment) — repeated center-anchored width/height scaling drifted this pin upward and left a gap below the foot uncovered; any future edit to `shoes` must re-derive `height` from `(sole% - top%)` rather than scaling top/height together.
  - `NECK_CROP_RATIO` (+`getNeckCropRatio(category, hasNeckline)`) crops a fraction off the *source photo's* own top edge before stretching, for garments with a real neckline — skippable per-upload via the "목선이 있는 옷이에요" checkbox in `UploadSlot.jsx` (wired through `PixelDressUp.jsx`'s `neckFlags` state), for photos with no neck-hole to trim (off-shoulder, tube tops).
  - Hair wig cutouts (`HAIR_POSITIONS`) are separate per-style boxes, not one shared box + scale — see that section's comment for why. Any leftover antialiased-edge "fringe" color around a wig's face-hole (e.g. `hair-f-hush.png`'s jawline) is fixed by directly editing the PNG's alpha channel (eroding the inner hole boundary a few px in the affected row range), not by moving `HAIR_POSITIONS` — this was done with a one-off Python/PIL script, no repo script exists for it yet.
  - Example/reference photos shown at the bottom of the page (`EXAMPLE_PHOTOS` in `PixelDressUp.jsx`, imported from `client/src/assets/dressup-examples/`) are copies of the canonical originals kept at **`Dresso/sample/`** (repo root, outside `client/`) — `sample 상의.jpg` / `sample 아우터.jpg` / `sample 바지.jpg` / `sample 신발.jpg`. If these examples ever need to be swapped or regenerated, get them from `Dresso/sample/`, not by re-deriving new ones.
  - `accessory` (hats/necklaces/belts/bracelets/anklets, keyword-resolved from a free-text memo into `ACCESSORY_ZONES` via `resolveAccessoryPosition`) is the one category NOT in `FILL_CATEGORIES` — it's drawn with `object-fit: contain`, so it always preserves the *uploaded photo's own* aspect ratio inside its resolved zone box. This only holds because `PIXELATE_OPTIONS.accessory` in `PixelDressUp.jsx` deliberately omits `pixelHeight`/`outputHeight` (a fixed square there previously squashed non-square accessories like belts — see `ACCESSORY_ZONES`' own file-level comment in `dollLayout.js`). `waist` (belt) was scaled 0.6x around its own center per an explicit follow-up request; `neck` (necklace) was scaled 1.5x + moved down 5mm. `pixelateImage.js`'s background-removal also needed a fix for white/silver necklace photos leaving a white un-removed halo — a flat per-category threshold bump for 'accessory' fixed the halo but started eating into the necklace's own near-white highlights too, so it was replaced with a *color-aware* rule (`isNearWhite` + `WHITE_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY`/`WHITE_LOCAL_BG_COLOR_DISTANCE_THRESHOLD_BY_CATEGORY`): only candidate pixels that are themselves near-white get the more permissive distance-from-background threshold; every other color still uses the tight shared default. `neck` was later scaled 0.8x then 0.7x more around its own center (both explicit follow-ups). `wrist` was split into `wristLeft`/`wristRight` (the doll's own left/right, not screen left/right — see that key's own comment) with a `rotate` degree matching the doll's measured forearm tilt at that height; `resolveAccessoryPosition` now returns an *array* of zones (usually length 1) so a wrist note naming one side renders on just that wrist, while an unspecified or "양쪽"/"둘다" note renders symmetrically on both — `drawContain` (`DollCanvas.jsx`) grew an optional `rotateDeg` param to support this.
  - The female doll's base illustration (`doll-f-base.png`) has a pearl-necklace graphic hand-painted onto the neck skin, which can visually conflict with uploading a necklace accessory there. Two removal attempts (both one-off Python/PIL pixel edits to the PNG — no repo script for this) were tried and **both reverted** per explicit follow-up requests, each time restoring from `client/dist/assets/doll-f-base-*.png` (a stale prebuilt copy that still has the original art — check it's still present before relying on it again): (1) row-wise nearest-skin-neighbor color *averaging* — read as smeared/mushy ("픽셀이 다 뭉개졌어"); (2) per-column verbatim copy of the nearest real clean-skin pixel in that same column (no cross-column blending, meant to preserve flat pixel-art blocks) — still reported as smeared/ruined on a second look ("아직도 뭉개져서 망했어"). **Do not attempt this again with a pixel-editing script** unless explicitly asked — two different automated approaches have now failed the user's visual bar. `doll-f-base.png` is back to its original necklace-included art. If asked again, get explicit direction on the approach first (e.g. hand-editing in an image tool, or accepting the necklace stays and steering uploads elsewhere) rather than re-attempting a variant of the same script-based inpaint.

### Server structure (`server/`)
- `index.js` — Express app setup; also the Vercel serverless entry point (guards `app.listen()` behind `require.main === module` so Vercel's `@vercel/node` can import `app` without starting a real listener)
- `routes/` — one file per resource, mounted under `/api/<resource>` in `index.js`
- `controllers/` — one file per route file, contains the actual handler logic
- `models/` — Mongoose schemas: `User`, `Wardrobe`, `OutfitCombo`, `Post`, `Like`, `Comment`, `Contact`, `BusinessInquiry`, `CalendarNote`
- `middleware/authMiddleware.js` — JWT verification (`verifyToken`), used on any route needing `req.user`
- `config/db.js` — MongoDB connection
- `utils/mailer.js` — nodemailer helper (optional email notifications for contact/business-inquiry submissions)

Auth is JWT-based (`jsonwebtoken` + `bcrypt` for password hashing); no sessions/cookies. Protected routes apply `verifyToken` per-route in the router file (see `outfitComboRoutes.js` / `postRoutes.js` for the pattern), not globally.

### Route ↔ page map

| Page | Route | Backend touched |
|---|---|---|
| Home | `/` | Open-Meteo (client-direct) |
| Login / Register | `/login` `/register` | `POST /api/auth/login`, `POST /api/auth/register` |
| Outfit recommendation | `/recommend` | Open-Meteo |
| My wardrobe | `/wardrobe` | `/api/wardrobe`, `POST /api/link-preview`, `/api/combos` |
| Calendar | `/calendar` | Open-Meteo, `/api/calendar-notes` |
| Share my fits | `/share-fits` | `/api/combos`, `/api/posts` |
| Community | `/community` | `/api/posts`, `/api/posts/:id/like`, `/api/posts/:id/comments`, `/api/users/:id`, `/api/users/:id/follow` |
| Contact / Business | `/contact` `/business` | `POST /api/contact`, `POST /api/business-inquiries` |
| Account settings | `/account` | `GET /api/auth/me`, `PATCH /api/users/me` |
| Pixel dress-up | `/dressup` | none (fully client-side; see Pixel dress-up section below) |

## Deployment notes

Live: GitHub repo `happyrita06/DRESSO_Dress-like-drinking-espresso` (`main` branch), auto-deployed to Vercel on every push. `client` and `server` deploy as two separate Vercel projects from the same repo (Root Directory set per-project — check each project's Settings → General → Root Directory if unsure which is which; Vercel auto-suffixes a project's name if it collides with an existing one, so names alone aren't reliable). The frontend's `VITE_API_BASE_URL` must point at the deployed backend + `/api`, and — since Vite bakes env vars in at *build* time, not runtime — changing it requires a manual redeploy, not just an env var edit. `client/vercel.json` handles SPA routing fallback for React Router. Backend `CORS_ORIGIN` must exactly match the frontend origin with no trailing slash (the `cors` package does a literal string compare against the request's `Origin` header, which never has a trailing slash — a mismatched value here silently manifests client-side as a generic "Failed to fetch", not a CORS-labeled error). MongoDB Atlas Network Access must allow `0.0.0.0/0` since Vercel serverless functions have no fixed IP.

## Known gaps (not yet implemented, don't assume otherwise)

- `ShareFits` image upload stores base64 data URLs directly in Mongo — no object storage (S3/Cloudinary) is wired up yet.
- OpenRouter/LLM integration for natural-language recommendation text is not yet connected (`OPENROUTER_API_KEY` is reserved but unused).
- No automated test suite exists; verification has been manual/CDP-driven or ad-hoc Playwright scripts.
