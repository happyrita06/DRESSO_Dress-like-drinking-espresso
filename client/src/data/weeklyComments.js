/**
 * Cute one-line comments shown at the bottom of each Calendar day card.
 * Grouped by weather condition; pickWeeklyComment() picks the matching
 * pool for a given day's forecast and returns one at random.
 */

const SNOW_COMMENTS = [
  '눈이 내려요❄️ 미끄럼 방지 신발 꼭 챙기세요!',
  '포근한 니트에 방한템까지, 완벽 방한 준비 완료!',
  '눈 오는 날엔 장갑도 잊지 마세요, 손 시려요!',
]

const RAIN_COMMENTS = [
  '우산 챙기는 거 잊지 마세요 ☔ 오늘은 방수템이 필수!',
  '비 소식이 있어요. 신발이 젖지 않게 방수 신발을 추천해요!',
  '비 오는 날엔 밝은 색 아우터로 우중충함을 날려버려요!',
  '물웅덩이 조심! 발목이 편한 신발이 좋겠어요.',
]

const FREEZING_COMMENTS = [
  '오늘 진짜 추워요 🥶 패딩 없이는 못 나가요!',
  '핫팩 필수인 날씨! 목도리로 목까지 꽁꽁 싸매세요.',
  '칼바람 부는 날, 레이어드로 완전무장 하고 나가요.',
]

const HOT_COMMENTS = [
  '오늘 너무 더워요! 시원한 소재로 가볍게 가요 🍧',
  '땀 조심! 통풍 잘 되는 옷으로 시원하게 보내세요.',
  '그늘이 필요한 날씨, 모자나 양산 챙기는 센스!',
]

const HUMID_COMMENTS = [
  '습도가 높아 눅눅해요. 통기성 좋은 소재를 골라보세요.',
  '끈적한 하루, 흡습속건 소재로 쾌적하게 보내요.',
]

const MILD_COMMENTS = [
  '완벽한 날씨! 오늘은 마음껏 꾸미기 좋은 날이에요✨',
  '산책하기 딱 좋은 날씨, 가볍게 걸쳐 입고 나가보세요.',
  '쌀쌀하지도 덥지도 않은, 코디하기 제일 즐거운 날!',
]

const DEFAULT_COMMENTS = [
  '오늘 하루도 스타일리시하게! Dresso가 응원할게요.',
  '날씨에 맞는 코디로 기분 좋은 하루 시작해봐요.',
]

// Open-Meteo/WMO weather codes: 71-77/85-86 are snow, 51-67/80-82/95-99 are
// other precipitation (rain/drizzle/showers/thunderstorm).
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])

// Same day-count approach as recommendEngine.js's pickStylesForDay — a
// deterministic day index instead of Math.random() so the comment doesn't
// just happen to repeat across a week's worth of similar-weather days
// (Math.random() over a 3-4 item pool collides often across 7 draws), and
// so a given calendar day always shows the same comment if revisited.
function dayIndexFromSeed(seed) {
  const digits = String(seed).replace(/[^0-9]/g, '')
  if (digits.length < 8) return 0
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function pickForDay(pool, dateSeed) {
  if (!dateSeed) return pool[Math.floor(Math.random() * pool.length)]
  return pool[dayIndexFromSeed(dateSeed) % pool.length]
}

/**
 * @param {object} forecast
 * @param {number} forecast.tmp
 * @param {number} [forecast.pop]
 * @param {number} [forecast.weatherCode]
 * @param {number} [forecast.reh]
 * @param {string} [forecast.dateSeed] - e.g. a Calendar day's date; rotates
 *   which comment in the matching pool shows so the same one doesn't keep
 *   recurring across the week. Omit for the old random-each-render behavior.
 */
export function pickWeeklyComment({ tmp, pop = 0, weatherCode = 0, reh = null, dateSeed = null }) {
  if (SNOW_CODES.has(weatherCode)) return pickForDay(SNOW_COMMENTS, dateSeed)
  if (RAIN_CODES.has(weatherCode) || pop >= 60) return pickForDay(RAIN_COMMENTS, dateSeed)
  if (tmp < 0) return pickForDay(FREEZING_COMMENTS, dateSeed)
  if (tmp >= 28) return pickForDay(HOT_COMMENTS, dateSeed)
  if (reh !== null && reh >= 75) return pickForDay(HUMID_COMMENTS, dateSeed)
  if (tmp >= 10 && tmp <= 23) return pickForDay(MILD_COMMENTS, dateSeed)
  return pickForDay(DEFAULT_COMMENTS, dateSeed)
}

export default pickWeeklyComment
