/**
 * Pure outfit-recommendation engine.
 *
 * recommendOutfit({ tmp, reh, pop, pty, styles, gender }) -> {
 *   band, items: { outer: [...], top: [...], bottom: [...], shoes: [...], accessories: [...] }
 * }
 *
 * No side effects, no fetching — everything it needs comes in as arguments,
 * which makes it straightforward to unit test with plain numbers.
 *
 * Design: temperature decides *how warm* each garment needs to be (via a
 * thickness qualifier + layering hint), while the user's selected style(s)
 * decide *what* that garment actually is (silhouette/name/vibe). The two
 * axes are combined rather than hand-authoring a 20-style x 6-band x
 * 5-category matrix by hand.
 */

export const TEMP_BANDS = [
  {
    id: 'freezing',
    label: '영하',
    min: null,
    max: -0.01,
    thickness: '두꺼운',
    layerHint: '패딩/기모 안감으로 확실히 방한하세요',
  },
  {
    id: 'cold',
    label: '0~9도',
    min: 0,
    max: 9,
    thickness: '도톰한',
    layerHint: '기모 안감이나 니트로 보온하세요',
  },
  {
    id: 'cool',
    label: '10~16도',
    min: 10,
    max: 16,
    thickness: '적당한 두께의',
    layerHint: '자켓 하나로 레이어드하기 좋아요',
  },
  {
    id: 'mild',
    label: '17~22도',
    min: 17,
    max: 22,
    thickness: '얇은',
    layerHint: '가벼운 겉옷 하나면 충분해요',
  },
  {
    id: 'warm',
    label: '23~27도',
    min: 23,
    max: 27,
    thickness: '아주 얇은',
    layerHint: '반팔 위주로 가볍게 입으세요',
  },
  {
    id: 'hot',
    label: '28도 이상',
    min: 28,
    max: null,
    thickness: '시원한 소재의',
    layerHint: '통풍이 잘 되는 소재를 고르세요',
  },
]

export function getTempBand(tmp) {
  return (
    TEMP_BANDS.find((band) => (band.min === null || tmp >= band.min) && (band.max === null || tmp <= band.max)) ||
    TEMP_BANDS[2]
  )
}

// At sub-zero temperatures a style's "usual" outer/shoes noun (e.g. a hoodie
// or canvas sneakers) stops being physically adequate no matter how thick a
// qualifier we prefix it with — so the freezing band overrides just those
// two slots for the primary style pick with genuinely warm essentials,
// while the style's own vibe still drives the description text.
const FREEZING_OVERRIDES = { outer: '롱패딩', shoes: '방한 부츠' }

// Style profiles: one "look" per category, plus a short vibe phrase used in
// the item description. `altForMale` overrides an item that skews
// feminine-coded when gender === 'male'.
const STYLE_PROFILES = {
  캐주얼: {
    vibe: '편안하고 꾸안꾸한',
    outer: '후드 집업',
    top: '기본 티셔츠',
    bottom: '스트레이트 데님',
    shoes: '캔버스 스니커즈',
    accessory: '볼캡',
  },
  '정장/포멀': {
    vibe: '단정하고 격식 있는',
    outer: '테일러드 재킷',
    top: '드레스 셔츠',
    bottom: '슬랙스',
    shoes: '옥스퍼드화',
    accessory: '가죽 벨트',
  },
  스트릿: {
    vibe: '힘 있고 개성 강한',
    outer: '오버사이즈 자켓',
    top: '그래픽 티셔츠',
    bottom: '와이드 카고 팬츠',
    shoes: '청키 스니커즈',
    accessory: '버킷햇',
  },
  미니멀: {
    vibe: '절제되고 톤온톤한',
    outer: '무지 코트',
    top: '무지 니트',
    bottom: '스트레이트 팬츠',
    shoes: '화이트 스니커즈',
    accessory: '심플 손목시계',
  },
  빈티지: {
    vibe: '세월감 있는 레트로한',
    outer: '무스탕 재킷',
    top: '체크 셔츠',
    bottom: '와이드 코듀로이 팬츠',
    shoes: '로퍼',
    accessory: '베레모',
  },
  로맨틱: {
    vibe: '부드럽고 여성스러운',
    outer: '플레어 코트',
    top: '러플 블라우스',
    bottom: '플리츠 스커트',
    shoes: '메리제인 슈즈',
    accessory: '진주 헤어핀',
    altForMale: { top: '오픈카라 셔츠', bottom: '슬림 치노 팬츠' },
  },
  스포티: {
    vibe: '활동적이고 기능적인',
    outer: '트랙 재킷',
    top: '드라이핏 티셔츠',
    bottom: '조거 팬츠',
    shoes: '러닝화',
    accessory: '스포츠 캡',
  },
  에스닉: {
    vibe: '이국적이고 자유로운',
    outer: '패턴 가디건',
    top: '프린트 블라우스',
    bottom: '와이드 팬츠',
    shoes: '태슬 샌들',
    accessory: '우드 비즈 팔찌',
    altForMale: { top: '프린트 셔츠' },
  },
  시크: {
    vibe: '도시적이고 세련된',
    outer: '레더 재킷',
    top: '블랙 터틀넥',
    bottom: '슬림 슬랙스',
    shoes: '첼시 부츠',
    accessory: '미니멀 선글라스',
  },
  프레피: {
    vibe: '단정한 학구적 무드의',
    outer: '브이넥 니트 베스트',
    top: '옥스퍼드 셔츠',
    bottom: '플리츠 스커트',
    shoes: '로퍼',
    accessory: '헤어밴드',
    altForMale: { bottom: '체크 팬츠', accessory: '스트라이프 넥타이' },
  },
  힙합: {
    vibe: '루즈하고 볼드한',
    outer: '오버사이즈 후디',
    top: '그래픽 스웨트셔츠',
    bottom: '배기 팬츠',
    shoes: '하이탑 스니커즈',
    accessory: '체인 목걸이',
  },
  '펑크/락': {
    vibe: '거칠고 반항적인',
    outer: '스터드 레더 재킷',
    top: '밴드 티셔츠',
    bottom: '스키니 블랙진',
    shoes: '워커',
    accessory: '초커',
  },
  컨트리: {
    vibe: '포근하고 자연스러운',
    outer: '데님 재킷',
    top: '체크 셔츠',
    bottom: '스트레이트 진',
    shoes: '워커 부츠',
    accessory: '페도라',
  },
  '리조트/휴양지룩': {
    vibe: '가볍고 리조트 감성의',
    outer: '리넨 셔츠(오픈형)',
    top: '크롭 탑',
    bottom: '플로럴 롱스커트',
    shoes: '플랫 샌들',
    accessory: '스트로 햇',
    altForMale: { top: '리넨 반팔 셔츠', bottom: '린넨 반바지' },
  },
  클래식: {
    vibe: '격식 있고 균형 잡힌',
    outer: '울 코트',
    top: '니트 베스트',
    bottom: '테일러드 슬랙스',
    shoes: '더비화',
    accessory: '실크 스카프',
  },
  모던: {
    vibe: '군더더기 없이 세련된',
    outer: '미니멀 트렌치코트',
    top: '솔리드 셔츠',
    bottom: '스트레이트 슬랙스',
    shoes: '첼시 부츠',
    accessory: '스퀘어 크로스백',
  },
  트렌디: {
    vibe: '요즘 유행에 맞춘',
    outer: '크롭 재킷',
    top: '니트 베스트 레이어드',
    bottom: '와이드 데님',
    shoes: '레트로 러닝화',
    accessory: '미니 크로스백',
  },
  레트로: {
    vibe: '복고풍 무드의',
    outer: '가죽 항공 점퍼',
    top: '스트라이프 니트',
    bottom: '와이드 슬랙스',
    shoes: '스웨이드 스니커즈',
    accessory: '레트로 프레임 선글라스',
  },
  보헤미안: {
    vibe: '자유분방하고 레이어드한',
    outer: '프린지 가디건',
    top: '루즈핏 블라우스',
    bottom: '맥시 스커트',
    shoes: '웨지 샌들',
    accessory: '레이어드 목걸이',
    altForMale: { top: '루즈핏 셔츠', bottom: '와이드 린넨 팬츠' },
  },
  '하이틴/청청': {
    vibe: '풋풋하고 캠퍼스 감성의',
    outer: '데님 재킷',
    top: '크롭 니트',
    bottom: '데님 스커트',
    shoes: '스니커즈',
    accessory: '스크런치',
    altForMale: { top: '루즈핏 맨투맨', bottom: '데님 팬츠', accessory: '캔버스 백팩' },
  },
}

// Expanded from a fixed 2-style default so a user with no style preference
// set still gets day-to-day rotation (see pickStylesForDay) instead of
// always landing on the same 캐주얼+미니멀 pair.
const DEFAULT_STYLE_POOL = ['캐주얼', '미니멀', '스트릿', '시크', '스포티', '클래식']
const CATEGORY_KEYS = ['outer', 'top', 'bottom', 'shoes', 'accessory']
const RAIN_POP_THRESHOLD = 60
// Open-Meteo/WMO weather codes are ordered so that anything >= 51 means some
// form of precipitation is actually happening (drizzle/rain/snow/showers/
// thunderstorm) — codes below that are clear/cloudy/fog.
const PRECIPITATION_CODE_THRESHOLD = 51
const HUMID_THRESHOLD = 70

// Turns a date-shaped seed ("2026-07-17" or "20260717") into a day count
// since the Unix epoch. Used (instead of hashing the seed string) so that
// *consecutive* calendar days always land on *consecutive* rotation
// offsets — a string hash can and did collide between unrelated dates
// (confirmed live: two different days in the same week both hashed to the
// same style pair), which read as "the same outfit repeated" exactly the
// thing this rotation exists to avoid. A day-count walks the whole style
// pool in order before it ever repeats.
function dayIndexFromSeed(seed) {
  const digits = String(seed).replace(/[^0-9]/g, '')
  if (digits.length < 8) return 0
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

// Without a dateSeed, this always returns the same first-2 styles from the
// pool — meaning identical weather always recommended the literal same
// outfit, indefinitely. Real people don't wear the same top every day, so
// this rotates a 2-style window through the pool, keyed by date: same date
// always yields the same pair (stable if you revisit that day, e.g. in
// Calendar), consecutive dates always yield a different pair (see
// dayIndexFromSeed above).
function pickStylesForDay(stylePool, dateSeed) {
  const n = stylePool.length
  if (n <= 1) return stylePool.slice(0, n)
  if (!dateSeed) return stylePool.slice(0, 2)
  const start = dayIndexFromSeed(dateSeed) % n
  return [stylePool[start], stylePool[(start + 1) % n]]
}

function resolveStyleItem(profile, category, gender) {
  if (gender === 'male' && profile.altForMale?.[category]) {
    return profile.altForMale[category]
  }
  return profile[category]
}

// index 0 is the user's primary selected style — that's the slot the
// freezing-band safety override applies to, so a secondary style (index 1)
// still gets to show its own take for variety/layering.
function nounFor({ profile, category, gender, band, index }) {
  if (band.id === 'freezing' && index === 0 && FREEZING_OVERRIDES[category]) {
    return FREEZING_OVERRIDES[category]
  }
  return resolveStyleItem(profile, category, gender)
}

function buildDescription({ band, profile, category, isRainPick, isHumid }) {
  const parts = [`${band.layerHint}.`, `${profile.vibe} 무드를 살려줘요.`]
  if (isRainPick) parts.unshift('비 예보가 있어 방수/발수 소재를 우선했어요.')
  if (isHumid && category === 'top') parts.push('습도가 높으니 통기성 좋은 소재를 고르면 더 쾌적해요.')
  return parts.join(' ')
}

function makeItem({ name, band, profile, category, isRainPick = false, isHumid = false }) {
  return {
    id: `${category}-${name}`,
    category,
    name,
    styleTag: profile.vibe,
    description: buildDescription({ band, profile, category, isRainPick, isHumid }),
    imageUrl: null, // reserved for future artwork/photo integration
  }
}

/**
 * @param {object} input
 * @param {number} input.tmp - temperature in °C
 * @param {number} [input.reh] - relative humidity %
 * @param {number} [input.pop] - precipitation probability %
 * @param {number} [input.weatherCode] - Open-Meteo/WMO weather code
 * @param {string[]} [input.styles] - user's selected style categories
 * @param {'male'|'female'|'all'} [input.gender]
 * @param {string} [input.dateSeed] - e.g. "2026-07-17", or a Calendar day —
 *   rotates which style(s) drive today's pick so the same weather doesn't
 *   always recommend the exact same outfit (see pickStylesForDay). Omit for
 *   the old always-first-two behavior.
 */
export function recommendOutfit({ tmp, reh = null, pop = 0, weatherCode = 0, styles = [], gender = 'all', dateSeed = null }) {
  const band = getTempBand(tmp)
  const isRainy = pop >= RAIN_POP_THRESHOLD || weatherCode >= PRECIPITATION_CODE_THRESHOLD
  const isHumid = reh !== null && reh >= HUMID_THRESHOLD

  const activeStyles = styles.filter((style) => STYLE_PROFILES[style])
  const stylePool = activeStyles.length > 0 ? activeStyles : DEFAULT_STYLE_POOL
  const stylesToUse = pickStylesForDay(stylePool, dateSeed)
  const profiles = stylesToUse.map((style) => ({ style, profile: STYLE_PROFILES[style] }))

  const items = { outer: [], top: [], bottom: [], shoes: [], accessory: [] }

  CATEGORY_KEYS.forEach((category) => {
    const seenNames = new Set()

    profiles.forEach(({ profile }, index) => {
      const baseName = nounFor({ profile, category, gender, band, index })
      const name = `${band.thickness} ${baseName}`
      if (seenNames.has(name)) return
      seenNames.add(name)
      items[category].push(makeItem({ name, band, profile, category, isHumid }))
    })
  })

  // Rain weighting: push a dedicated rain-ready pick to the front of outer
  // and accessory, capped at 2 items per category as required.
  if (isRainy) {
    const rainProfile = profiles[0].profile
    const rainOuterNoun = nounFor({ profile: rainProfile, category: 'outer', gender, band, index: 0 })
    items.outer.unshift(
      makeItem({
        name: `방수 코팅 ${band.thickness} ${rainOuterNoun}`,
        band,
        profile: rainProfile,
        category: 'outer',
        isRainPick: true,
      })
    )
    items.accessory.unshift(
      makeItem({
        name: '3단 자동 우산',
        band,
        profile: rainProfile,
        category: 'accessory',
        isRainPick: true,
      })
    )
  }

  Object.keys(items).forEach((category) => {
    items[category] = items[category].slice(0, 2)
  })

  return {
    band,
    isRainy,
    isHumid,
    styles: stylesToUse,
    items: {
      outer: items.outer,
      top: items.top,
      bottom: items.bottom,
      shoes: items.shoes,
      accessories: items.accessory,
    },
  }
}

export default recommendOutfit
