# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dresso — a weather-based outfit recommendation web app (Dress + espresso). Combines location, gender/style preferences, and real-time weather to recommend outfits, lets users log a personal wardrobe, and has a community feature for sharing fits. No git repo is initialized in this working directory (this is not a git checkout).

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

Double-clicking `start-dresso.bat` at the repo root runs both dev servers and opens the browser.

### Environment

Both apps read from a local `.env` (see `.env.example` in each folder):

- `server/.env`: `PORT`, `MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY` (reserved, not yet wired up), optional `SMTP_*`/`CONTACT_NOTIFY_TO` (contact/business-inquiry email; falls back to DB-only save if unset), optional `CORS_ORIGIN` (defaults to `*`).
- `client/.env`: `VITE_API_BASE_URL` (e.g. `http://localhost:5000/api`).
- If `MONGO_URI` is a placeholder, the server does not crash — it logs a warning and only auth/DB-backed routes fail.

## Architecture

### Client structure (`client/src/`)
- `components/` — shared UI (Header, Footer, Button, Card, Input, Modal, PostCard, WardrobeDoorIntro, ParallaxBackground, ShootingStars, SafeImg, etc.)
- `pages/` — one component per route (Home, MyWardrobe, OutfitRecommend, ShareFits, Calendar, Community, About, Contact, Business, Login, Register)
- `contexts/` — `UserContext`, `LocationContext`, `StyleContext`
- `hooks/` — `useAuth`, `useWeather`, `useWeeklyForecast`, `useParallaxPointer`
- `utils/` — `WeatherService.js`, `recommendEngine.js` (pure recommendation logic), `apiClient.js` (shared fetch wrapper), one `*Api.js` file per backend resource (`authApi`, `wardrobeApi`, `combosApi`, `postsApi`, `usersApi`, `calendarNotesApi`, `linkPreviewApi`), `scrollReveal.js`, `dateUtils.js`
- `data/` — static/config data (`regions.js`, `styleCategories.js`, `wardrobeCategories.js`, `weeklyComments.js`, `moodboardData.js`)
- Styling is CSS Modules throughout (`*.module.css`), no CSS-in-JS or Tailwind. Site font is a pixel/bitmap font (Mona12).

**API calls**: every authenticated/JSON call to the backend goes through `apiClient.js`'s `apiRequest(path, { method, body, token })`, which prefixes `VITE_API_BASE_URL`, attaches the bearer token, and normalizes error messages. Each `utils/*Api.js` file is a thin wrapper around it for one resource — follow that pattern for new endpoints rather than calling `fetch` directly from components.

**Weather**: Open-Meteo is called directly from the client (no API key required, no server proxy) — see `WeatherService.js` / `useWeather.js` / `useWeeklyForecast.js`.

**Animation system**: GSAP + ScrollTrigger drives all scroll/parallax animation. `ScrollTrigger` has no named export from `gsap/ScrollTrigger` — always use the default import. Scroll-triggered reveals must go through `utils/scrollReveal.js`'s `revealFrom()` / `scheduleScrollRefresh()` (not raw `gsap.from()`) — it tracks in-flight tweens so `ScrollTrigger.refresh()` (fired on `ResizeObserver`) doesn't desync staggered animations mid-play. Mouse parallax and scroll depth are shared across independent components via CSS custom properties (`--px`, `--py`, `--scrollY`) written to `document.documentElement` by `useParallaxPointer.js`, not via prop drilling or context. Respect `prefers-reduced-motion` via the shared `prefersReducedMotion()` helper in `scrollReveal.js`.

**Background art**: the pixel-art Y2K background/wardrobe illustrations are hand-generated, not drawn live — `client/scripts/generate-background.cjs` rasterizes shapes to a fixed pixel grid and emits SVG with run-length-encoded `<rect>` rows per scanline (critical for file size) and `shape-rendering="crispEdges"`; output is split into `y2k-clouds-tile.svg` + `y2k-stars-tile.svg`. Regenerate via this script rather than hand-editing the SVGs. `WardrobeDoorIntro.jsx` renders its hinge-animated doors as HTML `<div>` + small inline `<svg>` per door (not SVG `<g>`) because GSAP's 3D `rotationY` flattens to a 2D `matrix()` on SVG groups.

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

## Deployment notes

`client` and `server` deploy as two separate Vercel projects from the same repo (Root Directory set per-project). The frontend's `VITE_API_BASE_URL` must point at the deployed backend + `/api`; `client/vercel.json` handles SPA routing fallback for React Router. MongoDB Atlas Network Access must allow `0.0.0.0/0` since Vercel serverless functions have no fixed IP.

## Known gaps (not yet implemented, don't assume otherwise)

- `ShareFits` image upload stores base64 data URLs directly in Mongo — no object storage (S3/Cloudinary) is wired up yet.
- OpenRouter/LLM integration for natural-language recommendation text is not yet connected (`OPENROUTER_API_KEY` is reserved but unused).
- No automated test suite exists; verification has been manual/CDP-driven or ad-hoc Playwright scripts.
