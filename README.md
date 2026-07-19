# Dresso

날씨 기반 패션 추천 웹앱. Dress + espresso — 커피 한 잔처럼 가볍게, 오늘 뭘 입을지에 대한 고민을 덜어주는 서비스를 목표로 합니다. 위치·성별·선호 스타일과 실시간 날씨를 조합해 코디를 추천하고, 내 옷장을 기록하고, 커뮤니티에서 코디를 공유할 수 있습니다. 옷 사진을 올리면 픽셀아트로 변환해 종이인형에 입혀보는 "픽셀 드레스업"(`/dressup`, 베타) 기능도 있습니다.

## 기술 스택

**Frontend**
- React (Vite), React Router
- CSS Modules — 프로젝트 전체 스타일링 방식 통일
- 폰트: Mona12 (noonnu.cc/font_page/1792, 픽셀/비트맵 폰트)

**Backend**
- Node.js + Express
- MongoDB Atlas (Mongoose)
- JWT 기반 인증, bcrypt 비밀번호 해싱
- Nodemailer (선택 사항 — 문의/비즈니스 제안 접수 시 이메일 알림, 미설정 시 DB 저장만 수행)

**외부 API**
- [Open-Meteo](https://open-meteo.com) — 실시간 날씨 + 7일 예보. API 키가 필요 없어 별도 서버 프록시 없이 클라이언트에서 직접 호출합니다. (초기에는 기상청 단기예보 API를 검토했으나, 최대 2~3일치만 제공되는 한계와 API 키 발급 절차 때문에 API 키 없이 최대 16일치를 제공하는 Open-Meteo로 전환했습니다.)
- OpenRouter (LLM) — AI 기반 코디 추천 문구 생성 등에 활용 예정, 아직 미연동

### DB로 MongoDB Atlas를 선택한 이유

1. **유연한 스키마**: 사용자 선호 스타일 배열, 옷장 아이템, 게시물의 스타일 태그처럼 배열·중첩 구조가 많은 데이터를 다루기 편합니다.
2. **배포 환경과의 호환성**: SQLite는 파일 기반 DB라 임시 파일시스템을 쓰는 무료 호스팅에 배포할 경우 데이터가 유실될 위험이 있습니다. MongoDB Atlas는 별도 클라우드에 데이터가 영속됩니다.
3. **무료 티어로 충분**: M0 클러스터(512MB)는 초기 개발/MVP 단계에 충분합니다.

## 폴더 구조

```
dresso/
  client/                    Vite + React 프론트엔드
    src/
      components/            Header, Footer, Button, Card, Input, Modal,
                              CollageCard, PixelIcon, WeatherIcon, WeatherCard,
                              LocationSelector, StyleSelector/StyleTagPicker,
                              GenderSelector, LinkImportForm, PostCard,
                              UserProfileModal, MonthCalendar, WardrobeDoorIntro,
                              TodayMoodboard, SafeImg,
                              DollCanvas, UploadSlot, HairPicker,
                              ExpressionPicker, EyeColorPicker (픽셀 드레스업용),
                              GradientMesh/ParallaxBackground/PixelSky/
                              ShootingStars/FloatingParticles/Dither/ClickSpark
                              (장식용 배경·인터랙션 레이어)
      pages/                 Home, MyWardrobe, OutfitRecommend, ShareFits,
                              Calendar, Community, About, Contact, Business,
                              Login, Register, Account, PixelDressUp
      contexts/               UserContext, LocationContext, StyleContext
      hooks/                  useAuth, useWeather, useWeeklyForecast,
                              useParallaxPointer, useBackgroundPause
      styles/                 global.css, variables.css
      utils/                  WeatherService.js, recommendEngine.js, apiClient.js,
                              authApi/wardrobeApi/combosApi/postsApi/usersApi/
                              calendarNotesApi/linkPreviewApi.js, dateUtils.js,
                              scrollReveal.js, pixelateImage.js (픽셀 드레스업용
                              캔버스 기반 픽셀화 + 배경 제거)
      data/                   regions.js, styleCategories.js, wardrobeCategories.js,
                              weeklyComments.js, moodboardData.js, dollLayout.js
                              (픽셀 드레스업 인형 좌표 정의)
    public/
  server/                     Express 백엔드
    routes/                  authRoutes, wardrobeRoutes, outfitComboRoutes,
                              linkPreviewRoutes, postRoutes, userRoutes,
                              contactRoutes, businessInquiryRoutes,
                              calendarNoteRoutes
    controllers/              각 라우트에 대응하는 컨트롤러
    models/                   User, Wardrobe, OutfitCombo, Post, Like, Comment,
                              Contact, BusinessInquiry, CalendarNote
    middleware/                authMiddleware.js (JWT 인증)
    config/                    db.js (MongoDB 연결)
    utils/                     mailer.js (nodemailer 헬퍼)
```

## 로컬 실행 방법

### 0. 사전 준비

- Node.js 18+ (개발 환경: v24)
- MongoDB Atlas 무료 클러스터 (또는 로컬 MongoDB)
- 기상청 API 키는 더 이상 필요하지 않습니다 (Open-Meteo는 키 없이 사용)

### 1. 백엔드 (server)

```bash
cd server
npm install
cp .env.example .env   # 이후 .env를 실제 값으로 채워넣기
npm run dev             # nodemon으로 실행 (http://localhost:5000)
```

`server/.env` 값:

```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/dresso?retryWrites=true&w=majority
JWT_SECRET=<임의의 긴 랜덤 문자열>
OPENROUTER_API_KEY=<OpenRouter API 키, AI 추천 기능용 — 당장 코드에서 사용하지는 않음>

# 아래는 선택 사항입니다. 비워두면 문의/비즈니스 제안은 DB에만 저장되고 이메일은 발송되지 않습니다.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
CONTACT_NOTIFY_TO=
```

`MONGO_URI`가 placeholder 상태여도 서버는 죽지 않고 계속 실행되며(콘솔에 경고만 출력), 인증/DB 관련 기능만 동작하지 않습니다.

### 2. 프론트엔드 (client)

```bash
cd client
npm install
cp .env.example .env   # 필요 시 API 서버 주소 수정
npm run dev             # http://localhost:5173
```

`client/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Vercel 배포

`client`와 `server`는 별도의 Vercel 프로젝트 2개로 배포합니다 (하나의 저장소, 프로젝트만 분리).

1. GitHub 등에 이 저장소를 올린 뒤, Vercel에서 **New Project**를 두 번 만듭니다.
2. **백엔드 프로젝트**: Root Directory를 `server`로 지정. Vercel이 `server/vercel.json`을 보고 Express 앱을 서버리스 함수로 배포합니다. Environment Variables에 `server/.env`에 있는 값들(`MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, 필요 시 `SMTP_*`)을 그대로 등록하세요. 배포 후 나오는 주소(예: `https://dresso-server.vercel.app`)를 기억해둡니다.
3. **프론트엔드 프로젝트**: Root Directory를 `client`로 지정(Vite 프레임워크 자동 인식). Environment Variables에 `VITE_API_BASE_URL=https://dresso-server.vercel.app/api`(2번에서 받은 백엔드 주소 + `/api`)를 등록합니다. `client/vercel.json`이 React Router의 클라이언트 라우팅(새로고침 시 404 방지)을 처리합니다.
4. (선택) 백엔드 프로젝트의 `CORS_ORIGIN` 환경 변수에 프론트엔드 배포 주소(예: `https://dresso.vercel.app`)를 등록하면 그 출처만 API를 호출할 수 있도록 제한됩니다. 비워두면 모든 출처를 허용합니다.
5. MongoDB Atlas의 **Network Access**에서 Vercel 서버리스 함수가 접근할 수 있도록 `0.0.0.0/0`(모든 IP 허용)이 등록돼 있는지 확인하세요 — 서버리스 환경은 고정 IP가 아니라서 특정 IP만 허용하면 연결이 막힙니다.

## 페이지 & API 엔드포인트

| 페이지 | 라우트 | 주요 API 엔드포인트 |
|---|---|---|
| Home | `/` | Open-Meteo (클라이언트 직접 호출) |
| Login / Register | `/login` `/register` | `POST /api/auth/login`, `POST /api/auth/register` |
| Outfit recommendation | `/recommend` | Open-Meteo |
| My wardrobe | `/wardrobe` | `GET/POST /api/wardrobe`, `DELETE /api/wardrobe/:id`, `POST /api/link-preview`, `GET/POST /api/combos` |
| Calendar (주간 + 전체 보기) | `/calendar` | Open-Meteo, `GET/PUT/DELETE /api/calendar-notes` |
| Share my fits | `/share-fits` | `GET /api/combos`, `GET/POST /api/posts` |
| Community | `/community` | `GET /api/posts`, `POST /api/posts/:id/like`, `GET/POST /api/posts/:id/comments`, `GET /api/users/:id`, `POST /api/users/:id/follow` |
| About app | `/about` | 없음 (정적) |
| 문의하기 | `/contact` | `POST /api/contact` |
| 비즈니스 제안하기 | `/business` | `POST /api/business-inquiries` |
| 계정 설정 | `/account` | `GET /api/auth/me`, `PATCH /api/users/me` |
| 픽셀 드레스업 (베타) | `/dressup` | 없음 (완전 클라이언트 사이드) |

## 다음 단계 (Next Steps)

1. **이미지 스토리지 연동** — 현재 ShareFits 업로드는 base64 데이터 URL을 그대로 DB에 저장합니다. 실제 서비스에서는 S3/Cloudinary 등 오브젝트 스토리지로 교체하는 것을 권장합니다.
2. **OpenRouter(LLM) 연동** — 추천 결과에 자연어 설명을 생성하는 기능.
3. **테스트 코드** — 현재는 수동 검증(Playwright 스크립트)만 수행했습니다. `recommendEngine.js`처럼 순수 함수부터 유닛 테스트를 추가하면 좋습니다.
