/**
 * Country / region catalogue for the location selector.
 *
 * The weather feature is backed by the Korea Meteorological Administration's
 * short-term forecast API, which only covers South Korea, so "대한민국" is
 * the only country wired to real data today. The shape (countries -> regions)
 * is kept generic so more countries could be added once another weather
 * source is integrated.
 */

export const COUNTRIES = [
  {
    code: 'KR',
    label: '대한민국',
    regions: [
      { code: 'seoul', label: '서울특별시', lat: 37.5665, lon: 126.978 },
      { code: 'busan', label: '부산광역시', lat: 35.1796, lon: 129.0756 },
      { code: 'daegu', label: '대구광역시', lat: 35.8714, lon: 128.6014 },
      { code: 'incheon', label: '인천광역시', lat: 37.4563, lon: 126.7052 },
      { code: 'gwangju', label: '광주광역시', lat: 35.1595, lon: 126.8526 },
      { code: 'daejeon', label: '대전광역시', lat: 36.3504, lon: 127.3845 },
      { code: 'ulsan', label: '울산광역시', lat: 35.5384, lon: 129.3114 },
      { code: 'sejong', label: '세종특별자치시', lat: 36.4801, lon: 127.289 },
      { code: 'gyeonggi', label: '경기도', lat: 37.2636, lon: 127.0286 },
      { code: 'gangwon', label: '강원특별자치도', lat: 37.8813, lon: 127.7298 },
      { code: 'chungbuk', label: '충청북도', lat: 36.6424, lon: 127.489 },
      { code: 'chungnam', label: '충청남도', lat: 36.6008, lon: 126.665 },
      { code: 'jeonbuk', label: '전북특별자치도', lat: 35.8242, lon: 127.148 },
      { code: 'jeonnam', label: '전라남도', lat: 34.9866, lon: 126.3919 },
      { code: 'gyeongbuk', label: '경상북도', lat: 36.5684, lon: 128.7294 },
      { code: 'gyeongnam', label: '경상남도', lat: 35.2281, lon: 128.6811 },
      { code: 'jeju', label: '제주특별자치도', lat: 33.4996, lon: 126.5312 },
    ],
  },
]

export function findRegion(countryCode, regionCode) {
  const country = COUNTRIES.find((c) => c.code === countryCode)
  return country?.regions.find((r) => r.code === regionCode) || null
}

/**
 * Finds the catalogue region closest to a raw lat/lon (straight-line distance,
 * good enough at this scale). Used to map an auto-detected position back onto
 * the region dropdown so it reflects the detected location.
 */
export function findNearestRegion(countryCode, lat, lon) {
  const country = COUNTRIES.find((c) => c.code === countryCode)
  if (!country || country.regions.length === 0) return null

  return country.regions.reduce((closest, region) => {
    const distance = (region.lat - lat) ** 2 + (region.lon - lon) ** 2
    if (!closest || distance < closest.distance) {
      return { region, distance }
    }
    return closest
  }, null).region
}
